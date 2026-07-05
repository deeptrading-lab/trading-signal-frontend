---
version: alpha
name: trending-sectors
description: >-
  마켓 홈 신규 "지금 뜨는 산업" 섹션 + (실현 시) 구성종목 모달 디자인 가이드. 업종을 등락률로 정렬한 랭킹
  리스트가 실시간 순위·순매수와 형제로 렌더된다. 각 행 = 순번 + 업종명 + 등락률(부호색) + "N개 중 M개 상승"
  요약. 아이콘/이모지·해외 업종은 후속(§비범위)이라 **순번·업종명·등락·종목수 텍스트 중심**으로 완결한다.
  핵심 설계 원칙은 **리스트 섹션의 자족성**이다 — 구성종목 모달은 API 실현성(PRD AC-0 spike)에 따라 이번
  PR 에서 빠질 수 있으므로, 리스트만으로도 완결된 섹션이 되게 하고 모달은 별도 절("실현 시 적용")로 분리한다.
  모달은 기존 모달/세그먼트/`MiniStockChart` 자산 재사용이라 후속에도 재활용된다. 세그먼트는 토스 원본의
  4탭(수익률/시가총액/매출/영업이익률)을 **수익률·시가총액 2개로 축소**한다(매출·영업이익률은 DART 의존
  비범위). 신규 색 토큰 0 — `finsight-redesign` 라이브 토큰만 재사용(등락 의미색 `signal-up`/`signal-down`,
  중립 `surface-muted`/`text-muted`/`primary`/`accent-soft`). KIS 실패 시 점검 상태는 `market-status-aware-home`
  의 공용 `MaintenanceNotice`(중립 muted, "현재 점검 중이에요")를 그대로 재사용하고, 로딩 스켈레톤·빈 랭킹·
  빈 구성종목 상태를 정의한다. 반응형 두 뷰포트(`md:` + `useBreakpoint`), 종목코드 미표시, hex/px 직타 0,
  WCAG AA 4.5:1 무회귀. PRD `trending-sectors` §3-7 · AC-1~AC-8·AC-11 충족.
colors:
  primary: "#1f3b4d"
  surface: "#ffffff"
  surface-muted: "#f6f8fa"
  border-line: "#eceff3"
  text-strong: "#0f1419"
  text-muted: "#5b6470"
  accent-soft: "#eaf0f6"
  signal-up: "#c81e1e"
  signal-up-soft: "#fee2e2"
  signal-down: "#1d4ed8"
  signal-down-soft: "#dbeafe"
typography:
  h2:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 17px
    fontWeight: 700
    lineHeight: 1.35
  body-strong:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.5
  body-sm:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  label-sm:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.25
  tab-label:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.2
  table-cell-numeric:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tnum"
rounded:
  sm: 8px
  md: 12px
  lg: 13px
  xl: 24px
  pill: 999px
spacing:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 18px
  card-px: 16px
  table-row-h: 42px
  sector-row-h: 56px
  button-sm-h: 32px
  rank-badge-w: 24px
  main-max-w: 1152px
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
components:
  section-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-px}"
  section-title:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.h2}"
    padding: 0px
  section-caption:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  sector-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-strong}"
    height: "{spacing.sector-row-h}"
    padding: "{spacing.sm}"
  sector-row-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  rank-badge:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    width: "{spacing.rank-badge-w}"
    height: "{spacing.rank-badge-w}"
  sector-name:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-strong}"
    padding: 0px
  change-up:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-up}"
    typography: "{typography.table-cell-numeric}"
    padding: 0px
  change-down:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-down}"
    typography: "{typography.table-cell-numeric}"
    padding: 0px
  breadth-summary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  divider:
    backgroundColor: "{colors.border-line}"
    height: 1px
  skeleton-row:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.sm}"
    height: "{spacing.sector-row-h}"
  empty-state:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.body-sm}"
    padding: "{spacing.lg}"
  modal-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-px}"
  modal-hero:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  modal-hero-title:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    typography: "{typography.h2}"
    padding: 0px
  modal-hero-meta:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  segment-tab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.tab-label}"
    rounded: "{rounded.sm}"
    height: "{spacing.button-sm-h}"
    padding: "{spacing.md}"
  segment-tab-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.tab-label}"
    rounded: "{rounded.sm}"
    height: "{spacing.button-sm-h}"
    padding: "{spacing.md}"
  period-return-card:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  period-return-label:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  constituent-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-sm}"
    height: "{spacing.table-row-h}"
    padding: "{spacing.sm}"
  constituent-name:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-sm}"
    padding: 0px
  constituent-price:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.table-cell-numeric}"
    padding: 0px
  minichart-up:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-up}"
    padding: 0px
  minichart-up-fill:
    backgroundColor: "{colors.signal-up-soft}"
  minichart-down:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-down}"
    padding: 0px
  minichart-down-fill:
    backgroundColor: "{colors.signal-down-soft}"
  pagination-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    height: "{spacing.button-sm-h}"
    padding: "{spacing.sm}"
  pagination-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    height: "{spacing.button-sm-h}"
    padding: "{spacing.sm}"
---

# trending-sectors 디자인 가이드

## Overview

한국 개인 투자자는 종목을 고르기 전에 **"지금 어떤 산업이 통째로 움직이는가"** 를 먼저 본다(섹터 로테이션).
현재 마켓 홈은 지수 스트립·실시간 순위·순매수·공포탐욕은 있으나 **업종(섹터) 관점의 진입로가 없다**. 이 가이드는
마켓 홈에 **"지금 뜨는 산업" 섹션**(업종 등락 랭킹 리스트)을 실시간 순위·순매수와 형제로 얹고, 업종을 누르면
(실현 시) **구성종목 모달**을 여는 시각 규칙을 정의한다.

핵심 방향은 세 가지다.

- **리스트 섹션은 자족적이다 (최우선 원칙).** 구성종목 모달은 PRD **AC-0(데이터 계층 실측 spike)** 결과에 따라
  이번 PR 에서 빠질 수 있다(§9 q2, 방식 C). 그러므로 랭킹 리스트는 **모달 없이도 완결**되게 설계한다 — 리스트
  행 자체가 "업종명 · 등락률 · N개 중 M개 상승" 으로 한 산업의 상태를 다 말한다. 모달은 아래 **"실현 시 적용"**
  절로 완전히 분리했다. 모달이 빠져도 리스트 섹션의 시각·상태 정의는 무손상으로 남는다.
- **텍스트 중심, 아이콘 후속.** 토스 원본은 업종별 이모지/일러스트를 쓰지만, 우리 스코프는 로고와 동일한 보류
  이슈(라이선스·매핑 부재)가 있어 **순번 배지 + 업종명 + 등락률 + 종목수 요약** 의 텍스트 리스트로 시작한다.
  아이콘 슬롯은 레이아웃상 좌측 여유를 남겨 두되 이번엔 순번 배지가 그 자리를 대신한다(후속에 이모지로 교체 가능).
- **신규 색 토큰 0개.** 등락은 앱 전역 관례(`signal-up` 빨강=상승 / `signal-down` 파랑=하락)를 그대로 쓰고,
  나머지는 `surface`·`surface-muted`·`text-strong`·`text-muted`·`primary`·`accent-soft`·`border-line` 재사용.
  KIS 실패 시 점검 안내는 `market-status-aware-home` 의 공용 `MaintenanceNotice`(중립 muted)를 재사용한다 —
  본 섹션 전용 에러 UI 를 새로 만들지 않는다. 종목코드는 어디에도 노출하지 않는다(앱 전역 관례).

## Colors

색은 **신규 토큰을 만들지 않고** `finsight-redesign` 라이브 토큰을 참조한다(`design:sync` SSOT 는
`finsight-redesign.md` 하나 — 이 문서 front matter 의 재선언은 lint 참조 해소용 동일값이다). frontend-dev 는
`text-signal-up`·`bg-surface-muted`·`text-primary` 같은 이미 존재하는 유틸을 그대로 호출한다.

- **상승 = `signal-up`(#c81e1e, 빨강) · 하락 = `signal-down`(#1d4ed8, 파랑)**: 업종 행의 등락률(`+10.4%` /
  `-2.1%`)과 구성종목 등락에 쓰는 유일한 유채색. 한국 개인 투자자 멘탈모델(상승=빨강/하락=파랑)에 직결한다.
  두 원색 모두 흰 `surface` 위에서 AA(4.5:1) 검증된 값이라 **텍스트는 항상 흰 배경 위**에 놓는다.
- **soft 페어(`signal-up-soft`#fee2e2 / `signal-down-soft`#dbeafe)**: 구성종목 미니차트의 **면(area) 채움
  전용**. soft 색 위에 원색 텍스트를 얹지 않는다(대비 저하 회피 — `toss-orderbook` 과 동일 원칙). 미니차트
  선(stroke)은 원색, 그 아래 옅은 면만 soft. 랭킹 리스트에는 soft 를 쓰지 않는다(텍스트 중심 유지).
- **업종명·종목명·현재가 = `text-strong`(#0f1419)**: 리스트/모달의 1차 정보. 흰 배경 위 최고 대비로 스캔성
  확보.
- **순번·종목수 요약·메타 = `text-muted`(#5b6470)**: "N개 중 M개 상승"·"N개 회사 · N개 ETF"·순번 배지 텍스트.
  등락률(유채색)·업종명(강조)보다 한 위계 낮춘 회색. 흰/`surface-muted` 위 대비 ≥5.6:1 로 AA 충족.
- **순번 배지·행 hover·모달 히어로·기간수익률 카드 = `surface-muted`(#f6f8fa)**: 흰 위에서 아주 옅게 한 단
  눌러 "구분/강조 영역"을 조용히 신호한다. 카드리스(화이트포워드) 홈 톤에 맞춰 테두리·그림자 대신 명도차만 쓴다.
- **세그먼트 활성 탭·페이지네이션 활성 = `accent-soft`(#eaf0f6) 배경 + `primary`(#1f3b4d) 텍스트**: 정렬 탭
  (수익률/시가총액)과 페이지 번호의 선택 상태. 회청 배경 + 슬레이트 텍스트로 대비 ~11:1, 시끄러운 CTA 색을
  쓰지 않는다(정렬 전환은 강조가 아니라 상태 표시).
- **구분선 = `border-line`(#eceff3)**: 리스트 행 사이·모달 섹션 경계의 1px 선.
- **점검 상태에 빨강 없음**: KIS 실패는 `MaintenanceNotice`(중립 muted)로 흡수한다. `critical`(빨강 에러) 계열은
  이 화면에서 등장하지 않는다 — `market-status-aware-home` 의 "점검은 에러가 아니라 대기" 원칙을 답습.

## Typography

- **섹션 제목 = `h2`(17px/700)**: "지금 뜨는 산업" 섹션 헤더. 실시간 순위·순매수 섹션 제목과 동급 위계.
- **업종명 = `body-strong`(16px/700)**: 리스트 행의 1차 텍스트. 굵게 눌러 스캔 시선을 잡는다.
- **등락률·현재가 = `table-cell-numeric`(14px/700, tnum)**: 숫자 폭 고정(tnum)으로 등락률/가격이 자릿수 기준
  세로 정렬된다. 유채색(등락) 또는 `text-strong`(가격)과 결합.
- **종목수 요약·메타·순번 = `caption`(12px/400) / `label-sm`(13px/700)**: "N개 중 M개 상승"·"N개 회사"는
  `caption`, 순번 배지·페이지 번호는 `label-sm`(작지만 또렷). 업종명 아래 한 단 낮춘 위계.
- **정렬 탭 = `tab-label`(14px/700)**: 세그먼트 컨트롤(수익률/시가총액) 라벨. 활성=`primary`, 비활성=`text-muted`
  (색으로 활성 구분). 탭 개수가 2개로 고정이라 라벨 크기는 항상 동일.
- **모달 히어로 제목 = `h2`(17px/700)**: 업종명 대표 타이틀. 토스 원본의 큰 이모지/일러스트는 후속이라 텍스트
  타이틀이 히어로의 중심이다.
- 종목코드·숫자 이외 tnum 은 쓰지 않는다(리스트 라벨은 비례폭 유지).

## Layout

### "지금 뜨는 산업" 섹션 (`TrendingSectorsSection`) — 자족 리스트

- **섹션 골격**: `[섹션 헤더: 제목 + 보조 캡션] → [랭킹 리스트(행 N개)] → (빈/로딩/점검 상태 대체)`. 실시간
  순위·순매수와 동일한 `section-panel`(흰 카드, `rounded.lg`, `card-px` 패딩) 안에 담긴다.
- **행(`sector-row`) 내부 = 좌우 2열**:
  - **좌열**: `[순번 배지] [업종명]` — 순번 배지(`rank-badge`, 24×24 `surface-muted` 사각, `label-sm`)가
    토스 원본의 아이콘 자리를 대신한다(후속에 이모지로 교체 가능). 업종명은 `body-strong`.
  - **우열(우측 정렬, 세로 2줄)**: 위 = **등락률**(`change-up`/`change-down`, 부호색·tnum), 아래 = **종목수
    요약**("N개 중 M개 상승", `breadth-summary` `caption` `text-muted`). 등락과 요약을 우측에 세로로 쌓아
    한 행에서 "얼마나 · 얼마나 넓게" 두 정보를 함께 읽게 한다.
- **행 높이 = `sector-row-h`(56px)**: 우열이 등락률+요약 2줄이라 기본 `table-row-h`(42px)로는 좁다. 2줄을
  세로 중앙 정렬로 담으려면 ~56px 가 필요해 `sector-row-h` 한 키를 신규 도입한다(`finsight-redesign` SSOT
  병합은 frontend-dev 영역, 그 외 색·라운드는 전부 기존 토큰). 행 사이는 `divider`(1px `border-line`) 또는
  여백으로 구분.
- **행 상호작용**: hover 시 `sector-row-hover`(`surface-muted` 배경 + `rounded.md`)로 한 단 눌러 클릭 가능
  어포던스를 준다. 클릭 → 구성종목 모달(실현 시) 또는 **모달 미실현 시 행은 비인터랙티브(hover 없음)** 로
  강등한다 — 리스트가 자족적이므로 모달이 빠져도 "누를 게 없는데 눌리는" 헛클릭을 만들지 않는다.
- **표시 개수**: 랭킹 상위 N개(권고 10개)를 등락률 내림차순으로. 더보기/페이지네이션은 리스트에 두지 않는다
  (섹션은 요약 진입점 — 전체 탐색은 후속).

### 구성종목 모달 (`SectorConstituentsModal`) — 실현 시 적용

> 이 절은 PRD **AC-0 spike 에서 구성종목 조회가 실현될 때만** 적용된다(§9 q2 방식 A/B). 실현되지 않으면
> 이번 PR 에서 통째로 빠지고, 리스트 섹션만 shipping 된다. 모달은 기존 모달/시트·세그먼트·`MiniStockChart`
> 자산 재사용이라 후속 PR 에도 그대로 재활용된다. 상세는 아래 **Components** 와 **핸드오프 명세** 참조.

- **모달 골격**: `[히어로] → [세그먼트 탭] → (실현 시)[기간수익률 카드] → [구성종목 리스트] → [페이지네이션]`.
  - **히어로(`modal-hero`)**: `surface-muted` 블록. 업종명(`modal-hero-title` h2) + 등락률(부호색) +
    메타("N개 회사 · N개 ETF", `modal-hero-meta`). 토스 원본의 큰 이모지는 후속 — 텍스트 타이틀이 히어로.
  - **세그먼트 탭**: **수익률 / 시가총액 2개**(`SectorConstituentSort`). 토스 원본의 4탭(+ 매출/영업이익률)에서
    **매출·영업이익률은 DART 의존 비범위** 라 축소했다. 세그먼트는 `segment-tab`/`segment-tab-active`(정렬
    상태 표시). 2개뿐이라 탭바 폭은 고정.
  - **기간수익률 카드(`period-return-card`, 실현 시 조건부)**: 업종지수 기준 어제/1개월/3개월/1년 수익률.
    업종지수 시계열 확보 시에만 렌더(PRD "가능하면 포함, 아니면 후속"). 데이터 없으면 **카드 자체를 렌더하지
    않는다**(빈 placeholder 없음) — 모달의 나머지(리스트)는 무손상.
  - **구성종목 리스트**: 각 행(`constituent-row`) = `[종목명] [미니차트] [현재가] [등락]`. 종목명 좌측,
    미니차트(`MiniStockChart` 재사용, 등락 방향에 따라 up/down 색) 중앙, 현재가·등락 우측. 행 클릭 →
    `/stock/[ticker]` 이동(기존 라우팅). 행 높이 = `table-row-h`(42px, 1줄).
  - **페이지네이션**: 구성종목이 많으면 `pagination-button`/`pagination-active`. 적으면 미렌더.

### 반응형 (모바일·태블릿·데스크탑, `useBreakpoint`)

| 뷰포트 | 리스트 섹션 | 구성종목 모달(실현 시) |
|---|---|---|
| **데스크탑 (≥ `lg` 1024px)** | `main-max-w`(1152px) 컨테이너 안, 홈 grid 에서 실시간 순위·순매수와 형제 컬럼. 행 좌우 2열 여유. 국내/해외 2열 병치는 **해외 후속**이라 이번엔 국내 1열(2열 자리는 후속에 우측 컬럼 추가). | 중앙 다이얼로그(고정 최대폭, 약 480~560px). 히어로·세그먼트·리스트 세로 스택. |
| **태블릿 (`md`~`lg`)** | 동일 1열. 폭 여유로 행 2열 유지. | 다이얼로그 폭 축소, 내부 무변경. |
| **모바일 (< `md` 768px)** | 섹션 폭 100%(1열). 행은 `flex`, 우열(등락+요약)이 좁아지면 요약을 등락 아래로 세로 유지(줄바꿈 금지·잘림 방지). 좌우 패딩 유지. **국내/해외 2열은 세로 스택**(해외 실현 시). | **바텀시트**(하단에서 슬라이드 업, `rounded.xl` 상단 코너). 히어로·세그먼트·리스트 세로 풀폭. 미니차트는 폭에 맞춰 축소. |

- **국내/해외 2열 → 모바일 세로 스택**: 토스 원본은 국내/해외를 나란히 두지만 **해외는 후속**이라 이번엔 국내만.
  후속에 해외가 붙으면 데스크탑 2열·모바일 세로 스택(`md:grid-cols-2` + 모바일 `grid-cols-1`)으로 확장한다.
  이번 PR 은 국내 1열로 시작하되 레이아웃을 2열 확장 가능한 grid 로 짠다(후속 무리팩터).
- **컨테이너 최대폭·grid 배치·sidebar 정책**은 마켓 홈 기존 레이아웃을 상속(본 PR 무변경). 섹션은 홈 grid 의
  한 칸을 차지하고, 모달/시트는 셸 위 오버레이라 sidebar 와 무관하다.
- **JS 분기는 `useBreakpoint`**(`window.innerWidth` 직접 검사 금지). 모달 vs 바텀시트 전환, 행 우열 세로화
  임계만 `isMobile` 로 판단. Tailwind `md:`/`lg:` prefix 1차 병행.

## Elevation & Depth

- **리스트 섹션은 그림자 없는 플랫**: 홈이 카드리스(화이트포워드) 톤이라 `section-panel` 은 카드 그림자 한 겹
  (`finsight-redesign` 카드 관례)까지만, 개별 행은 그림자 없이 `surface-muted` hover 명도차만으로 상태를 준다.
- **모달/바텀시트만 elevation**: 오버레이는 배경 dim + 시트 그림자로 한 겹 떠 있다(기존 모달 관례 재사용).
  히어로·기간카드는 시트 안에서 `surface-muted` 명도차만, 추가 그림자 없음.
- **미니차트는 배경 레이어**: soft 면 채움은 선(stroke) 아래 z-index, 그림자 없음.
- 순번 배지·세그먼트 탭·페이지 번호도 전부 플랫(명도차·라운드로만 구분).

## Shapes

- 섹션 패널·모달 히어로: `rounded.lg`(13px) — 앱 카드/섹션 표준.
- 모달 시트/바텀시트: `rounded.xl`(24px) — 오버레이 컨테이너는 한 단 큰 라운드(시트 관례).
- 순번 배지·세그먼트 탭·페이지 번호·스켈레톤: `rounded.sm`(8px).
- 행 hover·기간수익률 카드: `rounded.md`(12px).
- 순번 배지는 사각(`rank-badge` 24×24 `rounded.sm`) — 원형 pill 은 순위 숫자 정렬을 해쳐 쓰지 않는다.
  `pill`(999px) 토큰은 이 화면에서 미사용(정렬 우선). 각진 직각·과한 라운드도 지양.

## Components

### 리스트 섹션 (자족 — 항상 포함)

- `section-panel` / `section-title` / `section-caption`: 섹션 컨테이너 + "지금 뜨는 산업" 제목 + 보조 캡션
  (예: "업종별 등락 랭킹"). 실시간 순위 섹션과 동일 톤.
- `sector-row` / `sector-row-hover`: 업종 랭킹 행. hover 는 `surface-muted` + `rounded.md`. **모달 미실현 시
  hover 제거**(비인터랙티브 강등).
- `rank-badge`: 순번(1·2·3…) 배지. `surface-muted` 24×24 사각, `text-muted` `label-sm`. 아이콘 자리 대행.
- `sector-name`: 업종명(`body-strong`, `text-strong`). 종목코드 미표시.
- `change-up` / `change-down`: 등락률(`+10.4%` 빨강 / `-2.1%` 파랑), `table-cell-numeric` tnum, 흰 배경 위.
- `breadth-summary`: "N개 중 M개 상승" 요약(`caption`, `text-muted`). 등락과 함께 한 행에서 "폭"을 전달.
  색맹 접근성: 등락은 색+부호(±)로, 요약은 텍스트로 이중 인코딩(색만으로 방향 판단하지 않게).
- `divider`: 행 사이·섹션 경계 1px 선(`border-line`).
- `skeleton-row`: 로딩 스켈레톤(`surface-muted`, `sector-row-h` 높이, N줄 반복).
- `empty-state`: 빈 랭킹 안내(`text-muted`, `body-sm`) — "표시할 업종이 없어요".
- **점검 상태는 공용 `MaintenanceNotice` 재사용**: KIS 실패(전체 실패) 시 이 섹션은 자체 에러 UI 대신
  `market-status-aware-home` 의 `components/market/MaintenanceNotice.tsx`(중립 muted, "현재 점검 중이에요")를
  렌더한다. 재시도는 관리자만(그 컴포넌트의 `isAdmin`/`onRetry` 규약 그대로). 본 문서는 이 컴포넌트를 재정의하지
  않는다(SSOT = `market-status-aware-home.md`).

### 구성종목 모달 (실현 시 적용 — AC-0 결과에 따라 이번 PR 에서 빠질 수 있음)

- `modal-sheet`: 다이얼로그(데스크탑)/바텀시트(모바일) 컨테이너. `rounded.xl`, `card-px` 패딩. 기존 모달/시트
  관례 재사용.
- `modal-hero` / `modal-hero-title` / `modal-hero-meta`: 히어로 블록(`surface-muted`) — 업종명 + 등락률
  (부호색) + "N개 회사 · N개 ETF" 메타. 큰 이모지/일러스트는 후속.
- `segment-tab` / `segment-tab-active`: 정렬 세그먼트(**수익률 / 시가총액 2개**). 활성=`accent-soft`+`primary`,
  비활성=`surface`+`text-muted`. 매출·영업이익률 탭은 비범위(DART 후속).
- `period-return-card` / `period-return-label`: 기간수익률 카드(어제/1개월/3개월/1년, 업종지수 기준). **실현
  시 조건부** — 시계열 없으면 미렌더.
- `constituent-row` / `constituent-name` / `constituent-price`: 구성종목 행 — 종목명·현재가(+등락은
  `change-up`/`change-down` 재사용)·미니차트. 클릭 → `/stock/[ticker]`.
- `minichart-up` / `minichart-up-fill` / `minichart-down` / `minichart-down-fill`: 구성종목 미니 스파크라인
  (`MiniStockChart` 재사용). 선 = 원색(`textColor`), 면 채움 = soft(배경 전용, 텍스트 얹지 않음). 상승=up 색,
  하락=down 색.
- `pagination-button` / `pagination-active`: 구성종목 페이지 이동. 활성=`accent-soft`+`primary`. 소수면 미렌더.
- 모달의 로딩/빈/실패 상태: 로딩=`skeleton-row` 재사용, 빈 구성종목=`empty-state`("구성종목이 없어요"),
  전체 실패=`MaintenanceNotice` 재사용.

## Do's and Don'ts

- ✅ **리스트 섹션을 자족적으로** 설계한다 — 행 자체가 "업종명 · 등락률 · N개 중 M개 상승" 으로 완결. 구성종목
  모달이 빠져도(AC-0 미실현) 섹션은 무손상.
- ✅ 등락은 **`signal-up`(빨강=상승) / `signal-down`(파랑=하락)** 관례 그대로. 부호(±)를 함께 표기해 색+텍스트
  이중 인코딩(색맹 접근성).
- ✅ 세그먼트는 **수익률 / 시가총액 2개로 축소**한다(매출·영업이익률은 DART 후속 비범위).
- ✅ 점검(KIS 실패)은 **공용 `MaintenanceNotice`(중립 muted)** 재사용 — 본 섹션 전용 에러 UI 를 만들지 않는다.
- ✅ 로딩·빈 랭킹·빈 구성종목 상태를 항상 분기하고, 데이터가 없어도 레이아웃이 무너지지 않게 한다(NaN 방어).
- ✅ 국내/해외 2열은 **모바일에서 세로 스택**(해외는 후속이라 이번엔 국내 1열, grid 는 2열 확장 가능하게).
- ✅ 한글 카피는 `lib/copy/market/sectors.ts` 단일 위치, 색·간격은 토큰만(`cn` 헬퍼), 반응형은 `md:`/`lg:` +
  `useBreakpoint`.
- ❌ 구성종목 모달을 **리스트 섹션의 전제 조건으로 엮지 않는다**(모달 미실현 시 리스트만으로 shipping — 모달
  미실현이면 행 hover/클릭 어포던스를 제거).
- ❌ soft 색(`signal-up-soft`/`signal-down-soft`) **위에 원색 텍스트를 얹지 않는다**(미니차트 면 채움 전용).
- ❌ 점검·에러에 **빨강·경고색을 쓰지 않는다**(`critical` 금지 — 점검은 대기 상태, `MaintenanceNotice` 중립 톤).
- ❌ **종목코드·업종코드를 노출하지 않는다**(앱 전역 관례 — 업종명·종목명만). hex/px 직타 금지.
- ❌ 토스 원본의 업종 이모지/일러스트를 **이번 PR 에 억지로 넣지 않는다**(로고와 동일 보류 이슈 — 순번 배지로
  대행, 아이콘은 후속).

---

## 유저 시나리오 (태스크 플로우)

### S1. 마켓 홈에서 "지금 뜨는 산업" 스캔 (리스트 — 항상)

1. 사용자가 마켓 홈 진입 → 실시간 순위·순매수 아래(또는 형제 컬럼)에 "지금 뜨는 산업" 섹션 렌더.
2. 진입 직후 **로딩**(스켈레톤 N줄) → 첫 응답 도착 시 랭킹 리스트로 교체.
3. 등락률 내림차순 상위 N개 업종을 본다. 각 행 = `[순번][업종명]` … `[+10.4%][5개 중 5개 상승]`.
4. "지금 반도체가 통째로 오르는구나"를 한 행에서 읽는다(등락률=얼마나, 종목수 요약=얼마나 넓게).

### S2. 업종 클릭 → 구성종목 확인 (모달 — 실현 시)

1. (AC-0 실현 시) 업종 행 hover → `surface-muted` 강조 → 클릭 → 구성종목 모달/바텀시트 오픈.
2. 히어로에서 업종명·등락률·"N개 회사" 확인 → 세그먼트에서 **수익률 / 시가총액** 정렬 전환.
3. 구성종목 리스트에서 종목명·미니차트·현재가·등락을 스캔 → 관심 종목 행 클릭 → `/stock/[ticker]` 이동.
4. (AC-0 미실현 시) 이 시나리오는 이번 PR 에서 빠진다 — 행은 비인터랙티브, 리스트만으로 완결.

### S3. KIS 야간점검 / 실패 (점검 안내)

1. 평일 밤 KIS 전 TR 500 또는 일시 장애 → 섹션 전체 실패(unavailable).
2. 랭킹 리스트 대신 **공용 `MaintenanceNotice`**(회색 점 + "현재 점검 중이에요 · 잠시 후 다시 확인해 주세요").
3. 일반 사용자는 안내만(재시도 없음), 관리자만 "다시 시도". 다음 개장 시각 표기 없음(마감이 아니라 점검).

### S4. dev 로컬(KIS 미설정) — mock 정상 표시

1. 동료 로컬(무키) → `X-Data-Source: mock`(200) → available → **mock 업종 랭킹 정상 표시**.
2. "영구 점검중" 회귀 없음(mock 은 점검이 아니라 개발 편의 데이터).

### S5. 빈 랭킹 / 빈 구성종목

1. 랭킹이 비면 리스트 대신 `empty-state`("표시할 업종이 없어요"), 레이아웃 유지.
2. (모달 실현 시) 미매핑/빈 구성종목이면 모달에 `empty-state`("구성종목이 없어요"), 헤더·세그먼트는 유지.

---

## 핸드오프 명세 (화면별 상태)

frontend-dev 가 바로 구현 가능한 상태 매트릭스. 카피는 `lib/copy/market/sectors.ts` 신규 단일 위치. 점검 안내
카피는 `lib/copy/market/maintenance.ts`(기존 공용) 재사용. 색·간격 토큰만.

### 가용성 판정 규칙 (PRD §6, `market-status-aware-home` 답습)

- **available** = `isError=false` **AND** `dataSource ∈ {kis, mock}`
- **unavailable** = `isError=true`(502) **OR** `dataSource ∈ {mock-timeout, mock-error, mock-empty}`

### "지금 뜨는 산업" 섹션 상태 (`TrendingSectorsSection`) — 항상 포함

| 조건 | 렌더 | 카피(한글) |
|---|---|---|
| 첫 fetch pending | `skeleton-row` × N + 섹션 헤더 즉시 표시 | — (스켈레톤) |
| available · 랭킹 있음 | `sector-row` × N(등락률 내림차순). 각 행 순번·업종명·등락률·"N개 중 M개 상승" | 헤더 "지금 뜨는 산업" · 캡션 "업종별 등락 랭킹" |
| available · 랭킹 빈 배열 | `empty-state` 1블록. 헤더 유지 | 제목 "표시할 업종이 없어요" |
| unavailable (전체 실패) | 리스트 대신 공용 `MaintenanceNotice`(관리자면 "다시 시도") | `MAINTENANCE_TITLE`·`MAINTENANCE_SUPPLEMENT`(기존) |

- **모달 미실현(AC-0 실패) 시**: `sector-row` 는 hover/클릭 어포던스를 **제거**(비인터랙티브). 리스트는 조회
  전용으로 완결. 모달 실현 시에만 hover(`sector-row-hover`) + `onClick` 배선.

### 구성종목 모달 상태 (`SectorConstituentsModal`) — 실현 시 적용

| 조건 | 렌더 | 카피(한글) |
|---|---|---|
| 모달 오픈 · 첫 fetch pending | 히어로 즉시 + 리스트 자리 `skeleton-row` × N | — |
| available · 구성종목 있음 | 히어로 + 세그먼트(수익률/시가총액) + (조건부)기간카드 + `constituent-row` × N + 페이지네이션 | 세그먼트 "수익률"·"시가총액" |
| available · 구성종목 빈 배열 | 히어로·세그먼트 유지, 리스트 자리 `empty-state` | 제목 "구성종목이 없어요" |
| 미매핑 업종(방식 B 큐레이션 밖) | 동일 `empty-state` | 제목 "구성종목 정보를 준비 중이에요" |
| unavailable (전체 실패) | 리스트 자리 `MaintenanceNotice`(관리자면 "다시 시도") | `MAINTENANCE_TITLE`·`MAINTENANCE_SUPPLEMENT` |
| 기간수익률 시계열 없음 | `period-return-card` **미렌더**(빈 placeholder 없음), 나머지 정상 | — |

### 정렬(세그먼트) 규칙

- **수익률 탭**: 구성종목을 등락률(`changePct`) 내림차순. 기본 활성 탭.
- **시가총액 탭**: `marketCap` 내림차순. **`marketCap=null` 은 후순위**(맨 뒤로), 크래시·NaN 없음.
- 탭 전환은 클라이언트 재정렬(추가 fetch 없음). 활성 탭은 `segment-tab-active`.

### 행(row) 구현 스펙

- **`sector-row`**: `flex items-center justify-between`, 좌열 `[rank-badge][sector-name]`, 우열 세로 스택
  `[change][breadth-summary]`(우측 정렬). 높이 `sector-row-h`. 등락률 부호색은 `changePct` 부호로 분기
  (0 이상=up, 미만=down), tnum 정렬.
- **`constituent-row`**(실현 시): `flex items-center`, `[constituent-name][MiniStockChart][constituent-price][change]`.
  미니차트 색은 등락 방향(up/down)으로. 높이 `table-row-h`. 클릭 → `router.push('/stock/'+ticker)`.
- 숫자는 전부 파싱·NaN 방어(등락률·시총 null 가드). 등락 0% 는 `text-muted` 또는 up 취급(구현 재량, 부호 표기).

### 배선 규칙

- 가용성 판정 원천은 도메인 훅(`useQuerySectorRanking`·`useQuerySectorConstituents`)이 노출하는 `dataSource`
  + `isError`(PRD §3-6). 컴포넌트는 도메인 훅만 소비(`useQuery` 직접 import 금지 — `docs/rules/frontend.md`).
- 구성종목 조회는 **모달 열릴 때만** `enabled`(PRD §3-6, staleTime 30s). 리스트는 `staleTime` 30~60s, 폴링 없음.
- 점검 안내는 신규 컴포넌트를 만들지 않고 `components/market/MaintenanceNotice.tsx`(공용) 재사용 —
  `isAdmin`(`useIsAdmin()`)·`onRetry`(refetch) 규약 그대로.
- 미니차트는 `components/stock/MiniStockChart.tsx` 재사용(신규 시세 계층 최소화). 등락 방향으로 up/down 색 주입.
- 반응형: `md:`/`lg:` prefix 1차, `useBreakpoint` 로 모달↔바텀시트 전환·행 우열 세로화 임계만 판단.

---

## OPEN QUESTION 결정 (디자이너 영역)

PRD §9 중 디자이너 결정 영역(q6) + 스코프 축소·자족성에서 파생된 시각 결정.

| # | 항목 | 결정 |
|---|---|---|
| R1 | 리스트 자족성 (PRD §8·§9 q2 방식 C) | 랭킹 리스트를 **모달 없이 완결**되게 설계. 행 자체가 "순번·업종명·등락률·N개 중 M개 상승" 으로 한 산업 상태를 다 말한다. 모달 미실현(AC-0) 시 리스트만 shipping, 행은 비인터랙티브 강등(hover/클릭 제거). |
| R2 | 구성종목 모달 분리 | 모달은 **별도 절("실현 시 적용")로 완전 분리**. 실현 시에만 hover·클릭·모달 배선. 기존 모달/시트·세그먼트·`MiniStockChart` 자산 재사용이라 후속 PR 에도 재활용. |
| R3 | 세그먼트 축소 (PRD §4·q6) | 토스 원본 4탭(수익률/시가총액/매출/영업이익률) → **수익률·시가총액 2개**. 매출·영업이익률은 DART 의존 비범위(후속). 세그먼트 2개 고정폭. |
| R4 | 업종 행 요약 시각·부호색 (PRD q6) | 등락률 = `signal-up`(빨강)/`signal-down`(파랑) 부호색·tnum. "N개 중 M개 상승" = `text-muted` caption, 등락 아래 세로. 색+부호(±) 이중 인코딩(색맹 접근성). |
| R5 | 아이콘/이모지 유무 (PRD q6·§4) | 이번 PR **아이콘 없음** — 로고와 동일 보류 이슈. `rank-badge`(순번 사각 배지)가 좌측 아이콘 자리를 대행. 후속에 이모지로 교체 가능하게 슬롯 유지. |
| R6 | 점검/실패 UI | 신규 에러 UI 미제작 — `market-status-aware-home` 의 공용 **`MaintenanceNotice`(중립 muted)** 재사용. `critical`(빨강) 금지, 다음 개장 시각 표기 없음. 재시도 관리자만. |
| R7 | 미니차트 (PRD q6) | 구성종목 미니 스파크라인은 **`MiniStockChart` 재사용**. 선=등락 원색, 면 채움=soft(배경 전용). 신규 시세 계층 없음. |
| R8 | 국내/해외 2열 (PRD §4) | 해외는 후속 → 이번 PR **국내 1열**. 단 grid 를 2열 확장 가능하게 짜, 후속 해외 추가 시 데스크탑 2열·모바일 세로 스택으로 무리팩터 확장. |
| R9 | 기간수익률 카드 | 업종지수 시계열 확보 시에만 **조건부 렌더**(PRD "가능하면 포함, 아니면 후속"). 없으면 카드 자체 미렌더, 모달 나머지 무손상. |
| R10 | 신규 색 토큰 | **0개**. `signal-up`/`signal-down`(+soft)·`surface`·`surface-muted`·`text-strong`·`text-muted`·`primary`·`accent-soft`·`border-line`(라이브) 전부 재사용. 신규는 spacing `sector-row-h`(56px) 1키뿐(2줄 우열 수용, Layout 근거 명시). |
| R11 | 종목코드/업종코드 노출 | 리스트·모달 어디에도 코드 미표시(앱 전역 관례). 업종명·종목명만. |
