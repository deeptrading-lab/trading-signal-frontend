# QA Report: frontend-architecture-restructure

- **PRD**: [docs/prd/frontend-architecture-restructure.md](../prd/frontend-architecture-restructure.md)
- **PR**: [#9 feat: 프론트엔드 아키텍처 재편 (axios + TanStack Query + lib 분리)](https://github.com/deeptrading-lab/trading-signal-frontend/pull/9)
- **브랜치**: `feature/frontend-architecture-restructure`
- **검증일**: 2026-05-20
- **검증자**: QA 에이전트
- **BE 상태**: LIVE — `curl http://127.0.0.1:8000/health` → 200 OK (engine 레포에서 `ALLOW_UNAUTHENTICATED_WORKBENCH=1 PYTHON=.venv/bin/python make signal-workbench` 로 띄움)
- **Next dev**: 본 QA 가 두 인스턴스를 띄워 검증 (3000 LIVE BE 대상 / 3030 FASTAPI_BASE_URL override → 닫힌 포트 59999 대상)

---

## 1. 수용 기준 검증

### AC-1 (직접 호출 금지)

| 항목 | 값 |
|---|---|
| 재현 절차 | `git grep -nE "http://127\.0\.0\.1:(8000\|8765)" -- app/` |
| 기대 결과 | `app/api/**/route.ts` 내 `FASTAPI_BASE_URL` fallback 외 0건 |
| 실측 결과 | 2건 모두 `app/api/whitelist/search/route.ts:11`, `app/api/workbench/analyze/route.ts:11` 의 fallback 상수 — PRD 명시 예외에 해당 |
| 판정 | PASS |

명령 출력:

```
app/api/whitelist/search/route.ts:11:const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";
app/api/workbench/analyze/route.ts:11:const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";
```

### AC-2 (env 단일 진입)

| 항목 | 값 |
|---|---|
| 재현 절차 | (a) `lib/api/client.ts` 의 axios `baseURL` 코드 인스펙션. (b) 두 route handler 가 `process.env.FASTAPI_BASE_URL` 만 참조하는지 확인. (c) `.env.example` 키 노출 확인. (d) `FASTAPI_BASE_URL=http://127.0.0.1:59999` 로 별도 dev (`:3030`) 띄워 환경변수만으로 전환됨을 검증. |
| 기대 결과 | `baseURL` = `/api` (same-origin), route handler 만 `FASTAPI_BASE_URL` 참조, 코드 수정 없이 env 만으로 dev/prod 전환 가능 |
| 실측 결과 | `lib/api/client.ts:16` `baseURL: "/api"`. 두 route handler 가 `process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000"` 1줄로만 BE 주소 참조. `.env.example:18` 에 키와 주석 명시. override 한 :3030 인스턴스가 코드 수정 없이 다른 BE 호스트를 가리킴 |
| 판정 | PASS |

### AC-3 (axios 단일 인스턴스)

| 항목 | 값 |
|---|---|
| 재현 절차 | `git grep -nE "fetch\(" -- app/ lib/` |
| 기대 결과 | route handler (`app/api/**/route.ts`) 안의 server-side fetch 외 0건. `lib/api/client.ts` 에 axios 인스턴스 1개 export |
| 실측 결과 | 2건 모두 `app/api/whitelist/search/route.ts:23`, `app/api/workbench/analyze/route.ts:31` (server-side proxy, 예외 인정). `lib/api/client.ts:15` `httpClient: AxiosInstance` 1개 export, 클라이언트 함수(`searchWhitelist`, `analyzeWorkbench`) 둘 다 이 인스턴스만 import |
| 판정 | PASS |

### AC-4 (TanStack Query 적용)

| 항목 | 값 |
|---|---|
| 재현 절차 | (a) `lib/query/use-whitelist-search.ts`, `lib/query/use-analyze-workbench.ts` 코드 인스펙션. (b) `git grep -nE "useState\|useEffect" -- app/` 로 데이터 페칭 트리거용 패턴 부재 확인. |
| 기대 결과 | `useWhitelistSearch` 가 `useQuery`, `useAnalyzeWorkbench` 가 `useMutation`. 컴포넌트 내부 `useState+useEffect` 로 fetch 트리거하는 패턴 0건 |
| 실측 결과 | `use-whitelist-search.ts:30` `useQuery<WhitelistItem[], ApiError>({ queryKey, queryFn: () => searchWhitelist(q), staleTime: 30_000, retry: 1, refetchOnWindowFocus: false })`. `use-analyze-workbench.ts:23` `useMutation<AnalyzeResponse, ApiError, AnalyzeRequest>({ mutationFn: (payload) => analyzeWorkbench(payload) })`. grep 결과 `app/` 안의 `useState` 는 `app/providers.tsx` 의 `QueryClient` 1회 생성 패턴 (App Router 권장) 한 곳뿐, `useEffect` 0건 |
| 판정 | PASS |

### AC-5 (타입 일치)

| 항목 | 값 |
|---|---|
| 재현 절차 | (a) `lib/types/whitelist.ts`, `lib/types/workbench.ts` 인스펙션. (b) `git grep -nE ": any\b" -- lib/`. |
| 기대 결과 | 6블록(`Brief`, `Feasibility`, `Horizons`, `RiskPlan`, `Action`, `Warnings`) + `WhitelistItem` 정의, 클라이언트 함수 반환 타입이 이 타입을 사용, `any` 0건 |
| 실측 결과 | 6블록 + `AnalyzeRequest`/`AnalyzeResponse`/`AnalyzeAnalysis`/`AnalyzeInputEcho` 모두 `lib/types/workbench.ts` 에 정의. `WhitelistItem` + `WhitelistSearchResponse` 는 `lib/types/whitelist.ts`. `analyzeWorkbench(payload: AnalyzeRequest): Promise<AnalyzeResponse>`, `searchWhitelist(q): Promise<WhitelistItem[]>` 시그니처 일치. `git grep` 결과 0건 (`unknown` 만 사용) |
| 판정 | PASS |

### AC-6 (입력 사전 차단 단위 검증)

| 항목 | 값 |
|---|---|
| 재현 절차 | `npx tsx /tmp/qa-validate.mts` 로 17개 케이스 (capital ≤0/NaN/음수, return <0/NaN/=0 허용, period ≤0/소수/NaN, max_loss ≤0/>5/=5 허용/NaN, ticker 빈/화이트리스트 외, max_loss 미입력) 호출 |
| 기대 결과 | 모든 경계 위반 케이스에서 `ok=false` + 한글 메시지. 정상 케이스 (return=0, max_loss=5, max_loss 미입력 등) 는 `ok=true` |
| 실측 결과 | 17/17 PASS. 한글 메시지 5개 그대로 반환: `"종목을 선택해 주세요."`, `"지원 종목이 아니에요. AAPL 또는 BTC-USD 중 선택해 주세요."`, `"투자 가능 금액은 0보다 큰 숫자여야 해요."`, `"목표 수익률은 0 이상의 숫자여야 해요."`, `"목표 기간은 1 이상의 정수(일) 여야 해요."`, `"최대 손실률은 0보다 크고 5 이하의 숫자여야 해요."` |
| 판정 | PASS |

검증 로그 (전체 17건 PASS) 발췌:

```
[PASS] baseline ok (AAPL valid input): expected ok=true, got ok=true
[PASS] capital_amount <= 0: errors={"capital_amount":"투자 가능 금액은 0보다 큰 숫자여야 해요."}
[PASS] capital_amount NaN: errors={"capital_amount":"투자 가능 금액은 0보다 큰 숫자여야 해요."}
[PASS] capital_amount negative
[PASS] target_return_pct < 0
[PASS] target_return_pct NaN
[PASS] target_return_pct = 0 ok (>= 0 allowed)
[PASS] target_period_days <= 0
[PASS] target_period_days non-integer (1.5)
[PASS] target_period_days NaN
[PASS] max_loss_pct <= 0
[PASS] max_loss_pct > 5
[PASS] max_loss_pct = 5 ok (boundary inclusive)
[PASS] max_loss_pct NaN
[PASS] ticker empty
[PASS] ticker not in whitelist (NVDA)
[PASS] max_loss_pct omitted (BE default) ok
```

### AC-7 (route handler 정합)

| 항목 | 값 |
|---|---|
| 재현 절차 | 코드 인스펙션 (`app/api/whitelist/search/route.ts`, `app/api/workbench/analyze/route.ts`) + 4건의 라운드트립: (1) 정상 분석, (2) NVDA 화이트리스트 외 → 400 통과, (3) capital=-1 → 422 통과, (4) 빈 본문/잘못된 JSON → 400 한글 폴백 |
| 기대 결과 | try/catch + `AbortSignal.timeout(30_000)` + 4xx/5xx body 그대로 통과 + JSON 외 Content-Type text fallback + 빈/파싱 실패 시 한글 폴백 |
| 실측 결과 | 두 handler 모두 try/catch + `signal: AbortSignal.timeout(30_000)` + `passthrough()` 함수가 `application/json` 외 Content-Type 일 때 text 폴백, 본문 비면 한글 폴백 500/원본status. 라운드트립: NVDA → `{detail: "NVDA는 분석 가능한 화이트리스트에 없습니다"}` + 400 그대로 통과, capital=-1 → Pydantic 422 detail 그대로 통과, 빈 본문/malformed → `{error: "요청 본문을 해석할 수 없어요. 다시 시도해 주세요."}` + 400 |
| 판정 | PASS |

라운드트립 로그:

```
=== POST analyze ticker=NVDA ===
{"detail":"NVDA는 분석 가능한 화이트리스트에 없습니다"}
---STATUS:400

=== POST analyze capital=-1 ===
{"detail":[{"type":"greater_than","loc":["body","capital_amount"],"msg":"Input should be greater than 0","input":-1,"ctx":{"gt":0}}]}
---STATUS:422

=== Edge: empty body POST ===
{"error":"요청 본문을 해석할 수 없어요. 다시 시도해 주세요."}
---STATUS:400

=== Edge: malformed JSON body ===
{"error":"요청 본문을 해석할 수 없어요. 다시 시도해 주세요."}
---STATUS:400
```

### AC-8 (build/typecheck/lint)

| 항목 | 값 |
|---|---|
| 재현 절차 | `npm run typecheck && npm run lint && npm run build` |
| 기대 결과 | 3개 명령 모두 exit 0 |
| 실측 결과 | typecheck exit 0, lint exit 0, build exit 0. `next build` 로그 발췌: `✓ Compiled successfully in 708ms` / `✓ Generating static pages (6/6)`. Route 표: `/` (Static), `/api/whitelist/search` (Dynamic), `/api/workbench/analyze` (Dynamic) |
| 판정 | PASS |

### AC-9 (폴더 분리)

| 항목 | 값 |
|---|---|
| 재현 절차 | `lib/types/`, `lib/api/`, `lib/query/`, `lib/validation/` 디렉터리·파일 존재 확인 + `app/page.tsx` 가 fetch·타입·검증을 인라인하지 않는지 확인 |
| 기대 결과 | 4개 모듈 분리, `app/page.tsx` 는 placeholder |
| 실측 결과 | `lib/api/{client,errors,whitelist,workbench}.ts`, `lib/query/{keys,use-whitelist-search,use-analyze-workbench}.ts`, `lib/types/{whitelist,workbench}.ts`, `lib/validation/analyze.ts` 모두 존재. `app/page.tsx` 는 placeholder JSX 만 (fetch/axios/검증 호출 0건) |
| 판정 | PASS |

### AC-10 (placeholder 안전)

| 항목 | 값 |
|---|---|
| 재현 절차 | `app/page.tsx` 인스펙션 + dev 서버에서 `curl http://localhost:3000/` 200 확인 |
| 기대 결과 | 빌드 통과, 직접 호출 0건, 화면에 "재구성 중" 안내 텍스트 존재 |
| 실측 결과 | `app/page.tsx` 가 `<h1>화면 재구성 중</h1>` + `<h2>새 분석 화면 도입 예정</h2>` + 후속 PRD `workbench-analyze-rebuild` 명시. fetch/axios import 0건. dev 200 OK |
| 판정 | PASS |

### AC-11 (whitelist 라운드트립)

| 항목 | 값 |
|---|---|
| 재현 절차 | dev `:3000` (FASTAPI_BASE_URL 기본값) → `curl "http://localhost:3000/api/whitelist/search?q=APPLE"` |
| 기대 결과 | 200 + `results[]` 에 `ticker: "AAPL"`, `aliases: ["APPLE"]` 포함 |
| 실측 결과 | `{"results":[{"ticker":"AAPL","name":"Apple Inc.","asset_type":"US_EQUITY","exchange":"NASDAQ","currency":"USD","sector":"Technology","enabled":true,"risk_tier":"MEDIUM","aliases":["APPLE"],"notes":""}]}` + STATUS 200 |
| 판정 | PASS |

---

## 2. 에지 케이스

| # | 시나리오 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| E1 | BE 다운 (FASTAPI_BASE_URL 을 닫힌 포트 59999 로 override, GET /api/whitelist/search) | route handler 가 502 + 한글 폴백 메시지 | `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` + 502 | PASS |
| E2 | BE 다운 (POST /api/workbench/analyze) | route handler 가 502 + 한글 폴백 메시지 | `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` + 502 | PASS |
| E3 | 빈 본문 POST /api/workbench/analyze | route handler 가 400 + 한글 폴백 (`요청 본문을 해석할 수 없어요...`) | 400 + `{"error":"요청 본문을 해석할 수 없어요. 다시 시도해 주세요."}` | PASS |
| E4 | malformed JSON (`this is not json`) POST | 400 + 한글 폴백 | 400 + 동일 메시지 | PASS |
| E5 | BE 가 30초 hang (타임아웃) — 코드 인스펙션 | `AbortSignal.timeout(30_000)` 가 두 handler 모두 적용되어 있고 catch → 502 + 한글 폴백 분기로 떨어짐 | `route.ts:27/36` 각각 `signal: AbortSignal.timeout(TIMEOUT_MS)`, TIMEOUT_MS=30_000. catch 분기에서 502 + `FALLBACK_NETWORK_MESSAGE` 반환 (E1/E2 와 동일 경로) | PASS |
| E6 | 잘못된 ticker (`NVDA`, 화이트리스트 외) POST | BE 가 400 + `{detail: "NVDA는 분석 가능한 화이트리스트에 없습니다"}` 그대로 통과 | 400 + 동일 body 통과 | PASS |
| E7 | 음수 capital (-1) POST | BE 가 422 + Pydantic detail 그대로 통과 | 422 + `{"detail":[{"type":"greater_than","loc":["body","capital_amount"],...}]}` 통과 | PASS |
| E8 | `validateAnalyzePayload` NaN 입력 5종 | 모두 거절 + 한글 메시지 | capital_amount/target_return_pct/target_period_days/max_loss_pct NaN 모두 거절, ticker 빈 문자열도 거절. AC-6 로그 참고 | PASS |
| E9 | `validateAnalyzePayload` 경계값 (target_return_pct=0, max_loss_pct=5) | 통과 (PRD 명세 `>= 0`, `<= 5`) | 두 케이스 모두 `ok=true` | PASS |
| E10 | BE 가 비 JSON (HTML 에러 페이지) 응답 — 코드 인스펙션 | `passthrough()` 가 Content-Type 분기에서 text 로 안전 폴백, 빈 본문이면 한글 폴백 500 | `route.ts:46-69` 의 `passthrough()` 가 `!contentType.includes("application/json")` 분기에서 text 통과, 빈 본문이면 `FALLBACK_PARSE_MESSAGE` + status 보전 | PASS |
| E11 | axios 인터셉터의 `ApiError` 매핑 — 코드 인스펙션 | 422 → kind=validation, 400+화이트리스트 메시지 → kind=whitelist_miss, 5xx → kind=server, no-response → kind=network (ECONNABORTED 시 한글 메시지) | `lib/api/client.ts:42-87` 의 `mapAxiosError` 분기가 PRD §9 OPEN QUESTION 3 골격 그대로 구현 | PASS |

---

## 3. 자동화 명령 로그 요약

```
$ git grep -nE "http://127\.0\.0\.1:(8000|8765)" -- app/
app/api/whitelist/search/route.ts:11:...FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";
app/api/workbench/analyze/route.ts:11:...FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";

$ git grep -nE "fetch\(" -- app/ lib/
app/api/whitelist/search/route.ts:23:    response = await fetch(
app/api/workbench/analyze/route.ts:31:    response = await fetch(`${FASTAPI_BASE_URL}/api/workbench/analyze`, {

$ git grep -nE ": any\b" -- lib/
(no output)

$ npm run typecheck    # exit 0
$ npm run lint         # exit 0
$ npm run build        # exit 0 — ✓ Compiled successfully in 708ms / 6/6 pages

$ curl http://127.0.0.1:8000/health → 200
$ curl "http://localhost:3000/api/whitelist/search?q=APPLE" → 200 + AAPL alias 매칭
$ curl -X POST .../api/workbench/analyze (valid) → 200 + 6블록 envelope
$ curl -X POST .../api/workbench/analyze (NVDA) → 400 통과
$ curl -X POST .../api/workbench/analyze (capital=-1) → 422 통과
$ curl -X POST .../api/workbench/analyze (empty body) → 400 + 한글 폴백
$ curl -X POST .../api/workbench/analyze (malformed JSON) → 400 + 한글 폴백
$ FASTAPI_BASE_URL=http://127.0.0.1:59999 → both routes → 502 + 한글 폴백
```

---

## 4. 결함

없음.

---

## 5. PR 본문 자가검증 대비 QA 재현 결과

| 항목 | 작성자 자가검증 | QA 재현 결과 |
|---|---|---|
| AC-1 ~ AC-11 11건 | 모두 PASS 명시 | 11/11 재현 PASS |
| 라운드트립 5건 (whitelist APPLE, analyze offline, NVDA, capital=-1, placeholder /) | 모두 OK 명시 | 5/5 동일하게 재현됨 (placeholder / 는 dev :3000 GET 200 확인) |

자가검증과 QA 재현 결과 일치. 불일치 항목 없음.

---

## 6. PR 본문 게이트 확인

PR #9 본문에 `## 다음 작업` 섹션 존재 — handoff-append workflow 가 빈 항목으로 commit 되지 않음. 라벨 부여 게이트 OK.

---

## 판정

**qa-passed** — AC 11건 + 에지 케이스 11건 모두 PASS, 실패 0건.
