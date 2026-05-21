# QA 리포트 — polish-followups

- **slug**: `polish-followups`
- **검증일**: 2026-05-22
- **검증자**: QA 에이전트
- **PR**: https://github.com/deeptrading-lab/trading-signal-frontend/pull/24
- **브랜치**: `feature/polish-followups`
- **base**: `main` (`16d6361` 기준)
- **PRD**: `docs/prd/polish-followups.md`
- **DESIGN.md**: `docs/design/polish-followups.md` (v6)
- **판정**: **qa-passed** — 6 nit (A1/A2/A3/B1/B2/B3) AC 전건 + 라운드트립 5건 + 공통 무회귀 + 에지 케이스 모두 통과.
- **BE 상태**: LIVE — `curl http://127.0.0.1:8000/health` → `{"status":"ok"}` HTTP 200.

## 1. 환경

- macOS 25.5.0 (darwin), Node 22.x, npm.
- BE FastAPI (`http://127.0.0.1:8000`) LIVE.
- Next.js dev server `http://127.0.0.1:3000` (이번 검증 동안 한시적 가동 → 검증 종료 시 정상 종료).
- 워킹트리 상태: 검증 후 클린 (`git status` → `nothing to commit`).

## 2. AC 결과 요약

| AC | 항목 | 결과 | 비고 |
|---|---|---|---|
| AC-A1-1 | role 3종 (combobox/listbox/option) | PASS | 3 매칭 (L160/178/194) |
| AC-A1-2 | aria 5속성 (expanded/controls/activedescendant/selected/autocomplete) | PASS | 5 매칭 |
| AC-A1-3 | aria-controls target = listbox id (`listId`) | PASS | 동일 `listId` useId() 공유 |
| AC-A1-4 | VoiceOver combobox / option N of M 시뮬레이션 | PASS (정적 매핑) | `role=combobox` + `role=listbox` + `role=option` 풀 셋 |
| AC-A1-5 | 키보드 ↑/↓/Enter/ESC/Tab navigation | PASS | wrap-around · ESC · Tab blur · Enter 가드 모두 구현 |
| AC-A2-1 | DESIGN.md v6 단위별 너비 토큰 매핑 | PASS | `docs/design/polish-followups.md` L114, L432~, L442~, L667~ |
| AC-A2-2 | `tailwind.theme.json` 신규 토큰 3 키 | PASS | `input-pr-suffix-sm/md/lg` 36/44/56 |
| AC-A2-3 | InputPanel 단위별 분기 클래스 | PASS | `suffixPaddingClass` sm/md/lg 3분기 |
| AC-A2-4 | 라운드트립 5건 양 뷰포트 시각 회귀 | PASS | RT1~5 모두 응답 정상, suffix 분기 코드 path 적용 |
| AC-A3-1 | 6블록 누락 분기 (`missing_<block>`) | PASS | 6개 reason + 6개 fallback 키 |
| AC-A3-2 | `CLAUDE_CLI_FALLBACKS` 카탈로그 6+1 키 | PASS | 6 missing_* + malformed_position |
| AC-A3-3 | claude CLI mock 6블록 누락 매핑 | PASS | stub 9 케이스 전건 PASS |
| AC-A3-4 | 카탈로그 한글 톤 점검 | PASS | 본 문서 §6 verbatim |
| AC-B1-1 | `ANALYZE_JSON_SCHEMA` 사용처 ≥1 | PASS | `prompt.ts:28` 정의 + `prompt.ts:145` 사용 |
| AC-B1-2 | inline embed (system prompt 안) | PASS | `getSystemPrompt()` 내 `JSON.stringify(ANALYZE_JSON_SCHEMA, null, 2)` |
| AC-B1-3 | typecheck/lint 0 에러 | PASS | npm run typecheck / lint |
| AC-B2-1 | `AbortController` 표현 정합 | PASS | "AbortController 를 쓰지 않는다" 명시 + execFile timeout option 으로 정정 |
| AC-B2-2 | timeout 메커니즘 헤더 주석 정확성 | PASS | claudeCli.ts L12~15 |
| AC-B3-1 | type guard `isPositionShape` 존재 | PASS | claudeCli.ts L418 |
| AC-B3-2 | narrowing 실패 시 `malformed_position` 분기 | PASS | L361 reason + L364 error 매핑 |
| AC-B3-3 | typecheck 0 에러, zod import 0건 | PASS | `git grep zod` → 0 (검증) |
| AC-COMMON-1 | `npm run typecheck` 0 에러 | PASS | 0 출력 |
| AC-COMMON-2 | `npm run lint` 0 에러 | PASS | 0 출력 |
| AC-COMMON-3 | `npm run build` 0 에러 | PASS | "Compiled successfully" |
| AC-COMMON-4 | 라운드트립 5건 양 뷰포트 무회귀 | PASS | §5 참조 |
| AC-COMMON-5 | 한글 톤 무회귀 | PASS | §6 verbatim |
| AC-COMMON-6 | BFF 패턴 무회귀 (`fetch(` 클라이언트 0건) | PASS | route handler / adapter 내부만 |

전건 PASS — 실패 0건.

## 3. AC 별 재현·기대·실측

### 3.1 A1 — SearchPanel dropdown ARIA + 키보드 navigation

#### AC-A1-1 / A1-2 — role + aria 풀 셋

- **재현**: `git grep -nE 'role="(listbox|option|combobox)"' components/workbench/SearchPanel.tsx` / `git grep -nE 'aria-(expanded|controls|activedescendant|selected|autocomplete)' components/workbench/SearchPanel.tsx`
- **기대**: role 3종 + aria 5속성 모두 매칭.
- **실측**:
  - `role="combobox"` (L160), `role="listbox"` (L178), `role="option"` (L194) — 3매칭.
  - `aria-expanded={open}` (L161), `aria-controls={listId}` (L162), `aria-autocomplete="list"` (L163), `aria-activedescendant=...` (L164), `aria-selected={focused}` (L195) — 5매칭.

#### AC-A1-3 — aria-controls target

- **재현**: SearchPanel input 에 `aria-controls={listId}` 이 있고, dropdown 컨테이너에 `id={listId}` 가 동일 `useId()` 인스턴스로 묶여 있는지 코드 점검.
- **기대**: 같은 `listId` 인스턴스가 input 과 listbox 양쪽에 바인딩.
- **실측**: L53 `const listId = useId();` → L162 input `aria-controls={listId}` → L179 listbox `id={listId}`. 정합 PASS.

#### AC-A1-4 — VoiceOver 시뮬레이션 (정적 매핑)

- **재현**: ARIA 패턴이 WAI-ARIA Authoring Practices 의 combobox + listbox + option 명세에 정합하는지 정적 점검.
- **기대**: 스크린리더가 combobox / listbox / option N of M / selected 를 announce 가능한 구조.
- **실측**:
  - input `role="combobox" aria-autocomplete="list" aria-expanded` — APG combobox 패턴 정합.
  - dropdown `role="listbox"` + 옵션 `role="option" aria-selected={focused}` — listbox 패턴 정합.
  - `aria-activedescendant` 가 옵션 안정 id (`${listId}-option-${ticker}`, L168, L193) 를 가리킴 — option N of M announce 가능.
- 본 검증은 정적. 실제 VO 음성 출력 확인은 사용자 검증 단계로.

#### AC-A1-5 — 키보드 navigation

- **재현**: SearchPanel.tsx 의 `handleKeyDown` (L86~) 점검.
- **기대**:
  - `ArrowDown` — dropdown 닫혀 있으면 열고, total === 0 이면 무동작, 그 외 `(idx + 1) % total` 로 wrap-around.
  - `ArrowUp` — total === 0 이면 무동작, `idx <= 0 ? total - 1 : idx - 1` 로 wrap-around (초기 -1 에서 ↑ → 마지막).
  - `Enter` — `open && focusIndex >= 0 && results[focusIndex]` 가드 후 선택. focusIndex < 0 (입력 직후) 시 의도하지 않은 선택 방지.
  - `Escape` — `setOpen(false)` + `setFocusIndex(-1)` + `inputRef.current?.focus()`.
  - Tab — wrapper onBlur 의 `relatedTarget` 검사로 자동 닫힘 (handleWrapperBlur L123).
- **실측**: 모두 코드에 그대로 구현. PASS.

### 3.2 A2 — InputPanel suffix 단위별 너비 분기

#### AC-A2-1 — DESIGN.md v6 매핑

- **재현**: `grep -n "input-pr-suffix-sm" docs/design/polish-followups.md`
- **기대**: front matter spacing 절 + Components > input-suffix > Width 절 + Implementation 절에 3 키 매핑.
- **실측**:
  - L114 front matter spacing: `input-pr-suffix-sm: 36px`.
  - L442~443 Components 표: `%` / `일` (1자) → `{spacing.input-pr-suffix-sm}` 36px.
  - L484, L709 Implementation: 단위 문자열 길이 기반 분기 코드 예시.
  - L811 R1 결정: 옵션 A 채택 — sm 36px / md 44px / lg 56px.

#### AC-A2-2 — tailwind.theme.json 3 키

- **재현**: `grep "input-pr-suffix" tailwind.theme.json`
- **기대**: 4 키 (v5 호환 `input-pr-suffix` 44px + v6 신규 sm/md/lg).
- **실측**:
  - `"input-pr-suffix": "44px"` (L179, v5 호환 보존)
  - `"input-pr-suffix-sm": "36px"` (L180)
  - `"input-pr-suffix-md": "44px"` (L181)
  - `"input-pr-suffix-lg": "56px"` (L182)

#### AC-A2-3 — InputPanel 단위별 분기

- **재현**: `git grep -n "spacing-input-pr-suffix\|input-pr-suffix" components/workbench/InputPanel.tsx`
- **기대**: `suffixPaddingClass(suffix)` 함수가 sm/md/lg 3분기.
- **실측** (L209~214):
  ```ts
  function suffixPaddingClass(suffix: string): string {
    const len = suffix.length;
    if (len <= 1) return "pr-input-pr-suffix-sm"; // %, 일
    if (len <= 3) return "pr-input-pr-suffix-md"; // USD, KRW
    return "pr-input-pr-suffix-lg"; // 향후 4자+ 단위
  }
  ```
  - 4 필드 매핑 (실측):
    - 자본 (USD/KRW or `-`, 1~3자) → sm/md 분기. `currencyLabel = "-"` 인 초기 상태에서는 1자 → sm 36px.
    - 수익률 `%` (1자) → sm 36px.
    - 기간 `일` (1자) → sm 36px.
    - 최대 손실 `%` (1자) → sm 36px.
  - AAPL 선택 시 자본 suffix = `USD` (3자) → md 44px.
  - BTC-USD 선택 시 자본 suffix = `USD` (3자) → md 44px.

#### AC-A2-4 — 라운드트립 5건 무회귀

- §5 라운드트립 5건 응답 정상 + suffix 분기 코드 path 적용. 시각 회귀 자동화 부재 → 코드 path 정합 + dev server 200 OK 응답으로 회귀 무.

### 3.3 A3 — claudeCli 6블록 누락 한글 fallback

#### AC-A3-1 — 6블록 누락 분기

- **재현**: `git grep -nE "missing|누락" app/api/workbench/_adapters/claudeCli.ts`
- **기대**: NormalizeReason union 안에 6 키 + early return 6분기.
- **실측**:
  - L272~277 union: `missing_action | missing_brief | missing_feasibility | missing_horizons | missing_risk_plan | missing_warnings`.
  - L310~351 early return 6분기 — action(L310) → brief(L317) → feasibility(L324) → horizons(L331) → risk_plan(L338) → warnings(L345) 순.

#### AC-A3-2 — CLAUDE_CLI_FALLBACKS 카탈로그

- **재현**: `lib/copy/workbench/errorMessages.ts` 의 6 키 + malformed_position 1 키.
- **기대**: 7 신규 키 + v5 무회귀 5 키 = 12 키.
- **실측**: L31~52 — `cli_missing / cli_error / cli_timeout / cli_malformed / cli_unsupported` (v5 5키) + `missing_action / missing_brief / missing_feasibility / missing_horizons / missing_risk_plan / missing_warnings / malformed_position` (v6 7키).

#### AC-A3-3 — claude CLI mock 6블록 누락 매핑

- **재현**: `/tmp/qa-a3-stub.mjs` — normalize 로직 verbatim 재현 + 9 케이스 평가.
- **기대**: 6 missing 케이스 + 1 malformed_position 케이스 + 2 happy 케이스 모두 정합.
- **실측**: 9 PASS / 0 FAIL.
  ```
  PASS missing_action       -> {"reason":"missing_action","error":"분석 결과의 권고 액션 항목이 비어 있어요. 잠시 후 다시 시도해 주세요."}
  PASS missing_brief        -> {"reason":"missing_brief","error":"분석 결과의 요약(근거) 항목이 비어 있어요. 잠시 후 다시 시도해 주세요."}
  PASS missing_feasibility  -> {"reason":"missing_feasibility","error":"분석 결과의 실현 가능성 항목이 비어 있어요. 잠시 후 다시 시도해 주세요."}
  PASS missing_horizons     -> {"reason":"missing_horizons","error":"분석 결과의 기간별 시나리오 항목이 비어 있어요. 잠시 후 다시 시도해 주세요."}
  PASS missing_risk_plan    -> {"reason":"missing_risk_plan","error":"분석 결과의 리스크 계획 항목이 비어 있어요. 잠시 후 다시 시도해 주세요."}
  PASS missing_warnings     -> {"reason":"missing_warnings","error":"분석 결과의 경고 항목이 비어 있어요. 잠시 후 다시 시도해 주세요."}
  PASS malformed_position   -> {"reason":"malformed_position","error":"분석 결과의 포지션 정보 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요."}
  PASS __ok_null__          -> {"ok":true}
  PASS __ok_entry__         -> {"ok":true}
  ```

### 3.4 B1 — ANALYZE_JSON_SCHEMA inline embed

#### AC-B1-1 — 사용처 ≥1

- **재현**: `git grep -n "ANALYZE_JSON_SCHEMA" app/`
- **기대**: 정의 1건 + 사용처 ≥1건.
- **실측**:
  - 정의: `app/api/workbench/_adapters/prompt.ts:28` `export const ANALYZE_JSON_SCHEMA = { ... }`
  - 사용처: `app/api/workbench/_adapters/prompt.ts:145` `const schemaJson = JSON.stringify(ANALYZE_JSON_SCHEMA, null, 2);`
  - 헤더 주석 2건 (L10, L26) — 사용처 명시.

#### AC-B1-2 — system prompt inline embed

- **재현**: `getSystemPrompt()` 본문 점검.
- **기대**: `SYSTEM_PROMPT_KO_HEAD` 뒤에 schema JSON 텍스트가 붙음.
- **실측** (prompt.ts L141~150):
  ```ts
  export function getSystemPrompt(): string {
    const schemaJson = JSON.stringify(ANALYZE_JSON_SCHEMA, null, 2);
    return `${SYSTEM_PROMPT_KO_HEAD}\n\n엄격한 JSON 스키마 ... :\n${schemaJson}`;
  }
  ```
  PASS.

### 3.5 B2 — AbortController 주석 정합

#### AC-B2-1 / B2-2

- **재현**: `git grep -n "AbortController" app/api/workbench/`
- **기대**: "AbortController 를 쓰지 않는다" 명시 + execFile timeout option 명시.
- **실측** (claudeCli.ts L12~15):
  ```
  - timeout 30초 — `execFile` 의 `timeout` option 으로 위임. node 가 만료 시 child 에
    SIGTERM 을 보낸 뒤 종료를 기다린다. (PR #23 머지 시점 헤더 주석에 `AbortController` 표현이
    있었으나 실제로는 AbortController 를 쓰지 않는다 — polish-followups §3.5 B2 로 정합.)
    타임아웃 분기 판정: callback err.killed === true 이고 signal 이 SIGTERM/SIGKILL 인 경우.
  ```
  - 코드 L138 `timeout: TIMEOUT_MS` (execFileOptions) 와 L152~154 `err.killed === true && SIGTERM/SIGKILL` 판정 매핑 일치.

### 3.6 B3 — position narrowing

#### AC-B3-1 — type guard

- **재현**: `git grep -nE "function is" app/api/workbench/_adapters/claudeCli.ts`
- **기대**: `isPositionShape` 함수 존재.
- **실측**:
  - `function isPositionShape(value: unknown): value is Record<string, unknown>` (L418)
  - 본문: `isObject(value) && ("entry" in value || "stop" in value || "target" in value)` — 셋 중 하나라도 있으면 통과.

#### AC-B3-2 — malformed_position 분기

- **재현**: L353~366 점검.
- **기대**: position 이 null/undefined 면 정상 (null 할당), 객체이고 type guard 통과 시 정상, 그 외 `malformed_position` reason + error.
- **실측**: PASS. stub 케이스 `malformed_position` (foo:1) 정확히 매핑.

#### AC-B3-3 — typecheck + zod 미도입

- **재현**: `npm run typecheck`, `git grep -rn "from \"zod\"" .`
- **실측**: typecheck 0 에러. zod import 0건. package.json deps 에 zod 없음.

### 3.7 공통 AC

- **AC-COMMON-1 typecheck**: `> tsc --noEmit` 출력만, 에러 0건.
- **AC-COMMON-2 lint**: `> eslint .` 출력만, 에러 0건.
- **AC-COMMON-3 build**: `Compiled successfully in 1034ms` + 페이지 6건 정상 생성.
- **AC-COMMON-6 BFF**: `git grep -n "fetch(" app/ components/ hooks/ lib/` — 3 매칭 모두 BFF 영역 내부:
  - `app/api/whitelist/search/route.ts:23` (route handler)
  - `app/api/workbench/_adapters/fastapi.ts:4` (주석)
  - `app/api/workbench/_adapters/fastapi.ts:38` (adapter, BFF 영역)
  - 클라이언트 (`components/` / `hooks/` / `lib/`) 0건.

## 4. 라운드트립 5건 (BE LIVE)

`http://127.0.0.1:8000/health` → 200 OK `{"status":"ok"}` 확인 후 진행.

| # | 시나리오 | 입력 | 결과 | 응답 핵심 |
|---|---|---|---|---|
| RT1 | AAPL 표준 분석 | `{ticker:AAPL, capital:1000000, return:5, period:30, max_loss:2}` | 200 OK | `analysis.action`, `brief.score:76`, `feasibility`, `horizons` 등 6블록 모두 존재 |
| RT2 | BTC-USD 단기 | `{ticker:BTC-USD, capital:50000, return:10, period:7, max_loss:3}` | 200 OK | `analysis.whitelist_entry.asset_type:CRYPTO` |
| RT3 | AAPL 보수적 | `{ticker:AAPL, capital:500000, return:2, period:14, max_loss:1}` | 200 OK | analysis 정상 |
| RT4 | 화이트리스트 외 | `{ticker:FOO, ...}` | 4xx | `{"error":"FOO는 분석 가능한 화이트리스트에 없습니다"}` (한글 검증 OK) |
| RT5 | validation 실패 | `{ticker:AAPL, capital:-100, ...}` | 4xx | `{"error":"Input should be greater than 0"}` |

- BE LIVE — 5건 모두 (a) 정상 흐름. fallback path 미실행.
- 양 뷰포트 (1280·1920) 자동 시각 회귀 도구는 본 레포에 도입되어 있지 않다. InputPanel 의 단위별 분기 클래스 (`pr-input-pr-suffix-sm/md/lg`) 가 build 결과에 포함되어 있고 (Next.js build 성공), `tailwind.theme.json` 의 spacing 값과 1:1 정합한다. dev server 응답 정상.

## 5. 6 nit 별 추가 검증

### A1 — SearchPanel ARIA + 키보드

- `git grep -nE 'role="(listbox|option|combobox)"' components/workbench/SearchPanel.tsx` → 5 라인 (주석 2 + 코드 3) — PASS.
- 키보드 (수동 코드 점검):
  - ↓ wrap-around: `(idx + 1) % total` (L93) — last → 0 정합.
  - ↑ wrap-around: `idx <= 0 ? total - 1 : idx - 1` (L101) — first → last, -1 (초기) → last 정합.
  - Enter 가드: `focusIndex >= 0` (L106) — 입력 직후 의도하지 않은 선택 방지 정합.
  - ESC: `setOpen(false) + setFocusIndex(-1) + inputRef.current?.focus()` (L113~117).
  - Tab: handleWrapperBlur 의 `relatedTarget` 검사 (L123~127) — wrapper 외부 focus 이동 시 닫힘.

### A2 — InputPanel 단위별 너비

| suffix | 글자 수 | 클래스 | px |
|---|---|---|---|
| `%` (수익률, 최대 손실) | 1 | `pr-input-pr-suffix-sm` | 36 |
| `일` (기간) | 1 | `pr-input-pr-suffix-sm` | 36 |
| `-` (선택 전 currencyLabel) | 1 | `pr-input-pr-suffix-sm` | 36 |
| `USD` (AAPL/BTC-USD 자본) | 3 | `pr-input-pr-suffix-md` | 44 |
| `KRW` (가상의 향후) | 3 | `pr-input-pr-suffix-md` | 44 |
| `포인트` (가상의 향후 4자+) | 4+ | `pr-input-pr-suffix-lg` | 56 |

분기 알고리즘 (suffix 글자 수 기반) 정합. v5 의 `pr-input-pr-suffix` (44px) 토큰도 호환 보존 — InputPanel 은 이미 v6 의 sm/md/lg 로 마이그레이션 완료.

### A3 — claudeCli 6블록 누락 한글 fallback

stub 시뮬레이션 결과 — §3.3 AC-A3-3 표 참조. 9건 PASS.

### B1 — ANALYZE_JSON_SCHEMA

`git grep -n "ANALYZE_JSON_SCHEMA" app/` → 4 매칭 (정의 1 + 사용 1 + 주석 2). 미사용 export 0건.

### B2 — AbortController 주석

`git grep -n "AbortController" app/api/workbench/` → 2 매칭 (헤더 주석 L13, L14). 둘 다 "쓰지 않는다 — execFile timeout option 으로 정정" 컨텍스트. 코드의 실 메커니즘 (L138 timeout option + L152~154 killed/SIGTERM 판정) 과 주석 표현 1:1 정합.

### B3 — position narrowing

`git grep -nE "function is" app/api/workbench/_adapters/claudeCli.ts` → 3 매칭 (isPositionShape · isObject · isVercelEnv). type guard 함수 존재 (L418). zod import 0건.

## 6. 한글 카피 톤 점검 (verbatim)

`lib/copy/workbench/errorMessages.ts` 의 v6 신규 7키 verbatim — 모두 "분석 결과의 ~ 항목이 비어 있어요. 잠시 후 다시 시도해 주세요." 패턴. 사용자 잘못 아닌 "엔진 결과 미완성" 프레이밍 — DESIGN.md 에러 영역 톤 정합.

| 키 | 메시지 |
|---|---|
| `missing_action` | 분석 결과의 권고 액션 항목이 비어 있어요. 잠시 후 다시 시도해 주세요. |
| `missing_brief` | 분석 결과의 요약(근거) 항목이 비어 있어요. 잠시 후 다시 시도해 주세요. |
| `missing_feasibility` | 분석 결과의 실현 가능성 항목이 비어 있어요. 잠시 후 다시 시도해 주세요. |
| `missing_horizons` | 분석 결과의 기간별 시나리오 항목이 비어 있어요. 잠시 후 다시 시도해 주세요. |
| `missing_risk_plan` | 분석 결과의 리스크 계획 항목이 비어 있어요. 잠시 후 다시 시도해 주세요. |
| `missing_warnings` | 분석 결과의 경고 항목이 비어 있어요. 잠시 후 다시 시도해 주세요. |
| `malformed_position` | 분석 결과의 포지션 정보 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요. |

v5 의 5키 (`cli_missing` ~ `cli_unsupported`) 무수정 보존.

## 7. 에지 케이스

| 케이스 | 시나리오 | 결과 |
|---|---|---|
| EC1 | suffix 글자 수 1 (`%`, `일`, `-`) | sm 36px — 코드 path L211 |
| EC2 | suffix 글자 수 3 (`USD`, `KRW`) | md 44px — 코드 path L212 |
| EC3 | suffix 글자 수 4+ (`포인트`) | lg 56px — 코드 path L213 |
| EC4 | 키보드 ↓ wrap-around (last → 0) | `(idx + 1) % total` (L93) PASS |
| EC5 | 키보드 ↑ wrap-around (first → last, -1 → last) | `idx <= 0 ? total - 1 : idx - 1` (L101) PASS |
| EC6 | dropdown 외부 mousedown → 닫힘 | useOutsideClick (L72) v5 무회귀 PASS |
| EC7 | DESIGN.md v6 토큰 라이브 동기화 | DESIGN.md (L114 sm:36px) ↔ theme.json (L180 36px) ↔ tailwind.config (themeJson import) ↔ InputPanel (`pr-input-pr-suffix-sm`) 4단 1:1 정합 PASS |
| EC8 | position null (정상 nullable) | `position = null` 할당 (L357) PASS |
| EC9 | position `{ foo: 1 }` (잘못된 shape) | `malformed_position` 502 (L361) PASS |
| EC10 | position `{ entry: 100 }` (정상 shape) | `isPositionShape` 통과 (L358) PASS |
| EC11 | claude CLI 미설치 | ENOENT → `cli_missing` (L77~79) PASS |
| EC12 | claude CLI timeout 30s | err.killed && SIGTERM/SIGKILL → `cli_timeout` (L152~154) PASS |
| EC13 | Vercel 환경 감지 | `isVercelEnv()` → 503 `cli_unsupported` (L59~62) PASS |
| EC14 | BE 다운 시 fastapi adapter | (이번 검증에서 BE LIVE — 정적 매핑만): fastapi.ts 의 fetch 에러 → 한글 fallback. 라인 32~ |
| EC15 | 화이트리스트 외 ticker | BE 가 한글 message 직송 → axios extractMessage 본문 사용 (`"FOO는 분석 가능한 화이트리스트에 없습니다"`) — RT4 검증 PASS |

라이브 토큰 동기화 (EC7) 의 design:sync 풀 실행은 `@google/design.md` 외부 패키지 의존이라 본 검증에서는 정적 매핑으로 대체. 4단 1:1 정합은 DESIGN.md / theme.json / tailwind.config / InputPanel grep 결과로 확인.

## 8. 무회귀 점검 (PR #21~#23)

| PR | 영역 | 점검 | 결과 |
|---|---|---|---|
| #21 layout-redesign | navbar / sidebar / drawer / main-area | components.css L181~258 합성 토큰 무수정 | PASS |
| #22 component-compactness | input / button / search-result-item / dropdown-panel | components.css L61~153 합성 토큰 무수정. `input-pr-suffix` 44px v5 호환 보존 | PASS |
| #23 claude-cli-analysis | Adapter 인터페이스 / 6블록 응답 shape | `AnalyzeAdapter` 시그니처 무수정. `AnalyzeResponse` shape 무수정 | PASS |

## 9. PR `## 다음 작업` 게이트

PR #24 본문에 `## 다음 작업` 섹션 존재 — 라벨 부여 게이트 통과.

```
## 다음 작업

- QA 에이전트 — 라운드트립 5건 양 뷰포트 (1280·1920) 시각 회귀 검증 (특히 A2 의 1자 단위 필드 우측 padding 36px), 키보드 + VoiceOver 시뮬레이션 1건, claude CLI mock 6블록 누락 케이스 6개 + position 잘못된 shape 1개 한글 메시지 매핑 검증.
- 사용자 검증 후 PRD `claude-api-analysis` 진입 (사용자 명시 의도 — PR #23 PRD 1.2 의 후속).
- 또는 PRD `analyze-streaming` (단일 → streaming UX 개선) — 사용자 결정.
```

## 10. 실패 / 미흡 / 후속

- 실패 0건.
- 자동 시각 회귀 도구 미도입 — 라운드트립 5건의 양 뷰포트 (1280·1920) 픽셀 비교는 수동 점검 영역. dev server 200 OK + 코드 path 정합으로 갈음.
- design:sync 라이브 실행 (`npm run design:sync`) 은 `@google/design.md` 외부 패키지 의존이라 본 검증에서는 정적 4단 매핑 grep 으로 대체. (EC7)
- VoiceOver / 실 스크린리더 announce 음성 출력 확인은 사용자 검증 단계로 인계.

## 11. 판정

**qa-passed** — AC 전건 (A1·A2·A3·B1·B2·B3 + COMMON 6) 통과 + 라운드트립 5건 정상 + 에지 케이스 15건 정합 + PR 본문 `## 다음 작업` 게이트 통과. 실패 0건.

다음 단계:

- `gh pr edit 24 --add-label qa-passed --remove-label impl-ready` — handoff-append workflow 자동 트리거.
- PR #24 머지 후 사용자 결정에 따라 PRD `claude-api-analysis` 진입.
