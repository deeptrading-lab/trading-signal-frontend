---
version: alpha
name: layout-redesign
description: Trading Signal Frontend — 3-section shell (상단 navbar + 좌측 사이드바 + 메인 영역) 글로벌 레이아웃 재설계 가이드
colors:
  primary: "#1f3b4d"
  surface: "#ffffff"
  surface-muted: "#f5f7fa"
  border-line: "#dbe2ea"
  text-strong: "#17202a"
  text-muted: "#5b6878"
  accent-soft: "#e6ecf2"
  warn: "#a04a09"
  warn-soft: "#fff4df"
  info: "#1f4fc0"
  info-soft: "#e8efff"
  critical: "#8a1818"
  critical-soft: "#fde2e2"
typography:
  display:
    fontFamily: Arial
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.18
  h1:
    fontFamily: Arial
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.2
  h2:
    fontFamily: Arial
    fontSize: 17px
    fontWeight: 700
    lineHeight: 1.35
  body-md:
    fontFamily: Arial
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Arial
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-strong:
    fontFamily: Arial
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.5
  caption:
    fontFamily: Arial
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  button:
    fontFamily: Arial
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.2
  badge:
    fontFamily: Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
  mono-numeric:
    fontFamily: Arial
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tnum"
  nav-brand:
    fontFamily: Arial
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  sidebar-section:
    fontFamily: Arial
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.04em
spacing:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 18px
  2xl: 24px
  navbar-h: 60px
  sidebar-w: 264px
  drawer-w: 304px
  main-max-w: 1152px
rounded:
  sm: 8px
  md: 12px
  pill: 999px
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
components:
  shell:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    padding: 18px
  caption:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  body-strong:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-strong}"
    padding: 0px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 16px
  card-elevated:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 20px
  card-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.sm}"
    padding: 16px
  card-critical:
    backgroundColor: "{colors.critical-soft}"
    textColor: "{colors.critical}"
    rounded: "{rounded.sm}"
    padding: 12px
  input:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 11px
    height: 42px
  input-error:
    backgroundColor: "{colors.critical-soft}"
    textColor: "{colors.critical}"
    rounded: "{rounded.sm}"
    padding: 11px
    height: 42px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: 12px
    typography: "{typography.button}"
    height: 44px
  button-primary-disabled:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: 12px
    typography: "{typography.button}"
    height: 44px
  search-result-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 12px
  search-result-item-focus:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 12px
  badge-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: 10px
    typography: "{typography.badge}"
    height: 28px
  badge-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.pill}"
    padding: 10px
    typography: "{typography.badge}"
    height: 28px
  badge-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    rounded: "{rounded.pill}"
    padding: 10px
    typography: "{typography.badge}"
    height: 28px
  badge-critical:
    backgroundColor: "{colors.critical-soft}"
    textColor: "{colors.critical}"
    rounded: "{rounded.pill}"
    padding: 10px
    typography: "{typography.badge}"
    height: 28px
  price-bar-track:
    backgroundColor: "{colors.border-line}"
    rounded: "{rounded.pill}"
    height: 6px
  price-bar-stop:
    backgroundColor: "{colors.critical}"
    rounded: "{rounded.pill}"
    height: 12px
    width: 4px
  price-bar-entry:
    backgroundColor: "{colors.info}"
    rounded: "{rounded.pill}"
    height: 12px
    width: 4px
  price-bar-target:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    height: 12px
    width: 4px
  navbar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    padding: 14px
    height: "{spacing.navbar-h}"
  navbar-brand:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.nav-brand}"
    padding: 6px
  navbar-icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 40px
    width: 40px
  navbar-icon-button-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 40px
    width: 40px
  sidebar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    padding: 16px
    width: "{spacing.sidebar-w}"
  sidebar-section-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.sidebar-section}"
    padding: 6px
  sidebar-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 10px
    height: 40px
  sidebar-item-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 10px
    height: 40px
  sidebar-item-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 10px
    height: 40px
  sidebar-empty:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    typography: "{typography.caption}"
    padding: 12px
  drawer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.md}"
    padding: 16px
    width: "{spacing.drawer-w}"
  drawer-scrim:
    backgroundColor: "{colors.text-strong}"
    padding: 0px
  favorite-toggle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    padding: 6px
    height: 32px
    width: 32px
  favorite-toggle-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: 6px
    height: 32px
    width: 32px
  main-area:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    padding: 18px
  ticker-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 14px
---

# layout-redesign 디자인 가이드 (v4)

## Overview

본 v4 는 워크벤치 화면을 **글로벌 3-section shell** 위로 재구성한다. 직전 v3 (`docs/design/workbench-analyze-rebuild.md`) 까지의 단일 페이지 카드 흐름·`lg:grid-cols-[360px_1fr]` sticky sidebar 구조를 폐기하고, 상단 **navbar** + 좌측 **sidebar** + 우측 **메인 영역** 의 3-section 구조를 도입한다. v3 의 색·타이포·간격·라운드·시그니처 톤은 **그대로 계승** — 시각 언어 무회귀, 골격만 교체.

이 재설계의 출발점은 사용자 의도 "디자인 전문가라고 생각하고 코인·주식 분석해서 결과 알려주는 디자인을 고민해봐" 다. 트레이딩 도구의 본질은 **(1) 글로벌 도구의 위치가 명확** 하고, **(2) 사용자가 자주 참조할 정보(분석 히스토리·즐겨찾기)에 한 클릭 거리** 이며, **(3) "이걸 사야 하나"** 라는 단 하나의 결론이 첫 인상에서 가장 먼저 시선을 받는 것이다. 단일 페이지 안에 검색·입력·결과가 평면으로 깔린 v3 구조는 (1) 과 (2) 를 만족하지 못했고, ResultGroup 6블록의 평면 grid 는 (3) 의 위계를 흐렸다. 본 v4 는 세 요건을 동시에 푼다.

브랜드 톤은 **토스 서비스풍 + 금융 도구의 클래식 신뢰감** — v3 의 Signature Slate(`#1f3b4d`) 시그니처를 그대로 두고, navbar/sidebar 가 새로 들어오는 자리에는 **시각적 노이즈를 최대한 줄인 흰 표면(`surface`)** 을 사용한다. 시그니처 슬레이트의 "한 화면에 두 지점" 원칙(action 카드 + CTA) 은 v4 에서도 무회귀 — navbar 의 로고·서비스명에 슬레이트를 한 번 더 박지 않는다. 로고는 텍스트 wordmark 만 두고 색은 텍스트 기본 톤으로.

모바일(375px)을 1차 캔버스로 잡되, 데스크탑(1280px)에서 펼쳐진 sidebar 가 동등한 1순위 시나리오. 두 뷰포트 모두 PR #17·#20 의 검증 환경.

## Colors

본 v4 의 `colors` 토큰은 v3 (`workbench-analyze-rebuild.md`) 와 **완전히 동일** — Signature Slate `#1f3b4d` + semantic 13 토큰. 키 이름·hex 모두 무수정 계승. 본 절은 v3 의 결정을 요약하고, v4 가 새로 도입한 컴포넌트(navbar·sidebar·drawer·favorite-toggle)에서의 사용처만 보강한다.

### 시그니처 색 — Signature Slate (1 개)

`primary` (`#1f3b4d`, Signature Slate) 는 v3 의 원칙대로 **한 화면에 두 지점** 에만 노출된다.

- 정상 사용처 (v3 무회귀): `action` 카드 권고 강조 배지 + 분석 CTA(`button-primary`).
- 시각적 변종(노출 카운트 X): 검색 결과 포커스 배경(`search-result-item-focus`), risk_plan 익절가 표식(`price-bar-target`), 사이드바 활성 항목 배경(`sidebar-item-active`), 즐겨찾기 활성 토글(`favorite-toggle-active`) — 모두 옅은 슬레이트(`accent-soft`) 또는 표식 점 단위.
- **금지**: navbar 의 로고·서비스명 텍스트에 슬레이트 noise 추가. navbar 브랜드는 텍스트 기본 톤(`text-strong`) 또는 옅은 슬레이트(`text-strong` × `text-strong` 조합) 로만. 시그니처는 "분석 행위" 의 시각 앵커이지 "브랜드 로고" 의 색이 아님. — **단, `navbar-brand` 컴포넌트 토큰은 `primary` 를 textColor 로 두어 wordmark 자체에 신뢰 톤을 한 번만 박는다 (한 화면 1회, 카운트되지 않는 미세 사용).**

`navbar-brand` 의 `textColor: {colors.primary}` 는 위 원칙의 미세 예외다. wordmark 1 회 노출은 토스·금융 도구 양쪽에서 통용되는 관용이며, action 카드의 강조 색과 시각 무게가 다르다(나브 wordmark 는 `nav-brand` 16px / 700 vs action 의 `display` 30px / 700). 시선 경쟁이 발생하지 않는 조건에서의 1회 노출은 "두 지점" 원칙을 깨지 않는다고 본다. 디자이너 결정 영역 — 향후 다크모드 도입 시 wordmark 톤이 흐려지면 `text-strong` 으로 폴백 가능.

### 색별 역할 (v3 재인용 + v4 사용처 보강)

| 토큰 | hex | v3 사용처 | v4 추가 사용처 |
|---|---|---|---|
| `primary` | `#1f3b4d` | action 강조, CTA, risk_plan 익절가 표식 | `navbar-brand` wordmark textColor (1회), `sidebar-item-active` textColor, `favorite-toggle-active` textColor |
| `text-strong` | `#17202a` | 본문 텍스트·헤드라인 | `navbar` textColor, `sidebar` textColor, `sidebar-item` textColor, `drawer-scrim` backgroundColor (8~12% 불투명 적용은 frontend-dev 측 layer) |
| `text-muted` | `#5b6878` | 라벨·캡션 | `sidebar-section-header` textColor, `sidebar-empty` textColor, `favorite-toggle` 비활성 textColor |
| `accent-soft` | `#e6ecf2` | 활성 상태 배경 (badge, search focus) | `sidebar-item-active` backgroundColor, `favorite-toggle-active` backgroundColor |
| `surface` | `#ffffff` | 카드·입력 표면 | `navbar` backgroundColor, `sidebar` backgroundColor, `drawer` backgroundColor, `ticker-header` backgroundColor |
| `surface-muted` | `#f5f7fa` | 페이지 배경, 입력 칸 배경 | `main-area` backgroundColor (페이지 본문 영역의 1순위 톤), `sidebar-item-hover` backgroundColor, `navbar-icon-button-hover` backgroundColor, `sidebar-empty` backgroundColor |
| `border-line` | `#dbe2ea` | 카드 보더·구분선 | navbar 하단 1px 보더, sidebar 우측 1px 보더 (frontend-dev 측 1px solid 적용) |
| `warn` / `warn-soft` | `#a04a09` / `#fff4df` | feasibility 비현실, warnings | 변경 없음 (사이드바·navbar 가 본질적으로 상태 색을 가지지 않음) |
| `info` / `info-soft` | `#1f4fc0` / `#e8efff` | risk_plan 진입가 표식 | 변경 없음 |
| `critical` / `critical-soft` | `#8a1818` / `#fde2e2` | 폼 사전 차단, BE 5xx, SELL/AVOID | 변경 없음 |

### WCAG AA 4.5:1 대비비 — v4 신규 컴포넌트

v3 의 주요 쌍은 모두 무회귀. v4 가 도입한 신규 컴포넌트의 색 쌍만 추가 검증한다.

| 쌍 | 비율 | AA (4.5:1) |
|---|---|---|
| `navbar-brand` textColor × backgroundColor (`primary` × `surface`) | 11.73:1 | ✅ |
| `navbar-icon-button` textColor × backgroundColor (`text-strong` × `surface`) | 16.45:1 | ✅ |
| `navbar-icon-button-hover` textColor × backgroundColor (`text-strong` × `surface-muted`) | 15.33:1 | ✅ |
| `sidebar-section-header` textColor × backgroundColor (`text-muted` × `surface`) | 5.68:1 | ✅ |
| `sidebar-item` textColor × backgroundColor (`text-strong` × `surface`) | 16.45:1 | ✅ |
| `sidebar-item-hover` textColor × backgroundColor (`text-strong` × `surface-muted`) | 15.33:1 | ✅ |
| `sidebar-item-active` textColor × backgroundColor (`primary` × `accent-soft`) | 9.85:1 | ✅ |
| `sidebar-empty` textColor × backgroundColor (`text-muted` × `surface-muted`) | 5.29:1 | ✅ |
| `drawer` textColor × backgroundColor (`text-strong` × `surface`) | 16.45:1 | ✅ |
| `favorite-toggle` textColor × backgroundColor (`text-muted` × `surface`) | 5.68:1 | ✅ |
| `favorite-toggle-active` textColor × backgroundColor (`primary` × `accent-soft`) | 9.85:1 | ✅ |

`drawer-scrim` 컴포넌트는 의도적으로 `textColor` 를 정의하지 않는다 — 스크림은 텍스트를 호스팅하지 않고 단순 overlay backdrop 이므로 contrast 쌍 검사 대상이 아니다. lint 의 `contrast-ratio` 룰은 `backgroundColor`/`textColor` 쌍에만 발화한다.

## Typography

v3 의 10 키(`display`, `h1`, `h2`, `body-md`, `body-sm`, `body-strong`, `caption`, `button`, `badge`, `mono-numeric`) 는 **무회귀**. v4 가 두 키 추가:

- **`nav-brand` (16px / 700, `-0.01em`)** — navbar 좌측 wordmark "TradingSignalEngine". 본문 텍스트와 시각 무게가 다르지만 `display` / `h1` 보다는 작아 wordmark 의 자기과시를 줄인다. 자간 `-0.01em` 으로 wordmark 의 결속력 미세 강화.
- **`sidebar-section` (12px / 700, `+0.04em`, all-caps 적용 권장)** — 사이드바 섹션 라벨("분석 히스토리", "즐겨찾기"). `caption` 과 동일 크기지만 weight 700 + 자간 양수 + 대문자 변환으로 "섹션 헤더" 임을 명확히 한다. 한글 라벨이라 all-caps 자체는 시각 효과가 적지만, 영문 보조(예: "HISTORY") 또는 향후 다국어 도입 시를 대비.

나머지 타이포 토큰은 새 컴포넌트에서도 그대로 사용 — 예: `sidebar-empty` 의 typography 는 `caption`, `button-primary` 의 typography 는 `button` 그대로.

## Layout

본 절이 v4 의 핵심 — 3-section shell 의 grid, 두 뷰포트(375 / 1280) 모두에서의 배치, 신규 layout 토큰의 의도를 정의한다.

### 신규 layout 토큰 (front matter `spacing` 절)

v3 의 `xs ~ 2xl` 6키 무회귀에 더해 **4개 layout 토큰** 추가:

- **`navbar-h: 60px`** — 상단 navbar 의 고정 높이. PRD §9.6 권장 범위 56~64px 중 **60px 채택** 사유:
  - 56px: 모바일에서는 충분하지만 데스크탑에서 wordmark + 우측 placeholder 자리가 답답해진다.
  - 64px: 데스크탑은 여유롭지만 모바일에서 화면 세로 비율(667~896px 기준) 의 7~10% 를 잡아먹어 메인 영역이 좁아진다.
  - 60px: 두 뷰포트의 중간값. wordmark `nav-brand` 16px + 상하 패딩 22px 균형. hamburger 버튼(40px) + 상하 마진(10px) 도 자연 정렬.
- **`sidebar-w: 264px`** — 데스크탑 사이드바의 고정 너비. PRD §9.6 권장 범위 240~280px 중 **264px 채택** 사유:
  - 240px: 분석 히스토리 항목의 ticker(예: `BTC-USD`, 7글자) + 우측 즐겨찾기 토글(32px) + 내부 패딩이 빠듯하다. ticker 한글 alias("애플", "비트코인") 까지 한 줄로 보이려면 더 필요.
  - 280px: 콘텐츠 폭은 여유롭지만 데스크탑 1280px 기준 메인 영역이 1280 - 280 = 1000px 미만으로 좁아져 `risk_plan` 표 + 가격 막대 정보 밀도 우선 톤이 흔들린다.
  - 264px: ticker 14 글자 + 토글 + 내부 패딩 + 1px 보더 모두 한 줄. 메인 영역도 1280 - 264 = 1016px (gap 24px 후 992px) — v3 의 `lg:max-w-6xl` 1152px 와 시각 무게가 거의 동일.
- **`drawer-w: 304px`** — 모바일 drawer 의 너비. PRD §9 의 "min(80vw, 320px)" 가 동적 표현이라 정수 토큰으로 304px 채택 사유:
  - 375px 기준 80vw = 300px, 414px 기준 80vw = 331px. 304px 는 두 기준 사이의 중앙값.
  - sidebar 의 264px 보다 40px 넓다 — drawer 가 overlay 로 떠 있을 때는 단독으로 보이므로 약간 더 넓게 잡아 콘텐츠를 편하게 한다.
  - 320px(권장 상한)는 375px 모바일에서 우측 콘텐츠 가림 폭이 너무 커서 사용자가 drawer 외부(스크림)를 탭하기 어려워진다. 304px 는 우측 가림 폭 71px (24% 가시) 로 스크림 탭 진입점 충분.
- **`main-max-w: 1152px`** — 메인 영역(navbar/sidebar 제외) 의 콘텐츠 최대폭. v3 의 `lg:max-w-6xl` 1152px 무회귀 — v4 에서도 결과 6블록 grid 의 정보 밀도 기준이 동일하다. sidebar 264px + main 1152px = 1416px 가 시각 무게 상한이며, 1280px 뷰포트에서는 sidebar 264px + gap 16px + main 1000px 로 자연 축소.

신규 토큰 4개는 모두 `spacing` 절에 둔다. DESIGN.md `alpha` 스펙이 별도 `layout` namespace 를 정의하지 않아, spacing 으로 흡수하는 게 lint 통과 + Tailwind theme export 정합 양쪽에 안전. frontend-dev 는 `theme.spacing['navbar-h']` 또는 CSS 변수 `--spacing-navbar-h` 로 참조.

### 3-section shell — 데스크탑 (`>= lg`, 1024px+)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  navbar  (height: spacing.navbar-h = 60px)                              │
│  [Wordmark]                                              [placeholder]  │
├──────────────┬──────────────────────────────────────────────────────────┤
│ sidebar      │  main-area  (backgroundColor: surface-muted)             │
│ (width:      │                                                          │
│  spacing.    │  ┌──────── ticker-header ──────┐ ★ favorite-toggle      │
│  sidebar-w   │  │ AAPL · Apple Inc. (USD)     │                         │
│  = 264px)    │  └─────────────────────────────┘                         │
│              │                                                          │
│ HISTORY      │  ┌─── SearchPanel + InputPanel (2-col on lg) ────┐      │
│ • AAPL       │  └────────────────────────────────────────────────┘      │
│ • BTC-USD    │                                                          │
│              │  ┌────────────── ActionCard (full) ──────────────┐      │
│ FAVORITES    │  └────────────────────────────────────────────────┘      │
│ ★ AAPL       │  ┌────────────── BriefCard   (full) ─────────────┐      │
│              │  └────────────────────────────────────────────────┘      │
│              │  ┌── FeasibilityCard ──┬── HorizonsCard ──┐             │
│              │  └──────────────────────┴──────────────────┘             │
│              │  ┌────────────── RiskPlanCard (full) ────────────┐      │
│              │  └────────────────────────────────────────────────┘      │
│              │  ┌────────────── WarningsCard (full) ────────────┐      │
│              │  └────────────────────────────────────────────────┘      │
└──────────────┴──────────────────────────────────────────────────────────┘
```

- **CSS grid 권장 (frontend-dev 측)**: `grid-template-columns: var(--spacing-sidebar-w) 1fr` for `lg+`, navbar 는 `position: sticky; top: 0; height: var(--spacing-navbar-h)`.
- **sidebar 의 sticky**: navbar 아래 `top: var(--spacing-navbar-h)` 로 sticky. 스크롤 시 메인 영역만 흘러간다. sidebar 내부 콘텐츠는 자체 overflow-y auto 로 길어지면 스크롤.
- **메인 영역 최대폭**: `main-max-w: 1152px` — 메인 영역 안에서 가운데 정렬. sidebar 264px + gap 24px + main 1152px = 1440px 가 이상적 데스크탑 폭. 1280px 뷰포트에서는 main 콘텐츠가 988px 까지 자연 축소되며 시각 무게는 v3 의 lg 와 동등.
- **결과 6블록 위계 (R3 PM 권고 수용)**: ActionCard → BriefCard → (FeasibilityCard + HorizonsCard 2-col) → RiskPlanCard → WarningsCard. v3 의 데스크탑 배치(`feasibility + warnings` 2-col, `brief + risk_plan` 2-col) 와 다른 위계 — 본 v4 에서는 **"action → action 의 근거(brief) → 보조 분석(feasibility/horizons) → 실행 계획(risk_plan) → 메타 경고(warnings)"** 의 자연스러운 의사결정 흐름이 우선이다. v3 의 묶음은 "상태 강조 카드끼리 / 보조 정보끼리" 의 시각 유사도 우선이었고, v4 는 인지 흐름 우선. 두 흐름 모두 정당하지만 v4 가 더 사용자 의도("이걸 사야 하나" 가 첫 인상) 에 가깝다.

### 3-section shell — 모바일 (`< lg`, ~ 1023px)

```
┌──────────────────────────┐
│ navbar (60px)            │
│ [☰] [Wordmark]   [....]  │
├──────────────────────────┤
│ main-area                │
│                          │
│ ┌── ticker-header ──┐ ★  │
│ │ AAPL              │    │
│ └───────────────────┘    │
│                          │
│ SearchPanel              │
│ InputPanel               │
│                          │
│ ActionCard               │
│ BriefCard                │
│ FeasibilityCard          │
│ HorizonsCard             │
│ RiskPlanCard             │
│ WarningsCard             │
│                          │
└──────────────────────────┘

(hamburger 클릭 시:)
┌──────────────────────────┐
│ navbar (☰ 활성)          │
├────────────────┬─────────┤
│ drawer 304px   │ scrim   │
│                │ (탭 시  │
│ HISTORY        │  닫힘)  │
│ • AAPL         │         │
│                │         │
│ FAVORITES      │         │
│ ★ AAPL         │         │
│                │         │
│ [닫기]         │         │
└────────────────┴─────────┘
```

- **navbar 모바일 한정 hamburger**: 좌측 hamburger 아이콘 → drawer 토글. `useBreakpoint().isMobile === true` 일 때만 렌더 (CSS 측 `lg:hidden`).
- **사이드바 모바일**: 기본 hidden. drawer 로 슬라이드인. drawer 는 좌측에서 우측으로 슬라이드 (transform: translateX). 너비 `drawer-w: 304px`.
- **scrim**: 화면 우측 70px 영역을 차지하는 반투명 overlay. tap 시 drawer 닫힘. backgroundColor 는 `drawer-scrim` 컴포넌트 토큰(`text-strong`) 에 8~12% opacity(frontend-dev 측 alpha) 적용 — 토큰 자체는 opaque hex 이고 alpha 는 CSS 레이어에서 `rgba()` 또는 `bg-text-strong/10` 으로.
- **결과 6블록 모바일**: 모두 세로 풀폭 스택. FeasibilityCard + HorizonsCard 가 데스크탑에서 2-col 인 것만 모바일에선 세로 스택으로 다운그레이드 (`lg:grid-cols-2`).

### 태블릿 (`md ~ lg - 1`, 768~1023px) 정책

본 v4 는 **모바일과 동일한 한 컬럼 스택 유지** 정책 — sidebar 는 drawer 로 접힘, 결과 6블록 grid 도입 X. 사유는 v3 의 R5 결정과 동일: 768~1023px 에서 카드 폭이 320~440px 로 좁아져 risk_plan 표·가격 막대가 답답해진다. 차이점은 v4 는 navbar 가 항상 노출이므로 태블릿에서도 wordmark + hamburger 가 보인다는 점.

### 반응형 분기 — CSS 우선 + JS 보조

PRD §3.3 무회귀: Tailwind 반응형 prefix(`md:`, `lg:`) 가 1차 도구, `useBreakpoint` 가 2차 도구.

- **CSS prefix 로 표현**: sidebar 의 `hidden lg:block`, 결과 grid 의 `grid grid-cols-1 lg:grid-cols-2`, navbar hamburger 의 `lg:hidden`.
- **JS (`useBreakpoint`) 로 분기**: drawer state(`isDrawerOpen`) 의 자동 닫기 (모바일 → 데스크탑 리사이즈 시 `useEffect(() => { if (isDesktop) setDrawerOpen(false); }, [isDesktop])`), drawer focus trap, body scroll lock 활성 조건.
- **금지**: `window.innerWidth` 직접 검사 (SSR-unsafe + listener 누락). v3 의 무회귀 금기 그대로.

## Elevation & Depth

v3 의 평면 디자인 기조 무회귀. 신규 컴포넌트의 그림자 정책:

- **navbar**: 그림자 없음. 하단 1px solid `border-line` 으로만 메인 영역과 분리. 토스 톤의 가벼움.
- **sidebar**: 그림자 없음. 우측 1px solid `border-line` 으로만 메인 영역과 분리.
- **drawer**: **유일한 그림자 노출** — `box-shadow: 0 16px 48px rgba(23, 32, 42, 0.16)`. drawer 는 overlay 로 떠 있는 단일 패널이라 그림자가 "떠 있다" 는 시각 신호를 명확히 한다. 토큰화하지 않음 (한 군데만 사용, 토큰 도입은 두 곳 이상 쓸 때 — v3 의 `card-elevated` 그림자와 동일 원칙).
- **drawer-scrim**: 그림자 X. 대신 opacity 로 깊이.

`action` 카드(`card-elevated`) 의 미세 그림자(`0 10px 28px rgba(23, 32, 42, 0.08)`) 는 v3 무회귀. 한 화면에 action 그림자 1 회 + drawer 그림자 1 회 (drawer 가 열려 있을 때만) 가 정상 상태.

## Shapes

v3 의 `rounded.sm` 8px + `rounded.pill` 999px 무회귀. v4 가 한 키 추가:

- **`rounded.md: 12px`** — drawer 단독 라운드. drawer 는 화면 좌측에 붙어 있어 좌측 모서리는 모서리 없음(0) 으로 두고, **우측 모서리만 12px** 라운드 (frontend-dev 측 `rounded-r-md` 또는 `border-radius: 0 12px 12px 0`). 8px(sm) 은 카드와 시각 무게가 같아 drawer 의 "오버레이로 떠 있는" 시각 신호가 약하고, pill 999px 은 너무 둥글다. 12px 은 그 사이의 자연스러운 절충.

navbar / sidebar 는 라운드 없음 (직각). 글로벌 영역은 화면 가장자리에 붙어 있으므로 라운드는 시각적 누수.

## Components

### 글로벌 영역 — Navbar

#### `navbar`

- 자리: viewport 최상단 fixed 또는 sticky, 가로 100%, 세로 `spacing.navbar-h` (60px).
- backgroundColor: `surface` (#ffffff). 메인 영역(`surface-muted` #f5f7fa) 과 자연 분리.
- 하단 보더: 1px solid `border-line`. 그림자 없음.
- 좌우 내부 패딩: 14px (모바일) / 24px (데스크탑, frontend-dev 측 `lg:px-2xl` 적용).
- 내부 정렬: `flex items-center justify-between`. 좌측 = brand (+ 모바일 한정 hamburger), 우측 = placeholder.

#### `navbar-brand`

- "TradingSignalEngine" wordmark. typography: `nav-brand` (16px / 700 / `-0.01em`).
- textColor: `primary` (Signature Slate) — 한 화면 1회 미세 노출, 위 Colors 절 참조.
- padding: 6px (클릭 영역 확보, 향후 홈 진입 링크 역할 대비).
- 로고 이미지·아이콘은 본 v4 비범위 (PRD §4.3 무회귀) — 자리만 잡고 wordmark 텍스트로 시작.

#### `navbar-icon-button` / `navbar-icon-button-hover`

- 자리: navbar 좌측 (모바일 hamburger) 또는 우측 (placeholder, 다크모드 토글·사용자 메뉴 등 후속 PRD).
- 크기: 40 × 40px (touch target 44px 미만이지만 padding 8px + icon 24px 로 시각 hit area 충분).
- backgroundColor: 기본 `surface`, hover 시 `surface-muted`. textColor 는 `text-strong`.
- rounded: `sm` (8px).
- 모바일 hamburger: `aria-label="메뉴 열기"`, `aria-expanded={isDrawerOpen}`, `aria-controls="mobile-drawer"`.

### 글로벌 영역 — Sidebar (데스크탑)

#### `sidebar`

- 자리: navbar 아래 좌측 sticky, 너비 `spacing.sidebar-w` (264px), 세로 100% - navbar-h.
- backgroundColor: `surface`. textColor: `text-strong`.
- 우측 보더: 1px solid `border-line`.
- 내부 패딩: 16px. 섹션 사이 간격: `spacing.xl` (18px).
- 내부 overflow-y: auto (히스토리·즐겨찾기가 길어지면 스크롤).

#### `sidebar-section-header`

- "분석 히스토리", "즐겨찾기" 등 섹션 라벨.
- typography: `sidebar-section` (12px / 700 / `+0.04em`). textColor: `text-muted`.
- padding: 6px (좌우 정렬, 위아래 8px 마진은 frontend-dev 측).
- 한글 라벨이지만 영문 보조("HISTORY", "FAVORITES") 를 우측에 작게 두는 것도 디자이너 재량 — 본 가이드는 한글만 권장 (한글 톤 무회귀).

#### `sidebar-item` / `sidebar-item-hover` / `sidebar-item-active`

- 자리: 사이드바 섹션 내부 한 항목 (분석 히스토리 ticker, 즐겨찾기 ticker).
- 기본 `sidebar-item`: backgroundColor `surface`, textColor `text-strong`, height 40px, padding 10px, rounded `sm`.
- hover 상태 `sidebar-item-hover`: backgroundColor `surface-muted` 로 전환.
- 활성 상태 `sidebar-item-active`: 현재 선택된 ticker. backgroundColor `accent-soft` + textColor `primary`. 검색 결과 포커스(`search-result-item-focus`) 와 동일 톤 — 사용자가 "선택된 것" 을 일관 시각 신호로 인지.
- 내부 구조 (frontend-dev 측): `flex items-center justify-between` — 좌측 ticker + alias, 우측 즐겨찾기 토글(`favorite-toggle`) 또는 시간 메타(예: "2시간 전").

#### `sidebar-empty`

- 자리: 사이드바 섹션이 비어 있을 때.
- backgroundColor: `surface-muted`. textColor: `text-muted`. typography: `caption`.
- 한글 카피 예시:
  - 분석 히스토리 빈 상태: "분석을 실행하면 여기에 최근 종목이 쌓여요."
  - 즐겨찾기 빈 상태: "관심 종목을 별표로 표시하면 여기에 모여요."
- 새로고침 시 in-session 메모리 초기화임을 한 줄 더 부연(권장): "새로고침 시 초기화돼요." — 메인 카피 아래 `body-sm` × `text-muted`.

### 글로벌 영역 — Drawer (모바일)

#### `drawer`

- 자리: 모바일 hamburger 클릭 시 좌측에서 슬라이드인. 너비 `spacing.drawer-w` (304px), 세로 100vh.
- backgroundColor: `surface`. textColor: `text-strong`. rounded `md` (우측 모서리만 12px).
- 내부 padding: 16px.
- 콘텐츠: sidebar 와 동일 (분석 히스토리 + 즐겨찾기 두 섹션). drawer 와 sidebar 가 콘텐츠를 공유하므로 frontend-dev 측에서 `<SidebarContent />` 컴포넌트 분리 권장 — drawer 와 sidebar 가 같은 자식을 호스팅.
- 상단에 close 버튼(`navbar-icon-button` 톤, `aria-label="메뉴 닫기"`) 1 개. ESC 키 + scrim 탭 + close 버튼 세 가지 닫기 진입점.
- 동작: `transform: translateX(-100%)` → `translateX(0)` slide-in. transition 200~240ms ease-out. focus trap 활성 (frontend-dev 측 자체 구현 또는 `react-focus-lock` 미도입 — PRD §4 의 라이브러리 미도입 원칙 무회귀).
- ARIA: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` 로 첫 섹션 헤더 연결.
- body scroll lock: drawer 열림 시 `document.body.style.overflow = 'hidden'`. 닫힘 시 복구. `useEffect` cleanup 필수.

#### `drawer-scrim`

- 자리: drawer 우측 배경 전체 (drawer 폭 304px 이후 ~ 100vw).
- backgroundColor: `text-strong` (hex `#17202a`). frontend-dev 측에서 8~12% opacity 적용 (`bg-text-strong/10` 또는 `rgba(23, 32, 42, 0.12)`).
- tap 시 drawer 닫힘. `aria-hidden="true"` (scrim 자체는 기능 없는 시각 요소).
- textColor 정의 없음 (텍스트 호스팅 안 함) — lint contrast-ratio 룰 회피.

### 메인 영역

#### `main-area`

- 자리: navbar 아래 + sidebar 우측. 가용 폭 100%, 가용 높이 자유 스크롤.
- backgroundColor: `surface-muted` (#f5f7fa). 카드(`surface` #ffffff) 와 미세 대비로 카드 윤곽 자연 강조.
- 내부 padding: 18px (모바일) / 24px (데스크탑, frontend-dev 측 `lg:p-2xl` 적용).
- 최대폭: `spacing.main-max-w` (1152px). 메인 영역 안에서 가운데 정렬.

#### `ticker-header`

- 자리: 메인 영역 최상단. SearchPanel 위 또는 옆 (디자이너 재량 — 본 가이드 권장: SearchPanel 과 같은 줄 우측, 데스크탑 한정. 모바일은 위 별도 줄).
- backgroundColor: `surface`. rounded `sm`. padding 14px.
- 내부 구조: 좌측 = ticker 텍스트(`AAPL · Apple Inc. (USD)`, `body-strong`) + 통화 chip(옵션, `badge-info`), 우측 = `favorite-toggle` 별표 버튼.
- ticker 미선택 상태: "분석할 종목을 검색해 주세요." (한 줄 `body-md` × `text-muted`). 별표 버튼 hidden.
- **R6 즐겨찾기 진입점 1/2 (메인 헤더)**: 별표 클릭 시 현재 ticker 를 즐겨찾기 목록에 add/remove. 토글 상태는 `favorite-toggle` ↔ `favorite-toggle-active` 시각 전환.

#### `favorite-toggle` / `favorite-toggle-active`

- 자리: ticker-header 우측 + 사이드바 히스토리 항목 우측 (R6 두 진입점).
- 크기: 32 × 32px (touch target 32px — 모바일에서는 padding 영역으로 44px 가시 확보).
- 기본 `favorite-toggle`: backgroundColor `surface`, textColor `text-muted` (별표 outline 톤). rounded `pill`.
- 활성 `favorite-toggle-active`: backgroundColor `accent-soft`, textColor `primary` (별표 채워진 톤). 시그니처 슬레이트의 옅은 변종 — "선택됨" 의 일관 신호.
- ARIA: `role="button"`, `aria-pressed={isFavorite}`, `aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}`.
- 아이콘: 별표(☆ / ★) — 라이브러리 미도입, 유니코드 또는 SVG inline. 시각만이 아니라 텍스트 라벨도 ARIA 로 병행 (AC-15 무회귀).

### 결과 영역 (메인 영역 안의 ResultGroup)

v3 의 6블록 컴포넌트(`card-elevated`, `card`, `card-warn`, `card-critical`, `badge-*`, `price-bar-*`) 토큰은 **무회귀**. 자식 배열·grid 클래스만 갱신 (PRD §3.4 의 ResultGroup 자식 grid 재배치 영역).

**R3 위계 결정 (PM 권고 수용)**:

1. **ActionCard** (`card-elevated`) — 최상단, 가로 풀폭. 시각 위계 최강. `display` 한글 라벨 1줄 + `body-md` 근거 1~2줄.
2. **BriefCard** (`card`) — ActionCard 바로 아래, 가로 풀폭. Action 의 근거. `action.kind` 와 `brief.action` 이 다르면 좌측 3px `border-line` 보더로 "별개 신호" 시각 분리 (v3 무회귀).
3. **FeasibilityCard + HorizonsCard** — 2-col grid (데스크탑 `lg:grid-cols-2`, 모바일 세로 스택). Feasibility 비현실 판정 시 `card-warn` + `badge-warn` "⚠ 비현실적인 목표예요" (v3 무회귀). Horizons 는 단·중·장기 3줄 텍스트.
4. **RiskPlanCard** (`card`) — 가로 풀폭. 표 + 가격 막대 (v3 무회귀).
5. **WarningsCard** (`card-warn`) — 최하단. 빈 배열이면 섹션 자체 hidden (v3 무회귀).

v3 의 데스크탑 grid 배치(`action` 전폭 → `feasibility + warnings` 2-col → `brief + risk_plan` 2-col → `horizons` 전폭) 와 **명백히 다른 위계**. v4 가 v3 와 다른 사유:

- v3 의 묶음 기준은 **시각 유사도** (상태 강조 카드끼리 / 보조 정보끼리). 인지적으로는 "warnings 가 feasibility 옆에 있어야 하나" 라는 위계가 일관되지 않음.
- v4 의 묶음 기준은 **사용자 인지 흐름**: action(결론) → brief(결론의 근거) → feasibility/horizons(보조 분석) → risk_plan(실행) → warnings(메타). "이걸 사야 하나" 질문의 답을 받은 뒤 자연스럽게 "왜? → 어떻게? → 주의는?" 으로 시선이 내려간다.
- 모바일에서는 두 위계가 어차피 세로 스택이라 차이가 사라지므로, 데스크탑 grid 만 v4 가 갱신.

### 입력 영역 (메인 영역 안의 SearchPanel + InputPanel)

v3 의 input·input-error·button-primary·search-result-item 토큰 무회귀. **PRD §3.1.3 의 위치 이동만 명시** — 두 컴포넌트가 v3 의 좌측 sticky sidebar 가 아닌 **메인 영역 상단** 에 위치.

- 데스크탑: SearchPanel + InputPanel 을 한 줄에 배치 가능 (frontend-dev 재량 — `lg:grid-cols-2` 또는 가로 flex). 정확한 폼 grid 는 PRD #2 component-compactness 영역.
- 모바일: 세로 스택 (`block`).
- ticker-header (별표 토글 포함) → SearchPanel → InputPanel → ResultGroup 순서. 키보드 Tab 도 같은 흐름.

## Do's and Don'ts

v3 의 무회귀 항목을 모두 유지하고, v4 의 글로벌 영역 정책을 추가한다.

### v3 무회귀

- ✅ 색은 `{colors.<name>}` 토큰 참조로만 사용한다. 컴포넌트 영역에 hex 직타 금지.
- ✅ 시그니처 색 (`{colors.primary}`, Signature Slate) 은 한 화면에 두 시각 앵커(`action` 카드 1 장 + 분석 CTA 1 개) + wordmark 1 회(`navbar-brand`) 에 한정한다. 헤더·아이콘에 추가 노출하지 않는다.
- ✅ `action` 의 한글 라벨은 한 화면에 하나만 `display` 크기. 나머지 카드 제목은 `h2` 이하.
- ✅ feasibility 비현실 강조는 색 + 텍스트 + 이모지 세 트랙 모두로 전달한다 (AC-15 무회귀).
- ✅ 숫자는 `typography.mono-numeric` 으로 자릿수를 맞춘다.
- ❌ 결과 카드를 한꺼번에 손절·진입·익절 세 가지 색으로 칠하지 않는다.
- ❌ `warnings` 가 비어 있을 때 빈 카드를 보여주지 않는다.
- ❌ 가격 막대에 라이브러리를 도입하지 않는다.
- ✅ 반응형 CSS 변경은 Tailwind 반응형 prefix(`md:`, `lg:`) 로만 표현한다.
- ✅ 반응형 JS 분기는 `useBreakpoint` 의 boolean 셋(`{ isMobile, isTablet, isDesktop }`) 을 사용한다.
- ❌ JS 측에서 `window.innerWidth` 를 직접 검사하지 않는다.

### v4 신규 — 글로벌 영역

- ✅ navbar 는 항상 노출되고, sidebar 는 데스크탑(`lg+`) 에서만 펼쳐진다. 모바일에서는 drawer 로만 접근한다.
- ✅ drawer 와 sidebar 는 동일 콘텐츠(분석 히스토리 + 즐겨찾기)를 호스팅한다. 콘텐츠 컴포넌트(`<SidebarContent />`) 를 분리해 두 곳에서 재사용한다.
- ✅ drawer 가 열려 있을 때 body scroll 은 lock 된다. ESC 키 + scrim 탭 + close 버튼 세 가지 닫기 진입점을 모두 제공한다.
- ✅ 모바일 → 데스크탑 리사이즈 시 drawer state 는 자동으로 닫힌다 (`useBreakpoint().isDesktop` 의존성 effect).
- ✅ 즐겨찾기 토글은 ticker-header(메인 영역 상단) + 사이드바 히스토리 항목 두 진입점에 둔다 (R6).
- ❌ navbar 에 추가 아이콘(다크모드 토글·사용자 메뉴·알림) 을 임의로 추가하지 않는다. 우측은 placeholder 자리만 잡고 후속 PRD 에서 채운다.
- ❌ 사이드바에 외부 링크(FinViz, Yahoo Finance 등) 를 본 v4 에서 추가하지 않는다 (R1 의 (c) 후속 PRD 미룸).
- ❌ navbar / sidebar 에 그림자를 적용하지 않는다. 보더 1px 만으로 분리. drawer 만 그림자 노출.
- ❌ 사이드바 비어 있을 때 빈 박스만 두지 않는다. `sidebar-empty` 컴포넌트로 한글 안내(+ "새로고침 시 초기화" 부연) 를 둔다.
- ❌ `lg:grid-cols-[360px_1fr]` 또는 `lg:sticky lg:top-0` 패턴을 `app/page.tsx` 또는 페이지 진입점 root 에 직접 두지 않는다 (AC-3). 글로벌 grid 는 layout.tsx 또는 route group layout 책임.

---

## 유저 시나리오

### 시나리오 A — 데스크탑 해피 패스 (1280px, AAPL 5% / 30일)

1. 사용자가 메인 진입 (`/`). 화면이 그려진 시점:
   - 상단 navbar: 좌측 wordmark "TradingSignalEngine", 우측 placeholder.
   - 좌측 sidebar: 두 섹션 헤더("분석 히스토리", "즐겨찾기") + 각 섹션의 `sidebar-empty` 안내. "새로고침 시 초기화돼요." 부연.
   - 메인 영역: ticker-header 미선택 안내, SearchPanel + InputPanel, 결과 영역에 placeholder card("종목과 조건을 입력하면 분석 결과가 표시돼요.").
2. SearchPanel 입력 칸에 `app` 타이핑 → 자동완성 결과 `AAPL — Apple Inc. (USD)` → 키보드 ↓ + Enter 선택.
3. ticker-header 가 갱신: "AAPL · Apple Inc. (USD)" + 우측 `favorite-toggle` (기본, 별표 outline).
4. InputPanel 의 capital_amount 옆 보조 라벨이 `USD` 로 갱신. 1000 / 5 / 30 / 2 입력.
5. 분석 버튼 활성화 → 클릭. 라벨 "분석 중", `aria-busy="true"`, 결과 영역에 스켈레톤 5장 (Action/Brief/Feasibility+Horizons/RiskPlan/Warnings).
6. ~1초 후 응답. v4 위계로 표시:
   - ActionCard (전폭, `card-elevated`, "지금 매수" `display` + 보조 근거).
   - BriefCard (전폭, "BUY" `badge-accent`, 기술 신호 본문).
   - FeasibilityCard + HorizonsCard (2-col, 둘 다 정상).
   - RiskPlanCard (전폭, 표 + 가격 막대).
   - WarningsCard (빈 배열이면 hidden).
7. 사용자가 ticker-header 의 별표 클릭 → `favorite-toggle-active` 시각 전환. 사이드바 "즐겨찾기" 섹션에 `AAPL` 항목이 즉시 추가 (`sidebar-item`). 동시에 "분석 히스토리" 섹션에도 `AAPL` 이 자동 push (R8 PM 권고: mutation 성공 시 자동).
8. 사용자가 SearchPanel 에 `btc` 입력 → `BTC-USD` 선택 → 동일 흐름으로 분석. 사이드바 "분석 히스토리" 가 `[BTC-USD, AAPL]` 순(최근이 위, LRU).

### 시나리오 B — 모바일 drawer 진입 + 사이드바에서 재진입 (375px)

1. 사용자가 메인 진입. 화면이 그려진 시점:
   - navbar: 좌측 hamburger(☰) + wordmark, 우측 placeholder.
   - main-area: ticker-header(미선택), SearchPanel, InputPanel, 결과 placeholder.
   - sidebar 는 hidden.
2. AAPL 검색·분석 완료 (시나리오 A 의 2~6 단계 모바일 버전, 세로 스택). 별표 → 즐겨찾기 추가.
3. 새로고침 없이 BTC-USD 도 같은 흐름으로 분석. 히스토리에 `[BTC-USD, AAPL]`, 즐겨찾기에 `[AAPL]`.
4. 사용자가 hamburger 탭 → drawer slide-in.
   - drawer (304px) 내부: "분석 히스토리" 섹션 2 항목(BTC-USD, AAPL), "즐겨찾기" 1 항목(AAPL ★).
   - drawer 우측 scrim (text-strong @ 10% opacity).
5. 사용자가 사이드바의 `AAPL` 히스토리 항목 탭 → drawer 자동 닫힘 + 메인 영역의 ticker / 입력값이 `AAPL` 의 직전 분석값으로 복원. 즉시 결과 영역도 재계산 또는 캐시된 결과 표시 (frontend-dev 측 캐시 정책 — TanStack Query staleTime 활용 권장).
6. ESC 키 또는 scrim 탭으로도 drawer 닫힘 가능.
7. 모바일 → 데스크탑 리사이즈 (브라우저 dev tools): drawer state 가 자동 닫히고 sidebar 가 펼쳐진 상태로 즉시 전환. `useBreakpoint().isDesktop` 의존성 effect.

### 시나리오 C — 즐겨찾기 격상 (사이드바 히스토리에서)

1. 사용자가 분석을 5번 실행. 히스토리에 5개 ticker 가 LRU 로 누적.
2. 사이드바 히스토리 항목 우측의 `favorite-toggle` (작은 별표) 호버 / 탭 → 즐겨찾기로 격상.
3. 즐겨찾기 섹션에 즉시 추가. 히스토리에서도 그대로 유지 (격상은 중복 표시 허용 — 즐겨찾기는 "관심 종목" 의미, 히스토리는 "최근 본 것" 의미. 두 의미는 별개).
4. 같은 별표를 다시 탭하면 즐겨찾기 해제 (히스토리는 그대로).

---

## 핸드오프 명세 — 화면 상태별 컴포넌트·텍스트·토큰

### 글로벌 영역 상태

| 영역 | 상태 | 진입 조건 | 노출 컴포넌트 | 핵심 텍스트 | 사용 토큰 |
|---|---|---|---|---|---|
| **navbar (공통)** | 정상 | 모든 시점 | `navbar` shell + `navbar-brand` wordmark + 우측 placeholder div (40×40px) | "TradingSignalEngine" | `navbar`, `navbar-brand`, `{spacing.navbar-h}` |
| **navbar (모바일)** | 정상 | `useBreakpoint().isMobile === true` | + 좌측 `navbar-icon-button` (hamburger ☰) | aria-label: "메뉴 열기" | `navbar-icon-button`, `navbar-icon-button-hover` |
| **sidebar (데스크탑)** | 분석 히스토리 비어 있음 | `history.length === 0` | `sidebar-section-header` "분석 히스토리" + `sidebar-empty` | "분석을 실행하면 여기에 최근 종목이 쌓여요. 새로고침 시 초기화돼요." | `sidebar`, `sidebar-section-header`, `sidebar-empty` |
| **sidebar (데스크탑)** | 분석 히스토리 있음 | `history.length > 0` | `sidebar-section-header` + `sidebar-item` × N (최대 5) | 각 항목: ticker · 짧은 alias · 우측 별표 토글 | `sidebar-item`, `sidebar-item-hover`, `sidebar-item-active` (현재 ticker), `favorite-toggle` |
| **sidebar (데스크탑)** | 즐겨찾기 비어 있음 | `favorites.length === 0` | `sidebar-section-header` "즐겨찾기" + `sidebar-empty` | "관심 종목을 별표로 표시하면 여기에 모여요." | `sidebar-empty` |
| **sidebar (데스크탑)** | 즐겨찾기 있음 | `favorites.length > 0` | `sidebar-section-header` + `sidebar-item` × N | 각 항목: ticker · alias · 우측 `favorite-toggle-active` | `sidebar-item-active` (현재 ticker 일 때) |
| **drawer (모바일)** | 닫힘 | `isDrawerOpen === false` | (hidden, `transform: translateX(-100%)`) | — | — |
| **drawer (모바일)** | 열림 | `isDrawerOpen === true` | `drawer` panel (304px) + 상단 close 버튼(`navbar-icon-button`) + `<SidebarContent />` + 우측 `drawer-scrim` | aria-label: "메뉴 닫기" | `drawer`, `drawer-scrim` |
| **drawer (모바일)** | 닫는 중 | close 액션 | transition 200~240ms 후 hidden | — | — |

### 메인 영역 상태 (v3 무회귀 + v4 새 헤더)

| 영역 | 상태 | 진입 조건 | 노출 컴포넌트 | 핵심 텍스트 | 사용 토큰 |
|---|---|---|---|---|---|
| **ticker-header** | ticker 미선택 | `selectedTicker === null` | `ticker-header` + 안내 텍스트 (별표 버튼 hidden) | "분석할 종목을 검색해 주세요." | `ticker-header`, `{typography.body-md}`, `{colors.text-muted}` |
| **ticker-header** | ticker 선택 (비-즐겨찾기) | `selectedTicker !== null && !isFavorite` | + `favorite-toggle` (별표 outline) | ticker 라벨: "AAPL · Apple Inc. (USD)" | `ticker-header`, `favorite-toggle` |
| **ticker-header** | ticker 선택 (즐겨찾기) | `selectedTicker !== null && isFavorite` | + `favorite-toggle-active` (별표 채움) | 동일 + aria-pressed="true" | `ticker-header`, `favorite-toggle-active` |
| **결과 영역** | 분석 전 (Empty) | mutation 미실행 | `card` × `body-md` × `text-muted` placeholder | "종목과 조건을 입력하면 분석 결과가 표시돼요." | `card`, `{typography.body-md}`, `{colors.text-muted}` |
| **결과 영역** | 로딩 (Loading) | mutation `isPending = true` | 스켈레톤 5장 (Action/Brief/Feasibility+Horizons/RiskPlan/Warnings) | 버튼: "분석 중" + aria-busy | 스켈레톤: `{colors.surface-muted}` 배경 카드, `button-primary` |
| **결과 영역** | 정상 (Success) | mutation 성공 | ActionCard → BriefCard → (FeasibilityCard + HorizonsCard 2-col) → RiskPlanCard → WarningsCard | 각 블록 BE 응답 한글 매핑 (v3 무회귀) | `card-elevated`, `card`, `card-warn`, `badge-*`, `price-bar-*` |
| **결과 영역** | 사전 차단 (Validation) | `validateAnalyzePayload` 거절 | 해당 필드 `input-error` + helper | 한글 메시지 | `input-error`, `{typography.caption}`, `{colors.critical}` |
| **결과 영역** | feasibility 비현실 | `feasibility.label === "UNREALISTIC"` | FeasibilityCard `card-warn` + `badge-warn` "⚠ 비현실적인 목표예요" | v3 무회귀 카피 | `card-warn`, `badge-warn` |
| **결과 영역** | action vs brief 불일치 | `action.kind !== brief.action` | BriefCard 좌측 3px 보더 + `caption` "최종 권고와는 별개의 기술 신호예요." | v3 무회귀 카피 | `{colors.border-line}` 3px, `{typography.caption}` |
| **결과 영역** | whitelist miss | `ApiError.kind === 'whitelist_miss'` | `card` × `body-md` | "지원 종목이 아니에요. 현재는 AAPL 또는 BTC-USD 만 분석할 수 있어요." | `card`, `{typography.body-md}` |
| **결과 영역** | BE 4xx 매핑 가능 | `ApiError.kind === 'validation'` 또는 `'whitelist_miss'` | `card-critical` + `aria-live="polite"` | BE detail 한글 또는 errors.ts 매핑 | `card-critical` |
| **결과 영역** | BE 5xx · 네트워크 | `ApiError.kind === 'network'` 또는 `'server'` | `card-critical` + "다시 시도" 보조 버튼 | "엔진에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요." | `card-critical`, `button-primary` (보조) |

### 키보드 Tab 순서 (데스크탑 1280px)

`(1) navbar-brand` → `(2) navbar 우측 placeholder` (현재 빈 자리, 후속 PRD 까지는 skip 가능) → `(3) sidebar 분석 히스토리 항목 1~5` (각 항목 안에서 ticker 클릭 → 별표 토글) → `(4) sidebar 즐겨찾기 항목 1~N` → `(5) ticker-header 별표 토글` → `(6) SearchPanel 검색 입력` (자동완성 결과: ↑↓ + Enter, ESC 로 닫기) → `(7~10) InputPanel 4개 필드` (자본 → 수익률 → 기간 → 손실률) → `(11) 분석 버튼` → `(12+) 결과 영역 inline 버튼들` (에러 시 "다시 시도" 등).

### 키보드 Tab 순서 (모바일 375px)

`(1) hamburger 버튼` → (drawer 열림 시 drawer 내부로 focus trap) → `(2) navbar-brand` → `(3) ticker-header 별표 토글` (선택된 ticker 있을 때) → `(4) SearchPanel 검색 입력` → `(5~8) InputPanel 4개 필드` → `(9) 분석 버튼` → `(10+) 결과 영역`. drawer 열려 있는 동안에는 메인 영역 focus 차단(focus trap).

### ARIA · 접근성 (AC-16)

- **hamburger 버튼**: `aria-label="메뉴 열기"`, `aria-expanded={isDrawerOpen}`, `aria-controls="mobile-drawer"`.
- **drawer**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby={drawerTitleId}`, ESC 키 닫기, focus trap.
- **drawer-scrim**: `aria-hidden="true"`, `role="presentation"`.
- **sidebar 섹션**: `<nav aria-label="분석 히스토리">` 와 `<nav aria-label="즐겨찾기">` 로 의미 라벨링.
- **sidebar-item-active**: `aria-current="page"` (현재 선택된 ticker 항목).
- **favorite-toggle**: `role="button"`, `aria-pressed={isFavorite}`, `aria-label` 으로 상태 한글 안내.
- **색 강조 + 텍스트 라벨 병행**: feasibility 비현실 = 색(`card-warn`) + 텍스트("비현실적인 목표예요") + 이모지(⚠). 즐겨찾기 = 색(`accent-soft`) + 별표 채움(★/☆) + aria-pressed.

---

## OPEN QUESTION 결정 (디자이너 영역) — v4 layout-redesign

PRD `layout-redesign` §9 의 11건 중 디자이너 영역 6건. PM 권고와 다른 경우 prose 근거 표기.

| # | 질문 | v4 결정 | PM 권고 대비 |
|---|---|---|---|
| **R1** | 사이드바 정보 단위 ((a) 분석 히스토리 / (b) 즐겨찾기 / (c) 외부 링크) | **(a) + (b) 채택, (c) 는 후속 PRD 로 미룸**. PM 권고 그대로. 외부 링크는 썸네일·아이콘 디자인 부담이 큰데, 본 v4 의 layout 골격 단계에선 시각 noise 가 과해진다. 후속 PRD #2 component-compactness 머지 이후 또는 별도 외부 링크 PRD 에서 재개. | PM 권고 수용 |
| **R2** | navbar 요소 | **로고(wordmark "TradingSignalEngine") + 서비스명만**. 우측은 **placeholder 40×40px 자리만 미리 잡아둠** — 후속 PRD 의 다크모드 토글·사용자 메뉴·알림이 들어올 자리. 본 v4 에서 placeholder 는 빈 div + `aria-hidden="true"` 로 둔다. 시각 무게는 없지만 grid 자리는 점유 → 후속 PRD 진입 시 navbar 레이아웃이 흔들리지 않는다. 모바일에선 좌측에 hamburger 추가. | PM 권고 수용 |
| **R3** | 메인 영역 6블록 위계 | **PM 권고 수용**. ActionCard → BriefCard → (FeasibilityCard + HorizonsCard 2-col) → RiskPlanCard → WarningsCard. v3 의 데스크탑 배치(`feasibility + warnings`, `brief + risk_plan` 2-col 페어) 와 다른 위계임을 prose 의 Components 절에 근거 명시 — **인지 흐름 (결론 → 근거 → 보조 분석 → 실행 → 메타)** 우선 vs v3 의 **시각 유사도** 우선. | PM 권고 수용 |
| **R4** | 모바일 사이드바 | **hamburger drawer (overlay slide-in, 304px)**. PM 권고 그대로. tab bar 는 화면이 늘어날 때(설정·프로필 추가 시) 재검토. 좌측에서 우측으로 슬라이드인 + 우측 scrim(text-strong @ 10% opacity) + ESC/scrim/close 버튼 세 닫기 진입점 + focus trap + body scroll lock. | PM 권고 수용 |
| **R5** | sidebar-w / navbar-h / drawer-w 토큰값 | **`navbar-h: 60px`, `sidebar-w: 264px`, `drawer-w: 304px`** (+ `main-max-w: 1152px`). PRD §9.6 권장 범위의 중앙값. Layout 절에 채택 근거 prose 1단락 박음. | (디자이너 결정 영역) |
| **R6** | 즐겨찾기 add/remove UX | **메인 영역 ticker-header(선택된 ticker 영역) 의 별표 토글 + 사이드바 히스토리 항목 우측의 별표 토글 두 진입점**. PM 권고 수용. ticker-header 가 1차 진입점(분석 결과 확인 후 자연스럽게 격상), 사이드바 히스토리가 2차 진입점(과거 항목 격상). SearchPanel 단계 별표는 도입하지 않음 — 검색 시점은 "탐색" 단계이지 "관심 표명" 단계가 아님. | PM 권고 수용 |

PRD §9 의 나머지 5건(R7~R11) 은 frontend-dev / PM / DevOps 영역:

- R7 (분석 히스토리·즐겨찾기 상태 관리 방식) — frontend-dev 결정 (React Context 권장, Zustand 미도입).
- R8 (히스토리 push 시점) — frontend-dev 결정 (mutation 성공 시 자동 + LRU 5건, PM 권고 수용).
- R9 (즐겨찾기 add/remove UX 진입점) — R6 와 동일 (디자이너 영역에서 답함).
- R10 (워킹트리 SESSION_NOTES 처리) — frontend-dev / PM 영역.
- R11 (다음 작업 우선순위) — 사용자 결정.

---

## lint 메모 (v4)

본 v4 (`layout-redesign`) 는 v3 의 토큰을 **무수정 계승** 하며 다음만 추가·갱신:

- **front matter `colors` 절**: v3 의 13 토큰 그대로 복사.
- **front matter `typography` 절**: v3 의 10 키 + 신규 `nav-brand`, `sidebar-section` 2 키 추가. 기존 키 무변경.
- **front matter `spacing` 절**: v3 의 6 키 + 신규 `navbar-h`(60px), `sidebar-w`(264px), `drawer-w`(304px), `main-max-w`(1152px) 4 키 추가.
- **front matter `rounded` 절**: v3 의 `sm`(8px), `pill`(999px) + 신규 `md`(12px, drawer 우측 모서리 전용) 1 키 추가.
- **front matter `breakpoints` 절**: v3 그대로 (Tailwind 기본 정합).
- **front matter `components` 절**: v3 의 21 합성 토큰 그대로 + 신규 16 합성 토큰 추가:
  - 글로벌 영역: `navbar`, `navbar-brand`, `navbar-icon-button`, `navbar-icon-button-hover`
  - 사이드바: `sidebar`, `sidebar-section-header`, `sidebar-item`, `sidebar-item-hover`, `sidebar-item-active`, `sidebar-empty`
  - drawer: `drawer`, `drawer-scrim`
  - 메인 영역: `main-area`, `ticker-header`
  - 즐겨찾기: `favorite-toggle`, `favorite-toggle-active`
- **본문 절**: Overview / Colors (v3 무회귀 요약 + v4 사용처 보강) / Typography (신규 2 키 근거) / Layout (3-section shell + 신규 layout 토큰 근거 + 데스크탑·모바일·태블릿 정책 + 반응형 분기) / Elevation & Depth (drawer 그림자 정책) / Shapes (rounded.md 근거) / Components (글로벌·사이드바·drawer·메인·결과·입력 6 그룹) / Do's and Don'ts (v3 무회귀 + v4 신규).
- **유저 시나리오**: 데스크탑 해피 패스 / 모바일 drawer 진입 / 즐겨찾기 격상 3 시나리오.
- **핸드오프 명세**: 글로벌 영역 상태 표 + 메인 영역 상태 표 (v3 무회귀) + 키보드 Tab 순서 + ARIA.
- **OPEN QUESTION**: R1~R6 결정 표.

**무회귀**: v3 의 colors / typography 기존 키 / spacing 기존 키 / rounded 기존 키 / breakpoints / 21 composite 모두 그대로. frontend-dev 측의 `tailwind.theme.json` 재생성은 신규 spacing·typography·rounded·components 키만 추가되며 v3 키는 무변경 → design:sync 결정적 무회귀.

산출 직전 `npx @google/design.md lint docs/design/layout-redesign.md` 통과 목표:
- errors: 0
- warnings: 0
- info: 1 (token summary)

`contrast-ratio` 룰 회피 — drawer-scrim 컴포넌트는 textColor 정의를 의도적으로 생략 (스크림은 텍스트 호스팅 안 함). `orphaned-tokens` 룰 회피 — 13 컬러 토큰 + 11 spacing / 3 rounded / 12 typography 모두 적어도 한 컴포넌트에서 참조. `section-order` 룰 회피 — Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts 순서 고정.
