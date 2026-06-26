# PRD — scorecard-backfill-decisions (결정 원장 → 채점 원장 멱등 backfill)

- **slug**: `scorecard-backfill-decisions`
- **작성일**: 2026-06-26
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **대상 브랜치**: `feature/scorecard-backfill-decisions`
- **UI 포함 여부**: **no** — 서버/cron 전용(데이터 복원). 화면 무회귀.
- **상위 컨텍스트**: `signal-scorecard`(채점 원장 append backbone, #140) · `scorecard-relative-scoring`(시장/베타 보정 채점 v2, #149) 후속. backfill 로 들어온 행이 v2 채점에 자연 합류한다.

---

## 1. 배경 / 문제

채점 원장(`signal_scorecard`)은 **분석 시점에 append** 된다(`app/api/stock/ai-analysis/route.ts` 의 `insertScorecardRow` 호출부). 그런데 이 append 코드(`signal-scorecard`, #140)가 **~6/19 배포**되어, **그 이전 분석들은 결정 원장(`ai_analysis_decisions`, 종목당 최신 1건 upsert)에만 있고 채점 원장엔 없다** → **채점 불가**(채점 cron 은 채점 원장 행만 본다).

그중 **결정시점 봉 날짜(`signal.asOf`)가 있는** 결정은, 그 봉 종가로 entry 를 복원해 채점 원장 1행을 **소급 append** 할 수 있다(과거 entry 종가는 KIS 일봉 history 로 사후 취득 가능). 본 PRD 는 그 **멱등 backfill** 이다.

### 1-1. 현재 구조 — 코드 추적 결과 (확정 사실, 읽기 전용 조사)

| # | 사실 | 근거 위치 |
|---|---|---|
| 1 | 채점 원장 append = 분석 route 의 PM final 직후. entry=`signal.asOf` 봉 종가, entry_date=asOf, decided_at=now, bench_key=resolveBenchCode. asOf 봉 못 찾으면 마지막 봉 폴백 | `app/api/stock/ai-analysis/route.ts:665~694` |
| 2 | `insertScorecardRow(ScorecardInsert)` — ticker/provider/verdict/decisionConfidence/signalScore/signalAction/targetPct/stopLossPct/entryClose/entryDate/livePrice/decidedAt/runId/benchKey 평탄화 POST. 미설정=skipped, 실패=error(fail-soft) | `lib/server/scorecard/scorecardStore.ts::insertScorecardRow` |
| 3 | 결정 원장 `ai_analysis_decisions` = **ticker PK upsert**(종목당 최신 1건). `decision`=FinalDecision, `signal`=DecisionSignal(asOf·score·action 보유, legacy 행은 null), `updated_at` 보유 | `lib/server/ai/decisionStore.ts`, `lib/types/stock/aiAnalysis.ts::AIAnalysisDecisionSnapshot` |
| 4 | `getAllAIDecisions(limit)` — 전 종목 최신 결정 updated_at 내림차순 조회(이미 존재). asOf 는 `signal.asOf` | `lib/server/ai/decisionStore.ts::getAllAIDecisions` |
| 5 | asOf 봉 종가 복원 = `fetchDailyChunked(ticker, fromYmd, toYmd)`(YYYYMMDD, 오름차순, 130일 청크 분할) → `date===asOf` 봉의 close | `lib/api/kis/chartChunked.ts::fetchDailyChunked` |
| 6 | 디스패처 cron = `flow-snapshot`. flow 적립(①) → 채점 relativeRunScoring(②) **순차**, 각 독립 try/catch. prod+KIS 게이트, fail-soft 200 | `app/api/cron/flow-snapshot/route.ts` |
| 7 | 채점 v2(`relativeRunScoring`)는 pending **또는 미보정** horizon 을 잡는다 → backfill 로 append 된 행(전 horizon pending)을 **다음/같은 패스에서 자동 채점** | `lib/server/scorecard/relativeRunScoring.ts`, `relativeScoreDecisions.ts` |
| 8 | 벤치마크 해석 `resolveBenchCode(ticker)` = 오프라인 symbols.json 역참조(추가 API 0) | `lib/server/scorecard/relativeRunScoring.ts::resolveBenchCode` |

### 1-2. 핵심 제약 (이 PRD 설계를 좌우)

- **C1 — 멱등 최우선**: 재실행해도 중복 insert 0. 멱등키 = **(ticker, entry_date=asOf)**. 채점 원장에 이미 그 키 행이 있으면 건너뛴다(6/22 이후 분석 시점 append 된 행, 같은 패스 재시도 등 중복 방지).
- **C2 — asOf 있는 것만**: `signal.asOf` 없는(legacy) 결정은 entry 복원 불가 → **추측 insert 절대 금지**(자연 필터). asOf null(6/17~18 등) 은 손대지 않는다.
- **C3 — entry 못 구하면 insert 안 함**: asOf 봉 종가를 못 구하면(fetch 실패/봉 부재/0·음수) **이번 패스 skip**. 절대 null/0 으로 insert 하지 않는다 → 다음 cron 패스 재시도(자연 멱등). 잘못된 entry 로 채점 오염 금지.
- **C4 — fail-soft**: 한 결정 실패가 나머지·cron 을 막지 않는다(결정 단위 catch). 종목 일봉 fetch 실패는 transient 1회 재시도 후 throw → 그 결정만 보류.
- **C5 — 비파괴·무회귀**: 분석 SSE·기존 채점·집계·화면 무회귀. SQL 스키마 **변경 불필요**(기존 채점 원장 컬럼 그대로 사용).
- **C6 — 채점 앞 배치**: backfill 을 채점(②) **앞**에 둬, 새로 들어온 행이 같은 cron 패스 채점에서 잡히게 한다(또는 다음 패스).

---

## 2. 목표

- **G1 (복원)**: asOf 보유·채점 원장 미존재 결정을, asOf 봉 종가로 entry 복원해 채점 원장 1행 append.
- **G2 (멱등)**: 멱등키 (ticker, entry_date) 로 중복 insert 0. 재실행 안전(2회차 insert 0).
- **G3 (자동 실행)**: 디스패처 cron(flow-snapshot)에 backfill 단계 통합 → 수동 트리거 불요. backfill → 채점 순서로 같은 패스 합류.
- **G4 (오염 금지)**: asOf 없음·entry 미복원·fetch 실패는 insert 하지 않고 보류(추측·null insert 금지).
- **G5 (무회귀·fail-soft)**: 분석 SSE·기존 채점·화면 무회귀. 한 건 실패가 cron 을 막지 않음. SQL 변경 0.

---

## 3. 범위 (In scope)

### 3-1. backfill 핵심 로직 (주입형, 순수)
- `lib/server/scorecard/backfillDecisions.ts::backfillScorecardFromDecisions(deps)`:
  1. 결정 원장(`getDecisions`) 조회.
  2. 채점 원장 기존 키 집합(`getExistingKeys`) 조회 — 멱등 판별.
  3. 결정마다: `signal.asOf` 없으면 skip(skippedNoAsOf). 기존 키(또는 같은 패스 누적 키) 보유면 skip(skippedExists).
  4. asOf 봉 종가 복원: `fetchStockDaily(ticker, asOf-10일, asOf)` → `date===asOf` 봉 close. 못 구하면(부재/0·음수) skip(skippedNoEntry, **insert 안 함**).
  5. 복원 성공 시 평탄화해 `insertRow` append: verdict·confidence·signalScore·signalAction·targetPct·stopLossPct·entryClose=asOf종가·entryDate=asOf·decidedAt=updated_at·runId=null·livePrice=null·benchKey=resolveBench(ticker).
  6. 결정 단위 try/catch — fail-soft. 결과 카운트(candidates/inserted/skippedNoAsOf/skippedExists/skippedNoEntry/errors) 반환(throw 안 함).
- 멱등키 헬퍼 `existsKey(ticker, entryDate)="${ticker}|${entryDate}"` — getExistingKeys 와 insert 후보 양쪽 동일 형식.

### 3-2. 실행 배선 (실제 deps 주입)
- `lib/server/scorecard/runBackfillDecisions.ts::runBackfillDecisions()` — `getAllAIDecisions`·`getScorecardKeys`·`fetchDailyChunked`(transient 재시도)·`resolveBenchCode`·`insertScorecardRow` 주입. throw 안 함(relativeRunScoring 패턴 정합).
- `lib/server/scorecard/scorecardStore.ts::getScorecardKeys(limit)` — (ticker, entry_date) 만 select 해 `Set<"ticker|entry_date">` 반환. 미설정/오류 시 빈 Set(fail-soft).

### 3-3. 디스패처 cron 통합
- `app/api/cron/flow-snapshot/route.ts` — flow 적립(①) → **backfill(②, 신규)** → 채점(③) 순. backfill 독립 try/catch. 응답에 `backfill` 포함, `console.info` 로그.
- `app/api/cron/score-decisions/route.ts`(수동/독립 트리거)에도 동일 backfill 단계(채점 앞) 공유 — 동작 일관.
- 게이트: 기존 cron 과 동일(prod+KIS 미설정 skip).

### 3-4. SQL
- **변경 불필요** — 기존 채점 원장 컬럼(verdict/decision_confidence/signal_score/signal_action/target_pct/stop_loss_pct/entry_close/entry_date/live_price/decided_at/run_id/bench_key + horizon pending)만 사용. 신규 컬럼/인덱스/마이그레이션 0.

---

## 4. 비범위 (Out of scope — FOLLOWUPS)

- **asOf null 결정 복원** — entry 복원 근거 부재(결정시점 봉 불명). 다른 신호(updated_at→직전 영업봉 추정 등)는 부정확·look-ahead 위험. 본 PRD 제외.
- **결정 원장 history 화** — 현재 ticker PK upsert 라 종목당 최신 1건만 남아, 같은 종목 과거 결정 다수는 복원 불가(최신 1건만 backfill 됨). history 보존은 별도 PRD.
- **수동 일괄 백필 스크립트** — cron 통합으로 자동화돼 불요.

---

## 5. 수용 기준 (AC — QA가 테스트 항목으로 직변환 가능)

### AC-1 (entry 복원·payload 정확)
asOf 보유·미존재 결정 → asOf 봉 종가로 entryClose 복원해 insert. payload: verdict/decisionConfidence/signalScore/signalAction/targetPct/stopLossPct = 결정값, entryDate=asOf, decidedAt=updated_at, runId=null, livePrice=null, benchKey=resolveBench. inserted↑.

### AC-2 (asOf 없음 skip)
`signal=null`(또는 asOf 없음) 결정 → skip(skippedNoAsOf↑), insert 0. 추측 insert 없음.

### AC-3 (멱등 — 기존 키 skip)
채점 원장에 (ticker, asOf) 이미 존재 → skip(skippedExists↑), insert 0.

### AC-4 (entry 미복원 보류)
asOf 봉 부재 / 종가 0·음수 → skip(skippedNoEntry↑), insert 0(다음 패스 재시도). null/0 insert 없음.

### AC-5 (fetch 실패 fail-soft)
종목 일봉 fetch throw → 그 결정 errors↑, insert 0. **나머지 결정은 계속 처리**(한 건 실패가 배치를 막지 않음).

### AC-6 (재실행 멱등)
1회차 insert 후, 2회차(1회차 키를 기존 키로) → insert 0(skippedExists). 결정론.

### AC-7 (같은 패스 중복)
같은 패스 내 동일 (ticker, asOf) 중복 후보 → 1회만 insert(나머지 skippedExists).

### AC-8 (미설정 insert skip)
Supabase 미설정으로 insert skipped → inserted 아님(errors 카운트), 멱등키 미마킹(다음 패스 재시도 가능). 게이트가 정상 차단해야 함.

### AC-9 (cron 통합·무회귀)
flow-snapshot: flow → backfill → 채점 순. backfill 독립 try/catch(실패해도 채점 계속). 응답 `backfill` 포함. 분석 SSE·기존 채점·화면 무회귀. 비-prod/미설정 skip.

---

## 6. 영향 분석 / 한계

- **대상 범위(현재)**: 6/19 분석 5건(017670·042700·329180·194370·010120) — 채점 원장 append(#140) 이전이지만 asOf 보유. 이들이 첫 patch 대상. 6/22 이후 분석은 이미 채점 원장에 있어 멱등 skip.
- **결정 원장 ticker PK upsert 한계**: 같은 종목을 6/19·6/22 둘 다 분석했다면 결정 원장엔 **최신(6/22) 1건만** 남아, 6/19 결정은 복원 불가(원천 부재). 자연 한계 — FOLLOWUPS.
- **멱등 견고성**: 멱등키 (ticker, entry_date) 로 채점 원장 중복 방지. insert 실패 시 멱등키 미마킹 → 다음 패스 재시도. getScorecardKeys 빈 Set(미설정/오류)이어도 insert 실패는 카운트만(게이트가 차단).
- **fail-soft 다층**: 단계(독립 try/catch) · 결정(per-decision catch) · fetch(transient 재시도→throw→per-decision catch) · insert(미설정/실패=카운트). 어느 층 실패도 cron 200·다른 단계 무영향.
- **채점 합류**: backfill 행은 전 horizon pending → 같은 패스 채점(③) 또는 다음 cron 이 잡아 hit/miss/flat·상대지표 산출. backfill 자체는 채점하지 않음(역할 분리).
