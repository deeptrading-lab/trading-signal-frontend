---
version: alpha
name: polish-followups
description: Trading Signal Frontend — PR #22 / #23 reviewer nit 일괄 흡수. v5 component-compactness 의 시각 언어·dimension·합성 토큰 전체 무수정 계승. 본 v6 는 components 절의 input-suffix 단위별 너비 + dropdown-panel ARIA 명세만 보강.
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
  button-sm:
    fontFamily: Arial
    fontSize: 13px
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
  label-sm:
    fontFamily: Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.25
  input-suffix:
    fontFamily: Arial
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.2
    fontFeature: "tnum"
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
  input-h: 36px
  input-px: 12px
  input-py: 8px
  input-pr-suffix: 44px
  input-pr-suffix-sm: 36px
  input-pr-suffix-md: 44px
  input-pr-suffix-lg: 56px
  dropdown-item-h: 34px
  dropdown-item-py: 6px
  button-primary-h: 40px
  button-sm-h: 32px
  hit-area-min: 40px
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
    typography: "{typography.body-sm}"
    padding: "{spacing.input-py}"
    height: "{spacing.input-h}"
  input-error:
    backgroundColor: "{colors.critical-soft}"
    textColor: "{colors.critical}"
    rounded: "{rounded.sm}"
    typography: "{typography.body-sm}"
    padding: "{spacing.input-py}"
    height: "{spacing.input-h}"
  input-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.label-sm}"
    padding: 0px
  input-helper:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  input-helper-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.critical}"
    typography: "{typography.caption}"
    padding: 0px
  input-suffix:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.input-suffix}"
    padding: 0px
  dropdown-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 4px
  search-result-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    typography: "{typography.body-sm}"
    padding: "{spacing.dropdown-item-py}"
    height: "{spacing.dropdown-item-h}"
  search-result-item-focus:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    typography: "{typography.body-sm}"
    padding: "{spacing.dropdown-item-py}"
    height: "{spacing.dropdown-item-h}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    typography: "{typography.button}"
    padding: 10px
    height: "{spacing.button-primary-h}"
  button-primary-disabled:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    typography: "{typography.button}"
    padding: 10px
    height: "{spacing.button-primary-h}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    typography: "{typography.button-sm}"
    padding: 8px
    height: "{spacing.button-sm-h}"
  button-secondary-hover:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    typography: "{typography.button-sm}"
    padding: 8px
    height: "{spacing.button-sm-h}"
  button-icon:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 6px
    height: "{spacing.button-sm-h}"
    width: "{spacing.button-sm-h}"
  button-icon-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 6px
    height: "{spacing.button-sm-h}"
    width: "{spacing.button-sm-h}"
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
    height: "{spacing.hit-area-min}"
    width: "{spacing.hit-area-min}"
  navbar-icon-button-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: "{spacing.hit-area-min}"
    width: "{spacing.hit-area-min}"
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
    padding: 8px
    height: 36px
  sidebar-item-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 36px
  sidebar-item-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 36px
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
    height: "{spacing.button-sm-h}"
    width: "{spacing.button-sm-h}"
  favorite-toggle-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: 6px
    height: "{spacing.button-sm-h}"
    width: "{spacing.button-sm-h}"
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

# polish-followups 디자인 가이드 (v6)

## Overview

본 v6 는 v5 (`docs/design/component-compactness.md`) 가 정착시킨 **컴팩트 톤 컴포넌트 시스템** — input 36px / dropdown-item 34px / button-primary 40px / sidebar-item 36px / input 내부 우측 absolute suffix / outside-click 닫힘 — 을 **무수정 계승** 한다. v5 의 colors 13 / typography 15 / rounded 3 / spacing 19 / breakpoints 4 / components 46 모든 토큰은 한 글자도 손대지 않았다.

본 v6 의 변경은 두 가지 polish 영역에 국한된다 — (a) **input-suffix 의 단위별 너비 토큰화** (PRD §3.2 / §9.1 의 A2), (b) **dropdown-panel 의 ARIA 패턴 명세 보강** (PRD §3.1 / §9.3 의 A1 + 키보드 navigation). 두 변경 모두 토큰 자체의 시각 언어는 무회귀 — 색·라운드·타이포·dimension 기조 모두 v5 그대로다. v6 는 (a) 신규 spacing 3 키 (`input-pr-suffix-sm` 36px / `input-pr-suffix-md` 44px / `input-pr-suffix-lg` 56px) 추가, 그리고 (b) prose 단위에서 ARIA · 키보드 navigation · 단위별 너비 매핑 가이드만 보강한다.

배경은 PRD §1.2 — PR #22 reviewer 가 "input suffix 영역 너비가 단위(`USD` / `%` / `일` / 향후 `KRW`)별 자연 너비 가변에 맞지 않을 수 있다" 와 "dropdown 열린 상태의 ARIA 완성도 (listbox / option / combobox 패턴 + `aria-activedescendant` + 키보드 navigation)" 두 nit 를 후속 권고로 남긴 점. 본 v6 는 두 nit 의 디자이너 영역만 흡수하고, v5 의 다른 모든 토큰·시각 명세를 그대로 둔다.

**무회귀 — v5 의 시각 언어·dimension·합성 토큰 전부 보존**. colors 13 키, rounded 3 키, breakpoints 4 키, typography 15 키, components 46 키는 한 글자도 손대지 않았다. v5 의 기존 `spacing.input-pr-suffix: 44px` 키도 **호환 보존** 한다 (v5 시점 코드 호출처 무회귀). v6 가 추가한 신규 spacing 3 키 (`input-pr-suffix-sm` / `input-pr-suffix-md` / `input-pr-suffix-lg`) 는 단위별 분기를 표현하기 위한 보조 토큰이며, `input-pr-suffix-md` 는 의도적으로 기존 `input-pr-suffix` 와 동일 값(44px) — md 가 USD / KRW 같은 3글자 단위의 default 라는 의미 명시.

본 v6 의 톤 의도는 **"기존 시각 언어 보존 + a11y · 토큰 정합 보강"**. 사용자 동선·시각 회귀 0건을 유지하면서, 키보드·스크린리더 사용자 경험과 단위별 너비 정합을 한 단계 끌어올린다.

## Colors

v5 의 13 토큰 **완전 무수정 계승**. 키 이름·hex·사용처 모두 그대로. 본 v6 는 색을 추가하지도, 변경하지도, 재해석하지도 않는다.

v5 의 시그니처 색 사용 원칙 (Signature Slate `primary` 의 "한 화면에 두 지점 + navbar wordmark 1회" 룰) 도 무회귀. 본 v6 가 prose 단위에서 보강하는 dropdown ARIA · input-suffix 단위 너비는 색에 영향 0건. WCAG AA 대비 검증도 v5 표 그대로 유지된다 — `input-suffix` 의 `text-muted` × `surface-muted` 5.29:1, `search-result-item-focus` 의 `primary` × `accent-soft` 9.85:1 모두 v5 결과 그대로.

## Typography

v5 의 15 키 **완전 무수정 계승**. 본 v6 는 typography 키를 추가하지도, 기존 키 값을 변경하지도 않는다.

`input-suffix` (13px / 400 / 1.2, `tnum`) 는 v5 가 도입한 키로 본 v6 의 단위별 너비 토큰 (`input-pr-suffix-sm` / `-md` / `-lg`) 의 기준 typography 다. 단위 문자열의 자릿수가 1자 (`%` / `일`) 든 3자 (`USD` / `KRW`) 든 동일 typography 로 표시되며, 너비 차이는 padding 영역에서 흡수된다 (Components 절 참조).

## Layout

v5 의 layout 가이드 전체 무수정 계승. 3-section shell (navbar 60px + sidebar 264px + main), 데스크탑·모바일·태블릿 정책, drawer slide-in, 결과 6블록 위계 모두 v5 그대로.

v6 가 spacing front matter 에 추가한 dimension 토큰 **3 키**:

- **`input-pr-suffix-sm: 36px`** — 단위 문자열이 1글자 (`%`, `일`) 인 필드의 input 우측 padding. 단위 폭 (`%` 약 10px, `일` 약 14px) + 우측 여백 12px + 안전 마진 ~10px = 36px. v5 의 `input-pr-suffix` 44px 대비 8px 축소 — 1자 단위 필드 (수익률 `%`, 기간 `일`, 최대 손실 `%`) 에서 input 본문 영역이 8px 더 넓어진다. 긴 숫자 (`1000` 같은 4자리 정수, `99.99` 같은 소수) 도 단위와 충돌 없이 시각적으로 자연.
- **`input-pr-suffix-md: 44px`** — 단위 문자열이 2~3글자 (`USD`, 향후 `KRW`) 인 필드의 input 우측 padding. v5 의 기존 `input-pr-suffix: 44px` 와 **동일 값** — md 가 default 임을 명시. 단위 폭 (`USD` 약 24px) + 우측 여백 12px + 안전 마진 ~8px = 44px. 자본 필드 (`1,000,000` 등 7자리 정수) 도 단위와 충돌 없음.
- **`input-pr-suffix-lg: 56px`** — 향후 4글자 이상 단위 또는 단위 + 보조 기호 (예: `만원`, `bps`, `USDT`) 대비 사전 토큰. 본 PRD 시점에 사용처는 없지만, 토큰만 미리 정의해두면 단위 추가 시 디자이너·frontend-dev 가 토큰 키 분기만으로 흡수 가능. lint 의 `orphaned-tokens` 룰은 spacing 토큰을 직접 검사하지 않으므로 미사용 상태에서도 warning 없음 (단, prose 에 도입 근거 명시 — 본 절).

**기존 `input-pr-suffix: 44px` 호환 보존**. v5 시점에 합성 토큰 또는 frontend-dev 측 클래스가 이 키를 참조하고 있을 가능성을 고려해 v6 는 이 키를 **삭제하지 않는다**. 신규 분기 토큰 (`-sm` / `-md` / `-lg`) 도입과 별개로 기존 키는 그대로 살려둔다 — `input-pr-suffix === input-pr-suffix-md` 의미적 동치. frontend-dev 가 InputPanel 의 단위별 분기 클래스를 도입하면서 점진적으로 `input-pr-suffix-md` 키로 마이그레이션 가능.

### 단위별 너비 토큰 매핑 표

| 단위 문자열 | 글자 수 | 적용 토큰 | 너비 값 | 적용 필드 (현재 PRD 시점) |
|---|---|---|---|---|
| `%` | 1자 | `{spacing.input-pr-suffix-sm}` | 36px | 수익률, 최대 손실 |
| `일` | 1자 | `{spacing.input-pr-suffix-sm}` | 36px | 기간 |
| `USD` | 3자 | `{spacing.input-pr-suffix-md}` | 44px | 자본 (default) |
| `KRW` (향후) | 3자 | `{spacing.input-pr-suffix-md}` | 44px | (도입 시) 자본 |
| `만원` / `bps` / `USDT` (향후 후보) | 2~4자 + 폭 가변 | `{spacing.input-pr-suffix-lg}` | 56px | (도입 시 단위별 결정) |

frontend-dev 는 InputPanel 의 각 필드에 단위 문자열을 받아 글자 수 또는 단위 enum 으로 분기 → 우측 padding 클래스를 결정한다. 분기 로직은 frontend-dev 자율 (예: 단위 문자열 길이 ≤ 1 → sm, ≤ 3 → md, 그 외 → lg, 또는 단위 enum 별 명시 분기). 본 v6 는 토큰 매핑 표만 제공하고 분기 알고리즘은 명시하지 않는다.

## Elevation & Depth

v5 의 평면 디자인 기조 **무회귀**. navbar / sidebar / 카드는 그림자 없음, drawer 만 단일 그림자, `dropdown-panel` 도 그림자 없음 (input 의 보더와 자연 분리) — v5 그대로.

본 v6 는 elevation 정책에 손대지 않는다. 키보드 navigation 도입으로 dropdown 옵션의 focus 톤은 v5 의 `search-result-item-focus` (`accent-soft` 배경 + `primary` 텍스트) 무회귀 — 그림자 없이 색 전환만으로 focus 신호.

## Shapes

v5 의 3 키 (`rounded.sm` 8px, `rounded.md` 12px, `rounded.pill` 999px) **무수정 계승**. v6 는 신규 라운드 토큰 도입하지 않는다.

## Components

본 v6 가 components 절의 합성 토큰 정의 (front matter) 를 **변경한 키는 0개** 다. v5 의 46 합성 토큰 모두 키 이름·속성·참조 토큰 한 글자 변경 없이 보존. 본 절은 두 컴포넌트의 **prose 명세** 만 보강한다 — (a) `input-suffix` 의 단위별 너비 매핑 가이드, (b) `dropdown-panel` / `search-result-item` 의 ARIA · 키보드 navigation 명세.

### input-suffix (단위별 너비 가이드 보강)

v5 의 `input-suffix` 합성 토큰은 그대로다 — typography `{typography.input-suffix}` (13px / 400 / 1.2, `tnum`), textColor `text-muted`, backgroundColor `surface-muted`, padding 0. 시각 명세 (input 내부 우측 absolute, `pointer-events: none`, `aria-hidden="true"`) 도 v5 무회귀.

v6 가 보강하는 영역은 **suffix 자체의 합성 토큰** 이 아니라 **suffix 가 붙는 input 의 우측 padding** 이다 — 단위별 분기 spacing 토큰. v5 에서는 모든 단위가 동일 44px 우측 padding 을 썼고, 1자 단위 (`%`, `일`) 의 필드에서 본문 텍스트 우측 여백이 과한 시각 불균형이 있었다. v6 는 단위 글자 수에 따라 sm (36px) / md (44px) / lg (56px) 세 분기로 정합한다.

#### Width — 단위별 토큰 매핑

| 단위 (예시) | 토큰 참조 | px 값 | 사유 |
|---|---|---|---|
| `%`, `일` | `{spacing.input-pr-suffix-sm}` | 36px | 1자 단위 — 우측 여백 과잉 해소. v5 의 44px 대비 8px 축소. |
| `USD`, `KRW` | `{spacing.input-pr-suffix-md}` | 44px | 3자 단위 default — v5 의 `input-pr-suffix` 와 동치. |
| (향후 4자+ 단위) | `{spacing.input-pr-suffix-lg}` | 56px | 4글자 이상 또는 보조 기호 동반 단위 사전 대비. 본 PRD 시점 사용처 없음 (토큰 사전 정의). |

frontend-dev 핸드오프 — InputPanel 의 각 필드 wrapper 에 단위 분기 클래스 적용:

```tsx
// 단위 글자 수 또는 enum 으로 분기
const suffixWidthClass =
  unit === '%' || unit === '일'
    ? 'pr-[var(--spacing-input-pr-suffix-sm)]'   // 36px
    : unit === 'USD' || unit === 'KRW'
    ? 'pr-[var(--spacing-input-pr-suffix-md)]'   // 44px
    : 'pr-[var(--spacing-input-pr-suffix-lg)]';  // 56px (향후 단위)

<input className={cn('input', suffixWidthClass)} />
```

또는 Tailwind theme 등록 토큰 클래스 (`pr-input-pr-suffix-sm` / `-md` / `-lg`) 활용. 분기 알고리즘은 frontend-dev 자율 — 단위 문자열 길이 기반·enum 기반 둘 다 허용.

v5 의 기존 `pr-[var(--spacing-input-pr-suffix)]` 클래스는 호환 보존 — 단위 분기 없이 default 44px 를 쓰는 호출처가 있으면 그대로 동작. v6 의 신규 분기 토큰으로의 마이그레이션은 점진적 (PR #22 시점 코드 무회귀, 본 PRD 가 분기 클래스 도입).

#### 시각 명세 (v5 무회귀)

- suffix 노드: `position: absolute`, `right: 12px` (= `{spacing.input-px}`), 수직 가운데 정렬.
- **`pointer-events: none`** — suffix 클릭이 input focus 를 방해하지 않는다.
- **`aria-hidden="true"`** — 스크린리더는 라벨 텍스트 (예: "자본 (USD)") 에서 단위를 읽는다. suffix 가 별도로 읽히면 중복.
- 에러 상태 (`input-error`) 에서도 suffix 톤·위치 무변경 — 단위는 정/오 상태와 무관.

#### 유저 시나리오 — 단위별 시각 결과

- "자본" 필드 (USD): input 본문 영역 (좌측 12px ~ 우측 44px 사이) 에서 `1,000,000` 표시. 우측에 `USD` suffix 가 12px 여백 두고 표시. 본문과 suffix 사이 충돌 없음.
- "수익률" 필드 (%): input 본문 영역 (좌측 12px ~ 우측 36px 사이) 에서 `5` 또는 `5.5` 표시. v6 에서 우측 영역이 8px 좁아졌지만 1자 단위 `%` 와 본문 사이 안전 마진 충분. v5 시점 `5` 한 자릿수 입력 시 우측 공백이 과해 보이던 시각 불균형 해소.
- "기간" 필드 (일): 동일 패턴. `30` + 우측 `일` suffix. 36px 우측 padding 으로 정합.

### dropdown-panel · search-result-item (ARIA · 키보드 navigation 명세 보강)

v5 의 `dropdown-panel` / `search-result-item` / `search-result-item-focus` 합성 토큰은 그대로다 — 색·rounded·padding·height 한 글자 변경 없음. 시각 명세 (input 바로 아래 absolute, 그림자 없음, 보더 1px solid `border-line`) 도 v5 무회귀.

v6 가 보강하는 영역은 **ARIA 패턴의 완성도** 와 **키보드 navigation** 두 가지다. v5 의 핸드오프에 ARIA 일부 (`role="listbox"` / `role="option"` / `aria-selected`) 가 명시돼 있었으나, PR #22 reviewer 가 "combobox 패턴의 완성도 (`aria-expanded` + `aria-controls` + `aria-activedescendant` 의 정합) + 키보드 navigation (↑/↓/Enter/ESC) 동작 명세" 를 후속 권고로 남겼다. v6 는 이를 prose 단위에서 정식 명세화한다.

#### ARIA — combobox + listbox + option 풀 패턴

ARIA 1.2 의 **combobox 패턴 (autocomplete-list variant)** 을 채택. 세 노드가 한 세트로 묶인다:

| 노드 | role | 필수 aria-* | 사유 |
|---|---|---|---|
| 검색 input | `combobox` | `aria-expanded={isOpen}`, `aria-controls={listboxId}`, `aria-autocomplete="list"`, `aria-activedescendant={focusedOptionId || undefined}` | input 이 검색어를 받고 listbox 와 논리적으로 연결됨을 명시. `aria-activedescendant` 는 dropdown 의 현재 focus 옵션 id 를 가리켜 스크린리더가 옵션 이동을 announce. |
| dropdown 컨테이너 (ul) | `listbox` | `aria-label="검색 결과"` (또는 visually-hidden label 연결) | 옵션 묶음의 의미 명시. |
| 옵션 (li) | `option` | `aria-selected={i === focusedIndex}`, `id={optionId(i)}` (`activedescendant` 타겟용) | 한 옵션의 상태 + id 명시. |

DOM 구조 (frontend-dev 핸드오프):

```tsx
<div className="relative" ref={wrapperRef}>
  <input
    className="input pr-input-px"
    role="combobox"
    aria-expanded={isOpen}
    aria-controls={listboxId}
    aria-autocomplete="list"
    aria-activedescendant={
      isOpen && focusedIndex >= 0 ? optionId(focusedIndex) : undefined
    }
    onKeyDown={handleKey}
  />
  {isOpen && (
    <ul
      id={listboxId}
      role="listbox"
      aria-label="검색 결과"
      className="dropdown-panel absolute left-0 right-0 top-full mt-1"
    >
      {results.map((r, i) => (
        <li
          key={r.ticker}
          id={optionId(i)}
          role="option"
          aria-selected={i === focusedIndex}
          className={cn(
            i === focusedIndex
              ? 'search-result-item-focus'
              : 'search-result-item'
          )}
          onMouseDown={(e) => { e.preventDefault(); selectTicker(r); }}
        >
          {r.ticker} · {r.alias}
        </li>
      ))}
    </ul>
  )}
</div>
```

- `optionId(i)` 는 안정 id 생성 함수 (예: `` `search-result-${i}` ``). React 의 `useId()` 와 인덱스를 조합해 listbox 내부에서 유일.
- `aria-activedescendant` 는 dropdown 이 열려 있고 한 옵션이 focus 상태일 때만 옵션 id 를 가리킨다. dropdown 이 닫혀 있거나 focus 없는 상태에서는 `undefined` (attribute 자체 제거) — 잘못된 id 참조로 인한 screen reader silence 회피.
- 옵션 자체는 `tabIndex` 를 받지 않는다 — focus 는 항상 검색 input 에 머무르고, 옵션 시각 focus 는 `aria-activedescendant` + `search-result-item-focus` 톤으로만 표현. WAI-ARIA Authoring Practices 의 combobox 패턴 정합.

#### Keyboard Navigation — ↑ / ↓ / Enter / ESC / Tab

v5 의 outside-click 닫기 명세 (mousedown / pointerdown / touchstart + ESC + Tab) 는 그대로 유지. v6 가 보강하는 것은 **dropdown 이 열린 상태에서의 키보드 옵션 이동** 동작.

| 키 | 진입 조건 | 동작 | 사유 |
|---|---|---|---|
| ↓ (ArrowDown) | dropdown 열림 + 결과 ≥ 1 | `focusedIndex = (focusedIndex + 1) % results.length`. focusedIndex 0 이상일 때만 wrap-around. 초기 -1 (focus 없음) 에서 ↓ 누르면 0 (첫 옵션). | wrap-around 로 키보드 사용자가 마지막 옵션에서 첫 옵션으로 자연스럽게 이동. |
| ↑ (ArrowUp) | dropdown 열림 + 결과 ≥ 1 | `focusedIndex = focusedIndex <= 0 ? results.length - 1 : focusedIndex - 1`. 초기 -1 에서 ↑ 누르면 마지막 옵션. | 동일 wrap-around. |
| Enter | dropdown 열림 + `focusedIndex >= 0` | 해당 옵션 선택 → ticker dispatch + dropdown unmount + focus 검색 input 유지. | 선택 후 다음 입력 (예: InputPanel 4 필드) 으로 Tab 이동이 자연스럽게 이어지도록. |
| Enter | dropdown 열림 + `focusedIndex === -1` (아직 옵션 focus 안 함) | 동작 없음 (또는 첫 옵션 선택 — frontend-dev 결정). default 권고는 **동작 없음** — 사용자가 명시적으로 ↓ 눌러 옵션을 선택한 뒤 Enter 를 누르도록 유도. | 의도하지 않은 선택 방지. |
| ESC | dropdown 열림 (focus 위치 무관) | dropdown unmount + `focusedIndex` 리셋 (-1). focus 는 검색 input 에 유지. 검색 input 값은 유지 (사용자가 다시 타이핑 가능). | v5 outside-click 명세 무회귀 + 키보드 사용자의 명시적 닫기 진입점. |
| Tab / Shift+Tab | dropdown 열림 + 검색 input focus | wrapper 의 onBlur 가 wrapper 밖으로 focus 이동 감지 → dropdown unmount. wrapper 안 다른 요소로의 이동 (예: 옵션 li, 단 본 v6 는 옵션 tabIndex 부여 안 함) 은 닫지 않음. | v5 outside-click 명세 무회귀. |
| ↑ / ↓ | dropdown 닫힘 | 동작 없음. 만약 검색 input 에 값이 있고 결과가 있는데 dropdown 이 닫힌 상태라면, frontend-dev 자율로 ↓ 키에 dropdown 재오픈을 부여 가능 (default 비권고 — 명시적 클릭/타이핑으로만 재오픈). | 의도하지 않은 dropdown 재오픈 방지. |

#### 키보드 + 스크린리더 announce 흐름

VoiceOver (macOS) / NVDA (Windows) 의 expected announcement:

1. 사용자가 검색 input 에 focus → "검색 결과 입력란, combobox, 비어 있음" (또는 동등 한국어 announce).
2. `app` 타이핑 → "검색 결과 입력란, 편집 가능, app, 검색 결과 1개" (input 의 value 변경 + listbox 의 옵션 수 announce).
3. ↓ 누름 → `aria-activedescendant` 가 첫 옵션 id 로 변경 → "AAPL · Apple Inc., 1 of 1, 선택됨" (option 의 텍스트 + 위치 + `aria-selected` 상태).
4. Enter 누름 → 선택 + dropdown unmount → focus 유지된 검색 input 에서 "검색 결과 입력란, 편집 가능, AAPL" announce.
5. ESC 누름 (4 직전 시점 변형) → dropdown unmount → "검색 결과 입력란, 편집 가능, app, 결과 0개" (listbox 닫힘 announce, 입력값은 유지).

v6 는 위 announce 흐름이 ARIA 패턴만으로 자연스럽게 일어나도록 `role` / `aria-*` 매핑을 명시한다. 추가 visually-hidden 라이브 영역 (`aria-live="polite"`) 은 도입하지 않음 — combobox 패턴이 표준으로 처리.

### 다른 합성 토큰 — v5 무회귀

`input`, `input-error`, `input-label`, `input-helper`, `input-helper-error`, `button-primary`, `button-primary-disabled`, `button-secondary`, `button-secondary-hover`, `button-icon`, `button-icon-hover`, `navbar-icon-button`, `favorite-toggle`, `sidebar-item`, `sidebar-item-hover`, `sidebar-item-active`, `card`, `card-elevated`, `card-warn`, `card-critical`, `badge-*`, `price-bar-*`, `ticker-header`, `main-area`, `shell`, `drawer`, `drawer-scrim`, `navbar`, `navbar-brand`, `sidebar`, `sidebar-section-header`, `sidebar-empty` — 모두 v5 합성 토큰 그대로. 본 v6 가 손대지 않는다.

## Do's and Don'ts

v5 의 Do's and Don'ts 전체 무회귀. 본 v6 가 추가하는 항목:

### v6 신규 — 단위별 너비 + ARIA · 키보드 navigation

- ✅ input 의 우측 padding 은 단위 문자열에 따라 분기한다 — 1자 (`%`, `일`) → `{spacing.input-pr-suffix-sm}` (36px), 2~3자 (`USD`, `KRW`) → `{spacing.input-pr-suffix-md}` (44px), 4자 이상 → `{spacing.input-pr-suffix-lg}` (56px).
- ✅ 단위 분기는 frontend-dev 측에서 단위 문자열 길이·enum 으로 결정한다. 디자이너는 토큰 매핑 표만 제공한다 (Components > input-suffix > Width 절).
- ✅ v5 의 기존 `{spacing.input-pr-suffix}` 키는 호환 보존 — 단위 분기 없이 default 44px 를 쓰는 호출처는 그대로 동작한다 (`input-pr-suffix === input-pr-suffix-md` 의미적 동치).
- ✅ dropdown 의 검색 input 은 항상 `role="combobox"` + `aria-expanded` + `aria-controls={listboxId}` + `aria-autocomplete="list"` + `aria-activedescendant` 5 속성을 모두 명시한다. 5 속성 중 하나라도 누락되면 combobox 패턴 깨짐.
- ✅ dropdown 의 listbox (`<ul>`) 는 `role="listbox"` + `aria-label="검색 결과"`. 옵션 (`<li>`) 은 `role="option"` + `aria-selected` + 안정 `id`. `id` 는 검색 input 의 `aria-activedescendant` 타겟.
- ✅ dropdown 의 옵션 focus 이동은 키보드 ↑/↓ (wrap-around), 선택은 Enter, 닫기는 ESC + outside-click + Tab (wrapper 밖 focus 이동). 다섯 진입점 모두 frontend-dev 자체 구현.
- ✅ dropdown 옵션은 `tabIndex` 를 받지 않는다 — focus 는 항상 검색 input 에 머무르고, 옵션 시각 focus 는 `aria-activedescendant` + `search-result-item-focus` 톤으로만.
- ✅ `aria-activedescendant` 는 dropdown 이 열려 있고 옵션 focus 가 있을 때만 옵션 id 를 가리킨다. 닫혀 있거나 focus 없는 상태에서는 attribute 자체 제거.
- ❌ input 의 우측 padding 을 모든 단위에 동일 44px 로 두지 않는다 — 1자 단위 필드에서 우측 여백 과잉으로 시각 불균형.
- ❌ dropdown 옵션 자체에 `tabIndex={0}` 을 주지 않는다 — focus 가 input 과 옵션 사이를 오가면 Tab 키 시 wrapper 외부 이동 감지가 어려워지고, 키보드 사용자 경험이 깨진다.
- ❌ dropdown 의 키보드 navigation 을 신규 라이브러리 (downshift, react-aria, headless-ui) 로 우회하지 않는다. v5 outside-click 명세와 동일한 자체 구현 정책 무회귀.
- ❌ `aria-activedescendant` 가 가리키는 옵션 id 를 React 의 key 와 혼동하지 않는다. id 는 DOM 속성, key 는 React 내부 재조정 식별자 — 서로 다른 책임.
- ❌ 키보드 ↑/↓ 동작에 wrap-around 를 끄지 않는다 (첫 옵션에서 ↑ 누르면 마지막 옵션으로, 마지막 옵션에서 ↓ 누르면 첫 옵션으로). 사용자의 옵션 탐색 경로 단축.
- ❌ Enter 키에 의도하지 않은 선택을 부여하지 않는다 — `focusedIndex === -1` (옵션 focus 없음) 일 때 Enter 는 동작 없음 (default 권고).

---

## 유저 시나리오

### 시나리오 A — 단위별 컴팩트 폼 입력 (1280px / 375px 공통)

1. 사용자가 메인 진입 → ticker 선택 후 InputPanel 4 필드 표시.
2. 첫 필드 "자본 (USD)" — 라벨 위, input 안에 `1,000,000` 타이핑. 우측 absolute suffix `USD` (회색 톤). input 우측 padding `{spacing.input-pr-suffix-md}` (44px) — 7자리 정수와 3자 단위 사이 안전 마진 충분. 시각 정합.
3. 두 번째 필드 "수익률 (%)" — 라벨, input 안에 `5` 또는 `5.5` 타이핑. 우측 suffix `%` (1자). input 우측 padding `{spacing.input-pr-suffix-sm}` (36px) — v5 의 44px 대비 8px 좁아졌고, 짧은 숫자 + 1자 단위의 시각 불균형 해소.
4. 세 번째 "기간 (일)" — input `30` + 우측 suffix `일` (1자). 우측 padding 36px (sm). 수익률 필드와 동일 정합.
5. 네 번째 "최대 손실 (%)" — input `2` + 우측 suffix `%` (1자). 우측 padding 36px (sm). 수익률 필드와 동일 정합.
6. 네 필드 세로 총합 v5 무회귀 (340px). 우측 padding 만 단위별 분기 — 시각 회귀 영역은 1자 단위 필드의 본문 우측 여백 축소 (8px) 뿐. QA 양 뷰포트 무회귀 검증.

### 시나리오 B — 키보드 + 스크린리더 ticker 검색 흐름

1. 사용자가 Tab 으로 SearchPanel 의 검색 input 진입. VoiceOver/NVDA announce — "검색 결과 입력란, combobox" (`role="combobox"` + 비어 있는 listbox).
2. `app` 타이핑. dropdown 펼침 (`isOpen = true`, `aria-expanded="true"`). listbox 안 옵션 1개 — `AAPL · Apple Inc.`. announce — "검색 결과 입력란, 편집 가능, app, 검색 결과 1개".
3. ↓ 누름. `focusedIndex = 0`. 첫 옵션이 `search-result-item-focus` 톤 (옅은 슬레이트 배경). `aria-activedescendant` 가 옵션 id (예: `search-result-0`) 를 가리킴. announce — "AAPL · Apple Inc., 1 of 1, 선택됨".
4. ↓ 다시 누름. 결과가 1개뿐이라 wrap-around — `focusedIndex = 0` 그대로 (또는 결과가 N 개라면 (0+1) % N). announce 변경 없음 또는 다음 옵션.
5. Enter 누름. ticker 선택 dispatch + dropdown unmount + focus 검색 input 에 유지. `aria-activedescendant` attribute 제거. announce — "검색 결과 입력란, 편집 가능, AAPL".
6. ticker-header 갱신. 사용자는 그대로 Tab 으로 InputPanel 첫 필드 (자본) 로 이동.

### 시나리오 C — 키보드 ESC 닫기 흐름

1. 사용자가 검색 input 에 `xyz` 타이핑 → 결과 0건. dropdown 펼침 — 한 줄 "검색 결과 없음" (`body-sm` × `text-muted`). `aria-activedescendant` 는 undefined (focus 가능한 옵션 없음).
2. 사용자가 ESC 누름. dropdown unmount. focus 는 검색 input 에 유지. 입력값 `xyz` 도 유지. announce — "검색 결과 입력란, 편집 가능, xyz" (listbox 사라짐).
3. 사용자가 검색어를 지우고 다시 타이핑 → dropdown 재오픈 (값 변화로 재오픈).

### 시나리오 D — 모바일 터치 + ARIA 무회귀 (375px)

1. 사용자가 모바일에서 SearchPanel 진입. 옵션 li 의 `onMouseDown` + `e.preventDefault()` 패턴이 touch 에서도 정상 동작 (React 의 synthetic event 가 touch → mouse 모두 처리).
2. 사용자가 옵션 탭 → 선택 + dropdown 즉시 unmount. 시각·동작 v5 무회귀.
3. 사용자가 dropdown 외부 영역 터치 → outside-click (touchstart) 으로 닫힘. v5 무회귀.
4. ARIA 패턴은 모바일 스크린리더 (VoiceOver iOS / TalkBack Android) 에서도 동일 announce. combobox + listbox + option 표준 패턴이라 OS 분기 없음.

---

## 핸드오프 명세 — 컴포넌트별 상태·DOM·토큰

### InputPanel 필드 — 단위별 분기 (v6 핵심)

| 단위 | 적용 우측 padding 토큰 | 클래스 예시 | 시각 결과 |
|---|---|---|---|
| `USD` (자본 필드) | `{spacing.input-pr-suffix-md}` (44px) | `pr-input-pr-suffix-md` 또는 `pr-[var(--spacing-input-pr-suffix-md)]` | v5 무회귀 시각 (`input-pr-suffix` 44px 와 동일) |
| `%` (수익률, 최대 손실 필드) | `{spacing.input-pr-suffix-sm}` (36px) | `pr-input-pr-suffix-sm` 또는 `pr-[var(--spacing-input-pr-suffix-sm)]` | v5 대비 우측 8px 축소 — 1자 단위 정합 |
| `일` (기간 필드) | `{spacing.input-pr-suffix-sm}` (36px) | 동일 | 동일 |
| 향후 4자+ 단위 | `{spacing.input-pr-suffix-lg}` (56px) | `pr-input-pr-suffix-lg` 또는 `pr-[var(--spacing-input-pr-suffix-lg)]` | 사전 정의 (현재 사용처 없음) |
| 단위 없음 | `{spacing.input-px}` (12px) | `pr-input-px` | v5 무회귀 |

DOM 구조 (v5 무회귀 + 단위 분기 클래스):

```tsx
<div className="grid gap-1">
  <label className="input-label" htmlFor={fieldId}>
    {labelText}
  </label>
  <div className="relative">
    <input
      id={fieldId}
      className={cn(
        'input',
        suffix ? suffixPaddingClass(suffix) : 'pr-input-px',
        hasError && 'input-error'
      )}
      aria-invalid={hasError}
      aria-describedby={helperId}
    />
    {suffix && (
      <span
        aria-hidden="true"
        className="input-suffix absolute right-input-px top-1/2 -translate-y-1/2 pointer-events-none"
      >
        {suffix}
      </span>
    )}
  </div>
  <p
    id={helperId}
    className={cn(hasError ? 'input-helper-error' : 'input-helper')}
  >
    {helperText}
  </p>
</div>

// 단위별 padding 클래스 분기
function suffixPaddingClass(suffix: string): string {
  if (suffix.length <= 1) return 'pr-input-pr-suffix-sm';   // %, 일
  if (suffix.length <= 3) return 'pr-input-pr-suffix-md';   // USD, KRW
  return 'pr-input-pr-suffix-lg';                            // 향후
}
```

분기 알고리즘은 frontend-dev 자율 — 위 예시는 단위 문자열 길이 기반. 단위 enum 기반·단위별 명시 매핑도 허용.

### SearchPanel dropdown — ARIA 풀 패턴 (v6 핵심)

| 상태 | 진입 조건 | aria-* | DOM 구조 |
|---|---|---|---|
| 닫힘 | `isOpen === false` | input 에 `aria-expanded="false"`, `aria-activedescendant` 제거 | listbox 미렌더 |
| 열림 / focus 없음 | `isOpen && focusedIndex === -1` | input 에 `aria-expanded="true"`, `aria-controls={listboxId}`, `aria-activedescendant` 제거 | listbox 렌더 + 옵션 N 개, 어느 옵션도 `search-result-item-focus` 톤 아님 |
| 열림 / 옵션 focus | `isOpen && focusedIndex >= 0` | input 에 `aria-activedescendant={optionId(focusedIndex)}` | 해당 옵션만 `search-result-item-focus` 톤 + `aria-selected="true"` |
| 결과 없음 | `isOpen && results.length === 0` | input 에 `aria-expanded="true"`, `aria-activedescendant` 제거 | listbox 안 한 줄 "검색 결과 없음" (`body-sm` × `text-muted`) |

키보드 동작 표:

| 키 | dropdown 상태 | 액션 | aria-* 변화 |
|---|---|---|---|
| ↓ | 열림 + 결과 ≥ 1 | `focusedIndex = (focusedIndex + 1) % results.length`. -1 → 0. | `aria-activedescendant` 갱신 |
| ↑ | 열림 + 결과 ≥ 1 | `focusedIndex = focusedIndex <= 0 ? results.length - 1 : focusedIndex - 1`. -1 → 마지막. | `aria-activedescendant` 갱신 |
| Enter | 열림 + `focusedIndex >= 0` | ticker 선택 + unmount | `aria-expanded="false"`, `aria-activedescendant` 제거 |
| Enter | 열림 + `focusedIndex === -1` | 동작 없음 (default 권고) | 변화 없음 |
| ESC | 열림 | unmount + focusedIndex 리셋 | `aria-expanded="false"`, `aria-activedescendant` 제거 |
| Tab / Shift+Tab | 열림 | wrapper 밖 focus 이동 시 unmount (onBlur relatedTarget 검사) | `aria-expanded="false"`, `aria-activedescendant` 제거 |

DOM 구조 표준 (v5 무회귀 + v6 ARIA 보강):

```tsx
const listboxId = useId();
const optionId = (i: number) => `${listboxId}-opt-${i}`;

<div className="relative" ref={wrapperRef}>
  <input
    className="input pr-input-px"
    role="combobox"
    aria-expanded={isOpen}
    aria-controls={listboxId}
    aria-autocomplete="list"
    aria-activedescendant={
      isOpen && focusedIndex >= 0 ? optionId(focusedIndex) : undefined
    }
    onKeyDown={handleKey}
  />
  {isOpen && (
    <ul
      id={listboxId}
      role="listbox"
      aria-label="검색 결과"
      className="dropdown-panel absolute left-0 right-0 top-full mt-1"
    >
      {results.length === 0 ? (
        <li className="px-2 py-1 body-sm text-muted">검색 결과 없음</li>
      ) : (
        results.map((r, i) => (
          <li
            key={r.ticker}
            id={optionId(i)}
            role="option"
            aria-selected={i === focusedIndex}
            className={cn(
              i === focusedIndex
                ? 'search-result-item-focus'
                : 'search-result-item'
            )}
            onMouseDown={(e) => { e.preventDefault(); selectTicker(r); }}
          >
            {r.ticker} · {r.alias}
          </li>
        ))
      )}
    </ul>
  )}
</div>
```

`useId()` 는 React 18+ 의 안정 id 생성 훅. SSR / CSR hydration 양쪽에서 동일 id 보장. listbox 안 옵션 id 는 `${listboxId}-opt-${i}` 형태로 충돌 회피.

### 키보드 Tab 순서 (v5 무회귀 + v6 보강)

v5 의 Tab 순서 전체 무회귀. v6 의 키보드 navigation 은 dropdown 내부 옵션 이동 (↑/↓) 에 국한 — Tab 순서는 영향 없음. dropdown 옵션은 `tabIndex` 를 받지 않으므로 Tab 키 누르면 wrapper 밖 (예: InputPanel 첫 필드) 으로 자연스럽게 이동.

### ARIA · 접근성 (v5 무회귀 + v6 보강)

v5 의 ARIA 명세 무회귀. v6 가 추가·보강:

- **dropdown 검색 input**: `role="combobox"` + `aria-expanded` + `aria-controls={listboxId}` + `aria-autocomplete="list"` + **`aria-activedescendant`** (v6 추가). 5 속성 풀 셋.
- **dropdown listbox (`<ul>`)**: `role="listbox"` + `aria-label="검색 결과"`. 안정 `id` 부여 (`useId()` 기반).
- **dropdown 옵션 (`<li>`)**: `role="option"` + `aria-selected` + **`id={optionId(i)}`** (v6 추가, `aria-activedescendant` 타겟).
- **input-suffix**: `aria-hidden="true"` (v5 무회귀). 단위는 라벨 텍스트로 스크린리더가 읽음.
- **input**: `aria-invalid={hasError}` + `aria-describedby={helperId}` (v5 무회귀).

---

## OPEN QUESTION 결정 (디자이너 영역) — v6 polish-followups

PRD §9 의 6건 중 디자이너 영역 2건 (R1 / R2). PM 권고 대비 v6 결정을 표로 명시.

| # | 질문 | v6 결정 | PM 권고 대비 |
|---|---|---|---|
| **R1** | A2 input suffix 너비 — 옵션 A (단위별 토큰) vs 옵션 B (flex 자동 fitting) (PRD §9.1) | **옵션 A 채택 — `{spacing.input-pr-suffix-sm}: 36px` (1자, %·일), `-md: 44px` (3자, USD·KRW), `-lg: 56px` (4자+, 향후 대비)**. PM 권고 (옵션 A) 수용. 사유 — (a) 토큰 일관성 유지 (design:sync 파이프라인과 정합), (b) frontend-dev 분기 알고리즘 단순 (단위 문자열 길이 또는 enum), (c) v5 의 기존 `input-pr-suffix: 44px` 호환 보존 가능 (`-md` 와 의미적 동치). 옵션 B (flex + gap 자동 fitting) 미채택 사유 — 토큰화 없이 자동 fitting 은 시각 결과가 단위 폰트 metric 에 의존하게 되어 디자인 결정성 약화. 디자이너가 의도한 sm/md/lg 위계가 흐려진다. | PM 권고 수용 |
| **R2** | A1 키보드 navigation 도입 여부 — 도입 vs 보류 (PRD §9.3) | **도입 — ↑/↓ 옵션 이동 (wrap-around) + Enter 선택 + ESC 닫기 + Tab wrapper 밖 닫기**. PM 권고 (도입) 수용. 사유 — (a) `aria-activedescendant` 가 키보드 navigation 없이는 무의미 (옵션 focus 이동이 키보드로 가능해야 ARIA 속성이 의미를 가진다), (b) 구현 비용 작음 (30~50L, PRD §9.3 추정), (c) 본 PRD 한 PR 안에서 처리 가능 — 별도 a11y 전담 PRD 분리 시점 지연이 비효율. 키 매핑 명세는 Components > dropdown-panel > Keyboard Navigation 절. | PM 권고 수용 |

PRD §9 의 나머지 4건 (R3 A3 누락 처리 / R4 B1 prompt schema / R5 DESIGN.md 신설 / R6 다음 PRD) 은 frontend-dev / api-integration-dev / PM / 사용자 영역.

- R3 (A3 누락 처리) — api-integration-dev 결정 (PM 권고 = `'malformed'` ApiError).
- R4 (B1 prompt schema) — api-integration-dev 결정 (PM 권고 = inline embed).
- R5 (DESIGN.md v6 신설 vs v5 갱신) — 본 v6 신설로 답함 (PM 권고 수용, PRD slug 와 DESIGN.md slug 1:1 매핑 컨벤션).
- R6 (다음 PRD) — 사용자 결정 (PM 1순위 추천 = `claude-api-analysis`).

---

## lint 메모 (v6)

본 v6 (`polish-followups`) 는 v5 (`component-compactness`) 의 토큰을 **무수정 계승** 하며 다음만 추가:

- **front matter `colors` 절**: v5 의 13 토큰 **그대로 복사**. 추가·변경 0.
- **front matter `typography` 절**: v5 의 15 키 **그대로 복사**. 추가·변경 0.
- **front matter `spacing` 절**: v5 의 19 키 (기존 `input-pr-suffix: 44px` 포함) + 신규 `input-pr-suffix-sm: 36px`, `input-pr-suffix-md: 44px`, `input-pr-suffix-lg: 56px` 3 키 추가. 기존 키 무변경.
- **front matter `rounded` 절**: v5 의 3 키 그대로. 추가·변경 0.
- **front matter `breakpoints` 절**: v5 그대로.
- **front matter `components` 절**: v5 의 46 합성 토큰 **그대로 복사**. 추가·변경 0. v6 의 단위별 너비 분기 + dropdown ARIA 명세는 모두 prose 단위 보강.
- **본문 절**: Overview (v6 의도) / Colors (v5 무회귀) / Typography (v5 무회귀) / Layout (v5 무회귀 + 신규 spacing 3 키 근거 + 단위별 매핑 표) / Elevation & Depth (v5 무회귀) / Shapes (v5 무회귀) / Components (input-suffix Width 보강 + dropdown-panel ARIA · Keyboard 보강) / Do's and Don'ts (v5 무회귀 + v6 신규).
- **유저 시나리오**: 단위별 컴팩트 폼 / 키보드 + 스크린리더 ticker 검색 / ESC 닫기 / 모바일 터치 + ARIA 4 시나리오.
- **핸드오프 명세**: InputPanel 단위별 분기 / SearchPanel ARIA 풀 패턴 + 키보드 표 / Tab 순서 / ARIA 보강.
- **OPEN QUESTION**: R1 (옵션 A 채택) + R2 (키보드 nav 도입) 결정 표.

**무회귀**: v5 의 colors / typography / spacing 기존 19 키 / rounded / breakpoints / 46 composite 모두 그대로. frontend-dev 측 `tailwind.theme.json` 재생성은 신규 spacing 3 키만 추가 반영, v5 의 시각 언어와 dimension 은 무변경 → design:sync 결정적 무회귀.

산출 직전 `npx @google/design.md lint docs/design/polish-followups.md` 통과 목표:

- errors: 0
- warnings: 0
- info: 1 (token summary)

`contrast-ratio` 룰 회피 — v5 의 색 쌍 그대로 유지. v6 가 색 토큰을 추가·변경 0건이라 신규 대비 검증 불필요. `input-suffix` 의 5.29:1 마진은 v5 prose 의 의도 명시 (suffix 는 부속 표기) 가 그대로 적용.

`orphaned-tokens` 룰 회피 — 신규 spacing 3 키 (`input-pr-suffix-sm` / `-md` / `-lg`) 는 색 토큰이 아니라 dimension 토큰이라 `orphaned-tokens` 룰의 직접 대상이 아니지만, 본 v6 의 components 절 prose 에서 사용 매핑을 명시 (Components > input-suffix > Width 절). 기존 `input-pr-suffix` 키는 호환 보존 — v5 시점 합성 토큰 참조가 그대로 살아 있어 orphan 아님.

`section-order` 룰 회피 — Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts 순서 고정 (v5 와 동일).

`missing-primary` 룰 회피 — `colors.primary` 정의 (v5 무회귀).

`missing-typography` 룰 회피 — colors / typography 모두 정의됨 (v5 무회귀).
