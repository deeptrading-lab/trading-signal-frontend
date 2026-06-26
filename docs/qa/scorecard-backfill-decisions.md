# QA — scorecard-backfill-decisions (결정 원장 → 채점 원장 멱등 backfill)

- **slug**: `scorecard-backfill-decisions`
- **PR**: #152 (`feature/scorecard-backfill-decisions`)
- **QA 일자**: 2026-06-26
- **QA 에이전트**: QA 에이전트
- **검증 커밋**: `2c21e88` (feat(scorecard): 결정 원장 → 채점 원장 멱등 backfill — asOf 봉 종가로 entry 복원)
- **PRD**: `docs/prd/scorecard-backfill-decisions.md`
- **판정**: **qa-passed** — 자동 검증 항목 전부 통과. prod 실 insert·실 KIS 종가는 "운영자 라이브 확인"(배포+cron 후)으로 분리.

---

## 1. 자동화 검증 (실측 로그)

격리 워크트리(`/Applications/하영/code_source/tsf-qa-backfill`, `npm ci` 583 packages)에서 실행.

| 커맨드 | 결과 | 비고 |
|---|---|---|
| `npm run lint` | **PASS** | `eslint .` clean, 출력 0건 |
| `npx tsc --noEmit` | **PASS** | `TSC_EXIT=0` |
| `npm run test` | **PASS** | **462 passed \| 1 skipped** (Test Files 58 passed \| 1 skipped) |
| `npm run build` | **PASS** | `✓ Compiled successfully in 3.9s`. 두 cron 라우트(`/api/cron/flow-snapshot`·`/api/cron/score-decisions`) 모두 빌드됨 |

- 신규 테스트 파일 `lib/server/scorecard/__tests__/backfillDecisions.test.ts` — **10 tests 전부 통과**(10ms).
- skip 1건 = `lib/signal/backtest/__live__/liveBacktest.test.ts`(기존 `__live__` 라이브 테스트, 본 PR 무관).
- build warning 1건 = `next.config.ts` NFT 추적 관련 **기존 경고**, 본 변경 diff 밖. 회귀 아님.

---

## 2. 수용 기준(AC)별 판정표

각 AC에 재현 절차 + 기대 결과 + 실제 근거(단위테스트 또는 코드 추적). 환경 의존(실 Supabase·실 KIS) 항목은 라이브로 분리.

| AC | 항목 | 재현/근거 | 기대 | 실제 | 판정 |
|---|---|---|---|---|---|
| AC-1 | entry 복원·payload 정확 | 테스트 "asOf 있는 결정의 봉 종가로 entry 복원해 멱등 append (payload 정확)". asOf=2026-06-19 결정 + `date===asOf` 봉 종가 51000 → insert | inserted=1, candidates=1, entryClose=51000, entryDate=asOf, decidedAt=updatedAt, runId=null, livePrice=null, benchKey=resolveBench, verdict/confidence/signalScore/signalAction/targetPct/stopLossPct=결정값 | `toMatchObject` 전 필드 일치, 카운트 일치. `backfillDecisions.ts:151~166` payload 평탄화 코드와 정합 | **PASS** |
| AC-2 | asOf 없음 skip | 테스트 "asOf 없는 결정은 skip". `signal=null` 결정(005930) 입력 | skippedNoAsOf=1, candidates=0, inserted=0, insert 호출 0 | `inserts.length===0`, 카운트 일치. `backfillDecisions.ts:124~129` `if (!asOf)` 자연 필터 | **PASS** |
| AC-3 | 멱등 — 기존 키 skip | 테스트 "이미 (ticker, entry_date) 존재 → 멱등 skip". existingKeys 에 `042700\|2026-06-19` 주입 | skippedExists=1, candidates=0, inserted=0, insert 호출 0 | 일치. `backfillDecisions.ts:131~136` `existing.has(key)` skip | **PASS** |
| AC-4 | entry 미복원 보류 | 테스트 2건: "asOf 봉 부재"(다른 날짜 봉만) + "entry 종가 0/음수"(close=0) | skippedNoEntry=1, inserted=0, insert 호출 0(null/0 insert 금지) | 양 케이스 일치. `backfillDecisions.ts:143~149` `bar?.close ?? null` → `entryClose === null \|\| !(entryClose > 0)` 가드(0·음수·null·NaN 모두 차단) | **PASS** |
| AC-5 | fetch 실패 fail-soft | 테스트 "종목 일봉 fetch 실패 → 나머지는 계속". 010120 throw, 017670 정상 | errors=1(010120), inserted=1(017670 계속) | 일치. 017670 만 insert. `backfillDecisions.ts:122~182` per-decision try/catch | **PASS** |
| AC-6 | 재실행 멱등 | 테스트 "재실행 멱등 — 2회차 insert 0". 1회차 insert 후 그 키를 existingKeys 로 2회차 | 1회차 inserted=1, 2회차 inserted=0 + skippedExists=1, insert 호출 0 | 일치. 결정론. 실 환경에선 `getScorecardKeys` 가 1회차 insert 된 행을 다음 패스에 기존 키로 반환 | **PASS** |
| AC-7 | 같은 패스 중복 | 테스트 "같은 패스 내 동일 (ticker, asOf) 중복 후보는 1회만 insert". 동일 키 결정 2건 | inserted=1, skippedExists=1, insert 호출 1 | 일치. `backfillDecisions.ts:120,132,171` `insertedKeys` 누적 Set 이 같은 패스 중복 차단 | **PASS** |
| AC-8 | 미설정 insert skip | 테스트 "Supabase 미설정(insert skipped) → inserted 아님". insertResult=`{ok:true,skipped:true}` | inserted=0, errors=1, 멱등키 미마킹(insertedKeys 미추가, 다음 패스 재시도 가능) | 일치. `backfillDecisions.ts:169~178` `ok && skipped` → errors++ only. 게이트(cron `isKisConfigured && env==="prod"`)가 비-prod/미설정 차단 | **PASS** |
| AC-9 | cron 통합·무회귀 | 코드 추적: `flow-snapshot/route.ts` 단계 ①flow→②backfill→③채점 순서, 각 독립 try/catch | 순서 보장, backfill 독립 try/catch(실패해도 채점 계속), 응답 `backfill` 포함, 비-prod/미설정 skip, 화면·SSE·기존 채점 무회귀 | `flow-snapshot/route.ts:54~109` 3단계 독립 try/catch + 응답 `{ok,saved,backfill,scoring}`. `score-decisions/route.ts:43~76` 동일 단계 공유. 게이트 `route.ts:47~52` 유지. UI/SSE diff 없음 | **PASS** |

### AC-0 (결정 0건 early return — PRD 명시 외 보강 테스트)
- 테스트 "결정 0건 → 빈 결과(early return)" 통과. `backfillDecisions.ts:115` `decisions.length===0 → return result`. 불필요 `getExistingKeys` 호출 회피. **PASS**

---

## 3. 중점 검증 결과(태스크 지정 7항)

1. **자동 재현** — lint/tsc/test(462)/build 전부 실측 통과. 신규 `backfillDecisions.test.ts` 10건 포함 확인. **OK**
2. **멱등성(최重요)** — (ticker, entry_date=asOf) 기존행 skip(AC-3), 같은 패스 중복 1회만(AC-7), 재실행 insert 0(AC-6) 3종 단위테스트 통과. 실 환경 멱등키 소스 `getScorecardKeys`(`scorecardStore.ts:297~327`)는 `ticker,entry_date` 만 select, `${ticker}|${entry_date}` 형식으로 `existsKey` 와 동일. 미설정/오류 시 빈 Set(fail-soft)이어도 insert 실패는 카운트만 → 잘못된 중복 insert 로 이어지지 않음. **OK**
3. **대상 필터** — `signal.asOf` 보유 결정만(AC-2), asOf null 제외, 추측 insert 없음. `getAllAIDecisions`(`decisionStore.ts:103`)가 `signal` 컬럼을 그대로 매핑, legacy 행 `signal=null`. **OK**
4. **entry 복원 안전** — 봉 부재/0·음수/null 전부 `!(entryClose > 0)` 가드로 차단(AC-4). null·추측 insert 경로 없음. 못 구하면 skippedNoEntry → 다음 패스 재시도. **OK**
5. **cron 통합** — flow→backfill→채점 순서, 독립 try/catch, fail-soft(backfill catch 가 채점·cron 200 안 막음)(AC-9). backfill 행은 전 horizon pending → 채점 단계 `relativeRunScoring`이 런타임에 `getRowsNeedingRelativeScoring`(pending OR 상대측정 누락)을 **새로 조회** → 같은 패스에서 d1 도래분 합류(또는 다음 패스). 역할 분리(backfill 은 채점 안 함) 확인. **OK**
6. **무회귀** — UI/컴포넌트 diff 0(서버/cron 전용). 분석 route(`ai-analysis/route.ts`)·기존 채점 경로(phase-1/relative)·`insertScorecardRow` 시그니처 불변. 신규 `getScorecardKeys` 는 추가 export(기존 호출부 영향 0). build·전체 테스트(기존 452 + 신규 10) 통과로 회귀 부재 확인. **OK**
7. **코드-AC 정합·라이브 분리** — payload 필드(verdict/decisionConfidence/signalScore/signalAction/targetPct/stopLossPct/entryClose/entryDate/livePrice/decidedAt/runId/benchKey)가 `ScorecardInsert` 타입(`scorecard.ts:123~139`)·`insertScorecardRow` body(`scorecardStore.ts:170~185`)와 1:1 정합. **SQL 변경 0 확인**(diff 에 `.sql`/migration 파일 없음, 기존 컬럼만 사용). prod 실 insert(6/19 5건 실제 들어가는지)·실 KIS 일봉 종가 취득은 **운영자 라이브 확인**으로 분류(아래 §5). **OK**

---

## 4. 에지 케이스 (별도 섹션)

| 시나리오 | 설계상 거동 | 근거 | 판정 |
|---|---|---|---|
| 거래소/KIS 서버 다운·일봉 fetch 실패 | transient 1회 재시도(`fetchWithTransientRetryOrThrow`, backoff) 후 throw → per-decision catch → errors++, 그 결정만 보류(다음 cron 재시도). 나머지 결정 계속 | `runBackfillDecisions.ts:38~42`, `backfillDecisions.ts:179~182` | PASS(설계 검증) |
| 네트워크 지연/타임아웃 | BFF 타임아웃 센티넬은 즉시 throw(흡수 안 함) → per-decision catch → 보류. cron 200 유지 | `bffUtils.ts:108~115` | PASS(설계 검증) |
| API 레이트리밋(EGW00201) | transient 로 분류 → backoff 재시도. cron 단계 간 `SUBJECT_DELAY_MS` 존재. backfill 자체는 결정 수만큼 순차(현재 대상 소규모 5건) | `bffUtils.ts`, `flow-snapshot/route.ts:33` | PASS(설계 검증, 라이브 모니터 권장) |
| Supabase 미설정/오류 (insert) | `insertScorecardRow` → `{ok:true,skipped:true}` → errors++ only, 멱등키 미마킹. cron 게이트가 비-prod/미설정 자체를 선차단(200 skip) | `scorecardStore.ts:167~168`, `flow-snapshot/route.ts:47~52` | PASS(AC-8) |
| Supabase 미설정/오류 (키 조회) | `getScorecardKeys` → 빈 Set. 멱등 판별 불가하나 insert 실패가 카운트만 → 잘못된 중복 행 미발생 | `scorecardStore.ts:297~327` | PASS(설계 검증) |
| asOf 봉만 없고 인접일 봉 존재 | `candles.find(c=>c.date===asOf)` undefined → entryClose null → skippedNoEntry(보류). 인접일 종가로 추측 insert 안 함 | `backfillDecisions.ts:143~149` | PASS(AC-4) |
| 결정 원장 0건 / 미설정 | `getDecisions` 빈 배열 → early return(빈 결과). `getExistingKeys` 미호출 | `backfillDecisions.ts:114~115` | PASS(AC-0) |
| 같은 종목 6/19·6/22 둘 다 분석(ticker PK upsert) | 결정 원장에 최신(6/22) 1건만 → 6/19 복원 불가(원천 부재). PRD §4/§6 명시 한계, FOLLOWUP | PRD §6, PR 본문 "다음 작업" | 한계 인지(범위 외) |

---

## 5. 운영자 라이브 확인(배포+cron 후 — 환경 의존, QA 자동검증 범위 밖)

아래는 실 Supabase·실 KIS prod 토큰이 필요해 QA 환경에서 임의 pass/fail 하지 않는다. 배포 후 운영자 1회 확인 권장.

- [ ] prod cron(`flow-snapshot`) 1회 실행 후 로그 `[flow-snapshot] backfill candidates=.. inserted=.. ...` 에서 6/19 5건(017670·042700·329180·194370·010120) 중 **asOf 봉 종가 취득 성공분 inserted** 확인.
- [ ] 같은/다음 패스 채점 로그 `[flow-snapshot] scoring ...` 에서 backfill 행이 d1 도래 시 hit/miss/flat 합류 확인.
- [ ] **재실행 멱등(라이브)**: 다음 cron 패스에서 `inserted=0` + `skippedExists` 증가(이미 들어간 행 재삽입 0) 확인.
- [ ] entry 미취득 종목이 있으면 `skippedNoEntry` 로 잡히고 null/0 행이 채점 원장에 들어가지 않았는지 확인.
- [ ] `/dashboard/scorecard` 집계 화면 무회귀(기존 행·신규 backfill 행 정상 표시).

---

## 6. 결함

- **없음**(자동 검증 범위). 회귀·로직 결함 미발견.

---

## 7. 결론

PRD AC-1~9(+AC-0 보강) 전부 코드 추적 + 신규 단위테스트(10건)로 검증 통과. lint/tsc/test(462)/build 실측 통과. 멱등·대상 필터·entry 안전·cron 통합·무회귀·SQL 0 모두 충족. prod 실 insert·실 KIS 종가만 운영자 라이브 확인으로 분리.

**판정: qa-passed** (실패 0건). 머지 가능 상태(머지 게이트는 review-approved — 본 QA 범위 밖).
