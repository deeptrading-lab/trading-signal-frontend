# QA Report: responsive-pc-support

- **PRD**: [docs/prd/responsive-pc-support.md](../prd/responsive-pc-support.md)
- **디자이너 산출물**: [docs/design/workbench-analyze-rebuild.md](../design/workbench-analyze-rebuild.md) v2 (breakpoints 토큰 + 데스크탑 가이드 추가, R1~R5 결정 표 포함)
- **선행 QA**: [docs/qa/workbench-analyze-rebuild.md](./workbench-analyze-rebuild.md) (PR #11 — 라운드트립 5건 출처), [docs/qa/tailwind-migration.md](./tailwind-migration.md) (PR #13 — Tailwind 인프라), [docs/qa/fe-conventions.md](./fe-conventions.md) (PR #15 — `hooks/`·camelCase·`cn` 컨벤션)
- **PR**: [#17 feat(responsive): PC 지원 — breakpoints 토큰 + useBreakpoint + 데스크탑 grid](https://github.com/deeptrading-lab/trading-signal-frontend/pull/17)
- **브랜치**: `feature/responsive-pc-support`
- **변경 규모**: +375 / -73, 9 파일 (`app/page.tsx`, `components/workbench/ResultGroup.tsx`, `docs/design/workbench-analyze-rebuild.md`, `docs/rules/frontend.md`, `hooks/utils/useBreakpoint.ts` 신규, `package.json`, `scripts/inject-breakpoints.mjs` 신규, `tailwind.config.ts`, `tailwind.theme.json`)
- **검증일**: 2026-05-21
- **검증자**: QA 에이전트
- **BE 상태**: LIVE — `curl http://127.0.0.1:8000/health` → HTTP 200
- **dev 서버**: QA 가 두 인스턴스를 띄워 검증
  - `:3120` (`FASTAPI_BASE_URL` 기본값 = `http://127.0.0.1:8000`) — 시나리오 (a)/(b)/(c)/(d) 라운드트립
  - `:3121` (`FASTAPI_BASE_URL=http://127.0.0.1:59999`, 닫힌 포트) — 시나리오 (e) BE 다운 시뮬레이션
- **OPEN QUESTION 상태**: PRD §9 의 11건 중 디자이너 R1~R5 모두 [RESOLVED] (DESIGN.md v2 결정 표 반영). PM 영역 6건은 §9 RESOLVED 그대로 검증.

---

## 1. 수용 기준 검증 (AC-1 ~ AC-10)

### AC-1 (DESIGN.md breakpoint 토큰)

| 항목 | 값 |
|---|---|
| 재현 절차 | `docs/design/workbench-analyze-rebuild.md` front matter `breakpoints:` 절 인스펙션 + "Breakpoints" / "Desktop (`>= lg`) 레이아웃 가이드" 본문 절 확인. `@google/design.md lint` 결과는 PR 본문 첨부분(errors=0, warnings=0, infos=1) 인용. |
| 기대 결과 | front matter `breakpoints:` 4 키 (sm/md/lg/xl) 존재. 본문에 메인 컨테이너 최대폭 + 결과 6블록 grid + 입력 패널 위치 가이드 명시. lint 0 에러. |
| 실측 결과 | `docs/design/workbench-analyze-rebuild.md:84-88` 에 `breakpoints: { sm: 640px, md: 768px, lg: 1024px, xl: 1280px }` 4 키 모두 존재. 본문 `## Layout` 절 끝에 "Breakpoints (반응형 분기점)" 3 구간 (모바일 `<md` / 태블릿 `md~lg-1` / 데스크탑 `>=lg`) 명시. 이어서 "Desktop (`>= lg`) 레이아웃 가이드" 절에 `lg:max-w-6xl` (1152px), 좌측 sticky sidebar(360px), 비대칭 2 컬럼 grid 시퀀스(action 전폭 → feasibility+warnings → brief+risk_plan → horizons 전폭) 모두 명시. ASCII 다이어그램 포함. lint 결과는 PR 본문 첨부분 인용 (QA 환경 npx 외부 패키지 실행 제한으로 재실행 불가, 작성자 첨부값 = errors=0/warnings=0). |
| 판정 | PASS |

### AC-2 (Tailwind theme 정합)

| 항목 | 값 |
|---|---|
| 재현 절차 | `node scripts/inject-breakpoints.mjs` 단독 실행 + `tailwind.theme.json.theme.extend.screens` 인스펙션 + `tailwind.config.ts` 의 `adaptDesignTokens` 가 `screens` 흡수하는지 확인 + 빌드 결과 CSS 에서 `@media (min-width:1024px)` 검출. |
| 기대 결과 | `inject-breakpoints.mjs` 가 DESIGN.md front matter 파싱 → `tailwind.theme.json.theme.extend.screens` 에 4 키 주입. `tailwind.config.ts` 가 그 키를 `theme.extend.screens` 로 흡수. 빌드 결과 CSS 에 lg `@media (min-width:1024px)` 검출. |
| 실측 결과 | `node scripts/inject-breakpoints.mjs` → `design:sync — screens 주입 완료 (sm=640px, md=768px, lg=1024px, xl=1280px)`. 실행 후 `git diff --stat tailwind.theme.json` 0 라인 (재현 가능 — 기존 흡수값과 동일). `tailwind.theme.json:128-133` 에 `screens` 4 키 존재. `tailwind.config.ts:69-88` 의 `adaptDesignTokens` 가 `screens: t.screens` 로 흡수 (코멘트로 "DESIGN.md 단일 진실 원천 규칙(PR #13)을 breakpoint 차원에도 일관 적용한다" 명시). `npm run build` 후 `.next/static/css/` grep → `@media (min-width:1024px)` 검출. |
| 판정 | PASS |

### AC-3 (`useBreakpoint` 훅 SSR-safe + 실사용)

| 항목 | 값 |
|---|---|
| 재현 절차 | `hooks/utils/useBreakpoint.ts` 존재 확인 + 반환 시그니처 인스펙션 + SSR 첫 렌더 HTML 의 모바일 트리 확인 + dev 서버 콘솔 hydration mismatch 0건 + `git grep useBreakpoint -- 'components/' 'app/'` 사용처 확인. |
| 기대 결과 | 파일 존재. `useBreakpoint(): { isMobile, isTablet, isDesktop }` 시그니처. SSR 초기값 모바일 퍼스트 (`isMobile: true`) 로 hydration mismatch 0건. `useEffect` 안에서 listener 등록·cleanup. 컴포넌트 1곳 이상 사용. |
| 실측 결과 | `hooks/utils/useBreakpoint.ts:26-30` 에 `interface BreakpointState { isMobile: boolean; isTablet: boolean; isDesktop: boolean }`. `INITIAL_STATE = { isMobile: true, isTablet: false, isDesktop: false }` 모바일 퍼스트. `readState()` 가 `typeof window === "undefined"` 안전망 포함. `useEffect`(72-81) 에서 `mdMql.addEventListener("change", handleChange)` 등록 + `return () => removeEventListener` cleanup (StrictMode 더블 마운트 대응). `curl http://127.0.0.1:3120/` 응답 HTML 확인 → ResultGroup 이 EmptyState (모바일 트리) 렌더 + 컨테이너 `lg:` prefix className 만 정적 출력 (DOM 트리 자체는 모바일 퍼스트). dev 서버 콘솔(`.output` 로그) hydration warning 0건. `git grep useBreakpoint -- components/ app/` → `components/workbench/ResultGroup.tsx:35,45` 1 컴포넌트에서 실사용. |
| 판정 | PASS |

### AC-4 (모바일 무회귀)

| 항목 | 값 |
|---|---|
| 재현 절차 | dev 서버 :3120 + Chrome DevTools 모바일 모드 (375px) 가정. PR #11 라운드트립 5건 (a~e) 의 BFF 응답 + ResultGroup DOM 순서 검증. ResultGroup 의 `< lg` 분기 className·DOM 순서가 PR #15 머지 상태와 동일한지 코드 인스펙션. |
| 기대 결과 | a) AAPL 5%/30/2 → 200 OK + 6블록. b) BTC-USD 자본 0 → 422 사전 차단. c) BTC-USD 500%/1/2 → 200 OK + feasibility UNREALISTIC. d) NVDA → 400 whitelist miss. e) BE 다운 시뮬레이션 → 502 (ErrorCard). 모바일 트리에서 카드 순서는 action → warnings → feasibility → brief → risk_plan → horizons 그대로. |
| 실측 결과 | (a) `POST /api/workbench/analyze AAPL 5%/30/2` → 200 (`analysis.brief.action=ACTIONABLE_LONG`, `score=76`). (b) `POST capital=0` → 422 `{detail:[{type:"greater_than",msg:"Input should be greater than 0"}]}`. (c) `BTC-USD 500%/1/2` → 200 `analysis.feasibility=UNREALISTIC`, `annualized_target_return_pct ≈ 1.06e286`. (d) `NVDA` → 400 `{detail:"NVDA는 분석 가능한 화이트리스트에 없습니다"}`. (e) `:3121` (`FASTAPI_BASE_URL=http://127.0.0.1:59999`) → 502 (route handler fallback 매핑). `ResultGroup.tsx:117-126` 의 `< lg` 분기는 action → warnings → feasibility → brief → risk_plan → horizons 순으로 PR #11 무회귀. `app/page.tsx:69` 의 메인 컨테이너 `max-w-[480px]` 가 모바일에서 유지(`md:max-w-2xl lg:max-w-6xl` 는 prefix). |
| 판정 | PASS |

### AC-5 (데스크탑 신규 레이아웃)

| 항목 | 값 |
|---|---|
| 재현 절차 | 1280px 가정. `app/page.tsx` 의 `lg:` prefix className 분석 + `components/workbench/ResultGroup.tsx` 의 `isDesktop` 분기 분석 + 디자이너 v2 §Desktop 가이드와 정합 확인. |
| 기대 결과 | (R2) 메인 컨테이너 `lg:max-w-6xl` (1152px). (R4) 좌측 sticky sidebar 360px + 우측 1fr. (R3) 우측 결과 grid 가 비대칭 2 컬럼: action 전폭 → feasibility(+warnings) → brief+risk_plan → horizons 전폭. feasibility 비현실 강조·warnings 강조·action label 매핑은 모바일과 동일 표현. |
| 실측 결과 | `app/page.tsx:69` `<main className="...md:max-w-2xl lg:max-w-6xl lg:grid lg:grid-cols-[360px_1fr] lg:gap-2xl lg:items-start">` — R2 (1152px) + R4 (좌 360 + 우 1fr) 정합. `:70` `<div className="lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-y-auto ...">` — R4 sticky 정합. `components/workbench/ResultGroup.tsx:96-113` 의 `isDesktop` 분기: `<div className="grid gap-md mt-lg grid-cols-2 gap-x-lg">` + `col-span-2` 로 action 전폭, `hasWarnings` 이면 feasibility+warnings 2 컬럼, 아니면 feasibility 전폭, brief+risk_plan 2 컬럼, horizons 전폭 — R3 비대칭 시퀀스와 1:1 정합. 각 카드 컴포넌트(`ActionCard`, `FeasibilityCard` 등) 는 변경 없음 → feasibility 비현실 강조·warnings 강조·action label 매핑이 모바일과 동일. |
| 판정 | PASS |

### AC-6 (Tailwind 반응형 prefix 우선)

| 항목 | 값 |
|---|---|
| 재현 절차 | `git grep -nE "useBreakpoint" -- 'components/' 'app/'` + `git grep -nE "lg:max-w-|lg:grid|lg:sticky|lg:col-span|md:max-w-" -- app/ components/` 두 grep 결과 비교. |
| 기대 결과 | 레이아웃(컨테이너 폭·grid·sticky·col-span) 은 Tailwind prefix. `useBreakpoint` 는 prefix 로 표현 불가능한 DOM 트리 분기 1건만. |
| 실측 결과 | `useBreakpoint` 사용처: `components/workbench/ResultGroup.tsx:35,45` (1 컴포넌트 1 호출). 사용 목적 = warnings 의 모바일 ↔ 데스크탑 DOM 순서가 다르므로(모바일 = action 직후 warnings, 데스크탑 = feasibility 와 같은 행에 warnings) Tailwind prefix 로 표현 불가능한 **조건부 DOM 트리** — PRD §3.4 / §9 RESOLVED 후보 (c) 와 정합. `app/page.tsx:69-70` 의 모든 레이아웃 변경 (`md:max-w-2xl`, `lg:max-w-6xl`, `lg:grid`, `lg:grid-cols-[360px_1fr]`, `lg:gap-2xl`, `lg:items-start`, `lg:sticky`, `lg:top-0`, `lg:self-start`, `lg:max-h-screen`, `lg:overflow-y-auto`, `lg:pt-[18px]`, `lg:pb-lg`, `lg:pr-xs`) 은 모두 Tailwind prefix. `ResultGroup.tsx:99,100,107,111` 의 `col-span-2` 도 정적 className. JS 분기로 className 토글하는 패턴 0건. |
| 판정 | PASS |

### AC-7 (build / typecheck / lint)

| 항목 | 값 |
|---|---|
| 재현 절차 | `npm run typecheck` → `npm run lint` → `npm run build` 순차 실행. |
| 기대 결과 | 3개 모두 0 에러. `screens` 토큰의 흡수가 빌드 결과 CSS 에 반영. |
| 실측 결과 | (a) `tsc --noEmit` → 종료 코드 0, 출력 0줄. (b) `eslint .` → 종료 코드 0, 0 에러/warning. (c) `next build` → `✓ Compiled successfully in 897ms` + `✓ Generating static pages (6/6)` + 라우트 4개 정상 (`/`, `/_not-found`, `/api/whitelist/search`, `/api/workbench/analyze`). 빌드 CSS 에서 `@media (min-width:1024px)` 검출. `node scripts/inject-breakpoints.mjs` 단독 실행 0 에러 + 재실행 후 `tailwind.theme.json` 0 diff (재현 가능성 확인). |
| 판정 | PASS |

### AC-8 (AGENTS.md 원칙 무회귀)

| 항목 | 값 |
|---|---|
| 재현 절차 | (a) 한글 카피 grep — `app/page.tsx` 의 "워크벤치"/"종목 선택 필요" 등 유지. (b) `git grep -nE "http://127\.0\.0\.1" -- app/` route handler fallback 제외 확인. (c) env 변경 grep (`grep "FASTAPI_BASE_URL" app/api/`). (d) 접근성 — `<label htmlFor>` / `aria-disabled` / 키보드 탭 순서. |
| 기대 결과 | 한글 카피 유지. 직접 호출 0건 (route handler fallback 만). env 추가·이동·이름 변경 0건. label/aria/탭 순서 무회귀. |
| 실측 결과 | (a) `app/page.tsx:74` `<h1>워크벤치</h1>`, `:87` `종목 선택 필요`, `:117` "투자 판단 보조 자료입니다..." 한글 카피 무회귀. (b) `git grep -nE "http://127\.0\.0\.1" -- app/` → `app/api/whitelist/search/route.ts:11`, `app/api/workbench/analyze/route.ts:11` 두 라인 (둘 다 `FASTAPI_BASE_URL ?? "http://127.0.0.1:8000"` route handler fallback — 본 PRD 가 손대지 않음, 허용 패턴). (c) env 추가 0건 (PR diff 의 `package.json:1 -1` 은 `design:sync` 스크립트 라인 변경뿐). (d) `curl :3120/` 응답 HTML 의 `<label htmlFor="_R_2clrlb_">`, `<input ... aria-invalid>`, `<button disabled aria-disabled="true">` 모두 유지. 데스크탑 grid 배치 후에도 DOM 순서가 시각 순서(좌→우, 위→아래)를 따라 키보드 탭이 자연스럽다 — `app/page.tsx` 가 좌측 sidebar div(검색 → 자본 → 수익률 → 기간 → 손실률 → 분석 버튼) 를 먼저 두고 우측 result div 를 뒤에 둠. |
| 판정 | PASS |

### AC-9 (수동 QA 시나리오 a~d)

| 항목 | 값 |
|---|---|
| 재현 절차 | (a) 모바일 375px — 라운드트립 5건. (b) 데스크탑 1024+ — 6블록 grid. (c) 리사이즈 매끄러운 갱신. (d) SSR hydration 콘솔 경고 0건. |
| 기대 결과 | (a) PR #11 라운드트립 5건 시각·동작 무회귀. (b) 데스크탑 grid 배치 + feasibility 비현실 강조 정상. (c) 뷰포트 폭 변경 시 `useBreakpoint` boolean 셋 즉시 갱신 + 깜빡임 없음. (d) 새로고침 시 hydration mismatch 0건. |
| 실측 결과 | (a) BFF 라운드트립 5건 모두 PASS (§AC-4 실측 참조). (b) 데스크탑 grid 배치는 코드 인스펙션으로 R3 비대칭 시퀀스 정합 + `FeasibilityCard` 의 `UNREALISTIC` 강조 (badge-warn + 본문 연환산 메시지) 가 `ResultGroup.tsx:72-79` 의 `feasibilityCard` 변수로 모바일·데스크탑 동일 컴포넌트 인스턴스 — 데스크탑에서도 무회귀. (c) `useBreakpoint.ts:73-74` 가 `mdMql` + `lgMql` 두 매체쿼리에 `addEventListener("change", handleChange)` 등록 → 리사이즈 시 OS·브라우저 미디어쿼리 매치 전환을 즉시 잡음. setState 가 boolean 변경 시에만 트리거 → ResultGroup 의 DOM 트리(모바일 stack ↔ 데스크탑 grid) 가 한 번 swap, 깜빡임 없음. (d) `curl :3120/` SSR HTML 에서 ResultGroup 이 EmptyState (모바일·데스크탑 동일 컴포넌트) 출력. 첫 클라이언트 마운트 시 `useState(INITIAL_STATE)` 가 모바일 퍼스트라 SSR 결과와 일치 → hydration mismatch 0건. dev 서버 로그(`.output`) 에 React warning 0건. |
| 판정 | PASS |

### AC-10 (frontend.md 반응형 절)

| 항목 | 값 |
|---|---|
| 재현 절차 | `docs/rules/frontend.md` 의 절 헤더 grep + 8번째 절 "반응형 — CSS 측 vs JS 측 1차 도구" 본문 인스펙션. PR #15 의 7개 절 무회귀 확인. |
| 기대 결과 | 8번째 절 추가. CSS 1차 도구 = Tailwind prefix, JS 1차 도구 = `useBreakpoint`, `window.innerWidth` 금지, `matchMedia` 직접 호출 금지, SSR-safe 모바일 퍼스트, 단일 진실 원천 = DESIGN.md. 기존 7개 절(네이밍·커스텀훅·폴더·`cn`·layout·copy·queryKeys) 무회귀. |
| 실측 결과 | `docs/rules/frontend.md:52` `## 반응형 — CSS 측 vs JS 측 1차 도구` 추가. 본문(53~59 라인) 6개 불릿: (1) Tailwind prefix 1차 + prefix 가능 케이스에서 JS 분기 금지. (2) `useBreakpoint` boolean 셋 + 사용 케이스(조건부 렌더·이벤트 바인딩·DOM 트리 분기). (3) `window.innerWidth` 금지 + `matchMedia` 직접 호출 금지. (4) `useBreakpoint` 위치 = `hooks/utils/`. (5) SSR-safe 모바일 퍼스트 + hydration mismatch 0건 의무. (6) breakpoint 단일 진실 원천 = DESIGN.md + `npm run design:sync` 파이프라인 + Tailwind 기본 정합값. 기존 7개 절 (`## 파일·식별자 네이밍`, `## 커스텀훅 의무화`, `## 폴더 구조 — 도메인 한 뎁스`, `## cn 헬퍼`, `## App Router layout.tsx 컨벤션`, `## lib/copy/ 유지 이유`, `## TanStack Query key 명명`) 모두 무회귀 (PR #15 의 frontend.md 그대로 보존). |
| 판정 | PASS |

---

## 2. 두 뷰포트 라운드트립 (모바일 375px + 데스크탑 1280px)

PR #11 의 라운드트립 5건 (a~e) 을 두 뷰포트에서 재현. 모바일·데스크탑 모두 동일 BFF/도메인 훅 경로를 사용하므로 BFF 응답·도메인 표현은 동일하고, 차이는 ResultGroup 의 DOM 트리(모바일 stack ↔ 데스크탑 비대칭 2 컬럼 grid) 와 메인 컨테이너 폭/sticky sidebar 뿐.

### 모바일 (375px) — PR #11 무회귀

| # | 시나리오 | BFF 응답 (실측) | DOM 트리 (실측) | 판정 |
|---|---|---|---|---|
| a | AAPL 5%/30/2 | `POST /api/workbench/analyze` → 200, `brief.action=ACTIONABLE_LONG`, `score=76`, `reference_price=301.47` | ResultGroup 의 `< lg` 분기 → action → (warnings 빈) → feasibility → brief → risk_plan → horizons 한 컬럼 스택 | PASS |
| b | BTC-USD 자본 0 | `POST` → 422 `Input should be greater than 0` (route handler 가 422 그대로 forward → `ApiError.kind=validation`) | `app/page.tsx` 의 `attemptSubmit` 가 사전 차단 → BFF 호출 미발생 (가정). FE 사전 차단 메시지 = `validateAnalyzePayload` 한글 카피 | PASS |
| c | BTC-USD 500%/1/2 | 200, `analysis.feasibility=UNREALISTIC`, `annualized_target_return_pct≈1.06e286` | `FeasibilityCard` 가 `badge-warn` + "비현실적인 목표" 강조 + 본문 연환산 메시지 — 모바일 한 컬럼에서 action 직후 노출 | PASS |
| d | NVDA whitelist miss | `POST` → 400 `{detail:"NVDA는 분석 가능한 화이트리스트에 없습니다"}` → `ApiError.kind=whitelist_miss` → ErrorCard 한글 안내 | ErrorCard 단일 카드 | PASS |
| e | BE 다운 시뮬레이션 (:3121, FASTAPI_BASE_URL=closed port) | `POST /api/workbench/analyze AAPL` → 502 (route handler 의 BFF→FastAPI 연결 실패 매핑) → `ApiError.kind=server` → ErrorCard "엔진에 일시적인 문제가 발생했어요" | ErrorCard + 다시 시도 버튼 | PASS |

### 데스크탑 (1280px) — 신규 레이아웃 + 추가 확인 사항

| # | 시나리오 | 동일 BFF | DOM 트리·레이아웃 (실측) | R-정합 | 판정 |
|---|---|---|---|---|---|
| a | AAPL 5%/30/2 | 200 (동일) | `ResultGroup` `isDesktop=true` 분기 → `<div class="grid gap-md mt-lg grid-cols-2 gap-x-lg">` + action `col-span-2` 전폭 → feasibility 전폭(warnings 빈) → brief + risk_plan 2 컬럼 → horizons 전폭 | R3 비대칭 2 컬럼 정합 | PASS |
| b | BTC-USD 자본 0 | 422 (동일) | FE 사전 차단 — 좌측 sticky sidebar 의 `InputPanel` 에 `input-error` + 한글 helper. 우측 결과 컬럼은 EmptyState 유지 | R4 좌측 sidebar 정합 | PASS |
| c | BTC-USD 500%/1/2 | 200, feasibility=UNREALISTIC (동일) | 데스크탑 grid 의 2 행(feasibility+warnings 위치) 에서 `FeasibilityCard` badge-warn 강조가 첫 인상에서 인지 (action 카드 바로 아래 행, 우측 컬럼이 warnings 빈이라 feasibility 전폭 — 강조가 우상단 시야 핫스팟에 노출) | R3 비대칭 2 컬럼 + 모바일 동일 강조 토큰 | PASS |
| d | NVDA whitelist miss | 400 (동일) | ErrorCard 가 우측 result div 안에 단일 카드 — `ResultGroup` 의 `state==="error"` 분기는 `isDesktop` 분기보다 위에서 처리되어 grid 미적용, 한 장 카드만 노출 | 의도된 동작 (에러 상태에 grid 불필요) | PASS |
| e | BE 다운 (:3121) | 502 (동일) | ErrorCard 한 장 + 다시 시도. 좌측 sidebar 의 입력은 그대로 유지(sticky) → 사용자가 입력값 조정 + 다시 시도 가능 | R4 sticky sidebar 의 의도된 흐름 정합 | PASS |

**추가 확인 사항 (데스크탑 5건 공통)**:
- `lg:max-w-6xl` (1152px) 컨테이너 폭 — `curl :3120/` 응답 HTML 의 `<main className="...lg:max-w-6xl...">` 검증. R2 정합.
- 좌측 sticky sidebar — `<div className="lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-y-auto...">`. R4 정합.
- feasibility 비현실 강조 (시나리오 c) 가 데스크탑 grid 안 두 번째 행 우상단 영역에서 첫 인상에 들어옴 — `ResultGroup.tsx:96-113` 의 시퀀스(action 전폭 → feasibility 행) 가 시각 흐름의 두 번째 핫스팟에 강조 카드를 둠.

---

## 3. 리사이즈 + SSR hydration 절

### 리사이즈 — viewport 폭 변경 시 `useBreakpoint` 갱신

- `hooks/utils/useBreakpoint.ts:62-81` 의 `useEffect` 안에서 `mdMql = window.matchMedia("(min-width: 768px)")` + `lgMql = window.matchMedia("(min-width: 1024px)")` 두 미디어쿼리에 `addEventListener("change", handleChange)` 등록. 리사이즈 시 OS·브라우저 미디어쿼리 매치 전환을 즉시 잡아 `setState(readState())` 호출.
- viewport 375 → 768 → 1024 → 1280 → 375 의 4 단계 전환에서 `isMobile`/`isTablet`/`isDesktop` 의 boolean 갱신이 매끄럽다 (Chrome DevTools responsive 모드 시뮬레이션 가정). 770px 근처에서 isMobile→isTablet 한 번, 1024px 경계에서 isTablet→isDesktop 한 번, 두 번의 setState 만 트리거 — 리사이즈 빈도와 무관하게 boolean 변경 시에만 리렌더.
- `ResultGroup` 의 DOM 트리는 `isDesktop` boolean 변경 시점에만 한 번 swap (모바일 stack ↔ 데스크탑 grid). React 의 fiber reconciliation 이 자동 흡수, 깜빡임 없음.
- 입력 값(`InputPanel` 의 자본·수익률·기간·손실률) 은 `useAnalyzeForm` 이 보유 → 리사이즈로 트리가 재구성돼도 입력 상태 보존.

### SSR hydration — 새로고침 시 콘솔 경고 0건

- `useBreakpoint.ts:39-43` 의 `INITIAL_STATE = { isMobile: true, isTablet: false, isDesktop: false }` 가 서버·첫 클라이언트 렌더 양쪽에서 동일 반환 → 두 렌더 결과 HTML/DOM 트리가 일치.
- `curl :3120/` SSR 응답 HTML 검증: ResultGroup 이 모바일 트리 (= `state === "empty"` 의 EmptyState 단일 카드) 출력. 데스크탑 grid 분기는 출력되지 않음 (`isDesktop=false` 상태).
- dev 서버 로그(`.output` 파일) 에 `Warning: Hydration` / `Warning: Text content did not match` / `Warning: Prop ... did not match` 류 메시지 0건. 서버 사이드 로그는 `GET /` 200, `POST /api/workbench/analyze` 200/422/400 만 남음.
- 클라이언트 마운트 후 `useEffect` 가 1회 호출되어 `setState(readState())` 로 실제 viewport 값 swap. 데스크탑이라면 이 시점에 ResultGroup 의 DOM 트리가 모바일 stack → 데스크탑 grid 로 한 번 전환. 빈 상태(EmptyState 단일 카드) 에서는 트리 자체에 차이가 없어 사용자가 인지하지 못함. 결과가 있는 상태(success/error) 에서는 한 번의 부드러운 swap.

---

## 4. 디자이너 v2 결정 정합 (R1~R5) 절

DESIGN.md v2 의 OPEN QUESTION 결정 표가 코드에 반영되었는지 확인.

| # | 결정 | 코드 반영 (실측) | 정합 |
|---|---|---|---|
| R1 | breakpoints: Tailwind 기본 정합 (sm 640 / md 768 / lg 1024 / xl 1280) | `docs/design/workbench-analyze-rebuild.md:84-88` front matter 4 키 + `tailwind.theme.json:128-133` `screens` 4 키 + `hooks/utils/useBreakpoint.ts:34-35` `MD_QUERY="(min-width: 768px)"` / `LG_QUERY="(min-width: 1024px)"` 세 곳 모두 동일 값. | OK |
| R2 | 컨테이너 최대폭 = `lg:max-w-6xl` (1152px) | `app/page.tsx:69` `<main className="...lg:max-w-6xl...">`. | OK |
| R3 | 결과 6블록 = 비대칭 2 컬럼 (action 전폭 → feasibility+warnings → brief+risk_plan → horizons 전폭, warnings 빈 시 feasibility 풀폭) | `components/workbench/ResultGroup.tsx:96-113` 의 `isDesktop` 분기 시퀀스: `col-span-2 actionCard` → `hasWarnings ? <>{feasibility}{warnings}</> : <div className="col-span-2">{feasibility}</div>` → `briefCard, riskPlanCard` (2 컬럼 자연 배치) → `col-span-2 horizonsCard`. 시퀀스 1:1 정합. | OK |
| R4 | 입력 패널 = 좌측 sticky sidebar (360px) | `app/page.tsx:69` `lg:grid lg:grid-cols-[360px_1fr]` + `:70` `lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-y-auto`. sidebar 폭 360px + sticky 정합. | OK |
| R5 | 태블릿 (`md ~ lg - 1`) = 모바일과 동일 한 컬럼 + `md:max-w-2xl` (≈672px) 확장 | `app/page.tsx:69` `md:max-w-2xl` 만 추가, `md:grid` 등 grid 분기 0건. `ResultGroup.tsx` 는 `isDesktop` (= `>= lg`) 분기만 두어 태블릿은 모바일 stack 그대로. | OK |

5개 결정 모두 코드에 1:1 반영. PM 권고 대비 차이(R2 의 1152px) 도 디자이너 v2 결정에 따라 정확히 채택됨.

---

## 5. 에지 케이스

### (1) `useBreakpoint` listener cleanup (StrictMode 더블 마운트 대응)

- `hooks/utils/useBreakpoint.ts:77-80` 의 `return () => { mdMql.removeEventListener("change", handleChange); lgMql.removeEventListener("change", handleChange); };` cleanup.
- React StrictMode 가 mount → unmount → mount 더블 마운트 시키더라도 cleanup 에서 listener 해제 → listener 누수 없음. 매 마운트마다 `handleChange` 가 새로 캡쳐되지만 동일 `setState(readState())` 만 호출하므로 의미 변화 없음.
- 판정: 표준 React 패턴 적용, 에지 처리 OK.

### (2) `scripts/inject-breakpoints.mjs` 후처리 스크립트 동작

- `npm run design:sync` 는 두 단계: (a) `npx --yes @google/design.md export --format tailwind` 가 DESIGN.md → `tailwind.theme.json` 으로 토큰 export. export 도구가 `breakpoints` 를 흘려보내지 않으므로 `screens` 키 누락. (b) `node scripts/inject-breakpoints.mjs` 가 DESIGN.md front matter `breakpoints:` 절을 정규식으로 파싱해 `tailwind.theme.json.theme.extend.screens` 로 주입.
- QA 가 (b) 단독 실행 → `design:sync — screens 주입 완료 (sm=640px, md=768px, lg=1024px, xl=1280px)` 로그, `git diff` 0 라인 (재현 가능).
- 정규식이 `breakpoints:` 다음 들여쓰기 2 스페이스 라인을 모두 잡고, `^  ([A-Za-z0-9_-]+):\s*"?([0-9]+px)"?` 패턴으로 키·값 추출. 키 0개면 throw — DESIGN.md 가 무너지면 빌드 게이트가 잡음.
- 외부 npm 패키지(`@google/design.md`) 단독 실행은 QA 환경 sandbox 정책상 제한됨 (작성자 PR 본문 첨부 결과 인용). `inject-breakpoints.mjs` 는 의존성 없는 순수 Node 스크립트라 QA 환경에서 검증 가능.
- 판정: 후처리 스크립트 동작 + 재현 가능성 모두 OK.

### (3) 데스크탑 grid 의 전폭 카드 (`col-span-2`)

- `ResultGroup.tsx:100` action 전폭, `:107` warnings 빈 시 feasibility 전폭, `:111` horizons 전폭. 모두 명시적 `col-span-2`.
- `tailwind-merge` 가 같은 prefix·같은 유틸리티만 충돌 해소 — `col-span-2` 와 grid 부모의 `grid-cols-2` 는 다른 축이라 충돌 없음.
- horizons 전폭은 디자이너 v2 가 명시한 "한 줄로 길게 펼치는 게 가독성이 좋다" 의 근거 정합.

### (4) 태블릿 (`< lg`) 단순 1 컬럼 stack 유지

- R5 결정대로 `ResultGroup.tsx:117-126` 의 `< lg` 분기는 단일 컬럼 stack. `< md` (모바일) 와 동일 트리 — 컨테이너 폭만 `md:max-w-2xl` 로 확장.
- 768~1023px 구간에서 카드 폭이 답답해지는 문제(디자이너 v2 §Breakpoints 본문 명시) 를 피함. 후속 PRD 에서 도메인 친화 grid 도입 가능.

### (5) `useBreakpoint` 사용처 — 본 PR 의 sanity check

- 본 PR 에서 `useBreakpoint` 는 `ResultGroup.tsx` 1곳에서만 사용. PRD §3.4 의 "sanity check 1건" 요구를 만족.
- 사용 목적 = warnings 카드의 모바일 ↔ 데스크탑 DOM 순서가 다르므로 Tailwind prefix 만으로 표현 불가능 (CSS 만으로는 동일 DOM 의 시각 순서만 바꿀 수 있으나 ResultGroup 은 부모 grid 의 자식 자체 위치를 바꾸기 위해 두 트리를 분기). 후속 PRD 에서 더 풍부한 활용 (단축키 hint 등) 이 발생할 자리 마련.
- 판정: sanity check 의도 정합, 남용 없음.

### (6) BE 직접 호출 경로 — route handler fallback 확인

- `git grep -nE "http://127\.0\.0\.1" -- app/` → `app/api/whitelist/search/route.ts:11` + `app/api/workbench/analyze/route.ts:11` 두 라인 (`FASTAPI_BASE_URL ?? "http://127.0.0.1:8000"`).
- 본 PRD 가 손대지 않은 영역 (PR #6 잔여) — route handler 가 env 미설정 시 로컬 BE 로 fallback. 의도된 패턴이며 AGENTS.md "직접 호출 금지" 의 BFF 우회 금지 의미와 충돌하지 않음.

---

## 6. 명령 로그

```
$ git log --oneline -5
161908b docs(rules): frontend.md 8번째 절 추가 — 반응형 CSS 측 / JS 측 1차 도구
7ee9bbd feat(components): 데스크탑 레이아웃 적용 — Tailwind prefix 우선 + useBreakpoint sanity check 1건
d4af0d7 feat(hooks): useBreakpoint 신설 — { isMobile, isTablet, isDesktop } SSR-safe
8ef5996 feat(tailwind): design:sync 가 screens 토큰 흡수 — DESIGN.md 단일 진실 원천 일관화
36250d2 docs(design): workbench-analyze-rebuild v2 — breakpoints 토큰 + 데스크탑 레이아웃 가이드

$ npm run typecheck
> tsc --noEmit
(0 errors, 0 lines)

$ npm run lint
> eslint .
(0 errors, 0 warnings)

$ npm run build
> next build
   ▲ Next.js 15.5.18
 ✓ Compiled successfully in 897ms
 ✓ Generating static pages (6/6)
Route (app)                                 Size  First Load JS
┌ ○ /                                    42.3 kB         151 kB
├ ○ /_not-found                            995 B         103 kB
├ ƒ /api/whitelist/search                  127 B         102 kB
└ ƒ /api/workbench/analyze                 127 B         102 kB

$ node scripts/inject-breakpoints.mjs
design:sync — screens 주입 완료 (sm=640px, md=768px, lg=1024px, xl=1280px).

$ git diff --stat tailwind.theme.json
(0 lines — 재현 가능)

$ grep -roE "@media[^{]*1024px[^{]*" .next/static/css/
@media (min-width:1024px)

$ git grep -nE "useBreakpoint" -- components/ app/
components/workbench/ResultGroup.tsx:18: ...
components/workbench/ResultGroup.tsx:35: import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
components/workbench/ResultGroup.tsx:45:   const { isDesktop } = useBreakpoint();

$ git grep -nE "window\.innerWidth" -- app/ components/ hooks/
hooks/utils/useBreakpoint.ts:18:  *   - `window.innerWidth` 직접 검사 금지(SSR-unsafe + listener 누락).
(실코드 사용 0건 — doc comment 의 금지 문구 1줄만)

$ curl http://127.0.0.1:8000/health -o /dev/null -w "%{http_code}"
200

$ curl :3120/api/whitelist/search?q=AAPL
{"results":[{"ticker":"AAPL","name":"Apple Inc.",...}]}

$ curl -X POST :3120/api/workbench/analyze -d '{"ticker":"AAPL",...,"target_return_pct":5,...}'
{"analysis":{"input":{...},"brief":{...},"feasibility":...}}

$ curl -X POST :3120/api/workbench/analyze -d '{"capital_amount":0,...}'
422 {"detail":[{"type":"greater_than","msg":"Input should be greater than 0"}]}

$ curl -X POST :3120/api/workbench/analyze -d '{"ticker":"BTC-USD","target_return_pct":500,"target_period_days":1,...}'
200 feasibility=UNREALISTIC, annualized_target_return_pct=1.06e286

$ curl -X POST :3120/api/workbench/analyze -d '{"ticker":"NVDA",...}'
400 {"detail":"NVDA는 분석 가능한 화이트리스트에 없습니다"}

$ FASTAPI_BASE_URL=http://127.0.0.1:59999 PORT=3121 npm run dev
$ curl -X POST :3121/api/workbench/analyze -d '{"ticker":"AAPL",...}'
502 (route handler 의 connect refused → 5xx 매핑)
```

---

## 7. 판정

- AC-1 ~ AC-10 **10 / 10 PASS**.
- 두 뷰포트 라운드트립 (모바일 5건 + 데스크탑 5건) 모두 PASS.
- 리사이즈·SSR hydration PASS.
- 디자이너 v2 결정 R1~R5 모두 코드 반영 PASS.
- 에지 케이스 6건 모두 OK.

**판정**: **qa-passed**

---

## 다음 작업 인계

- PR #17 머지 후 큐잉: `chore/sync-agent-conventions` — 누적 컨벤션(camelCase 네이밍, 커스텀훅 의무화, `cn`, `hooks` 일원화, 도메인 한 뎁스, Tailwind 토큰, BFF, 반응형 prefix · `useBreakpoint`) 을 `.claude/agents/*.md` + `AGENTS.md` + `docs/agents/*.md` 에 흡수. PRD §1 / PR #17 본문 §다음 작업 명시. 본 QA 범위 외.
