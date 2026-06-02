# PRD — 다크모드 도입 (light/dark/system 3-state) (`dark-mode`)

> **slug**: `dark-mode`
> **작성**: PM 에이전트 · 2026-06-02
> **상태**: ready (OPEN QUESTION 3건 전건 RESOLVED — surface-elevated 토큰 추가 · themeColor 런타임 교체 · cross-tab PR1 포함, 2026-06-02 사용자 확정)
> **UI 포함 여부**: **yes** — 전 UI 표면이 light/dark 두 팔레트로 렌더된다. 신규 화면은 없으나 색 팔레트(다크 49값)·토글 UI(마이페이지 THEME 항목)·스플래시 다크 대응이 디자인 산출물에 포함된다.
> **UX/UI 디자이너 합류**: **yes (확정)** — PR2 의 다크 팔레트 49값(DESIGN.md `colors-dark:`)은 디자이너가 WCAG AA 4.5:1 을 보장하며 설계해야 한다. 토글 3-state 세그먼트·스플래시 다크 대응도 디자인 결정.
> **단일 PR 룰**: **5-PR 분할 확정** (인프라 → 팔레트 → 차트 → 메타/이미지 → 검증) — §8.2. 다크모드는 변경 표면이 넓어 예외 분할(선례: `feedback_single-pr-rule-exception` — finsight-redesign 9 PR · stock-api-integration 3 PR).

---

## 0. 한눈에

현재 앱은 **light 모드만** 구현돼 있다(`app/globals.css:26` `color-scheme: light` 고정, 주석에 "다크모드는 별도 PRD 비범위"로 명시). 본 PRD 는 사용자가 **기기 시스템 설정을 따라가거나(system, 기본값) light/dark 를 명시 선택**할 수 있는 3-state 다크모드를 도입한다. 핵심 품질 기준은 **전 UI 표면의 시인성 무누락**(WCAG AA 4.5:1) — 부분 누락 시 다크에서 텍스트가 안 보이거나 흰 박스가 튀는 문제를 원천 차단한다.

색 토큰이 이미 완전 semantic(49개, 직타 hex 거의 0)하고 합성 토큰(`app/components.css` `@apply` ~106개)이 모두 이 토큰만 참조하므로, **토큰을 CSS 변수로 전환하면 컴포넌트 240여 곳 수정 0**으로 자동 전환된다(§6). 색 진실원천은 `docs/design/finsight-redesign.md`(DESIGN.md) 하나를 유지하고, 다크 팔레트는 그 front matter 의 `colors-dark:` 병렬 블록에 둔다(과거 #86 토큰 SSOT 사고 회피).

---

## 1. 배경 / 문제

### 1.1 사용자 의도 (verbatim)

> "기기 값을 따라가도록 하거나 사용자가 선택해서 light/dark 모드로" + "(다크모드 작업 시) 하나씩 누락하거나 고려하지 않아서 텍스트 시인성이 안좋거나 안 보이는 문제가 생기더라."

### 1.2 현재 상태 (main)

- **light 고정**: `app/globals.css:24-26` 가 `:root { color-scheme: light }` 로 고정. 주석에 다크모드는 별도 PRD 비범위로 명시돼 있다(본 PRD 가 그 비범위를 해소).
- **토큰 구조(유리한 출발 조건)**: `docs/design/finsight-redesign.md`(DESIGN.md) → `npm run design:sync`(`tailwind.theme.json` 생성 → `scripts/inject-breakpoints.mjs` 후처리) → `tailwind.config.ts` `adaptDesignTokens()` 가 빌드타임에 hex 를 `theme.extend.colors` 에 **정적 주입**. 색 토큰은 완전 semantic 49개, 합성 토큰(`app/components.css` `@apply` ~106개)이 전부 이 토큰만 참조.
- **토글 스텁 존재**: `components/profile/SettingsMenuCard.tsx` 에 THEME 항목(`MENU_THEME` 라벨 + `Moon` 아이콘)이 이미 스텁으로 존재 — 동작만 비어 있다.
- **차트는 예외**: recharts 는 색 "문자열"을 prop 으로 받으므로 CSS 변수 자동 전환이 안 통한다. `components/profile/chart/chartTheme.ts` 가 빌드타임 hex 를 고정 소비 + rgba 직타(tooltip 등) 존재 → 런타임 테마 훅으로 별도 전환 필요(PR3).

### 1.3 문제

1. **다크 미지원** — 시스템이 다크인 사용자(특히 야간·모바일)에게 흰 화면이 눈부심. 금융 도구는 야간 사용 빈도가 높다.
2. **선택권 부재** — 시스템 따라가기/명시 선택 모두 불가.
3. **다크 도입의 본질적 리스크 = 시인성 누락** — 표면이 넓어(라우트 7 + 모달/드롭다운/토스트/스켈레톤/빈상태/에러/그림자/포커스링/반투명 navbar) 한 곳만 빠져도 텍스트가 안 보이거나 흰 박스가 튄다. 사용자가 명시적으로 경계한 지점.

### 1.4 컨텍스트 메모

- **토큰 SSOT 규율(필수)** — `reference_design-token-sync-ssot`: 토큰은 DESIGN.md 경유 필수, `tailwind.theme.json` 직접 편집 금지(design:sync 가 lossy 화 → 빌드 붕괴, #86 사고). 다크 팔레트도 DESIGN.md `colors-dark:` 에만 둔다.
- 한국식 색: 상승=빨강(signal-up) / 하락=파랑(signal-down). 다크에서 명도·채도 상향 필요(어두운 배경에서 진한 적·청은 가독성 저하).
- 반응형 1차 도구: Tailwind prefix + `useBreakpoint`(`window.innerWidth` 직접 검사 금지).
- PWA 스플래시: 브랜드 스플래시(`components/pwa/SplashScreen.tsx` + `app/splash-ios/route.tsx`) 존재(`project_pwa-splash-statusbar`). 흰 스플래시 → 어두운 앱 전환 시 눈부심.
- 상태 관리 관성: Zustand + localStorage(watchlist 선례). next-themes 미도입 — 프로젝트 관성 정합 위해 자체 구현.

---

## 2. 목표 · 비목표

### 2.1 목표 (측정 가능)

- **G1 (3-state 토글)** — 마이페이지(`SettingsMenuCard` THEME 항목)에서 light / dark / system 을 선택할 수 있다. 기본값은 **system**(기기 설정 따라가기). 선택은 localStorage 에 영속된다.
- **G2 (system 자동 반영)** — system 모드에서 기기 `prefers-color-scheme` 변경 시(OS 다크 토글) 앱이 새로고침 없이 즉시 따라간다.
- **G3 (전 표면 시인성 무누락 — 핵심)** — 전 라우트(home·market·stock·profile·watchlist·dashboard·analyze) + 전 표면 유형(모달/드롭다운/토스트/스켈레톤/빈상태/에러/그림자/포커스링/반투명 navbar·header)이 light/dark 모두에서 **WCAG AA 4.5:1 대비**를 만족한다. 차트 4종(캔들/MACD/RSI/거래량) 포함.
- **G4 (FOUC 방지)** — 첫 페인트 전 동기적으로 테마가 적용돼, 다크 사용자가 흰 화면 깜빡임(FOUC)을 보지 않는다.
- **G5 (자동 토큰 전환)** — 토큰 CSS 변수화로 기존 컴포넌트·합성 토큰 수정 0 으로 다크가 자동 전환된다(차트 제외). `dark:` variant 전면 적용 0건.
- **G6 (SSOT 유지)** — 다크 49값이 DESIGN.md `colors-dark:` 한 곳에만 존재하고 `design:sync` 로 흘러간다. 코드·`tailwind.theme.json` 에 다크 hex 직타 0건.
- **G7 (스플래시 다크 대응)** — in-app 스플래시가 다크 모드에 대응한다(흰 스플래시 → 어두운 앱 눈부심 방지). 파비콘·OG 공유카드는 light 고정 수용.
- **G8 (상태바 정합)** — 브라우저 상태바 색(`theme-color`)이 현재 테마와 일치한다(system 자동 + 명시 선택 반영 — §9 q2).
- **G9 (품질 게이트)** — `npm run typecheck`·`npm run lint`·`npm run build` 0 에러. `npm run design:sync` 가 49키 1:1 검증을 통과한다(누락/오타 시 throw).

### 2.2 비목표 (명시적 제외)

- **`dark:` variant 전면 적용** — 240곳 클래스 + 106 합성 토큰 이중화 + dark 색 컴포넌트 산재로 DESIGN.md SSOT 붕괴 → **기각**(아키텍처가 CSS 변수 indirection).
- **파비콘 / OG 공유카드 / manifest 아이콘 다크 분기** — light 고정 수용(사용자 확정). 공유 카드·OS 아이콘은 단일 버전.
- **테마별 폰트·간격·레이아웃 분기** — 색만 분기. 타이포·spacing·레이아웃은 단일.
- **next-themes 등 외부 라이브러리 도입** — 자체 Zustand+localStorage 구현(프로젝트 관성 정합).
- **사용자별 테마 서버 영속(DB)** — MVP 는 DB 미연동. localStorage 만(기기 단위). 계정 동기화는 Supabase 도입 후 후속.
- **자동(시간대 기반) 테마 전환** — system/명시 선택만. "일몰 후 자동 다크" 류는 비범위.
- **고대비(high-contrast) 모드 / 색맹 팔레트** — 별도 접근성 트랙(후속).

---

## 3. 범위 (In Scope) — 단계별

> 본 PRD 는 5-PR 로 분할(§8.2). 각 PR 은 독립 머지 가능하며, 인프라(PR1)는 다크 값 없이 light 무회귀로 먼저 머지될 수 있다.

### 3.1 PR1 — 토큰 CSS 변수화 + 토글 인프라 (dark=light, 시각 무변경)

- **`tailwind.config.ts`**: `adaptDesignTokens()` 의 `colors` 를 `var(--color-<key>)` 참조 맵으로 전환하는 헬퍼 + `darkMode: "class"`.
- **`scripts/inject-color-themes.mjs` 신설**(`inject-breakpoints.mjs` 패턴 복제): DESIGN.md 의 `colors`(light) + `colors-dark`(dark) 파싱 → **49키 1:1 일치 검증(누락/오타 시 throw — 시인성 누락 1차 자동 방어선)** → `app/theme-vars.css` 생성(`:root` light + `html.dark` dark, 편집금지 헤더 + design:sync 산출물 표시). `package.json` design:sync 에 체이닝.
- **`app/theme-vars.css` 생성**(이 시점 dark=light 동일값) + **`app/globals.css`** 에 `@import` + `html.dark { color-scheme: dark }`.
- **테마 상태(자체 구현)**:
  - `lib/store/theme/store.ts` — localStorage 격리 모듈(`STORAGE_KEY="finsight:theme"`, `hasWindow` 가드 — `lib/api/watchlist/store.ts` 패턴 복제).
  - `lib/store/themeStore.ts` — Zustand. state `theme: "light"|"dark"|"system"` + `resolvedTheme: "light"|"dark"`. `setTheme()` 가 localStorage write + `html` class 토글 + system 모드 시 `matchMedia("(prefers-color-scheme: dark)")` 구독.
  - `components/theme/ThemeProvider.tsx`("use client") — `app/providers.tsx` QueryClientProvider 안에 래핑. 마운트 시 하이드레이션 + matchMedia listener (+ 선택 cross-tab storage 이벤트 — §9 q3).
- **FOUC 방지**: `app/layout.tsx` `<head>` 에 raw 인라인 스크립트 — hydration 전 동기적으로 localStorage 읽어 `<html>.classList.toggle("dark")` + `style.colorScheme` 설정(`suppressHydrationWarning` 이미 존재).
- **토글 UI**: `SettingsMenuCard` THEME 항목 → `components/theme/ThemeMenuButton.tsx`(client, `LogoutMenuButton` 분리 선례) — light/dark/system 3-state 세그먼트.
- **PR1 게이트(검증 3종)**: ① `app/components.css` 의 `shadow-[...theme(colors.accent-soft)]` 가 빌드 후 `var(--color-accent-soft)` 인라인 정상 렌더 ② `bg-surface/80`·`bg-surface/85`(navbar/header-glass) 알파 수정자가 `var()` 색에서 `color-mix` 로 동작 ③ 49 토큰 전부 `var()` 치환·직타 hex 잔존 0.

### 3.2 PR2 — 다크 팔레트 49값 (DESIGN.md `colors-dark:`)

- 디자이너가 DESIGN.md front matter 에 `colors-dark:` 정의 → `design:sync` → `theme-vars.css` dark 반영. **이 시점 처음으로 다크가 시각 분기**(차트 제외 전 표면 자동 전환).
- **팔레트 원칙**(출발점 hex, 디자이너 미세조정):
  - 순수 검정 금지 — 베이스 `surface-muted #0e141b` 계열.
  - Elevation = 밝아짐 — `surface-muted` < `surface #161d26` < elevated.
  - text 순백 회피 — `text-strong #e6edf3`, WCAG AA 4.5:1 유지.
  - 한국식 등락색 명도·채도 상향 — `signal-up #c81e1e→#f47171`, `signal-down #1d4ed8→#5b9bff`.
  - soft 페어는 저명도 짙은 틴트.
- **PR2 게이트**: §검증 라우트 체크리스트(차트 제외) + 다크 페어 WCAG 4.5:1 대비 자동 검사.

### 3.3 PR3 — 차트 런타임 테마

- recharts 색 문자열 prop → CSS 변수 자동전환 불가. `components/profile/chart/chartTheme.ts`(빌드타임 hex 고정) 를 런타임 반응형으로 교체.
- **`hooks/utils/useChartTheme.ts` 신설**: `resolvedTheme` deps + `getComputedStyle(document.documentElement)` 로 `--color-*` 실제 계산값 런타임 read → 색 객체 재생성 → 테마 전환 시 recharts 리렌더. (두 팔레트 객체 하드코딩은 SSOT 위반 → 기각, CSS 변수 단일 출처 유지.)
- rgba 직타(`tooltipBg`, border, boxShadow, `CandleTooltip.tsx` 인라인)는 알파라 토큰화 불가 → 훅 안에서 `resolvedTheme` 분기.
- `StockDailyChart.tsx` `linearGradient id="sdcFill"` stopColor 도 훅 값 참조.
- 영향 전수: `grep "from.*chartTheme"` 소비처(`C`/`tooltipStyle`/`axisProps`) 전부 훅 전환. SSR/첫 렌더 light fallback → 마운트 후 swap(차트 client 전용이라 영향 미미).
- **PR3 게이트**: stock/market/dashboard/analyze 차트 4종 dark 시인성.

### 3.4 PR4 — 메타 / 이미지 (스플래시까지)

- **themeColor 동적**: `app/layout.tsx` `viewport.themeColor` 를 media query 배열로(`light #ffffff` / `dark #0e141b`) — system 커버. 명시 선택 반영은 ThemeProvider effect 에서 `<meta name="theme-color">` 런타임 교체(§9 q2).
- **in-app 스플래시 다크 대응**: `components/pwa/SplashScreen.tsx` + `app/splash-ios/route.tsx`(테마 파라미터/media query 분기).
- **light 고정 수용**: 파비콘(`app/icon.tsx`/`apple-icon.tsx`/`lib/brand-mark.tsx`), OG(`app/opengraph-image.tsx`), manifest `background_color`/`theme_color`.
- **PR4 게이트**: PWA 설치/상태바 light·dark 확인.

### 3.5 PR5 — 전 표면 검증 / 마감

- 직타 hex 전수조사: `grep -rnE "#[0-9a-fA-F]{3,6}|rgba\(" app components --include=*.tsx --include=*.css` → 차트 rgba·brand-mark 의도 예외 외 잔존 처리.
- (선택) 다크 페어 WCAG 대비 검사 스크립트 CI 편입.
- QA 라우트 체크리스트 클로즈(§검증).

---

## 4. 비범위 (Out of Scope)

> §2.2 비목표와 동일 — `dark:` variant 전면 적용 / 파비콘·OG·manifest 아이콘 다크 분기 / 테마별 레이아웃·폰트 분기 / next-themes 도입 / DB 영속 / 자동(시간대) 전환 / 고대비·색맹 팔레트. 모두 명시적 제외.

---

## 5. 수용 기준 (AC)

> 검증 명령은 저장소 루트에서 실행. PR 번호는 §8.2 분할에 대응(누적 머지이므로 최종 PR 시점에 전체 충족).

### AC-1 (G1·G5) 토큰 CSS 변수화 + darkMode class — PR1
- `git grep -n "darkMode" tailwind.config.ts` → `"class"` 존재.
- `git grep -n "var(--color-" tailwind.config.ts` → colors 맵이 `var()` 참조(직타 hex 아님).
- `ls app/theme-vars.css` 존재 + `git grep -n "html.dark" app/theme-vars.css` → dark 블록 존재.
- `git grep -rn "dark:" components app` → `dark:` variant **0건**(전면 적용 미사용 — G5 무위반).

### AC-2 (G6·SSOT) 다크 팔레트는 DESIGN.md 단일 출처 — PR1·PR2
- `git grep -n "colors-dark" docs/design/finsight-redesign.md` → `colors-dark:` 블록 존재.
- `ls scripts/inject-color-themes.mjs` 존재 + `git grep -n "design:sync" package.json` → `inject-color-themes.mjs` 체이닝 포함.
- `npm run design:sync` 실행 시 **49키 1:1 검증 통과**(키 누락/오타를 일부러 넣으면 throw — 1차 자동 방어선). `theme-vars.css` 가 design:sync 산출물 헤더 포함.
- `tailwind.theme.json` 에 다크 hex 직타 0(다크 값은 theme-vars.css 에만). DESIGN.md 외 코드에 다크 hex 직타 0.

### AC-3 (G1) 3-state 토글 UI + 영속 — PR1
- `git grep -rn "system\|light\|dark" lib/store/themeStore.ts` → 3-state + `resolvedTheme` 존재.
- `git grep -n "finsight:theme" lib/store/theme/store.ts` → STORAGE_KEY 존재(localStorage 영속).
- `ls components/theme/ThemeMenuButton.tsx components/theme/ThemeProvider.tsx` 존재. `SettingsMenuCard` THEME 항목 클릭 시 3-state 세그먼트 노출(시각 확인). 기본값 system.

### AC-4 (G2) system 자동 반영 — PR1
- `git grep -n "matchMedia\|prefers-color-scheme" lib/store/themeStore.ts components/theme` → matchMedia 구독 존재.
- (수동) system 모드에서 OS 다크 토글 시 앱이 새로고침 없이 즉시 전환(시각 확인, 양 뷰포트).

### AC-5 (G4) FOUC 방지 — PR1
- `git grep -n "classList.toggle\|colorScheme\|localStorage" app/layout.tsx` → head 인라인 스크립트 존재.
- (수동) 다크 선택 후 새로고침 시 흰 화면 깜빡임(FOUC) 없음(시각 확인).

### AC-6 (G3·핵심) 전 표면 시인성 무누락 — PR2·PR3·PR5
- (수동, light/dark/system × 모바일/데스크톱) §검증 라우트 체크리스트 전 항목이 흰 박스·안 보이는 텍스트 없이 렌더.
- (자동) 다크 페어 WCAG 4.5:1 대비 검사 통과(text↔surface 조합 49키 기반).
- `git grep -rnE "#[0-9a-fA-F]{3,6}|rgba\(" app components --include=*.tsx --include=*.css` → 차트 rgba·brand-mark 의도 예외 외 잔존 0(PR5 마감).

### AC-7 (G3) 차트 런타임 테마 — PR3
- `ls hooks/utils/useChartTheme.ts` 존재. `git grep -rln "useChartTheme" components/profile/chart components/workbench` → chartTheme 소비처 전수 전환(`git grep -rln "from.*chartTheme"` 잔존이 훅 경유로 정리).
- (수동) stock 차트 4종(캔들/MACD/RSI/거래량)·market 도넛·analyze workbench 차트가 다크에서 시인성·툴팁·gradient 정상(시각 확인).

### AC-8 (G7·G8) 메타/스플래시 — PR4
- `git grep -n "themeColor" app/layout.tsx` → media query 배열(light/dark) 존재.
- (수동) in-app 스플래시가 다크에서 어둡게 렌더(흰 눈부심 없음). PWA 설치 후 상태바 색이 현재 테마와 일치.
- 파비콘·OG·manifest 아이콘은 light 고정(다크 분기 미추가 — 비목표 무위반).

### AC-9 (G9) 품질 게이트
- `npm run typecheck` 0 / `npm run lint` 0 / `npm run build` 0(Turbopack). `npm run design:sync` 49키 검증 통과.

---

## 6. 가정 · 제약 / 구현 노트

### 6.1 핵심 아키텍처 — 토큰 CSS 변수 indirection

빌드타임 hex 정적 주입을 CSS 변수 indirection 으로 전환한다.

```
tailwind.theme.json  ("surface": "#ffffff")
  │  adaptDesignTokens()
  ├─ (A) theme.extend.colors  →  surface: "var(--color-surface)"   ← Tailwind utility 참조
  └─ (B) app/theme-vars.css (생성, design:sync 산출)
          :root      { --color-surface: #ffffff }   ← light
          html.dark  { --color-surface: #161d26 }   ← dark
```

`bg-surface`·`text-text-strong` 등 기존 클래스와 `.card`·`.badge-*` 합성 토큰은 **무수정**으로 `html.dark` 토글에 따라 자동 전환된다(컴포넌트 240여 곳·합성 토큰 106개 수정 0).

### 6.2 가정

- **선행 전제**: main 정합. 현행 토큰 구조(DESIGN.md → design:sync → tailwind.config `adaptDesignTokens`)와 합성 토큰(`app/components.css` `@apply`)이 본 PRD 작성 기준과 동일.
- **49키 가정**: 색 토큰 49개가 모두 semantic 이고 합성 토큰이 이 49키만 참조 → 자동 전환의 전제. 직타 hex 잔존(차트 rgba·brand-mark)은 PR3·PR5 에서 개별 처리.
- **차트 예외 가정**: recharts 는 색 문자열 prop → CSS 변수 자동 미적용. PR3 런타임 훅 필수. SSR 첫 렌더는 light fallback(차트 client 전용이라 영향 미미).
- **알파 수정자 가정**: `bg-surface/80` 류 Tailwind 알파 수정자가 `var()` 색에서 `color-mix` 로 동작(PR1 게이트 ②로 검증). 미동작 시 해당 합성 토큰만 명시 `color-mix` 또는 별도 알파 토큰으로 대응.
- **도구**: `npm run typecheck/lint/build`, `npm run design:sync`(`@google/design.md export` + inject 스크립트) 동작. Turbopack 일상 build.

### 6.3 제약

- **토큰 SSOT 규율(필수)**: 다크 49값은 DESIGN.md `colors-dark:` 한 곳에만. `tailwind.theme.json` 직접 편집 금지(#86 사고). 코드 다크 hex 직타 0.
- **반응형**: Tailwind prefix + `useBreakpoint`. `window.innerWidth` 직접 검사 금지.
- **한글 카피**: 토글 라벨("시스템 설정"/"라이트"/"다크" 등)은 `lib/copy/` 에 격리.
- **조회·분석 전용 스코프**: 무관(시각 변경만).

---

## 7. 참고

- 현행: `app/globals.css:24-26`(color-scheme 고정) · `tailwind.config.ts`(`adaptDesignTokens` :117 / `theme.extend` :146) · `docs/design/finsight-redesign.md`(DESIGN.md SSOT, `colors-dark:` 추가 지점) · `scripts/inject-breakpoints.mjs`(신규 `inject-color-themes.mjs` 복제 원본) · `package.json:14`(design:sync).
- 토글: `components/profile/SettingsMenuCard.tsx`(THEME 스텁 — `MENU_THEME`/`Moon` 존재) · `LogoutMenuButton`(client 분리 선례).
- 차트: `components/profile/chart/chartTheme.ts`(빌드타임 hex 소비) · `StockDailyChart.tsx`(`linearGradient sdcFill`) · `CandleTooltip.tsx`(rgba 인라인) · 신규 `hooks/utils/useChartTheme.ts`.
- 메타/스플래시: `app/layout.tsx`(viewport.themeColor + FOUC 스크립트) · `components/pwa/SplashScreen.tsx` · `app/splash-ios/route.tsx` · `app/icon.tsx`/`apple-icon.tsx`/`opengraph-image.tsx`/`lib/brand-mark.tsx`(light 고정).
- 상태: 신규 `lib/store/themeStore.ts`/`lib/store/theme/store.ts`(`lib/api/watchlist/store.ts` 패턴 복제) · `components/theme/{ThemeProvider,ThemeMenuButton}.tsx` · `app/providers.tsx`(래핑).
- 합성 토큰: `app/components.css`(`@apply` ~106 — `.card`/`.badge-*`/`.navbar`/`.header-glass`/`.dropdown-panel`/`.card-critical`/`skeletonShimmer`/`shadow-[...theme(colors.accent-soft)]`).
- 룰: `docs/rules/frontend.md`(§커스텀훅 · §copy · 도메인 한 뎁스 · 반응형), `AGENTS.md`(디자인 토큰 동기화 · 반응형 · 한글카피).
- 기억: `reference_design-token-sync-ssot`(#86 사고·DESIGN.md 경유 필수), `feedback_single-pr-rule-exception`(분할 PR 선례), `project_pwa-splash-statusbar`(스플래시·상태바).

---

## 8. 영향 분석

### 8.1 신규 / 수정 파일

| 단계 | 신규 | 수정 |
|---|---|---|
| PR1 인프라 | `scripts/inject-color-themes.mjs` · `app/theme-vars.css`(생성) · `lib/store/themeStore.ts` · `lib/store/theme/store.ts` · `components/theme/{ThemeProvider,ThemeMenuButton}.tsx` | `tailwind.config.ts`(var 맵+darkMode) · `app/globals.css`(import+color-scheme) · `package.json`(design:sync 체이닝) · `app/layout.tsx`(FOUC 스크립트) · `app/providers.tsx`(래핑) · `SettingsMenuCard.tsx`(THEME 연결) |
| PR2 팔레트 | — | `docs/design/finsight-redesign.md`(`colors-dark:` 49값) → design:sync 로 `theme-vars.css` 재생성 |
| PR3 차트 | `hooks/utils/useChartTheme.ts` | `chartTheme.ts` 소비처 전수(`StockDailyChart`/`CandleTooltip`/workbench 차트 등) |
| PR4 메타 | — | `app/layout.tsx`(themeColor) · `SplashScreen.tsx` · `splash-ios/route.tsx` |
| PR5 마감 | (선택) WCAG 검사 스크립트 | hex 전수조사 잔존 처리 · `docs/qa/dark-mode.md` |

### 8.2 PR 분할 권고 (5-PR 확정)

다크모드는 변경 표면이 넓어(전 라우트 + 전 표면 유형 + 차트 + 메타) 단일 PR 의 리뷰·회귀 부담이 과대 → 5-PR 분할. 각 PR 독립 머지 가능, 인프라(PR1)가 다크 값 없이 light 무회귀로 선행 가능. 선례: `feedback_single-pr-rule-exception`.

1. **PR1 인프라** — 토큰 CSS 변수화 + darkMode class + 상태/토글/FOUC. **dark=light 시각 무변경**(회귀 0 기반).
2. **PR2 팔레트** — DESIGN.md `colors-dark:` 49값(디자이너). 처음으로 다크 시각 분기(차트 제외).
3. **PR3 차트** — recharts 런타임 테마 훅.
4. **PR4 메타/이미지** — themeColor 동적 + 스플래시 다크.
5. **PR5 검증/마감** — hex 전수조사 + WCAG 검사 + QA 클로즈.

> 한 브랜치 한 PR 룰의 예외(분할). 분할 사유: 회귀 영역 분리(인프라 vs 색 vs 차트 vs 메타)와 디자이너 왕복(PR2)이 인프라(PR1) 머지를 막지 않게.

### 8.3 변경 라인 추정

| 영역 | 추정 라인 | 성격 |
|---|---|---|
| PR1 인프라(config+스크립트+상태+토글+FOUC) | ~280 | 신규+수정 |
| PR2 팔레트(DESIGN.md 49값) | ~60 | DESIGN.md front matter |
| PR3 차트 런타임 훅+소비처 전환 | ~150 | 신규+수정 |
| PR4 메타/스플래시 | ~70 | 수정 |
| PR5 마감(검사 스크립트+잔존) | ~60 | 신규+정리 |
| **합계** | **~620** | 컴포넌트 본문 수정 0(자동 전환)이 핵심 절감 |

### 8.4 회귀 위험

- **중** — `tailwind.config.ts` colors 를 `var()` 맵으로 전환 시 빌드 산출 변화. PR1 게이트 3종(theme() 인라인·알파 color-mix·hex 잔존 0)으로 차단. dark=light 동일값이라 시각 회귀 0 으로 검증 가능.
- **중** — 알파 수정자(`bg-surface/80`)가 `var()` 색에서 미동작 시 navbar/header 반투명 깨짐 → PR1 게이트 ②.
- **중** — 차트 런타임 훅 전환 누락 시 차트만 light 고정(다크에서 흰 차트) → PR3 게이트 + `from.*chartTheme` 전수 grep.
- **중(핵심)** — 표면 누락 시 다크 시인성 깨짐 → 자동 방어선 3종(49키 1:1 검증 · WCAG 대비 검사 · hex 전수 grep) + 수동 라우트 체크리스트(AC-6).
- **저** — FOUC 스크립트 오류 시 깜빡임 → AC-5 수동.
- **저** — localStorage 격리/하이드레이션 mismatch → `suppressHydrationWarning` 이미 존재 + hasWindow 가드.

---

## 9. OPEN QUESTION (전건 RESOLVED — 2026-06-02 사용자 확정)

- **[RESOLVED] q1 — `surface-elevated` 신규 토큰(49→50키) 추가 여부**: 다크에서는 그림자가 거의 안 보여 모달/드롭다운/토스트를 그림자 대신 **명도(살짝 더 밝은 surface)** 로 분리해야 한다. light 에서는 `surface` 와 동일값으로 두면 무회귀.
  - **결정: 추가**(사용자 확정, PM 권고 채택). 49→50키. `inject-color-themes.mjs` 1:1 검증도 50키로 갱신. 디자이너가 DESIGN.md `colors`/`colors-dark` 양쪽에 elevated 정의(light=surface 동일값).

- **[RESOLVED] q2 — themeColor 명시 선택 반영 범위**: system 모드는 `viewport.themeColor` media query 배열(정적)로 상태바가 자동 전환된다.
  - **결정: 런타임 교체까지**(사용자 확정, PM 권고 채택). 명시 light/dark 선택 시 ThemeProvider effect 에서 resolvedTheme 변화 시 `<meta name="theme-color">` 교체.

- **[RESOLVED] q3 — cross-tab 동기화(storage 이벤트) 범위 포함 여부**: 한 탭에서 테마를 바꾸면 다른 열린 탭도 즉시 따라가게 `storage` 이벤트를 구독할지.
  - **결정: PR1 에 포함**(사용자 확정, PM 권고 채택). ThemeProvider 에 `storage` 리스너 추가로 멀티탭 일관성 확보.

---

산출물: `docs/prd/dark-mode.md`
