# QA — open-beta-conditions-panel (성적표 오픈베타 조건 패널)

- 실행: 2026-10-18 20:25 KST, QA 역할
- 대상: PR #395 `feature/open-beta-conditions-panel` @ `4bcba9c`
- 근거: `docs/prd/ai-direction-quality.md` §10-1 (오픈베타 조건 5항목), PR 본문, 매니저가 준 AC 1~6
- 방법: PR 테스트와 별개로 직접 만든 시드로 임시 vitest 를 돌렸다 (순수 함수, route `vi.mock`, 실제 `UpstashKisStore` 장애 주입, `renderToStaticMarkup`). 실데이터는 `.env.local` 로 Supabase·KV 를 GET 만 해서 확인했다. 반응형은 `next build` CSS 를 붙인 SSR 정적 페이지를 headless Chromium(Playwright)에서 열어 쟀다. 임시 파일은 삭제했고 커밋하지 않았다.

## 판정: qa-failed (실패 1건)

KV 장애가 "확인 불가"가 아니라 "미달 · 실행 기록 없음"으로 표시된다 (AC-2b). 나머지 항목은 통과다.

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1a 무효화 라인 95% 경계 | BUY 행 19 stop + 1 null / 190+10 / 949+51 | 19/20, 190/200 은 통과. 949/1000(94.9%) 은 미달 | `pass n20 count19 rate 0.95`, 190/200 pass, 949/1000 `fail` | 통과 |
| AC-1b 방향 verdict 범위 | BUY·OW·SELL·REDUCE·UW 각 1 + HOLD(stop null) | n=5, HOLD 제외 | n5 count5 | 통과 |
| AC-1c 28일 창 KST 경계 | now=`2026-10-18T15:00Z`(10-19 00:00 KST) 에 entry 09-21(stop)·09-20(null) / now=`14:59:59Z`(10-18 23:59 KST) 에 entry 09-20(null)·09-19 | 첫째 since=09-21 → n1 pass. 둘째 since=09-20 → n1 count0 fail | 둘 다 기대와 같음 | 통과 |
| AC-1d 표본 0 | 창 밖 행만 | `pending`, rate null | `{pending,0,0,null}` | 통과 |
| AC-1e 채점 연속성 영업일 | 금(10-16)→월(10-19) / 금(10-09)→수(10-14) / 금→목(10-15) | 1 통과 / 3 통과 / 4 미달(stale) | 1 pass, 3 pass, 4 `fail stale` | 통과 |
| AC-1f 연속성 KST 경계 | at=`2026-10-16T15:30Z`(토 00:30 KST), now 월 / 화 실행, now=금 23:59:59 KST / 월 실행, now=토 00:00 KST | 1 / 3 통과 / 4 미달 | 1 pass, 3 pass, 4 fail | 통과 |
| AC-1g ok:false·마커 없음 | `{ok:false}`, `null`, `{at:"garbage"}`, `"unavailable"` | 미달 not_ok, 미달 no_marker, 미달 no_marker, 확인 불가 | 전부 기대대로 | 통과 |
| AC-1h 배지 16일 성숙 경계 | 카드 updatedAt = now−16d 정각 / now−16d+1ms | 정각은 포함, +1ms 는 제외(대상 0 → 보류) | n1 count1 pass / n0 pending | 통과 |
| AC-1i 배지 대상 0·조회 실패·US | `[]`, `null`, AAPL 카드 | 보류, 확인 불가, US 제외 | pending, unknown, n0 | 통과 |
| AC-1j 배지 매칭 | 카드 5장: runId 일치(시각 3일 차) / 9분 차 / 11분 차 / 같은 시각이지만 원장은 다른 ticker / 매칭되지만 전 horizon pending | 2/5 부착 → 40% 미달 | `n5 count2 fail` | 통과 |
| AC-1k 헤드라인 4상태 | 패널을 `renderToStaticMarkup` | 모두 통과=`자동 항목 통과 · 수동 2항목 확인 필요`(outcome-hit), 미달 2 + 보류 1=`미달 2항목…`(warn), 보류만=`판정 보류 2항목…`(muted), 확인 불가=`판정 보류 N항목` + 행 `확인 불가`·`실행 기록 조회 실패`·`조회 실패` | 전부 일치. 확인 불가는 PR 본문대로 "판정 보류" 헤드라인에 합산. 표는 헤더 1 + 5행, `수동 점검` 2행 | 통과 |
| AC-1l TZ 독립 | 위 20개 시드를 기본 TZ, `TZ=UTC`, `TZ=America/Los_Angeles` 로 | 모두 통과 | 20/20 × 3 | 통과 |
| AC-2a admin 게이트 | route `GET`, `requireAdminApi` 가 403 반환 | 403, 원장·카드·KV 미호출 | 403, 세 조회 모두 호출 0회 | 통과 |
| AC-2b KV 실패 → 확인 불가 | **실제 `UpstashKisStore`** 에 `redis.get` throw / 2초 지연(store 타임아웃 600ms)을 주입하고 `readScorecardCronMeta()` → `summarizeCronContinuity` | `unknown` / `unavailable` ("확인 불가 · 실행 기록 조회 실패") | 두 경우 모두 `{"status":"fail","reason":"no_marker"}` → 화면엔 **"미달 · 실행 기록 없음"**, 헤드라인 "미달 1항목" | **실패** |
| AC-2c 카드 조회 실패 → 확인 불가 | `getDecisionCardKeysBefore` 가 `null` / reject | badge 만 unknown, stopLine·continuity 정상, `cells`·`directionGate`·`totalRows` 유지, 200 | 기대대로. reject 도 200 + badge unknown | 통과 |
| AC-2d mocked KV reject | `readScorecardCronMeta` 자체가 reject | continuity unknown | `{unknown, unavailable}`, 나머지 정상 | 통과 (실제 store 는 reject 하지 않음 — AC-2b 참고) |
| AC-2e 카드 cutoff | route 호출 인자 | now−16d | 오차 5초 이내 | 통과 |
| AC-2f egress | `getDecisionCardKeysBefore` 소스 | `select=ticker,updated_at,run_id` 만, decision JSONB 없음 | `select=ticker,updated_at,run_id`, `updated_at=lte.<cutoff>`, `order=updated_at.desc`, `limit=1000`. 실패·비배열은 `null`(빈 배열과 구분) | 통과 |
| AC-3 `toOutcomeCandidate` 매핑 | `scorecardStore.getRecentOutcomeRows` 와 필드별 대조 (아래 표) | 같은 규칙 | 정상 DB 값에서는 같은 결과. 차이는 관찰 O-2 | 통과 |
| AC-4a 배치 | 실데이터로 `ScorecardContainer` 전체 SSR (QueryClient 에 summary 선주입) | 첫 h2 = 오픈베타 조건, 그 아래 "방향 적중 (참고 지표)" + 안내 | h2 순서 `["오픈베타 조건 (판정 정직성)", "방향 적중 (참고 지표)"]`. 안내 "오픈베타 조건이 아니에요 — …" 노출 | 통과 |
| AC-4b 375 / 1280 | 아래 반응형 절 | 가로 넘침 없음 | 375: doc 375, table 347 = wrap 347. 1280: table 1152 = wrap 1152 | 통과 |
| AC-4c 색 | 계산 색(computed) | 통과=outcome-hit, 미달=warn, 보류·수동=muted, 등락색 0 | 통과 `rgb(22,101,52)`, 판정 보류·수동 점검·헤드라인 `rgb(91,100,112)`. 미달=`text-warn` 은 렌더 시드에서 클래스 확인 | 통과 |
| AC-4d 직타·카피 | `git grep -nE "#[0-9a-fA-F]{3,6}\b\|[0-9]+px\|signal-up\|signal-down\|text-up\|text-down"` (새 패널·DirectionGatePanel), 패널의 주석 아닌 줄 한글 grep | 0건 / 0줄 | 0건 / 0줄. 문구는 모두 `lib/copy/scorecard/labels.ts` 의 `OPEN_BETA_*`·`GATE_REFERENCE_NOTE` 경유 | 통과 |
| AC-5 실데이터 | `npx tsx --env-file=.env.local` 로 원장·카드 키·KV 마커 GET → `summarizeOpenBetaConditions` | 1 보류 0건, 3 통과, 4 100% 67/67 | 원장 130행(마지막 진입 2026-09-02, 방향 판정 121/121 stop 보유). stopLine `pending n0`. continuity `pass, at 2026-10-18T08:05:52Z, ok, 0영업일`. badge `pass 67/67`(run_id 보유 카드 1건). store=`UpstashKisStore`, degraded=false | 통과 |
| AC-6a tsc | `npx tsc --noEmit` | 0 | exit 0 | 통과 |
| AC-6b eslint | `npx eslint components/scorecard lib/server/scorecard lib/copy/scorecard lib/types/scorecard lib/stock/decisionOutcome.ts lib/server/ai/decisionStore.ts app/api/scorecard` | 0 | exit 0 | 통과 |
| AC-6c vitest | `npx vitest run lib/server/scorecard app/api/scorecard lib/stock` | 전부 통과 | 16 files / 228 passed | 통과 |
| AC-6d build | `npx next build` | 성공 | exit 0, `ƒ /dashboard/scorecard` | 통과 |
| AC-6e 빌드 CSS | `.next/static/chunks/*.css` 에서 클래스 grep | 새 클래스 모두 존재 | `text-outcome-hit text-warn text-text-muted text-caption whitespace-nowrap tabular-nums font-normal overflow-x-auto pl-md pr-md py-md border-b border-border-line text-label-sm text-body-sm gap-x-md gap-y-xs items-baseline flex-wrap` 각 1건, `last:border-b-0` 있음 | 통과 |

### AC-3 필드 대조

| 필드 | `getRecentOutcomeRows` (raw → candidate) | `toRow` → `toOutcomeCandidate` | 같은가 |
|---|---|---|---|
| ticker | `String(r.ticker)` | `r.ticker` | 같음 (text 컬럼) |
| decidedAt | `String(r.decided_at)` | `r.decided_at` | 같음 |
| runId | 문자열이면 그대로, 아니면 `null` | `r.run_id` (string\|null) | 같음 |
| statuses d1/w1/w2/m1 | 문자열이면 그대로, 아니면 `"pending"` | `r.<h>_status` 그대로 | 정상 값에서 같음. NULL 이면 `"pending"` 대 `null` 이지만 `selectDecisionOutcome` 이 hit/miss/flat 만 고르므로 결과는 같음 |
| excess d1/w1/w2/m1 | `toNum` (문자열→숫자, 유한값 아니면 null) | `num` (같은 규칙) | 같음 |
| 매칭 키 | attachOutcome 은 `item.tokens.runId` | 카드 키의 `run_id` 컬럼 | 같음. `tokens.runId` 가 `row.run_id` 에서 만들어짐 (`decisionStore.ts:137`) |
| ticker 그룹 | `byTicker` | `byTicker` | 같음 |

## 실패 상세 — AC-2b KV 장애가 "미달"로 표시됨

- 재현 조건: prod 처럼 `KIS_TOKEN_STORE=kv` 에서 Upstash 가 에러를 내거나 600ms 안에 응답하지 않을 때.
- 원인: `getKisStore().get()` 은 fail-soft 라 에러·타임아웃이 나도 throw 하지 않고 `null` 을 돌려준다 (`lib/api/kis/store.ts` `withTimeoutSoft`, 인터페이스 주석 "미존재·에러·타임아웃 시 null"). 그래서 `readScorecardCronMeta()` 도 `null` 을 돌려주고, route 의 `.catch(() => "unavailable")` 에는 닿지 않는다. store 타임아웃(600ms)이 route 예산(3초)보다 짧아 route 쪽 timeout 으로도 가지 않는다. `"unavailable"` 경로는 실제로는 쓰이지 않는다.
- 로그 (임시 vitest):
  ```
  THROW   meta= null result= {"status":"fail","reason":"no_marker","lastRunAt":null,"businessDaysAgo":null}
  TIMEOUT meta= null result= {"status":"fail","reason":"no_marker","lastRunAt":null,"businessDaysAgo":null}
  × expected 'fail' to be 'unknown'
  ```
- 기대: 3번 행 "실행 기록 조회 실패 / 확인 불가"(muted), 헤드라인 "판정 보류 1항목".
- 실제: 3번 행 "실행 기록 없음 / 미달"(warn), 헤드라인 "미달 1항목". 운영자는 cron 이 멈췄다고 잘못 판단하게 된다. PR 본문의 "KV 조회가 실패하면 해당 항목만 확인 불가" 설명과도 다르다.
- 수정 방향 (참고, 개발자 판단): store 의 `wasLastCallDegraded?.()` 로 "정당한 miss"와 "도달 불가"를 구분해 `"unavailable"` 로 넘긴다. `token.ts` 가 이미 같은 방식을 쓴다. 이 경로를 실제 `UpstashKisStore` 장애 주입으로 검증하는 테스트도 함께 넣는다.

## 반응형 실측 (실데이터 SSR + 빌드 CSS, headless Chromium)

`ScorecardContainer` 전체(페이지 헤더 + `.main-area` 래퍼)를 실데이터로 렌더했다. 빌드 CSS 두 청크는 실제 앱과 같은 순서(`0gpwxwa5-txoc.css` → `0dkkqyqcjhd07.css`)로 붙였다. 순서가 반대면 `@layer` 순서가 뒤집혀 preflight 가 `.main-area` 패딩을 지우므로 맞춰서 쟀다.

| 뷰포트 | doc scrollWidth | 패널 wrap / table scrollWidth | 패널 행 높이 (1~5) | 헤드라인 | 비고 |
|---|---|---|---|---|---|
| 1280 | 1280 (넘침 없음) | 1152 / 1152 | 59 / 59 / 59 / 59 / 58 | 판정 보류 1항목 · 수동 2항목 확인 필요 | 조건 설명이 한 줄씩 |
| 375 | 375 (넘침 없음) | 347 / 347 | 92 / 76 / 143 / 92 / 84 | 같음 | 3번 대리 지표 설명이 5줄로 줄바꿈. 수동 값 셀도 2~3줄. 가로 스크롤 없음 |
| 320 (참고) | 320 (넘침 없음) | 292 / 292 | 130 / 97 / 176 / 130 / 113 | 같음 | 넘침 없음 |

스크린샷 (커밋하지 않음): `/tmp/qa395/scorecard-375.png`, `/tmp/qa395/scorecard-1280.png`, `/tmp/qa395/scorecard-320.png`.

## 에지 케이스

| 케이스 | 결과 |
|---|---|
| Supabase 미설정 | `openBeta: null` 이고 컨테이너는 패널을 렌더하지 않음 (`data.openBeta ? … : null`) |
| 카드 조회 비정상 응답·JSON 파싱 실패·비배열 | `null` → "확인 불가 / 조회 실패" (빈 배열 "대상 카드 없음"과 구분됨) |
| 카드 조회 3초 초과 | route `withTimeout` → `.catch(() => null)` → 확인 불가, 응답 200 |
| KV 장애 | **미달로 표시됨 (실패 AC-2b)** |
| 로컬 `KIS_TOKEN_STORE` 미설정 (memory store) | 마커가 없어서 "미달 · 실행 기록 없음". 로컬 전용 상황이라 정상 동작으로 본다 |
| 마커 `at` 이 깨진 문자열 | 미달 no_marker |
| US ticker 카드 | 배지 대상에서 빠짐 |
| 원장 2000행 상한 | PR "다음 작업"에 기록됨. 현재 130행이라 영향 없음 |
| 표시 반올림 | `pctOf` 가 `Math.round` 라 949/1000 은 "95% (949/1000) · 미달", 996/1000 은 "100%" 로 보임 (관찰 O-1) |
| BE(FastAPI) 다운 | 해당 없음. 이 기능은 FastAPI 를 쓰지 않음 |

## 공통 AC

| 항목 | 결과 |
|---|---|
| typecheck/lint/build | 0 에러 (AC-6) |
| BFF 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` (route.ts 제외) 2건. 둘 다 `app/api/workbench/_adapters/fastapi.ts` 의 서버 측 fallback(주석 1, env 기본값 1)이고 main 과 같은 수. 이 PR 은 `app/` 에서 route.ts 만 바꿈 |
| 한글 톤 | 새 문구는 전부 한글이고 `lib/copy` 경유. 영어는 고유명사(GitHub Actions)와 PR 번호뿐 |
| 접근성 | `section aria-labelledby="open-beta-title"` + `h2 id`, `th scope="col"`/`scope="row"`. 판정이 색과 함께 텍스트로도 표시됨. 인터랙티브 요소가 없어 Tab 순서 변화 없음 |

## 라운드트립

- FastAPI 와 무관한 기능이다 (Supabase `signal_scorecard`·`ai_analysis_decisions` 와 KV 만 읽음). PR #11 의 AC-14 a~e 는 analyze 플로우용이라 범위 밖이다.
- `/dashboard/scorecard` 는 Google OAuth admin 세션이 있어야 열려서 dev 라이브 로그인은 하지 않았다. 대신 실데이터를 실제 컴포넌트로 SSR 하고 빌드 CSS 를 붙여 두 뷰포트에서 쟀다. prod 에서 운영자가 한 번 직접 확인하길 권한다.
- DESIGN.md 토큰 라이브 동기화: 해당 없음. 새 토큰 없이 기존 토큰(`outcome-hit`, `warn`, `text-muted`, `border-line`, `caption`)만 사용.

## 관찰 (머지를 막지 않음)

- O-1 비율 표시 반올림: 94.5~94.9% 가 "95%"로 보이면서 판정은 "미달"이다. 경계 근처에서 숫자와 판정이 어긋나 보인다. 내림이나 소수 1자리 표시를 검토할 만하다.
- O-2 상태 NULL 정규화: `getRecentOutcomeRows` 는 NULL 상태를 `"pending"` 으로 바꾸고 `toRow` 는 그대로 둔다. 판정 결과는 같지만, 주석의 "같은 필드 규칙"을 엄밀히 하려면 맞춰 두는 편이 낫다.
- O-3 375 아래쪽 기존 `ScorecardTable` 에서 "구분" 열이 글자 단위로 꺾인다 (스크린샷 하단). 이 PR 이전부터 있던 표시이고 범위 밖이다.
- O-4 route 단위 테스트가 없다. AC-2 의 fail-soft·게이트 검증은 QA 임시 테스트로만 했다. AC-2b 를 고칠 때 route 테스트를 함께 두길 권한다.
