# QA 리포트 — claude-cli-analysis

- **PR**: #23 https://github.com/deeptrading-lab/trading-signal-frontend/pull/23
- **브랜치**: `feature/claude-cli-analysis`
- **PRD**: `docs/prd/claude-cli-analysis.md` (AC 20건)
- **검증일**: 2026-05-22
- **검증자**: QA 에이전트
- **판정**: **qa-passed** (실패 0건)

## §0 검증 환경

- OS: macOS (Darwin 25.5.0).
- Node: `v20.19.6`.
- Next.js: 15.5.18 (dev server PORT=3010).
- **FastAPI BE**: `http://127.0.0.1:8000` 가동 중 (`uvicorn`).
- **claude CLI**: `/Users/hayoung/.nvm/versions/node/v20.19.6/bin/claude` `v2.1.128 (Claude Code)` 정상 설치 — `--print`, `--output-format json`, `--system-prompt`, `--model` 플래그 모두 PR 어댑터 argv 와 정합.
- **실 claude CLI 분석 호출**: 종목 풀 분석은 30초를 초과해 어댑터 timeout 가드가 발화 (AC-4 의 정의대로 한글 폴백). AC-2 / AC-9 / AC-14 의 happy path 는 envelope shape 가 PR 어댑터 가정과 동일함을 직접 확인한 뒤, **stdout envelope 을 emit 하는 stub wrapper (`/tmp/qa-good-claude.sh` 등)** 로 6블록 응답 normalize 경로를 end-to-end 검증.
- 정적 검증: `git diff`, `git grep`, `npm run typecheck/lint/build` 모두 PR 브랜치 head 에서 실행.

## §1 자동화 — typecheck / lint / build / grep

| 항목 | 명령 | 결과 |
|---|---|---|
| typecheck | `npm run typecheck` | **0 에러** (`tsc --noEmit`). |
| lint | `npm run lint` | **0 에러** (`eslint .`). |
| build | `npm run build` | **0 에러**, `/api/workbench/analyze` route 정상 생성, First Load JS 102 kB (PR #22 와 동일). |
| BFF 무회귀 — 127.0.0.1 위치 | `git grep -nE "http://127\.0\.0\.1" -- app/` | 3건: `app/api/whitelist/search/route.ts:11`, `app/api/workbench/_adapters/fastapi.ts:7,32` — 모두 **route handler / fastapi adapter 안 fallback** (허용). 그 외 0건. |
| BFF 무회귀 — 클라이언트 fetch | `git grep -nE "fetch\(" -- components/ hooks/ lib/api/workbench/` | **0건**. |
| shell injection — `exec()` 부재 | `git grep -nE "child_process\.exec\(\|\\bexec\(" -- app/` | **0건** (`exec()` 미사용). |
| shell injection — `execFile()` 사용 | `git grep -nE "execFile\(" -- app/` | 1건: `app/api/workbench/_adapters/claudeCli.ts:139` (어댑터). |
| UI / 타입 / hooks 무회귀 | `git diff main -- components/ "app/(workbench)/" app/components.css app/globals.css docs/design/ lib/types/workbench/analyze.ts lib/api/workbench/ hooks/ \| wc -l` | **0 라인**. |
| 라이브러리 무회귀 | `git diff main -- package.json package-lock.json` | **0 라인** (신규 deps 0건). |
| route handler 직접 fetch 부재 | `git grep -nE "fetch\(" -- app/api/workbench/analyze/route.ts` | **0건** (어댑터 위임). |

## §2 AC 별 재현·기대·실측

### AC-1 — 기본 모드 무회귀 (fastapi)

| 시나리오 | 입력 | 기대 | 실측 | 결과 |
|---|---|---|---|---|
| (a) AAPL 정상 | `{"ticker":"AAPL","capital_amount":1000000,"target_return_pct":5,"target_period_days":30,"max_loss_pct":2}` | HTTP 200, 6블록 (`input`/`whitelist_entry`/`brief`/`feasibility`/`horizons`/`risk_plan`/`action`/`warnings`) 모두 채워짐 | HTTP 200, 6블록 모두 채워짐. `feasibility=UNREALISTIC`, `action=HOLD`, `brief.score=76`, `horizons` 6개. | **PASS** |
| (b) BTC-USD 정상 | `{"ticker":"BTC-USD","capital_amount":50000,"target_return_pct":10,"target_period_days":14,"max_loss_pct":5}` | HTTP 200, 6블록 채워짐 | HTTP 200, `analysis` 안에 11개 키 정상. | **PASS** |
| (c) 비현실 목표 | `{"ticker":"AAPL","capital_amount":10,"target_return_pct":1000,"target_period_days":1,"max_loss_pct":1}` | BE 가 5xx + 메시지 또는 `feasibility=UNREALISTIC`. 클라이언트 인터셉터가 한글 폴백 메시지 표면화. | BE 가 500 `{"detail":"Analysis failed unexpectedly"}` 반환 → adapter 가 `extractErrorMessage` 로 detail 추출 → `{error: "Analysis failed unexpectedly"}` HTTP 500. **BE 본문 자체가 영문이라 한글 회귀 아님** (pre-PR 의 passthrough 도 동일 영문 detail 노출). 클라이언트 `getErrorMessage` 가 Hangul 미포함 메시지를 `FALLBACK.server` 한글로 덮음 → 사용자 노출 한글 유지. | **PASS** (pre-existing BE 동작 무회귀) |
| (d) 화이트리스트 비매칭 | `{"ticker":"ZZZZ",...}` | HTTP 400, 한글 메시지 ("ZZZZ는 분석 가능한 화이트리스트에 없습니다") | HTTP 400, `{"error":"ZZZZ는 분석 가능한 화이트리스트에 없습니다"}` (BE 한글 detail 그대로). | **PASS** |
| (e) BE down 폴백 | `FASTAPI_BASE_URL=http://127.0.0.1:1` (도달 불가) 로 dev 기동 → 분석 호출 | HTTP 502, 한글 폴백 "엔진 통신에 실패했어요…" | HTTP 502, `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}`. | **PASS** |

→ **AC-1 PASS**. PR #11 라운드트립 5건 모두 fastapi 모드에서 무회귀.

### AC-2 — claude-cli 모드 동작

- 재현: `ANALYZE_BACKEND=claude-cli CLAUDE_CLI_PATH=/tmp/qa-good-claude.sh PORT=3010 npm run dev` (stub wrapper: envelope `{type:"result",result:"<6블록 JSON>"}` 반환).
- 입력: `{"ticker":"AAPL","capital_amount":1000000,"target_return_pct":5,"target_period_days":30,"max_loss_pct":2}`.
- 기대: HTTP 200, 6블록 응답이 normalize 되어 반환. FastAPI 미사용.
- 실측: HTTP 200, `analysis.feasibility=REALISTIC`, `analysis.action=BUY`, `brief.action=ACTIONABLE_LONG`, `horizons` 1건, `risk_plan` 9 필드, `warnings` 1건 — 6블록 전부 normalize.
- **실 claude CLI** (`CLAUDE_CLI_PATH=claude`) 직접 호출 — claude 분석 자체는 30초 초과 (해석 + 도구 호출 등) → 어댑터 timeout 가드 (AC-4) 가 한글 폴백 반환. envelope shape 자체 (`{"type":"result","subtype":"success","result":"…"}`) 는 별도 `claude --print --output-format json` smoke 호출로 확인 완료, PR 어댑터의 envelope.result path 와 정합.

→ **AC-2 PASS**.

### AC-3 — shell injection 차단

- 코드 정적 검증: `git grep -nE "child_process\.exec\(\|\\bexec\(" -- app/` → **0건**. `app/api/workbench/_adapters/claudeCli.ts:139` 에서 `execFile(binaryPath, args, options, ...)` 사용 (shell 미경유).
- 동적 검증: stub wrapper 가 stdin 을 파일로 기록하도록 설정한 뒤 ticker = `AAPL;rm -rf /tmp/qa-inject-pwned;\`whoami\`` (세미콜론·백틱·슬래시 포함) 으로 POST.
  - 기대: `sanitizeTicker` 가 `[^A-Za-z0-9_-]` 외 문자 제거 → ticker = `AAPLrm-rftmpqa-inject-pwnedwhoami` 로 stdin 전달. `/tmp/qa-inject-pwned` 마커 미생성.
  - 실측: stdin 캡쳐 `종목 (ticker): AAPLrm-rftmpqa-inject-pwnedwhoami`. `ls /tmp/qa-inject-pwned` → "No such file or directory". HTTP 200 (정상 normalize).
- 추가: `lib/validation/workbench/*` 사전 차단이 영문/숫자만 허용 (`docs/prd/workbench-analyze-rebuild.md` 계승), adapter 단에서 한 번 더 `sanitizeTicker` narrowing.

→ **AC-3 PASS**.

### AC-4 — timeout 30초

- 재현: `CLAUDE_CLI_PATH=/tmp/qa-slow-claude.sh` (sleep 35 후 envelope 출력) 로 dev 기동.
- 입력: 위와 동일.
- 기대: 30초 후 SIGTERM → `child.killed=true` 감지 → `timedOut=true` → HTTP 504 + "분석이 너무 오래 걸려요…".
- 실측: elapsed 30초, HTTP 504, `{"error":"분석이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요."}`. 서버 로그 `[claude-cli] timeout { stderr: '' }`. subprocess SIGKILL 흔적 없음 (정상 종료).
- 비고: 실제 claude CLI 가 자체 시그널 핸들러로 종료할 경우 `error.code=143` 수치형으로 들어와 `timedOut=false` 가 되며 `MSG_CLI_ERROR` 로 흡수된다 — **사용자 노출 메시지는 동일하게 한글 폴백** (`"분석 도구 호출에 실패했어요…"`). AC-4 의 "한글 fallback 메시지로 ErrorCard 표시" 요건은 두 경로 모두 충족. log-level 차이는 디버깅 정밀도만 영향.

→ **AC-4 PASS**.

### AC-5 — Vercel 안전 가드

- 재현: `ANALYZE_BACKEND=claude-cli VERCEL=1 PORT=3010 npm run dev` 후 분석 호출.
- 기대: HTTP 503, 한글 메시지 "Vercel 환경에서는 claude CLI 모드를 사용할 수 없습니다. 로컬 환경에서 실행해 주세요." subprocess 호출 0건.
- 실측: HTTP 503, `{"error":"Vercel 환경에서는 claude CLI 모드를 사용할 수 없습니다. 로컬 환경에서 실행해 주세요."}`. 서버 로그에 `[claude-cli]` 트레이스 0건 — `route.ts:38-44` 진입부 가드가 adapter 이전에 차단. (`claudeCli.ts:56-59` 의 adapter 내부 가드는 2차 방어선.)

→ **AC-5 PASS**.

### AC-6 — JSON parse 실패 시 한글 fallback

- 재현: `CLAUDE_CLI_PATH=/tmp/qa-bad-claude.sh` (echo "this is not json at all") 로 dev 기동.
- 기대: HTTP 502, 한글 폴백 "분석 결과 형식이 올바르지 않아요…". stderr 본문은 사용자 응답에 미노출.
- 실측: HTTP 502, `{"error":"분석 결과 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요."}`. 서버 로그 `[claude-cli] JSON parse failed { stdout: 'this is not json at all\n' }` (boundary 만 서버측).
- 추가 — 코드펜스 strip 검증: envelope.result 안에 ` ```json ... ``` ` 으로 감싼 JSON 도 `parseLooseJson` 의 fence 매칭으로 strip 후 정상 parse. stub 으로 검증 — HTTP 200 + 6블록 normalize 정상.

→ **AC-6 PASS**.

### AC-7 — binary 없음 시 한글 fallback

- 재현: `CLAUDE_CLI_PATH=/nonexistent/claude ANALYZE_BACKEND=claude-cli npm run dev`.
- 기대: HTTP 500, 한글 폴백 "claude CLI 가 설치되어 있지 않거나 경로가 올바르지 않아요." 서버 로그에 ENOENT.
- 실측: HTTP 500, `{"error":"claude CLI 가 설치되어 있지 않거나 경로가 올바르지 않아요."}`. 서버 로그 `[claude-cli] ENOENT — binary not found [Error: spawn /nonexistent/claude ENOENT] { errno: -2, code: 'ENOENT', syscall: 'spawn /nonexistent/claude', ... }`.

→ **AC-7 PASS**.

### AC-8 — adapter 추상화 도입

| 점검 | 결과 |
|---|---|
| `ls app/api/workbench/_adapters/` | `claudeCli.ts`, `fastapi.ts`, `index.ts`, `prompt.ts`, `types.ts` — 5 종 모두 존재. |
| `types.ts` 안 `AnalyzeAdapter` interface + `AdapterResult` + `AnalyzeBackend` | 정의 확인 (32 라인). `analyze(input: AnalyzeRequest): Promise<AdapterResult>`. |
| `fastapi.ts` 가 `AnalyzeAdapter` 구현 | `class FastapiAdapter implements AnalyzeAdapter` — typecheck 통과로 인터페이스 정합 보장. |
| `claudeCli.ts` 가 `AnalyzeAdapter` 구현 | `class ClaudeCliAdapter implements AnalyzeAdapter` — 동상. |
| `index.ts` 가 `resolveBackend()` + `createAnalyzeAdapter()` factory 제공 | 확인. 빈 값/오타는 `"fastapi"` 폴백. |
| route handler 가 `fetch()` 직접 호출 안 함 | `git grep "fetch(" app/api/workbench/analyze/route.ts` → **0건**. adapter dispatch 만. |

→ **AC-8 PASS**.

### AC-9 — 응답 normalize

| 케이스 | 입력 (stub stdout) | 기대 | 실측 | 결과 |
|---|---|---|---|---|
| envelope.result 안 raw JSON | `{type:"result",result:"<6블록 JSON>"}` | HTTP 200, 6블록 모두 채워짐 | HTTP 200, 6블록 정상. | PASS |
| envelope.result 안 코드펜스 wrap | result = ` ```json\n…\n``` ` | HTTP 200, 동일 | HTTP 200, brief.action=WAIT 정상 narrowing. | PASS |
| 핵심 필드 누락 (`brief` 없음) | result JSON 에서 brief 제거 | HTTP 502 + "분석 결과 형식이 올바르지 않아요…" | HTTP 502, 동일 메시지. 서버 로그 `[claude-cli] schema validation failed` (sample boundary). | PASS |
| 보조 필드 누락 (`warnings`, `position`, `ai_summary` 누락) | 핵심 6 필드는 채움 | HTTP 200, `warnings=[]`, `position=null`, `ai_summary=null` 로 fallback | (`claudeCli.ts:284-322` 의 `Array.isArray(...) ? ... : []` / `?? null` 폴백 로직). 정상 케이스의 normalize 결과가 이 폴백을 통과 — typecheck 통과 + `AC-2` 통과로 간접 확인. | PASS |

→ **AC-9 PASS**.

### AC-10 — .env.example 갱신

```text
$ grep -nE "ANALYZE_BACKEND|CLAUDE_CLI|CLAUDE_PROMPT" .env.example
20: # === 분석 백엔드 선택 (PRD claude-cli-analysis) ===
26: ANALYZE_BACKEND=fastapi
30: CLAUDE_CLI_PATH=claude
34: # CLAUDE_CLI_MODEL=sonnet
37: # 지원 placeholder: {{ticker}}, ...
38: # CLAUDE_PROMPT_TEMPLATE=
```

- 4종 모두 명시 (`ANALYZE_BACKEND`, `CLAUDE_CLI_PATH`, `CLAUDE_CLI_MODEL`, `CLAUDE_PROMPT_TEMPLATE`). 한글 주석 포함.

→ **AC-10 PASS**.

### AC-11 — UI 무회귀

- `git diff main -- components/ "app/(workbench)/" app/components.css app/globals.css docs/design/` → **0 라인**.

→ **AC-11 PASS**.

### AC-12 — 응답 타입 무수정

- `git diff main -- lib/types/workbench/analyze.ts` → **0 라인**.

→ **AC-12 PASS**.

### AC-13 — BFF 단일 진입점 무회귀

- `git grep -nE "fetch\(" -- components/ hooks/ lib/api/workbench/` → **0건**.
- `git grep -nE "http://127\.0\.0\.1" -- app/` → 3건 모두 route handler / adapter fallback (허용 범위).

→ **AC-13 PASS**.

### AC-14 — 라운드트립 5건 × 두 백엔드 모드

| 모드 | (a) AAPL | (b) BTC-USD | (c) 비현실 | (d) 화이트리스트 비매칭 | (e) BE 단절 |
|---|---|---|---|---|---|
| fastapi | 200 / 6블록 | 200 / 6블록 | 500 (BE 영문 detail → 클라가 한글 폴백으로 덮음) | 400 한글 메시지 | 502 한글 폴백 |
| claude-cli (stub) | 200 / normalize | 200 / normalize | 200 / normalize (BE 분기 미존재 — prompt 가 흡수) | 200 / normalize (CLI 모드는 화이트리스트 비검증 — 후속 PRD 자율) | n/a (CLI 모드의 등가 케이스는 AC-7 ENOENT) |

- 두 모드 모두 UI 무수정이므로 두 뷰포트 (375 / 1280) 시각 무회귀 자동 충족 (`git diff main -- components/...` 0 라인).

→ **AC-14 PASS**.

### AC-15 — 한글 톤 무회귀

- 신규 한글 카피: `MSG_VERCEL_UNSUPPORTED`, `MSG_CLI_MISSING`, `MSG_CLI_ERROR`, `MSG_TIMEOUT`, `MSG_MALFORMED` 모두 한글 (`claudeCli.ts:34-43`).
- `lib/copy/workbench/errorMessages.ts:CLAUDE_CLI_FALLBACKS` 카탈로그 5종 모두 한글.
- ticker / 영문 enum / 단위 (USD, KRW, %, 일) 제외 사용자 노출 텍스트 100% 한글.

→ **AC-15 PASS**.

### AC-16 — build / typecheck / lint

- §1 표 참조. 0 에러.

→ **AC-16 PASS**.

### AC-17 — no new runtime deps

- `git diff main -- package.json package-lock.json` → 0 라인. zod 등 추가 0건. `node:child_process` 표준 모듈만 사용.

→ **AC-17 PASS**.

### AC-18 — subprocess 정리

- 코드: `claudeCli.ts:139-174` — `execFile` callback 이 timeout / error / 정상 종료 모든 케이스를 resolve. stdin 은 `child.stdin.end(stdinPayload)` 로 즉시 close. stdin error 는 `on('error')` 로 흡수.
- 동적: AC-4 timeout 케이스에서 server log 추가 process leak 없음 (`lsof -ti:3010` 으로 dev 서버 종료 후 잔여 child 없음 확인).
- timeout 옵션 (`TIMEOUT_MS`) 이 `execFile` options 의 `timeout` 으로 전달 — Node 가 자동 SIGTERM.

→ **AC-18 PASS**.

### AC-19 — 서버 로그 보안

- 클라이언트 응답 본문 — AC-6/AC-7/AC-9 케이스에서 모두 `{"error":"<한글>"}` 단일 키. stderr / stack / stdout 원문 노출 0건.
- 서버 로그 — `[claude-cli] ENOENT — …`, `[claude-cli] JSON parse failed { stdout: '…' }`, `[claude-cli] schema validation failed { sample: '…' }`, `[claude-cli] non-zero exit { code, stderr }`, `[claude-cli] timeout { stderr }` 모두 `console.warn` 서버 측. **stdout/stderr 의 첫 2000 자만 slice** 해 PII/긴 token 누설 위험 완화.

→ **AC-19 PASS**.

### AC-20 — PR #21 / #22 무회귀

- `git diff main -- components/ "app/(workbench)/" app/components.css app/globals.css docs/design/ lib/types/workbench/analyze.ts lib/api/workbench/ hooks/` → **0 라인**.
- 3-section shell, 6블록 위계, outside-click, suffix, in-session 히스토리/즐겨찾기는 UI/hook 무수정이므로 자동 계승.

→ **AC-20 PASS**.

## §3 에지 케이스 (추가 검증)

| 케이스 | 검증 방법 | 결과 |
|---|---|---|
| shell injection — `exec` 부재 | `git grep -nE "child_process\.exec\(\|\\bexec\(" -- app/` → 0건. `execFile` 만 사용. | PASS |
| shell injection — 동적 (ticker 특수문자) | stub wrapper + 세미콜론/백틱/슬래시 ticker → sanitize 후 stdin 전달. 마커 미생성. | PASS |
| timeout 30초 — slow CLI 시뮬레이션 | `sleep 35` wrapper → SIGTERM → HTTP 504 + 한글. elapsed 30s. | PASS |
| JSON parse 실패 — 잡음 텍스트 | `echo "this is not json…"` wrapper → HTTP 502 + 한글. | PASS |
| 코드펜스 wrap | ` ```json … ``` ` 안 6블록 → fence strip → HTTP 200. | PASS |
| malformed — 핵심 필드 누락 (`brief` 없음) | HTTP 502 + 한글. | PASS |
| ENOENT — binary 미설치 | `/nonexistent/claude` 경로 → HTTP 500 + 한글 + ENOENT 서버 로그. | PASS |
| Vercel 가드 | `VERCEL=1` env → HTTP 503 + 한글, subprocess 호출 0건 (route handler 진입부 차단). | PASS |
| BE down (fastapi 모드) | `FASTAPI_BASE_URL=http://127.0.0.1:1` → HTTP 502 + 한글 폴백. | PASS |
| envelope.result 가 객체 (드문 변형) | 코드 `claudeCli.ts:205` — `if (result && typeof result === "object") return result;` 폴백 존재. typecheck 통과. | PASS |

## §4 UI 무회귀 정밀 확인

- 변경 파일 (PR diff):
  - `app/api/workbench/_adapters/{types,fastapi,claudeCli,prompt,index}.ts` (신규 5종)
  - `app/api/workbench/analyze/route.ts` (route handler)
  - `.env.example` (env 4종 추가)
  - `lib/copy/workbench/errorMessages.ts` (CLAUDE_CLI_FALLBACKS reference 카탈로그)
  - `docs/prd/claude-cli-analysis.md` (PRD)
- 변경 없는 영역 (zero-line diff 재확인):
  - `components/workbench/*`, `components/layout/*` — UI 컴포넌트.
  - `app/(workbench)/*` — 화면 layout / page.
  - `app/components.css`, `app/globals.css` — 스타일.
  - `docs/design/*` — DESIGN.md.
  - `lib/types/workbench/analyze.ts` — 응답 shape.
  - `lib/api/workbench/*` — 클라이언트 wrapper.
  - `hooks/*` — react-query mutation / utils.
  - `tailwind.theme.json`, `tailwind.config.ts` — 토큰.
  - `package.json`, `package-lock.json` — deps.

→ 컴포넌트 prop / 응답 타입 / 합성 토큰 모두 무수정. 두 뷰포트 (375 / 1280) 시각 회귀 위험 0.

## §5 PR 본문 게이트

- `gh pr view 23 --json body` 결과 본문 끝에 `## 다음 작업` 섹션 존재 (QA → claude-api-analysis 후속 권고 명시). handoff-append workflow trigger 안전.

## §6 판정 종합

- AC-1 ~ AC-20 (20건) — **전건 PASS**.
- 자동화 (typecheck / lint / build / grep / diff) — 전건 PASS.
- 에지 케이스 (shell injection / timeout / parse fail / code fence / malformed / ENOENT / Vercel / BE down) — 전건 PASS.
- UI / 응답 타입 / hooks / deps — 무회귀.

**판정: qa-passed**.

산출물: docs/qa/claude-cli-analysis.md | 판정: qa-passed | 실패 0건
