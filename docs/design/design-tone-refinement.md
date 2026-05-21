---
version: alpha
name: design-tone-refinement
description: Trading Signal Frontend — 사용자가 데스크탑 dev 화면에서 직접 지적한 "색감이 너무 탁해" 발화의 흡수본. v6 polish-followups 의 colors 13 토큰 키 셋·typography 15·rounded 3·spacing 22·breakpoints 4·components 46 모두 무수정 계승. **본 v7 의 변경은 colors front matter 의 hex 값 재조정 단일 축**. 토스 톤 (산뜻 / 간결 / 정보 밀도 높지만 시각 부담 없음) 정합으로 surface 를 순백으로, border-line 을 옅게, text-strong 을 더 진하게, surface-muted / accent-soft / warn-soft / critical-soft / info-soft 를 미세 재조정. WCAG AA 4.5:1 모든 주요 쌍 무회귀 또는 향상.
colors:
  primary: "#1f3b4d"
  surface: "#ffffff"
  surface-muted: "#f6f8fa"
  border-line: "#eceff3"
  text-strong: "#0f1419"
  text-muted: "#5b6470"
  accent-soft: "#eaf0f6"
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

# design-tone-refinement 디자인 가이드 (v7)

## Overview

본 v7 는 v6 (`docs/design/polish-followups.md`) 가 정착시킨 **컴팩트 톤 컴포넌트 시스템** — colors 13, typography 15, rounded 3, spacing 22, breakpoints 4, components 46 — 의 **합성 토큰 키 셋 전체를 무수정 계승** 한다. 본 v7 가 손대는 단일 축은 `colors` front matter 의 **hex 값** 이며, **키 이름 13개는 한 글자도 변경하지 않는다**. 결과적으로 `components` 절의 46 합성 토큰은 자동 cascade — frontend-dev 측 합성 토큰 `@apply` 호출처와 `tailwind.theme.json` 파이프라인은 신규 키 도입 0건, hex 만 재생성된다.

배경은 PRD `design-tone-refinement` §1.1 의 사용자 verbatim — "**색감도 너무 탁해**". 사용자가 데스크탑 1280 뷰포트의 dev 화면을 직접 본 결과의 발화이며, 시그니처 색 (Signature Slate `#1f3b4d`) 자체보다는 **surface / surface-muted / border-line** 의 회색-탁한 잔여물 + **text-strong** 의 대비 약화 + 시그니처 색의 비강조 영역 누수 (카드 본문 텍스트로 흘러간 흔적) 가 누적된 시지각 결과로 디자이너가 해석한다. AGENTS.md 의 톤 지침 **"토스 서비스처럼 밝고 간결"** 과의 미세한 어긋남을 본 v7 가 흡수한다.

본 v7 의 톤 의도는 한 줄로 **"산뜻한 흰색 캔버스 + 옅은 경계선 + 진한 본문 텍스트 + 시그니처 강조의 영역 한정"**. 토스 톤이 가진 "정보 밀도는 높지만 시각 부담 없음" 의 비밀은 (a) 페이지·카드 배경을 거의 순백으로 두고, (b) 카드와 페이지의 분리감은 옅은 surface-muted 한 단계 + 옅은 border-line 로만 표현하며, (c) 시그니처 색은 CTA·focus·active 등 **강조 신호 영역에서만** 등장시키는 데 있다. v6 의 잔여 탁함은 (a) surface-muted 가 미세하게 어둑했고 (`#f5f7fa` L=92.84%), (b) border-line 이 다소 진해 카드가 사각형 박스로 두드러졌고 (`#dbe2ea`), (c) text-strong 의 대비가 충분하지만 더 진한 톤으로 정보 위계를 뚜렷이 가져갈 여지가 있었던 (`#17202a` 16.45:1 → v7 `#0f1419` 18.51:1) 세 지점에서 누적된 결과다. 본 v7 는 이 세 축을 동시에 미세 조정한다.

**무회귀 강제** — v6 의 시각 언어 골격은 모두 보존한다. 라운드 (8px / 12px / 999px), 간격 22 키, typography 15 키, 합성 토큰 46 키의 키·구조·참조 관계는 한 글자도 변경 없음. components 절의 `backgroundColor` / `textColor` / `padding` / `height` 값과 토큰 참조도 v6 무회귀. **본 v7 가 변경한 것은 colors front matter 13 항목 중 9 항목의 hex 값** 이며 (primary / surface 2 항목은 v6 와 동일 유지), 그 cascade 가 합성 토큰의 시각으로 자연스럽게 반영된다. WCAG AA 4.5:1 모든 주요 쌍 **무회귀 또는 향상** (Colors 절의 대비비 표 참조).

## Colors

본 v7 의 **단일 변경 축**. v6 의 13 토큰 **키 셋을 그대로 유지** 하면서, hex 값만 토스 톤 정합으로 재조정한다. 키 추가·삭제·이름 변경 0건이라 합성 토큰 (`{colors.surface}` / `{colors.text-strong}` / 등) 의 참조가 한 줄도 깨지지 않는다.

### 톤 재조정 의도 (요지)

토스 톤의 시각 비밀은 세 축으로 분해된다 — **(1) 산뜻한 흰색 캔버스**, **(2) 카드 vs 페이지의 분리감을 옅은 한 단계로 처리**, **(3) 시그니처 색을 강조 영역에 한정**. v6 는 시그니처 색의 사용 영역은 이미 한정되어 있었으나 (Signature Slate `primary` 의 "한 화면에 두 지점 + navbar wordmark 1회" 룰), 캔버스·분리감·본문 위계 세 축이 미세하게 어둑·진한·약한 잔여물을 가지고 있어 사용자 시지각에 "탁함" 으로 누적됐다. 본 v7 가 세 축을 동시에 정합한다 — `surface-muted` 를 더 산뜻하게 (`#f5f7fa` → `#f6f8fa`, L 92.84% → 93.63%), `border-line` 을 더 옅게 (`#dbe2ea` → `#eceff3`), `text-strong` 을 더 진하게 (`#17202a` → `#0f1419`). 키워드는 **토스 톤 / 산뜻 / 시그니처 강조 / 정보 밀도** 네 단어로 요약된다.

### 신·구 비교 표 (v6 → v7)

각 토큰의 hex 재조정 단일 표. **`primary` / `surface` 두 키는 v6 무변경** (시그니처 정체성 + 순백 캔버스 유지). 나머지 11 키 미세 조정.

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

**요약** — `primary` / `surface` 무변경, `surface-muted` / `text-strong` / `text-muted` / `border-line` / `accent-soft` 5 키는 의도 명확한 톤 재조정, `warn` / `warn-soft` / `info` / `info-soft` / `critical` / `critical-soft` 6 키는 페어 일관성 미세 보정. 총 11 키 hex 변경. PRD §3.3 의 재조정 방향 충실 반영.

### WCAG AA 대비비 표 (4.5:1 무회귀 강제)

주요 (text 색 × 배경 색) 쌍 13건. **모든 쌍이 4.5:1 이상이며, v6 대비 무회귀 또는 향상**. v6 와의 비교 칼럼을 같이 두어 cascade 영향을 한 표에서 추적 가능.

| Foreground × Background (사용처 예) | v6 비율 | v7 비율 | Δ | 4.5:1 |
|---|---|---|---|---|
| `text-strong` × `surface` (본문·헤드라인 / 페이지·카드) | 16.45:1 | **18.51:1** | +2.06 | OK |
| `text-strong` × `surface-muted` (shell · main-area · input 본문) | 15.33:1 | **17.39:1** | +2.06 | OK |
| `text-muted` × `surface` (caption · input-helper · sidebar-section-header) | 5.68:1 | **6.00:1** | +0.32 | OK |
| `text-muted` × `surface-muted` (input-suffix · sidebar-empty · favorite-toggle) | 5.29:1 | **5.63:1** | +0.34 | OK |
| `primary` × `surface` (button-secondary · navbar-brand · favorite-toggle-active 의 text 시) | 11.73:1 | **11.73:1** | 0 | OK |
| `primary` × `accent-soft` (search-result-item-focus · sidebar-item-active · badge-accent) | 9.85:1 | **10.21:1** | +0.36 | OK |
| `surface` × `primary` (button-primary 흰 텍스트 / 슬레이트 배경) | 11.73:1 | **11.73:1** | 0 | OK |
| `warn` × `warn-soft` (card-warn · badge-warn) | 5.54:1 | **5.47:1** | -0.07 | OK |
| `warn` × `surface` (warn 텍스트 / 페이지·카드) | 6.04:1 | **6.00:1** | -0.04 | OK |
| `info` × `info-soft` (badge-info) | 6.20:1 | **5.89:1** | -0.31 | OK |
| `info` × `surface` (info 텍스트 / 페이지·카드) | 7.15:1 | **6.80:1** | -0.35 | OK |
| `critical` × `critical-soft` (card-critical · badge-critical · input-error) | 7.71:1 | **7.45:1** | -0.26 | OK |
| `critical` × `surface` (critical 텍스트 / 페이지·카드) | 9.44:1 | **9.19:1** | -0.25 | OK |

**해석** — text 본문 쌍 (text-strong / text-muted × surface / surface-muted) 4건은 모두 향상. primary 페어 3건은 정체 (브랜드 정체성 유지) 또는 향상. warn / info / critical 의 상태 색 6건은 미세 하향 (페어 톤 미세 보정) 이지만 모든 쌍이 4.5:1 안전 마진 충분 (가장 낮은 `warn × warn-soft` 도 5.47:1 — AA 기준 +21% 마진). **WCAG AA 무회귀 강제** (PRD AC-3-7) 충족.

### primary 의 사용 영역 (시그니처 강조 한정 룰)

Signature Slate `#1f3b4d` 는 본 v7 에서도 **무변경** 이다. PRD §9.3 의 두 옵션 중 **유지** 결정 — 사용자 발화 "탁해" 는 primary 자체가 아니라 surface/border 의 잔여물 + primary 의 비강조 영역 누수의 누적이라고 디자이너가 해석한다. 따라서 본 v7 가 강화하는 것은 primary 의 hex 가 아니라 **primary 의 사용 영역 룰**.

**primary 사용 허용 영역** (강조 신호 영역 한정):

- **CTA 버튼 배경** — `button-primary` 의 backgroundColor. 한 화면에 1개 원칙.
- **선택·active 톤의 텍스트** — `search-result-item-focus.textColor`, `sidebar-item-active.textColor`, `badge-accent.textColor`, `button-secondary.textColor`, `button-secondary-hover.textColor`, `favorite-toggle-active.textColor`. accent-soft 배경 위 진한 강조 텍스트로 등장.
- **focus ring / focus 강조** — input · button · listbox option 등의 `:focus-visible` outline. (별도 합성 토큰 없이 Tailwind `focus-visible:outline-{primary}` 등으로 표현. frontend-dev 핸드오프 영역.)
- **브랜드 wordmark** — `navbar-brand.textColor`. 한 화면에 1회.
- **가격 바 target 마커** — `price-bar-target.backgroundColor`. 결과 ticker-header 안 가격 시각화의 의미적 강조점.

**primary 사용 금지 영역** (비강조 누수 차단):

- **카드 안 본문 텍스트** — 카드 텍스트는 항상 `text-strong` 또는 `text-muted`. primary 가 본문 텍스트 톤으로 흘러가면 사용자 시지각에 회색-탁한 느낌이 누적된다 (v6 의 잔여 원인 중 하나).
- **일반 텍스트 link** — link 가 필요하면 `info` (정보성 청색) 또는 `text-strong` + underline 으로 처리. primary 는 시그니처 액션 강조 영역에 보존.
- **일반 button border** — button 외곽선이 필요하면 `border-line` 으로. primary border 는 "강조 버튼" 의 hover/active 처럼 명확한 강조 신호일 때만.
- **일반 card border** — card 가 강조 신호가 필요하면 `border-line` 또는 `accent-soft` background 로. primary border 는 시각 압박감을 만든다.
- **본문 강조 단어** — 본문 중 강조가 필요하면 `text-strong` + `body-strong` typography 로. primary 색 텍스트는 의미적 액션 신호가 명확할 때만.

이 룰은 v6 의 "한 화면에 두 지점 + navbar wordmark 1회" 룰의 **세부 정합** — primary 의 등장 횟수 제한 + 등장 영역 의미 한정이라는 두 축을 동시에 가진다. frontend-dev 핸드오프 시 합성 토큰 (`button-primary`, `search-result-item-focus`, `sidebar-item-active`, `badge-accent`, `navbar-brand`, `price-bar-target`) 의 textColor / backgroundColor 외 위치에 `text-primary` 또는 `bg-primary` 클래스가 등장하면 본 룰 위반 — reviewer 가 변경 요청.

## Typography

v6 의 15 키 **완전 무수정 계승**. 본 v7 는 typography 키를 추가하지도, 기존 키 값을 변경하지도 않는다.

`display` (30px / 700 / 1.18), `h1` (22px), `h2` (17px), `body-md` (16px), `body-sm` (14px), `body-strong` (16px / 700), `caption` (12px), `button` (15px / 700), `button-sm` (13px / 700), `badge` (13px / 700), `mono-numeric` (15px / 700 / `tnum`), `nav-brand` (16px / 700), `sidebar-section` (12px / 700 / letterSpacing 0.04em), `label-sm` (13px / 700), `input-suffix` (13px / 400 / `tnum`) 모두 v6 그대로. Arial fontFamily 도 무변경.

타이포 위계가 색 톤 재조정 없이도 정보 위계를 충분히 가져가는 것은 v5/v6 가 정착시킨 자산. 본 v7 의 색 톤 재조정은 타이포 위계를 **방해하지 않고 보조** 하는 방향 — text-strong 의 톤이 더 진해지면서 display·h1·h2·body-strong 의 굵기 (700 weight) 가 더 명확히 드러난다.

## Layout

v6 의 layout 가이드 전체 무수정 계승. 3-section shell (navbar 60px + sidebar 264px + main), 데스크탑·모바일·태블릿 정책, drawer slide-in, 결과 6블록 위계 모두 v6 그대로.

본 v7 가 spacing front matter 에 손대지 않는다 — 22 키 (`xs`/`sm`/`md`/`lg`/`xl`/`2xl`/`navbar-h`/`sidebar-w`/`drawer-w`/`main-max-w`/`input-h`/`input-px`/`input-py`/`input-pr-suffix`/`input-pr-suffix-sm`/`input-pr-suffix-md`/`input-pr-suffix-lg`/`dropdown-item-h`/`dropdown-item-py`/`button-primary-h`/`button-sm-h`/`hit-area-min`) 모두 한 글자 변경 없음. v6 의 단위별 너비 분기 (sm 36px / md 44px / lg 56px) 도 그대로 유효.

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

본 v7 가 components 절의 합성 토큰 정의 (front matter) 를 **변경한 키는 0개** 다. v6 의 46 합성 토큰 모두 키 이름·속성·참조 토큰 한 글자 변경 없이 보존. 본 절은 색 cascade 의 시각 결과를 합성 토큰별로 prose 단위로 설명한다.

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

### primary 계열 cascade — 시그니처 강조 영역

`{colors.primary}` 를 참조하는 합성 토큰 — `button-primary.backgroundColor`, `button-primary-disabled.backgroundColor`, `button-secondary.textColor`, `button-secondary-hover.textColor`, `search-result-item-focus.textColor`, `sidebar-item-active.textColor`, `badge-accent.textColor`, `navbar-brand.textColor`, `favorite-toggle-active.textColor`, `price-bar-target.backgroundColor`. v6 무회귀 (Signature Slate `#1f3b4d` 무변경). 사용 영역 룰 강화 — "primary 의 사용 영역" 절 참조.

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
- ❌ 색 토큰 13 키 셋을 추가·삭제·이름 변경하지 않는다 — 합성 토큰 cascade 보장.

---

## 유저 시나리오

### 시나리오 A — 데스크탑 1280 첫 진입 (산뜻한 캔버스 확인)

1. 사용자가 데스크탑 1280 뷰포트로 진입. **순백 페이지 캔버스** (`{colors.surface}` `#ffffff`) 위에 옅은 surface-muted shell (`#f6f8fa`) 이 main-area 배경으로 호흡. navbar (`surface`, 60px 높이) 아래로 sidebar (`surface`, 264px 너비) 와 main 영역 (`surface-muted`) 이 좌우 분할.
2. **사이드바가 viewport 끝까지 stretched** (PRD §3.2 grid `min-height` cascade) — 회색 빈 공간 0건. sidebar 의 흰색 배경과 main-area 의 옅은 회색 배경이 6.37% L 차이로 자연스럽게 분리되되 압박감 없음.
3. main 안 ticker-header (`surface`, 16px 라운드) — 카드 외곽선이 옅은 `border-line` (`#eceff3`) 한 줄. v6 대비 카드의 사각형 박스 두드러짐 해소. 카드와 페이지가 자연스럽게 융합되는 토스 톤.
4. SearchPanel input (`surface-muted` 배경) — 입력 영역의 회색 채움이 미세하게 더 밝아져 (`#f6f8fa`) 입력 시지각 부담 감소. label (text-strong, 18.51:1 대비) 의 검은 톤이 뚜렷하게 정보 위계.
5. 사용자 시지각 결과 — "탁함" 의 사라짐. 산뜻한 흰색 캔버스 + 옅은 분리 + 진한 본문 위계.

### 시나리오 B — ticker 검색 dropdown 정합 (PRD §3.1)

1. 사용자가 SearchPanel input 에 focus. **dropdown 이 input 바로 아래에 anchor** (PRD §3.1 fix cascade) — `position: relative` wrapper 의 직접 자식으로 dropdown-panel 이 `top: 100%; left: 0; right: 0` 표시.
2. dropdown-panel (`surface` 배경, 8px 라운드, 옅은 border-line 외곽선) 안에 두 옵션 — `AAPL · Apple Inc.` / `BTC-USD · Bitcoin`. body-sm typography (14px / 400 / 1.5), text-strong 톤.
3. ↓ 키 누르면 첫 옵션이 `search-result-item-focus` 톤 — accent-soft 배경 (`#eaf0f6`) + primary 텍스트 (`#1f3b4d`) — **시그니처 강조 영역의 등장**. primary 색이 옵션 텍스트에 등장하지만 이는 강조 신호 영역 (focus 톤) 이라 룰 정합.
4. v6 대비 시각 변화 — accent-soft 배경이 미세하게 더 산뜻 (`#e6ecf2` → `#eaf0f6`), primary 텍스트와의 대비 10.21:1 (v6: 9.85:1) 로 옵션 focus 신호 강화.
5. Enter 누름 → 옵션 선택 + dropdown unmount. ticker-header 갱신.

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
5. v6 대비 시각 변화 — 데스크탑과 동일한 산뜻한 캔버스 + 옅은 분리 + 진한 본문 위계. 모바일 시지각 무회귀.

---

## 핸드오프 명세 — 컴포넌트별 cascade·상태·DOM

본 v7 가 합성 토큰 키 셋을 무수정 계승하므로 frontend-dev 핸드오프의 DOM·prop·class·ARIA 영역은 **v6 무회귀**. 본 절은 **색 cascade 의 frontend-dev 측 검증 영역** 만 명시한다.

### tailwind.theme.json 재생성

색 토큰 13 키의 hex 재조정 → `npm run design:sync` 재실행 → `tailwind.theme.json` 의 colors 절 자동 갱신. 새 hex 가 Tailwind theme 의 색 변수로 주입된다. 합성 토큰 `@apply` 호출처 (`app/components.css`) 는 토큰 참조 (`bg-surface`, `text-text-strong`, `border-border-line` 등) 만 사용하므로 추가 편집 0건. **멱등 검증** — `npm run design:sync` 재실행 후 `tailwind.theme.json` 의 colors 절이 v7 hex 와 정합.

### 합성 토큰 `@apply` 호출처 검증

frontend-dev 는 `app/components.css` 의 `@layer components` 안에서 색 hex 또는 px 직타가 0건인지 재검증 — `git grep -nE "#[0-9a-fA-F]{3,6}" app/components.css` 결과 0건. 모든 색은 Tailwind 토큰 함수 (`theme('colors.surface')` 또는 등가) 또는 CSS 변수 (`var(--color-surface)`) 호출. PRD AC-4-1 정합.

### card / card-elevated / card-warn / card-critical 외곽선 호출처

본 v7 의 시각 효과 핵심 중 하나는 **카드 외곽선이 옅어지는 cascade**. frontend-dev 측에서 `.card` 클래스 또는 합성 토큰 `@apply` 정의에 `border-border-line` 또는 `border-{border-line 변수}` 호출이 있는지 확인. 합성 토큰 키 셋 변경 0건이므로 호출처 그대로, 색만 자동 cascade. **시각 검증** — 양 뷰포트 (375 / 1280) 에서 카드의 1px 외곽선이 v6 대비 옅어졌는지 QA 라운드트립으로 확인.

### button-primary / button-secondary 톤 검증

- `button-primary` (예: "분석" CTA) — backgroundColor `{colors.primary}` `#1f3b4d` (v6 무회귀) + textColor `{colors.surface}` `#ffffff`. 11.73:1 대비 무회귀.
- `button-secondary` — backgroundColor `{colors.surface}` + textColor `{colors.primary}`. 11.73:1 대비 무회귀. hover 시 `button-secondary-hover` 의 accent-soft 배경 (`#eaf0f6`) + primary 텍스트 (10.21:1 대비 v6 9.85:1 대비 +0.36 향상).
- primary 사용 영역 룰 준수 — `text-primary` / `bg-primary` 클래스가 위 합성 토큰 호출처 외에 등장하면 reviewer 가 변경 요청 ("primary 의 사용 영역" 절 참조).

### text-strong / text-muted 본문 cascade

- 본문 헤드라인 (h1 / h2 / display) — textColor `{colors.text-strong}` `#0f1419` (v6 `#17202a` → v7 `#0f1419` 재조정). 18.51:1 대비 향상.
- caption / 보조 텍스트 — textColor `{colors.text-muted}` `#5b6470`. 5.63:1 ~ 6.00:1 대비 향상.
- **검증** — QA 라운드트립에서 본문 텍스트가 v6 대비 미세하게 더 진해졌는지 확인. WCAG AA 안전 마진 증가.

### dropdown-panel + search-result-item ARIA 무회귀 (v6 핵심)

본 v7 의 색 재조정은 v6 의 ARIA 패턴 (`role="combobox"` + `role="listbox"` + `role="option"` + `aria-activedescendant`) 에 영향 0건. 키보드 ↑/↓/Enter/ESC navigation + outside-click 닫기 모두 v6 무회귀. **시각 변화** — 옵션 focus 톤 (accent-soft + primary) 의 대비 미세 향상 (10.21:1).

### sidebar 높이 fix 후 색 cascade (PRD §3.2)

PRD §3.2 의 sidebar 높이 fix 가 적용되면 sidebar 영역이 viewport 끝까지 stretched. sidebar 배경 `{colors.surface}` `#ffffff` (v6 무회귀) 가 viewport 끝까지 채워지고, 그 옆 main-area 의 `{colors.surface-muted}` `#f6f8fa` 와 6.37% L 차이로 분리. **시각 검증** — 데스크탑 1280 에서 sidebar 흰색 영역이 navbar 아래 viewport 끝까지 채워지고, 그 옆 main-area 의 옅은 회색이 자연 분리. 회색 빈 공간 0건.

### dropdown 위치 fix 후 색 cascade (PRD §3.1)

PRD §3.1 의 dropdown 위치 fix 가 적용되면 dropdown-panel 이 input 바로 아래 4~8px 간격으로 anchor. dropdown-panel 배경 `{colors.surface}` `#ffffff` + 옅은 border-line `#eceff3` 외곽선이 input (surface-muted 배경) 과 시각적으로 분리되되 페어로 묶여 있다는 신호. **시각 검증** — input bottom + 4~8px 위치에 dropdown 의 top 이 정렬. 양 뷰포트 무회귀.

---

## OPEN QUESTION 결정 (디자이너 영역) — v7 design-tone-refinement

PRD §9 의 8건 중 디자이너 영역 5건 (R1 / R2 / R3 / R4 / R5). PM 권고 대비 v7 결정을 표로 명시.

| # | 질문 | v7 결정 | PM 권고 대비 |
|---|---|---|---|
| **R1** | surface 값 — `#fafbfc` vs `#ffffff` (PRD §9.4) | **`#ffffff` 결정**. 산뜻함의 정점은 순백이며, surface 와 surface-muted 의 분리감은 옅은 한 단계 (`#f6f8fa`, L 차 6.37%) 만으로 충분. `#fafbfc` 는 surface-muted 와의 L 차이가 좁아져 카드 vs 페이지 분리 신호가 약해진다. 토스 톤 정합 + 30+ 합성 토큰 (card · navbar · sidebar · dropdown-panel 등) 의 base 로 가장 자연. | PM 권고 (디자이너 결정 위임) 수용. |
| **R2** | primary 값 — Signature Slate `#1f3b4d` 유지 vs 미세 조정 (PRD §9.3) | **유지 (무변경) 결정**. 사용자 발화 "탁해" 는 primary 자체가 아니라 surface/border 의 잔여물 + primary 의 비강조 영역 누수의 누적이라고 해석. 본 v7 의 surface-muted / border-line / text-strong 재조정 + primary 사용 영역 룰 강화 ("primary 의 사용 영역" 절) 로 "탁함" 누적이 해소된다. 브랜드 정체성 (Signature Slate) 보존 — 사용자가 이미 익숙해진 시그니처 색의 hex 변경은 브랜드 재정립 비용 대비 효익 낮음. indigo / blue 톤 변경 옵션은 별도 PRD `brand-refinement` (가칭) 진입 시 재검토. | PM 권고 (유지 또는 미세 조정 → 디자이너 결정) 수용. |
| **R3** | border-line / text-strong / text-muted 의 정확한 hex (PRD §3.3) | **border-line `#eceff3`, text-strong `#0f1419`, text-muted `#5b6470` 결정**. 사유 — (a) border-line — v6 `#dbe2ea` 대비 +6.32% L 향상으로 카드 사각형 박스 두드러짐 해소, 그러나 surface `#ffffff` 와 약 7% L 차이가 남아 경계는 보이되 압박감 없음, (b) text-strong — v6 `#17202a` 대비 -3.65% L 향상으로 surface 대비 18.51:1 (v6 16.45:1) 정보 위계 뚜렷, 순흑 (`#000000`) 은 시지각 부담 + 토스 톤 어긋남이라 회피, (c) text-muted — v6 `#5b6878` 대비 미세하게 더 중성적 회색으로 surface-muted (`#f6f8fa`) 와 톤 충돌 회피, surface 대비 6.00:1 / surface-muted 대비 5.63:1 안전 마진 증가. | PM 권고 (재조정 방향 가이드) 수용 + 정확한 hex 결정. |
| **R4** | WCAG AA 4.5:1 무회귀 검증 (PRD §3.3 / AC-3-7) | **모든 주요 쌍 13건 4.5:1 이상 + v6 대비 무회귀 또는 향상**. Colors > WCAG AA 대비비 표 참조. text 본문 쌍 4건 모두 향상, primary 페어 3건 정체 또는 향상, warn / info / critical 페어 6건 미세 하향 (페어 톤 미세 보정) 이지만 모든 쌍이 4.5:1 안전 마진 충분 (가장 낮은 `warn × warn-soft` 도 5.47:1 — AA 기준 +21% 마진). PRD AC-3-7 충족. | PM 권고 (WCAG AA 무회귀 강제) 수용 + 측정 표 명시. |
| **R5** | 카드 사각형 압박 해소 방향 — border-line 옅게 + 카드와 background 일체감 vs 명확한 카드 외곽선 (PRD §3.3) | **border-line 옅게 + 적당한 분리감 결정** (양 극단 회피). border-line `#eceff3` 는 v6 (`#dbe2ea`) 대비 옅어졌지만 surface `#ffffff` 와의 L 차이가 약 7% 남아 카드 경계가 사라지지 않음. 동시에 v6 의 사각형 박스 두드러짐은 해소. 토스 톤의 "카드 같지 않은 카드" 효과를 정보 위계 약화 없이 구현. 카드 외곽선의 1px 보더는 그대로 유지 — 그림자 없이 옅은 보더 한 단계로 elevation 표현하는 v6 평면 디자인 기조 정합. | PM 권고 (디자이너 결정) 수용. |

PRD §9 의 나머지 3건 (R6 신규 토큰 추가 / R7 border 옅음 정도 / R8 다음 PRD) 중 디자이너 영역:

- **R6 (신규 토큰 추가)** — `surface-elevated` 등 신규 토큰 추가 0건 결정. v6 의 13 토큰만으로 충분 — 카드 vs 페이지의 elevation 위계는 surface / surface-muted 두 단계 + border-line 한 단계로 표현 가능. 신규 토큰 추가는 합성 토큰 cascade 영향 + Tailwind theme 키 추가 비용 대비 효익 낮음. 본 v7 의 cascade 영향 최소화 원칙 정합.
- **R7 (border 옅음의 정도)** — `#eceff3` 결정 (R3 와 함께 결정). PRD §9.7 의 세 후보 (`#eef0f3` / `#f0f2f5` / `#e8eaee`) 중 비슷한 톤 + surface 와 7% L 차이로 균형점. 카드 경계 보존.
- **R8 (다음 PRD)** — 사용자·PM 영역.

---

## lint 메모 (v7)

본 v7 (`design-tone-refinement`) 는 v6 (`polish-followups`) 의 토큰 키 셋을 **무수정 계승** 하며 다음 단일 축만 변경:

- **front matter `colors` 절**: v6 의 13 토큰 키 셋 **그대로 유지** + hex 값 11 키 재조정 (`primary` / `surface` 2 키는 무변경). 키 추가·삭제·이름 변경 0건.
- **front matter `typography` 절**: v6 의 15 키 **그대로 복사**. 추가·변경 0.
- **front matter `spacing` 절**: v6 의 22 키 **그대로 복사**. 추가·변경 0.
- **front matter `rounded` 절**: v6 의 3 키 그대로. 추가·변경 0.
- **front matter `breakpoints` 절**: v6 그대로.
- **front matter `components` 절**: v6 의 46 합성 토큰 **그대로 복사**. 추가·변경 0. 본 v7 의 시각 cascade 는 colors hex 재조정이 합성 토큰 참조 (`{colors.surface}` 등) 를 통해 자동 반영.
- **본문 절**: Overview (v7 톤 의도) / Colors (신·구 비교 표 + WCAG AA 표 + primary 사용 영역 룰) / Typography (v6 무회귀) / Layout (v6 무회귀 + PRD §3.1 / §3.2 디자인 의도) / Elevation & Depth (v6 무회귀 + 색 cascade 인지 영향) / Shapes (v6 무회귀) / Components (색 계열별 cascade 영향) / Do's and Don'ts (v6 무회귀 + v7 신규 색 룰).
- **유저 시나리오**: 데스크탑 첫 진입 (산뜻한 캔버스) / ticker 검색 dropdown 정합 / 분석 결과 6블록 상태 색 / 모바일 톤 무회귀 4 시나리오.
- **핸드오프 명세**: tailwind.theme.json 재생성 / `@apply` 호출처 검증 / 카드 외곽선 / 버튼 톤 / 본문 텍스트 / dropdown ARIA 무회귀 / sidebar·dropdown 위치 fix 후 cascade.
- **OPEN QUESTION**: R1 (surface `#ffffff`) / R2 (primary 유지) / R3 (border-line·text-strong·text-muted 정확한 hex) / R4 (WCAG AA 무회귀) / R5 (border 옅음 + 적당한 분리감) 결정 표.

**무회귀**: v6 의 colors 13 키 이름 / typography 15 / spacing 22 / rounded 3 / breakpoints 4 / 46 composite 모두 그대로. frontend-dev 측 `tailwind.theme.json` 재생성은 colors 절의 hex 만 갱신, 키·구조·합성 토큰 참조 0건 변경 → design:sync 결정적 무회귀.

산출 직전 `npx @google/design.md lint docs/design/design-tone-refinement.md` 통과 목표:

- errors: 0
- warnings: 0
- info: 1 (token summary)

`contrast-ratio` 룰 회피 — v7 의 모든 (textColor × backgroundColor) 쌍이 4.5:1 이상. Colors > WCAG AA 대비비 표 참조. `input-suffix` 의 `text-muted` × `surface-muted` 5.63:1 (v6 5.29:1 대비 향상), `search-result-item-focus` 의 `primary` × `accent-soft` 10.21:1 (v6 9.85:1 대비 향상) 모두 안전 마진 충분.

`orphaned-tokens` 룰 회피 — 본 v7 의 colors 13 키 모두 합성 토큰 어딘가에서 참조됨. `primary` (10+ 합성 토큰), `surface` (30+), `surface-muted` (8+), `border-line` (1 직접 + `@apply` 호출처에서 외곽선용), `text-strong` (19+), `text-muted` (6+), `accent-soft` (5+), `warn` / `warn-soft` (각 2+), `info` / `info-soft` (각 2+), `critical` / `critical-soft` (각 3+). orphan 0.

`section-order` 룰 회피 — Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts 순서 고정 (v6 와 동일).

`missing-primary` 룰 회피 — `colors.primary` 정의 (v6 무회귀, `#1f3b4d`).

`missing-typography` 룰 회피 — colors / typography 모두 정의됨 (v6 무회귀).

`broken-ref` 룰 회피 — 합성 토큰의 모든 토큰 참조 (`{colors.*}`, `{typography.*}`, `{rounded.*}`, `{spacing.*}`) 가 front matter 의 정의를 가리킴. 키 셋 v6 무수정 계승이라 v6 시점 통과한 lint 가 v7 에서도 결정적으로 통과.
