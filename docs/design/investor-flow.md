---
version: alpha
name: investor-flow
description: 수급(외국인·기관 순매수) 2표면 통합 디자인 — (A) 홈 "외국인/기관 순매수 Top10" 카드(시장 전체·당일), (B) 종목 상세 "수급" 섹션(개인/외국인/기관 최근 N일). 라이브 source 인 `finsight-redesign` 의 colors / typography / spacing / rounded / breakpoints / components 토큰 셋을 base 로 두고, 신규 색 0 으로 기존 한국식 등락색(`signal-up` red / `signal-down` blue)·카드 셸(`card`)·테이블 행(`table-row-h` / `table-cell-px`)·`home-grid-gap` 그리드 를 재사용한다. 본 슬러그가 추가하는 것은 (1) 순위·종목·금액 정렬 랭킹 행 합성 토큰(`rank-row` / `rank-badge` / `netbuy-amount` / `netbuy-qty`), (2) 표면 B 표 헤더·합계 요약·일자 셀 합성 토큰(`flow-table-header` / `flow-summary-cell` / `flow-date-cell`), (3) 모바일 "더보기" 토글 합성 토큰(`show-more-toggle`) 뿐이며 모두 기존 색·타이포·간격 토큰 참조로만 구성한다. 신규 색·타이포 0, 신규 spacing 2(`rank-badge-w` / `flow-table-min-w`). WCAG AA 4.5:1 무회귀. PRD `investor-flow` §4·§5 AC-1~12 충족.
colors:
  primary: "#1f3b4d"
  surface: "#ffffff"
  surface-muted: "#f6f8fa"
  text-strong: "#0f1419"
  text-muted: "#5b6470"
  accent-soft: "#eaf0f6"
  warn: "#a14a06"
  warn-soft: "#fff3df"
  critical: "#8e1717"
  critical-soft: "#fde1e1"
  signal-up: "#c81e1e"
  signal-up-soft: "#fee2e2"
  signal-down: "#1d4ed8"
  signal-down-soft: "#dbeafe"
typography:
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
  badge:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
  button-sm:
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
  label-sm:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.25
  table-cell-numeric:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 14px
    fontWeight: 700
    fontFeature: "tnum"
spacing:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  card-px: 20px
  card-px-mobile: 16px
  home-grid-gap: 16px
  table-row-h: 48px
  table-cell-px: 12px
  hit-area-min: 40px
  button-sm-h: 32px
  rank-badge-w: 24px
  flow-table-min-w: 520px
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  pill: 999px
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
components:
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-px}"
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
  rank-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-sm-strong}"
    padding: "{spacing.table-cell-px}"
    height: "{spacing.table-row-h}"
  rank-row-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-sm-strong}"
    padding: "{spacing.table-cell-px}"
    height: "{spacing.table-row-h}"
  rank-badge:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    typography: "{typography.label-sm}"
    padding: 0px
    width: "{spacing.rank-badge-w}"
    height: "{spacing.rank-badge-w}"
  rank-badge-top:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    typography: "{typography.label-sm}"
    padding: 0px
    width: "{spacing.rank-badge-w}"
    height: "{spacing.rank-badge-w}"
  rank-name:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-sm-strong}"
    padding: 0px
  rank-code:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  netbuy-amount-up:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-up}"
    typography: "{typography.mono-numeric}"
    padding: 0px
  netbuy-amount-down:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-down}"
    typography: "{typography.mono-numeric}"
    padding: 0px
  netbuy-qty:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
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
  flow-table-header:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label-sm}"
    padding: "{spacing.table-cell-px}"
    height: 40px
  flow-table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.table-cell-numeric}"
    padding: "{spacing.table-cell-px}"
    height: "{spacing.table-row-h}"
  flow-date-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: "{spacing.table-cell-px}"
  flow-summary-cell:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.md}"
    typography: "{typography.body-strong}"
    padding: "{spacing.card-px-mobile}"
  flow-summary-label:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  show-more-toggle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    typography: "{typography.button-sm}"
    padding: 8px
    height: "{spacing.button-sm-h}"
  show-more-toggle-hover:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    typography: "{typography.button-sm}"
    padding: 8px
    height: "{spacing.button-sm-h}"
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
  mock-tag:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.pill}"
    typography: "{typography.caption}"
    padding: 8px
    height: 22px
---

# investor-flow 디자인 가이드

## Overview

수급(외국인·기관 순매수)을 **독립 페이지 없이 기존 2표면에 녹여 넣는** 경량 디자인이다(PRD §1·§2.2). 새 화면·새 nav 항목·새 브랜드 요소가 없으므로 디자인의 목표는 "기존 토스톤 카드/테이블 시스템 안에서 수급 정보가 자연스럽게 한 칸을 차지하게 하는 것"이다.

- **표면 A** — 홈(`MarketOverviewPage`)의 지수 카드 아래에 들어가는 **"외국인/기관 순매수 Top10" 카드**. 시장 전체·당일 스냅샷. 발굴 동선(어느 종목에 외인·기관 자금이 들어오나)을 한눈에.
- **표면 B** — 종목 상세(`StockProfilePage`)의 한 **"수급" 섹션**. 개인/외국인/기관 최근 N일 순매수 추이. 분석 동선(이 종목에 누가 들어오고 나가나)을 일자별로.

톤은 프로젝트 공통 토스톤(밝고 간결, 정보 밀도 높음, 조작 빠름). 색은 **신규 0** — 한국 개인 투자자 멘탈모델(순매수=빨강 `signal-up`, 순매도=파랑 `signal-down`)을 그대로 따른다. 두 표면 모두 `loading / empty / error / mock` 4상태를 명시적으로 처리해 흰 화면을 만들지 않는다(PRD §4.C, AC-6).

## Colors

신규 색 토큰 **0개**. 라이브 source(`finsight-redesign`)에서 본 슬러그가 실제로 호출하는 색만 carry 한다(orphaned-tokens 회피).

- **`signal-up` (#c81e1e)** — **순매수(양수) 금액·등락률**의 빨강. 한국식: 자금 유입/상승. 표면 A의 등락률, 표면 A·B 양수 순매수 금액에 사용.
- **`signal-down` (#1d4ed8)** — **순매도(음수) 금액·하락률**의 파랑. 표면 B의 음수 순매수(=순매도) 금액에 사용. 표면 A는 정렬이 "순매수 상위"라 음수가 드물지만 등락률 하락 표현에 사용.
- **`signal-up-soft` / `signal-down-soft`** — 합계 요약(표면 B)에서 주체별 순매수/순매도 결과를 강조하는 배지(`badge-signal-up`/`badge-signal-down`)의 배경.
- **`text-strong` (#0f1419)** — 종목명·종가 등 주 식별 텍스트.
- **`text-muted` (#5b6470)** — 종목코드, 수량 병기, "기준 시각", 표 헤더, 빈상태 본문 등 보조 텍스트.
- **`surface` / `surface-muted`** — 카드 바탕 / 행 hover·표 헤더·합계 박스. 행 구분선은 라이브 source 의 `border-line` 토큰을 코드에서 재사용(본 슬러그 front matter 는 컴포넌트 미참조라 carry 하지 않음 — orphaned-tokens 회피).
- **`accent-soft` / `primary`** — Top3 순위 배지(`rank-badge-top`)와 "더보기" 토글(`show-more-toggle`) 강조.
- **`warn` / `warn-soft`** — mock 데이터일 때만 노출되는 `mock-tag`(개발·preview 식별용). prod 라이브에서는 미노출.
- **`critical` / `critical-soft`** — `error-state`(KIS 5xx·타임아웃) 한정.

> **부호→색 규칙(절대 원칙)**: 순매수 금액·수량의 **부호로 색을 결정한다.** 양수(순매수)=`signal-up`(빨강), 음수(순매도)=`signal-down`(파랑), 0=`text-muted`. 등락률도 동일(상승 빨강/하락 파랑). hex 직타 금지 — 항상 `netbuy-amount-up`/`netbuy-amount-down` 또는 `signal-up-text`/`signal-down-text` 토큰 경유.

## Typography

신규 타이포 **0개**. 모두 라이브 source 재사용.

- **`h2`** — 두 표면의 섹션 제목("외국인·기관 순매수 Top10", "수급")에 `card-section-header`로.
- **`body-sm-strong`** — 랭킹 행 종목명, 표면 A 행 본문(`rank-row`).
- **`mono-numeric` (tnum)** — 금액·등락률 등 **자릿수 정렬이 필요한 수치**. 표면 A 순매수 거래대금/등락률, 표면 B 합계 요약 숫자.
- **`table-cell-numeric` (tnum)** — 표면 B 일자별 표의 셀 숫자(개인/외국인/기관 × 금액·수량).
- **`label-sm`** — 표 헤더(`flow-table-header`), 순위 배지 숫자.
- **`caption`** — 종목코드, 수량 병기(`netbuy-qty`), "기준 시각", 일자 셀, 빈상태 보조.
- **`badge`** — 합계 요약 배지(`badge-signal-up`/`badge-signal-down`).

## Layout

두 표면 모두 **`.card` 셸 + `home-grid-gap`(16px) 간격**을 기존 화면 그리드에 그대로 얹는다. 신규 grid 정의 최소화 — 표면 A는 `home-grid-gap` 2열, 표면 B는 단일 카드 내부 표.

### 표면 A — 홈 카드 (`MarketOverviewPage` 트리)

- **배치**: 홈 위젯 흐름에서 **지수 카드 바로 아래**(발굴 동선상 지수 → 수급이 자연 — q3 결정 R2). 기존 위젯(공포탐욕·공시) 위. 섹션은 단일 `.card` 컨테이너이거나, 2개 카드(외국인/기관)를 `home-grid-gap`으로 병치한 2열 — 본 가이드는 **카드 1개 안에 2열 컬럼**을 권장(섹션 제목 1회, 시각 통일).
- **데스크탑(≥`lg`)**: 카드 내부 `lg:grid-cols-2`. 좌 = 외국인 Top10, 우 = 기관 Top10. 각 컬럼 머리에 소제목("외국인" / "기관") + "기준 시각"(`card-section-meta`). 각 컬럼은 최대 10행.
- **태블릿(`md`~`lg`)**: 2열 유지 가능(폭 충분). 폭이 빠듯하면 `md:grid-cols-2` 미적용 시 세로 스택으로 폴백(컨테이너 폭 기준 `useBreakpoint`).
- **모바일(<`md`)**: **세로 스택**(외국인 → 기관 순). 각 리스트 **Top5 절단 + "더보기"** 토글로 10행까지 확장(q3 결정 R3). 스크롤 부담 완화.
- **행 그리드(12-col 컬럼 패턴, `WatchlistRow` 참조)**: `[순위 24px] [종목명+코드 flex] [순매수 금액+수량 우정렬] [등락률 우정렬]`. 데스크탑은 4영역, 모바일은 등락률을 종목명 줄 아래로 내려 2줄 압축 가능(폭 부족 시).
- **컨테이너 최대폭**: 홈 메인 영역(`main-max-w` 1152px) 안 — 본 카드는 추가 max-width 두지 않고 홈 그리드 폭을 따른다.

### 표면 B — 종목 상세 "수급" 섹션 (`StockProfilePage` 트리)

- **배치**: 종목 상세의 시세·차트 섹션 흐름에 **append**되는 단일 `.card`. 기존 섹션 간격 재사용.
- **구조(상→하)**: ① 섹션 제목 "수급" + "최근 N일(영업일)" 라벨(`card-section-meta`) → ② **주체별 합계 요약 3칸**(개인/외국인/기관 — 최근 N일 순매수 합, `flow-summary-cell`) → ③ **일자별 표**(`flow-table-*`).
- **합계 요약 3칸**: 데스크탑 `lg:grid-cols-3`, 모바일 가로 1행 3칸 유지(narrow 시 2줄 wrap 허용). 각 칸 = 주체 라벨(`flow-summary-label`) + 순매수 합(부호색) + `badge-signal-up`/`badge-signal-down`.
- **일자별 표**: 컬럼 = `[일자] [종가·전일대비] [개인] [외국인] [기관]`. 각 주체 셀은 금액(주) + 수량(보조 caption). 표는 `flow-table-min-w`(520px) 이상 — 모바일에서 폭이 모자라면 **가로 스크롤**(컬럼 압축 대신 스크롤로 정확도 유지). 헤더 `flow-table-header` sticky 권장.
- **표현 결정(q2 R1)**: v1은 **합계 요약 + 일자별 표** 조합. 미니차트는 후속(주체 3계열 막대는 모바일 과밀 위험). 화면 노출은 **최근 10~20일로 절단**(카피 "최근 N일" 동적 표기), API가 더 주면 보관만.

### 공통

- 모든 행/셀 패딩은 `table-cell-px`(12px), 행 높이 `table-row-h`(48px = 터치 타깃 44px 초과). 순위 배지 24px(`rank-badge-w`).
- 반응형 전환은 Tailwind `md:`/`lg:` prefix 1차, JS 분기는 `useBreakpoint`. `window.innerWidth` 직접 검사 금지(AC-7).

## Elevation & Depth

평면 카드 시스템(토스톤) 유지. 그림자 신규 토큰 없음 — `.card` 라운드(`rounded.lg` 16px)와 라이브 source 의 `border-line`(행 구분선)만으로 위계를 만든다. 행 hover 는 색 변화(`rank-row-hover` = `surface-muted`)로만 표현(상승 그림자 금지, 평면 유지).

## Shapes

- **`rounded.lg` (16px)** — 카드 셸(`.card`).
- **`rounded.md` (12px)** — 합계 요약 박스(`flow-summary-cell`).
- **`rounded.sm` (8px)** — 순위 배지, "더보기" 토글, 스켈레톤, 빈/에러 상태.
- **`rounded.pill` (999px)** — 합계 요약 배지(`badge-signal-up`/`badge-signal-down`), mock 태그.

## Components

### 표면 A — 랭킹 행

- **`card`** — 표면 A 컨테이너 셸. 섹션 제목 + 2열 컬럼을 담는다.
- **`card-section-header`** — "외국인·기관 순매수 Top10"(`h2`). **`card-section-meta`** — "당일 · 기준 시각 14:30"(`caption`, q3·AC-9 7일 누적 오인 방지).
- **`rank-row` / `rank-row-hover`** — 랭킹 한 행(클릭 → `/stock/[ticker]`). hover 시 `surface-muted`. 키보드 포커스 가능(`role="row"` + `tabindex`, Enter/Space 이동 — 접근성).
- **`rank-badge` / `rank-badge-top`** — 순위 숫자. 1~3위는 `rank-badge-top`(`accent-soft`×`primary`)으로 강조, 4위 이하 `rank-badge`(`surface-muted`×`text-muted`).
- **`rank-name`(종목명, `body-sm-strong`) / `rank-code`(코드, `caption`)** — 종목 식별. 종목명은 `hts_kor_isnm`, 없으면 `pickStockName`.
- **`netbuy-amount-up` / `netbuy-amount-down`** — 순매수 거래대금(주 표시, `mono-numeric`). 부호색. 단위 "OO억원"으로 환산 표기(`*_tr_pbmn` 백만원 → 억원, 카피에 단위 접미).
- **`netbuy-qty`** — 순매수 수량 병기("N주", `caption`·`text-muted`, 금액 아래/옆 보조).
- **`signal-up-text` / `signal-down-text`** — 행의 등락률(`prdy_ctrt`, 부호색).
- **`show-more-toggle` / `show-more-toggle-hover`** — 모바일 Top5 → Top10 확장("더보기 5개"). 데스크탑 미노출.

### 표면 B — 수급 표

- **`card`** — 표면 B "수급" 섹션 셸.
- **`card-section-header`** — "수급"(`h2`). **`card-section-meta`** — "최근 N일(영업일) · 당일치는 장 종료 후 반영"(AC-9).
- **`flow-summary-cell` / `flow-summary-label`** — 주체별(개인/외국인/기관) 최근 N일 순매수 합 요약 칸. 라벨(`caption`) + 합계(부호색 `body-strong`/`mono-numeric`).
- **`badge-signal-up` / `badge-signal-down`** — 합계 요약 칸의 순매수/순매도 결과 배지.
- **`flow-table-header`** — 일자별 표 헤더(`label-sm`, `surface-muted`, sticky 권장).
- **`flow-table-row`** — 일자별 한 행(`table-cell-numeric`). 주체 금액 셀은 부호색(`netbuy-amount-up`/`netbuy-amount-down` 톤), 수량은 `netbuy-qty` 보조.
- **`flow-date-cell`** — 일자(`stck_bsop_date`, `caption`·`text-muted`).

### 공통 상태

- **`skeleton-block`** — 로딩. 표면 A는 행 5~10개(순위·종목·금액 자리), 표면 B는 합계 3칸 + 표 행 5~7개(`animate-pulse`는 frontend-dev).
- **`empty-state`** — 빈상태(`body-sm`·`text-muted`). 표면 A: "아직 당일 외국인·기관 수급 집계 전이에요(첫 갱신 09:30~)". 표면 B: "아직 수급 데이터가 없어요(미집계·신규 상장)".
- **`error-state`** — KIS 5xx·타임아웃(`critical-soft`×`critical`). "수급 정보를 불러오지 못했어요. 다시 시도해 주세요." + 재시도 동선(기존 stock 도메인 에러 카피 재사용).
- **`mock-tag`** — `X-Data-Source: mock`일 때만 섹션 제목 옆 소형 태그("샘플"). prod 라이브 미노출. 개발·preview 레이아웃 검증용.

## Do's and Don'ts

- ✅ 순매수 부호로 색 결정: 양수=`netbuy-amount-up`(빨강), 음수=`netbuy-amount-down`(파랑), 0=`text-muted`. 등락률도 동일 규칙.
- ✅ 금액은 주 표시(`mono-numeric` tnum), 수량은 보조(`netbuy-qty` caption). 거래대금 정렬 기준 명시(표면 A).
- ✅ "당일"(표면 A) / "최근 N일"(표면 B) 라벨을 `card-section-meta`로 항상 노출 — 7일 누적 오인 방지(AC-9).
- ✅ 모바일은 표면 A Top5 절단 + `show-more-toggle`, 표면 B는 표 가로 스크롤(컬럼 압축 금지).
- ✅ 행 클릭은 `role`/`tabindex` + 키보드(Enter/Space) 접근. 랭킹 리스트는 `role="list"`/`role="row"`.
- ✅ 모든 색·간격은 토큰 참조(`{colors.signal-up}`, `{spacing.table-row-h}`)로만. mock 식별은 `mock-tag`로.
- ❌ 신규 색·hex 직타 금지(`signal-up`/`signal-down` 외 등락색 신설 금지). 차트 채택(후속) 시 `chart-*` 토큰 정합.
- ❌ 표면 A에 과거일자/직전 영업일 백필 UI 추가 금지(API 당일만 — 비목표).
- ❌ 표면 B 미니차트·캔들 오버레이를 v1에 넣지 않는다(후속). 합계+표 우선.
- ❌ 독립 `/supply-demand` 페이지·nav 항목·새 사이드바 슬롯 추가 금지(AC-12).
- ❌ 모바일에서 표 셀 폭을 강제 축소해 숫자를 줄바꿈/절단하지 않는다(정확도 우선 → 가로 스크롤).

## OPEN QUESTION 결정 (디자이너 영역)

PRD §9 q1~q3 중 디자인 결정 영역. q1(표면 A `0000` 합산 동작)은 prod spike·구현 영역이라 디자인 결정 없음.

| ID | PRD 항목 | 결정 | 근거 |
|---|---|---|---|
| R1 | q2 — 표면 B 표현(표 vs 미니차트) | **합계 요약 3칸 + 일자별 표** 채택(v1). 미니차트 후속. | 개인/외국인/기관 × 금액·수량은 표가 가장 정확·구현 경량. 막대 3계열은 모바일 과밀. 토스톤 가독성상 상단 "주체별 최근 N일 순매수 합" 요약 1줄로 핵심 신호를 먼저 전달하고, 일자별 디테일은 표로. |
| R2 | q3(b) — 표면 A 홈 카드 위치 | **지수 카드 바로 아래**(공포탐욕·공시 위). | 발굴 동선상 "지수로 시장 분위기 → 수급으로 종목 발굴 → 클릭 상세"가 자연스러운 연속 흐름. 지수 다음이 수급의 최적 진입점. |
| R3 | q3(a) — 표면 A 모바일 절단/더보기 | **모바일 각 주체 Top5 절단 + "더보기"로 Top10 확장**(데스크탑 Top10 유지). | 모바일 세로 스택 시 외국인 10 + 기관 10 = 20행은 과도. Top5 절단으로 첫 스크롤 부담을 줄이고, 관심 시 `show-more-toggle`로 확장. 토스톤(정보 밀도 높되 빠른 조작) 정합. |
| R4 | q2 — 표면 B 노출 N값 | **최근 10~20일 절단 노출**(API 제공분은 보관, 카피 "최근 N일" 동적 표기). | API가 ~30일 전후를 줘도 표 20행 초과는 과밀. 절단으로 가독 유지, 누적 오인 방지 라벨 동반. |
