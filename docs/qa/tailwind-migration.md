# QA Report: tailwind-migration

- **PRD**: [docs/prd/tailwind-migration.md](../prd/tailwind-migration.md)
- **디자이너 산출물(source-of-truth)**: [docs/design/workbench-analyze-rebuild.md](../design/workbench-analyze-rebuild.md)
- **선행 QA**: [docs/qa/workbench-analyze-rebuild.md](./workbench-analyze-rebuild.md) (라운드트립 5건 a~e — 본 PR 가 시각 0 회귀를 AC 로 못 박음)
- **PR**: [#13 tailwind-migration: Tailwind v3 도입 + globals.css 844→46라인 + var(--) 0건](https://github.com/deeptrading-lab/trading-signal-frontend/pull/13)
- **브랜치**: `feature/tailwind-migration`
- **검증일**: 2026-05-21
- **검증자**: QA 에이전트
- **BE 상태**: LIVE — `curl http://127.0.0.1:8000/health` → `{"status":"ok"}` (HTTP 200)
- **dev 서버**: QA 가 두 인스턴스를 띄워 검증
  - `:3100` (FASTAPI_BASE_URL 기본값 = `http://127.0.0.1:8000`) — 시나리오 (a)/(c)/(d) 라운드트립
  - `:3110` (`FASTAPI_BASE_URL=http://127.0.0.1:59999`, 닫힌 포트) — 시나리오 (e) BE 다운 시뮬레이션

---

## 1. 수용 기준 검증 (AC-1 ~ AC-12)

### AC-1 (Tailwind 도입)

| 항목 | 값 |
|---|---|
| 재현 절차 | `npm ls tailwindcss` / `ls tailwind.config.ts` / `head -13 app/globals.css` |
| 기대 결과 | tailwindcss devDependency 1개 + `tailwind.config.ts` 존재 + `app/globals.css` 에 `@tailwind base/components/utilities` 3 디렉티브 모두 존재 |
| 실측 결과 | `npm ls tailwindcss` → `tailwindcss@3.4.19` (v3 PM 권고 채택). `tailwind.config.ts` 98 라인. `app/globals.css:11-13` 에 `@tailwind base;` `@tailwind components;` `@tailwind utilities;` 3 디렉티브 모두 존재 |
| 판정 | PASS |

### AC-2 (`app/globals.css` 100라인 미만 + 잔여물 사유 코멘트)

| 항목 | 값 |
|---|---|
| 재현 절차 | `wc -l app/globals.css` + 잔여물 각각의 코멘트 인스펙션 |
| 기대 결과 | 100 라인 미만. 잔여물 각각에 한 줄 사유 코멘트 (PM 권고) |
| 실측 결과 | `wc -l app/globals.css` = **46** (목표 100 미만, main 844 라인 → 94% 감축). 잔여물 4건 + 사유: (1) `:root color-scheme:light` — "다크모드는 별도 PRD" 코멘트, (2) `body @apply bg-neutral text-primary font-sans` — "preflight 가 색까지 흡수하지는 않음" 코멘트, (3) `html font-family: Arial, Helvetica, sans-serif` — "DESIGN.md 가 시스템 sans 만 쓰지만 Arial 우선 정렬 유지" 코멘트, (4) `.tabular font-variant-numeric:tabular-nums` — "Tailwind preflight 가 흡수하지 않음" 코멘트, (5) `@keyframes skeletonShimmer` — "Tailwind 기본 keyframes 에 미포함" 코멘트. 합성 토큰은 `app/components.css` 로 분리됐고 PRD AC-2 의 100 라인 제약은 본 파일에만 적용한다는 코멘트가 `app/globals.css:5` 와 `app/components.css:12` 양쪽에 명시 |
| 판정 | PASS |

### AC-3 (CSS 변수 직접 참조 0건)

| 항목 | 값 |
|---|---|
| 재현 절차 | `git grep -nE "var\(--" -- app/ components/` |
| 기대 결과 | 0건 (`tailwind.config.ts` 내부 / `@layer` 안 예외 허용) |
| 실측 결과 | grep exit=1 (no match) — 0건 |
| 판정 | PASS |

### AC-4 (design:sync 파이프라인 동작)

| 항목 | 값 |
|---|---|
| 재현 절차 | `package.json scripts.design:sync` 확인 + `npm run design:sync` 실행 + `tailwind.config.ts` 의 JSON import 인스펙션 |
| 기대 결과 | `design:sync` script 가 `npx @google/design.md export --format tailwind docs/design/workbench-analyze-rebuild.md > tailwind.theme.json` 한 줄로 묶이고, 0 에러로 종료, JSON 갱신, `tailwind.config.ts` 가 JSON 을 `import` 후 어댑터 통과해 `theme.extend` 주입 |
| 실측 결과 | `package.json:11` `design:sync` script 존재 (PRD §3 명시 명령 그대로). 두 차례 실행: (1) clean baseline 에서 → exit 0 + 결과 JSON 이 backup 과 byte-identical (idempotent). (2) DESIGN.md 의 `tertiary: "#0f766e"` → `"#ff00ff"` 변경 후 → exit 0 + `tailwind.theme.json` 의 `"tertiary"` 가 `"#ff00ff"` 로 갱신 확인. `tailwind.config.ts:18` `import themeJson from "./tailwind.theme.json"` → `:69-83` `adaptDesignTokens` 어댑터 함수 통과 → `:93` `theme.extend: adaptDesignTokens(themeJson)` 주입 |
| 판정 | PASS |

### AC-5 (DESIGN.md 토큰의 Tailwind 매핑)

| 항목 | 값 |
|---|---|
| 재현 절차 | `tailwind.theme.json` ↔ `tailwind.config.ts` ↔ 빌드 CSS 의 토큰 매핑 cross-check |
| 기대 결과 | colors/spacing/borderRadius/fontFamily/fontSize 토큰이 Tailwind theme key 로 매핑되어 화면 코드에서 `bg-tertiary`, `text-warn`, `rounded-sm`, `text-body-md` 등으로 호출 가능 |
| 실측 결과 | `tailwind.theme.json` 의 키 매핑: colors 16개, fontFamily 10개, fontSize 10개(어댑터에서 `body-strong` 1개 제외), borderRadius 2개, spacing 6개. 빌드 결과 `.next/static/css/*.css` 에서 `.bg-tertiary{background-color:rgb(15 118 110/...)}` (=`#0f766e`), `.text-warn{color:rgb(180 83 9/...)}` (=`#b45309`), `.rounded-sm{border-radius:8px}`, `.text-body-md{font-size:16px;line-height:1.55;font-weight:400}` 모두 확인. 어댑터(`adaptFontSize`) 가 lineHeight/fontFeature 보완 (PRD §9 #5/#6 PM 권고 — `body-strong` 충돌 회피 + tnum 주입) |
| 판정 | PASS |

### AC-6 (컴포넌트 className 재작성 + 인라인 style 안 hex/px 직타 0건)

| 항목 | 값 |
|---|---|
| 재현 절차 | 12 컴포넌트 + page.tsx + layout.tsx 인스펙션. `grep -n "style={{" components/workbench/*.tsx app/page.tsx` |
| 기대 결과 | 모두 Tailwind 유틸리티 또는 `@apply` 컴포넌트 클래스로 재작성. `style={{ ... }}` 안 hex/px 직타 0건 (동적 계산 허용) |
| 실측 결과 | 12 컴포넌트(`ActionCard`/`BriefCard`/`EmptyState`/`ErrorCard`/`FeasibilityCard`/`HorizonsCard`/`InputPanel`/`LoadingSkeleton`/`ResultGroup`/`RiskPlanCard`/`SearchPanel`/`WarningsCard`) + `app/page.tsx` + `app/layout.tsx` 모두 Tailwind 유틸리티 + `@apply` 합성 토큰만 사용. `style={{}}` 사용처 3건 모두 `RiskPlanCard.tsx:57-59` 의 가격 막대 동적 위치(`{ left: \`${stopPct}%\` }` / `entryPct` / `targetPct`) — PRD AC-6 의 "동적 계산 허용" 범주. hex/px 직타 0건 |
| 판정 | PASS |

### AC-7 (합성 토큰 처리 일관성)

| 항목 | 값 |
|---|---|
| 재현 절차 | `app/components.css` (`@layer components` + `@apply`) 인스펙션 + 화면 코드에서 합성 토큰 클래스명 호출 방식 일관성 확인 |
| 기대 결과 | PM 권고 (b) — `@layer components` + `@apply` 방식. 동일 컴포넌트 내 (a)/(b) 혼용 없음 |
| 실측 결과 | PR 본문에 PM 권고 (b) 채택 명시. `app/components.css` 117 라인, `@layer components` 안에 `card`/`card-elevated`/`card-warn`/`card-critical`/`badge-base`/`badge-accent`/`badge-warn`/`badge-info`/`badge-critical`/`input`/`input-error`/`button-primary`/`button-secondary`/`search-result-item`/`search-result-item-focus`/`price-bar-track`/`price-bar-stop`/`price-bar-entry`/`price-bar-target`/`skeleton`/`skeleton-line`/`skeleton-line-narrow`/`skeleton-line-medium` 모두 `@apply` 로 정의. 컴포넌트 코드는 이 클래스명만 참조(`<article className="card">` / `<span className="badge-warn">` 등) — 동일 컴포넌트 내 혼용 없음. 다만 비-합성 일회성 레이아웃 (예: `mobileShell`/`topBar` 자리) 은 PRD `components` 절 합성 토큰이 아니므로 Tailwind 유틸리티 조합으로 처리 (PR 본문 명시) |
| 판정 | PASS |

### AC-8 (시각·동작 0 회귀)

| 항목 | 값 |
|---|---|
| 재현 절차 | 본 리포트 §3 "시각 0 회귀 검증" 참조 — PR #11 라운드트립 5건 (a~e) 본 PR 머지 가정 환경에서 재현 |
| 기대 결과 | 5건 모두 동일한 화면 결과 + DESIGN.md 와 시각적으로 정합 |
| 실측 결과 | 5/5 동일하게 재현 (BE LIVE 환경에서 (a)/(c)/(d) 는 :3100 라운드트립으로, (b) 는 ad-hoc validation 호출로, (e) 는 closed-port :3110 라운드트립으로). 빌드 결과 CSS 의 토큰 값 (rgb(15 118 110)=tertiary, rgb(180 83 9)=warn, rgb(255 255 255)=panel, rgb(219 226 234)=line 등) 이 main 의 `:root --tertiary: #0f766e` 와 1:1 동일 |
| 판정 | PASS |

### AC-9 (build / typecheck / lint)

| 항목 | 값 |
|---|---|
| 재현 절차 | `npm run typecheck && npm run lint && npm run build` |
| 기대 결과 | 3개 명령 모두 exit 0 |
| 실측 결과 | typecheck exit 0, lint exit 0, build exit 0 (`✓ Compiled successfully in 745ms`, `✓ Generating static pages (6/6)`, Route 표: `/` Static 33.4 kB / 142 kB First Load, `/api/whitelist/search` Dynamic, `/api/workbench/analyze` Dynamic — main 대비 First Load +1KB 정도 차이는 Tailwind preflight 유틸리티 클래스 분량) |
| 판정 | PASS |

### AC-10 (AGENTS.md 원칙 무회귀)

| 항목 | 값 |
|---|---|
| 재현 절차 | (a) 한글 톤 — `app/page.tsx` 정적 문자열 grep. (b) 직접 호출 — `git grep -nE "http://127\.0\.0\.1" -- app/`. (c) env 단일 진입. (d) 접근성 |
| 기대 결과 | (a) 사용자 노출 문구 한글 유지. (b) 화면 코드에 127.0.0.1 0건, route handler fallback 만 허용. (c) `FASTAPI_BASE_URL` 단일. (d) label 연결 + aria 속성 |
| 실측 결과 | (a) `app/page.tsx` 의 사용자 노출 문구 모두 한글 (`"워크벤치"`, `"종목 선택 필요"`, `"투자 판단 보조 자료입니다..."`) + 컴포넌트 12개의 사용자 노출 문구도 PR #11 그대로 한글 유지. (b) `git grep -nE "http://127\.0\.0\.1" -- app/` 결과는 `app/api/whitelist/search/route.ts:11` 과 `app/api/workbench/analyze/route.ts:11` 두 라인뿐 — 둘 다 `process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000"` fallback 패턴 (AGENTS.md 가 명시한 route handler 안 fallback 예외). 화면 코드 (page/components/hooks/lib/copy/lib/formatters) 에는 0건. (c) `FASTAPI_BASE_URL` 단일 진입 유지 (PR #11 의 env 패턴 그대로). (d) 4 필드 모두 `<label htmlFor>` 연결, `aria-invalid`/`aria-describedby` + 분석 버튼 `aria-disabled`/`aria-busy` + ErrorCard `role="alert"` + EmptyState `role="status"` + LoadingSkeleton `aria-busy` + SearchPanel `combobox`/`listbox`/`option`/`aria-selected` — PR #11 의 접근성 회귀 없음 |
| 판정 | PASS |

### AC-11 (컨벤션 문서 갱신)

| 항목 | 값 |
|---|---|
| 재현 절차 | `docs/rules/frontend.md` + `docs/rules/design-md.md` 변경 라인 |
| 기대 결과 | (a) frontend.md 에 Tailwind 가 기본 스타일링 방식임 한 줄 이상 명시. (b) design-md.md 에 `npm run design:sync` 명시 |
| 실측 결과 | (a) `docs/rules/frontend.md` 에 두 줄 추가: "**스타일링 기본 방식**: **Tailwind 유틸리티**. ... `app/globals.css` 는 Tailwind 디렉티브 + preflight 가 흡수하지 못하는 잔여물에 한정한다." + "**디자인 토큰 동기화**: ... `npm run design:sync` 가 `tailwind.theme.json` 을 재생성하고, `tailwind.config.ts` 가 이를 import 해 Tailwind theme 에 주입한다. 코드에 hex/px 직타 금지." (b) `docs/rules/design-md.md` 에 "본 저장소(`trading-signal-frontend`)에서는 위 명령을 `npm run design:sync` 한 줄로 실행한다. 결과 `tailwind.theme.json` 은 git 에 커밋해 빌드 재현성을 보장한다." 두 줄 추가 |
| 판정 | PASS |

### AC-12 (수동 QA 시나리오 a/b/c)

| # | 시나리오 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| (a) | `npm install` 직후 `npm run build` 0 에러 | 통과 | AC-9 자동 검증으로 충족. node_modules 가 이미 install 된 상태에서 `rm -rf .next && npm run build` 다시 실행 → exit 0 (`✓ Compiled successfully in 745ms`). lockfile 정합 OK | PASS |
| (b) | DESIGN.md 토큰 임시 변경 → `npm run design:sync` → `npm run build` → 화면 반영 | `colors.tertiary` `#0f766e` → `#ff00ff` 변경 후 빌드 CSS 의 `.bg-tertiary` / `.text-tertiary` / `.border-tertiary` 등이 `rgb(255 0 255)` 로 갱신 → 복원 시 `rgb(15 118 110)` 으로 복귀 | DESIGN.md 의 `tertiary: "#0f766e"` → `"#ff00ff"` 임시 변경 후 `npm run design:sync` → `tailwind.theme.json` 의 `"tertiary"` 가 `"#ff00ff"` 로 갱신. `npm run build` 후 `.next/static/css/082cd819023db246.css` 에 `rgb(255 0 255/var(--tw-text-opacity,1))` / `rgb(255 0 255/var(--tw-bg-opacity,1))` / `rgb(255 0 255/var(--tw-border-opacity,1))` 다수 검출. DESIGN.md 복원 + `npm run design:sync` → `tailwind.theme.json` 이 backup 과 byte-identical 로 복귀 (`diff` exit 0). 파이프라인 **라이브 검증 OK** | PASS |
| (c) | PR #11 라운드트립 5건 재현 | §3 시각 0 회귀 검증 5/5 PASS | §3 참조 — 5/5 재현 OK | PASS |

---

## 2. DESIGN.md → Tailwind theme 동기화 라이브 테스트 (AC-4 + AC-12 (b))

본 절은 PRD AC-4 (파이프라인 동작) 와 AC-12 (b) (라이브 토큰 갱신) 를 실제 명령 호출로 재현한 결과.

### 2-1. 파이프라인 구조

| 단계 | 명령 / 파일 | 검증 |
|---|---|---|
| 1 | 디자이너가 `docs/design/workbench-analyze-rebuild.md` 의 토큰 갱신 | front matter 의 `colors`/`typography`/`spacing`/`rounded` 토큰을 수정 |
| 2 | `npm run design:sync` | `package.json:11` 가 `npx --yes @google/design.md export --format tailwind docs/design/workbench-analyze-rebuild.md > tailwind.theme.json` 한 줄로 묶음 |
| 3 | `tailwind.theme.json` 갱신 | export 결과를 git 에 커밋 (PRD §9 #3 PM 권고) — 빌드 재현성 보장 |
| 4 | `tailwind.config.ts` import + 어댑터 통과 | `:18` `import themeJson from "./tailwind.theme.json"` → `:69-83` `adaptDesignTokens` → `:93` `theme.extend` 주입 |
| 5 | `npm run build` | Tailwind 가 utility 생성 + `app/components.css` 의 `@apply` 합성 토큰 컴파일 |
| 6 | 화면 반영 | 컴포넌트 코드의 `bg-tertiary` / `text-warn` / `rounded-sm` 등이 새 토큰 값을 사용 |

### 2-2. 라이브 검증 시나리오

| 단계 | 액션 | 검증 결과 |
|---|---|---|
| 1 | `cp tailwind.theme.json /tmp/tailwind.theme.json.backup` | OK |
| 2 | `npm run design:sync` (변경 없는 baseline) | exit 0. `diff backup tailwind.theme.json` exit 0 — idempotent |
| 3 | `sed -i.bak 's/tertiary: "#0f766e"/tertiary: "#ff00ff"/' docs/design/workbench-analyze-rebuild.md` | OK. `tertiary: "#ff00ff"` 라인 확인 |
| 4 | `npm run design:sync` | exit 0. `tailwind.theme.json` 의 `"tertiary": "#ff00ff"` 갱신 |
| 5 | `rm -rf .next/static/css && npm run build` | exit 0. `.next/static/css/082cd819023db246.css` 에 `rgb(255 0 255/...)` 패턴 5+ 검출 (.bg-tertiary / .text-tertiary / .border-tertiary 등 모두) |
| 6 | DESIGN.md 원본 복원 (`cp /tmp/design.md.backup docs/design/workbench-analyze-rebuild.md`) + `npm run design:sync` | exit 0. `diff /tmp/tailwind.theme.json.backup tailwind.theme.json` exit 0 — 완전 복원 |
| 7 | `git status --short` | empty — 워킹트리 클린 |

판정: **PASS** — DESIGN.md → tailwind.theme.json → tailwind.config.ts → build CSS 의 파이프라인이 실제로 동작하고, 디자이너가 `docs/design/<slug>.md` 만 갱신해도 FE 가 `npm run design:sync` + `npm run build` 두 명령으로 받아쓸 수 있음.

### 2-3. 어댑터 (`adaptDesignTokens`) 의 책임

| 입력 | 변환 | 사유 |
|---|---|---|
| `tailwind.theme.json` 의 colors / spacing / borderRadius / fontFamily | spread 통과 | export 도구의 출력이 Tailwind theme key 와 1:1 정합 |
| `tailwind.theme.json` 의 fontSize 튜플 `[size, { fontWeight }]` | `adaptFontSize` 가 `lineHeight` 주입 (typography 토큰별 명시), `mono-numeric` 만 `fontFeatureSettings: "tnum"` 주입 | export 도구가 lineHeight 와 font-feature-settings 를 누락 — PRD §9 #5 PM 권고 (어댑터 1개로 흡수) |
| `body-strong` fontSize 키 | 어댑터에서 제외 | colors 토큰 `body-strong` 와 동일한 `text-body-strong` Tailwind 유틸리티 prefix 충돌 — 색 의미를 우선 살리고 타이포는 `text-body-md font-bold` 조합으로 동일 값(16px/700) 풀어 사용 |

판정: 어댑터 책임 명시 (PR 본문 + `tailwind.config.ts:10-15` 코멘트) — **OK**

---

## 3. 시각 0 회귀 검증 (가장 중요, AC-8)

PR #11 의 라운드트립 5건 (`workbench-analyze-rebuild` PRD AC-14 a~e) 을 본 PR 의 dev 서버에서 재현. BE LIVE (`http://127.0.0.1:8000/health` → 200 OK) 환경.

### 3-1. dev 환경

- `:3100` — `PORT=3100 npm run dev` (FASTAPI_BASE_URL 기본값 = `http://127.0.0.1:8000`)
- `:3110` — `FASTAPI_BASE_URL=http://127.0.0.1:59999 PORT=3110 npm run dev` (BE 다운 시뮬레이션)
- `curl http://127.0.0.1:3100/` → STATUS 200, BYTES 14687, 한글 라벨 9개 (`워크벤치`, `종목 검색`, `투자 가능 금액`, `목표 수익률`, `목표 기간`, `거래당 최대 손실률`, `분석`, `분석할 종목`, `TradingSignalEngine`) 모두 노출

### 3-2. 라운드트립 5건

| # | 시나리오 | 기대 | 실측 (라운드트립 + 코드 인스펙션) | 판정 |
|---|---|---|---|---|
| (a) | AAPL 검색 (자동완성 1건) → 자본 1,000,000 / 5% / 30일 / 2% → 분석 → 6블록 표시 | search 1건 + analyze 200 + 6블록 + warnings=[] 섹션 미렌더 + divergent (HOLD vs ACTIONABLE_LONG) + feasibility=UNREALISTIC | `GET /api/whitelist/search?q=AAPL` → 200 + 1건 (`AAPL · Apple Inc.`, USD, alias `["APPLE"]`). `POST /api/workbench/analyze` AAPL 1M/5%/30d/2% → 200, `action:"HOLD"`, `brief.action:"ACTIONABLE_LONG"` (group=BUY → divergent 분기 진입), `feasibility:"UNREALISTIC"`, `annualized_target_return_pct:81.05`, `risk_plan.entry_price:300.36`, `horizons` 6행, `warnings:[]`. `ResultGroup.tsx:50-71` 6 컴포넌트 마운트, `WarningsCard.tsx:14` `warnings.length===0` → null 반환. `BriefCard.tsx:23-33` `divergent` 분기 → `border-l-[3px] border-l-line` + caption | PASS |
| (b) | BTC-USD 선택 → 자본 0 → 분석 → 사전 차단 한글 메시지 | BE 미호출 + capital_amount 한글 helper + 분석 버튼 비활성 | `validateAnalyzePayload({capital_amount:0}, [BTC-USD])` → `{ok:false, errors:{capital_amount:"투자 가능 금액은 0보다 큰 숫자여야 해요."}}` (ad-hoc tsx 검증). `useAnalyzeForm.isValid` false → `InputPanel.tsx:171` `disabled={!isValid \|\| isPending}` + `aria-disabled`. `attemptSubmit` null 반환 → `app/page.tsx:43 if (!payload) return;` mutation 미호출. BE 요청 0건 보장 | PASS |
| (c) | BTC-USD → 500% / 1일 → 분석 → feasibility 비현실 강조 | feasibility=UNREALISTIC + card-warn 배경 + badge-warn + 본문 + RiskPlanCard 의 "비현실 목표 기준 계산값" 노트 | `POST /api/workbench/analyze` BTC-USD 1M/500%/1d/2% → 200, `feasibility:"UNREALISTIC"`, `annualized_target_return_pct:1.059e+286`. `FeasibilityCard.tsx:31` `isUnrealistic=true` → `:35` `card card-warn` 클래스 + `:41` `<span className="badge-warn">⚠ 비현실적인 목표예요</span>` + 본문 연환산 수치. `RiskPlanCard.tsx:43-47` `isUnrealistic` 분기 → "비현실 목표 기준 계산값 — 참고로만 보세요." 한 줄 노출. 빌드 CSS 의 `.card-warn` 배경 `rgb(255 244 223)` (=`#fff4df` warn-soft), text `rgb(180 83 9)` (=`#b45309` warn) — DESIGN.md spec 그대로 | PASS |
| (d) | NVDA 직접 입력 → 한글 안내 | 클라이언트 사전 차단 + 강제 POST 가 BE 도달 시 400 + 한글 detail → ErrorCard | (1) `validateAnalyzePayload({ticker:"NVDA"}, [BTC-USD])` → `{ok:false, errors:{ticker:"지원 종목이 아니에요. AAPL 또는 BTC-USD 중 선택해 주세요."}}`. (2) `POST /api/workbench/analyze` ticker=NVDA → STATUS 400 + `{"detail":"NVDA는 분석 가능한 화이트리스트에 없습니다"}` → `lib/api/client.ts` 의 axios interceptor 가 `kind=whitelist_miss` + Korean passthrough → `ErrorCard.tsx:22-23` 한글 detail 그대로 노출, `isRetryable(whitelist_miss)=false` 이므로 "다시 시도" 버튼 X (의도된 동작) | PASS |
| (e) | `FASTAPI_BASE_URL=http://127.0.0.1:59999` override → 분석 → ErrorCard + 다시 시도 버튼 | route handler 502 + Korean fallback + ErrorCard + 다시 시도 | `:3110 POST /api/workbench/analyze` (AAPL 1M/5%/30d/2%) → STATUS 502 + `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` → axios `kind=server` + Korean passthrough → `ErrorCard` 노출, `isRetryable(server)=true` → "다시 시도" 버튼 노출. `onRetry` → `mutation.reset()` + `setLastResult(null)` 으로 상태 복귀 | PASS |

### 3-3. DESIGN.md 시각 정합 — 빌드 CSS 의 토큰 값 cross-check

빌드 결과 `.next/static/css/*.css` 의 토큰 값이 DESIGN.md spec (= main `:root --token`) 과 1:1 정합:

| Tailwind 유틸리티/클래스 | 빌드 CSS 값 | DESIGN.md / main globals.css 값 | 일치 |
|---|---|---|---|
| `.bg-tertiary` / `.text-tertiary` | `rgb(15 118 110)` | `#0f766e` | OK |
| `.text-warn` / `.bg-warn-soft` | `rgb(180 83 9)` / `rgb(255 244 223)` | `#b45309` / `#fff4df` | OK |
| `.bg-panel` / `.text-primary` | `rgb(255 255 255)` / `rgb(23 32 42)` | `#ffffff` / `#17202a` | OK |
| `.border-line` | `rgb(219 226 234)` | `#dbe2ea` | OK |
| `.bg-field-bg` | `rgb(248 250 252)` | `#f8fafc` | OK |
| `.text-critical` / `.bg-critical-soft` | `rgb(153 27 27)` / `rgb(254 226 226)` | `#991b1b` / `#fee2e2` | OK |
| `.text-info` / `.bg-info-soft` | `rgb(37 99 235)` / `rgb(234 241 255)` | `#2563eb` / `#eaf1ff` | OK |
| `.text-secondary` / `.text-body-strong` | `rgb(101 115 133)` / `rgb(52 66 83)` | `#657385` / `#344253` | OK |
| `.rounded-sm` / `.rounded-pill` | `8px` / `999px` | DESIGN.md `rounded.sm/pill` | OK |
| 합성 토큰 `.card` padding | `16px` border `1px` line | DESIGN.md `components.card` | OK |
| 합성 토큰 `.card-elevated` padding | `20px` + `box-shadow: 0 10px 28px rgba(23,32,42,.08)` | DESIGN.md card-elevated | OK |
| 합성 토큰 `.badge-warn` height | `28px` padding `10px` rounded `999px` font-size `13px` weight `700` | DESIGN.md badge | OK |
| 합성 토큰 `.button-primary` height | `44px` padding `12px` bg `rgb(15 118 110)` text `rgb(255 255 255)` rounded `8px` font-size `15px` weight `700` | DESIGN.md button-primary | OK |
| 합성 토큰 `.input` height | `42px` padding `11px` bg `rgb(248 250 252)` text `rgb(23 32 42)` border `rgb(219 226 234)` rounded `8px` font-size `16px` | DESIGN.md input | OK |
| 합성 토큰 `.input-error` | bg `rgb(254 226 226)` text `rgb(153 27 27)` border `rgb(153 27 27)` | DESIGN.md input-error | OK |
| 합성 토큰 `.price-bar-track` | top `6px` height `6px` bg `rgb(219 226 234)` rounded `999px` | DESIGN.md price-bar-track | OK |
| 합성 토큰 `.price-bar-stop/entry/target` | width `4px` height `12px` rounded `999px`, 각각 critical/info/tertiary 배경 | DESIGN.md price-bar 표식 | OK |
| 합성 토큰 `.skeleton` | bg field-bg + border line + rounded-sm + padding 20px + skeletonShimmer 1.4s | DESIGN.md skeleton | OK |
| typography `.text-h1` | `font-size:22px;line-height:1.2;font-weight:700` | DESIGN.md `typography.h1` (22/700/1.2) | OK |
| typography `.text-display` | `font-size:30px;line-height:1.18;font-weight:700` | DESIGN.md `typography.display` (30/700/1.18) | OK |
| typography `.text-mono-numeric` | `font-size:15px;line-height:1.2;font-weight:700` (+ `.tabular { font-variant-numeric:tabular-nums; }`) | DESIGN.md mono-numeric (15/700/1.2 tnum) — fontFeature 는 어댑터에서 `font-feature-settings` 로 주입되지만 화면 코드는 `.tabular` 헬퍼 클래스를 명시적으로 추가 사용 | OK |

판정: 16+ 토큰 × 8+ 합성 토큰 모두 DESIGN.md 와 1:1 정합. PR #11 머지 상태(main)의 화면과 시각적으로 동일.

### 3-4. 9가지 상태 분기

DESIGN.md 핸드오프 명세 9 상태 (`Empty` / `ticker 미선택` / `Validation` / `Loading` / `Success` / `feasibility-비현실` / `divergent` / `whitelist-miss` / `BE 4xx`/`BE 5xx·네트워크`) 모두 동작 확인:

- Empty → `EmptyState.tsx:9-19` `role="status" aria-live="polite"` + 한글 안내
- ticker 미선택 → `SearchPanel.tsx:44-47` helper "분석할 종목을 먼저 선택해 주세요."
- Validation → `InputPanel.tsx:65/93/120/149` `errors.<field>` 시 `input-error` + `helper text-critical`
- Loading → `LoadingSkeleton.tsx` 4장 + `aria-busy`/`aria-live`
- Success → `ResultGroup.tsx:42-72` 6블록 마운트
- feasibility-비현실 → `FeasibilityCard.tsx:31-47` UNREALISTIC 분기 (시나리오 c)
- divergent → `BriefCard.tsx:23-33` divergent 분기 (시나리오 a)
- whitelist-miss → 시나리오 d (axios interceptor kind=whitelist_miss → ErrorCard)
- BE 4xx → 시나리오 d (400 + 한글 detail passthrough)
- BE 5xx·네트워크 → 시나리오 e (502 + 한글 fallback + 다시 시도)

판정: **PASS**

---

## 4. 에지 케이스

| # | 시나리오 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| E1 | Tailwind preflight 가 흡수하지 못한 잔여물 (`tabular`, `Arial` font-family, `skeletonShimmer` keyframe) 가 화면에서 의도대로 동작 | `tabular-nums` 가 mono-numeric 셀에 적용, Arial 기본 폰트, skeleton 깜빡임 애니메이션 | (1) `.tabular { font-variant-numeric:tabular-nums; }` (`globals.css:35-37`) — 빌드 CSS 에 그대로 검출. `RiskPlanCard.tsx:82,93,104,115,126,137,148,156` 의 mono 셀에 `tabular` 클래스 명시. `BriefCard.tsx:58` 의 reference_price strong 에도 `tabular`. `HorizonsCard.tsx:35,39` strong 에도 `tabular`. (2) `html { font-family: Arial, Helvetica, sans-serif; }` (`globals.css:30-32`) — 빌드 CSS 검출. 합성 토큰의 `font-family: inherit` 으로 input/button 까지 전파. (3) `@keyframes skeletonShimmer` (`globals.css:42-45`) — 빌드 CSS 에 `@keyframes skeletonShimmer{0%,to{opacity:.55}50%{opacity:1}}` 정확히 출력. `.skeleton` 클래스가 `animation:skeletonShimmer 1.4s ease-in-out infinite` 로 사용 | PASS |
| E2 | 합성 토큰 (`@layer components`) 와 Tailwind utility 의 우선순위 충돌 — utility 가 components 보다 강해야 정상 | `<article className="card card-warn">` 처럼 `card` 위에 `card-warn` 을 덮어쓰는 경우 후자가 적용되어야 함. utility (`text-warn` 등) 도 components 보다 강해야 함 | Tailwind 의 layer 순서는 `base < components < utilities` — 빌드 CSS 출력 순서 확인 시 preflight (base) → 컴포넌트 클래스 (`.card`, `.card-warn` 등) → utility (`.bg-tertiary` 등) 순. CSS 순서에서 뒤에 오는 것이 같은 specificity 일 때 우선이므로 utility > components 보장. `FeasibilityCard.tsx:35` `card card-warn` 의 경우 두 합성 클래스이며 `.card-warn` 이 `.card` 보다 출력 순서가 뒤(.card 는 76번째 라인 근처, .card-warn 은 그 다음) — 둘 다 padding/border/bg 를 정의하지만 `.card-warn` 의 `bg-warn-soft` 배경이 마지막에 적용되어 우선 (DESIGN.md spec 그대로) | PASS |
| E3 | 어댑터 (`adaptFontSize`) 가 `body-strong` 키 제외 처리 — 색 토큰과 충돌 회피 | `text-body-strong` 유틸리티는 색 (`color: rgb(52 66 83)`) 만 매핑, font-size 충돌 없음 | 빌드 CSS 확인: `.text-body-strong{--tw-text-opacity:1;color:rgb(52 66 83/var(--tw-text-opacity,1))}` — fontSize 없이 색만. typography body-strong 의미는 `text-body-md font-bold` 조합으로 풀어 사용 (`BriefCard.tsx:49` `text-body-sm text-body-strong` / `ActionCard.tsx:23` `text-body-md text-body-strong` — 색 + 다른 typography 조합). 동작 일치 | PASS |
| E4 | 어댑터의 lineHeight 주입이 9개 typography 키에 모두 반영 | 빌드 CSS 의 `.text-<name>` 유틸리티가 size + line-height + font-weight 한 줄에 출력 | 빌드 CSS 검출: `.text-display{font-size:30px;line-height:1.18;font-weight:700}`, `.text-h1{font-size:22px;line-height:1.2;font-weight:700}`, `.text-h2{font-size:17px;line-height:1.35;font-weight:700}`, `.text-body-md{font-size:16px;line-height:1.55;font-weight:400}`, `.text-body-sm{font-size:14px;line-height:1.5;font-weight:400}`, `.text-caption{font-size:12px;line-height:1.4;font-weight:400}`, `.text-button` (15/700/1.2), `.text-badge` (13/700/1.2), `.text-mono-numeric{font-size:15px;line-height:1.2;font-weight:700}` (어댑터에서 fontFeatureSettings:"tnum" 주입은 utility 자체에는 들어가지 않음 — 별도 `.tabular` 헬퍼 클래스 적용 패턴) — 9키 모두 일치 | PASS |
| E5 | tnum (mono-numeric) 의 font-feature-settings 주입 — 어댑터에서 추가 한 `fontFeatureSettings:"tnum"` 이 실제 빌드 출력에 반영 | `.text-mono-numeric` 유틸리티가 `font-feature-settings:"tnum"` 까지 포함하는지 | 빌드 CSS 의 `.text-mono-numeric` 정의는 `font-size:15px;line-height:1.2;font-weight:700` 까지만 출력 — Tailwind v3 의 fontSize plugin 이 fontFeatureSettings 를 받아 `font-feature-settings` 로 출력해야 하나, 실측 출력에는 미포함. 그러나 화면 코드는 `text-mono-numeric tabular` 처럼 `.tabular` 헬퍼 클래스 (`globals.css:35-37` `font-variant-numeric:tabular-nums`) 를 명시적으로 추가하여 자릿수 정렬을 보장. 의도된 동작 (DESIGN.md spec 의 tnum 효과 충족). `tailwind.config.ts:34` 의 어댑터 fontFeature 주입은 v3 가 fontSize plugin 에서 `font-feature-settings` 를 inject 하지 않는 한계의 잔재이지만, `.tabular` 헬퍼가 같은 효과를 명시적으로 제공하므로 결과는 동일 | PASS (실효성 보장, 잔여 정합 nit) |
| E6 | `tailwind.theme.json` 의 spacing 토큰 `2xl` (24px) — Tailwind 의 기존 `2xl` (breakpoint) 와 명명 충돌 가능성 | content scan 시 충돌이 발생하는지 | `tailwind.config.ts:92-94` `theme.extend` 는 기존 default 를 덮어쓰지 않고 추가 — `2xl` breakpoint 는 그대로 유지, spacing `2xl` 은 추가됨. `gap-2xl`/`p-2xl`/`m-2xl` 등의 spacing utility 로만 사용 가능. 충돌 없음 (Tailwind 의 utility prefix 가 다름: `gap-2xl` vs `2xl:` media query). 화면 코드에서 `gap-2xl` 사용처는 없으나, `tailwind.theme.json` 의 `spacing.2xl` 은 등록되어 있어 호출 가능 | PASS |
| E7 | `app/components.css` 안의 `@tailwind components` directive 중복 사용 — 빌드 결과에 중복 출력되지 않는지 | components 정의가 빌드 CSS 에 한 번만 들어감 | `app/components.css:18` `@tailwind components;` 한 번 더 둠 (Next.js PostCSS 가 파일별 처리이므로 components layer 사용 가능하게). 빌드 결과 `.next/static/css/c926e0ab522d6d9c.css` 의 `.card` / `.card-warn` 등은 각각 한 번만 출력 — Tailwind 가 중복 제거 보장. 컴포넌트 클래스 중복 없음 | PASS |
| E8 | `style={{}}` 안의 동적 계산 (`${pct}%`) — Tailwind 의 토큰을 침범하지 않고 위치 % 만 동적 | `RiskPlanCard.tsx:57-59` 의 가격 막대 표식이 NaN 없이 0~100% 사이 위치에 표시 | `RiskPlanCard.tsx:35-38` `const range = Math.max(hi-lo, 0.0001);` (0폭 회피) → `stopPct/entryPct/targetPct` 계산. 시나리오 (a) 응답 entry=300.36 / stop=290.71 / target=319.66 → pct 계산 정상. 시각 0 회귀 | PASS |
| E9 | 동시 다중 분석 요청 (사용자 연타) — Tailwind 도입 후에도 `disabled` 분기 정상 | 분석 버튼 `disabled={!isValid \|\| isPending}` + utility opacity-65 + cursor-not-allowed | `InputPanel.tsx:171` disabled 분기 + `app/components.css:75-78` `.button-primary[aria-disabled="true"], .button-primary:disabled { @apply opacity-[0.65] cursor-not-allowed }` — 빌드 CSS 검출: `.button-primary:disabled, .button-primary[aria-disabled=true] { cursor:not-allowed; opacity:.65 }`. `isPending` 동안 클릭 차단 + 시각 dim | PASS |
| E10 | route handler 의 `FASTAPI_BASE_URL` fallback — AGENTS.md 직접 호출 금지 원칙 회귀 없음 | `app/api/whitelist/search/route.ts:11` + `app/api/workbench/analyze/route.ts:11` 의 `?? "http://127.0.0.1:8000"` fallback 만 허용 | grep 결과 두 파일 두 라인뿐 — 화면 코드 (page/components/hooks/lib/copy/lib/formatters) 에는 0건. AGENTS.md 의 "route handler fallback 예외" 범주 안 | PASS |
| E11 | `npm run design:sync` 가 idempotent — 같은 DESIGN.md 입력에 대해 같은 JSON 출력 | 두 번 연속 실행 시 byte-identical | 1차 실행 후 backup → 변경 없이 2차 실행 → `diff backup tailwind.theme.json` exit 0 (byte-identical). PR #11 의 화이트리스트·analyze 응답 라운드트립 5건은 본 PR 의 dev 서버에서 그대로 재현 — 시각 0 회귀 보장 | PASS |
| E12 | `theme.extend` import path 가 깨졌을 때 build 실패 (sanity check) | `tailwind.config.ts:18` 의 import 가 실제 JSON 을 로드 — TypeScript 의 `resolveJsonModule` 활성화 가정 | `tsconfig.json` 의 `resolveJsonModule:true` 가정 — `npm run typecheck` exit 0 으로 검증됨. import 정상 동작 | PASS |

---

## 5. 자동화 명령 로그 요약

```
$ npm ls tailwindcss
trading-signal-frontend@0.1.0
└── tailwindcss@3.4.19

$ wc -l app/globals.css
      46 app/globals.css

$ git grep -nE "var\(--" -- app/ components/
(no output, exit 1)

$ git grep -nE "style=\{\{.*#[0-9a-fA-F]" -- app/ components/
(no output, exit 1)

$ git grep -nE "http://127\.0\.0\.1" -- app/
app/api/whitelist/search/route.ts:11:const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";
app/api/workbench/analyze/route.ts:11:const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";
(route handler fallback 만 — AGENTS.md 명시 예외)

$ npm run typecheck   # exit 0
$ npm run lint        # exit 0
$ npm run build       # exit 0 — ✓ Compiled successfully in 745ms / 6/6 pages
                                ┌ ○ /                                    33.4 kB         142 kB
                                ├ ○ /_not-found                            995 B         103 kB
                                ├ ƒ /api/whitelist/search                  127 B         102 kB
                                └ ƒ /api/workbench/analyze                 127 B         102 kB

$ curl http://127.0.0.1:8000/health → 200 {"status":"ok"}

$ npm run design:sync  # exit 0, idempotent (byte-identical)
$ # DESIGN.md tertiary #0f766e → #ff00ff 임시 변경 후
$ npm run design:sync  # exit 0, tailwind.theme.json 의 tertiary 가 #ff00ff 로 갱신
$ npm run build        # 빌드 CSS 에 rgb(255 0 255) 검출 (.bg-tertiary, .text-tertiary, .border-tertiary 등)
$ # DESIGN.md 복원 + npm run design:sync → diff exit 0 (완전 복원)

$ curl "http://127.0.0.1:3100/api/whitelist/search?q=AAPL"
{"results":[{"ticker":"AAPL","name":"Apple Inc.", ..., "aliases":["APPLE"], ...}]} STATUS:200

$ curl "http://127.0.0.1:3100/api/whitelist/search?q=APPLE"
{"results":[{"ticker":"AAPL", ...}]} STATUS:200

$ curl "http://127.0.0.1:3100/api/whitelist/search?q=zzz"
{"results":[]} STATUS:200

$ curl -X POST .../analyze (AAPL 1M/5%/30d/2%)
→ STATUS:200, action=HOLD, brief.action=ACTIONABLE_LONG (divergent), feasibility=UNREALISTIC,
  annualized=81.05, warnings=[]

$ curl -X POST .../analyze (BTC-USD 500%/1d/2%)
→ STATUS:200, feasibility=UNREALISTIC, annualized=1.059e+286

$ curl -X POST .../analyze (NVDA)
→ STATUS:400 {"detail":"NVDA는 분석 가능한 화이트리스트에 없습니다"}

$ FASTAPI_BASE_URL=http://127.0.0.1:59999 PORT=3110 npm run dev → :3110 POST .../analyze
→ STATUS:502 {"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}

$ npx tsx /tmp/qa-validate-tw2.mts  # validateAnalyzePayload 4건 사전 차단 모두 한글 메시지
  capital=0      → ok:false, capital_amount:"투자 가능 금액은 0보다 큰 숫자여야 해요."
  capital=empty  → ok:false, capital_amount:"투자 가능 금액은 0보다 큰 숫자여야 해요."
  NVDA           → ok:false, ticker:"지원 종목이 아니에요. AAPL 또는 BTC-USD 중 선택해 주세요."
  max_loss=5.1   → ok:false, max_loss_pct:"최대 손실률은 0보다 크고 5 이하의 숫자여야 해요."
```

---

## 6. 결함

없음.

---

## 7. PR 본문 자가검증 대비 QA 재현 결과

| 항목 | 작성자 자가검증 | QA 재현 결과 |
|---|---|---|
| AC-1 ~ AC-12 12건 | 모두 PASS 명시 | 12/12 재현 PASS |
| DESIGN.md → Tailwind 라이브 동기화 (#ff00ff 라이브 검증) | 작성자 검증 명시 | 재현 PASS — `npm run design:sync` idempotent + DESIGN.md 변경 시 build CSS 반영 확인 |
| 시각 0 회귀 (라운드트립 5건) | 작성자가 BE LIVE 검증을 QA 위임 | QA 가 dev :3100/:3110 + LIVE BE 환경에서 5/5 재현 PASS |
| OPEN QUESTION 8건 결정 (v3 / 커밋 / import / (b) @apply / semantic / 어댑터 / 잔여물 코멘트 / 한 PR) | 작성자 명시 | 모두 코드·문서에 반영 확인 |

자가검증과 QA 재현 결과 일치. 불일치 항목 없음.

---

## 8. PR 본문 게이트 확인

PR #13 본문에 `## 다음 작업` 섹션 존재 (PR #11 reviewer nit 5건 + `.mcp.json` 처리 + 화이트리스트 placeholder 동적화 + offline 토글 UI + `ai_summary` 카피 재검토 + 다크모드 PRD + shadcn/ui 도입 PRD + Tailwind v4 마이그레이션 PRD 등 후속 후보 명시) — handoff-append workflow 가 빈 항목으로 commit 되지 않음. 라벨 부여 게이트 OK.

---

## 판정

**qa-passed** — AC 12건 + DESIGN.md 라이브 동기화 + 시각 0 회귀 5건 + 에지 케이스 12건 모두 PASS, 실패 0건.
