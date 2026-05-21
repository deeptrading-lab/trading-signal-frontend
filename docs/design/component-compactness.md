---
version: alpha
name: component-compactness
description: Trading Signal Frontend — input·dropdown·button 등 개별 컴포넌트의 컴팩트 톤 + input 내부 우측 suffix + dropdown outside-click. v4 layout 골격 무수정 계승.
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

# component-compactness 디자인 가이드 (v5)

## Overview

본 v5 는 v4 (`docs/design/layout-redesign.md`) 가 정착시킨 **3-section shell** (navbar + sidebar + main) 과 메인 영역의 **6블록 위계** 를 **무수정 계승** 한다. 본 v5 는 그 위에서 **개별 컴포넌트의 내부 톤** 만 다시 잡는다. 정확히는 — `input`, `dropdown` (`search-result-item`), `button-primary`, 그리고 사이드바·이미지 버튼류의 height / padding / font-size 를 다운하고, input 의 단위 표기를 **input 필드 내부 우측 absolute suffix** 로 흡수한다.

배경은 PRD §1.2 의 사용자 의도 4 문장 — 컴팩트 톤·outside-click·input 내 suffix·전문가 디자인. 그 중 디자이너 영역은 (a) 컴팩트 톤의 토큰값과 (b) suffix 컴포넌트의 시각·DOM 책임, (c) outside-click 닫힘 의도의 시각 명세 셋이다. v5 는 셋 모두를 components 절에서 토큰화하고, prose 에서 의도를 박는다.

**무회귀 — v4 의 시각 언어 전체 보존**. colors 13 키, rounded 3 키, breakpoints 4 키는 한 글자도 손대지 않았다. typography 의 기존 12 키도 무수정 계승, spacing 의 기존 10 키도 무수정 계승. v5 가 추가한 것은 **컴팩트 타이포 2 키** (`button-sm`, `label-sm`, `input-suffix` — 3 키 정확) + **컴팩트 dimension 토큰 9 키** + **컴팩트 합성 토큰 7 개** + **기존 합성 토큰의 size 키 다운**. Signature Slate(`#1f3b4d`)·세컨더리 톤·warn/info/critical 의 의미·라운드·breakpoints 는 v4 그대로.

본 v5 의 톤 의도는 **"정보 밀도 우선의 트레이딩 도구"**. 워크벤치 한 화면 안에서 입력 영역이 차지하는 세로 공간이 줄어들수록, 결과 6블록 (특히 ActionCard 의 `display` 톤 권고) 이 첫 인상에 잡힐 확률이 올라간다. 토스톤의 컴팩트는 미니멀리즘이 아니라 **결정 단계 우선** — 사용자가 분석 결과를 한 번에 보고, 입력은 한 줄짜리 명확한 폼으로 끝낸다.

## Colors

v4 의 13 토큰 **완전 무수정 계승**. 키 이름·hex·사용처 모두 그대로. 본 v5 는 색을 추가하지도, 변경하지도, 재해석하지도 않는다.

v4 의 시그니처 색 사용 원칙 (Signature Slate `primary` 의 "한 화면에 두 지점 + navbar wordmark 1회" 룰) 도 무회귀. v5 가 추가하는 `button-secondary`·`button-icon` 등의 보조 컴포넌트는 모두 `text-strong` / `text-muted` / `surface` / `surface-muted` 의 차분한 톤만 사용한다.

### WCAG AA — v5 신규 합성 토큰 대비 검증

v4 의 검증된 색 쌍은 모두 무회귀. v5 가 도입한 신규 합성 토큰의 색 쌍만 추가 검증.

| 쌍 | 비율 | AA (4.5:1) |
|---|---|---|
| `input` text × background (`text-strong` × `surface-muted`) | 15.33:1 | ✅ |
| `input-error` text × background (`critical` × `critical-soft`) | 7.39:1 | ✅ |
| `input-label` text × background (`text-strong` × `surface`) | 16.45:1 | ✅ |
| `input-helper` text × background (`text-muted` × `surface`) | 5.68:1 | ✅ |
| `input-helper-error` text × background (`critical` × `surface`) | 8.95:1 | ✅ |
| `input-suffix` text × background (`text-muted` × `surface-muted`) | 5.29:1 | ✅ |
| `dropdown-panel` text × background (`text-strong` × `surface`) | 16.45:1 | ✅ |
| `search-result-item` text × background (`text-strong` × `surface`) | 16.45:1 | ✅ |
| `search-result-item-focus` text × background (`primary` × `accent-soft`) | 9.85:1 | ✅ |
| `button-primary` text × background (`surface` × `primary`) | 11.73:1 | ✅ |
| `button-secondary` text × background (`primary` × `surface`) | 11.73:1 | ✅ |
| `button-secondary-hover` text × background (`primary` × `accent-soft`) | 9.85:1 | ✅ |
| `button-icon` text × background (`text-strong` × `surface`) | 16.45:1 | ✅ |
| `button-icon-hover` text × background (`text-strong` × `surface-muted`) | 15.33:1 | ✅ |

`input-suffix` 의 5.29:1 은 AA 통과 직전 마진이라 의도를 prose 에 박는다 — suffix 는 입력 값 우측의 "부속 표기" 이지 사용자가 읽어 의사결정하는 본문이 아니다. 시각 무게가 본문보다 약해야 입력 값에 시선이 먼저 머무른다. `text-muted` × `surface-muted` 조합으로 컬러 노이즈를 줄이는 게 본 v5 의 컴팩트 톤과 정합한다.

## Typography

v4 의 12 키 (`display`, `h1`, `h2`, `body-md`, `body-sm`, `body-strong`, `caption`, `button`, `badge`, `mono-numeric`, `nav-brand`, `sidebar-section`) **무수정 계승**. v5 가 세 키 추가:

- **`button-sm` (13px / 700 / 1.2)** — 보조 버튼·이미지 버튼 (`button-secondary`, `button-icon`) 의 typography. v4 의 `button` (15px) 보다 한 단계 작다. 분석 실행 CTA 와 보조 버튼의 시각 무게 차이를 토큰 단위로 명시 — 사용자가 한 화면에서 "이게 분석 실행 버튼이구나" 와 "이건 보조 컨트롤이구나" 를 weight·size 두 트랙으로 즉시 인지한다.
- **`label-sm` (13px / 700 / 1.25)** — InputPanel 의 각 필드 라벨("자본", "수익률", "기간", "최대 손실"). v4 시점에는 `body-strong` (16px) 또는 `body-md` (16px) 를 라벨로 재사용했지만, v5 의 컴팩트 input (height 36px) 위에 16px 라벨이 얹히면 라벨이 input 보다 시각 무게가 커진다. 13px / weight 700 으로 라벨의 "구분 기능" 은 유지하면서 시각 무게를 input 본문보다 한 단계 아래로 둔다. line-height 1.25 는 폼 한 줄의 세로 공간을 좁힌다.
- **`input-suffix` (13px / 400 / 1.2, `tnum`)** — input 내부 우측 absolute suffix 의 typography. weight 400 으로 사용자가 입력 중인 본문 (weight 400, `body-sm`) 과 시각 무게가 같지만, 색을 `text-muted` 로 떨어뜨려 본문과 구분. `fontFeature: tnum` 은 USD / KRW 같은 통화 단위 표기 시 자릿수 정렬 보조 (현재 단위는 짧지만, 향후 가변 단위 도입 대비).

세 신규 키 모두 v4 의 토큰 컨벤션 (Arial / lineHeight 단위 없는 ratio / fontWeight 정수) 그대로 따른다. 기존 12 키와 충돌하지 않는다.

## Layout

**v4 의 layout 가이드 전체 무수정 계승**. 3-section shell (navbar 60px + sidebar 264px + main), 데스크탑·모바일·태블릿 정책, drawer slide-in, 결과 6블록 위계 모두 v4 그대로. 본 v5 는 layout 골격에 손대지 않는다 — PRD §4.2 의 비범위 명시.

본 v5 가 layout 절에서 추가하는 것은 **컴팩트 dimension 토큰 9 키** 뿐이다 (spacing front matter):

- **`input-h: 36px`** — InputPanel 4 필드 (capital / target / horizon / max_loss) 의 통일 높이. PRD §9.1 권장 범위 36~40px 중 **36px 채택** 사유:
  - 40px: 분석 CTA(`button-primary-h: 40px`) 와 동일 — 시각 위계가 평탄화돼 "이 줄이 입력이고 이 줄이 실행" 의 구분이 약해진다.
  - 36px: input 보다 button 이 한 단계 크다 (`button-primary-h: 40px`). 사용자 인지에서 "입력 → 실행" 의 위계가 살아난다.
  - 모바일 hit area 는 input 자체가 36px 이지만 라벨·helper 영역까지 합쳐 한 필드의 클릭 묶음이 60px+ 이상이라 손가락 정확도에 무리 없음.
- **`input-px: 12px`** — input 의 좌측 수평 패딩. v4 의 11px 에서 1px 증가 — 36px 높이로 다운된 input 에서 텍스트 좌측 여백이 너무 짧으면 답답해 보인다. 12px 은 토스 폼 컨벤션의 자연 정렬.
- **`input-py: 8px`** — input 의 수직 패딩. v4 의 11px 에서 3px 다운 — 36px 높이 안에서 `body-sm` (14px / 1.5 line-height = 21px) 텍스트가 정확히 가운데 정렬 (36 - 8×2 = 20px 가 line-height 와 거의 일치).
- **`input-pr-suffix: 44px`** — input 내부 우측에 suffix 가 있을 때 input 의 우측 수평 패딩. suffix 자체 폭(약 16~28px, "%", "일", "USD") + 우측 여백 12px + suffix 와 input 텍스트 사이 안전 마진. PRD §3.1 의 "suffix 와 텍스트 충돌 방지" 책임을 토큰화. frontend-dev 는 suffix 있는 input 에만 `paddingRight: var(--spacing-input-pr-suffix)` 적용, suffix 없는 input 은 `input-px` 좌우 동일.
- **`dropdown-item-h: 34px`** — ticker 검색 결과 dropdown 한 항목의 통일 높이. PRD §3.2 권장 범위 32~36px 중 **34px 채택** 사유:
  - 32px: dropdown 한 항목에 ticker + alias 두 줄이 들어가면 line-height 가 빠듯. ticker 단독은 OK 지만 v4·v5 모두 alias 병기를 권장.
  - 36px: input(36px) 과 동일 — dropdown 이 input 의 "연장" 처럼 보여 위계가 흐려진다.
  - 34px: input 보다 한 단계 작다 — dropdown 이 input 의 "보조 패널" 임을 시각 위계로 명시.
- **`dropdown-item-py: 6px`** — dropdown 항목 수직 패딩. 34px 높이 안에서 `body-sm` (14px / 1.5) 가 가운데 정렬.
- **`button-primary-h: 40px`** — 분석 실행 CTA 의 높이. PRD §3.3 권장 범위 40~44px 중 **40px 채택** 사유:
  - 44px: input 36px 대비 8px 큼 — 시각 무게는 강하지만 입력 한 줄과 버튼 한 줄의 세로 비율이 어색.
  - 40px: input 보다 4px 큼 — "한 단계 위 (실행)" 의 위계가 자연. 모바일 hit area 도 40×40px 이상 통과.
- **`button-sm-h: 32px`** — 보조 버튼·이미지 버튼·즐겨찾기 토글의 통일 높이. v4 의 `favorite-toggle` 32×32px 와 정합. 32px 은 toss / Linear / GitHub 등 정보 밀도 우선 도구의 컨벤션.
- **`hit-area-min: 40px`** — 아이콘 단독 버튼의 최소 접근성 hit area. PRD §9.6 권장 40×40px 채택 (WCAG AA / iOS HIG 의 보수 권장 44×44px 보다 약간 작지만, 데스크탑 우선 도구의 정보 밀도와 균형). 시각 size 가 32×32px (`button-sm-h`) 인 아이콘 버튼도 padding 또는 `before:absolute -inset-1` 로 hit area 를 40×40px 로 확장.

9 키 모두 `spacing` namespace 에 둔다 — DESIGN.md `alpha` 스펙이 layout / dimension 별도 namespace 를 정의하지 않아 spacing 으로 흡수하는 게 lint 통과 + Tailwind theme export 정합에 안전. v4 의 4 keys (`navbar-h`, `sidebar-w`, `drawer-w`, `main-max-w`) 와 동일 패턴.

### 컴팩트 톤의 dimension 결정 표

| 컴포넌트 | v4 (이전) height | v5 height | 다운 폭 | 사유 |
|---|---|---|---|---|
| `input`, `input-error` | 42px | **36px** | -6px | 폼 한 줄 세로 공간 14% 단축. 4 필드 + 라벨·helper 합쳐 약 50px 단축. |
| `search-result-item`, `-focus` | (옵션 항목 size 토큰 없음) | **34px** | (신규) | dropdown 이 input 의 보조 패널임을 위계로 명시. |
| `button-primary`, `-disabled` | 44px | **40px** | -4px | 분석 CTA 가 input 보다 한 단계 위 위계 유지. |
| `sidebar-item`, `-hover`, `-active` | 40px | **36px** | -4px | input 과 동일 height 로 메인 + 사이드바 시각 정합. |
| `navbar-icon-button` | 40px | **40px** (`hit-area-min`) | 0 | 변경 없음 (hit area 토큰화만). |
| `favorite-toggle`, `-active` | 32px | **32px** (`button-sm-h`) | 0 | 변경 없음 (토큰 키 연결만). |

input 의 6px 다운은 PRD §1.3 의 "폼 한 줄이 메인 영역의 위 절반을 잡아먹는다" 문제의 직접 해소다. 사이드바 항목도 동일하게 4px 다운해 메인 폼과 사이드바의 줄 높이가 시각적으로 같아진다.

## Elevation & Depth

v4 의 평면 디자인 기조 **무회귀**. navbar / sidebar / 카드는 그림자 없음, drawer 만 단일 그림자 (`0 16px 48px rgba(23, 32, 42, 0.16)`). `card-elevated` (action 카드) 의 미세 그림자도 v4 무회귀.

v5 가 추가한 dropdown panel (`dropdown-panel` 합성 토큰) 의 그림자 정책:

- **`dropdown-panel` 자체는 그림자 없음**. dropdown 은 input 바로 아래 붙어 떠 있어, input 의 보더(`border-line` 1px) 와 dropdown panel 의 동일 보더가 자연 분리. drawer 처럼 화면 가운데 떠 있지 않다.
- 디자이너 재량으로 dev 단계에서 `box-shadow: 0 4px 12px rgba(23, 32, 42, 0.08)` 정도의 미세 elevation 을 frontend-dev 가 인라인으로 줄 수는 있지만, 본 v5 는 **토큰화하지 않는다** — 한 곳만 쓰는 그림자는 토큰 도입을 보류 (v4 의 drawer 그림자 정책 무회귀).

input 의 focus 상태도 그림자 없음 — 대신 보더 색 전환 (`border-line` → `primary`) 으로 focus 신호. frontend-dev 측 `focus-visible:border-primary` 또는 동등.

## Shapes

v4 의 3 키 (`rounded.sm` 8px, `rounded.md` 12px, `rounded.pill` 999px) **무수정 계승**. v5 는 신규 라운드 토큰 도입하지 않는다.

input·dropdown·button-primary 는 모두 `rounded.sm` (8px) — 컴팩트해진 36/34/40px 높이에서도 8px 라운드는 시각적으로 자연. 12px 은 drawer 만, pill 은 badge / favorite-toggle / price-bar 만 (v4 무회귀).

## Components

본 절이 v5 의 핵심. v4 의 37 합성 토큰을 그대로 두고, 다음 세 그룹을 갱신·신설한다.

1. **갱신 (size 다운)**: `input`, `input-error`, `button-primary`, `button-primary-disabled`, `search-result-item`, `search-result-item-focus`, `sidebar-item` × 3.
2. **신설 (컴팩트 보조)**: `input-label`, `input-helper`, `input-helper-error`, `input-suffix`, `dropdown-panel`, `button-secondary`, `button-secondary-hover`, `button-icon`, `button-icon-hover`.
3. **무회귀 (계승)**: 나머지 v4 합성 토큰 전체 (navbar 그룹, sidebar 그룹의 일부, drawer 그룹, badge 그룹, price-bar 그룹, card 그룹, ticker-header).

### input 그룹 (컴팩트화 + suffix DOM 구조)

#### `input`, `input-error`

- 자리: `InputPanel` 의 4 필드 (capital_amount / expected_return_pct / horizon_days / max_loss_pct).
- height `{spacing.input-h}` = 36px. 좌우 padding `{spacing.input-px}` = 12px, 수직 padding `{spacing.input-py}` = 8px. **suffix 가 붙는 필드는 우측 padding 만 `{spacing.input-pr-suffix}` = 44px 로 오버라이드** (frontend-dev 측 분기 클래스 또는 conditional style).
- typography `{typography.body-sm}` (14px / 400 / 1.5). v4 시점의 16px (`body-md`) 에서 한 단계 다운 — 컴팩트 톤 정합.
- backgroundColor `surface-muted`, rounded `sm`. focus 상태는 frontend-dev 측 보더 토큰 (`border-line` → `primary`) 전환.
- `input-error` 는 동일 dimension, backgroundColor 만 `critical-soft`. helper text 는 `input-helper-error` 토큰으로 알림 톤.

#### `input-label`

- 자리: 각 input 위 1 줄 라벨. PRD §9.5 권장 (label 위 유지 + line-height 컴팩트) PM 권고 수용.
- typography `{typography.label-sm}` (13px / 700 / 1.25). v4 시점은 라벨 토큰 미정의 (호출 측에서 `body-strong` 또는 `body-md` 재사용) 였던 것을 v5 가 명시 토큰화.
- textColor `text-strong`, padding 0. 라벨과 input 사이 수직 간격은 frontend-dev 측 `gap-1` 또는 `mt-1` (4px) 로.
- 라벨은 항상 input 위에 있다. 모바일·데스크탑 분기 없음 — PRD §9.5 결정.

#### `input-helper`, `input-helper-error`

- 자리: 각 input 아래 1 줄 helper text. 입력 가이드 (예: "최소 100,000 USD"), 또는 사전 차단 에러 메시지.
- typography `{typography.caption}` (12px / 400 / 1.4). v4 무회귀.
- 정상 톤: `input-helper`, textColor `text-muted`.
- 에러 톤: `input-helper-error`, textColor `critical`. input 의 `input-error` 와 함께 전환.
- DOM 측 `aria-describedby` 로 input 과 연결 (AC-19 무회귀).

#### `input-suffix` (신규 핵심)

- 자리: input 필드 **내부 우측 absolute**. PRD §3.1 의 단위 표기 (`USD` / `%` / `일` / `%`) 가 input 옆 별도 텍스트가 아니라 input wrapper 안에서 우측 absolute.
- 시각: typography `{typography.input-suffix}` (13px / 400 / 1.2, `tnum`). textColor `text-muted`, backgroundColor `surface-muted` (input 본문과 동일 배경, 시각적으로 input 의 일부로 보임).
- DOM 구조 (frontend-dev 핸드오프):
  ```tsx
  <div className="relative">
    <input
      className="input pr-[var(--spacing-input-pr-suffix)]"
      aria-describedby={helperId}
    />
    <span
      aria-hidden="true"
      className="input-suffix absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
    >
      USD
    </span>
  </div>
  ```
  - wrapper: `position: relative`.
  - suffix: `position: absolute`, `right: 12px` (= `spacing.input-px`), 수직 가운데 정렬 (`top: 50%; transform: translateY(-50%)` 또는 flex).
  - **`pointer-events: none`** 필수 — suffix 클릭이 input focus 를 방해하지 않는다. PRD §3.1 + AC-3 명시.
  - **`aria-hidden="true"`** — suffix 는 시각 표기 보조. 단위 의미는 라벨 자체에 포함되는 게 정상 (`<label>자본 (USD)</label>`) 이며, 스크린리더는 라벨에서 단위를 읽는다. suffix 가 별도로 읽히면 중복.
- input 의 우측 padding 은 `input-pr-suffix` (44px) 로 확장 — suffix 폭 + 안전 마진. 긴 숫자 입력(`1,000,000,000`) 도 suffix 와 텍스트 충돌 없음.
- **유저 시나리오 — 한 라인 vs 두 라인 흐름**:
  - 한 라인 흐름 (정상): 라벨 위 → input 안에 값 + 우측 suffix → helper text 아래. 폼 한 필드의 세로 총합 = 라벨 16px + gap 4px + input 36px + gap 4px + helper 16px = 76px. v4 시점 (90~100px) 대비 14~24% 단축.
  - 두 라인 흐름 (에러): 동일 구조에서 input 이 `input-error` 톤 + helper 가 `input-helper-error` 톤 + 사용자가 값을 수정하면 즉시 정상 톤 복귀. suffix 는 에러 상태에서도 변경 없음 — 단위는 정/오 상태와 무관.

### dropdown / selectbox 그룹 (outside-click + 컴팩트 옵션)

#### `dropdown-panel` (신규)

- 자리: `SearchPanel` 의 ticker 검색 input 바로 아래 floating panel. 검색 결과 항목들의 컨테이너.
- backgroundColor `surface`, rounded `sm`, padding 4px (옵션 항목들 사이의 외곽 여백).
- textColor `text-strong` (옵션 항목들이 다시 자체 textColor 를 잡으므로 base 역할).
- DOM 구조 (frontend-dev 핸드오프):
  ```tsx
  <div className="relative" ref={wrapperRef}>
    <input ... />
    {isOpen && results.length > 0 && (
      <ul
        role="listbox"
        aria-label="검색 결과"
        className="dropdown-panel absolute left-0 right-0 top-full mt-1"
      >
        {results.map((r, i) => (
          <li
            role="option"
            aria-selected={i === focusedIndex}
            className={i === focusedIndex ? 'search-result-item-focus' : 'search-result-item'}
          >
            {r.ticker} · {r.alias}
          </li>
        ))}
      </ul>
    )}
  </div>
  ```
- 그림자 없음 (Elevation 절 참조). 보더 1px solid `border-line` 으로 input 과 자연 연결.

#### `search-result-item`, `search-result-item-focus`

- 자리: `dropdown-panel` 안의 한 항목.
- height `{spacing.dropdown-item-h}` = 34px. 수직 padding `{spacing.dropdown-item-py}` = 6px, 수평 padding 8px (frontend-dev 측 자체 토큰 또는 inline).
- typography `{typography.body-sm}` (14px / 400 / 1.5).
- 기본 톤 `search-result-item`: backgroundColor `surface`, textColor `text-strong`.
- 포커스 톤 `search-result-item-focus`: backgroundColor `accent-soft`, textColor `primary` (Signature Slate 옅은 톤). v4 의 `sidebar-item-active` 와 동일 시각 신호 — "선택된 것" 일관성.
- 키보드 ArrowUp / ArrowDown 으로 focus 이동, Enter 로 선택 (PR #11 무회귀).
- hover 도 동일 `search-result-item-focus` 톤 (frontend-dev 측 `hover:` prefix).

#### outside-click 동작 명세

PRD §9.4 결정 (PM 권고 수용): **dropdown wrapper 외부 mousedown + ESC + Tab 세 닫기 진입점**.

- **mousedown / pointerdown / touchstart** (세 종류 모두): document level listener 가 dropdown wrapper ref 외부 좌표 클릭을 감지하면 dropdown state `isOpen = false`. frontend-dev 측 `hooks/utils/useOutsideClick.ts` (PRD §9.10 권장 위치) 신설.
- **ESC 키**: dropdown 이 열린 상태에서 ESC 누르면 닫힘. focus 는 검색 input 으로 복귀.
- **Tab 키**: Tab 으로 dropdown wrapper 밖으로 focus 이동 시 닫힘. wrapper 의 `onBlur` 가 wrapper 안 자식으로 이동한 게 아니면 닫힘 (relatedTarget 검사).
- **닫지 않는 액션**: 옵션 항목 클릭 (정상 선택), dropdown 안 스크롤, 검색 input 의 키 입력. 즉 wrapper 내부 모든 인터랙션은 dropdown 유지.

시각 명세 — dropdown 이 닫히는 transition 은 없음 (즉시 unmount). 토스톤의 즉답성. fade-out 200ms 같은 잔여 동작은 도입하지 않음 (다음 dropdown 열림과 충돌 위험).

### button 그룹 (톤 정합 + size 다운)

#### `button-primary`, `button-primary-disabled`

- 자리: `InputPanel` 의 분석 실행 CTA. 한 화면에 1 회 노출 (Signature Slate 룰 무회귀).
- height `{spacing.button-primary-h}` = 40px. padding 10px. typography `{typography.button}` (15px / 700 / 1.2, v4 무회귀).
- backgroundColor `primary`, textColor `surface`, rounded `sm`.
- v4 의 44px → v5 의 40px 4px 다운. 분석 CTA 가 input(36px) 보다 한 단계 위.
- disabled 상태는 동일 시각 (사용자가 "왜 비활성인지" 가 helper text 로 알리는 게 본 v5 의 정책 — opacity 변경은 v4 무회귀로 도입 안 함).

#### `button-secondary`, `button-secondary-hover` (신규)

- 자리: 에러 카드의 "다시 시도", 결과 영역의 보조 컨트롤 (있는 경우).
- height `{spacing.button-sm-h}` = 32px. padding 8px. typography `{typography.button-sm}` (13px / 700 / 1.2).
- 기본 톤: backgroundColor `surface`, textColor `primary`, rounded `sm`. (Signature Slate 텍스트 — "보조 액션의 무게 있는 라벨" 톤).
- hover 톤 `button-secondary-hover`: backgroundColor `accent-soft`, textColor `primary`. v4 의 `sidebar-item-active` / `search-result-item-focus` 와 시각 신호 일관.
- 한 화면에 여러 개 노출 가능 (CTA primary 의 1 회 룰과 다름 — secondary 는 "행위 추천" 이 아닌 "선택지 제공").

#### `button-icon`, `button-icon-hover` (신규)

- 자리: 작은 아이콘 단독 버튼 — drawer close, hamburger 보조 (대부분의 hamburger 는 `navbar-icon-button` 토큰 사용, drawer 안의 추가 버튼이 `button-icon` 토큰 영역).
- height = width = `{spacing.button-sm-h}` = 32px. padding 6px (아이콘 20×20px + 패딩 12px = 32px).
- 기본 톤: backgroundColor `surface`, textColor `text-strong`, rounded `sm`.
- hover 톤: backgroundColor `surface-muted`, textColor `text-strong`. v4 의 `navbar-icon-button-hover` 와 시각 패턴 일관.
- **hit area 확장**: 시각 size 가 32×32px 이지만 frontend-dev 는 `relative` + `before:absolute -inset-1` (= 8px 외곽 확장) 으로 hit area 를 40×40px (`{spacing.hit-area-min}`) 로 확장. PRD §9.6 결정 (40×40px) 수용. 모바일 터치 정확도 보장.

#### `navbar-icon-button`, `favorite-toggle` — v4 무회귀

두 합성 토큰은 v4 의 size 그대로. v5 가 size 키를 `{spacing.hit-area-min}` (40px) / `{spacing.button-sm-h}` (32px) 토큰 참조로 묶었을 뿐, 픽셀 값은 변경 없음.

- `navbar-icon-button`: 40×40px (모바일 hamburger). v4 무회귀.
- `favorite-toggle`: 32×32px (별표 토글). v4 무회귀.

### 사이드바 그룹 (size 다운)

#### `sidebar-item`, `sidebar-item-hover`, `sidebar-item-active`

- height 40px → 36px (-4px). padding 10px → 8px.
- typography 무수정 (호출 측에서 `body-sm` 또는 `body-md` 사용 — frontend-dev 결정).
- 시각 톤·backgroundColor·textColor·rounded 무회귀.
- v4 의 메인 폼 input(42px) 과 사이드바 항목(40px) 의 2px 차이가 시각적으로 어색했는데, v5 의 input 36px + 사이드바 36px 가 정합. 메인·사이드바 두 영역의 줄 높이가 시각적으로 동일하다.

#### `sidebar-section-header`, `sidebar-empty` — 무회귀

v4 그대로. typography·padding·rounded 모두 무수정.

### Sidebar 인라인 60px 토큰 흡수 (PRD §3.5.1 nit #1)

PRD §3.5.1 의 reviewer nit — `components/layout/Sidebar.tsx` 안의 인라인 60px 또는 변수 직접 참조를 합성 토큰으로 흡수. 60px 의 정체는 navbar 높이 (`spacing.navbar-h: 60px`) 와 정합 — sidebar 의 `top: var(--spacing-navbar-h)` sticky 오프셋. v5 는 이 60px 를 **`{spacing.navbar-h}` 토큰 참조로만** 표현하도록 명시. frontend-dev 는 인라인 `60px` 또는 `style={{ top: '60px' }}` 를 **금지**, Tailwind 임의 토큰 `top-[60px]` 도 금지 — 반드시 `top-[var(--spacing-navbar-h)]` 또는 Tailwind theme 등록 토큰 클래스.

추가 케이스 — sidebar 의 height calc 가 인라인이라면 `calc(100vh - var(--spacing-navbar-h))` 형태로. v5 가 새 토큰 추가하지 않고 v4 의 `navbar-h` 60px 토큰 재사용.

### 메인 영역·결과 영역 — v4 무회귀

`main-area`, `ticker-header`, `card`, `card-elevated`, `card-warn`, `card-critical`, `badge-*`, `price-bar-*` — 모두 v4 합성 토큰 그대로. 본 v5 가 손대지 않는다.

ResultGroup 6블록의 위계 (ActionCard → BriefCard → FeasibilityCard + HorizonsCard 2-col → RiskPlanCard → WarningsCard) — v4 무회귀, PRD §4.2 비범위.

## Do's and Don'ts

v4 의 Do's and Don'ts 전체 무회귀. 본 v5 가 추가하는 항목:

### v5 신규 — 컴팩트 톤 / 컴포넌트 내부

- ✅ input 의 단위 표기는 **input 필드 내부 우측 absolute suffix** 로 둔다 (`input-suffix` 합성 토큰). 라벨 안 단위 문자열·input 옆 별도 텍스트 노드를 두지 않는다.
- ✅ suffix 노드는 항상 `pointer-events: none` + `aria-hidden="true"`. input focus·click 을 방해하지 않고, 스크린리더는 라벨에서 단위를 읽는다.
- ✅ input 의 우측 padding 은 suffix 가 있을 때 `{spacing.input-pr-suffix}` (44px), 없을 때 `{spacing.input-px}` (12px). 두 케이스를 frontend-dev 측 분기 클래스로 명시.
- ✅ dropdown 닫힘 진입점은 세 곳 — **dropdown wrapper 외부 mousedown / pointerdown / touchstart + ESC 키 + Tab 키 (wrapper 밖으로 focus 이동)**. 셋 모두 frontend-dev 자체 구현 (`hooks/utils/useOutsideClick.ts`).
- ✅ dropdown 옵션 항목 (`search-result-item`) 은 input(36px) 보다 작은 height (34px) 로 위계 표현 — dropdown 은 input 의 보조 패널.
- ✅ 분석 CTA (`button-primary`, 40px) 는 input (36px) 보다 한 단계 위 height. CTA → input 위계가 시각으로 즉시 잡힌다.
- ✅ 보조 버튼 (`button-secondary`, 32px) · 이미지 버튼 (`button-icon`, 32px) 은 CTA 보다 한 단계 작다. 시각 무게가 약하다 = 행위 추천이 아니라 선택지 제공.
- ✅ 아이콘 단독 버튼은 시각 size 가 32×32px 이라도 hit area 를 `{spacing.hit-area-min}` = 40×40px 로 확장한다 (`before:absolute -inset-1`).
- ✅ Sidebar.tsx 의 navbar 높이 오프셋(60px) 은 `{spacing.navbar-h}` 토큰 참조로만 표현한다. 인라인 `60px` 또는 `top-[60px]` 금지.
- ❌ input·dropdown·button 의 height / padding / font-size 를 Tailwind 임의 값 (`h-[36px]`, `py-[8px]`) 또는 인라인 style 로 박지 않는다. 모두 토큰 클래스 (`h-input-h`, `py-input-py`) 또는 CSS 변수 (`var(--spacing-input-h)`) 로.
- ❌ suffix 가 들어가는 input 의 좌우 padding 을 `input-px` 단일 토큰으로 양쪽 동일하게 두지 않는다. 우측은 `input-pr-suffix` 로 따로.
- ❌ dropdown 의 outside-click 처리에 신규 라이브러리 (Floating UI / Headless UI / Radix / react-aria) 를 도입하지 않는다 (PRD §9.2 PM 권고 = 자체 구현). 단, 사용자 결정으로 우회 가능 — 그 경우 v5 prose 갱신 필요.
- ❌ dropdown 닫힘에 transition (fade-out, slide-out) 을 두지 않는다. 즉시 unmount 가 토스톤의 즉답성.
- ❌ input focus 상태에 그림자를 두지 않는다. 보더 색 전환 (`border-line` → `primary`) 만.
- ❌ 분석 CTA 의 disabled 상태에 opacity 를 따로 두지 않는다 (v4 무회귀). 왜 비활성인지는 helper text 가 알린다.
- ❌ 라벨 위치를 input 옆 (한 줄 정렬) 으로 두지 않는다. 항상 input 위 + `input-label` (13px / 700 / 1.25) — PRD §9.5 결정.

---

## 유저 시나리오

### 시나리오 A — 데스크탑 컴팩트 폼 진입 + 분석 흐름 (1280px)

1. 사용자가 메인 진입 (`/`). v4 의 3-section shell 무회귀 — 상단 navbar + 좌측 sidebar + 메인 영역. 메인 영역 상단에 ticker-header(미선택) + SearchPanel + InputPanel.
2. 사용자가 SearchPanel 입력 칸에 `app` 타이핑. dropdown panel (`dropdown-panel`) 이 input 바로 아래 즉시 펼쳐짐. 한 항목 높이 34px (`dropdown-item-h`) — v4 시점보다 압축. 항목 텍스트는 `body-sm` (14px) 으로 컴팩트.
3. 결과 1 건만 노출 — `AAPL — Apple Inc. (USD)`. 키보드 ↓ 누르면 `search-result-item-focus` 톤 (옅은 슬레이트 배경). Enter 또는 클릭 → 선택. dropdown 즉시 unmount (transition 없음).
4. ticker-header 갱신. SearchPanel 입력 칸은 선택된 ticker 표시 (또는 frontend-dev 결정).
5. InputPanel 의 4 필드가 한 줄 한 줄 컴팩트 — 각 필드 라벨 (13px / `label-sm`) → input (36px / `body-sm` 14px) → helper (12px / `caption`).
   - **한 라인 컴팩트 흐름**: 첫 필드 "자본 (USD)" 라벨 위, input 안에 `1,000,000` 타이핑, input 우측에 absolute suffix `USD` (회색 톤). suffix 와 텍스트 충돌 없음 — `input-pr-suffix: 44px` 우측 padding.
   - 두 번째 필드 "수익률" 라벨, input 안에 `5` + 우측 suffix `%`.
   - 세 번째 "기간" 라벨, input `30` + suffix `일`.
   - 네 번째 "최대 손실" 라벨, input `2` + suffix `%`.
   - 네 필드 세로 총합 = (76px × 4) + (gap 12px × 3) = 340px. v4 시점 (약 410px) 대비 70px 단축.
6. 분석 버튼 (`button-primary`, 40px) — input 보다 한 단계 위 height. 클릭 → 라벨 "분석 중", `aria-busy`. 결과 영역에 스켈레톤 5장 (v4 위계 무회귀).
7. ~1초 후 응답. v4 의 6블록 위계 무회귀로 표시.

### 시나리오 B — 검색 + outside-click 닫기 흐름 (375px / 1280px 공통)

1. 사용자가 SearchPanel 에 `bt` 타이핑 → dropdown 펼침 — 결과 `BTC-USD — 비트코인 (USD)`.
2. 사용자가 분석 결과를 더 보려고 메인 영역의 결과 영역을 클릭 → dropdown 즉시 닫힘 (outside-click). 검색 input 의 값은 그대로 (`bt`) — focus 만 잃음.
3. 사용자가 다시 검색 input 을 클릭 → dropdown 다시 펼침 (값이 `bt` 인 상태 그대로 결과 노출).
4. 키보드 사용자: 검색 input focus 상태에서 ESC 누름 → dropdown 닫힘. focus 는 검색 input 에 유지 (사용자가 다시 타이핑 가능).
5. 키보드 Tab → dropdown 외부로 focus 이동 시 자동 닫힘. Shift+Tab 으로 dropdown 안 옵션으로 이동은 wrapper 내부이므로 닫히지 않음.
6. 모바일 (375px): 옵션 항목 탭 → 선택 + dropdown 즉시 unmount. 화면 다른 영역 touchstart → outside-click 으로 닫힘. drawer 열려있는 동안에는 메인 영역 focus 차단이라 dropdown 도 펼쳐지지 않음 (v4 focus trap 무회귀).

### 시나리오 C — 컴팩트 에러 상태 흐름 (사전 차단)

1. 사용자가 "자본" 필드에 `0` 입력 후 분석 버튼 클릭.
2. 사전 차단 (`validateAnalyzePayload`) 발화. 해당 필드만 `input-error` 톤 (배경 `critical-soft`), helper text 가 `input-helper-error` 톤 (색 `critical`) — "자본은 0 보다 커야 해요." 라벨 색은 무회귀 (`text-strong`).
3. suffix `USD` 는 에러 상태에서도 변경 없음 — 단위는 정/오 상태와 무관.
4. 사용자가 값 수정 → input 즉시 정상 톤 복귀. 분석 버튼 활성화.

### 시나리오 D — Sidebar 항목 톤 일관 (PR #21 reviewer nit 흡수)

1. 사용자가 사이드바 분석 히스토리 항목 `AAPL` 위에 호버 → `sidebar-item-hover` 톤 (배경 `surface-muted`). 36px height 로 메인 폼 input 과 동일 줄 높이. 시각 정합.
2. 사용자가 `AAPL` 항목 클릭 → 메인 영역 ticker 복원 + sidebar 의 `AAPL` 항목이 `sidebar-item-active` 톤 (배경 `accent-soft` + 텍스트 `primary`).
3. 다른 ticker 검색·선택 시 `AAPL` 의 active 톤 해제, 새 ticker 의 사이드바 항목이 active.

---

## 핸드오프 명세 — 컴포넌트별 상태·DOM·토큰

### InputPanel 필드 (4 필드 공통)

| 상태 | 진입 조건 | 노출 컴포넌트 | 핵심 텍스트 | 사용 토큰 |
|---|---|---|---|---|
| 정상 (idle) | 사용자 입력 전 / 정상 입력 중 | `input-label` → `input` (height 36px, padding 12px / 8px) → 우측 `input-suffix` (absolute, pointer-events-none) → `input-helper` 한 줄 | 라벨 한글, suffix `USD` / `%` / `일`, helper 한글 가이드 | `input`, `input-label`, `input-helper`, `input-suffix`, `{spacing.input-h}`, `{spacing.input-px}`, `{spacing.input-py}`, `{spacing.input-pr-suffix}` |
| 포커스 (focus) | input focus-visible | 동일 + 보더 색 `border-line` → `primary` 전환 (frontend-dev 측) | 동일 | + focus 보더 (frontend-dev 측 클래스) |
| 사전 차단 에러 (validation) | `validateAnalyzePayload` 거절 | `input-label` → `input-error` (배경 `critical-soft`) → 우측 `input-suffix` (동일) → `input-helper-error` (텍스트 `critical`) | helper 한글 메시지 (예: "자본은 0 보다 커야 해요.") | `input-error`, `input-helper-error`, `input-suffix` |
| 비활성 (disabled) | 분석 중 (`mutation.isPending`) | 동일 dimension, 시각 동일, `disabled` attribute + `aria-busy` | 동일 | (v4 무회귀 — opacity 변경 없음) |

DOM 구조 표준 (frontend-dev 핸드오프):

```tsx
<div className="grid gap-1">
  <label className="input-label" htmlFor={fieldId}>
    자본 (USD)
  </label>
  <div className="relative">
    <input
      id={fieldId}
      className={cn(
        'input',
        // suffix 있을 때만 우측 padding 확장:
        hasSuffix ? 'pr-input-pr-suffix' : 'pr-input-px',
        hasError && 'input-error'
      )}
      aria-invalid={hasError}
      aria-describedby={helperId}
    />
    {hasSuffix && (
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
```

(클래스 이름은 frontend-dev 측 Tailwind / CSS 매핑에 따라 `h-input-h`, `bg-surface-muted` 등으로 풀어 적용. 위 예시는 합성 토큰 → 클래스 매핑이 잡힌 가정.)

### SearchPanel 검색 dropdown

| 상태 | 진입 조건 | 노출 컴포넌트 | 사용 토큰 |
|---|---|---|---|
| 닫힘 (closed) | `isOpen === false` 또는 `results.length === 0` | (hidden, panel unmount) | — |
| 열림 / 결과 있음 | `isOpen && results.length > 0` | `dropdown-panel` (input 바로 아래 absolute) → `search-result-item` × N (한 항목 34px) | `dropdown-panel`, `search-result-item`, `{spacing.dropdown-item-h}`, `{spacing.dropdown-item-py}` |
| 열림 / 옵션 포커스 | + 키보드 ↓ 또는 hover | 해당 항목만 `search-result-item-focus` 톤 | `search-result-item-focus` |
| 열림 / 결과 없음 | `isOpen && results.length === 0` | `dropdown-panel` 안에 한 줄 `body-sm` × `text-muted` "검색 결과 없음" | `dropdown-panel`, `{typography.body-sm}`, `{colors.text-muted}` |
| 닫힘 트리거 — outside | document mousedown/pointerdown/touchstart outside wrapper | 즉시 unmount | — |
| 닫힘 트리거 — ESC | wrapper 안 focus + ESC keydown | 즉시 unmount + focus 검색 input 으로 복귀 | — |
| 닫힘 트리거 — Tab | wrapper onBlur 의 relatedTarget 이 wrapper 외부 | 즉시 unmount | — |
| 닫힘 트리거 — 옵션 선택 | 옵션 click 또는 Enter | 즉시 unmount + ticker 선택 dispatch | — |

DOM 구조 표준:

```tsx
<div className="relative" ref={wrapperRef}>
  <input
    className="input pr-input-px"
    role="combobox"
    aria-expanded={isOpen}
    aria-controls={listboxId}
    aria-autocomplete="list"
    onKeyDown={handleKey} // Esc → 닫기, ↑↓ → focus 이동, Enter → 선택
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

`onMouseDown` + `e.preventDefault()` 는 outside-click 이벤트와 옵션 클릭이 충돌하지 않게 막는다 (옵션의 mousedown 이 wrapper 내부에 머무르므로 outside-click 가드는 발화 안 함, 동시에 input 의 blur 가 옵션 선택 전에 발화하지 않음).

### button 그룹

| 컴포넌트 | 자리 | 시각 size | hit area | 사용 토큰 |
|---|---|---|---|---|
| `button-primary` | InputPanel 분석 실행 CTA | 40px height, padding 10px, `button` 15px | 동일 (40×40 이상 풀폭) | `{spacing.button-primary-h}`, `{typography.button}` |
| `button-primary-disabled` | 동일, 분석 중 또는 사전 차단 | 동일 (시각 변경 없음) | 동일 | (v4 무회귀) |
| `button-secondary` | 에러 카드 "다시 시도" 등 | 32px height, padding 8px, `button-sm` 13px | 32×자유폭 | `{spacing.button-sm-h}`, `{typography.button-sm}` |
| `button-secondary-hover` | + hover | 동일 + 배경 `accent-soft` | 동일 | 동일 |
| `button-icon` | drawer close, 결과 카드 보조 아이콘 | 32×32px, padding 6px | **40×40px** (`before:absolute -inset-1`) | `{spacing.button-sm-h}`, `{spacing.hit-area-min}` |
| `button-icon-hover` | + hover | 동일 + 배경 `surface-muted` | 동일 | 동일 |
| `navbar-icon-button` (v4 무회귀) | navbar hamburger | 40×40px | 40×40px (자체) | `{spacing.hit-area-min}` |
| `favorite-toggle` (v4 무회귀) | ticker-header + sidebar 항목 별표 | 32×32px | **40×40px** (`before:absolute -inset-1`) | `{spacing.button-sm-h}`, `{spacing.hit-area-min}` |

### Sidebar 항목 (PR #21 nit #1 흡수)

| 상태 | 노출 합성 토큰 | 사용 토큰 |
|---|---|---|
| 기본 | `sidebar-item` (height 36px, padding 8px) | `{spacing.input-h}` 와 동일 36px (시각 정합) |
| hover | `sidebar-item-hover` (배경 `surface-muted`) | 동일 |
| active (현재 ticker) | `sidebar-item-active` (배경 `accent-soft` + 텍스트 `primary`) | 동일 |

Sidebar 의 sticky 오프셋 — `top: var(--spacing-navbar-h)` (60px). 인라인 `60px` 금지. 변수 직접 참조도 금지 — Tailwind theme 등록 토큰 (`top-navbar-h`) 또는 CSS 변수 (`top-[var(--spacing-navbar-h)]`).

### 키보드 Tab 순서 (v4 무회귀)

v4 의 Tab 순서 표 전체 무회귀. v5 가 손대지 않는다. dropdown 의 outside-click 닫힘과 ESC 닫힘이 추가되어 키보드 사용자의 dropdown 탈출이 더 자연스러워진다 (v4 의 "키보드 사용자는 dropdown 안에 갇혀 Tab 으로 빠져나오기 힘듬" 잠재 문제 해소).

### ARIA · 접근성 (AC-19)

v4 의 ARIA 명세 전체 무회귀. v5 가 추가하는 항목:

- **input**: `aria-invalid={hasError}`, `aria-describedby={helperId}`. helper 가 에러 톤일 때도 동일 ID 로 연결.
- **input-suffix**: `aria-hidden="true"`. 단위는 라벨 텍스트로 스크린리더가 읽음 (예: 라벨 "자본 (USD)").
- **dropdown wrapper input**: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`.
- **dropdown listbox**: `role="listbox"`, `aria-label="검색 결과"`.
- **dropdown option**: `role="option"`, `aria-selected`.
- **button-icon / favorite-toggle / button-secondary**: 항상 `aria-label` (텍스트 라벨 없는 경우) 또는 자체 텍스트. 색 강조만으로 의미를 전달하지 않음 (v4 무회귀).

---

## OPEN QUESTION 결정 (디자이너 영역) — v5 component-compactness

PRD §9 의 10건 중 디자이너 영역 6건 (R1~R6). PM 권고 대비 디자이너 v5 결정을 표로 명시.

| # | 질문 | v5 결정 | PM 권고 대비 |
|---|---|---|---|
| **R1** | input height / padding / font-size 토큰값 (PRD §9.1) | **`{spacing.input-h}: 36px`, `{spacing.input-px}: 12px`, `{spacing.input-py}: 8px`, typography `{typography.body-sm}` (14px)**. PM 권고 출발선 (36~40px) 중 최저값 채택. 사유 — Layout 절 "input 의 6px 다운으로 폼 한 줄 세로 14% 단축". CTA(40px) 와 한 단계 위계 차이. 모바일·데스크탑 분기 토큰 도입 안 함 — input-h 단일 토큰으로 두 뷰포트 정합 (Hit area 는 라벨·helper 합쳐 60px+ 이상). 라벨은 `label-sm` (13px / 700 / 1.25), helper 는 `caption` (12px). | PM 권고 출발선 수용 + 최저값 채택 |
| **R2** | input suffix 위치 (PRD §9.3) | **input 필드 내부 우측 absolute, `pointer-events: none` + `aria-hidden="true"`, 우측 padding `{spacing.input-pr-suffix}: 44px`**. PM 권고 (input 내부 우측 absolute, 정적 텍스트) 수용. hover toggle / 옆 selectbox 변형 안 함 — 현재 4 필드 단위 모두 고정. suffix typography 는 `{typography.input-suffix}` (13px / 400 / 1.2, `tnum`) 신규 — 본문(`body-sm` 14px)보다 살짝 작고 weight 약함. | PM 권고 수용 |
| **R3** | dropdown outside-click 대상 (PRD §9.4) | **dropdown wrapper 외부 mousedown + pointerdown + touchstart + ESC 키 + Tab 키 (wrapper 밖으로 focus 이동) 네 진입점**. PM 권고 (mousedown + ESC + Tab) 에 touchstart 명시 추가 — 모바일 터치 동작. outside scroll 닫힘은 도입 안 함 (토스톤 기준 과함). dropdown 안 옵션 mousedown 은 `e.preventDefault()` 로 outside 가드와 충돌 방지. | PM 권고 수용 + touchstart 명시 |
| **R4** | label 위치 (PRD §9.5) | **input 위 유지 + `label-sm` (13px / 700 / 1.25) 컴팩트 line-height**. PM 권고 (옵션 A) 수용. 데스크탑·모바일 분기 없음. v4 시점 라벨이 `body-strong` (16px) 또는 `body-md` (16px) 재사용 이었던 것을 v5 가 `label-sm` 단일 토큰으로 명시. line-height 1.25 로 라벨 한 줄 세로 16px (= 13×1.25 라운드업). 라벨과 input 사이 gap 은 frontend-dev 측 4px (`gap-1` 또는 `mt-1`). | PM 권고 수용 |
| **R5** | hit area 기준 (PRD §9.6) | **`{spacing.hit-area-min}: 40px`**. PM 권고 (≥ 40×40px) 수용. icon-only 버튼 (`button-icon`, `favorite-toggle`) 은 시각 size 32×32px 이지만 frontend-dev 측 `relative` + `before:absolute -inset-1` (= 8px 외곽 확장) 으로 hit area 를 40×40px 로 확장. 44×44px (iOS HIG 강력 권장) 미채택 사유 — 데스크탑 우선 도구의 정보 밀도와 균형. 32px 시각 + 40px hit area 분리가 토스 / Linear 패턴과 정합. | PM 권고 수용 |
| **R6** | 디자이너 부담 (PRD §9.9) | **components 절만 변경 — colors / spacing 기존 키 / typography 기존 키 / rounded 기존 키 / breakpoints 무수정 계승**. v5 prose 분량은 v4 의 약 70% (수정 사항 + 컴팩트 의도 명시 + 핸드오프). 신규 typography 3 키 (`button-sm`, `label-sm`, `input-suffix`), 신규 spacing 9 키 (`input-h`, `input-px`, `input-py`, `input-pr-suffix`, `dropdown-item-h`, `dropdown-item-py`, `button-primary-h`, `button-sm-h`, `hit-area-min`), 신규 합성 토큰 9 개 (`input-label`, `input-helper`, `input-helper-error`, `input-suffix`, `dropdown-panel`, `button-secondary`, `button-secondary-hover`, `button-icon`, `button-icon-hover`). 기존 합성 토큰의 size 키 다운 7 개 (`input`, `input-error`, `button-primary`, `button-primary-disabled`, `search-result-item`, `search-result-item-focus`, `sidebar-item` × 3). | PM 권고 수용 |

PRD §9 의 나머지 4건 (R7 prop 시그니처 / R8 다음 작업 / R9 디자이너 부담 = R6 동일 / R10 outside-click 훅 위치) 은 frontend-dev / PM / 사용자 영역.

- R7 (prop 시그니처 변경 압박) — frontend-dev 결정. 본 v5 는 prop 시그니처에 손대지 않는다 — `input-suffix` 는 DOM 구조 변경이지만 호출 측은 `<InputPanel />` 한 줄 (prop 시그니처 무변경).
- R8 (다음 작업) — 사용자 결정 (PM 권고 = PRD #3 claude-cli-analysis).
- R10 (outside-click 훅 위치) — frontend-dev 결정 (PM 권고 = `hooks/utils/useOutsideClick.ts`).

---

## lint 메모 (v5)

본 v5 (`component-compactness`) 는 v4 (`layout-redesign`) 의 토큰을 **무수정 계승** 하며 다음만 추가·갱신:

- **front matter `colors` 절**: v4 의 13 토큰 **그대로 복사**. 추가·변경 0.
- **front matter `typography` 절**: v4 의 12 키 + 신규 `button-sm` (13px / 700 / 1.2), `label-sm` (13px / 700 / 1.25), `input-suffix` (13px / 400 / 1.2, `tnum`) 3 키 추가. 기존 키 무변경.
- **front matter `spacing` 절**: v4 의 10 키 + 신규 컴팩트 dimension 9 키 (`input-h` 36px, `input-px` 12px, `input-py` 8px, `input-pr-suffix` 44px, `dropdown-item-h` 34px, `dropdown-item-py` 6px, `button-primary-h` 40px, `button-sm-h` 32px, `hit-area-min` 40px) 추가. 기존 키 무변경.
- **front matter `rounded` 절**: v4 의 3 키 그대로. 추가·변경 0.
- **front matter `breakpoints` 절**: v4 그대로.
- **front matter `components` 절**: v4 의 37 합성 토큰 그대로 보존 + 갱신 7 개 (size 다운, 토큰 키 자체는 보존) + 신규 9 개:
  - 신규 input 보조: `input-label`, `input-helper`, `input-helper-error`, `input-suffix`
  - 신규 dropdown: `dropdown-panel`
  - 신규 button: `button-secondary`, `button-secondary-hover`, `button-icon`, `button-icon-hover`
- **본문 절**: Overview (v5 의도) / Colors (v4 무회귀 + 신규 합성 토큰 대비 검증) / Typography (신규 3 키 근거) / Layout (v4 무회귀 + 신규 dimension 9 키 근거) / Elevation & Depth (dropdown-panel 그림자 정책) / Shapes (v4 무회귀) / Components (input·dropdown·button 그룹 + 사이드바 size 다운 + nit #1 흡수) / Do's and Don'ts (v4 무회귀 + v5 신규).
- **유저 시나리오**: 컴팩트 폼 진입 / outside-click 닫기 / 에러 톤 / 사이드바 정합 4 시나리오.
- **핸드오프 명세**: InputPanel 필드 / SearchPanel dropdown / button 그룹 / Sidebar / 키보드 Tab / ARIA 표.
- **OPEN QUESTION**: R1~R6 결정 표.

**무회귀**: v4 의 colors / typography 기존 키 / spacing 기존 키 / rounded / breakpoints / 37 composite 모두 그대로. frontend-dev 측 `tailwind.theme.json` 재생성은 신규 typography 3 키 + spacing 9 키 + 합성 토큰 9 키 + 갱신 합성 토큰 7 개의 size 키만 반영, v4 의 시각 언어와 dimension 은 무변경 → design:sync 결정적 무회귀.

산출 직전 `npx @google/design.md lint docs/design/component-compactness.md` 통과 목표:

- errors: 0
- warnings: 0
- info: 1 (token summary)

`contrast-ratio` 룰 회피 — drawer-scrim (v4 무회귀) 은 textColor 미정의. 신규 합성 토큰의 색 쌍은 모두 위 Colors 절 대비 표에서 AA (4.5:1) 통과 확인. `input-suffix` 의 5.29:1 은 통과 직전 마진이지만 의도가 prose 에 박혀 있다 (suffix 는 부속 표기, 본문 시선 우선).

`orphaned-tokens` 룰 회피 — 신규 typography 3 키는 모두 합성 토큰에서 참조됨 (`button-sm` → `button-secondary` + `button-secondary-hover`; `label-sm` → `input-label`; `input-suffix` → `input-suffix` 합성 토큰). 신규 spacing 9 키도 모두 합성 토큰의 height / padding / width 에서 참조.

`section-order` 룰 회피 — Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts 순서 고정 (v4 와 동일).

`missing-primary` 룰 회피 — `colors.primary` 정의 (v4 무회귀).

`missing-typography` 룰 회피 — colors / typography 모두 정의됨.
