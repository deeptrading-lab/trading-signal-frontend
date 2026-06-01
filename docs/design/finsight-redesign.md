---
version: alpha
name: finsight-redesign
description: FinSight 브랜드 리디자인 — v7 rev2 (`design-tone-refinement`) 의 13 colors / 16 typography / 23 spacing / 3 rounded / 4 breakpoints / 48 components 토큰 셋을 base 로 두고 (a) **한국식 등락 의미 토큰** (`signal-up` red / `signal-down` blue + soft 페어), (b) **자산 식별 토큰** (`asset-stock` blue / `asset-coin` orange), (c) **AI 영역 그라데이션 토큰** (`gradient-ai-from` indigo → `gradient-ai-to` blue), (d) **Pretendard 폰트** 전면 교체 + `font-display` 신규, (e) **카드 셸 lg/xl 라운드** 와 **카드 padding/shadow** 토큰, (f) **사용처 룰 재할당** (info / critical / warn 의 의미 좁힘 + accent-vivid 의 primary CTA 한정) 을 흡수한다. 한국 개인 투자자 멘탈모델 (상승=빨강, 하락=파랑) + 주식 / 코인 멀티 자산 시각 위계 + AI 분석 영역의 브랜드 강조점을 한 시스템 안에 통합. WCAG AA 4.5:1 모든 합성 토큰 페어 무회귀. PRD `finsight-redesign` §3.1 + §5.2 AC-V8-1~11 충족.
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
  chart-macd: "#2563eb"
  chart-signal: "#f59e0b"
  chart-hist-up: "#16a34a"
  chart-hist-down: "#dc2626"
  chart-rsi: "#7c3aed"
  chart-ref-ob: "#dc2626"
  chart-ref-os: "#2563eb"
  chart-ref-mid: "#9ca3af"
  chart-vol-up: "#fca5a5"
  chart-vol-down: "#93c5fd"
  chart-down: "#2563eb"
typography:
  display:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.18
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

# finsight-redesign 디자인 가이드 (v8)

## Overview

본 v8 은 **FinSight** 브랜드의 전면 리디자인이다. 이전 버전 `design-tone-refinement` v7 rev2 (PR #25) 의 13 colors / 16 typography / 23 spacing / 3 rounded / 4 breakpoints / 48 components 토큰 셋을 base 로 두고, 한국 개인 투자자 멘탈모델 + 멀티 자산 (주식 / 코인) 시각 위계 + AI 분석 영역의 브랜드 강조점을 한 시스템 안에 통합한다. v7 rev2 의 톤 의도 ("산뜻한 흰색 캔버스 + 옅은 경계선 + 진한 본문 + 시그니처 정체성 영역 + 신호적 액션 채도") 는 무회귀로 보존하고, 다섯 축에서 의미 토큰을 추가한다.

**v8 의 변경 축 6가지**:

1. **한국식 등락 의미 토큰 도입** — `signal-up` `#c81e1e` (red-700) + `signal-up-soft` `#fee2e2` + `signal-down` `#1d4ed8` (blue-700) + `signal-down-soft` `#dbeafe`. 가격 변동·등락률·매수/매도 신호의 시각 표현 전용. 한국 금융 사용자의 멘탈모델 — 상승=빨강, 하락=파랑 — 을 시스템 레벨로 박는다.
2. **자산 식별 토큰 도입** — `asset-stock` `#1e40af` (blue-800) + `asset-stock-soft` `#dbeafe` + `asset-coin` `#c2410c` (orange-700) + `asset-coin-soft` `#ffedd5`. 주식·코인 멀티 자산 화면 (Home 의 토글 검색, Dashboard 의 보유 자산 카드, Watchlist 의 ticker 행) 에서 자산 종류를 시각 신호로 구분.
3. **AI 영역 그라데이션 토큰 도입** — `gradient-ai-from` `#4338ca` (indigo-700) + `gradient-ai-to` `#1d4ed8` (blue-700) + `gradient-ai-soft` `#eef2ff` (indigo-50). AI 분석 카드 (Home 의 AI 분석 hero, `/analyze` 의 결과 헤더) 의 indigo→blue 그라데이션 + 옅은 fill 배경.
4. **Pretendard 폰트 전면 교체** — 16 typography 토큰의 fontFamily 첫 항목을 모두 `Pretendard` 로 교체 (v7 rev2 의 `Arial` → `Pretendard, -apple-system, BlinkMacSystemFont, Arial`). 신규 `font-display` (Pretendard ExtraBold 800 / 36px) 토큰 추가. 한·영 혼용 가독성 정합.
5. **카드 셸 lg / xl 라운드 + 카드 padding 토큰** — `rounded.lg: 16px` + `rounded.xl: 24px` 신규. 시안의 카드 (`rounded-2xl p-4 md:p-6`) / hero 카드 (`rounded-3xl`) 정합. `spacing.card-px` / `card-py` / `card-px-mobile` / `card-py-mobile` / `hero-px` / `hero-py` 6 키 신규. `card` / `card-elevated` / `card-warn` / `card-critical` / `card-info` / `card-ai` / `card-hero` / `ticker-header` 합성 토큰의 rounded·padding cascade.
6. **사용처 룰 재할당** — `info` / `critical` / `warn` 의 의미 좁힘 + `accent-vivid` 의 primary CTA 한정. v7 rev2 의 사용 영역 룰 위에서 한 단계 더 정밀화. "충돌·재할당 prose" 절 참조.

**무회귀 강제** — v7 rev2 의 시각 언어 골격 (Signature Slate primary / 순백 surface / 옅은 border-line / 진한 text-strong / accent-vivid CTA / dropdown focus 페어 / 옅은 카드 외곽선 elevation) 모두 보존. spacing 23 키 / breakpoints 4 키 / 기존 components 48 키 무회귀 (rounded / padding cascade 만 갱신). v7 rev2 의 colors 15 키, typography 16 키 모두 hex / 사이즈 한 글자 변경 없음 (typography 는 fontFamily 만 Pretendard 로 교체). **v8 이 변경한 것은** (a) colors 15 → 26 키 (신규 11 키), (b) typography 16 → 17 키 (`font-display` 신규), (c) spacing 23 → 29 키 (카드 padding 6 키 신규), (d) rounded 3 → 5 키 (`lg` / `xl` 신규), (e) components 48 → 61 키 (`display-heading` / `card-hero` / `card-info` / `card-ai` / `badge-signal-up` / `badge-signal-down` / `badge-asset-stock` / `badge-asset-coin` / `signal-up-text` / `signal-down-text` / `ai-heading` / `bottom-nav` / `bottom-nav-item-active` 신규 13 키, 그 외 카드 합성 토큰의 rounded·padding cascade).

본 v8 는 PR2 의 base. PR1 (Tailwind v4 마이그레이션) 머지 직후 PR2 의 첫 commit 으로 들어간다. `npm run design:sync` 가 본 파일을 source 로 `tailwind.theme.json` 재생성 → `tailwind.config.ts` 의 어댑터가 흡수.

## Colors

본 v8 의 핵심 변경 축. v7 rev2 의 15 토큰 키 셋 (`primary`, `surface`, `surface-muted`, `border-line`, `text-strong`, `text-muted`, `accent-soft`, `accent-vivid`, `accent-vivid-soft`, `warn`, `warn-soft`, `info`, `info-soft`, `critical`, `critical-soft`) 을 hex 한 자 변경 없이 그대로 보존 + **신규 11 토큰** 추가. 토큰 키 셋: 15 → 26.

### 신규 11 토큰 요약

- **한국식 등락 의미 (4 키)** — `signal-up`, `signal-up-soft`, `signal-down`, `signal-down-soft`.
- **자산 식별 (4 키)** — `asset-stock`, `asset-stock-soft`, `asset-coin`, `asset-coin-soft`.
- **AI 영역 그라데이션 (3 키)** — `gradient-ai-from`, `gradient-ai-to`, `gradient-ai-soft`.

### 한국식 색 컨벤션 의도

한국 금융 사용자의 멘탈모델 — **상승=빨강, 하락=파랑**. 글로벌 컨벤션 (상승=green / 하락=red) 과 거꾸로 적용. 토스 / 카카오페이 / 한국투자증권 / 키움증권 / 미래에셋증권 등 한국 금융 서비스의 표준이며, 이 저장소의 사용자 (한국 개인 투자자) 의 시지각 정합. PRD §1.3 의 "한국 사용자 멘탈모델 불일치" 결함을 시스템 레벨로 해소한다.

신규 토큰 4 키 — `signal-up: "#c81e1e"` (red-700), `signal-up-soft: "#fee2e2"` (red-100), `signal-down: "#1d4ed8"` (blue-700), `signal-down-soft: "#dbeafe"` (blue-100). 가격 변동·등락률·매수/매도 신호의 시각 표현 전용. `signal-up` 의 hex 는 `#ef4444` (red-500) 권장값보다 한 단계 진한 red-700 (`#c81e1e`) 으로 결정 — surface 흰 배경에서 `#ef4444` 의 대비비가 3.76:1 (AA 미달) 이고, `#c81e1e` 가 5.94:1 (AA 마진 +32%) 안전. 텍스트로 사용되는 등락률 / 신호 라벨이 WCAG AA 4.5:1 강제 통과해야 함. soft 페어 `#fee2e2` 는 red-100 그대로 (chip 배경 / hover fill 용).

`signal-down: "#1d4ed8"` (blue-700) 는 v7 rev2 의 `accent-vivid` 와 동일한 hex 다. 의도적으로 같은 톤을 공유한다 — 액션 신호 (accent-vivid 의 CTA) 와 하락 신호 (signal-down 의 등락) 모두 사용자에게 "신호적 파랑" 으로 인식되며, 화면 안 두 색이 동시에 등장해도 사용 컨텍스트 (CTA 버튼 vs 등락률 숫자) 가 명확히 분리되므로 시각 충돌 0. 단 의미 단위가 다르므로 별도 토큰 키로 박는다 — frontend-dev 가 `bg-accent-vivid` 와 `text-signal-down` 을 다른 호출처에 호출해야 reviewer 가 사용처를 추적 가능.

### 자산 식별 색 의도

주식 = **blue (안정·신뢰)**, 코인 = **orange (활기·변동성)**. 한국 + 글로벌 자산 분류의 시지각 컨벤션 — 주식은 기관·법정 통화·전통 금융의 청색 톤, 코인은 활기·변동성·신흥 자산의 주황 톤. 시안 (`Stock and Coin Analysis App/`) 의 자산별 색 코딩 의도 정합.

신규 토큰 4 키 — `asset-stock: "#1e40af"` (blue-800), `asset-stock-soft: "#dbeafe"` (blue-100), `asset-coin: "#c2410c"` (orange-700), `asset-coin-soft: "#ffedd5"` (orange-100). `asset-stock` 의 hex 는 권장값 `#3b82f6` (blue-500) 보다 한 단계 더 진한 blue-800 으로 결정 — surface 흰 배경 대비 8.59:1 (AA 마진 +91%) + `asset-stock-soft` 페어 대비 7.21:1 (AA 마진 +60%) 안전. `asset-coin` 도 권장값 `#f97316` (orange-500) 보다 진한 orange-700 으로 결정 — surface 대비 4.91:1 (AA 마진 +9%) + `asset-coin-soft` 페어 대비 4.62:1 (AA 마진 +3%) 안전.

자산 식별 토큰의 사용처는 **자산 라벨·아이콘 배경·테두리 한정** — Home 의 토글 검색 버튼 ("주식" / "코인" 탭), Dashboard 의 보유 자산 카드의 자산 종류 아이콘 / 배지, Watchlist 의 ticker 행 좌측 자산 색 막대, Market 의 섹터 카테고리. 본문 텍스트나 등락률 숫자에는 사용 금지 — 등락률은 `signal-up` / `signal-down` 영역.

### AI 영역 그라데이션 의도

AI = **indigo → blue 그라데이션 (브랜드 색)**. AI 분석 카드 (Home 의 AI 분석 hero, `/analyze` 의 결과 헤더 strip, Dashboard 의 AI 추천 영역) 의 시각 강조점. 시안 (`Stock and Coin Analysis App/AnalysisDashboard.tsx`) 의 AI 영역 그라데이션 정합.

신규 토큰 3 키 — `gradient-ai-from: "#4338ca"` (indigo-700), `gradient-ai-to: "#1d4ed8"` (blue-700), `gradient-ai-soft: "#eef2ff"` (indigo-50). 권장값 indigo-600 (`#4f46e5`) 대신 indigo-700 (`#4338ca`) 결정 — `gradient-ai-from` 이 텍스트로 사용될 때 (예: `card-ai.textColor`) gradient-ai-soft 배경 대비 8.85:1 (AA 마진 +97%) 안전. `gradient-ai-to` 는 blue-700 (`#1d4ed8`) 으로 `accent-vivid` / `signal-down` 과 동일 hex 공유 — 그라데이션 끝점이 액션 신호 / 하락 신호의 청색 톤과 자연 연속, 화면 안 시각 통일감.

그라데이션 호출 방식 — Tailwind `bg-gradient-to-r from-gradient-ai-from to-gradient-ai-to` 또는 `from-gradient-ai-from/10 to-gradient-ai-to/10` 옅은 fill 활용. CSS `background-image: linear-gradient(...)` 직접 호출 시 hex 직타 금지 — frontend-dev 는 Tailwind 토큰 호출만.

### 충돌·재할당 prose 단락 (사용처 룰)

v8 신규 토큰이 기존 토큰과 hue 가 겹치는 영역의 사용처 룰 명시. 세 충돌 그룹.

**blue 계열 — `signal-down` / `asset-stock` / `info` / `accent-vivid` 4 토큰 모두 청색**:

- `signal-down` (#1d4ed8) — **수치·등락률만**. 등락률 텍스트, 매도 신호 라벨, 가격 차트의 하락 라인. 호출처는 `signal-down-text` 합성 토큰 + Tailwind `text-signal-down` / `bg-signal-down-soft` 클래스.
- `asset-stock` (#1e40af) — **자산 라벨·아이콘 배경만**. Home 토글의 "주식" 탭 active 상태, Watchlist 행의 주식 아이콘 배지, Dashboard 의 주식 보유 자산 카드 좌측 마커. 호출처는 `badge-asset-stock` 합성 토큰.
- `info` (#1c4fd1) — **알림·tooltip·info 배지만**. PR #25 의 `info` 무회귀. `badge-info`, `card-info`, `input-helper` (info 톤이 필요할 때), `price-bar-entry` 마커. 등락률 / 자산 라벨에는 사용 금지.
- `accent-vivid` (#1d4ed8) — **primary CTA + dropdown focus만**. PR #25 의 사용 영역 룰 무회귀 + v8 에서 추가로 좁힘. `button-primary` / `button-primary-disabled` / `search-result-item-focus` / `search-result-item-focus-meta` / `bottom-nav-item-active` 합성 토큰 한정. 일반 강조 텍스트나 link 에는 사용 금지 — 강조가 필요하면 `text-strong` + body-strong typography, 또는 `info` (정보 컨텍스트).

**red 계열 — `signal-up` / `critical` / `warn` 3 토큰 모두 빨강·주황 계열**:

- `signal-up` (#c81e1e) — **등락 + 매수 신호만**. 등락률 텍스트, 매수 신호 라벨, 가격 차트의 상승 라인. 호출처는 `signal-up-text` 합성 토큰 + Tailwind `text-signal-up` / `bg-signal-up-soft` 클래스. 채도가 높은 vivid red.
- `critical` (#8e1717) — **오류·실패·치명적 경고만**. PR #25 의 `critical` 무회귀. `card-critical`, `badge-critical`, `input-error`, `input-helper-error`, `price-bar-stop` 마커. 등락률에는 사용 금지 — 등락은 `signal-up` 영역. 채도가 낮은 진한 dark red.
- `warn` (#a14a06) — **주의·경고만 (오류 미만)**. PR #25 의 `warn` 무회귀. `card-warn`, `badge-warn`. 등락 / 오류와는 명확히 분리되는 주황 톤. 채도가 중간 정도의 burnt orange.

세 빨강 계열 토큰의 시각 차이 — `signal-up` 은 채도 높은 vivid red (HSL `0°, 74%, 45%`), `critical` 은 채도 낮은 진한 dark red (HSL `0°, 71%, 32%`), `warn` 은 burnt orange (HSL `26°, 93%, 32%`). 세 토큰이 한 화면에 동시 등장 시에도 hue / saturation / lightness 의 시각 차이로 의미 단위 구분.

**기존 `accent-vivid` (#1d4ed8) — primary CTA + dropdown focus 한정**:

v7 rev2 가 `accent-vivid` 를 도입했을 때의 사용처는 CTA 버튼 + dropdown focus + focus ring + 가능 시 link 강조 4 영역이었다. v8 은 link 강조 영역을 제거 — 일반 텍스트 link 가 필요하면 `info` 또는 `text-strong` + underline 사용. 강조 link 가 정말 필요하면 디자이너 협의 후 별도 `link` 합성 토큰 도입 (본 v8 미정의). 결과 — `accent-vivid` 의 cascade 는 `button-primary` / `button-primary-disabled` / `search-result-item-focus` / `search-result-item-focus-meta` / `bottom-nav-item-active` 5 합성 토큰 한정. 자산 식별 토큰 (`asset-stock`) 과의 시각 충돌 회피 — `asset-stock` 은 자산 라벨, `accent-vivid` 는 액션 신호.

**차트 지표 색 토큰 (`chart-*` 11 키) — StockDailyChart 가격·거래량·MACD·RSI 서브플롯 전용**:

차트 캔버스의 지표 라인·기준선·거래량 봉 색을 `components/profile/chart/chartTheme.ts` 의 hex 직타에서 토큰 참조로 이관하기 위한 11 키. **값 보존(value-preserving) 등록** — 기존 차트가 쓰던 hex 를 한 자도 바꾸지 않고 그대로 토큰화한다. 팔레트 재설계가 아니라 코드 hex 직타 제거가 목적이므로 시각 회귀 0. 신규 키: `chart-macd` `#2563eb` (MACD 라인 파랑), `chart-signal` `#f59e0b` (MACD 시그널 라인 앰버), `chart-hist-up` `#16a34a` / `chart-hist-down` `#dc2626` (MACD 히스토그램 부호별 초록/빨강), `chart-rsi` `#7c3aed` (RSI 라인 보라), `chart-ref-ob` `#dc2626` / `chart-ref-os` `#2563eb` / `chart-ref-mid` `#9ca3af` (RSI 과매수 70·과매도 30·중립 50 기준선 빨강/파랑/회색), `chart-vol-up` `#fca5a5` / `chart-vol-down` `#93c5fd` (거래량 봉 상승/하락 연빨강/연파랑), `chart-down` `#2563eb` (하락 캔들·라인 파랑).

**의도적 동일 hex 별도 토큰** — `chart-macd` = `chart-ref-os` = `chart-down` = `#2563eb`, `chart-hist-down` = `chart-ref-ob` = `#dc2626` 으로 값이 겹치지만 역할(MACD 라인 / RSI 과매도선 / 하락 캔들, MACD 히스토그램 음수 / RSI 과매수선)이 달라 별도 키로 박는다. v8 의 `gradient-ai-to` = `accent-vivid` = `signal-down` (동일 `#1d4ed8`, 의미 단위 분리) 선례와 동일 철학 — 추후 차트 색 재조정 시 역할별 독립 변경 가능. 차트의 상승색은 기존 `signal-up` `#c81e1e` 재사용, 축 눈금 `text-muted` / 그리드 `border-line` / 툴팁 텍스트 `text-strong` 재사용으로 신규 키 불필요. 툴팁 배경은 rgba 투명색이라 토큰화 제외(코드 리터럴 유지). `chart-*` 토큰은 차트 캔버스(데이터 시각화) 전용 — 본문 텍스트·등락률·배지에는 사용 금지(등락은 `signal-up` / `signal-down`, 자산은 `asset-*` 영역).

### 신·구 팔레트 비교 표 (v7 rev2 → v8)

v7 rev2 의 15 키는 모두 hex 무회귀 (변경 없음). v8 신규 11 키 추가. 표 칼럼은 v7 rev2 hex → v8 hex / 신규 추가 / 사용처 갱신. 총 15 행 (v7 rev2 무회귀 4 행 + v8 신규 11 행).

| 토큰 키 | v7 rev2 hex | v8 hex | 분류 | 사용처 갱신 |
|---|---|---|---|---|
| `primary` | `#1f3b4d` | `#1f3b4d` (무변경) | v7 무회귀 | navbar wordmark / sidebar-item-active / favorite-toggle-active / button-secondary / badge-accent / price-bar-target 그대로. |
| `accent-vivid` | `#1d4ed8` | `#1d4ed8` (무변경) | v7 무회귀 | **사용처 좁힘** — link 강조 영역 제거. button-primary + dropdown focus + bottom-nav-item-active 5 합성 토큰 한정. |
| `info` | `#1c4fd1` | `#1c4fd1` (무변경) | v7 무회귀 | **사용처 좁힘** — 알림 / tooltip / badge-info / card-info / price-bar-entry 한정. 하락 의미는 신규 `signal-down` 으로 분리. |
| `critical` | `#8e1717` | `#8e1717` (무변경) | v7 무회귀 | **사용처 좁힘** — 오류·실패·치명적 경고만. 등락 의미는 신규 `signal-up` 으로 분리. |
| `signal-up` | — | `#c81e1e` (신규) | v8 신규 | 상승 / 매수 신호 / 가격 상승 라인. red-700. WCAG AA × surface 5.94:1 + × signal-up-soft 5.42:1. |
| `signal-up-soft` | — | `#fee2e2` (신규) | v8 신규 | 상승 배경 chip + hover fill. red-100. badge-signal-up.backgroundColor. |
| `signal-down` | — | `#1d4ed8` (신규) | v8 신규 | 하락 / 매도 신호 / 가격 하락 라인. blue-700. `accent-vivid` 와 hex 동일 — 의미 단위 다름. WCAG AA × surface 6.70:1. |
| `signal-down-soft` | — | `#dbeafe` (신규) | v8 신규 | 하락 배경 chip + hover fill. blue-100. badge-signal-down.backgroundColor. |
| `asset-stock` | — | `#1e40af` (신규) | v8 신규 | 주식 자산 식별 라벨·아이콘. blue-800. WCAG AA × surface 8.59:1 + × asset-stock-soft 7.21:1. |
| `asset-stock-soft` | — | `#dbeafe` (신규) | v8 신규 | 주식 자산 칩 배경. blue-100. badge-asset-stock.backgroundColor. `signal-down-soft` 와 hex 동일 — 의미 단위 다름. |
| `asset-coin` | — | `#c2410c` (신규) | v8 신규 | 코인 자산 식별 라벨·아이콘. orange-700. WCAG AA × surface 4.91:1 + × asset-coin-soft 4.62:1. |
| `asset-coin-soft` | — | `#ffedd5` (신규) | v8 신규 | 코인 자산 칩 배경. orange-100. badge-asset-coin.backgroundColor. |
| `gradient-ai-from` | — | `#4338ca` (신규) | v8 신규 | AI 영역 그라데이션 시작점. indigo-700. WCAG AA × surface 8.34:1 + × gradient-ai-soft 8.85:1. |
| `gradient-ai-to` | — | `#1d4ed8` (신규) | v8 신규 | AI 영역 그라데이션 끝점. blue-700. `accent-vivid` / `signal-down` 과 hex 동일 — 의미 단위 다름. |
| `gradient-ai-soft` | — | `#eef2ff` (신규) | v8 신규 | AI 카드 배경 옅은 fill. indigo-50. card-ai.backgroundColor + ai-heading.backgroundColor. |

**요약** — v7 rev2 의 15 키 중 `primary` / `accent-vivid` / `info` / `critical` 4 키의 사용처는 좁혀졌으나 hex 무변경. 신규 11 키는 의미 단위가 명확한 토큰 셋. 총 15 → 26 키.

### WCAG AA 4.5:1 대비비 표 (v8 신규 토큰 포함)

주요 (foreground × background) 페어 16건 (v7 rev2 의 7건 + v8 신규 9건). **모든 쌍이 4.5:1 이상이며, AA 마진 충분**.

| Foreground × Background (사용처 예) | 비율 | AA 마진 | 4.5:1 |
|---|---|---|---|
| `text-strong` × `surface` (본문 / 페이지) | 18.51:1 | +311% | OK |
| `text-muted` × `surface` (caption / sidebar-section-header) | 6.00:1 | +33% | OK |
| `text-muted` × `surface-muted` (input-suffix / sidebar-empty) | 5.63:1 | +25% | OK |
| `primary` × `accent-soft` (sidebar-item-active / badge-accent) | 10.21:1 | +127% | OK |
| `surface` × `accent-vivid` (button-primary 의 흰 텍스트 / vivid 배경) | 6.70:1 | +49% | OK |
| `accent-vivid` × `accent-vivid-soft` (search-result-item-focus) | 5.49:1 | +22% | OK |
| `critical` × `critical-soft` (card-critical / badge-critical) | 7.45:1 | +66% | OK |
| `signal-up` × `surface` (등락률 상승 텍스트 / 페이지) | 5.94:1 | +32% | OK |
| `signal-up` × `signal-up-soft` (badge-signal-up) | 5.42:1 | +20% | OK |
| `signal-down` × `surface` (등락률 하락 텍스트 / 페이지) | 6.70:1 | +49% | OK |
| `signal-down` × `signal-down-soft` (badge-signal-down) | 5.49:1 | +22% | OK |
| `asset-stock` × `surface` (주식 라벨 / 페이지) | 8.59:1 | +91% | OK |
| `asset-stock` × `asset-stock-soft` (badge-asset-stock) | 7.21:1 | +60% | OK |
| `asset-coin` × `surface` (코인 라벨 / 페이지) | 4.91:1 | +9% | OK |
| `asset-coin` × `asset-coin-soft` (badge-asset-coin) | 4.62:1 | +3% | OK |
| `gradient-ai-from` × `gradient-ai-soft` (card-ai / ai-heading 텍스트 × 배경) | 8.85:1 | +97% | OK |

**해석** — v8 신규 토큰 9 페어 모두 4.5:1 통과. 최저 마진은 `asset-coin` × `asset-coin-soft` 4.62:1 (+3% 마진) — orange 계열 페어가 WCAG 채도 분포상 가장 빠듯하나 안전 마진 내. `asset-coin` 권장값 `#f97316` (orange-500) × `#ffedd5` = 3.07:1 (AA 미달) 이라 한 단계 진한 orange-700 (`#c2410c`) 으로 결정. PRD §5.2 AC-V8-7 충족 (≥14 페어, 모두 4.5:1 이상).

## Typography

v7 rev2 의 16 키 무수정 계승 (사이즈 / 굵기 / line-height / letterSpacing / fontFeature 모두 무변경) + **fontFamily 첫 항목만 `Arial` → `Pretendard, -apple-system, BlinkMacSystemFont, Arial` 로 교체** + **신규 `font-display` 1 키** 추가. 총 16 → 17 키.

### Pretendard 도입 의도

한글·영문 동등 가독성. 현 `Arial` fallback 대체. `next/font/local` + Korean-Hangul / Latin subset 으로 self-host. PRD §9 q6 RESOLVED — 옵션 B (`next/font/local` self-host) 채택.

Pretendard 는 한국어·라틴 알파벳·숫자가 동일한 시각 무게를 가져 본 저장소처럼 한글 본문 + 영문 ticker / 숫자 혼용이 잦은 화면에서 시지각 균형 강하다. 본 저장소 v7 rev2 까지의 `Arial` fallback 은 한글 부분만 OS-fallback (Apple SD Gothic Neo / Malgun Gothic 등) 으로 흘러가 한글·영문 부분의 굵기·자간이 미세하게 다르게 렌더되는 잔여 위계 깨짐이 있었다. Pretendard 로 통일하면 두 언어가 한 폰트 안에서 동일 굵기·자간으로 렌더 — FinSight 브랜드의 시각 통일감 강화.

**한·영 혼용 가독성 prose** — Pretendard 의 letter-spacing 은 일반 sans-serif 보다 살짝 좁아 한글 자간이 자연 균형. 본 v8 의 typography 토큰 16 키 중 letterSpacing 명시는 `nav-brand` (-0.01em) / `sidebar-section` (0.04em) / `font-display` (-0.02em) 3 키. Pretendard 의 기본 자간이 한글·영문 모두 균형이라 그 외 토큰은 letterSpacing 0 (브라우저 기본). 행간 (line-height) 은 v7 rev2 그대로 — 본문 1.5~1.55, 헤더 1.2, 라벨 1.25. 한글의 세로 점유가 라틴보다 살짝 크므로 1.5 이상의 line-height 가 한·영 혼용에서 줄 사이 호흡 안전.

**fallback 시 layout shift 방지** — `next/font/local` 의 `display: 'swap'` + `adjustFontFallback: true` (Next.js 14+) 가 폰트 로드 전 fallback (`-apple-system` / `BlinkMacSystemFont`) 의 size-adjust 를 자동 계산해 CLS (Cumulative Layout Shift) 0 에 가까이 흡수. CDN 채택 시 발생 가능한 FOUT (Flash Of Unstyled Text) 거의 없음. 폰트 파일은 Pretendard subset (Korean-Hangul + Latin 두 subset 의 woff2 자료) ~100KB 안에서 흡수.

**임포트 방식 (PRD §9 q6 RESOLVED)** — `next/font/local` 호출 패턴:

```ts
import localFont from 'next/font/local'

export const pretendard = localFont({
  src: [
    { path: './pretendard-regular.woff2', weight: '400', style: 'normal' },
    { path: './pretendard-bold.woff2', weight: '700', style: 'normal' },
    { path: './pretendard-extrabold.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-pretendard',
  display: 'swap',
  adjustFontFallback: 'Arial',
})
```

`tailwind.theme.json` 의 fontFamily 값 (`Pretendard, -apple-system, BlinkMacSystemFont, Arial`) 이 그대로 Tailwind utility (`font-display` 등) 로 호출. frontend-dev 핸드오프 영역 — PR2 의 FE 영역에서 `app/layout.tsx` 에 `<html className={pretendard.variable}>` 주입.

### 신규 `font-display` (Pretendard ExtraBold 800)

`font-display: 36px / 800 / 1.12 / letterSpacing -0.02em` — display heading 전용 Pretendard variant. Home 의 hero 카드 ("종목 분석"), Dashboard 의 포트폴리오 hero ("총 자산"), `/analyze` 의 결과 헤더 ("AAPL 분석 결과") 등 화면 최상단의 brand-impact heading. 기존 `display` (30px / 700) 보다 한 단계 더 큰 36px / 800 ExtraBold + 더 좁은 자간 (-0.02em) 으로 시각 임팩트 강화.

사용처는 **화면 한 곳 1회 원칙** — 한 라우트 안에서 1개 hero heading 만 `font-display` 사용. 그 외 헤딩은 기존 `display` / `h1` / `h2` 사용. 시안 (`Stock and Coin Analysis App/AnalysisDashboard.tsx`) 의 hero 영역 패턴 정합.

### 기존 16 키 (사이즈·굵기·line-height 무회귀)

`display` (30px / 700 / 1.18), `h1` (22px / 700 / 1.2), `h2` (17px / 700 / 1.35), `body-md` (16px / 400 / 1.55), `body-sm` (14px / 400 / 1.5), `body-sm-strong` (14px / 700 / 1.35), `body-strong` (16px / 700 / 1.5), `caption` (12px / 400 / 1.4), `button` (15px / 700 / 1.2), `button-sm` (13px / 700 / 1.2), `badge` (13px / 700 / 1.2), `mono-numeric` (15px / 700 / 1.2 / tnum), `nav-brand` (16px / 700 / 1.2 / -0.01em), `sidebar-section` (12px / 700 / 1.2 / 0.04em), `label-sm` (13px / 700 / 1.25), `input-suffix` (13px / 400 / 1.2 / tnum) — 모두 v7 rev2 그대로. fontFamily 만 Pretendard 로 cascade.

`mono-numeric` 의 `fontFeature: tnum` 은 Pretendard 의 OpenType tabular-nums feature 활성 — 등락률·가격·수량 같은 숫자가 자릿수 별 폭 동일로 렌더되어 표·라인 위계 정렬. Pretendard 는 tnum feature 지원.

## Layout

v7 rev2 의 layout 가이드 전체 무수정 계승 + v8 의 **카드 padding 6 키 신규** + **bottom nav 합성 토큰 2 키 신규** 추가. 3-section shell (navbar 60px + sidebar 264px + main), 데스크탑·태블릿·모바일 정책, drawer slide-in 모두 v7 rev2 그대로.

### v8 spacing 신규 — 카드 셸 padding 토큰 6 키

시안 (`Stock and Coin Analysis App/`) 의 카드 셸 패턴 `bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm` 을 토큰화.

- **`card-px: 20px` / `card-py: 20px`** — 데스크탑 카드 (lg 이상) 의 좌우·상하 padding. 시안의 `md:p-6` (24px) 보다 살짝 컴팩트한 20px — 본 저장소의 정보 밀도 우선 톤 정합.
- **`card-px-mobile: 16px` / `card-py-mobile: 16px`** — 모바일 (md 미만) 카드 padding. 시안의 `p-4` (16px) 정합. `card-critical` / `card-info` 처럼 정보 위계 2순위 카드는 모바일·데스크탑 모두 16px 사용 (컴팩트).
- **`hero-px: 24px` / `hero-py: 24px`** — hero 카드 (`card-hero` / `card-ai`) 의 좌우·상하 padding. 시안의 `rounded-3xl p-6 md:p-8` 정합. 화면 최상단의 brand-impact 카드에서 호흡 강화.

frontend-dev 호출 패턴 — `<div className="card-base px-card-px py-card-py">` (또는 `@apply` 합성 토큰 `card`).

### v8 rounded 신규 — `lg` / `xl`

- **`rounded.lg: 16px`** — 카드 셸 라운드. 시안의 `rounded-2xl` (16px) 정합. `card` / `card-elevated` / `card-warn` / `card-critical` / `card-info` / `ticker-header` / `ai-heading` 합성 토큰의 rounded cascade.
- **`rounded.xl: 24px`** — hero 카드 라운드. 시안의 `rounded-3xl` (24px) 정합. `card-hero` / `card-ai` 합성 토큰 한정. 화면 최상단의 brand-impact 카드에서 시각 강조.

`rounded.sm: 8px` (input / button / badge / dropdown panel 일부), `rounded.md: 12px` (drawer / dropdown-panel), `rounded.pill: 999px` (badge / favorite-toggle / price-bar) 모두 v7 rev2 무회귀.

### Layout 반응형 정책 — 모바일 / 태블릿 / 데스크탑

PRD §3.3 의 6 라우트 정합. `breakpoints` 4 키 (`sm: 640` / `md: 768` / `lg: 1024` / `xl: 1280`) 무회귀. Tailwind 기본 정합.

- **모바일 (< 768)** — sidebar 숨김 + bottom nav 6 메뉴 노출. main-area 가 viewport 전체 너비. 카드는 `card-px-mobile` / `card-py-mobile` (16px). 12-col grid 미사용 — 카드 vertical stack. `font-display` 의 사이즈는 모바일에서 28px 로 줄임 (frontend-dev 가 `text-2xl md:text-4xl` 분기).
- **태블릿 (768 ~ 1023)** — sidebar 숨김 + bottom nav 유지 + drawer 토글 (햄버거 메뉴). main-area 가 viewport 전체 너비. 카드 padding 데스크탑 적용 (`card-px` / `card-py` 20px). 12-col grid 사용.
- **데스크탑 (≥ 1024)** — sidebar 노출 (264px 고정) + bottom nav 숨김. main-area 가 `main-max-w: 1152px` 안에서 12-col grid. 카드 padding 데스크탑 (`card-px` / `card-py` 20px). hero 카드는 `hero-px` / `hero-py` 24px.

컨테이너 최대 너비 — `spacing.main-max-w: 1152px` v7 rev2 무회귀. `xl` (1280) 이상에서도 main-area 는 1152px 안에서 centering — 와이드 모니터에서도 정보 밀도 일관.

### bottom nav 합성 토큰 2 키 신규

모바일 6 메뉴 진입을 위한 bottom nav 합성 토큰 — `bottom-nav` (배경 surface + height navbar-h 60px) + `bottom-nav-item-active` (active 메뉴 텍스트 `accent-vivid`). frontend-dev 가 PR3 의 layout shell 구현 시 호출.

### v7 rev2 spacing 무회귀 절

`xs` / `sm` / `md` / `lg` / `xl` / `2xl` / `navbar-h` / `sidebar-w` / `drawer-w` / `main-max-w` / `input-h` / `input-px` / `input-py` / `input-pr-suffix` / `input-pr-suffix-sm` / `input-pr-suffix-md` / `input-pr-suffix-lg` / `dropdown-item-h` / `dropdown-item-py` / `dropdown-item-gap` / `button-primary-h` / `button-sm-h` / `hit-area-min` 23 키 한 글자 변경 없음. 총 23 → 29 키 (카드 padding 6 키 신규).

## Elevation & Depth

v7 rev2 의 평면 디자인 기조 **무회귀**. navbar / sidebar / 카드는 그림자 없음, drawer 만 단일 그림자, dropdown-panel 도 그림자 없음. v8 는 elevation 정책에 손대지 않는다.

다만 **카드 라운드 lg (16px) / xl (24px) cascade 가 elevation 인지에 미세하게 작용** — 카드 라운드가 8px (v7 rev2) → 16px / 24px (v8) 로 커지면서 카드가 페이지 위에 더 부드럽게 "녹아드는" 느낌. 시안 (`Stock and Coin Analysis App/`) 의 토스·카카오페이 톤 정합. 옅은 border-line + 큰 라운드의 조합이 그림자 없이도 elevation 위계 표현.

## Shapes

v7 rev2 의 3 키 (`rounded.sm` 8px, `rounded.md` 12px, `rounded.pill` 999px) **무회귀** + v8 신규 2 키 (`rounded.lg` 16px, `rounded.xl` 24px). 총 3 → 5 키.

사용처 룰 — `rounded.sm` (input / button / badge / search-result-item 등 컴포넌트 단위), `rounded.md` (drawer / dropdown-panel 같은 중간 컨테이너), `rounded.lg` (카드 셸 — card / card-elevated / card-warn / card-critical / card-info / ticker-header), `rounded.xl` (hero 카드 — card-hero / card-ai), `rounded.pill` (배지 / 토글 / price-bar).

라운드 cascade 의 시각 효과 — 시안의 카드 톤 정합으로 화면 전체가 더 부드럽고 친근한 인상. 트레이딩 도구의 기관 톤 ≠ FinSight 의 개인 투자자 친화 톤. 라운드 차이가 두 톤의 핵심 분기점.

## Components

v7 rev2 의 48 합성 토큰을 base 로 두고 (a) **카드 합성 토큰의 rounded·padding cascade** (lg / xl + card-px / card-py / hero-px / hero-py), (b) **v8 신규 13 합성 토큰** 추가. 총 48 → 61 키.

### v8 신규 합성 토큰 13 키

- **`display-heading`** — `font-display` (Pretendard ExtraBold 800 / 36px) 사용 hero heading. textColor text-strong.
- **`card-hero`** — hero 카드 셸 (rounded.xl + hero-px). Home / Dashboard / `/analyze` 의 화면 최상단.
- **`card-info`** — info 톤 카드 (info-soft 배경 + info 텍스트 + rounded.lg). 알림 / tooltip / info 영역.
- **`card-ai`** — AI 영역 카드 (gradient-ai-soft 배경 + gradient-ai-from 텍스트 + rounded.xl + hero-px). Home 의 AI 분석 hero / `/analyze` 의 결과 헤더.
- **`badge-signal-up`** — 등락 상승 배지 (signal-up-soft 배경 + signal-up 텍스트).
- **`badge-signal-down`** — 등락 하락 배지 (signal-down-soft 배경 + signal-down 텍스트).
- **`badge-asset-stock`** — 주식 자산 배지 (asset-stock-soft 배경 + asset-stock 텍스트).
- **`badge-asset-coin`** — 코인 자산 배지 (asset-coin-soft 배경 + asset-coin 텍스트).
- **`signal-up-text`** — 등락 상승 텍스트 (signal-up 텍스트 + mono-numeric typography). 가격 변동률·등락 라벨.
- **`signal-down-text`** — 등락 하락 텍스트 (signal-down 텍스트 + mono-numeric typography).
- **`ai-heading`** — AI 영역 안 heading (gradient-ai-soft 배경 + gradient-ai-to 텍스트 + h1 typography + rounded.lg).
- **`bottom-nav`** + **`bottom-nav-item-active`** — 모바일 bottom nav 셸 + active 메뉴.

### 카드 합성 토큰의 rounded·padding cascade

v7 rev2 의 `card` / `card-elevated` / `card-warn` / `card-critical` / `ticker-header` 가 모두 `rounded.sm` (8px) + `padding: 16px` 또는 `padding: 12px` 였다. v8 에서 다음 cascade.

- `card` — rounded sm (8px) → lg (16px), padding 16px → card-px (20px).
- `card-elevated` — rounded sm (8px) → lg (16px), padding 20px → card-px (20px) (변경 없음).
- `card-warn` — rounded sm (8px) → lg (16px), padding 16px → card-px (20px).
- `card-critical` — rounded sm (8px) → lg (16px), padding 12px → card-px-mobile (16px) (정보 위계 2순위 → 모바일 padding 유지).
- `ticker-header` — rounded sm (8px) → lg (16px), padding 14px → 14px (직접 px 유지 — `/analyze` 결과 헤더의 v7 rev2 시각 톤 무회귀).

`card-ai` / `card-hero` 신규는 rounded.xl (24px) + hero-px (24px).

### AI 영역 그라데이션 호출 (frontend-dev 핸드오프)

`card-ai` 합성 토큰의 backgroundColor 는 `gradient-ai-soft` (`#eef2ff`) 단색 fill. 그라데이션 효과는 별도 Tailwind utility 호출 — frontend-dev 가 `<div className="card-ai bg-gradient-to-br from-gradient-ai-from to-gradient-ai-to text-white">` 패턴으로 hero 영역 그라데이션 표현. 합성 토큰의 단색 fallback 이 그라데이션 실패 시에도 시각 cascade 보장.

`ai-heading` 합성 토큰은 단색 fill (`gradient-ai-soft` 배경 + `gradient-ai-to` 텍스트) 로 AI 영역 안 sub-heading 호출.

### dropdown / search-result-item cascade (v7 rev2 무회귀)

v7 rev2 의 dropdown 옵션 항목 2줄 콘텐츠 수용 (라벨 `body-sm-strong` + 메타 `caption` + dropdown-item-gap 2px + dropdown-item-h 52px) 모두 v8 무회귀. typography 의 fontFamily 가 Pretendard 로 cascade 되면 한글 옵션 라벨 (예: "삼성전자 · 005930") 의 가독성 향상.

### Signature Slate primary 사용 영역 (v7 rev2 무회귀)

`navbar-brand` / `sidebar-item-active` / `favorite-toggle-active` / `badge-accent` / `button-secondary` / `button-secondary-hover` / `price-bar-target` 등 7 합성 토큰의 primary Slate 무회귀. v8 신규 토큰이 침범하지 않음.

### accent-vivid 사용 영역 (v7 rev2 무회귀 + v8 추가)

`button-primary` / `button-primary-disabled` / `search-result-item-focus` / `search-result-item-focus-meta` 4 v7 rev2 무회귀 + `bottom-nav-item-active` 1 신규. 총 5 합성 토큰. PRD §5.2 AC-V8-5 의 사용처 좁힘 정합.

## Do's and Don'ts

v7 rev2 의 Do's and Don'ts 전체 무회귀. v8 가 추가하는 항목.

### v8 신규 — 한국식 등락 + 자산 식별 + AI 그라데이션 시각 룰

- ✅ 등락률·매수/매도 신호는 **`signal-up` (red) + `signal-down` (blue)** — 한국식 컨벤션. 글로벌 컨벤션 (상승=green / 하락=red) 절대 도입 금지.
- ✅ 자산 종류 식별은 **`asset-stock` (blue) + `asset-coin` (orange)** — Home 토글 / Dashboard 카드 / Watchlist 행 / Market 섹터. 라벨 / 아이콘 배경 / 테두리 한정.
- ✅ AI 영역 (Home 의 AI 분석, `/analyze` 의 결과 헤더, Dashboard 의 AI 추천) 은 **`gradient-ai-from` → `gradient-ai-to` 그라데이션** 또는 `card-ai` 합성 토큰. 단색 fill 도 `gradient-ai-soft` 배경 한정.
- ✅ 카드 셸 라운드는 **`rounded.lg` (16px)**, hero 카드는 **`rounded.xl` (24px)**. `rounded.sm` (8px) 은 input / button / badge 한정.
- ✅ 모든 텍스트는 **Pretendard** 폰트 fontFamily. `Arial` 직접 호출 0건. `next/font/local` 통한 self-host.
- ✅ 카드 padding 은 **`card-px` / `card-py` (20px)** — 데스크탑. 모바일은 **`card-px-mobile` / `card-py-mobile` (16px)**. hero 카드는 **`hero-px` / `hero-py` (24px)**.

### v8 신규 — 충돌·재할당 금지 룰

- ❌ `signal-up` / `signal-down` 을 **자산 식별** 에 사용 금지. 자산은 `asset-stock` / `asset-coin` 영역.
- ❌ `asset-stock` / `asset-coin` 을 **등락률** 에 사용 금지. 등락은 `signal-up` / `signal-down` 영역.
- ❌ `info` 를 **하락 신호** 에 사용 금지 (v7 rev2 까지 일부 호출처 잔존 가능). 하락은 `signal-down` 영역. `info` 는 알림 / tooltip / badge-info / price-bar-entry 한정.
- ❌ `critical` 을 **상승 등락률** 에 사용 금지. 상승은 `signal-up` 영역. `critical` 은 오류 / 실패 / 치명적 경고 한정.
- ❌ `accent-vivid` 를 **link 강조** 에 사용 금지 (v7 rev2 의 link 영역 cascade 제거). link 가 필요하면 `info` 또는 `text-strong` + underline.
- ❌ `gradient-ai-from` / `gradient-ai-to` 를 **AI 영역 외** 에 사용 금지. 일반 강조 영역은 `accent-vivid` 또는 `primary`.
- ❌ `font-display` 를 한 화면에 **2회 이상** 사용 금지. 화면 한 곳 1회 원칙.
- ❌ Tailwind 클래스에 **hex / px 직타** 금지 — `bg-[#ef4444]` / `p-[20px]` 등 임의 클래스 0건. 모든 색·간격은 토큰 호출 (`bg-signal-up` / `p-card-px`).

## OPEN QUESTION 결정 (디자이너 영역)

PRD §9 의 디자이너 결정 영역.

| ID | 질문 | 결정 |
|---|---|---|
| R1 | `signal-up` hex — 권장값 `#ef4444` (red-500) vs 한 단계 진한 red-700 | **red-700 `#c81e1e`** 채택. red-500 의 surface 대비 3.76:1 (AA 미달) → red-700 의 5.94:1 (AA 마진 +32%) 안전. |
| R2 | `asset-coin` hex — 권장값 `#f97316` (orange-500) vs 한 단계 진한 orange-700 | **orange-700 `#c2410c`** 채택. orange-500 의 surface 대비 3.07:1 (AA 미달) → orange-700 의 4.91:1 (AA 마진 +9%) 안전. |
| R3 | `gradient-ai-from` hex — 권장값 `#4f46e5` (indigo-600) vs 한 단계 진한 indigo-700 | **indigo-700 `#4338ca`** 채택. indigo-600 의 gradient-ai-soft 대비 7.45:1 → indigo-700 의 8.85:1 (AA 마진 +97%) 더 안전. brand-impact 강화. |
| R4 | `signal-down` / `gradient-ai-to` hex — `accent-vivid` 와 동일 vs 별도 hex | **동일 `#1d4ed8`** 채택. 두 토큰이 의미 단위가 다르되 시각상 같은 청색 톤이라 화면 통일감 강화. 별도 hex 채택 시 화면 안 청색이 다중 톤으로 분리되어 시각 부담. |
| R5 | 카드 셸 라운드 — 시안의 `rounded-2xl` (16px) vs `rounded-3xl` (24px) 일관 적용 | **분리 적용** — 일반 카드는 `lg` (16px), hero 카드만 `xl` (24px). 정보 위계 분리. |
| R6 | 카드 padding — 시안의 `p-4 md:p-6` (16 → 24) vs 본 저장소의 정보 밀도 톤 (20px 일관) | **분리 적용** — 데스크탑 일반 카드 20px, 모바일 16px, hero 카드 24px. 시안의 의도 + 본 저장소 정보 밀도 톤 양립. |
| R7 | `font-display` 사이즈 — 시안의 `text-4xl` (36px) vs `text-5xl` (48px) | **36px / 800 / -0.02em** 채택. 본 저장소의 정보 밀도 톤 — 한 화면에 hero 1회 + 그 외 헤딩들 (`display` 30px / `h1` 22px) 의 위계 자연. 48px 은 정보 밀도 누수. |
| R8 | bottom-nav-item-active 색 — `accent-vivid` vs `primary` | **`accent-vivid`** 채택. bottom nav 의 active 메뉴는 액션 신호 영역 (사용자가 방금 라우팅 한 결과) 이므로 accent-vivid 정합. primary 는 시그니처 정체성 영역 (navbar wordmark 등) 분리. |
