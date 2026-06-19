# QA: signal-scorecard — AI 판정 채점·적중률 집계 backbone (phase-1)

- PRD: `docs/prd/signal-scorecard.md` §5 (AC-1~10), §9 확정 결정 D1~D7
- PR: #140 (trading-signal-frontend), 브랜치 `feature/signal-scorecard`
- 범위: 채점 원장(append)·적중 판정 순수 로직(T=2%, hit/miss/flat)·채점 cron(단일 디스패처)·집계 BFF·운영자 표·분석 라우트 append.
- 판정: **qa-passed** — 자동 검증 가능 항목 전부 통과(실패 0건). 라이브 prod(Supabase+KIS) 전용 항목(AC-1/AC-2 실제 insert, AC-8 두 뷰포트, cron 실행 라운드트립)은 **"운영자 라이브 확인 필요"** 로 분리(자동 판정 범위 밖, 임의 pass/fail 단정 안 함).

---

## 0. 작업 안전 가드 확인

- 시작 시 `git status` → 브랜치 `feature/signal-scorecard`, 워킹트리 clean 확인.
- `git stash list` → `stash@{0}`("slide-to-analyze WIP") 외 2건 보존 확인. **stash 미접촉**(pop/drop/push 안 함).
- 다른 브랜치 checkout/수정/삭제 없음. QA 리포트 1파일만 추가.

---

## 1. 검증 환경 · 명령 (AC-9 자동 재현)

| 항목 | 명령 | 결과 |
|------|------|------|
| eslint(전체) | `npm run lint` (`eslint .`) | **통과** (exit 0, 출력 없음 = 0 error / 0 warning) |
| 타입 체크 | `npx tsc --noEmit` | **통과** (exit 0, 출력 없음) |
| 전체 vitest 스위트 | `npm run test` | **339 passed / 1 skipped** (skip = pre-existing live backtest `liveBacktest.test.ts`) |
| scorecard 신규만 | `npx vitest run lib/server/scorecard` | **51 passed** (scoring 32 + scoreDecisions 12 + summarize 7) |
| 프로덕션 빌드 | `npm run build` | **Compiled successfully in 3.6s**, 43/43 static pages, exit 0 |

빌드 경고 1건 관찰: `Turbopack build encountered 1 warnings` → import trace 가 `./next.config.ts`(NFT 파일 트레이싱). **scorecard 변경과 무관한 config 레벨 사전 경고**이며 빌드를 막지 않음(exit 0). 본 PR 신규 파일이 유발한 것 아님.

신규 라우트 빌드 등록 확인: `/api/cron/score-decisions`(ƒ), `/api/scorecard/summary`(ƒ), `/dashboard/scorecard`(○ static).

정독한 구현 파일:
- `lib/server/scorecard/scoring.ts` (적중 판정 순수 함수 — hit/miss/flat, computeReturnPct)
- `lib/server/scorecard/constants.ts` (T=2%, horizon 1/5/21영업일, 배치/지연/lookahead 상수 — D7)
- `lib/server/scorecard/scoreDecisions.ts` (채점 cron 코어 — 주입 deps, findHorizonClose, due 판정)
- `lib/server/scorecard/runScoring.ts` (실제 store+KIS 주입 진입점)
- `lib/server/scorecard/scorecardStore.ts` (Supabase REST insert/read/update — fail-soft)
- `lib/server/scorecard/summarize.ts` (차원별 집계 순수 함수 — hitRate=hit/(hit+miss))
- `lib/server/scorecard/scorecardCronMeta.ts` (KV 헬스 마커)
- `app/api/cron/score-decisions/route.ts` (인증·게이트·fail-soft 200)
- `app/api/cron/flow-snapshot/route.ts` (단일 디스패처 — flow 후 scoring, 독립 try/catch — D4)
- `app/api/scorecard/summary/route.ts` (집계 BFF — configured/timeout/error 분기)
- `app/api/stock/ai-analysis/route.ts` L593-621 (PM final 직후 채점 원장 append — fail-soft)
- `app/(main)/dashboard/scorecard/page.tsx` · `components/scorecard/ScorecardContainer.tsx` · `ScorecardTable.tsx`
- `docs/sql/signal-scorecard.sql` (멱등 DDL — append 테이블)
- `lib/types/scorecard/scorecard.ts` · `lib/copy/scorecard/labels.ts`
- 테스트: `scoring.test.ts`, `scoreDecisions.test.ts`, `summarize.test.ts`

---

## 2. 수용 기준별 판정 + 근거

### AC-1 (원장 — 가격 캡처) — 코드 통과 / 라이브 확인 필요

> PRD 적용 후 새 판정 1건 → 채점 원장 1행 insert + `entry_close(>0)`·`entry_date`·`decided_at`·`verdict`·`decision_confidence`·`signal_score` non-null.

**코드 경로 추적**: `app/api/stock/ai-analysis/route.ts` L596-613 — PM `final` 발행 직후 `signalResult.asOf` 봉을 `sorted` 에서 찾아 그 종가를 `entryClose` 로(못 찾으면 마지막 봉 폴백, D2), `entryClose>0` 일 때만 `insertScorecardRow` 호출. body 에 `verdict=finalDecision.verdict`, `decisionConfidence=finalDecision.confidence`, `signalScore=signalResult.score`, `entryDate=signalResult.asOf`, `decidedAt=new Date().toISOString()` 등 6개 필수 필드 전부 포함. DDL(`signal-scorecard.sql`)에서 `entry_close numeric not null`·`entry_date date not null`·`decided_at timestamptz not null`·`verdict ... not null`·`decision_confidence ... not null` 으로 non-null 계약 고정.

**자동 검증 한계**: 실제 행 insert 는 prod Supabase + 로컬 분석 1회(AI 멀티에이전트, 로컬 전용)가 있어야 확인 가능 → 라이브 확인 필요(§4-1).

**판정**: 캡처/insert 코드 경로·필드 매핑·DDL non-null 계약 정합 확인. 실 insert 라운드트립은 운영자 라이브 확인.

---

### AC-2 (원장 — 비파괴/append) — 코드 통과 / 라이브 확인 필요

> 같은 ticker 2회 분석 → 채점 원장 2행. `ai_analysis_decisions` 는 1행 유지(무회귀).

**코드 경로 추적**: DDL PK = `id uuid default gen_random_uuid()`, ticker 에 unique 제약 **없음** → 매 insert 새 행(append). `insertScorecardRow` 는 `POST .../signal_scorecard`(REST insert, upsert 아님 — `Prefer: return=minimal`, `on_conflict` 미사용). 분석 라우트는 채점 append 와 별개로 기존 `upsertAIDecision`(ticker PK upsert) 을 그대로 호출 → `ai_analysis_decisions` 비파괴. PR diff 상 `ai_analysis_decisions` 스키마·upsert 로직 변경 0(추가만).

**자동 검증 한계**: 2행 누적·결정 테이블 무변동은 prod DB 라운드트립 필요 → 라이브 확인(§4-1).

**판정**: append 설계(PK uuid, ticker unique 없음, REST insert)·결정 테이블 무회귀 코드 확인. 실 2행 누적은 운영자 라이브 확인.

---

### AC-3 (채점 cron — 인증·게이트) — 통과 (코드)

> Bearer 미일치 401. 올바른 Bearer + 비-prod → 200 `{ok:false, reason:"kis-not-prod"}`.

**코드 경로 추적**(`app/api/cron/score-decisions/route.ts`):
- L23-27: `secret = process.env.CRON_SECRET`; `auth !== Bearer ${secret}` 또는 secret 미설정 → `401 {error:"unauthorized"}`. (Bearer 미부착·오타 모두 401)
- L29-40: `resolveKisEnv()`; `!isKisConfigured() || env!=="prod"` → 헬스 마커 기록 후 `200 {ok:false, reason:"kis-not-prod", env}`. (`env` 필드는 PRD 명세에 대한 가산 — 형태 정합)
- L42-50: prod 진입 시 `runScoring()` 후 `200 {ok:true, result}`. L51-61: 채점 throw 도 `200 {ok:false, reason:"scoring-error"}`(fail-soft).

디스패처(`flow-snapshot`)도 동일 401(L35-38) + 비-prod skip(L43-48) 패턴 공유, flow/scoring 양쪽 헬스 마커 기록.

**판정**: AC-3 명세(401 / 비-prod 200 + reason) 정확 일치. 통과.

---

### AC-4 (채점 cron — 적중 판정 정확성) — 통과 (단위 테스트)

> verdict별 hit/miss/flat, 경계값 r=+T/−T/|r|=T 전수. BUY entry100·+1d 103=hit, 98=miss. SELL 부호 반대.

**테스트 정합 확인**:
- `scoring.test.ts`(32건) — `scoreOutcome` 전수: BUY·OVERWEIGHT(r=+T hit / r=−T miss / r=0·1.99 flat), SELL·REDUCE(r=−T hit / r=+T miss / 밴드 flat), HOLD(|r|=T·0 hit / |r|>T miss, **flat 없음**), UNDERWEIGHT(r≤0 hit / r>+T miss / 0<r≤T flat). `computeReturnPct`(+3%/−2%/entry≤0→null). 기본 T=2 폴백. **PRD §3-2-A 표 4행 × 경계값 전부 커버**.
- `scoreDecisions.test.ts` AC-4 블록(5건) — fixture 캔들로 end-to-end: BUY +1d 103 → `d1Status=hit`·`d1Close=103`·`d1ReturnPct≈3`·`d1ScoredAt` 기록; BUY 98 → miss; SELL 97 → hit(부호 반대); BUY 101 → flat; **평가일 휴장(06-02 부재, 06-03 존재) → 직후 영업봉 종가 사용**(LOOKAHEAD 보정).

코드 정합: `scoring.ts` switch 가 PRD 표와 부등호(경계 포함)까지 일치. `scoreDecisions.ts` 가 `computeReturnPct`→`scoreOutcome` 위임, 갱신 시 status/close/returnPct/scoredAt 4필드 patch.

**판정**: 경계값 포함 verdict 전수 + 휴장 보정까지 단위 테스트 커버. 통과.

---

### AC-5 (채점 cron — 결정론·재실행 안전) — 통과 (단위 테스트)

> 2회 실행 결과 동일(이미 hit/miss 인 horizon 재채점 안 함, pending 만 처리). 미도래 horizon pending 유지.

**테스트 정합 확인**(`scoreDecisions.test.ts` AC-5 블록 3건):
- "이미 hit 인 horizon 은 재채점하지 않는다" — 1회차 후 `d1=hit`, 2회차에서 d1 추가 update 호출 0(`updateCountAfterSecond === updateCountAfterFirst`). `getPendingRows` 가 pending 행만 반환 + `scoreDecisions` 가 `statusOf(row,h)!=="pending"` 이면 continue → 멱등.
- "미도래 horizon pending 유지" — now=06-02(d1=1영업일만 도래) → `d1=hit`, `w1/m1=pending`. `elapsed >= HORIZON_BUSINESS_DAYS[h]` 게이트.
- "경과 0영업일" — now=entry 당일 → 전부 pending, update 0건.

`updateHorizonScore` 는 `id=eq.${id}` PATCH 로 1행만 조준 → 같은 입력 같은 결과(결정론).

**판정**: 통과.

---

### AC-6 (채점 cron — fail-soft) — 통과 (단위 테스트)

> 봉 부재(상폐/연속 휴장) → skipped(cron 200). 1 ticker 조회 실패가 다른 ticker 채점 안 막음.

**테스트 정합 확인**(`scoreDecisions.test.ts` AC-6 블록 4건):
- "도래했으나 평가봉 부재(연속 휴장)" — 캔들이 06-02 까지만 → `d1=hit`, `w1/m1=skipped`(`findHorizonClose` 가 평가일 이후 봉 없고 데이터 stale → "skip").
- "빈 캔들(상폐)" — 캔들 `[]` → 도래 horizon 전부 skipped.
- "한 ticker KIS throw" — BADTICK fetchDaily throw → BADTICK `d1=pending`(다음 재시도), GOODTICK `d1=hit`, `res.errors===1`, BADTICK update 0건. **try/catch 로 ticker 격리**(`scoreDecisions.ts` L189-196).
- "pending 행 없음 → 0건, 에러 없음"(AC-10 겸).

라우트 레벨 fail-soft: `runScoring` 의 `fetchWithTransientRetry(...,[],backoff)` 가 transient 실패 시 빈 배열 폴백(throw 안 함) → findHorizonClose 가 pending/skip 흡수. cron 라우트 전체 throw 도 200(L51-61). 디스패처는 flow/scoring 독립 try/catch.

**판정**: 통과.

---

### AC-7 (집계 API) — 통과 (단위 테스트 + 코드)

> verdict/confidence/horizon별 `{hit,miss,flat,total,hitRate}`, hitRate=hit/(hit+miss)(flat 제외), total 노출. 0건이면 빈 배열 200.

**테스트 정합 확인**(`summarize.test.ts` 7건):
- **AC-7 핵심 시드**: BUY/d1 hit3·miss1·flat1 → `hit=3,miss=1,flat=1,total=5,hitRate=0.75`. (PRD 예시와 정확히 일치)
- confidence(HIGH)·horizon(d1) 차원도 동일 표본 집계, hitRate=0.5.
- 전부 flat → `hitRate=null`(분모 0, D3).
- pending/skipped 집계 제외(`total=1`).
- `countScored` — 채점 완료(hit/miss/flat) horizon 수.
- signalScore 보조 차원(0-40/40-60/60-100) 집계.
- 빈 입력 → `[]`.

**라우트 코드**(`app/api/scorecard/summary/route.ts`): 미설정 → `{configured:false, cells:[], scoredCount:0, totalRows:0}` + `X-Data-Source: supabase-unconfigured`. 정상 → `summarizeScorecard(rows)` + `countScored` + 200. timeout 504 / error 502 분기. 채점 0건이면 `summarizeScorecard([])=[]` → 빈 배열 200(AC-7 충족). `toCell` 의 `hitRate = denom>0 ? hit/denom : null`(denom=hit+miss).

**자동 검증 한계**: 실제 DB 행 group-by 라운드트립은 prod 데이터 필요 → 순수 함수·라우트 분기로 검증, 실 데이터는 라이브(§4-1).

**판정**: hitRate 공식·flat 제외·total 노출·0건 빈배열·차원 3종 전부 코드/단위 테스트 일치. 통과.

---

### AC-8 (운영자 뷰) — 코드 통과 / 라이브 두 뷰포트 확인 필요

> 표 컬럼(구분/평가시점/적중/미적중/보합/표본수/적중률) + 차원·horizon 필터 동작. 0건 빈 상태, 미설정 안내(에러 토스트 아님). N<5 시각 구분.

**코드 경로 추적**:
- `ScorecardTable.tsx` — thead 7컬럼(`COL_KEY`=구분 / `COL_HORIZON`=평가시점 / 적중 / 미적중 / 보합 / 표본수 / 적중률). hitRate denom 0이면 `—`(`HIT_RATE_NA`). `cell.total < 5`(`SMALL_SAMPLE_THRESHOLD`) → 행 `text-text-muted` 회색 + "표본 5건 미만 — 참고용" 힌트.
- `ScorecardContainer.tsx` — `dimension`(verdict/confidence/horizon/signalScore)·`horizon`(all/d1/w1/m1) state 필터, horizon 차원이면 horizon 셀렉트 disabled+opacity. `isLoading`→skeleton, `isError||!data`→`card-critical` 재시도(토스트 아님), `!data.configured`→미설정 안내 `role="status"`(에러 아님), `scoredCount===0||filtered.length===0`→빈 상태 카피.
- 컨벤션(`docs/rules/frontend.md`): 화면 컴포넌트는 도메인 훅 `useQueryScorecardSummary` 만 import(useQuery 직접 import 없음), `cn`+디자인 토큰(`text-text-*`/`text-signal-*`/`h-table-row-h`/`px-table-cell-px`), 색·px 직타 0, 한글 카피(`lib/copy/scorecard/labels.ts`). lint/tsc/build 통과로 배선 정합 확인.

**자동 검증 한계**: 실제 표 렌더·필터 전환·두 뷰포트(모바일/데스크탑)·빈/미설정 시각 확인은 브라우저 라이브 필요 → 운영자 확인(§4-2).

**판정**: 표 구조·필터·빈/미설정/에러 분기·N<5 처리·컨벤션 코드 정합. 라이브 두 뷰포트는 운영자 확인.

---

### AC-9 (무회귀) — 통과

> lint · tsc(또는 build) · test 통과. 기존 /analyze 카드·이전 결론·SSE·토큰 탭·flow-snapshot cron 미회귀.

- 자동 4종 전부 통과(§1): lint 0 error, tsc exit 0, test 339 passed/1 skipped(skip=사전존재), build 성공.
- **분석 SSE 무회귀(핵심 회귀 1순위)**: 채점 append(`route.ts` L596-621)는 기존 `upsertAIDecision`(L580) **뒤**에 추가, 동일 outer try(L426)~catch(L719) 안에 위치. `insertScorecardRow` 의 fetch 는 `.catch` 래핑(throw 안 함) → 실패 시 `aiLog.warn` 만, SSE 스트림(`send`/`safeClose`) 미차단. Supabase 미설정 → `{ok:true, skipped:true}` → "append skip" 로그만. **fail-soft 확인**.
- flow-snapshot 무회귀: 디스패처화는 기존 ①수급 적립을 **그대로 두고**(L50-72) ②scoring 을 독립 try/catch 로 **뒤에 추가**(L74-86). 401·비-prod skip·헬스 마커 기존 유지. scoring 실패가 flow 응답(`saved`)을 막지 않음.
- 토큰 탭·카드·이전 결론: 본 PR diff 가 해당 코드 비변경(scorecard append 만 추가).

**판정**: 통과.

---

### AC-10 (마이그레이션 주의 — 과거 행 채점 불가) — 통과 (단위 테스트 + 코드)

> 적용 이전 `ai_analysis_decisions` 행(가격 미보유)은 채점 원장 미진입·집계 제외(소급 0건). "적용 이후 결정부터 채점" 문서 명시.

**코드/테스트 정합 확인**:
- 채점 대상은 **신규 `signal_scorecard` 테이블** 의 pending 행만(`getPendingScorecardRows`). 과거 `ai_analysis_decisions` 행은 채점 원장에 존재하지 않으므로 cron 이 절대 조회·채점하지 않음(소급 0건).
- `scoreDecisions.test.ts` "pending 행이 없으면 채점 0건, 에러 없음" — 빈 행 입력 → `candidates=0, scored=0, errors=0`.
- 백필 코드 없음(분석 라우트가 새 분석 시에만 insert).
- 문서 명시: `signal-scorecard.sql` 테이블 comment "PRD 적용 이후 결정부터 채점(과거 소급 없음)", 운영자 뷰 빈 상태 카피 "PRD 적용 이후 새로 생성된 판정부터 집계됩니다", PRD §6 마이그레이션 주의.

**판정**: 통과.

---

## 3. 에지 케이스 (거래소/네트워크/레이트리밋/피드 장애)

| 에지 | 동작 | 검증 상태 |
|------|------|-----------|
| **KIS prod 미설정/비-prod cron 호출** | 채점 skip + 헬스 마커 + 200(`{ok:false,reason:"kis-not-prod"}`). 재시도 폭주 방지 | 코드 확인(route L32-40, 디스패처 L43-48) |
| **CRON_SECRET 미설정/Bearer 오타** | 401 unauthorized(채점 미진입) | 코드 확인(L23-27) |
| **KIS 레이트리밋(EGW00201)/네트워크 transient** | `fetchWithTransientRetryOrThrow` 가 1회 backoff 재시도 후에도 실패하면 **throw 전파**(빈 배열 폴백 없음) → ticker 단위 catch 가 errors++ + 해당 horizon pending 유지(다음 cron 재시도), 다른 ticker 무영향. ticker 간 200ms delay | `bffUtils.test.ts`(throw 전파) + runScoring 코드 + scoreDecisions throw 격리 테스트 |
| **거래소 서버 다운 / KIS 일봉 throw** | 해당 ticker try/catch → errors++ + pending 유지(재시도), 나머지 ticker 정상 채점, cron 200 | `scoreDecisions.test.ts` "한 ticker throw" 통과 |
| **상폐/장기 거래정지(KIS 가 성공적으로 봉 0건 반환)** | 조회 **성공**+빈 캔들만 → 도래 horizon skipped(채점 불가 명시). 조회 **실패**(throw)는 skip 아닌 pending 으로 분리(위 행) → 일시 장애가 영구 skip 으로 굳지 않음 | "빈 캔들" 테스트 + 하드닝 |
| **평가일 휴장(공휴일/주말)** | 직후 가장 가까운 영업봉 종가 사용(LOOKAHEAD 7봉 흡수), 초과 시 skipped | "휴장 직후 영업봉" 테스트 통과 |
| **데이터 미갱신(평가일 도래했으나 KIS 봉 아직 없음)** | last 봉이 today 기준 LOOKAHEAD 이내면 pending 유지(stale 아님), 초과면 skip | `findHorizonClose` stale 판정 코드 |
| **entry_close 비정상(≤0/NaN)** | `computeReturnPct=null` → 해당 horizon skipped(채점 불가). 분석 append 단계도 `entryClose>0` 일 때만 insert(이중 가드) | scoreDecisions L223-235 + route L598 |
| **Supabase 다운/미설정(집계 BFF)** | configured=false → 미설정 안내 카드(에러 토스트 아님). 조회 timeout 504 / 오류 502(한글 메시지) | summary route + Container 분기 코드 |
| **배치 초과(pending 60행 이상)** | `SCORE_BATCH_LIMIT=60` 으로 1회 상한, 미처리분 다음 cron(entry_date asc 오래된 것 우선) | constants + store order 코드 |
| **분석 중 채점 append 실패(Supabase 일시 오류)** | fail-soft — `aiLog.warn` 만, SSE 분석 스트림 미차단(AC-9 핵심) | route L596-621 + insert fetch .catch 래핑 |

---

## 4. 운영자 라이브 확인 필요 (prod 전용 — 자동 불가)

**공통 선행조건**: prod Supabase 에 `docs/sql/signal-scorecard.sql` 적용(멱등 `create table if not exists` + `add column if not exists`) + KIS prod 설정. 미적용이어도 분석 SSE 는 fail-soft 로 무영향(채점 append skip).

### 4-1. 원장 라운드트립 (AC-1 / AC-2 / AC-7 실데이터)
1. SQL 선적용 후 로컬 분석 1회(`/analyze` 종목 1개, AI 멀티에이전트 = 로컬 전용).
2. `select id,ticker,entry_close,entry_date,decided_at,verdict,decision_confidence,signal_score,d1_status from signal_scorecard where ticker=<X>` → 1행 존재 + 6필드 non-null + `entry_close>0`, `d1/w1/m1_status='pending'` (AC-1).
3. 같은 ticker 재분석 1회 → `select count(*) from signal_scorecard where ticker=<X>` = 2, 동시에 `ai_analysis_decisions` 행 수 변화 없음 (AC-2).
4. `GET /api/scorecard/summary` → 채점 전이면 `cells:[]`/`scoredCount:0`(아직 hit/miss 없음), 채점 후 셀에 hitRate 노출 (AC-7).

### 4-2. 운영자 뷰 두 뷰포트 (AC-8)
1. prod(또는 prod Supabase 가리키는 로컬)에서 `/dashboard/scorecard` 접속.
2. 표 7컬럼 렌더 + 집계 기준(verdict/확신도/평가시점별/신호강도) 드롭다운 전환 + 평가 시점(전체/+1일/+1주/+1달) 필터 동작 확인.
3. 채점 0건 → "아직 채점된 판정이 없어요" 빈 카피. Supabase 미설정 → "채점 저장소가 설정되지 않았어요"(에러 토스트 아님).
4. 표본 N<5 행 회색 + "참고용" 힌트.
5. 모바일·데스크탑 두 뷰포트에서 표 가로 스크롤·필터 정렬 확인.

### 4-3. 채점 cron 라이브 (AC-3~6 실행)
1. 결정 후 1영업일 경과 후 prod cron(디스패처 `flow-snapshot` 또는 수동 `score-decisions` Bearer 호출) 1회.
2. 헬스 마커 `scorecard:cron:meta`(KV) `ok:true` + result(hit/miss/flat/skipped) 확인.
3. `d1_status` 가 `pending`→`hit/miss/flat` 으로 확정, `d1_close`/`d1_return_pct`/`d1_scored_at` 기록 확인.
4. 같은 cron 재실행 시 이미 확정된 horizon 무변동(결정론).

> 자동 판정과 무관: 적중 판정·결정론·fail-soft·집계 공식은 fixture 단위 테스트로 전수 검증됨(§2). 위 라이브는 실 DB/KIS 라운드트립 운영 점검.

---

## 5. 판정 요약

| AC | 항목 | 결과 |
|----|------|------|
| AC-1 | 원장 가격 캡처 | 코드 통과 / 실 insert 라이브 확인 |
| AC-2 | 원장 비파괴 append | 코드 통과 / 실 2행 라이브 확인 |
| AC-3 | cron 인증·게이트 | **통과**(코드) |
| AC-4 | 적중 판정 정확성 | **통과**(단위 테스트 32+5) |
| AC-5 | 결정론·재실행 | **통과**(단위 테스트) |
| AC-6 | fail-soft | **통과**(단위 테스트) |
| AC-7 | 집계 API | **통과**(단위 테스트 + 코드) / 실데이터 라이브 확인 |
| AC-8 | 운영자 뷰 | 코드 통과 / 두 뷰포트 라이브 확인 |
| AC-9 | 무회귀 | **통과**(lint/tsc/test/build) |
| AC-10 | 과거 행 채점 불가 | **통과**(단위 테스트 + 코드) |

**자동 검증 가능 항목 실패 0건.** 적중 판정·결정론·fail-soft·집계 공식·cron 인증/게이트·무회귀·소급 금지는 단위 테스트/코드로 전부 통과. 라이브 prod 전용(AC-1/2 실 insert, AC-7 실데이터, AC-8 두 뷰포트, cron 실행)은 §4 운영자 라이브 확인으로 분리(임의 pass/fail 단정 안 함, 코드 경로는 전부 정합).

→ **qa-passed**

라벨 게이트: PR #140 본문에 `## 다음 작업` 섹션 존재 확인 — handoff-append workflow 안전(빈 HANDOFF 항목 없음).
