---
version: alpha
name: home-market-redesign
description: 홈(/) 시장 종합 대시보드 + 마이페이지(/profile) "내 자산" 섹션 + 사이드바 nav 재편(AI분석 "준비 중") 디자인 가이드. finsight-redesign v8 토큰 셋을 base 로 무회귀 계승(hex·사이즈 무변경)하고, (a) 공포·탐욕 게이지의 5구간 "심리 의미축" 색 토큰 11키(`fng-extreme-fear`/`fng-fear`/`fng-neutral`/`fng-greed`/`fng-extreme-greed` + 각 -soft 5키 + `fng-track`) — 한국식 등락색(상승=빨강/하락=파랑)과의 의미 충돌을 피하기 위한 별도 의미축, (b) "준비 중"(comingSoon) nav 상태 합성 토큰, (c) 도넛 차트 세그먼트(주식/코인) + 보유종목 테이블 + 공시 피드 + 시장 종합 위젯 셸 합성 토큰을 추가한다. 신규 색 11키는 PRD §3.5 가 명시적으로 허용한 "게이지 별도 의미축" 영역. 본 슬러그 최종 토큰: colors 37 / typography 18 / spacing 38 / rounded 5 / breakpoints 4 / components 86. 모든 합성 토큰 페어 WCAG AA 4.5:1 통과. PRD home-market-redesign §3.2/§3.5/§3.6/§3.1/§3.3 + AC-1~10 충족.
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
  signal-up: "#c81e1e"
  signal-up-soft: "#fee2e2"
  signal-down: "#1d4ed8"
  signal-down-soft: "#dbeafe"
  asset-stock: "#1e40af"
  asset-stock-soft: "#dbeafe"
  asset-coin: "#c2410c"
  asset-coin-soft: "#ffedd5"
  gradient-ai-from: "#4338ca"
  gradient-ai-to: "#1d4ed8"
  gradient-ai-soft: "#eef2ff"
  fng-extreme-fear: "#1d6fb8"
  fng-fear: "#256353"
  fng-neutral: "#4b525c"
  fng-greed: "#82500c"
  fng-extreme-greed: "#a83246"
  fng-extreme-fear-soft: "#e3f0fa"
  fng-fear-soft: "#e1f0eb"
  fng-neutral-soft: "#f0f1f3"
  fng-greed-soft: "#fbf0dc"
  fng-extreme-greed-soft: "#fbe4e8"
  fng-track: "#eceff3"
typography:
  font-display:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 36px
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: -0.02em
  h1:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.2
  h2:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 17px
    fontWeight: 700
    lineHeight: 1.35
  body-md:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm-strong:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.35
  body-strong:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.5
  caption:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  button:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.2
  button-sm:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
  badge:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
  mono-numeric:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tnum"
  nav-brand:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  sidebar-section:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.25
  input-suffix:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.2
    fontFeature: "tnum"
  gauge-score:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 40px
    fontWeight: 800
    lineHeight: 1.0
    letterSpacing: -0.02em
    fontFeature: "tnum"
  table-cell-numeric:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.3
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
  card-px: 20px
  card-py: 20px
  card-px-mobile: 16px
  card-py-mobile: 16px
  hero-px: 24px
  hero-py: 24px
  home-grid-gap: 16px
  gauge-w: 220px
  gauge-h: 120px
  gauge-track-w: 14px
  donut-size: 168px
  donut-thickness: 22px
  table-row-h: 48px
  table-cell-px: 12px
  disclosure-row-py: 12px
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
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
  display-heading:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.font-display}"
    padding: 0px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-px}"
  card-elevated:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-px}"
  card-hero:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.xl}"
    padding: "{spacing.hero-px}"
  card-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-px}"
  card-critical:
    backgroundColor: "{colors.critical-soft}"
    textColor: "{colors.critical}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-px-mobile}"
  card-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-px-mobile}"
  card-ai:
    backgroundColor: "{colors.gradient-ai-soft}"
    textColor: "{colors.gradient-ai-from}"
    rounded: "{rounded.xl}"
    padding: "{spacing.hero-px}"
  card-section-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.h2}"
    padding: 0px
  card-section-meta:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
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
  search-bar-hero:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.md}"
    typography: "{typography.body-md}"
    padding: 14px
    height: 52px
  dropdown-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.md}"
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
  badge-signal-up:
    backgroundColor: "{colors.signal-up-soft}"
    textColor: "{colors.signal-up}"
    rounded: "{rounded.pill}"
    padding: 10px
    typography: "{typography.badge}"
    height: 28px
  badge-signal-down:
    backgroundColor: "{colors.signal-down-soft}"
    textColor: "{colors.signal-down}"
    rounded: "{rounded.pill}"
    padding: 10px
    typography: "{typography.badge}"
    height: 28px
  badge-asset-stock:
    backgroundColor: "{colors.asset-stock-soft}"
    textColor: "{colors.asset-stock}"
    rounded: "{rounded.pill}"
    padding: 10px
    typography: "{typography.badge}"
    height: 28px
  badge-asset-coin:
    backgroundColor: "{colors.asset-coin-soft}"
    textColor: "{colors.asset-coin}"
    rounded: "{rounded.pill}"
    padding: 10px
    typography: "{typography.badge}"
    height: 28px
  badge-coming-soon:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    padding: 8px
    typography: "{typography.badge}"
    height: 24px
  signal-up-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-up}"
    typography: "{typography.mono-numeric}"
    padding: 0px
  signal-down-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-down}"
    typography: "{typography.mono-numeric}"
    padding: 0px
  ai-heading:
    backgroundColor: "{colors.gradient-ai-soft}"
    textColor: "{colors.gradient-ai-to}"
    typography: "{typography.h1}"
    rounded: "{rounded.lg}"
    padding: 12px
  fng-gauge-track:
    backgroundColor: "{colors.fng-track}"
    rounded: "{rounded.pill}"
    height: "{spacing.gauge-track-w}"
  fng-score:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.gauge-score}"
    padding: 0px
  fng-band-extreme-fear:
    backgroundColor: "{colors.fng-extreme-fear-soft}"
    textColor: "{colors.fng-extreme-fear}"
    rounded: "{rounded.pill}"
    typography: "{typography.badge}"
    padding: 10px
    height: 28px
  fng-band-fear:
    backgroundColor: "{colors.fng-fear-soft}"
    textColor: "{colors.fng-fear}"
    rounded: "{rounded.pill}"
    typography: "{typography.badge}"
    padding: 10px
    height: 28px
  fng-band-neutral:
    backgroundColor: "{colors.fng-neutral-soft}"
    textColor: "{colors.fng-neutral}"
    rounded: "{rounded.pill}"
    typography: "{typography.badge}"
    padding: 10px
    height: 28px
  fng-band-greed:
    backgroundColor: "{colors.fng-greed-soft}"
    textColor: "{colors.fng-greed}"
    rounded: "{rounded.pill}"
    typography: "{typography.badge}"
    padding: 10px
    height: 28px
  fng-band-extreme-greed:
    backgroundColor: "{colors.fng-extreme-greed-soft}"
    textColor: "{colors.fng-extreme-greed}"
    rounded: "{rounded.pill}"
    typography: "{typography.badge}"
    padding: 10px
    height: 28px
  fng-disclaimer:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    typography: "{typography.caption}"
    padding: 10px
  donut-segment-stock:
    backgroundColor: "{colors.asset-stock}"
    rounded: "{rounded.sm}"
    height: "{spacing.donut-thickness}"
  donut-segment-coin:
    backgroundColor: "{colors.asset-coin}"
    rounded: "{rounded.sm}"
    height: "{spacing.donut-thickness}"
  donut-track:
    backgroundColor: "{colors.border-line}"
    rounded: "{rounded.sm}"
    height: "{spacing.donut-thickness}"
  asset-hero:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.xl}"
    padding: "{spacing.hero-px}"
  holdings-table-header:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label-sm}"
    padding: "{spacing.table-cell-px}"
    height: 40px
  holdings-table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-sm}"
    padding: "{spacing.table-cell-px}"
    height: "{spacing.table-row-h}"
  holdings-table-row-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-sm}"
    padding: "{spacing.table-cell-px}"
    height: "{spacing.table-row-h}"
  holdings-table-cell-numeric:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.table-cell-numeric}"
    padding: "{spacing.table-cell-px}"
  disclosure-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    typography: "{typography.body-sm-strong}"
    padding: "{spacing.disclosure-row-py}"
  disclosure-row-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    typography: "{typography.body-sm-strong}"
    padding: "{spacing.disclosure-row-py}"
  disclosure-row-meta:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  disclosure-tag:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    typography: "{typography.badge}"
    padding: 8px
    height: 24px
  skeleton-block:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.sm}"
    padding: 0px
  empty-state:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    typography: "{typography.body-sm}"
    padding: 16px
  error-state:
    backgroundColor: "{colors.critical-soft}"
    textColor: "{colors.critical}"
    rounded: "{rounded.sm}"
    typography: "{typography.body-sm}"
    padding: 12px
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
  sidebar-item-coming-soon:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
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
  bottom-nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    padding: 8px
    height: "{spacing.navbar-h}"
  bottom-nav-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent-vivid}"
    typography: "{typography.caption}"
    padding: 8px
  bottom-nav-item-coming-soon:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 8px
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
    rounded: "{rounded.lg}"
    padding: 14px
---

# home-market-redesign 디자인 가이드 (v9)

## Overview

본 v9 는 `/`(홈) 을 개별종목 분석 mock 에서 **"시장 종합" 대시보드**로 전면 교체하고, 계좌 위젯을 `/profile`(마이페이지) **"내 자산" 섹션**으로 이전하며, 사이드바 nav 를 6 → 4 로 재편(AI 분석 하단 "준비 중")하는 디자인 가이드다. 직전 base 는 `finsight-redesign` v8 (PR #25 머지) — 26 colors / 17 typography / 29 spacing / 5 rounded / 4 breakpoints / 61 components 토큰 셋을 **hex·사이즈 한 글자 변경 없이** 그대로 계승한다. 시각 언어(순백 surface / 옅은 border-line / 진한 text-strong / Signature Slate primary / accent-vivid CTA / 한국식 등락색 signal-up·signal-down / 자산 식별 asset-stock·asset-coin / AI 그라데이션) 무회귀. v9 가 추가하는 것은 **세 화면이 새로 필요로 하는 의미 토큰**뿐이다.

**브랜드 톤·타겟** — FinSight 의 "조회·분석 전용" 정체성. 한국 개인 투자자가 앱을 열었을 때 **"시장이 지금 어떤지" 를 한눈에**, 그리고 **"뜻 모르는 사람도 지금 매매 좋/나쁨" 을 직관적으로** 파악하게 한다(PRD §3.5 사용자 요구). 정보 과밀을 지양("깔끔") 하고, 위젯은 PRD 가 확정한 1차 4종(검색 / 지수 / 공포·탐욕 / 공시) + 수급 "준비 중" 예고(선택) 로 한정한다.

**v9 의 변경 축 4가지** (PRD §4 "디자인 토큰 신규 추가 — 기존 v8 토큰 재사용 우선" 준수, 신규는 필요 최소):

1. **공포·탐욕 게이지의 "심리 의미축" 색 5키 + soft 페어 5키 + 트랙 1키** — `fng-extreme-fear` / `fng-fear` / `fng-neutral` / `fng-greed` / `fng-extreme-greed` (+ `-soft` 5키, `fng-track`). PRD §3.5 가 명시적으로 요구·허용한 영역 — "게이지 색 그라데이션은 한국식 등락색과 충돌하지 않게 별도 의미축으로 설계". 한국식 등락색(상승=빨강 `signal-up` / 하락=파랑 `signal-down`) 과 정면 충돌하는 "공포=파랑 / 탐욕=빨강" 통념을 피하기 위해 **등락색과 시각적으로 구분되는 별도 청록→황토 의미축**을 채택한다(아래 Colors 절에서 충돌 해소 결정·근거 상세).
2. **마이페이지 자산 시각화 — 도넛 세그먼트 + 보유종목 전체 테이블** 합성 토큰. 도넛은 기존 `asset-stock` / `asset-coin` 색 재사용(신규 색 0). 테이블은 `holdings-table-*` 합성 토큰(기존 색 cascade).
3. **공시 피드 + 시장 종합 위젯 셸** 합성 토큰 — `disclosure-row` / `disclosure-tag` / `search-bar-hero` / `card-section-header` / `skeleton-block` / `empty-state` / `error-state`. 색 신규 0, 기존 색 재배치.
4. **nav "준비 중"(comingSoon) 상태** 합성 토큰 — `sidebar-item-coming-soon` / `bottom-nav-item-coming-soon` / `badge-coming-soon`. dimmed 톤(`text-muted` × `surface`) + "준비 중" pill 배지. 색 신규 0.

**무회귀 강제** — v9 가 재사용하는 v8 토큰(colors 26 키 / typography 16 키 / spacing 29 키 / rounded 5 키 / breakpoints 4 키 / 본 슬러그가 호출하는 v8 합성 토큰)은 hex·사이즈 한 글자 변경 없이 그대로 가져온다(한국식 등락색·자산색·AI 그라데이션·카드 셸 무회귀). **본 슬러그 front matter 의 최종 토큰 수**(`design.md lint` token-summary 기준): **colors 37 / typography 18 / spacing 38 / rounded 5 / breakpoints 4 / components 86**. **v9 가 v8 대비 추가한 것**: (a) colors +11(공포·탐욕 의미축 11 키), (b) typography +2(`gauge-score` / `table-cell-numeric` — v8 에서 본 슬러그가 안 쓰는 `display` 는 미포함), (c) spacing +홈·게이지·도넛·테이블·공시 레이아웃 키(`home-grid-gap`/`gauge-w`/`gauge-h`/`gauge-track-w`/`donut-size`/`donut-thickness`/`table-row-h`/`table-cell-px`/`disclosure-row-py`), (d) rounded 무변경, (e) components 신규(공포·탐욕 게이지 8 / 도넛·자산 4 / 테이블 4 / 공시 4 / 검색·섹션·상태 7 / nav 준비중 3 / 자산 히어로 1). 본 슬러그는 `price-bar-*` 등 v9 비범위 v8 합성 토큰은 carry 하지 않는다(orphaned-tokens 회피). **주의(파이프라인)**: `npm run design:sync` 는 `finsight-redesign.md` 를 source 로 고정한다 — 본 슬러그 토큰을 Tailwind 에 주입하려면 frontend-dev 가 design:sync source 를 본 파일로 바꾸거나 신규 토큰을 finsight-redesign.md 에 병합해야 한다(파이프라인 영역, R8 참조).

## Colors

v8 의 26 토큰 키를 hex 무회귀 계승 + **공포·탐욕 게이지 의미축 11 토큰** 신규. 키 셋: 26 → 37. 그 외 v9 의 모든 신규 합성 토큰(도넛·테이블·공시·검색·nav 준비중)은 **기존 색만 참조**한다 — 색 신규는 게이지 의미축 하나뿐이다(PRD §4 토큰 재사용 원칙).

### 공포·탐욕 게이지 "심리 의미축" — 한국식 등락색 충돌 해소 (핵심 결정)

**문제 정의(PRD §3.5 주의 사항 직접 인용)** — "게이지 색 그라데이션은 한국식 등락색과 충돌하지 않게 별도 의미축으로 설계(주의: 공포=파랑/탐욕=빨강이면 한국 등락색과 반대 의미라 혼동 가능 — 이 충돌을 어떻게 풀지 명시적으로 디자인 결정하고 근거 적어라)."

세계 표준 공포·탐욕 게이지(CNN Fear & Greed)는 **공포=빨강 / 탐욕=초록**(미국식)이다. 그런데 본 앱은 한국식 등락색 — **상승=빨강(`signal-up`) / 하락=파랑(`signal-down`)** — 을 시스템 레벨로 박았다(v8). 만약 게이지에 등락색을 그대로 쓰면:

- **옵션 A(미국식 그대로: 공포=빨강 / 탐욕=초록)** — 한국 사용자에게 "빨강 = 상승/좋음" 인데 게이지의 빨강은 "공포/나쁨" 이라 정면 충돌. **탈락**.
- **옵션 B(한국 등락색 차용: 공포=파랑 / 탐욕=빨강)** — "탐욕=빨강" 은 한국식 "상승=빨강" 과 같은 색이라 "지금 빨강이니 좋은 거네?" 오독 유발. 실제로 탐욕 구간은 "과열·조정 주의"(나쁨 신호). **PRD 가 명시적으로 경계한 충돌. 탈락**.
- **옵션 C(채택) — 등락색과 완전히 다른 hue 의 별도 "심리 의미축"** — 공포극(파랑 계열이되 등락 파랑과 톤 분리) → 중립(회색) → 탐욕극(적자색/와인 계열이되 등락 빨강과 톤 분리). 게이지는 "등락" 이 아니라 "심리" 를 말하는 별도 축임을 색 자체로 분리한다.

**채택안 C 의 색 설계** — 게이지를 5구간 의미축으로:

| 토큰 키 | hex | 구간(점수) | 라벨 | hue 의도 |
|---|---|---|---|---|
| `fng-extreme-fear` | `#1d6fb8` | 0–24 | 극단적 공포 | 차분한 청색(cyan-blue). 등락 `signal-down`(#1d4ed8, 채도 높은 royal blue)보다 한 단계 밝고 cyan 쪽으로 틀어 "심리축 파랑 ≠ 등락 파랑" 시각 분리. |
| `fng-fear` | `#256353` | 25–44 | 공포 | 청록(teal, 진한 톤). 파랑→회색으로 가는 중간 — 등락색 어디에도 없는 hue 라 충돌 0. soft 페어 AA 통과 위해 1차값 `#3a7d6e` 에서 한 단계 진하게. |
| `fng-neutral` | `#4b525c` | 45–55 | 중립 | 중성 회색(slate-gray, 진한 톤). "한쪽으로 안 치우침" 의 시각 메타포. 등락색과 무관. soft 페어 AA 통과 위해 1차값 `#6b7280` 에서 한 단계 진하게. |
| `fng-greed` | `#82500c` | 56–75 | 탐욕 | 황토(amber-brown, 진한 톤). 회색→적자색으로 가는 중간. `warn`(#a14a06)·`asset-coin`(#c2410c) 과 hue 인접하나 채도·명도가 달라 별 축으로 인식. soft 페어 AA 통과 위해 1차값 `#b06a12` 에서 한 단계 진하게. |
| `fng-extreme-greed` | `#a83246` | 76–100 | 극단적 탐욕 | 와인/적자색(crimson-wine). 등락 `signal-up`(#c81e1e, vivid red)보다 어둡고 자주빛 쪽으로 틀어 "심리축 빨강 ≠ 등락 빨강" 시각 분리. |

**왜 이 5색이 충돌을 푸는가** — 핵심은 두 끝점이다. 극공포(`#1d6fb8`)는 등락 파랑(`#1d4ed8`)과 "둘 다 파랑이지만 cyan-틸트 + 한 단계 밝음" 으로 갈라지고, 극탐욕(`#a83246`)은 등락 빨강(`#c81e1e`)과 "둘 다 빨강이지만 자주빛 + 한 단계 어두움" 으로 갈라진다. 게이지가 한 화면 안에서 등락 카드(지수)와 나란히 놓여도(홈 레이아웃), 사용자는 게이지의 색을 "등락" 이 아니라 "심리 그라데이션(파랑↔회색↔와인)" 의 독립 스펙트럼으로 인지한다. **결정적 보강 — 색에만 의존하지 않는다**: 게이지 중앙에 점수 숫자(`gauge-score` 40px) + 구간 라벨 텍스트(`fng-band-*` 배지) + 추천 톤 한 줄 해석을 항상 동반한다(PRD §3.5 표 카피 그대로). 색맹·색약 사용자도 점수·텍스트로 의미를 100% 획득 — 색은 보조축이다(WCAG 1.4.1 "색만으로 정보 전달 금지" 준수). PRD §3.5 의 이모지(🔵🔵⚪🟠🔴)는 카피의 일부로 라벨 앞에 그대로 노출하되, 게이지 색과 1:1 동일색이 아님을 디자이너가 의도(이모지는 OS 렌더 색이라 토큰 통제 불가 — 색 정보는 어디까지나 보조).

**의미축 ↔ PRD §3.5 이모지 매핑 명시** — PRD 표의 추천 톤 이모지와 본 게이지 색의 관계: 🔵(극공포·공포) ≈ 게이지 파랑/청록 계열, ⚪(중립) ≈ 회색, 🟠(탐욕) ≈ 황토, 🔴(극탐욕) ≈ 와인. 이모지는 "방향(좋음/주의)" 의 보조 신호, 게이지 색은 "심리 위치" 의 신호로 둘 다 텍스트 라벨이 정본.

### 공포·탐욕 게이지 색의 WCAG 안전성

게이지 색 5키는 (1) 게이지 fill(배경 위 색면 — 텍스트 아님, contrast 비대상), (2) 구간 배지 텍스트(`fng-band-*` 의 textColor × soft 배경) 두 용도다. 배지 텍스트 페어만 4.5:1 강제 — 아래 대비표 참조. soft 페어는 각 색의 명도를 surface 기준으로 충분히 떨어뜨린 진한 톤으로 결정해 모두 AA 통과.

### v9 신규 색 11키 요약

| 토큰 키 | hex | 분류 | 사용처 |
|---|---|---|---|
| `fng-extreme-fear` | `#1d6fb8` | 게이지 의미축 | 게이지 0–24 fill, `fng-band-extreme-fear` 텍스트 |
| `fng-fear` | `#256353` | 게이지 의미축 | 게이지 25–44 fill, `fng-band-fear` 텍스트 |
| `fng-neutral` | `#4b525c` | 게이지 의미축 | 게이지 45–55 fill, `fng-band-neutral` 텍스트 |
| `fng-greed` | `#82500c` | 게이지 의미축 | 게이지 56–75 fill, `fng-band-greed` 텍스트 |
| `fng-extreme-greed` | `#a83246` | 게이지 의미축 | 게이지 76–100 fill, `fng-band-extreme-greed` 텍스트 |
| `fng-extreme-fear-soft` | `#e3f0fa` | 게이지 soft | `fng-band-extreme-fear` 배경 |
| `fng-fear-soft` | `#e1f0eb` | 게이지 soft | `fng-band-fear` 배경 |
| `fng-neutral-soft` | `#f0f1f3` | 게이지 soft | `fng-band-neutral` 배경 |
| `fng-greed-soft` | `#fbf0dc` | 게이지 soft | `fng-band-greed` 배경 |
| `fng-extreme-greed-soft` | `#fbe4e8` | 게이지 soft | `fng-band-extreme-greed` 배경 |
| `fng-track` | `#eceff3` | 게이지 트랙 | `fng-gauge-track` 미채워진 반원 배경 (`border-line` 과 동일 hex — 별 키로 의미 분리) |

### 기존 색 재사용 (v9 신규 합성 토큰)

- **도넛 차트** — `donut-segment-stock` = `asset-stock`(#1e40af), `donut-segment-coin` = `asset-coin`(#c2410c), `donut-track` = `border-line`. v8 자산 식별 색 그대로(주식=청색·코인=주황). 자산비중 도넛은 "등락" 이 아니라 "자산 종류" 분류라 등락색 미사용 — v8 사용처 룰 정합.
- **보유종목 테이블 수익률** — 수익률 +/− 는 `signal-up-text` / `signal-down-text`(한국식 등락색). 평가액·비중은 `text-strong`. 테이블 헤더는 `surface-muted` × `text-muted`.
- **공시 피드** — `disclosure-row` 는 `surface` × `text-strong`, hover `surface-muted`. 종목 태그 `disclosure-tag` 는 `accent-soft` × `primary`(중립 강조 — 등락/자산색 아님, 단순 분류 칩).
- **검색바** — `search-bar-hero` 는 `surface` × `text-strong`, 드롭다운은 v8 `dropdown-panel` / `search-result-item(-focus)` 그대로 재사용.
- **nav 준비중** — `sidebar-item-coming-soon` / `bottom-nav-item-coming-soon` 는 `surface` × `text-muted`(dimmed), `badge-coming-soon` 은 `surface-muted` × `text-muted`.

### WCAG AA 4.5:1 대비비 표 (v9 신규 합성 토큰)

텍스트를 호스팅하는 신규 페어 11건. **모두 4.5:1 이상.**

| Foreground × Background (사용처) | 비율 | AA 마진 | 4.5:1 |
|---|---|---|---|
| `fng-extreme-fear` × `fng-extreme-fear-soft` (극공포 배지) | 4.51:1 | +0% | OK |
| `fng-fear` × `fng-fear-soft` (공포 배지) | 5.98:1 | +33% | OK |
| `fng-neutral` × `fng-neutral-soft` (중립 배지) | 6.98:1 | +55% | OK |
| `fng-greed` × `fng-greed-soft` (탐욕 배지) | 6.00:1 | +33% | OK |
| `fng-extreme-greed` × `fng-extreme-greed-soft` (극탐욕 배지) | 5.41:1 | +20% | OK |
| `fng-score` `text-strong` × `surface` (게이지 점수) | 18.51:1 | +311% | OK |
| `fng-disclaimer` `text-muted` × `surface-muted` (디스클레이머) | 5.63:1 | +25% | OK |
| `holdings-table-header` `text-muted` × `surface-muted` (테이블 헤더) | 5.63:1 | +25% | OK |
| `holdings-table-row` `text-strong` × `surface` (테이블 행) | 18.51:1 | +311% | OK |
| `disclosure-tag` `primary` × `accent-soft` (공시 종목 태그) | 10.21:1 | +127% | OK |
| `badge-coming-soon` `text-muted` × `surface-muted` (준비 중 배지) | 5.63:1 | +25% | OK |

**해석** — 최저 마진은 `fng-extreme-fear` × `fng-extreme-fear-soft` 4.51:1(+0%, AA 경계 통과). 극공포 청색 페어가 가장 빠듯하나 AA 4.5:1 충족. (나머지 4 페어는 5.4~7.0:1 로 여유. front matter 토큰값은 본 대비표 실측 기준 — `fng-fear`/`fng-neutral`/`fng-greed` 는 soft 페어 AA 통과를 위해 1차안보다 진한 `#256353`/`#4b525c`/`#82500c` 확정.) 게이지 배지는 색이 정보의 보조축일 뿐(점수·라벨 텍스트가 정본)이라 추가 안전. `badge-coming-soon` 의 `text-muted` × `surface-muted` 5.63:1 은 "dimmed" 시각 의도(비활성처럼 보이되 가독은 유지)와 AA 통과를 동시에 만족 — 완전 비활성 회색(AA 미달)이 아니라 "준비 중이지만 읽을 수 있는" 톤을 의도적으로 택했다.

## Typography

v8 의 typography 토큰을 무회귀 계승(본 슬러그가 안 쓰는 `display` 는 carry 하지 않음 — orphaned 회피) + **신규 2 키**. 본 슬러그 최종 typography 토큰 **18 키**. Pretendard 패밀리·fallback 무변경.

- **`gauge-score` (40px / 800 / `tnum`)** — 공포·탐욕 게이지 중앙 점수 숫자(예: "58"). 게이지의 시각 앵커 — 색이 보조축인 만큼 숫자가 의미의 정본이라 크게(40px) 박는다. `tnum`(tabular-numeric)으로 0~100 자릿수 변화 시 흔들림 방지. `font-display`(36px/800) 보다 한 단계 크되 letterSpacing 은 동일 `-0.02em` 으로 숫자 결속.
- **`table-cell-numeric` (14px / 700 / `tnum`)** — 보유종목 테이블의 평가액·수익률·비중 숫자 셀. `mono-numeric`(15px) 보다 한 단계 작게 — 테이블은 행이 여러 줄이라 15px 면 행 높이가 커진다. 700 weight + `tnum` 으로 숫자 정렬·가독 유지.

나머지 타이포는 신규 컴포넌트에서 v8 토큰 그대로 사용 — 검색바 `body-md`, 공시 헤드라인 `body-sm-strong`, 공시 타임스탬프 `caption`, 게이지 구간 배지 `badge`, 카드 섹션 헤더 `h2`, 디스클레이머 `caption`.

## Layout

본 절이 v9 의 핵심 — 홈 시장 종합 그리드 + 마이페이지 자산 섹션 배치 + 사이드바 재편을 두 뷰포트(모바일 375 / 데스크탑 1280)에서 정의한다. 3-section shell(navbar + sidebar + main-area)·breakpoints(sm 640 / md 768 / lg 1024 / xl 1280)·`main-max-w` 1152px·`sidebar-w` 264px·`drawer-w` 304px 는 `layout-redesign` v4 + `finsight-redesign` v8 무회귀.

### 신규 layout 토큰 (`spacing` 절)

- **`home-grid-gap: 16px`** — 홈 위젯 카드 사이 간격. v8 `2xl`(24px)보다 좁은 16px — "깔끔" 원칙상 카드가 너무 떨어지면 산만, 너무 붙으면 답답. 16px 은 카드 외곽선(`border-line`)이 분리를 이미 만들어주므로 적정.
- **`gauge-w: 220px` / `gauge-h: 120px` / `gauge-track-w: 14px`** — 반원 게이지의 뷰박스 폭/높이/트랙 두께. 반원(180°)이라 높이는 폭의 약 절반 + 점수 라벨 공간. 트랙 14px 은 `price-bar-track`(6px)보다 두껍게 — 게이지는 한 화면 1개 주연이라 시각 무게 부여.
- **`donut-size: 168px` / `donut-thickness: 22px`** — 자산비중 도넛 지름/링 두께. 168px 은 마이페이지 자산 히어로 우측에 배치해도 모바일 1열에서 넘치지 않는 크기. 두께 22px 은 도넛 가운데에 "총 N종" 같은 요약 텍스트를 넣을 구멍 확보.
- **`table-row-h: 48px` / `table-cell-px: 12px`** — 보유종목 테이블 행 높이/셀 좌우 패딩. 48px 은 터치 타깃(44px) 이상 + 숫자 가독.
- **`disclosure-row-py: 12px`** — 공시 피드 한 행의 상하 패딩(헤드라인 + 메타 2줄 호스팅).

신규 토큰은 모두 `spacing` 절에 둔다(v8 룰 — DESIGN.md alpha 가 별도 layout namespace 미정의, spacing 흡수가 lint + Tailwind export 정합). frontend-dev 는 `theme.spacing['gauge-w']` 또는 CSS 변수 참조.

### 홈(`/`) 시장 종합 — 데스크탑 (`>= lg`, 1024px+)

```
┌────────────────────────────────────────────────────────────────────────┐
│ navbar (60px)  [Wordmark]                                  [placeholder] │
├──────────────┬─────────────────────────────────────────────────────────┤
│ sidebar 264  │  main-area (surface-muted, max-w 1152, 가운데 정렬)      │
│              │                                                          │
│ MENU         │  ┌──────────── 종목 검색바 (search-bar-hero, full) ───┐ │
│ ● 홈         │  │ 🔍 종목명·코드로 검색…                              │ │
│ ○ 관심종목   │  └────────────────────────────────────────────────────┘ │
│ ○ 마이페이지 │                                                          │
│              │  ┌─ 주요 지수 (card) — 3 indices 가로 ──────────────┐  │
│ ┄┄┄┄┄┄┄┄┄┄  │  │ ┌ KOSPI ─┐ ┌ KOSDAQ ┐ ┌ KOSPI200 ┐               │  │
│ (하단 그룹)  │  │ │ 2,612  │ │  742   │ │  348      │ (IndicesCard) │  │
│ ◌ AI 분석    │  │ │ ▲ +0.8%│ │ ▼ -0.3%│ │ ▲ +0.6%   │               │  │
│   [준비 중]  │  │ └────────┘ └────────┘ └───────────┘               │  │
│              │  └────────────────────────────────────────────────────┘ │
│              │                                                          │
│              │  ┌── 공포·탐욕 (card) ──┐  ┌── 최신 공시 (card) ─────┐ │
│              │  │      반원 게이지       │  │ • 삼성전자 주요사항…  2h│ │
│              │  │        ◜‾‾‾◝         │  │ • SK하이닉스 단일판매 4h│ │
│              │  │    58  탐욕 🟠        │  │ • NAVER 분기보고서   1d│ │
│              │  │  "추격매수 주의…"     │  │ • 카카오 임원변경    1d │ │
│              │  │  [참고용 간이지표]     │  │           [더 보기 →]   │ │
│              │  └──────────────────────┘  └─────────────────────────┘ │
│              │                                                          │
│              │  ┌── (선택) 수급 예고 (card-info, full) ──────────────┐ │
│              │  │ 외국인·기관 수급 동향        [준비 중]              │ │
│              │  └────────────────────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────────┘
```

- **컨테이너**: main-area 안에서 `max-w: main-max-w(1152px)` 가운데 정렬. 패딩 24px(`lg:p-2xl`). 위젯 카드 사이 `home-grid-gap`(16px).
- **그리드 정책**:
  - 검색바: 항상 full-width(row 1). 시장 종합의 첫 동선 — 가장 위.
  - 주요 지수: full-width 카드 1개 안에 `IndicesCardContainer`(KOSPI/KOSDAQ/KOSPI200 3개 `IndicesCard`)가 `lg:grid-cols-3` 가로 배치(기존 컴포넌트 무변경 재사용).
  - 공포·탐욕 + 공시: `lg:grid-cols-2` 2열(약 5:7 비율 권장 — 공시 리스트가 더 넓게). 디자이너 권장: `lg:grid-cols-[minmax(280px,2fr)_3fr]`.
  - 수급 예고(선택): full-width `card-info` 1줄. 디자이너 재량(필수 아님 — PRD §3.4). 배치 시 최하단.
- **위계**: 검색(행동) → 지수(객관 시세) → 심리+공시(해석·이벤트) → 수급예고(미래). "지금 시장이 어떤지" 가 위에서 아래로 자연 독해.

### 홈(`/`) 시장 종합 — 모바일 (`< lg`, ~1023px)

```
┌──────────────────────────┐
│ navbar (60px)            │
│ [☰] [Wordmark]   [....]  │
├──────────────────────────┤
│ main-area (surface-muted)│
│                          │
│ ┌─ 종목 검색바 ────────┐ │
│ │ 🔍 검색…             │ │
│ └──────────────────────┘ │
│                          │
│ ┌─ 주요 지수 (card) ───┐ │
│ │ KOSPI    2,612 ▲0.8% │ │
│ │ KOSDAQ     742 ▼0.3% │ │
│ │ KOSPI200   348 ▲0.6% │ │  ← 모바일은 세로 1열 스택
│ └──────────────────────┘ │
│                          │
│ ┌─ 공포·탐욕 (card) ───┐ │
│ │     ◜‾‾‾◝            │ │
│ │   58  탐욕 🟠         │ │
│ │ "추격매수 주의…"      │ │
│ │ [참고용 간이지표]      │ │
│ └──────────────────────┘ │
│                          │
│ ┌─ 최신 공시 (card) ───┐ │
│ │ • 삼성전자 …    2h    │ │
│ │ • SK하이닉스 …  4h    │ │
│ │ • NAVER …      1d     │ │
│ │       [더 보기 →]     │ │
│ └──────────────────────┘ │
│                          │
│ ┌─ 수급 예고 [준비 중] ┐ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

- 모든 위젯 **세로 1열 풀폭 스택**. 지수 3카드도 모바일은 세로 스택(`grid-cols-1`, `IndicesCardContainer` 가 기존부터 반응형).
- 공포·탐욕 + 공시 2열은 모바일에서 세로로 다운그레이드(`grid-cols-1 lg:grid-cols-2`).
- 사이드바는 drawer(`drawer-w` 304px)로 접힘 — hamburger 토글(layout v4 무회귀). 하단 BottomNav 가 모바일 1차 nav(아래 Components 절).
- main-area 패딩 18px(모바일).

### 태블릿 (`md ~ lg-1`, 768~1023px)

layout v4 무회귀 — **모바일과 동일한 1열 스택** 유지. sidebar 는 drawer 로 접힘. 768~1023px 에서 2열 게이지+공시를 펴면 게이지 폭이 어정쩡해지므로 1열 유지가 안전. 단 검색바·지수 카드는 가용 폭을 자연스럽게 채운다(컨테이너 폭 추종).

### 마이페이지(`/profile`) "내 자산" 섹션 — 데스크탑

```
┌─────────────────────────────────────────────────────────────────────┐
│  /profile (기존 ProfileCard 상단 무회귀)                              │
│  ┌──────────────── ProfileCard (기존, 무변경) ──────────────────┐  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ── 내 자산 ──────────────────────────  (h1 섹션 타이틀)             │
│  ┌──────── asset-hero (총자산 히어로, full) ────────────────────┐  │
│  │  총 자산        ₩ 128,400,000                                 │  │
│  │  투자원금 ₩120,000,000 · 평가손익 ▲₩8,400,000 (+7.0%)        │  │
│  │  ┌── 도넛 168 ──┐   주식 72%  ₩92,400,000                    │  │
│  │  │   ◯ 자산비중  │   코인 28%  ₩36,000,000                    │  │
│  │  └──────────────┘                                             │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────── 보유종목 (card, full) — 전체 테이블 ─────────────────┐  │
│  │ 종목명        평가액         수익률      비중   ↕ 정렬        │  │
│  │ ───────────────────────────────────────────────────────────  │  │
│  │ 삼성전자     ₩52,400,000   ▲ +12.4%    41%                   │  │
│  │ 비트코인     ₩36,000,000   ▼  -3.2%    28%                   │  │
│  │ SK하이닉스   ₩40,000,000   ▲  +5.1%    31%                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ ConnectedExchangesCard (기존) ─┐ ┌─ SettingsMenuCard (기존) ─┐  │
│  └────────────────────────────────────┘ └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

- **배치 순서**: ProfileCard(기존, 무변경) → **"내 자산" 섹션 신설**(asset-hero + 보유종목 테이블) → ConnectedExchangesCard / SettingsMenuCard(기존). "내 자산" 을 ProfileCard 바로 아래(가장 중요한 개인 데이터)에 둔다.
- **총자산 히어로(`asset-hero`)**: 기존 `PortfolioHero` 를 마이페이지로 이전·재배치. 총자산(`font-display`) + 투자원금/평가손익/손익률(손익은 `signal-up-text`/`signal-down-text`) + **자산비중 도넛**(주식=`asset-stock`/코인=`asset-coin`). 데스크탑은 도넛을 우측, 모바일은 숫자 아래.
- **자산비중 도넛**: 기존 막대 → 도넛(PRD §3.1 권장). 168px 지름, 22px 링. 가운데에 "2 자산" 같은 요약. 범례는 도넛 우측(데스크탑)/아래(모바일) — `badge-asset-stock`/`badge-asset-coin` 칩 + 퍼센트.
- **보유종목 전체 테이블**(`card` + `holdings-table-*`): 종목명 / 평가액 / 수익률 / 비중 4열. 헤더 클릭 정렬(↕). 수익률 컬럼만 등락색. mock 3종이라 행은 적지만 **구조는 전체 테이블**(Top3 요약 아님 — PRD AC-2). 거래성 항목(예수금/주문가능/실현손익/입출금) **미노출**(PRD §3.1, AC-9).
- **하단 기존 카드**: ConnectedExchangesCard / SettingsMenuCard 는 데스크탑 2열(`lg:grid-cols-2`)/모바일 세로.

### 마이페이지 "내 자산" — 모바일

세로 1열: ProfileCard → "내 자산" 타이틀 → asset-hero(총자산 → 손익 → 도넛 세로) → 보유종목 테이블(가로 스크롤 허용 또는 비중 컬럼 생략 후 행 탭으로 상세) → 기존 카드들. 테이블이 좁으면 **종목명+수익률 우선, 평가액·비중은 행 내 2줄** 로 접는 카드형 폴백 허용(frontend-dev 재량 — 단 정렬 가능 테이블 의미 유지).

### 사이드바 재편 (6 → 4) — 데스크탑 / BottomNav — 모바일

```
데스크탑 Sidebar (264px)            모바일 BottomNav (60px, 하단 고정)
┌──────────────────┐               ┌──────────────────────────────────┐
│ MENU             │               │  [홈]   [관심]  [마이]  [AI·준비중]│
│ ● 홈             │               │   ●      ○      ○       ◌ dimmed   │
│ ○ 관심 종목      │               └──────────────────────────────────┘
│ ○ 마이페이지     │
│                  │   ← main 그룹(placement: "main", status: "ready")
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄  │   ← 구분선(border-line 1px) + 여백
│                  │
│ ◌ AI 분석        │   ← bottom 그룹(placement: "bottom", status: "comingSoon")
│   ⏳ 준비 중      │      dimmed(text-muted) + "준비 중" pill
└──────────────────┘
```

- **main 그룹(상단)**: 홈(`/`) · 관심 종목(`/watchlist`) · 마이페이지(`/profile`). 기존 `sidebar-item` / `-hover` / `-active` 토큰 그대로.
- **bottom 그룹(하단)**: AI 분석(`/analyze`) 1개. main 그룹과 **구분선(1px `border-line`) + 여백(`spacing.xl`)** 으로 시각 분리. `sidebar-item-coming-soon`(dimmed `text-muted`) + `badge-coming-soon`("준비 중" pill). 상세 상태(hover/disabled/tooltip)는 Components 절.
- **NavItem 모델 전제(PRD §3.3)**: `status: "ready" | "comingSoon"` + `placement: "main" | "bottom"`. Sidebar/BottomNav 가 placement 로 그룹 분리 렌더. 엔진 연동 완료 시 `status` 만 `ready` 로 바꿔 정식 승격(디자인 무변경).
- **BottomNav(모바일)**: 4개 탭 가로 균등. AI 분석 탭도 노출하되 `bottom-nav-item-coming-soon`(dimmed) + 라벨 위 작은 "준비 중" 점/배지. 일관 정책(PRD AC-3).

### 반응형 분기 — CSS 우선 + JS 보조

layout v4 무회귀. CSS prefix(`md:`/`lg:`)가 1차(그리드 열 수·sidebar `hidden lg:block`·BottomNav `lg:hidden`), `useBreakpoint` 가 2차(drawer state·focus trap·scroll lock). `window.innerWidth` 직접 검사 금지.

## Elevation & Depth

v8/v4 평면 기조 무회귀. 신규 요소 그림자 정책:

- **홈 위젯 카드**(`card`): 그림자 없음. `border-line` 1px 외곽선 + `surface` 채움으로 `surface-muted` 배경과 분리(v8 카드 elevation 무회귀).
- **공포·탐욕 게이지**: 그림자 없음. 게이지 fill 의 색 자체가 깊이. 트랙(`fng-track`)과 fill 의 명도차로 충진 정도 인지.
- **자산 히어로**(`asset-hero`): `card-hero` 와 동일 — 그림자 없음, `rounded.xl`(24px) 라운드로만 "주연 카드" 강조.
- **검색 드롭다운 패널**(`dropdown-panel`): v8 무회귀 — 떠 있는 패널이라 미세 그림자 1회 허용(frontend-dev 측 `0 8px 24px rgba(15,20,25,0.10)`, 토큰화 안 함 — v8 동일 원칙).
- **드로어**(모바일): layout v4 무회귀 그림자 1회.

한 화면 그림자 총량: 홈은 드롭다운 열렸을 때만 1회, 마이페이지는 0회.

## Shapes

v8 의 rounded 5키(`sm` 8 / `md` 12 / `lg` 16 / `xl` 24 / `pill` 999) 무회귀 — v9 신규 라운드 없음.

- 위젯 카드: `rounded.lg`(16px) — v8 `card` 무회귀.
- 자산 히어로·게이지 카드: `rounded.xl`(24px) — 주연 카드(`card-hero` 톤).
- 검색바(`search-bar-hero`): `rounded.md`(12px) — 입력 필드보다 한 단계 부드럽게(히어로 검색의 친근함).
- 게이지 트랙·도넛 세그먼트: `rounded.pill`(트랙 끝 둥글게) / `rounded.sm`(도넛 세그먼트 — SVG arc 라 실제론 stroke-linecap, 토큰은 의미 표기).
- "준비 중" 배지·구간 배지: `rounded.pill` — v8 badge 무회귀.

## Components

### 홈 — 종목 검색바

#### `search-bar-hero`
- 자리: 홈 main-area 최상단 full-width. height 52px, `rounded.md`, `surface` × `text-strong`, `body-md`.
- 좌측 🔍 아이콘 + placeholder "종목명·코드로 검색…". 입력 시 v8 `dropdown-panel` + `search-result-item`/`-focus`(키보드 ↑↓ 포커스) 그대로.
- 데이터: `/api/stock/search`(symbols.json substring) — 커스텀훅 경유(frontend.md §1). 선택 시 `/profile/[ticker]` 라우팅(PRD §3.2).
- 상태: 입력 전(placeholder) / 타이핑 중(디바운스 후 드롭다운) / 결과 0건("일치하는 종목이 없어요", `empty-state` 톤 드롭다운 내) / 에러(드롭다운 내 `error-state` 한 줄 "검색에 실패했어요. 다시 시도해 주세요.").

### 홈 — 주요 지수 카드 (기존 재사용)

- `IndicesCardContainer` + `useQueryIndices`(`/api/market/indices`)를 `/market` 에서 홈으로 이전. **컴포넌트·토큰 무변경** — KOSPI/KOSDAQ/KOSPI200 3 `IndicesCard`. 등락은 `signal-up-text`/`signal-down-text`(한국식).
- 상태(market-real-data 선례 그대로): 로딩(스켈레톤 3카드), 부분성공(`Promise.allSettled` — 성공 카드만 값, 실패 카드 "일시적으로 못 불러왔어요" + 재시도), 전체에러(`error-state`), prod 키 없을 때 mock fallback(`X-Data-Source` 헤더).

### 홈 — 공포·탐욕 지수 카드 (신규, PRD §3.5)

#### 반원 게이지 + `fng-gauge-track` + `fng-score`
```
        ◜‾‾‾‾‾‾‾◝          ← 반원(180°), 트랙 fng-track 위에 구간색 fill
      ◝           ◜
     0     58      100      ← 양끝 0/100 눈금(caption)
          ┃                 ← 바늘(현재 점수 위치, text-strong 1.5px)
          58                ← gauge-score 40px (점수=의미 정본)
       탐욕  🟠              ← fng-band-greed 배지(라벨+이모지)
   "투자심리가 달아오르고     ← body-sm 한 줄 해석(PRD §3.5 카피 그대로)
    있어요. 추격매수는 신중히"
   ┌──────────────────────┐
   │ 참고용 간이 지표        │ ← fng-disclaimer(상시 노출, 필수)
   │ (CNN 공식 지수 아님)    │
   └──────────────────────┘
```
- **게이지 fill 색**: 점수 구간 → `fng-extreme-fear`(0–24) / `fng-fear`(25–44) / `fng-neutral`(45–55) / `fng-greed`(56–75) / `fng-extreme-greed`(76–100). 반원 0→100 따라 5색 스톱 그라데이션 + 현재 점수까지 fill, 나머지 `fng-track`. SVG arc + `stroke` 토큰색. 바늘(점수 위치 표식)은 `text-strong` 가는 선.
- **점수**(`fng-score` 40px): 게이지 중앙. 의미의 정본(색은 보조).
- **구간 배지**(`fng-band-*`): 라벨(극단적 공포/공포/중립/탐욕/극단적 탐욕) + PRD §3.5 이모지(🔵🔵⚪🟠🔴). 점수 구간 따라 1개만 노출.
- **한 줄 해석**(`body-sm` × `text-strong`): PRD §3.5 표의 "한 줄 해석" 카피 **그대로**. `lib/copy/home/labels.ts`.
- **디스클레이머**(`fng-disclaimer`, 상시): "이 점수는 KIS 등락종목수 기반의 참고용 간이 지표(CNN 공식 지수 아님)이며, 투자 판단의 단독 근거가 아닙니다." PRD §3.5 — 항상 노출.
- **데이터**: 지수 응답 `ascn_issu_cnt`/`down_issu_cnt` → `breadth = ascn/(ascn+down)` → `score = round(100*breadth)`. 커스텀훅 경유.
- **상태**: 로딩(`skeleton-block` 반원 + 라벨자리), 데이터 없음/필드 빔(`empty-state` "심리 지표를 계산할 데이터가 아직 없어요" — PRD §8.3 fallback), 에러(`error-state`). prod 키 없으면 지수와 동일 mock 게이트.
- **색 충돌 해소 재강조**: 이 카드가 지수 카드(등락 빨강/파랑) 바로 아래 놓여도, 게이지 색은 파랑↔회색↔와인 의미축이라 등락색과 시각 분리(Colors 절). 점수·라벨 텍스트가 정본이라 색맹 안전.

### 홈 — 최신 공시 피드 카드 (신규, PRD §3.6)

#### `disclosure-row` / `-hover` / `-meta` / `disclosure-tag`
```
┌─ 최신 공시 ───────────────────────────┐  ← card-section-header(h2)
│ • 주요사항보고서(자기주식취득)         │  ← disclosure-row(body-sm-strong)
│   [삼성전자]                    2시간 전│  ← disclosure-tag + disclosure-row-meta
│ ───────────────────────────────────── │  ← border-line 구분
│ • 단일판매·공급계약 체결               │
│   [SK하이닉스]                  4시간 전│
│ ...                                    │
│                          [더 보기 →]   │  ← button-secondary
└────────────────────────────────────────┘
```
- 한 행: 헤드라인(`disclosure-row`, `body-sm-strong`, 2줄 ellipsis) + 종목 태그(`disclosure-tag`, `accent-soft`×`primary` pill) + 타임스탬프(`disclosure-row-meta`, `caption` 우측 "N시간 전"). hover `disclosure-row-hover`.
- 클릭: 종목 상세(`/profile/[ticker]`) 또는 DART 원문(`rcept_no` 링크) — PRD §3.6.
- 데이터: `/api/disclosure/list`(OpenDART), 관심종목 localStorage tickers 또는 대표풀, DART 쿼터 가드(`counter.ts`)·staleTime 캐싱. 커스텀훅 경유.
- **상태**:
  - 로딩: `skeleton-block` 행 4~5개(헤드라인 줄 + 메타 줄).
  - 빈: `empty-state` "최근 공시가 없어요. 관심종목을 추가하면 관련 공시를 모아 보여드려요." (관심종목 0건일 때 동선 유도).
  - 에러: `error-state` "공시를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." (쿼터 초과 포함).

### 홈 — (선택) 수급 예고 카드

- `card-info`(info-soft) full-width 1줄 + `badge-coming-soon`. "외국인·기관 수급 동향 — 준비 중". 클릭 비활성(또는 후속 페이지 링크 placeholder). 필수 아님(PRD §3.4) — 디자이너 권장 배치는 최하단. 홈을 너무 채우지 않기 위해 1줄로 절제.

### 마이페이지 — 자산 히어로 / 도넛 / 보유종목 테이블

#### `asset-hero`
- 기존 `PortfolioHero` 이전. 총자산(`font-display`) + 투자원금/평가손익(`signal-up-text`/`signal-down-text`)/손익률 + 자산비중 도넛. `rounded.xl`.

#### 도넛 (`donut-segment-stock` / `-coin` / `donut-track`)
- 주식=`asset-stock`(청색) / 코인=`asset-coin`(주황) 세그먼트, 미충진 `donut-track`. 168px/22px. 가운데 "N 자산" 요약. 범례 칩 `badge-asset-stock`/`badge-asset-coin` + 퍼센트. **등락색 미사용**(자산 분류축 — v8 룰).
- 자산 1종뿐이면 단색 풀도넛 + 범례 1줄. 0종이면 `empty-state` "보유 자산이 없어요".

#### 보유종목 테이블 (`holdings-table-header`/`-row`/`-row-hover`/`-cell-numeric`)
- 4열: 종목명(`body-sm` 좌) / 평가액(`table-cell-numeric` 우) / 수익률(`signal-up-text`/`signal-down-text` 우) / 비중(`table-cell-numeric` 우). 헤더 `surface-muted`×`text-muted`, 정렬 토글(↕, `aria-sort`). 행 hover `surface-muted`. 행 클릭 → `/profile/[ticker]` 상세(선택).
- 상태: 로딩(`skeleton-block` 행), 빈(`empty-state` "보유 종목이 없어요"). 거래성 컬럼 0(AC-9).

### nav — 사이드바 / BottomNav 재편 + "준비 중"

#### `sidebar-item-coming-soon` (AI 분석 하단)
- `surface` × `text-muted`(dimmed). 좌측 아이콘 dimmed + 라벨 "AI 분석" + 우측 `badge-coming-soon`("준비 중" pill). main 그룹과 구분선(1px `border-line`)+여백으로 분리.
- **시각 상태 정의(PRD 요구)**:
  - 기본: dimmed(`text-muted`), `badge-coming-soon` 노출.
  - hover: 미세 배경 `surface-muted`(클릭 가능 암시는 하되 active 승격 안 함) + 커서 `default` 또는 `not-allowed`(디자이너 결정 R4). tooltip "엔진 연동 준비 중이에요" 노출(`title` 속성 또는 커스텀 — 라이브러리 미도입).
  - disabled(클릭): 라우팅하지 않음(또는 `/analyze` 가 살아있으므로 "준비 중 안내 후 진입" 둘 다 가능 — R4 에서 결정). 기본 정책: **클릭 비활성 + tooltip**(페이지는 살아있되 nav 동선은 막아 "준비 중" 일관).
  - ARIA: `aria-disabled="true"` + tooltip 텍스트를 `aria-describedby` 로 연결. active 상태(`aria-current`) 부여 안 함.
- 엔진 연동 완료 시 `status:"ready"`+`placement:"main"` 로 바꾸면 일반 `sidebar-item` 으로 자동 승격(디자인 무변경).

#### `bottom-nav-item-coming-soon` (모바일)
- BottomNav 4번째 탭. `surface`×`text-muted`(dimmed) 아이콘+라벨 "AI 분석" + 라벨 위 작은 "준비 중" 점/미니 배지. 탭 시 tooltip/토스트 대신 짧은 안내(또는 비활성) — 사이드바와 일관. `aria-disabled`.

#### `badge-coming-soon`
- "준비 중" pill. `surface-muted`×`text-muted`, `rounded.pill`, `badge` 타이포, height 24px. dimmed 지만 가독(AA 5.63:1) — "비활성처럼 보이되 읽힘" 의도.

### 공통 상태 컴포넌트

- `skeleton-block`: `surface-muted` 펄스(애니메이션은 frontend-dev `animate-pulse`). 로딩 placeholder.
- `empty-state`: `surface`×`text-muted` `body-sm`. 빈 상태 + 동선 유도 카피.
- `error-state`: `critical-soft`×`critical` `body-sm`. 에러 + 재시도 카피.

## Do's and Don'ts

- ✅ 게이지 색은 **별도 심리 의미축**(`fng-*`)으로만. 등락(`signal-up/down`)·자산(`asset-stock/coin`) 색을 게이지에 쓰지 않는다.
- ✅ 게이지는 **점수 숫자 + 라벨 텍스트**를 항상 동반(색은 보조축). 색맹/색약 안전.
- ✅ 등락률·손익은 한국식 등락색(`signal-up`=빨강/`signal-down`=파랑). 도넛·자산비중은 자산색(`asset-stock`/`asset-coin`).
- ✅ 공시 종목 태그·검색 포커스는 중립 강조(`accent-soft`/`accent-vivid-soft`) — 등락/자산색 오용 금지.
- ✅ "준비 중" 은 dimmed(`text-muted`) + `badge-coming-soon` + tooltip. 완전 비활성 회색(AA 미달)으로 떨어뜨리지 않는다(읽힘 유지).
- ✅ 토큰 참조(`{colors.fng-greed}`, `{spacing.gauge-w}`)로만. hex/px 직타 0건(`npm run design:sync` 경유).
- ❌ "탐욕=빨강 / 공포=파랑"(한국 등락색 차용)으로 게이지를 칠하지 않는다 — PRD §3.5 가 명시 경계한 충돌.
- ❌ 보유종목을 Top3 요약으로 두지 않는다 — 전체 테이블(종목명·평가액·수익률·비중·정렬)이 정본(PRD AC-2).
- ❌ 마이페이지에 예수금/주문가능/실현손익/입출금 활성 노출 금지(조회 전용 스코프, AC-9).
- ❌ 홈에 AI 분석을 "동작하는 핵심 카드"로 배치 금지 — 진입은 사이드바 "준비 중" 이 담당(PRD §3.2/§3.3).
- ❌ 홈 정보 과밀 금지 — 1차 위젯 4종(+수급예고 선택)으로 절제("깔끔" 원칙).

## OPEN QUESTION 결정 (디자이너 영역)

PRD §9 는 q1~q6 전부 RESOLVED 다. 본 가이드가 PRD 가 디자이너에게 위임한 시각 결정을 R1~R7 로 명시한다.

| ID | 결정 영역 | 디자이너 결정 | 근거 |
|---|---|---|---|
| R1 | 공포·탐욕 게이지 색 vs 한국 등락색 충돌 | **별도 "심리 의미축" 5색(`fng-*`: 청→청록→회색→황토→와인)** 채택. 두 끝점을 등락색과 hue/명도로 분리. 점수·라벨 텍스트를 정본으로(색 보조). | PRD §3.5 가 명시적으로 위임·경계한 핵심. 옵션 A(미국식)·B(등락색 차용) 둘 다 탈락 근거는 Colors 절. |
| R2 | 게이지 시각화 형태 | **반원(180°) 게이지** + 중앙 점수(`gauge-score` 40px) + 바늘 + 구간 배지 + 한 줄 해석 + 상시 디스클레이머. | PRD §3.5 "반원 게이지(디자이너 확정)". 사용자 요구 "추천을 잘 표시" → 배지+해석을 게이지와 한 묶음. |
| R3 | 홈 그리드 비중 | 검색(full) → 지수(full, 3카드 가로) → 공포·탐욕+공시(`lg:grid-cols-2`, 약 2:3) → 수급예고(선택, full 최하단). | "깔끔"·정보 과밀 지양(PRD §3.2). 위에서 아래로 행동→시세→해석→미래 독해. |
| R4 | "준비 중" 클릭 동작 | 기본 **클릭 비활성 + tooltip**("엔진 연동 준비 중이에요"). `/analyze` 페이지는 살아있되 nav 동선은 막아 "준비 중" 일관. 커서 `not-allowed`. | PRD §3.3 — 페이지 무변경 유지 + "준비 중" 시각 일관. frontend-dev 가 "안내 후 진입" 으로 완화 원하면 협의(R4 단서). |
| R5 | 자산비중 시각화 | 현 막대 → **도넛**(주식=`asset-stock`/코인=`asset-coin`, 168px/22px) + 범례 칩. | PRD §3.1 "도넛 차트 재시각화 권장(디자이너 확정)". 자산 분류축이라 등락색 미사용. |
| R6 | 보유종목 테이블 모바일 | 좁으면 **종목명+수익률 우선, 평가액·비중 행 내 2줄 카드형 폴백** 허용(정렬 의미 유지). | mock 3종·전체 테이블 구조 유지(AC-2)하되 모바일 가독. |
| R7 | 게이지 배지 색 vs 이모지 | 게이지 색은 토큰(`fng-*`), PRD 이모지(🔵⚪🟠🔴)는 카피 일부(OS 렌더). 둘 다 텍스트 라벨이 정본 — 1:1 동일색 강제 안 함. | 이모지는 토큰 통제 불가. 색 정보는 보조축이므로 불일치 무해(WCAG 1.4.1). |

---

산출물: `docs/design/home-market-redesign.md`
