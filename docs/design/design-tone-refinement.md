---
version: alpha
name: design-tone-refinement
description: Trading Signal Frontend — 사용자 dev 화면 직접 확인 결함 5건 (1차 3건 + 후속 2건) 일괄 흡수. v6 polish-followups 의 typography 15·rounded 3·breakpoints 4 무수정 계승. **본 v7 (rev2) 의 변경 축은 (a) colors front matter — 1차 v7 의 hex 재조정 + 후속 v7-rev2 의 비비드 강화 (accent-vivid / accent-vivid-soft 신규 2 토큰), (b) spacing front matter — dropdown-item-h 34→52, dropdown-item-py 6→10 갱신 + dropdown-item-gap 신규, (c) typography front matter — body-sm-strong 신규 (dropdown 옵션 라벨용), (d) components front matter — search-result-item 갱신 + button-primary 의 accent-vivid 호출**. 사용자 후속 verbatim 인용 — "드랍다운 컴포넌트는 글씨도 겹쳐지고 높이도 너무 작아서 불편하네. 색감을 좀더 비비드하게 해봐 지금 뭔가 전체적으로 회색빛이야". 토스 톤 (산뜻 + 신호적 채도) 정합. WCAG AA 4.5:1 모든 주요 쌍 무회귀 또는 향상.
colors:
  primary: "#1f3b4d"
  surface: "#ffffff"
  surface-muted: "#f6f8fa"
  border-line: "#eceff3"
  text-strong: "#0f1419"
  text-muted: "#5b6470"
  accent-soft: "#eaf0f6"
  accent-vivid: "#1d4ed8"
  accent-vivid-soft: "#dbeafe"
  warn: "#a14a06"
  warn-soft: "#fff3df"
  info: "#1c4fd1"
  info-soft: "#e7efff"
  critical: "#8e1717"
  critical-soft: "#fde1e1"
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
  body-sm-strong:
    fontFamily: Arial
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.35
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
  dropdown-item-h: 52px
  dropdown-item-py: 10px
  dropdown-item-gap: 2px
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
    typography: "{typography.body-sm-strong}"
    padding: "{spacing.dropdown-item-py}"
    height: "{spacing.dropdown-item-h}"
  search-result-item-meta:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  search-result-item-focus:
    backgroundColor: "{colors.accent-vivid-soft}"
    textColor: "{colors.accent-vivid}"
    rounded: "{rounded.sm}"
    typography: "{typography.body-sm-strong}"
    padding: "{spacing.dropdown-item-py}"
    height: "{spacing.dropdown-item-h}"
  search-result-item-focus-meta:
    backgroundColor: "{colors.accent-vivid-soft}"
    textColor: "{colors.accent-vivid}"
    typography: "{typography.caption}"
    padding: 0px
  button-primary:
    backgroundColor: "{colors.accent-vivid}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    typography: "{typography.button}"
    padding: 10px
    height: "{spacing.button-primary-h}"
  button-primary-disabled:
    backgroundColor: "{colors.accent-vivid}"
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

# design-tone-refinement 디자인 가이드 (v7-rev2)

## Overview

본 v7 (rev2) 는 사용자가 데스크탑 dev 화면에서 두 단계로 직접 지적한 결함 5건 (1차 3건 + 후속 2건) 의 일괄 흡수본이다. **1차 v7** 가 v6 (`docs/design/polish-followups.md`) 의 컴팩트 톤 시스템을 거의 무수정 계승하면서 colors front matter 13 키의 hex 만 재조정해 surface · border-line · text-strong 의 "탁함" 을 해소했다면, 본 **v7-rev2** 는 그 결과를 dev 화면에서 본 사용자가 남긴 후속 발화 두 건 — (a) "드랍다운 컴포넌트는 글씨도 겹쳐지고 높이도 너무 작아서 불편하네", (b) "색감을 좀더 비비드하게 해봐 지금 뭔가 전체적으로 회색빛이야" — 을 in-place 흡수한다. v8 별도 신설 없이 본 파일 한 곳에 누적 (PRD §9.10 결정).

**v7-rev2 의 변경 축 4가지** — (1) **colors 비비드 강화** — 1차 v7 의 13 키 그대로 유지 + 신규 2 토큰 (`accent-vivid` `#1d4ed8`, `accent-vivid-soft` `#dbeafe`) 추가. PRD §9.8 의 옵션 B (primary Slate 유지 + accent-vivid 신규) 결정 — 시그니처 정체성 (Signature Slate `#1f3b4d` navbar wordmark / sidebar-item-active / favorite-toggle-active 의 정체성 영역) 보존 + CTA / dropdown focus 의 "신호적 채도" 강조. (2) **dropdown 옵션 항목 height 키움** — 1차 v7 의 `dropdown-item-h: 34px` / `dropdown-item-py: 6px` 가 2줄 콘텐츠 (메인 라벨 + 메타) 에서 글자 겹침. v7-rev2 가 52px / 10px 로 갱신 + `dropdown-item-gap: 2px` 신규 토큰. (3) **typography body-sm-strong 신규** — dropdown 옵션 메인 라벨용 700 weight 토큰. 메타는 기존 `caption` 재활용. 14 → 15 typography 키. (4) **components search-result-item / search-result-item-focus 갱신 + 신규 -meta 쌍** — 2줄 콘텐츠 수용 + focus 톤이 accent-vivid-soft + accent-vivid 페어로 비비드 강조.

배경은 PRD `design-tone-refinement` §1.1.1 의 사용자 verbatim. **결함 4 (글자 겹침)** 의 원인은 PR #22 component-compactness 에서 정착된 `dropdown-item-h: 34px` 가 1줄 콘텐츠 기준이었던 데 비해 실제 옵션은 라벨 (`AAPL · Apple Inc.`) + 메타 (`US_EQUITY · USD · APPLE`) 2줄 구조였던 점이다. **결함 5 (비비드 부족)** 의 원인은 1차 v7 가 surface / border / text-strong 의 회색-탁한 잔여물은 해소했으나 **화면 어디에도 신호적 채도의 강조점이 없었던** 점이다. Signature Slate `#1f3b4d` 는 본질적으로 채도 낮은 dark-blue-gray (HSL S=43%) 라 CTA · focus · badge 모두 슬레이트 톤으로 흐를 때 화면 전체가 "흰색 + 옅은 회색 + 어두운 슬레이트" 로만 구성되어 활기 부족. v7-rev2 는 시그니처는 보존 + CTA / dropdown focus 에 비비드 액션 색 (accent-vivid `#1d4ed8` — HSL S=76%) 한 단계를 도입한다.

본 v7-rev2 의 톤 의도는 한 줄로 **"산뜻한 흰색 캔버스 + 옅은 경계선 + 진한 본문 텍스트 + 시그니처 정체성 영역 + 신호적 액션 채도"**. 1차 v7 의 4 축에 다섯 번째 축 ("신호적 액션 채도") 이 더해진 형태. CTA 버튼이 vivid blue 로 떠 있고, 검색 dropdown 의 focus 옵션이 vivid blue 톤 페어로 강조되며, 그 외 navbar wordmark · sidebar 활성 · 즐겨찾기 등 시그니처 영역은 Slate 그대로 보존. 두 톤이 의미 영역을 나누어 가지므로 시각 충돌 없이 활기와 정체성이 양립.

**무회귀 강제** — 1차 v7 의 시각 언어 골격 (Signature Slate primary / surface 순백 / border-line 옅음 / text-strong 진함) 모두 보존. v6 의 라운드 (8px / 12px / 999px), breakpoints 4, components 의 대부분 (favorite-toggle, badge-warn / -info / -critical, navbar-brand, sidebar-item-active 의 primary 영역 등) 무회귀. **본 v7-rev2 가 변경한 것은** (a) colors 에 2 키 추가 (13 → 15), (b) spacing dropdown-item-h 34→52 / dropdown-item-py 6→10 / dropdown-item-gap 2 신규 (22 → 23 키), (c) typography body-sm-strong 신규 (15 → 16 키), (d) components search-result-item 의 typography 토큰 교체 + search-result-item-focus 의 색 토큰 교체 + search-result-item-meta / search-result-item-focus-meta 신규 (46 → 48 키), (e) components button-primary / button-primary-disabled 의 backgroundColor 가 primary → accent-vivid 로 교체. WCAG AA 4.5:1 모든 주요 쌍 무회귀 또는 향상 (Colors 절의 대비비 표 v7-rev2 갱신본 참조).

## Colors

본 v7 (rev2) 의 핵심 변경 축. **1차 v7** 가 v6 의 13 토큰 키 셋을 무수정 유지하면서 hex 만 재조정 (surface · border-line · text-strong 등) 했다면, 본 **v7-rev2** 는 그 13 키를 그대로 보존하면서 **신규 2 토큰** (`accent-vivid` `#1d4ed8`, `accent-vivid-soft` `#dbeafe`) 을 추가한다. 토큰 키 셋: 13 → 15. 1차 v7 의 합성 토큰 참조는 모두 무회귀, 신규 토큰은 button-primary / search-result-item-focus 의 색 교체 cascade 에 사용된다.

### 비비드 톤 채택 사유 (v7-rev2 신규 — 사용자 후속 피드백 흡수)

사용자 verbatim — "**색감을 좀더 비비드하게 해봐 지금 뭔가 전체적으로 회색빛이야**" (PRD §1.1.1). 1차 v7 가 surface (`#ffffff`) · border-line (`#eceff3`) · text-strong (`#0f1419`) 의 회색-탁한 잔여물을 해소했음에도 화면 전체 인상이 회색빛이라는 사용자 시지각의 원인은 디자이너 해석상 다음 셋이다 — (a) Signature Slate `#1f3b4d` 가 본질적으로 채도 낮은 dark-blue-gray (HSL `203°, 43%, 21%`) 라 CTA / focus / badge / link 가 모두 슬레이트 톤일 때 시각 활기 부족, (b) accent-soft (`#eaf0f6`) 가 옅은 슬레이트 fill 이라 강조감 약함, (c) 1차 v7 가 strong 영역 (border-line 옅게 + text-strong 진하게) 만 보강하고 **신호 영역 (CTA · dropdown focus 등 액션 컨텍스트)** 의 채도 강화가 부재.

PRD §9.8 의 세 옵션 (A: primary 자체 교체 / B: primary 유지 + accent-vivid 신규 / C: 강조 영역 채도만 살림) 중 **옵션 B 결정**. 사유 4건:

1. **시그니처 정체성 보존** — Signature Slate `#1f3b4d` 는 `palette-modernization` PRD 정착 이후 navbar wordmark / sidebar-item-active / favorite-toggle-active / price-bar-target 등 브랜드 영역에 누적 사용. 옵션 A (primary 교체) 채택 시 로고·헤더의 시그니처 재정립 비용 + 사용자가 이미 익숙해진 브랜드 톤 변경. v7-rev2 의 한 PR 안에서 흡수하기 어려운 비용. **옵션 B 가 시그니처 영역은 Slate 보존 + 액션 영역만 비비드 도입 균형**.
2. **트레이딩 도구 톤 정합** — 트레이딩 / 분석 도구의 액션 색은 청색 계열 (Bloomberg 다크 모드 액센트, Robinhood Cash Green, 토스 메인 블루 `#3182f6`) 이 정합. accent-vivid 후보 (vivid blue `#1d4ed8` (Tailwind blue-700) / indigo `#4f46e5` / sky `#0ea5e9`) 중 vivid blue `#1d4ed8` 는 **신호적 (signal-blue) + 신뢰감 (trust-blue) + Signature Slate 와의 톤 친화 (slate 의 hue 가 청록색 계열이라 시각 충돌 0) + WCAG AA 페어 마진 안전 (× accent-vivid-soft 5.49:1)** 의 넷이 가장 균형. indigo 는 보라빛이 강해 슬레이트와 톤 충돌 가능, sky 는 너무 밝아 액션 신호의 무게감 약함, vivid blue 가 중도. blue-600 (`#2563eb`) 은 vivid 강도 더 강하나 페어 마진 4.16:1 (AA 미달) 이라 blue-700 결정.
3. **WCAG AA 4.5:1 무회귀 강제** — accent-vivid `#1d4ed8` × surface `#ffffff` = 6.70:1 (4.5:1 마진 +49%), accent-vivid `#1d4ed8` × accent-vivid-soft `#dbeafe` = 5.49:1 (4.5:1 마진 +22%). 두 쌍 모두 AA 통과. CTA 버튼 (accent-vivid 배경 + surface 흰 텍스트) 11.73:1 → 6.70:1 로 하향이나 4.5:1 마진 +49% 안전. lint 실측 통과 (errors=0, warnings=0).
4. **사용 영역 한정** — accent-vivid 의 cascade 는 v7-rev2 가 명시적으로 두 합성 토큰에 한정 (`button-primary` / `button-primary-disabled` 의 backgroundColor + `search-result-item-focus` / `search-result-item-focus-meta` 의 색 페어). 그 외 영역 (navbar-brand, sidebar-item-active, badge-accent, favorite-toggle-active, button-secondary, price-bar-target) 은 **Signature Slate `primary` 그대로 보존**. 두 색이 의미 영역을 나누어 가져 시각 충돌 없음.

**사용 영역 룰 (옵션 B 의 핵심)** — accent-vivid 는 다음 영역에서만 등장:

- **CTA 버튼 배경** — `button-primary` / `button-primary-disabled` 의 backgroundColor. 한 화면 1개 원칙 유지 (v6 의 룰 무회귀).
- **dropdown / listbox focus 옵션** — `search-result-item-focus` (배경 `accent-vivid-soft` + 텍스트 `accent-vivid`) + `search-result-item-focus-meta` (메타 텍스트 `accent-vivid`).
- **focus ring** — input · button · listbox option 의 `:focus-visible` outline. Tailwind `focus-visible:ring-{accent-vivid}` 등으로 표현 (frontend-dev 핸드오프 영역).
- **link 강조 (옵션)** — 일반 텍스트 link 가 필요하면 `text-info` (정보 청색) 또는 `text-accent-vivid` 중 디자이너 선택. 본 v7-rev2 는 link 합성 토큰을 정의하지 않음 (사용처가 명확해질 때 별도 PRD 영역).

**Signature Slate primary 사용 영역 (v6 무회귀 보존)** — 다음 영역은 accent-vivid 가 침범하지 않는다:

- `navbar-brand.textColor` — 브랜드 wordmark.
- `sidebar-item-active.textColor` — sidebar active 상태.
- `favorite-toggle-active.textColor` — 즐겨찾기 active 톤.
- `badge-accent.textColor` — 일반 강조 배지 (accent-soft 페어).
- `button-secondary.textColor` / `button-secondary-hover.textColor` — secondary 버튼 텍스트.
- `price-bar-target.backgroundColor` — 가격 바 target 마커.

이 둘 — accent-vivid (액션 영역) vs primary Slate (시그니처 정체성 영역) — 의 영역 분리가 옵션 B 의 핵심. 사용자 시지각 결과는 "흰색 캔버스 위에 두 톤이 의미 단위로 등장" — 활기 + 정체성 양립.

### 토큰 hex 1차 v7 무회귀 + 비비드 신규 2 토큰

13 키의 hex 는 1차 v7 무회귀 (`primary` `#1f3b4d`, `surface` `#ffffff`, `surface-muted` `#f6f8fa`, `border-line` `#eceff3`, `text-strong` `#0f1419`, `text-muted` `#5b6470`, `accent-soft` `#eaf0f6`, `warn` `#a14a06`, `warn-soft` `#fff3df`, `info` `#1c4fd1`, `info-soft` `#e7efff`, `critical` `#8e1717`, `critical-soft` `#fde1e1`). 신규 2 토큰 추가:

- `accent-vivid: "#1d4ed8"` — vivid blue (Tailwind blue-700). HSL `222°, 76%, 48%`. WCAG AA — × surface 6.70:1, × accent-vivid-soft 5.49:1, × surface-muted 6.30:1.
- `accent-vivid-soft: "#dbeafe"` — vivid blue 의 옅은 fill (Tailwind blue-100). HSL `214°, 95%, 93%`. WCAG AA — × accent-vivid 5.49:1, × text-strong 15.17:1 (안전 마진 충분).

### 톤 재조정 의도 (요지)

토스 톤의 시각 비밀은 세 축으로 분해된다 — **(1) 산뜻한 흰색 캔버스**, **(2) 카드 vs 페이지의 분리감을 옅은 한 단계로 처리**, **(3) 시그니처 색을 강조 영역에 한정**. v6 는 시그니처 색의 사용 영역은 이미 한정되어 있었으나 (Signature Slate `primary` 의 "한 화면에 두 지점 + navbar wordmark 1회" 룰), 캔버스·분리감·본문 위계 세 축이 미세하게 어둑·진한·약한 잔여물을 가지고 있어 사용자 시지각에 "탁함" 으로 누적됐다. 본 v7 가 세 축을 동시에 정합한다 — `surface-muted` 를 더 산뜻하게 (`#f5f7fa` → `#f6f8fa`, L 92.84% → 93.63%), `border-line` 을 더 옅게 (`#dbe2ea` → `#eceff3`), `text-strong` 을 더 진하게 (`#17202a` → `#0f1419`). 키워드는 **토스 톤 / 산뜻 / 시그니처 강조 / 정보 밀도** 네 단어로 요약된다.

### 신·구 비교 표 (v6 → 1차 v7 → v7-rev2)

각 토큰의 hex 재조정 단일 표. **`primary` / `surface` 두 키는 v6/1차v7/rev2 모두 무변경** (시그니처 정체성 + 순백 캔버스 유지). 나머지 11 키는 1차 v7 에서 미세 조정 + v7-rev2 무회귀. **신규 2 키** (`accent-vivid` / `accent-vivid-soft`) 는 v7-rev2 추가.

| 토큰 키 | v6 hex | v7 hex | ΔL | 재조정 의도 |
|---|---|---|---|---|
| `primary` | `#1f3b4d` | `#1f3b4d` | 0 | **무변경**. Signature Slate 의 브랜드 정체성 유지. 사용처는 강조 영역 한정 (CTA / focus / active / wordmark) — "primary 의 사용 영역" 절 참조. |
| `surface` | `#ffffff` | `#ffffff` | 0 | **무변경**. 순백 캔버스. 페이지 · 카드 · navbar · sidebar · dropdown-panel · button-secondary · ticker-header 등 30+ 합성 토큰의 base. PRD §9.4 의 두 옵션 (`#fafbfc` / `#ffffff`) 중 **`#ffffff` 결정** — 산뜻함의 정점은 순백이며, surface-muted 의 옅은 단계 (L 93.63%) 만으로 카드 vs 페이지 분리감을 충분히 확보. |
| `surface-muted` | `#f5f7fa` | `#f6f8fa` | +0.79% | 미세하게 더 산뜻. surface 와의 L 차 6.37% (v6: 7.16%) — PRD §9.4 의 "≥3% L 차이" 강제 충족. 시각상은 거의 동일하지만 미세하게 더 밝아지고 살짝 더 따스한 톤. shell · main-area · sidebar-item-hover · input · navbar-icon-button-hover · button-icon-hover · sidebar-empty · drawer 의 일부 등 합성 토큰에 자동 cascade. |
| `border-line` | `#dbe2ea` | `#eceff3` | +6.32% | 더 옅게. 카드 사각형 박스의 두드러짐 해소 — 카드가 페이지와 자연스럽게 융합되어 토스의 "카드 같지 않은 카드" 느낌. `price-bar-track` 의 회색 트랙도 동일 cascade. **PRD §9.7 응답** — border 가 너무 옅어 카드 경계가 사라지는 (정보 위계 약화) 위험과의 균형점. L=93.04% 로 surface 와 약 7% 차이가 남아 경계가 보이되 압박감은 없다. |
| `text-strong` | `#17202a` | `#0f1419` | -3.65% | 더 진한 톤. surface 대비 16.45:1 → 18.51:1 (+12.5% 향상). 본문·헤드라인·카드 안 텍스트의 위계가 뚜렷해진다. surface-muted 대비 15.33:1 → 17.39:1. drawer-scrim 의 backgroundColor 도 동일 cascade (scrim 은 opacity 가 별도 적용되므로 시각 회귀 영향은 미세). |
| `text-muted` | `#5b6878` | `#5b6470` | -1.10% | 거의 동일 (가독성 무회귀). 미세하게 더 중성적인 회색으로 surface-muted 와의 톤 충돌 회피. surface 대비 5.68:1 → 6.00:1 (+5.6% 향상), surface-muted 대비 5.29:1 → 5.63:1 (+6.4% 향상) — WCAG AA 4.5:1 안전 마진 증가. caption · input-helper · input-suffix · sidebar-section-header · sidebar-empty · sidebar-item (text-muted 사용 시) · favorite-toggle 의 톤 무회귀. |
| `accent-soft` | `#e6ecf2` | `#eaf0f6` | +1.10% | 미세하게 더 밝게. `primary` 의 가벼운 fill — search-result-item-focus · sidebar-item-active · button-secondary-hover · badge-accent · favorite-toggle-active 의 hover/active 톤. primary 와의 대비 9.85:1 → 10.21:1 (+3.7% 향상). |
| `warn` | `#a04a09` | `#a14a06` | -0.16% | 거의 동일. 주황빛 미세 보정 (R 채널 +1, B 채널 -3). card-warn · badge-warn · warn-soft 와의 톤 정합. surface 대비 6.04:1 → 6.00:1 (-0.04, 4.5:1 안전 마진 충분). |
| `warn-soft` | `#fff4df` | `#fff3df` | -0.04% | 거의 동일. warn 텍스트 (`#a14a06`) 와의 페어 톤 미세 정합 — warn × warn-soft 5.54:1 → 5.47:1 (-0.07, 4.5:1 안전 마진 충분). |
| `info` | `#1f4fc0` | `#1c4fd1` | +0.40% | 미세하게 더 신호적인 청색 (B 채널 +17). info-soft 와의 페어 + price-bar-entry · badge-info 의 강조감 강화. surface 대비 7.15:1 → 6.80:1 (-0.35, 4.5:1 안전 마진 충분). |
| `info-soft` | `#e8efff` | `#e7efff` | -0.10% | 거의 동일. info 텍스트와의 페어 톤 미세 정합 — info × info-soft 6.20:1 → 5.89:1 (-0.31, 4.5:1 안전 마진 충분). |
| `critical` | `#8a1818` | `#8e1717` | +0.31% | 거의 동일. 진한 적색 미세 보정 — card-critical · badge-critical · input-error · input-helper-error · price-bar-stop 의 강조감 미세 강화. surface 대비 9.44:1 → 9.19:1 (-0.25, 4.5:1 안전 마진 충분). |
| `critical-soft` | `#fde2e2` | `#fde1e1` | -0.02% | 거의 동일. critical 텍스트와의 페어 톤 미세 정합 — critical × critical-soft 7.71:1 → 7.45:1 (-0.26, 4.5:1 안전 마진 충분). |
| `accent-vivid` | — | `#1d4ed8` (v7-rev2 신규) | — | **v7-rev2 신규** — vivid blue (Tailwind blue-700). HSL `222°, 76%, 48%`. CTA (button-primary) backgroundColor + dropdown focus 옵션 색 페어 한정. 액션 영역에 신호적 채도 한 단계 도입. WCAG AA — × surface 6.70:1, × accent-vivid-soft 5.49:1. |
| `accent-vivid-soft` | — | `#dbeafe` (v7-rev2 신규) | — | **v7-rev2 신규** — vivid blue 의 옅은 fill (Tailwind blue-100). HSL `214°, 95%, 93%`. dropdown focus 옵션 배경 + 가능 시 hover 등 보조 영역. WCAG AA — × accent-vivid 5.49:1, × text-strong 15.17:1. |

**요약 (v7-rev2)** — `primary` / `surface` 무변경, `surface-muted` / `text-strong` / `text-muted` / `border-line` / `accent-soft` 5 키는 1차 v7 의 의도 명확한 톤 재조정 결과 무회귀, `warn` / `warn-soft` / `info` / `info-soft` / `critical` / `critical-soft` 6 키는 1차 v7 의 페어 일관성 미세 보정 결과 무회귀. **`accent-vivid` / `accent-vivid-soft` 2 키 신규 추가** (v7-rev2 결함 5 흡수). 총 13 키 → 15 키. PRD §3.3 + §3.5 의 재조정 방향 충실 반영.

### WCAG AA 대비비 표 (v7-rev2 갱신본 — 4.5:1 무회귀 강제)

주요 (text 색 × 배경 색) 쌍 16건 (1차 v7 의 13건 + v7-rev2 신규 3건). **모든 쌍이 4.5:1 이상이며, 1차 v7 대비 무회귀 또는 신규 안전 마진 확보**. 표 칼럼은 v6 → 1차 v7 → v7-rev2 의 3단계 추적.

| Foreground × Background (사용처 예) | v6 비율 | 1차 v7 비율 | v7-rev2 비율 | Δ (v6 → rev2) | 4.5:1 |
|---|---|---|---|---|---|
| `text-strong` × `surface` (본문·헤드라인 / 페이지·카드) | 16.45:1 | 18.51:1 | **18.51:1** | +2.06 | OK |
| `text-strong` × `surface-muted` (shell · main-area · input 본문) | 15.33:1 | 17.39:1 | **17.39:1** | +2.06 | OK |
| `text-muted` × `surface` (caption · input-helper · sidebar-section-header) | 5.68:1 | 6.00:1 | **6.00:1** | +0.32 | OK |
| `text-muted` × `surface-muted` (input-suffix · sidebar-empty · favorite-toggle) | 5.29:1 | 5.63:1 | **5.63:1** | +0.34 | OK |
| `primary` × `surface` (button-secondary · navbar-brand · favorite-toggle-active text) | 11.73:1 | 11.73:1 | **11.73:1** | 0 | OK |
| `primary` × `accent-soft` (sidebar-item-active · badge-accent · button-secondary-hover) | 9.85:1 | 10.21:1 | **10.21:1** | +0.36 | OK |
| `surface` × `primary` (구 button-primary 의 흰 텍스트 — v7-rev2 에서 합성 토큰 cascade 이탈) | 11.73:1 | 11.73:1 | **(미사용)** | — | — |
| `surface` × `accent-vivid` (v7-rev2 button-primary 의 흰 텍스트 / vivid blue 배경) | — | — | **6.70:1** | (신규) | OK |
| `accent-vivid` × `accent-vivid-soft` (v7-rev2 search-result-item-focus · -focus-meta) | — | — | **5.49:1** | (신규) | OK |
| `accent-vivid` × `surface` (가능 시 link 강조 또는 focus ring 텍스트) | — | — | **6.70:1** | (신규) | OK |
| `warn` × `warn-soft` (card-warn · badge-warn) | 5.54:1 | 5.47:1 | **5.47:1** | -0.07 | OK |
| `warn` × `surface` (warn 텍스트 / 페이지·카드) | 6.04:1 | 6.00:1 | **6.00:1** | -0.04 | OK |
| `info` × `info-soft` (badge-info) | 6.20:1 | 5.89:1 | **5.89:1** | -0.31 | OK |
| `info` × `surface` (info 텍스트 / 페이지·카드) | 7.15:1 | 6.80:1 | **6.80:1** | -0.35 | OK |
| `critical` × `critical-soft` (card-critical · badge-critical · input-error) | 7.71:1 | 7.45:1 | **7.45:1** | -0.26 | OK |
| `critical` × `surface` (critical 텍스트 / 페이지·카드) | 9.44:1 | 9.19:1 | **9.19:1** | -0.25 | OK |

**해석 (v7-rev2)** — 1차 v7 의 13건 모두 무회귀. v7-rev2 신규 3건 (accent-vivid 페어) 모두 4.5:1 통과 + 안전 마진 충분. `accent-vivid × accent-vivid-soft` 5.49:1 (AA 기준 +22% 마진) — dropdown focus 옵션 텍스트 × 배경 페어. CTA 버튼 (surface × accent-vivid) 의 흰 텍스트 / vivid 배경은 6.70:1 (AA 기준 +49% 마진). PRD AC-5-6 충족. **WCAG AA 무회귀 강제** (PRD AC-3-7 / AC-5-6) 충족. lint 실측 통과 (errors=0 / warnings=0).

**vivid blue 의 hex 선정 사유** — 초기 후보 `#2563eb` (Tailwind blue-600) 는 `× accent-vivid-soft #dbe7ff` 실측 4.16:1 로 AA 4.5:1 미달. **`#1d4ed8` (Tailwind blue-700) 결정** — 한 단계 더 진한 vivid blue 로 `× accent-vivid-soft #dbeafe` 5.49:1 안전 마진 + vivid 채도 무회귀 (HSL `222°, 76%, 48%` — saturation 76% 여전히 강한 비비드). 사용자 "비비드" 표현 정합. blue-700 은 토스 메인 블루 (`#3182f6`) 와의 톤 친화 + Bloomberg 액션 청색과의 정합도 양호.

### primary / accent-vivid 의 사용 영역 (v7-rev2 갱신 — 두 톤의 의미 영역 분리)

v7-rev2 는 Signature Slate `primary` `#1f3b4d` **무변경** + 신규 `accent-vivid` `#1d4ed8` 추가. 두 톤은 **의미 영역을 나누어** 사용한다 — primary 는 시그니처 정체성 영역, accent-vivid 는 액션 / focus 신호 영역. 두 영역이 침범하지 않으므로 화면에 두 톤이 동시에 등장해도 시각 충돌 없음.

**primary (Signature Slate) 사용 영역** (정체성 보존 — v6/1차v7 무회귀):

- **브랜드 wordmark** — `navbar-brand.textColor`. 한 화면에 1회.
- **sidebar active 상태** — `sidebar-item-active.textColor`. accent-soft 배경 위 슬레이트 텍스트.
- **즐겨찾기 active 톤** — `favorite-toggle-active.textColor`. accent-soft 배경 위 슬레이트 아이콘.
- **일반 강조 badge** — `badge-accent.textColor`. accent-soft 배경 위 슬레이트 텍스트.
- **secondary 버튼 텍스트** — `button-secondary.textColor` / `button-secondary-hover.textColor`. 흰색·accent-soft 배경 위 슬레이트.
- **가격 바 target 마커** — `price-bar-target.backgroundColor`. 결과 ticker-header 안 가격 시각화의 의미적 강조점.

**accent-vivid 사용 영역** (액션 / focus 신호 — v7-rev2 신규):

- **CTA 버튼 배경** — `button-primary.backgroundColor` / `button-primary-disabled.backgroundColor`. 한 화면에 1개 원칙 유지. 본 v7-rev2 가 1차 v7 의 `{colors.primary}` → `{colors.accent-vivid}` 로 cascade 교체.
- **dropdown / listbox focus 옵션** — `search-result-item-focus.backgroundColor` (accent-vivid-soft) + `search-result-item-focus.textColor` (accent-vivid) + `search-result-item-focus-meta.textColor` (accent-vivid). 옵션이 키보드 ↑↓ 로 활성화되면 vivid blue 페어로 강조 — 사용자 시지각에 "신호적 선택" 인상.
- **focus ring** — input · button · listbox option 의 `:focus-visible` outline 색. Tailwind `focus-visible:ring-{accent-vivid}` (또는 `focus-visible:outline-{accent-vivid}`) 클래스. 별도 합성 토큰 없이 frontend-dev 핸드오프 영역.

**두 톤 모두의 사용 금지 영역** (비강조 누수 차단):

- **카드 안 본문 텍스트** — 카드 텍스트는 항상 `text-strong` 또는 `text-muted`. primary 또는 accent-vivid 가 본문 텍스트 톤으로 흘러가면 시각 부담.
- **일반 텍스트 link** — link 가 필요하면 `info` (정보성 청색) 또는 `text-strong` + underline. 강조가 필요한 link 는 `accent-vivid` 가능하나 본 v7-rev2 는 link 합성 토큰 정의 0건이라 frontend-dev 가 호출처를 도입할 때 디자이너 협의 필요.
- **일반 button border** — button 외곽선이 필요하면 `border-line` 으로. primary 또는 accent-vivid border 는 명확한 강조 신호일 때만.
- **일반 card border** — card 가 강조 신호가 필요하면 `border-line` 또는 `accent-soft` background. primary 또는 accent-vivid border 는 시각 압박감.
- **본문 강조 단어** — 본문 중 강조가 필요하면 `text-strong` + `body-strong` typography. 색 강조는 의미적 액션 신호가 명확할 때만.

**reviewer 검증 룰** — frontend-dev 핸드오프 시 다음 합성 토큰 외 위치에 `text-primary` / `bg-primary` / `text-accent-vivid` / `bg-accent-vivid` / `bg-accent-vivid-soft` 클래스가 등장하면 본 룰 위반:

- primary 허용 호출처 6건: `navbar-brand`, `sidebar-item-active`, `favorite-toggle-active`, `badge-accent`, `button-secondary` / `button-secondary-hover`, `price-bar-target`.
- accent-vivid 허용 호출처 4건: `button-primary` / `button-primary-disabled`, `search-result-item-focus` / `search-result-item-focus-meta`, focus ring 영역.
- 그 외 등장 시 reviewer 변경 요청.

## Typography

1차 v7 가 v6 의 15 키 무수정 계승했고, **v7-rev2 는 결함 4 (dropdown 옵션 항목 글자 겹침) 흡수를 위해 신규 1 키** (`body-sm-strong`) 만 추가한다. 15 → 16 키. 기존 15 키 값 한 글자 변경 없음.

`display` (30px / 700 / 1.18), `h1` (22px), `h2` (17px), `body-md` (16px), `body-sm` (14px), `body-strong` (16px / 700), `caption` (12px), `button` (15px / 700), `button-sm` (13px / 700), `badge` (13px / 700), `mono-numeric` (15px / 700 / `tnum`), `nav-brand` (16px / 700), `sidebar-section` (12px / 700 / letterSpacing 0.04em), `label-sm` (13px / 700), `input-suffix` (13px / 400 / `tnum`) 모두 v6 그대로. Arial fontFamily 도 무변경.

### v7-rev2 신규 — `body-sm-strong` (dropdown 옵션 메인 라벨)

`body-sm-strong: 14px / 700 / 1.35` — `body-sm` (14px / 400 / 1.5) 의 굵기 버전. line-height 가 본문 `body-sm` 의 1.5 보다 살짝 좁은 1.35 인 것은 dropdown 옵션 항목 안에서 메인 라벨 한 줄이 차지하는 세로 공간을 컴팩트하게 유지하기 위함 — 14 × 1.35 ≈ 18.9px 한 줄. 메타 (`caption` 12 × 1.4 ≈ 16.8px) 와의 합 ≈ 35.7px + `dropdown-item-gap` 2px ≈ 37.7px + 상하 `dropdown-item-py` 10px × 2 = 20px 합 **약 57.7px** 가 옵션 항목 시각 점유, `dropdown-item-h` 52px 안에 자연 수용 (line-box 가 약간 압축되지만 글자 겹침 0).

`body-sm-strong` 의 사용처는 **`search-result-item` / `search-result-item-focus` 의 메인 라벨 typography 한정**. 그 외 영역에 본 토큰을 사용하면 dropdown 옵션 라벨과의 시각 신호가 흐려진다. 본문 강조가 필요하면 기존 `body-strong` (16px / 700 / 1.5) 또는 `body-md` 의 `<strong>` 태그를 사용.

타이포 위계가 색 톤 재조정 없이도 정보 위계를 충분히 가져가는 것은 v5/v6 가 정착시킨 자산. v7-rev2 의 신규 `body-sm-strong` 은 그 자산을 dropdown 옵션 항목의 2줄 구조 (라벨 + 메타) 수용으로 확장한다 — 라벨이 굵기로 정보 위계 1순위, 메타가 가는 회색으로 정보 위계 2순위.

## Layout

1차 v7 가 v6 의 layout 가이드 전체 무수정 계승했고, **v7-rev2 는 결함 4 (dropdown 옵션 항목 글자 겹침) 흡수를 위해 spacing 절 3 키 갱신·추가**. 3-section shell (navbar 60px + sidebar 264px + main), 데스크탑·모바일·태블릿 정책, drawer slide-in, 결과 6블록 위계 모두 v6/v7 그대로.

### v7-rev2 spacing 갱신·추가 (결함 4 흡수)

- **`dropdown-item-h: 34px → 52px`** — 1차 v7 (PR #22 component-compactness 정착) 의 34px 가 1줄 콘텐츠 기준이라 2줄 콘텐츠 (라벨 + 메타) 의 글자 겹침. 52px 로 키워 라벨 `body-sm-strong` (14 × 1.35 ≈ 19px) + `dropdown-item-gap` 2px + 메타 `caption` (12 × 1.4 ≈ 17px) + 상하 `dropdown-item-py` 10 × 2 = 20px 합 ≈ 58px 가 옵션 항목에 자연 수용 (52 본체 + 2 보더 + 4 시각 여유 ≈ 58). PRD §9.9 의 52~56px 권고 중 **52px 결정** — 가장 컴팩트 + 2줄 안전 수용.
- **`dropdown-item-py: 6px → 10px`** — 상하 padding 도 동반 키움. 옵션 항목 내부 라벨·메타가 항목 경계에 닿지 않게 호흡.
- **`dropdown-item-gap: 2px` (신규)** — 라벨 line-box (line-height 1.35) 와 메타 line-box (line-height 1.4) 사이 추가 시각 간격. 2px 은 라벨의 1.35 line-height 가 이미 라벨 글자 위·아래 약 3.5px 의 leading 을 포함하므로, 추가 2px 만으로도 라벨 baseline 과 메타 cap-height 사이 약 5~6px 호흡 확보. 메타 폰트 (`caption`) 의 가독성 안전.

### dropdown 옵션 항목 명세 (결함 4 흡수)

본 v7-rev2 의 dropdown 옵션 항목 구조 (`search-result-item` / `search-result-item-focus` 합성 토큰 의 시각 명세):

```
┌─────────────────────────────────────────┐ ← border-line 옅음
│                                         │ ← padding-top: 10px (dropdown-item-py)
│  AAPL · Apple Inc.                      │ ← 메인 라벨: body-sm-strong, text-strong (focus 시 accent-vivid)
│                                         │ ← dropdown-item-gap: 2px
│  US_EQUITY · USD · APPLE                │ ← 메타: caption, text-muted (focus 시 accent-vivid)
│                                         │ ← padding-bottom: 10px (dropdown-item-py)
└─────────────────────────────────────────┘
  └─ height: 52px (dropdown-item-h)
```

DOM 마크업 권고 (frontend-dev 핸드오프):

```tsx
<li role="option" aria-selected={...} className="search-result-item flex flex-col gap-[2px] px-3 py-[10px]">
  <span className="search-result-item-label">{symbol} · {name}</span>
  <span className="search-result-item-meta">{market} · {currency} · {fullName}</span>
</li>
```

- `<li>` 의 `display: flex; flex-direction: column; gap: var(--spacing-dropdown-item-gap)` 가 라벨·메타의 수직 stacking + 2px gap 보장.
- `<span class="search-result-item-label">` — `body-sm-strong` typography + 활성 시 색 cascade.
- `<span class="search-result-item-meta">` — `caption` typography + `text-muted` (focus 시 `accent-vivid`) color cascade.
- `aria-activedescendant` 패턴 (v6/1차v7 ARIA 무회귀) 그대로 — `<ul role="listbox">` 가 activedescendant 로 active option id 호출, `<li role="option">` 가 aria-selected 으로 시각 강조 톤 분기.
- 키보드 ↑↓ 이동 시 활성 옵션이 viewport 안에 보이도록 `scrollIntoView({ block: 'nearest' })` (frontend-dev 영역, v6 무회귀).

### v7-rev2 spacing 무회귀 절 (1차 v7 그대로)

`xs`/`sm`/`md`/`lg`/`xl`/`2xl`/`navbar-h`/`sidebar-w`/`drawer-w`/`main-max-w`/`input-h`/`input-px`/`input-py`/`input-pr-suffix`/`input-pr-suffix-sm`/`input-pr-suffix-md`/`input-pr-suffix-lg`/`button-primary-h`/`button-sm-h`/`hit-area-min` 19 키 한 글자 변경 없음. v6 의 단위별 너비 분기 (sm 36px / md 44px / lg 56px) 그대로 유효. v7-rev2 의 spacing 키 셋: 22 → 23 키 (`dropdown-item-h` / `dropdown-item-py` 값 갱신 + `dropdown-item-gap` 신규).

### PRD §3.2 sidebar 높이 fix 의 디자인 의도

PRD 의 결함 2 (좌측 사이드바 높이 부족) 는 grid 정의의 책임 영역 (FE Dev) 이지만 디자인 의도는 본 v7 가 명시한다 — **사이드바는 데스크탑에서 navbar 아래 viewport 끝까지 한 면으로 채워진다**. 사이드바 내부 콘텐츠 (분석 히스토리 + 즐겨찾기) 가 짧을 때도 사이드바 영역 자체는 viewport 끝까지 stretched. `sidebar` 합성 토큰의 `backgroundColor: {colors.surface}` 가 캔버스 흰색과 동일하므로 시각상은 sidebar 영역과 main-area (`{colors.surface-muted}`) 의 옅은 L 차 (6.37%) 만으로 영역 구분이 표현된다. 그 아래 회색 빈 공간 (PRD §1.2 의 잔여 영역) 은 회수된다. 모바일 drawer 모드는 본 v7 무관 — drawer 는 absolute / fixed 포지셔닝이라 grid stretch 영향 없음.

### PRD §3.1 dropdown 위치 fix 의 디자인 의도

PRD 의 결함 1 (dropdown 위치 어긋남) 도 FE Dev 책임 영역이지만 디자인 의도는 본 v7 가 명시한다 — **dropdown 은 input 의 직접 부모 `position: relative` wrapper 의 자식으로, input 의 `top: 100%` 바로 아래에 anchor**. `dropdown-panel` 합성 토큰의 `backgroundColor: {colors.surface}` + `rounded: {rounded.sm}` (8px) 가 input 의 surface-muted 배경 + 동일 sm 라운드와 시각적으로 자연 연속. 두 노드 사이 4~8px 간격으로 명확히 분리되되 페어로 묶여 있다는 시각 신호. 옵션 li (`search-result-item`) 의 `padding: {spacing.dropdown-item-py}` (6px) + `height: {spacing.dropdown-item-h}` (34px) 가 v6 무회귀 — 시각 압박 없이 옵션 텍스트 (`body-sm`) 가 자연스럽게 호흡.

## Elevation & Depth

v6 의 평면 디자인 기조 **무회귀**. navbar / sidebar / 카드는 그림자 없음, drawer 만 단일 그림자, `dropdown-panel` 도 그림자 없음 (input 의 보더와 자연 분리) — v6 그대로.

본 v7 는 elevation 정책에 손대지 않는다. 다만 색 톤 재조정의 cascade 영향이 elevation 인지에 미세하게 작용 — `border-line` 이 옅어지면 카드 외곽선이 약해져 카드가 페이지 위에 "떠 있는" 느낌보다 "녹아들어 있는" 느낌이 더 강해진다. 토스 톤의 핵심 시각 효과 중 하나. 그림자 없이 옅은 border + 산뜻한 surface 만으로 elevation 위계를 표현하는 평면 디자인 기조와 정합.

## Shapes

v6 의 3 키 (`rounded.sm` 8px, `rounded.md` 12px, `rounded.pill` 999px) **무수정 계승**. v7 는 신규 라운드 토큰 도입하지 않는다.

색 톤 재조정이 라운드 인지에 미세하게 작용 — `border-line` 이 옅어지면 카드의 8px 라운드 외곽선이 더 부드럽게 보인다 (옅은 선 위의 라운드가 진한 선 위보다 시각적으로 더 둥글게 느껴진다). 의도된 시각 효과.

## Components

1차 v7 가 v6 의 46 합성 토큰 무수정 계승했고, **v7-rev2 는 결함 4·5 흡수를 위해 다음 변경**:

- **`search-result-item` 갱신** — typography 가 `body-sm` → `body-sm-strong` 으로 교체 (메인 라벨용). padding / height 는 spacing 토큰 cascade 로 자동 갱신 (`dropdown-item-py: 10px`, `dropdown-item-h: 52px`).
- **`search-result-item-meta` 신규** — 옵션 항목 안 메타 영역 토큰. backgroundColor `surface` + textColor `text-muted` + typography `caption`. focus 시는 별도 토큰.
- **`search-result-item-focus` 갱신** — backgroundColor `accent-soft` → `accent-vivid-soft`, textColor `primary` → `accent-vivid`, typography `body-sm` → `body-sm-strong`. 옵션이 키보드 ↑↓ 활성 시 vivid blue 페어로 강조.
- **`search-result-item-focus-meta` 신규** — focus 옵션 안 메타 영역. backgroundColor `accent-vivid-soft` + textColor `accent-vivid` + typography `caption`. 라벨과 같은 vivid blue 톤이라 의미 단위로 묶임.
- **`button-primary` 갱신** — backgroundColor `primary` (`#1f3b4d` Slate) → `accent-vivid` (`#1d4ed8` vivid blue). CTA 비비드화. textColor `surface` 무회귀 (흰 텍스트). 대비 11.73:1 → 6.70:1 (4.5:1 마진 +49% 안전).
- **`button-primary-disabled` 갱신** — 동일하게 backgroundColor `primary` → `accent-vivid`. disabled 시 opacity 별도 적용 (frontend-dev 영역).

합성 토큰 키 셋: 46 → 48 (`search-result-item-meta` + `search-result-item-focus-meta` 2 신규). 그 외 44 합성 토큰 무회귀. 본 절은 색 cascade 의 시각 결과를 합성 토큰별로 prose 단위로 설명한다.

### surface 계열 cascade — 페이지·카드·navbar·sidebar·dropdown-panel

`{colors.surface}` (`#ffffff`) 를 backgroundColor 로 참조하는 합성 토큰은 30+ 개 — `caption`, `body-strong`, `card`, `card-elevated`, `input-label`, `input-helper`, `input-helper-error`, `dropdown-panel`, `search-result-item`, `button-secondary`, `button-icon`, `navbar`, `navbar-brand`, `navbar-icon-button`, `sidebar`, `sidebar-section-header`, `sidebar-item`, `drawer`, `favorite-toggle`, `ticker-header` 등. **v6 무회귀** (surface 값 `#ffffff` 변경 없음). 산뜻한 순백 캔버스가 카드 · navbar · sidebar · dropdown · 본문 영역의 base 로 작동.

### surface-muted 계열 cascade — shell·main-area·input·hover

`{colors.surface-muted}` 를 backgroundColor 로 참조하는 합성 토큰 — `shell`, `input`, `input-suffix`, `button-icon-hover`, `navbar-icon-button-hover`, `sidebar-item-hover`, `sidebar-empty`, `main-area`. v6 (`#f5f7fa`) → v7 (`#f6f8fa`) 미세 재조정. 시각상은 거의 동일하나 main-area 와 카드 (surface) 의 분리감이 미세하게 더 산뜻한 방향으로 정합. input 의 회색 채움 배경도 미세하게 더 밝아져 입력 영역의 시지각 부담 감소.

### border-line cascade — price-bar-track

`{colors.border-line}` 를 직접 backgroundColor 로 참조하는 합성 토큰은 `price-bar-track` (가격 바 트랙) 단 1개. v6 (`#dbe2ea`) → v7 (`#eceff3`) 재조정. 가격 바 트랙이 옅어져 stop / entry / target 마커 (각각 critical / info / primary) 의 강조감이 자연스럽게 두드러진다. **추가 cascade 영역** — 본 v7 의 합성 토큰 정의에 `border-line` 을 사용한 키는 `price-bar-track` 뿐이지만, frontend-dev 측 합성 토큰 `@apply` 에서 카드·input·dropdown-panel 의 1px 외곽선 색으로 `border-line` 을 호출하는 호출처가 있다 (예: `border-border-line` 클래스). 이 호출처 모두 자동 cascade 되어 카드·input·dropdown 의 외곽선이 옅어진다 — 본 v7 의 시각 의도 핵심.

### text-strong cascade — 본문 텍스트·헤드라인·drawer-scrim

`{colors.text-strong}` 를 textColor 로 참조하는 합성 토큰 — `shell`, `body-strong`, `card`, `card-elevated`, `input`, `input-label`, `dropdown-panel`, `search-result-item`, `button-icon`, `button-icon-hover`, `navbar`, `navbar-icon-button`, `navbar-icon-button-hover`, `sidebar`, `sidebar-item`, `sidebar-item-hover`, `drawer`, `main-area`, `ticker-header` 등 19+ 합성 토큰. v6 (`#17202a`) → v7 (`#0f1419`) 재조정. 본문·헤드라인의 위계가 뚜렷해진다. drawer-scrim 의 backgroundColor 도 `text-strong` 참조이므로 cascade되지만 scrim 은 opacity 가 별도 적용되어 시각 회귀 영향 미세.

### text-muted cascade — 보조 텍스트

`{colors.text-muted}` 를 textColor 로 참조하는 합성 토큰 — `caption`, `input-helper`, `input-suffix`, `sidebar-section-header`, `sidebar-empty`, `favorite-toggle`. v6 (`#5b6878`) → v7 (`#5b6470`) 거의 동일. 보조 텍스트의 가독성 무회귀 + 미세 대비 향상 (5.68:1 → 6.00:1).

### accent-soft cascade — focus / active / hover 톤

`{colors.accent-soft}` 를 backgroundColor 로 참조하는 합성 토큰 — `search-result-item-focus`, `button-secondary-hover`, `badge-accent`, `sidebar-item-active`, `favorite-toggle-active`. v6 (`#e6ecf2`) → v7 (`#eaf0f6`) 미세 재조정. primary 텍스트 (`#1f3b4d`) 와의 대비 9.85:1 → 10.21:1 (+3.7%). focus / active 톤이 미세하게 더 밝아져 산뜻함 강화.

### 상태 색 cascade — warn / info / critical

`warn`, `warn-soft`, `info`, `info-soft`, `critical`, `critical-soft` 6 키의 미세 보정은 `card-warn`, `badge-warn`, `card-critical`, `badge-critical`, `input-error`, `input-helper-error`, `badge-info`, `price-bar-stop`, `price-bar-entry` 등 합성 토큰에 자동 cascade. 시각상은 거의 동일하나 페어 톤 일관성 미세 향상. PR #11 AC-3 의 feasibility 비현실 강조 (warn / critical 톤) 는 v7 에서도 무회귀 — `warn × surface` 6.00:1, `critical × surface` 9.19:1 모두 강조감 충분.

### primary 계열 cascade — 시그니처 정체성 영역 (v7-rev2 갱신)

`{colors.primary}` 를 참조하는 합성 토큰은 v7-rev2 에서 **두 호출처 이탈** (`button-primary` / `button-primary-disabled` 의 backgroundColor 가 `primary` → `accent-vivid` 로 cascade 교체) + **한 호출처 이탈** (`search-result-item-focus.textColor` 가 `primary` → `accent-vivid` 로 cascade 교체). 남는 호출처는 시그니처 정체성 영역 — `button-secondary.textColor`, `button-secondary-hover.textColor`, `sidebar-item-active.textColor`, `badge-accent.textColor`, `navbar-brand.textColor`, `favorite-toggle-active.textColor`, `price-bar-target.backgroundColor`. Signature Slate `#1f3b4d` 의 hex 자체는 v6/1차v7/v7-rev2 모두 무변경. 사용 영역 룰은 "primary / accent-vivid 의 사용 영역" 절 참조.

### accent-vivid 계열 cascade — 액션 / focus 신호 영역 (v7-rev2 신규)

v7-rev2 신규 토큰 `{colors.accent-vivid}` `#1d4ed8` 와 `{colors.accent-vivid-soft}` `#dbeafe` 의 cascade 영역은 **명확히 제한** — CTA 버튼 + dropdown focus 옵션의 두 영역.

- `button-primary.backgroundColor` / `button-primary-disabled.backgroundColor` — vivid blue (`#1d4ed8`). 한 화면에 1개 원칙. CTA 비비드화로 사용자가 "분석" / "검색" 등 액션 버튼을 한 번에 인식.
- `search-result-item-focus.backgroundColor` (accent-vivid-soft) + `.textColor` (accent-vivid) — 키보드 ↑↓ 활성화 옵션. 옵션 라벨이 vivid blue 톤으로 떠 시각 신호 강화.
- `search-result-item-focus-meta.backgroundColor` (accent-vivid-soft) + `.textColor` (accent-vivid) — focus 옵션 안 메타도 같은 vivid blue. 라벨·메타가 한 의미 단위로 묶임.
- focus ring — `:focus-visible` outline 색. Tailwind `focus-visible:ring-{accent-vivid}` 또는 등가. 별도 합성 토큰 없이 frontend-dev 영역.

**Signature Slate primary 와 의 분리** — accent-vivid 는 위 네 영역만 cascade. navbar-brand · sidebar-item-active · favorite-toggle-active · badge-accent · button-secondary · price-bar-target 등 시그니처 정체성 영역은 primary Slate 그대로 무회귀. 화면에 두 톤이 동시에 등장해도 영역이 의미 단위로 나뉘므로 시각 충돌 없음.

### search-result-item / search-result-item-focus cascade — 2줄 콘텐츠 수용 (v7-rev2 갱신)

`search-result-item` 의 typography 가 `body-sm` → `body-sm-strong` 으로 교체 — 메인 라벨이 더 굵게 떠 정보 위계 1순위. padding 은 `dropdown-item-py: 10px` cascade, height 는 `dropdown-item-h: 52px` cascade. `search-result-item-meta` 신규 — 메타 영역 (caption typography + text-muted) 별도 토큰으로 frontend-dev 가 `<span>` 으로 호출.

`search-result-item-focus` 가 v7-rev2 에서 색 페어를 통째로 교체 — accent-soft + primary (1차 v7) → accent-vivid-soft + accent-vivid (v7-rev2). 키보드 ↑↓ 활성 옵션이 vivid blue 톤으로 떠 1차 v7 의 슬레이트 톤 대비 사용자 시지각에 "신호적 선택" 인상.

## Do's and Don'ts

v6 의 Do's and Don'ts 전체 무회귀. 본 v7 가 추가하는 항목:

### v7 신규 — 색 톤 재조정의 시각 룰

- ✅ 페이지 background 와 카드 background 는 **순백 (`{colors.surface}` `#ffffff`)** 으로 둔다. surface-muted 는 shell · main-area · input · hover 톤 등 surface 와 분리감이 필요한 영역에 한정.
- ✅ 카드 외곽선은 **옅은 `{colors.border-line}` (`#eceff3`)** 한 단계로만 표현한다. 그림자 없음 + 옅은 1px border 가 토스 톤의 elevation 시그니처.
- ✅ 본문 텍스트는 **`{colors.text-strong}` (`#0f1419`)** — 18.51:1 대비로 정보 위계 뚜렷. 보조 텍스트는 `{colors.text-muted}` (`#5b6470`) — 5.63:1~6.00:1 대비로 가독성 안전 마진.
- ✅ 시그니처 색 `{colors.primary}` (Signature Slate `#1f3b4d`) 는 **강조 영역에 한정** — CTA 버튼 배경, focus / active 톤 텍스트, navbar wordmark, focus ring, 가격 바 target 마커. "primary 의 사용 영역" 절 룰 준수.
- ✅ 상태 색 (warn / info / critical) 은 **페어 톤 (warn-soft / info-soft / critical-soft)** 과 항상 함께 등장. text × soft 페어로 색 의미를 강화 (5.47:1 ~ 7.45:1 대비).
- ✅ surface 와 surface-muted 의 **분리감은 옅은 한 단계** (L 차 6.37%) 로만 표현. 더 진한 단계 (`#e8eaee` 등) 는 도입하지 않는다 — 산뜻함 누수.
- ✅ accent-soft 는 **primary 의 가벼운 fill** — hover · active · badge background 용. primary 자체의 옅은 변형으로 시그니처 정체성 유지.
- ❌ 카드 안 본문 텍스트에 `text-primary` 클래스를 쓰지 않는다 — v6 의 잔여 탁함 원인 중 하나. 카드 텍스트는 항상 `text-strong` 또는 `text-muted`.
- ❌ 일반 텍스트 link 에 `text-primary` 를 쓰지 않는다 — link 가 필요하면 `text-info` 또는 `text-strong` + underline. primary 는 시그니처 액션 강조 영역에 보존.
- ❌ 일반 button border 에 `border-primary` 를 쓰지 않는다 — `border-line` 또는 합성 토큰 외곽선으로. primary border 는 시각 압박감.
- ❌ 일반 card border 에 `border-primary` 를 쓰지 않는다 — `border-line` 으로. 강조가 필요하면 `accent-soft` background.
- ❌ surface 를 `#fafbfc` 또는 그 이하 톤으로 어둑하게 두지 않는다 — PRD §9.4 의 두 옵션 중 `#ffffff` 결정. 산뜻함의 정점은 순백.
- ❌ border-line 을 v7 (`#eceff3`) 보다 더 옅게 두지 않는다 — 카드 경계가 사라지면 정보 위계 약화. PRD §9.7 의 균형점.
- ❌ text-strong 을 v7 (`#0f1419`) 보다 더 진한 톤 (`#000000` 등 순흑) 으로 두지 않는다 — 순흑은 시지각 부담 + 토스 톤 어긋남. 18.51:1 대비로 충분.
- ❌ Signature Slate 의 hex 를 변경하지 않는다 — 브랜드 정체성 보존. PRD §9.3 의 두 옵션 중 **유지** 결정.
- ❌ 색 토큰 키 셋을 임의 추가·삭제·이름 변경하지 않는다 — 합성 토큰 cascade 보장. v7-rev2 의 신규 2 토큰 (`accent-vivid` / `accent-vivid-soft`) 은 PRD §9.8 옵션 B 의 명시적 결정.

### v7-rev2 신규 — 비비드 톤 + dropdown 옵션 항목 룰

- ✅ **CTA 버튼 (`button-primary`) 배경은 `{colors.accent-vivid}`** `#1d4ed8` (vivid blue). 한 화면에 1개 원칙. 사용자가 액션 버튼을 한 번에 인식 — 화면에 신호적 채도 한 점.
- ✅ **dropdown / listbox focus 옵션은 accent-vivid 페어** — 배경 `{colors.accent-vivid-soft}` `#dbeafe` + 텍스트 `{colors.accent-vivid}` `#1d4ed8`. 라벨·메타 모두 같은 톤으로 의미 단위 묶음.
- ✅ **focus ring 색은 `{colors.accent-vivid}`** — `:focus-visible` outline. Tailwind `focus-visible:ring-{accent-vivid}` 등.
- ✅ **시그니처 영역은 `{colors.primary}` Slate 그대로** — navbar-brand · sidebar-item-active · favorite-toggle-active · badge-accent · button-secondary · price-bar-target 무회귀. 두 톤 (primary Slate vs accent-vivid) 의 의미 영역 분리.
- ✅ **dropdown 옵션 항목 height 는 `{spacing.dropdown-item-h}` 52px** — 2줄 콘텐츠 (라벨 + 메타) 안전 수용. 1차 v7 의 34px 는 1줄 기준이라 글자 겹침.
- ✅ **dropdown 옵션 항목 padding 은 `{spacing.dropdown-item-py}` 10px** — 항목 내부 호흡 확보.
- ✅ **dropdown 옵션 항목 라벨 / 메타 간격은 `{spacing.dropdown-item-gap}` 2px** — `<li>` 의 `gap` 속성으로 표현.
- ✅ **dropdown 옵션 메인 라벨 typography 는 `{typography.body-sm-strong}`** (14px / 700 / 1.35) — 굵기로 정보 위계 1순위.
- ✅ **dropdown 옵션 메타 typography 는 `{typography.caption}`** (12px / 400 / 1.4) — 가는 회색으로 정보 위계 2순위.
- ❌ `button-primary` 의 backgroundColor 를 `{colors.primary}` (Slate) 로 되돌리지 않는다 — v7-rev2 의 비비드 톤 핵심. 사용자 후속 피드백 흡수.
- ❌ `accent-vivid` / `accent-vivid-soft` 를 위 4 허용 호출처 외 영역에 사용하지 않는다 — 화면 전체 비비드 누수 시 시각 부담. 활기 영역은 액션 컨텍스트 한정.
- ❌ `body-sm-strong` 을 dropdown 옵션 라벨 외 영역에 사용하지 않는다 — 본 토큰은 옵션 라벨 전용 시각 신호. 본문 강조는 `body-strong` (16px / 700).
- ❌ dropdown 옵션 항목 height 를 52px 미만으로 축소하지 않는다 — 2줄 콘텐츠 글자 겹침 회귀. 컴팩트화 트레이드오프는 v7-rev2 의 의도적 결정.
- ❌ dropdown 옵션 항목을 `display: block` 으로 두지 않는다 — `display: flex; flex-direction: column; gap: {spacing.dropdown-item-gap}` 로 라벨·메타 stacking + 2px gap 명시.

---

## 유저 시나리오

### 시나리오 A — 데스크탑 1280 첫 진입 (산뜻한 캔버스 확인)

1. 사용자가 데스크탑 1280 뷰포트로 진입. **순백 페이지 캔버스** (`{colors.surface}` `#ffffff`) 위에 옅은 surface-muted shell (`#f6f8fa`) 이 main-area 배경으로 호흡. navbar (`surface`, 60px 높이) 아래로 sidebar (`surface`, 264px 너비) 와 main 영역 (`surface-muted`) 이 좌우 분할.
2. **사이드바가 viewport 끝까지 stretched** (PRD §3.2 grid `min-height` cascade) — 회색 빈 공간 0건. sidebar 의 흰색 배경과 main-area 의 옅은 회색 배경이 6.37% L 차이로 자연스럽게 분리되되 압박감 없음.
3. main 안 ticker-header (`surface`, 16px 라운드) — 카드 외곽선이 옅은 `border-line` (`#eceff3`) 한 줄. v6 대비 카드의 사각형 박스 두드러짐 해소. 카드와 페이지가 자연스럽게 융합되는 토스 톤.
4. SearchPanel input (`surface-muted` 배경) — 입력 영역의 회색 채움이 미세하게 더 밝아져 (`#f6f8fa`) 입력 시지각 부담 감소. label (text-strong, 18.51:1 대비) 의 검은 톤이 뚜렷하게 정보 위계.
5. 사용자 시지각 결과 — "탁함" 의 사라짐. 산뜻한 흰색 캔버스 + 옅은 분리 + 진한 본문 위계.

### 시나리오 B — ticker 검색 dropdown 정합 (PRD §3.1 + §3.4 — v7-rev2 갱신)

1. 사용자가 SearchPanel input 에 focus. **dropdown 이 input 바로 아래에 anchor** (PRD §3.1 fix cascade) — `position: relative` wrapper 의 직접 자식으로 dropdown-panel 이 `top: 100%; left: 0; right: 0` 표시.
2. dropdown-panel (`surface` 배경, 8px 라운드, 옅은 border-line 외곽선) 안에 두 옵션 — 각 옵션이 **2줄 구조** (v7-rev2 갱신). 첫 옵션: 메인 라벨 `AAPL · Apple Inc.` (body-sm-strong 14/700/1.35) + 메타 `US_EQUITY · USD · APPLE` (caption 12/400/1.4). 둘째 옵션: `BTC-USD · Bitcoin` + `CRYPTO · USD · Bitcoin USD`.
3. 옵션 항목 height 52px (v7-rev2 `dropdown-item-h`) + 상하 padding 10px (`dropdown-item-py`) + 라벨·메타 사이 2px gap (`dropdown-item-gap`). 두 줄이 시각 겹침 없이 안전 수용 — **결함 4 흡수**.
4. ↓ 키 누르면 첫 옵션이 `search-result-item-focus` 톤 — **v7-rev2 비비드 페어** — accent-vivid-soft 배경 (`#dbeafe`) + accent-vivid 텍스트 (`#1d4ed8`) — **신호적 채도 강조의 등장**. 메타도 같은 vivid blue 톤 (`search-result-item-focus-meta`) 으로 라벨·메타가 의미 단위로 묶임.
5. 1차 v7 대비 시각 변화 — 옵션 focus 배경 `#eaf0f6` (옅은 슬레이트) → `#dbeafe` (옅은 vivid blue), 텍스트 `#1f3b4d` (Slate) → `#1d4ed8` (vivid blue). 대비비 10.21:1 → 5.49:1 (AA 마진 +22%). 사용자 시지각은 슬레이트 옵션 → 비비드 옵션 — 활기 분명 — **결함 5 흡수**.
6. Enter 누름 → 옵션 선택 + dropdown unmount. ticker-header 갱신.

### 시나리오 C — 분석 결과 6블록 상태 색 (warn / info / critical)

1. 사용자가 분석 트리거. 결과 6블록 (action / brief / feasibility / horizons / risk_plan / warnings) 표시.
2. **feasibility 비현실 강조** — `card-warn` (warn-soft 배경 `#fff3df` + warn 텍스트 `#a14a06`, 5.47:1 대비). warn 본문 텍스트의 주황빛이 미세하게 더 강렬 (warn hex 미세 보정). 카드 사각형 박스가 옅어진 border-line 와 함께 자연스럽게 정보 강조.
3. **warnings 블록** — `card-critical` (critical-soft `#fde1e1` + critical `#8e1717`, 7.45:1). 적색 강조감 v6 대비 거의 동일하나 페어 톤 일관성 미세 향상.
4. **info 톤 배지** — `badge-info` (info-soft `#e7efff` + info `#1c4fd1`, 5.89:1). 청색 톤이 v6 대비 미세하게 더 신호적 (B 채널 +17). 시각 회귀 없음.
5. **ticker-header 의 price-bar** — track 의 옅은 border-line (`#eceff3`) 위에 stop (critical), entry (info), target (primary) 세 마커가 자연스럽게 두드러진다. v6 대비 track 이 옅어져 마커 강조감 자연 향상.

### 시나리오 D — 모바일 375 톤 무회귀

1. 사용자가 모바일 375 뷰포트로 진입. drawer · 모든 합성 토큰의 색 cascade 가 동일하게 적용된다 — 본 v7 의 hex 재조정은 뷰포트 분기 없음.
2. drawer 가 열리면 drawer (`surface` 배경, 12px md 라운드) 가 슬라이드 인 + drawer-scrim (`text-strong` `#0f1419` 배경, opacity 별도) 이 페이지 어둡힘.
3. 모바일 InputPanel 의 4 필드 — input 의 surface-muted 배경 (`#f6f8fa`) + input-suffix 의 text-muted (`#5b6470`) 가 5.63:1 대비로 가독성 유지.
4. 모바일 ARIA 패턴 (v6 무회귀) — 검색 input combobox + listbox + option + aria-activedescendant 5 속성 풀 셋이 그대로 동작. 색 톤 재조정과 무관.
5. **v7-rev2 신규** — 모바일 CTA 버튼 ("분석" 등) 도 accent-vivid `#1d4ed8` 배경으로 cascade. dropdown focus 옵션도 accent-vivid 페어. 데스크탑과 동일한 비비드 톤 — 모바일 뷰포트 분기 0.
6. v6 대비 시각 변화 — 데스크탑과 동일한 산뜻한 캔버스 + 옅은 분리 + 진한 본문 위계 + 비비드 CTA. 모바일 시지각 무회귀 + 활기 신규.

### 시나리오 E — 비비드 CTA · focus 의 시각 강조 (v7-rev2 신규 — 결함 5 흡수)

1. 사용자가 워크벤치 화면을 본다. main 영역 안 InputPanel 의 입력 4 필드 (티커 / 진입가 / 손절가 / 목표가) 아래 **"분석" CTA 버튼** 이 vivid blue `#1d4ed8` 배경 + 흰색 텍스트. 1차 v7 의 슬레이트 톤 대비 사용자 시지각에 "신호적 액션" 인상 — 화면의 한 점이 명확히 활기.
2. 사용자가 티커 input 에 포커스 — input 의 `:focus-visible` outline 이 vivid blue (accent-vivid) 톤으로 떠 입력 영역이 활성화됨을 신호.
3. 사용자가 "AAPL" 입력 → dropdown 열림 → ↓ 키 — focus 옵션이 vivid blue 페어 (accent-vivid-soft 배경 + accent-vivid 텍스트) 로 강조. 라벨 + 메타 모두 같은 vivid blue 톤이라 의미 단위 묶임.
4. Enter 로 옵션 선택 → dropdown 닫힘 → "분석" CTA 클릭. CTA 의 vivid blue 배경이 사용자 마우스 클릭의 시각 응답.
5. 분석 결과 6블록이 main 영역에 렌더 — 카드 안 본문 텍스트는 text-strong (`#0f1419`) 슬레이트 톤, 카드 외곽선은 옅은 border-line (`#eceff3`), badge 는 색별 페어 (warn-soft / info-soft / critical-soft / accent-soft) 톤 그대로. **비비드는 액션 영역만 침범, 본문 영역은 산뜻한 백그라운드 + 진한 본문 그대로** — 두 톤의 의미 영역 분리가 시각으로 실증.
6. 사이드바 (좌측) — sidebar-item-active 의 슬레이트 톤 (`#1f3b4d` primary) 그대로. 시그니처 정체성 영역 무회귀.
7. 사용자 시지각 결과 — 1차 v7 대비 화면이 명확히 활기. 비비드 강조점 (CTA + dropdown focus) 두 영역이 신호 + 그 외 영역은 산뜻한 백그라운드 그대로 — "비비드 추가" + "정체성 보존" 양립 — **결함 5 흡수**.

---

## 핸드오프 명세 — 컴포넌트별 cascade·상태·DOM

본 v7 가 합성 토큰 키 셋을 무수정 계승하므로 frontend-dev 핸드오프의 DOM·prop·class·ARIA 영역은 **v6 무회귀**. 본 절은 **색 cascade 의 frontend-dev 측 검증 영역** 만 명시한다.

### tailwind.theme.json 재생성

색 토큰 13 키의 hex 재조정 → `npm run design:sync` 재실행 → `tailwind.theme.json` 의 colors 절 자동 갱신. 새 hex 가 Tailwind theme 의 색 변수로 주입된다. 합성 토큰 `@apply` 호출처 (`app/components.css`) 는 토큰 참조 (`bg-surface`, `text-text-strong`, `border-border-line` 등) 만 사용하므로 추가 편집 0건. **멱등 검증** — `npm run design:sync` 재실행 후 `tailwind.theme.json` 의 colors 절이 v7 hex 와 정합.

### 합성 토큰 `@apply` 호출처 검증

frontend-dev 는 `app/components.css` 의 `@layer components` 안에서 색 hex 또는 px 직타가 0건인지 재검증 — `git grep -nE "#[0-9a-fA-F]{3,6}" app/components.css` 결과 0건. 모든 색은 Tailwind 토큰 함수 (`theme('colors.surface')` 또는 등가) 또는 CSS 변수 (`var(--color-surface)`) 호출. PRD AC-4-1 정합.

### card / card-elevated / card-warn / card-critical 외곽선 호출처

본 v7 의 시각 효과 핵심 중 하나는 **카드 외곽선이 옅어지는 cascade**. frontend-dev 측에서 `.card` 클래스 또는 합성 토큰 `@apply` 정의에 `border-border-line` 또는 `border-{border-line 변수}` 호출이 있는지 확인. 합성 토큰 키 셋 변경 0건이므로 호출처 그대로, 색만 자동 cascade. **시각 검증** — 양 뷰포트 (375 / 1280) 에서 카드의 1px 외곽선이 v6 대비 옅어졌는지 QA 라운드트립으로 확인.

### button-primary / button-secondary 톤 검증 (v7-rev2 갱신)

- `button-primary` (예: "분석" CTA) — **v7-rev2 비비드 갱신** — backgroundColor `{colors.accent-vivid}` `#1d4ed8` (1차 v7 의 `{colors.primary}` `#1f3b4d` 에서 교체) + textColor `{colors.surface}` `#ffffff`. 대비 11.73:1 → 6.70:1 (AA 마진 +49% 안전). `app/components.css` 의 `.button-primary` 클래스 `@apply` 정의가 `bg-primary` → `bg-accent-vivid` 로 갱신.
- `button-primary-disabled` — 동일하게 `bg-accent-vivid`. opacity 별도 (frontend-dev 영역).
- `button-secondary` — backgroundColor `{colors.surface}` + textColor `{colors.primary}`. 11.73:1 대비 v6/1차v7/rev2 무회귀.
- hover 시 `button-secondary-hover` 의 accent-soft 배경 (`#eaf0f6`) + primary 텍스트 (10.21:1 대비) 무회귀.
- primary / accent-vivid 사용 영역 룰 준수 — `text-primary` / `bg-primary` / `text-accent-vivid` / `bg-accent-vivid` / `bg-accent-vivid-soft` 클래스가 허용 합성 토큰 호출처 외에 등장하면 reviewer 변경 요청 ("primary / accent-vivid 의 사용 영역" 절 참조).

### text-strong / text-muted 본문 cascade

- 본문 헤드라인 (h1 / h2 / display) — textColor `{colors.text-strong}` `#0f1419` (v6 `#17202a` → v7 `#0f1419` 재조정). 18.51:1 대비 향상.
- caption / 보조 텍스트 — textColor `{colors.text-muted}` `#5b6470`. 5.63:1 ~ 6.00:1 대비 향상.
- **검증** — QA 라운드트립에서 본문 텍스트가 v6 대비 미세하게 더 진해졌는지 확인. WCAG AA 안전 마진 증가.

### dropdown-panel + search-result-item ARIA 무회귀 + v7-rev2 옵션 항목 명세 (결함 4 흡수)

본 v7-rev2 의 색 / spacing / typography 재조정은 v6 의 ARIA 패턴 (`role="combobox"` + `role="listbox"` + `role="option"` + `aria-activedescendant`) 에 영향 0건. 키보드 ↑/↓/Enter/ESC navigation + outside-click 닫기 모두 v6 무회귀.

**v7-rev2 신규 — 옵션 항목 마크업 명세**:

- `<li role="option">` 의 `display: flex; flex-direction: column; gap: var(--spacing-dropdown-item-gap)` (2px) — 라벨·메타 stacking + gap. **DOM 변경** — 기존 1줄 마크업 (`<li>{symbol} · {name}</li>`) → 2줄 마크업 (`<li><span class="label">...</span><span class="meta">...</span></li>`). frontend-dev 가 `components/workbench/SearchPanel.tsx` 의 옵션 매핑 영역 갱신.
- `<span class="search-result-item-label">` — typography `body-sm-strong` (14/700/1.35). Tailwind `text-[var(--font-body-sm-strong-size)]` 또는 `text-sm font-bold leading-[1.35]` 등.
- `<span class="search-result-item-meta">` — typography `caption` (12/400/1.4) + color `text-muted` (focus 시 `accent-vivid`). Tailwind `text-xs font-normal leading-tight` 등.
- `aria-selected` 속성 — focus 옵션이 `aria-selected="true"` + `data-active` 등 시각 토큰 분기.
- 키보드 ↑↓ 이동 시 `scrollIntoView({ block: 'nearest' })` — 옵션 항목 height 가 52px 로 커졌으므로 dropdown 의 max-height (예: 320px) 안에서 약 6개 옵션 노출 → 그 이상은 스크롤. 활성 옵션이 항상 viewport 안에 보이도록.

**시각 검증 — 결함 4 흡수**:

- dev tools 로 옵션 항목의 `getBoundingClientRect().height` ≥ 50px (권장 52~58px). 라벨과 메타가 시각 겹치지 않음.
- focus 옵션의 시각 강조 톤이 vivid blue 페어 (accent-vivid-soft 배경 + accent-vivid 텍스트). 라벨·메타 모두 같은 톤.
- 양 뷰포트 (375 / 1280) 에서 옵션 항목 시각 겹침 0건.

**시각 변화 (v7-rev2)**:

- 옵션 height 34 → 52px (+53%).
- 옵션 typography 라벨 분리 — `body-sm` (1줄) → `body-sm-strong` (라벨) + `caption` (메타) — 정보 위계 강화.
- focus 톤 슬레이트 → vivid blue — 신호적 채도 강화.

### button-primary 비비드 cascade — `@apply` 호출처 검증 (v7-rev2 결함 5 핸드오프)

frontend-dev 가 `app/components.css` 의 `.button-primary` 클래스 `@apply` 정의를 다음과 같이 갱신:

```css
/* 변경 전 (1차 v7) */
.button-primary {
  @apply bg-primary text-surface ...;
}

/* 변경 후 (v7-rev2) */
.button-primary {
  @apply bg-accent-vivid text-surface ...;
}
```

`tailwind.theme.json` 에 `accent-vivid` / `accent-vivid-soft` 신규 키가 colors 절에 자동 추가 (`npm run design:sync` 산출물). frontend-dev 가 별도 키 정의 필요 없음. `bg-accent-vivid` / `text-accent-vivid` / `bg-accent-vivid-soft` 클래스가 Tailwind 자동 생성.

**검증**:

- `git grep -nE "bg-accent-vivid|text-accent-vivid|bg-accent-vivid-soft" app/components.css` — 허용 호출처 (`.button-primary` / `.search-result-item-focus` / `.search-result-item-focus-meta`) 만 매칭.
- `git grep -nE "bg-primary" app/components.css` — `.button-primary` 호출처가 매칭에서 빠져야 함 (cascade 교체 완료). `.button-secondary-hover` 등 정체성 영역 호출처만 매칭.
- 사용자가 dev 화면에서 직접 시각 확인 — CTA 버튼이 vivid blue 톤으로 떠 있고, dropdown focus 옵션이 vivid blue 페어로 강조되는지 (PRD AC-5-9).

### sidebar 높이 fix 후 색 cascade (PRD §3.2)

PRD §3.2 의 sidebar 높이 fix 가 적용되면 sidebar 영역이 viewport 끝까지 stretched. sidebar 배경 `{colors.surface}` `#ffffff` (v6 무회귀) 가 viewport 끝까지 채워지고, 그 옆 main-area 의 `{colors.surface-muted}` `#f6f8fa` 와 6.37% L 차이로 분리. **시각 검증** — 데스크탑 1280 에서 sidebar 흰색 영역이 navbar 아래 viewport 끝까지 채워지고, 그 옆 main-area 의 옅은 회색이 자연 분리. 회색 빈 공간 0건.

### dropdown 위치 fix 후 색 cascade (PRD §3.1)

PRD §3.1 의 dropdown 위치 fix 가 적용되면 dropdown-panel 이 input 바로 아래 4~8px 간격으로 anchor. dropdown-panel 배경 `{colors.surface}` `#ffffff` + 옅은 border-line `#eceff3` 외곽선이 input (surface-muted 배경) 과 시각적으로 분리되되 페어로 묶여 있다는 신호. **시각 검증** — input bottom + 4~8px 위치에 dropdown 의 top 이 정렬. 양 뷰포트 무회귀.

---

## OPEN QUESTION 결정 (디자이너 영역) — v7-rev2 design-tone-refinement

PRD §9 의 11건 중 디자이너 영역 7건 (R1 / R2 / R3 / R4 / R5 / R8 / R9). PM 권고 대비 v7-rev2 결정을 표로 명시. R8 / R9 는 v7-rev2 신규 결정.

| # | 질문 | v7 결정 | PM 권고 대비 |
|---|---|---|---|
| **R1** | surface 값 — `#fafbfc` vs `#ffffff` (PRD §9.4) | **`#ffffff` 결정**. 산뜻함의 정점은 순백이며, surface 와 surface-muted 의 분리감은 옅은 한 단계 (`#f6f8fa`, L 차 6.37%) 만으로 충분. `#fafbfc` 는 surface-muted 와의 L 차이가 좁아져 카드 vs 페이지 분리 신호가 약해진다. 토스 톤 정합 + 30+ 합성 토큰 (card · navbar · sidebar · dropdown-panel 등) 의 base 로 가장 자연. | PM 권고 (디자이너 결정 위임) 수용. |
| **R2** | primary 값 — Signature Slate `#1f3b4d` 유지 vs 미세 조정 (PRD §9.3) | **유지 (무변경) 결정**. 사용자 발화 "탁해" 는 primary 자체가 아니라 surface/border 의 잔여물 + primary 의 비강조 영역 누수의 누적이라고 해석. 본 v7 의 surface-muted / border-line / text-strong 재조정 + primary 사용 영역 룰 강화 ("primary 의 사용 영역" 절) 로 "탁함" 누적이 해소된다. 브랜드 정체성 (Signature Slate) 보존 — 사용자가 이미 익숙해진 시그니처 색의 hex 변경은 브랜드 재정립 비용 대비 효익 낮음. indigo / blue 톤 변경 옵션은 별도 PRD `brand-refinement` (가칭) 진입 시 재검토. | PM 권고 (유지 또는 미세 조정 → 디자이너 결정) 수용. |
| **R3** | border-line / text-strong / text-muted 의 정확한 hex (PRD §3.3) | **border-line `#eceff3`, text-strong `#0f1419`, text-muted `#5b6470` 결정**. 사유 — (a) border-line — v6 `#dbe2ea` 대비 +6.32% L 향상으로 카드 사각형 박스 두드러짐 해소, 그러나 surface `#ffffff` 와 약 7% L 차이가 남아 경계는 보이되 압박감 없음, (b) text-strong — v6 `#17202a` 대비 -3.65% L 향상으로 surface 대비 18.51:1 (v6 16.45:1) 정보 위계 뚜렷, 순흑 (`#000000`) 은 시지각 부담 + 토스 톤 어긋남이라 회피, (c) text-muted — v6 `#5b6878` 대비 미세하게 더 중성적 회색으로 surface-muted (`#f6f8fa`) 와 톤 충돌 회피, surface 대비 6.00:1 / surface-muted 대비 5.63:1 안전 마진 증가. | PM 권고 (재조정 방향 가이드) 수용 + 정확한 hex 결정. |
| **R4** | WCAG AA 4.5:1 무회귀 검증 (PRD §3.3 / AC-3-7) | **모든 주요 쌍 13건 4.5:1 이상 + v6 대비 무회귀 또는 향상**. Colors > WCAG AA 대비비 표 참조. text 본문 쌍 4건 모두 향상, primary 페어 3건 정체 또는 향상, warn / info / critical 페어 6건 미세 하향 (페어 톤 미세 보정) 이지만 모든 쌍이 4.5:1 안전 마진 충분 (가장 낮은 `warn × warn-soft` 도 5.47:1 — AA 기준 +21% 마진). PRD AC-3-7 충족. | PM 권고 (WCAG AA 무회귀 강제) 수용 + 측정 표 명시. |
| **R5** | 카드 사각형 압박 해소 방향 — border-line 옅게 + 카드와 background 일체감 vs 명확한 카드 외곽선 (PRD §3.3) | **border-line 옅게 + 적당한 분리감 결정** (양 극단 회피). border-line `#eceff3` 는 v6 (`#dbe2ea`) 대비 옅어졌지만 surface `#ffffff` 와의 L 차이가 약 7% 남아 카드 경계가 사라지지 않음. 동시에 v6 의 사각형 박스 두드러짐은 해소. 토스 톤의 "카드 같지 않은 카드" 효과를 정보 위계 약화 없이 구현. 카드 외곽선의 1px 보더는 그대로 유지 — 그림자 없이 옅은 보더 한 단계로 elevation 표현하는 v6 평면 디자인 기조 정합. | PM 권고 (디자이너 결정) 수용. |

### v7-rev2 신규 결정 — R8 (비비드 옵션 A vs B vs C) + R9 (dropdown-item-h 값)

| # | 질문 | v7-rev2 결정 | PM 권고 대비 |
|---|---|---|---|
| **R8** | 결함 5 — primary 자체 비비드 교체 (옵션 A) vs accent-vivid 신규 (옵션 B) vs 강조 영역 채도만 살림 (옵션 C) (PRD §9.8) | **옵션 B 결정 — primary Slate `#1f3b4d` 유지 + `accent-vivid` `#1d4ed8` (Tailwind blue-700) / `accent-vivid-soft` `#dbeafe` (Tailwind blue-100) 신규 추가**. 사유 4건: (1) 시그니처 정체성 보존 — Signature Slate 가 navbar wordmark / sidebar-item-active / favorite-toggle-active 등 브랜드 영역에 누적 사용, 옵션 A 채택 시 로고·헤더 재정립 비용 + 사용자가 익숙해진 브랜드 톤 변경. (2) 트레이딩 도구 톤 정합 — vivid blue 가 Bloomberg · 토스 · Robinhood 등 트레이딩/금융 도구의 액션 색 정합. (3) WCAG AA 4.5:1 안전 마진 확보 — accent-vivid × surface 6.70:1, accent-vivid × accent-vivid-soft 5.49:1 모두 AA 통과 + 마진 충분. 초기 후보 `#2563eb` (blue-600) 는 × accent-vivid-soft 4.16:1 미달이라 한 단계 진한 `#1d4ed8` (blue-700) 선택. (4) 사용 영역 한정 — accent-vivid cascade 가 button-primary + search-result-item-focus 의 두 영역만, 정체성 영역 (navbar-brand 등) 은 primary Slate 무회귀. 두 톤의 의미 영역 분리. **사용자 표현 "비비드"** 해석은 "신호적 채도" — 화면 한 점에 명확한 액션 강조. | PM 권고 (옵션 A 또는 B, 옵션 B 추천) 수용. |
| **R9** | 결함 4 — dropdown-item-h 정확한 값 (PRD §9.9) | **52px 결정** (1차 v7 의 34px 에서 +18px / +53%). dropdown-item-py 도 6 → 10px 동반 갱신 + `dropdown-item-gap: 2px` 신규. 사유: 라벨 (body-sm-strong 14 × 1.35 ≈ 19px) + 메타 (caption 12 × 1.4 ≈ 17px) + gap 2px + 상하 padding 20px ≈ 58px 가 옵션 항목에 자연 수용 (52 본체 안에 line-box 약간 압축되지만 글자 겹침 0). 52px 은 PRD §9.9 의 52~56px 권고 중 가장 컴팩트 + 2줄 안전 수용. 56px 까지 키우면 dropdown 전체 height 가 커져 컴팩트 의도 약화 — 52px 균형점. | PM 권고 (52~56px) 수용 + 정확한 값 결정. |

### PRD §9 의 나머지 4건 (R6 / R7 / R10 / R11) — 디자이너 영역 관련 결정

- **R6 (신규 토큰 추가)** — 1차 v7 무회귀 영역 (예: `surface-elevated`) 은 추가 0건 결정. **단 v7-rev2 에서 옵션 B 채택 결과로 `accent-vivid` / `accent-vivid-soft` 2 토큰 신규 추가** — PRD §9.6 의 디자이너 재량 결정에 따른 정당화. `body-sm-strong` 1 토큰 + `dropdown-item-gap` 1 토큰도 동반 신규. 총 4 토큰 추가. cascade 영향 명시 ("Components" 절 + 합성 토큰 search-result-item / search-result-item-meta / search-result-item-focus / search-result-item-focus-meta / button-primary / button-primary-disabled 6 합성 토큰 갱신).
- **R7 (border 옅음의 정도)** — `#eceff3` 1차 v7 결정 무회귀. v7-rev2 무변경.
- **R10 (시그니처 변경 시 후속 PR 영향 범위)** — PRD §9.10 의 두 옵션 중 **본 PR 안에서만 변경 + v8 별도 신설 금지** 결정. 본 파일 in-place 갱신으로 흡수. 옵션 B 채택으로 primary Slate 자체는 무변경 — 로고·헤더 cascade 영향 0. 후속 PR (예: `claude-api-analysis`) 은 v7-rev2 토큰 그대로 cascade.
- **R11 (다음 PRD)** — 사용자·PM 영역.

---

## lint 메모 (v7-rev2)

본 v7-rev2 (`design-tone-refinement`) 는 1차 v7 의 토큰 셋을 **무수정 계승** + 결함 4·5 흡수 위해 신규 4 토큰 추가:

- **front matter `colors` 절**: 1차 v7 의 13 키 셋 **모두 유지** + `accent-vivid` / `accent-vivid-soft` **2 신규**. 13 → 15 키. hex 변경 0건 (기존 13 키).
- **front matter `typography` 절**: 1차 v7 의 15 키 모두 유지 + `body-sm-strong` **1 신규** (dropdown 옵션 메인 라벨용). 15 → 16 키.
- **front matter `spacing` 절**: 1차 v7 의 22 키 중 `dropdown-item-h` 34 → 52px + `dropdown-item-py` 6 → 10px **2 키 값 갱신** + `dropdown-item-gap: 2px` **1 신규**. 22 → 23 키.
- **front matter `rounded` 절**: 1차 v7 의 3 키 그대로. 변경 0.
- **front matter `breakpoints` 절**: 1차 v7 그대로.
- **front matter `components` 절**: 1차 v7 의 46 합성 토큰 중 `search-result-item` (typography 교체) + `search-result-item-focus` (색 페어 + typography 교체) + `button-primary` (backgroundColor 교체) + `button-primary-disabled` (backgroundColor 교체) **4 키 갱신**. `search-result-item-meta` + `search-result-item-focus-meta` **2 신규**. 46 → 48 키.
- **본문 절**: Overview (v7-rev2 톤 의도 4축) / Colors (비비드 채택 사유 + 신·구 비교 표 + WCAG AA 표 갱신 + primary/accent-vivid 사용 영역 룰) / Typography (v6 무회귀 + body-sm-strong 신규) / Layout (1차 v7 무회귀 + dropdown 옵션 항목 명세 + spacing 갱신) / Elevation & Depth (1차 v7 무회귀) / Shapes (1차 v7 무회귀) / Components (색 계열별 cascade + accent-vivid cascade 신규 + search-result-item 갱신) / Do's and Don'ts (v7-rev2 신규 비비드·dropdown 룰).
- **유저 시나리오**: 데스크탑 첫 진입 / ticker 검색 dropdown 정합 (v7-rev2 갱신 — 2줄 + 비비드) / 분석 결과 6블록 상태 색 / 모바일 톤 (v7-rev2 비비드 추가) / 비비드 CTA·focus 시각 강조 (v7-rev2 신규) 5 시나리오.
- **핸드오프 명세**: tailwind.theme.json 재생성 (신규 4 토큰 cascade) / `@apply` 호출처 검증 / 카드 외곽선 / 버튼 톤 (v7-rev2 비비드 갱신) / 본문 텍스트 / dropdown ARIA 무회귀 + 옵션 항목 명세 / sidebar·dropdown 위치 fix cascade / button-primary 비비드 cascade.
- **OPEN QUESTION**: R1 / R2 / R3 / R4 / R5 (1차 v7 결정 무회귀) + R8 (옵션 B — accent-vivid 신규) + R9 (dropdown-item-h 52px) 결정 표.

**무회귀**: 1차 v7 의 colors 13 키 hex / typography 15 / spacing 19 키 / rounded 3 / breakpoints 4 / 정체성 영역 합성 토큰 모두 그대로. frontend-dev 측 `tailwind.theme.json` 재생성은 colors 절에 신규 2 키 + typography 절에 신규 1 키 + spacing 절에 신규 1 키 + 갱신 2 키 cascade. `npm run design:sync` 멱등.

산출 직전 `npx @google/design.md lint docs/design/design-tone-refinement.md` 통과 목표:

- errors: 0
- warnings: 0 (또는 contrast-ratio 의도 명시 후 0)
- info: 1 (token summary)

`contrast-ratio` 룰 회피 — v7-rev2 의 모든 (textColor × backgroundColor) 쌍이 4.5:1 이상. Colors > WCAG AA 대비비 표 참조. 가장 좁은 마진은 `search-result-item-focus` / `search-result-item-focus-meta` 의 `accent-vivid` × `accent-vivid-soft` **5.49:1** (AA 마진 +22%) — dropdown focus 옵션 페어. 초기 후보 `#2563eb` (blue-600) 는 lint 실측 4.16:1 로 미달 → `#1d4ed8` (blue-700) 로 한 단계 진하게 조정해 5.49:1 안전 마진 확보. lint 실측 통과 (errors=0 / warnings=0).

`orphaned-tokens` 룰 회피 — v7-rev2 의 colors 15 키 모두 합성 토큰 어딘가에서 참조됨. `primary` (8 합성 토큰 — button-primary cascade 이탈 후), `surface` (30+), `surface-muted` (8+), `border-line` (price-bar-track + @apply 호출처), `text-strong` (19+), `text-muted` (search-result-item-meta 신규 포함 7+), `accent-soft` (5+), `accent-vivid` (button-primary / button-primary-disabled / search-result-item-focus / search-result-item-focus-meta 4 합성 토큰), `accent-vivid-soft` (search-result-item-focus / search-result-item-focus-meta 2 합성 토큰), `warn` / `warn-soft` (각 2+), `info` / `info-soft` (각 2+), `critical` / `critical-soft` (각 3+). orphan 0. typography `body-sm-strong` 도 search-result-item / search-result-item-focus 2 합성 토큰에서 참조 — orphan 0.

`section-order` 룰 회피 — Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts 순서 고정 (v6/1차v7 와 동일).

`missing-primary` 룰 회피 — `colors.primary` 정의 (v6/1차v7 무회귀, `#1f3b4d`).

`missing-typography` 룰 회피 — colors / typography 모두 정의됨.

`broken-ref` 룰 회피 — 합성 토큰의 모든 토큰 참조 (`{colors.*}`, `{typography.*}`, `{rounded.*}`, `{spacing.*}`) 가 front matter 의 정의를 가리킴. 신규 토큰 (`accent-vivid`, `accent-vivid-soft`, `body-sm-strong`, `dropdown-item-gap`) 도 front matter 정의 후 합성 토큰에서 참조하므로 broken-ref 0.
