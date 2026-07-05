---
version: alpha
name: market-status-aware-home
description: >-
  마켓 홈(`MarketOverviewPage`)의 라이브 섹션(실시간 순위 4탭·순매수 당일)을 **데이터 가용성 기반**으로
  렌더하는 디자인 가이드. 초판(#247)은 "정규장일 때만 표시"하는 시각 게이팅(`isRegularOpen` +
  `MarketClosedNotice` "장 마감·다음 개장")이었으나, 에러의 실제 원인은 장 마감이 아니라 KIS 야간점검이고
  주말·장외에도 랭킹이 정상 제공됨이 확인돼 **폐기**한다. 새 축은 "장이 열렸나"가 아니라 "데이터를 받을 수
  있나"다. 실시간 순위는 **받아지는 탭만 노출·못 받은 탭은 탭 버튼 자체를 숨겨** 탭바가 가변이 되고, 4탭 전부
  못 받으면 신규 공용 `MaintenanceNotice`("현재 점검 중이에요", 중립 muted 톤, **다음 개장 시각 표기 없음**
  — 마감이 아니라 점검이므로)로 대체한다. 핵심은 세 상태의 시각 분리다: (a) 점검(전탭 실패=`MaintenanceNotice`,
  muted, 관리자에게만 "다시 시도"), (b) 일부 탭만 실패(해당 탭 숨김·나머지 정상), (c) 로딩(스켈레톤). "다시
  시도"는 `useIsAdmin()` 이 true 일 때만 노출하고 일반 사용자에겐 버튼 자리를 비운다(점검은 기다리면 복구).
  순매수 "당일"도 동일 원칙(가용성·점검 안내·관리자만 재시도·"7일 누적 보기" 넛지), "7일 누적"(KV 스냅샷)은
  항상 정상. 신규 색 토큰 0 — `finsight-redesign` 라이브 토큰(`surface-muted`·`text-muted`·`primary`·`link`)만
  재사용, `MaintenanceNotice` 는 에러(빨강) 아닌 **중립 안내** 톤이라 `critical` 계열을 쓰지 않는다.
  WCAG AA 4.5:1 무회귀. PRD `market-status-aware-home` §3-1·§3-2·§3-3·§3-5 · AC-1~AC-10·AC-13 충족.
colors:
  primary: "#1f3b4d"
  surface: "#ffffff"
  surface-muted: "#f6f8fa"
  text-muted: "#5b6470"
  link: "#1c4fd1"
typography:
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
  button-sm:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
  tab-label:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.2
rounded:
  sm: 8px
  lg: 13px
  pill: 999px
spacing:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 18px
  table-row-h: 42px
components:
  maintenance-panel:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    height: "{spacing.table-row-h}"
  maintenance-dot:
    backgroundColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    height: "{spacing.sm}"
    width: "{spacing.sm}"
  maintenance-title:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.primary}"
    typography: "{typography.body-strong}"
    padding: 0px
  maintenance-supplement:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  maintenance-retry-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  maintenance-nudge:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  maintenance-nudge-link:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.link}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  rank-tab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.tab-label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  rank-tab-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.tab-label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  skeleton-row:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.sm}"
    height: "{spacing.table-row-h}"
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
---

# market-status-aware-home 디자인 가이드

## Overview

마켓 홈(`components/home/MarketOverviewPage.tsx`)의 두 라이브 섹션 — **실시간 순위**
(`RealtimeRankingSection`, 4탭: 거래량/거래대금/급상승/급하락)와 **외국인·기관 순매수 Top10**
(`InvestorFlowTop10Card`, 토글: 당일/7일 누적) — 은 KIS 실시간 랭킹 TR 을 원천으로 한다.

> **초판 대비 바뀐 점 (한 줄):** 초판(#247)의 시각 게이팅 — `isRegularOpen` 하드 게이팅 + `MarketClosedNotice`
> ("장 마감 · 다음 개장 …") — 을 **폐기**하고, "데이터를 받을 수 있나(가용성)" 기준 렌더 + 중립
> `MaintenanceNotice`("현재 점검 중이에요", **다음 개장 시각 표기 없음**)로 대체한다. 원인이 장 마감이 아니라
> KIS 야간점검이었고, 주말·장외에도 랭킹이 정상 제공되므로 "정규장일 때만 표시"는 멀쩡한 데이터를 숨기는 역효과였다.

이 가이드는 라이브 섹션을 **가용성 기반**으로 렌더하는 시각 규칙을 정한다. 방향은 하나:
**"받아지면 보여주고, 못 받으면 조용히 점검 안내로 대체하라 — 시각(장 열림/닫힘)에 의존하지 마라."**

- **가용성 기반 탭 렌더(가변 탭바)**: 실시간 순위 4탭 중 **실 데이터를 받은 탭(available)만 노출**, 못 받은
  탭(unavailable)은 **탭 버튼 자체를 숨긴다**. 탭바는 4개 → 2개 → 1개로 가변한다. 흐림(opacity)이 아니라
  제거다 — 눌러도 데이터가 없는 탭을 남겨 두면 헛클릭을 유인한다.
- **전탭 실패 = 점검 안내(중립)**: 4탭 모두 unavailable 이면 리스트/탭바 대신 `MaintenanceNotice`. 톤은
  **에러(빨강)가 아니라 중립(muted)** — "현재 점검 중이에요 · 잠시 후 다시 확인해 주세요". **다음 개장 시각은
  쓰지 않는다**(마감이 아니라 점검이므로 — ②`toss-market-calendar` 의 "장 마감/다음 개장" 언어와 명확히 구분).
- **관리자에게만 "다시 시도"**: `useIsAdmin()`(신설) 이 true 일 때만 재시도 버튼을 노출한다. 일반 사용자에겐
  **버튼 자리 자체를 비운다** — 점검은 기다리면 복구되므로 사용자가 할 일이 없다. 관리자만 에러/점검을 구분하고
  수동 재조회한다.
- **세 상태 시각 분리**: (a) **점검**(전탭 실패) = `MaintenancePanel`(muted, 관리자만 재시도), (b) **일부 탭만
  실패** = 해당 탭 숨김·나머지 탭 정상 리스트, (c) **로딩** = 스켈레톤. 색은 셋 다 무채색이나 **형태·카피·액션**
  으로 갈린다(안내 텍스트 vs 정상 리스트 vs shimmer).
- **순매수 당일 일관 적용**: 순매수 "당일"도 시각 게이팅 폐기. 받아지면(장외여도) 표시, 못 받으면 실시간 순위와
  **같은 `MaintenanceNotice`** + "7일 누적 보기" 넛지(항상 데이터 있는 탭으로 유도). 재시도는 관리자만.
  **"7일 누적"(KV 스냅샷)은 항상 정상**(무변경).
- **dev mock 정상 표시**: 로컬(KIS 미설정)은 `X-Data-Source: mock`(200) → **available 로 정상 표시**. "점검 중"
  이 아니라 개발 편의 mock 이다. `mock-timeout`/`mock-empty`/`mock-error`/502(KIS 시도 후 실패)만 점검 안내로.
- **신규 색 토큰 0**: 중립 안내는 `surface-muted`·`text-muted`·`primary` 로, 넛지 링크는 `link` 로 전부 라이브
  토큰 재사용. `MaintenanceNotice` 는 빨강(`critical`)을 **쓰지 않는다** — 점검은 이상 신호가 아니라 대기 상태다.

## Colors

색은 **신규 토큰을 만들지 않고** `finsight-redesign` 라이브 토큰을 참조한다(`design:sync` SSOT 는
`finsight-redesign.md` 하나 — 이 문서 front matter 의 재선언은 lint 참조 해소용 동일값이다). frontend-dev 는
`bg-surface-muted`·`text-muted`·`text-primary`·`text-link` 같은 이미 존재하는 유틸을 그대로 호출한다.

- **점검 패널 배경 = `surface-muted`(#f6f8fa)**: 리스트 영역을 대체하는 안내 블록의 바탕. 흰 `surface` 위에서
  아주 옅게 한 단 눌러 "여긴 지금 대기/점검 영역"임을 조용히 신호한다. 초판이 (a)마감/(b)에러를 회색 vs 빨강으로
  갈랐던 반면, 개정판은 **점검을 빨강으로 승격하지 않는다** — 점검은 에러가 아니라 일시 대기라 무채색이 옳다.
- **점검 점 = `text-muted`(#5b6470)**: 안내 상단의 `maintenance-dot`. 정적 회색 점(펄스 없음 — 대기 상태는
  조용해야 한다). 색만으로 상태를 전달하지 않고 제목 라벨을 동반(색맹 접근성 이중 인코딩).
- **제목 라벨 = `primary`(#1f3b4d)**: "현재 점검 중이에요" 슬레이트 라벨. `surface-muted` 위 대비 ~11:1 로 또렷하되
  빨강처럼 경보를 울리지 않는 차분한 톤.
- **보조/본문 = `text-muted`(#5b6470)**: "잠시 후 다시 확인해 주세요"·"7일 누적은 계속 볼 수 있어요" 등 보조
  텍스트. 제목보다 한 위계 낮춘 회색. `surface-muted`(#f6f8fa) 위 대비 ~5.6:1 로 AA 4.5:1 충족.
- **재시도 버튼(관리자 전용) = 바탕 `surface`(#ffffff) · 텍스트 `primary`(#1f3b4d)**: `surface-muted` 패널 위에
  흰 바탕 고스트 버튼으로 한 단 떠 보이게. 슬레이트 텍스트라 "관리자용 유틸리티"임을 조용히 — 시끄러운 CTA 색을
  쓰지 않는다(일반 사용자는 아예 못 보는 버튼이라 강조 불필요). `surface` 위 대비 ~11.9:1.
- **넛지 링크 = `link`(#1c4fd1)**: 순매수 점검 안내의 "7일 누적 보기" 인라인 액션(토글을 누적으로 되돌림). 점검
  안내 전체가 회색인 가운데 이 링크만 파랑이라 "여기 누르면 볼 게 있다"를 최소 강조한다. `surface-muted` 위 대비 ~6.4:1.
- **점검판에 빨강 없음**: 초판이 유지하던 `critical`/`critical-soft`(빨간 에러 카드)는 개정판에서 **소비처가
  사라진다**. 가용성 모델에서 모든 "못 받음"(502·mock-error 포함)은 중립 점검 안내로 흡수되므로, 빨간 에러 카드는
  이 화면에서 등장하지 않는다(토큰 선언에서 제외).

## Typography

- **제목 = `body-strong`(16px/700)**: "현재 점검 중이에요" 상태 제목. 섹션 안에서 시선을 붙잡는 1차 텍스트라 굵게.
- **보조 = `caption`(12px/400)**: "잠시 후 다시 확인해 주세요"·"7일 누적은 계속 볼 수 있어요" 부차 정보. 제목
  아래 한 단 낮춘 위계.
- **넛지 링크 = `button-sm`(13px/700)**: "7일 누적 보기" 클릭 유도. 인라인 텍스트 링크지만 액션이므로 캡션보다
  굵게(700) 눌러 손가락을 부른다.
- **재시도 버튼 = `button-sm`(13px/700)**: 관리자 전용 "다시 시도". 작지만 또렷한 버튼 톤.
- **탭 라벨 = `tab-label`(14px/700)**: 가변 탭바의 거래량/거래대금/급상승/급하락 라벨. 활성 탭은 `primary`,
  비활성은 `text-muted`(색으로 활성 구분). 탭 개수가 줄어도 라벨 크기는 고정 — 남은 탭이 커지지 않는다.
- 점검 안내에는 숫자 정렬(tnum)·종목코드가 없다(리스트가 아니라 상태 안내라서).

## Layout

점검 안내는 **섹션의 리스트/스켈레톤이 놓이던 콘텐츠 영역만** 대체한다. 섹션 헤더(제목·토글)는 그대로 둔다 —
레이아웃 시프트를 최소화하고, 사용자가 "이 섹션이 사라진 게 아니라 지금 점검 중"으로 읽게. 실시간 순위의
**탭바는 가변**(available 탭만 렌더)이지만 섹션 헤더 자체는 유지한다.

### 실시간 순위 섹션 (`RealtimeRankingSection`) — 가변 탭바

- **available 탭만 렌더**: `RANK_TABS`(거래량/거래대금/급상승/급하락)를 가용성으로 필터해 탭바를 그린다.
  unavailable 탭은 **DOM 에서 제거**(흐림 아님). 탭바 폭은 남은 탭 수만큼 줄고, 남은 탭은 좌측 정렬을 유지한다
  (남은 탭이 폭을 균등 확장하지 않는다 — 탭 위치가 튀지 않게).
- **활성 탭 기본값 = 첫 available 탭**: 초기 활성 탭은 available 목록의 첫 탭. **활성 탭이 갑자기 unavailable 로
  바뀌면 남은 첫 available 탭으로 자동 이동**(콘텐츠가 빈 채로 남지 않게). 그 외에는 사용자 클릭을 존중(자동
  전환 금지) — available 탭 사이 전환은 사용자 자유.
- **탭 1개만 남을 때**: 탭바 대신 **정적 섹션 라벨**(비인터랙티브)로 강등한다. 선택지가 하나뿐이면 탭 어포던스는
  헛혼란이므로, 남은 탭 이름(예 "거래량")을 소제목처럼 표기하고 그 아래 리스트만 보여준다.
- **탭 0개(전탭 unavailable)**: 탭바·리스트 대신 `MaintenanceNotice`(§Components). 콘텐츠 영역만 교체.
- **콘텐츠 영역**: 리스트/점검 안내가 놓이는 자리는 최소 높이(≈ `table-row-h` × 3)를 확보해 탭 전환·상태 전환
  시 높이가 튀지 않게 한다.

### 순매수 Top10 카드 (`InvestorFlowTop10Card`)

- **토글 유지**: 당일/7일 누적 토글은 그대로. "7일 누적"은 항상 정상 리스트(가용성 판정 대상 아님).
- **"당일" unavailable 시**: 그리드/리스트가 놓이던 영역을 `MaintenanceNotice` 로 교체 + 하단에
  `maintenance-nudge`("7일 누적은 계속 볼 수 있어요") + `maintenance-nudge-link`("7일 누적 보기" → 토글을
  `cumulative` 로 전환). 재시도 버튼은 관리자만.
- **당일 available 시**: 장외여도 외국인|기관 Top10 정상 표시(시각 게이팅 없음).

### 점검 안내 내부 정렬

`MaintenancePanel` 내부는 세로 중앙 정렬 스택: `[● 회색 점 + 제목(가로 인라인, gap=xs)] → [gap=sm] →
[보조 텍스트] → (관리자만) [gap=md] → [다시 시도 버튼] → (순매수만) [gap=md] → [넛지 + 링크]`. 좌우 여백은
`spacing.xl`. 관리자가 아니면 재시도 버튼 슬롯은 **렌더하지 않는다**(빈 자리·placeholder 없음).

### 반응형 (모바일·태블릿·데스크탑, `useBreakpoint`)

| 뷰포트 | 실시간 순위 탭바 | 점검 안내 |
|---|---|---|
| **데스크탑 (≥ `lg` 1024px)** | available 탭 가로 나열(좌측 정렬). 컨테이너 최대폭 내 좌측 정렬, sidebar 정책 무변경. | 회색 점 + 제목 한 줄, 보조 다음 줄. 관리자 재시도·넛지 링크는 보조 아래 한 줄. |
| **태블릿 (`md`~`lg`)** | 동일. 폭 여유로 탭 가로 유지. | 동일 구조. |
| **모바일 (< `md` 768px)** | available 탭 가로 유지(4개→2개로 줄면 오히려 여유). 탭이 넘치면 가로 스크롤(줄바꿈 금지). | 점 + 제목 한 줄, 보조 다음 줄 세로 스택. 재시도 버튼·넛지 링크는 세로로 줄바꿈 허용. 좌우 패딩 유지로 잘림 방지. |

- 점검 안내는 카드리스 플랫 톤(홈 전체 정합)이라 뷰포트별 구조 변화가 작다 — 텍스트 줄바꿈만 다르다.
- **컨테이너 최대폭·grid 배치·sidebar 정책**은 마켓 홈 기존 레이아웃을 상속(본 PR 무변경) — 점검 안내/가변 탭바는
  섹션 콘텐츠 영역 안에서만 동작한다.
- **JS 분기는 `useBreakpoint`**(`window.innerWidth` 직접 검사 금지). Tailwind `md:`/`lg:` prefix 를 1차 도구로
  병행. 넛지 링크·재시도 버튼의 줄바꿈 여부만 `isMobile` 로 판단.

## Elevation & Depth

- 점검 안내 패널은 **그림자 없는 플랫** 블록이다. 홈이 카드리스(화이트포워드) 톤이라 elevation 을 얹지 않고,
  `surface-muted` 배경의 옅은 명도 차만으로 "대기 영역"을 표현한다.
- 점검 점(`maintenance-dot`)은 **정적**이다. ②의 장중(`regular`) 녹색 점에 준 펄스를 여기선 쓰지 않는다 —
  점검은 조용해야 하는 상태(라이브 강조는 열림에만).
- 관리자 재시도 버튼은 `surface`(흰) 바탕으로 `surface-muted` 패널 위에서 명도차만으로 한 겹 떠 보이게 —
  그림자 없이. 스켈레톤(`skeleton-row`)도 플랫. 모든 상태를 그림자 없이 색·형태로만 구분한다.

## Shapes

- 점검 패널: `rounded.lg`(13px) — 홈 카드/섹션 라운드 정합.
- 점검 점(●): `rounded.pill`(999px) 완전한 원. `spacing.sm`(6px) 정사각 → pill.
- 넛지 링크 · 재시도 버튼 · 탭: `rounded.sm`(8px) 작은 라운드(탭 타깃).
- 스켈레톤 행: `rounded.sm`. 각진 사각·과한 라운드는 쓰지 않는다.

## Components

- `maintenance-panel`: 리스트 영역을 대체하는 중립 안내 블록. `surface-muted` 배경, `body-sm` 본문 톤,
  `rounded.lg`, 좌우 `spacing.xl` 패딩. `height` 는 최소 높이 기준값(`table-row-h`)으로, 실제로는 ≈3행 높이를
  확보해 레이아웃 시프트를 억제한다(구현 시 `min-h`). **신규 공용 `components/market/MaintenanceNotice.tsx`**
  로 뽑아 실시간 순위·순매수 당일이 재사용. props: `isAdmin`·`onRetry`·`nudge?`(순매수만 슬롯 주입).
- `maintenance-dot`: 안내 상단 회색 점(6px 원, `text-muted`). 정적. 색+텍스트 이중 인코딩(점만 남기지 않고
  제목 라벨 동반). ②의 `status-dot-closed` 와 같은 형태·크기이나 **"닫힘"이 아니라 "점검"** 의미(카피로 구분).
- `maintenance-title`: "현재 점검 중이에요" 제목. `primary` 슬레이트, `body-strong`. 마감/휴장 분기 없음
  (점검은 시각과 무관한 단일 상태).
- `maintenance-supplement`: "잠시 후 다시 확인해 주세요" 보조(`text-muted`, `caption`). **다음 개장 시각을
  표기하지 않는다**(마감이 아니므로 — ②의 `nextOpenText()` 를 여기서 쓰지 않는 것이 핵심 구분점).
- `maintenance-retry-button`: **관리자 전용** "다시 시도"(전 프로브 refetch). `surface` 흰 바탕 + `primary`
  텍스트, `button-sm`, `rounded.sm`. `useIsAdmin()===true` 일 때만 렌더 — 일반 사용자에겐 슬롯 자체를 비운다
  (빈 placeholder 없음). 재시도는 공개 랭킹 refetch(특권 아님)라 위조돼도 실질 위험 0.
- `maintenance-nudge`: 순매수 당일 점검 전용 유도 문구("7일 누적은 계속 볼 수 있어요"). `text-muted`,
  `caption`. 실시간 순위 섹션에는 없다(순매수만, `nudge` prop 로 주입).
- `maintenance-nudge-link`: "7일 누적 보기" 인라인 액션 링크(`link` 파랑, `button-sm`). 클릭 시 토글을
  `cumulative` 로 전환. 점검 안내 안 유일한 색 있는 클릭 유도점.
- `rank-tab` / `rank-tab-active`: 가변 탭바의 탭. available 탭만 렌더(unavailable 은 DOM 제거). 비활성=`text-muted`,
  활성=`primary`. 탭 1개만 남으면 이 탭 컴포넌트 대신 정적 소제목 라벨로 강등(어포던스 제거). 기존 탭 시각은
  무변경 — 본 PR 은 **필터 로직만** 추가(흐림 opacity 로직 대체).
- `skeleton-row`: 로딩 표현(`surface-muted`, `rounded.sm`, 행 높이). 가용성 프로브 진행 중. 무변경.

## Do's and Don'ts

- ✅ 실시간 순위는 **받아지는 탭만 노출**하고 못 받은 탭은 **탭 버튼을 숨긴다**(흐림 아님·DOM 제거).
- ✅ 활성 탭이 unavailable 로 바뀌면 **남은 첫 available 탭으로 자동 이동**(빈 콘텐츠 방지). available 탭 사이
  전환은 사용자 클릭 존중.
- ✅ 탭 1개만 남으면 탭바를 **정적 소제목 라벨로 강등**(선택지 없는 탭 어포던스 제거).
- ✅ 전탭 실패는 **중립(muted) `MaintenanceNotice`** — "현재 점검 중이에요 · 잠시 후 다시 확인해 주세요".
- ✅ "다시 시도"는 **관리자(`useIsAdmin()`)에게만** 노출하고, 일반 사용자에겐 버튼 자리 자체를 비운다.
- ✅ 순매수 "당일"도 동일 원칙(가용성·점검 안내·관리자만 재시도) + "7일 누적 보기" 넛지. "7일 누적"은 항상 정상.
- ✅ dev mock(`X-Data-Source: mock`)은 **정상 표시**(점검 아님). `mock-timeout`/`mock-empty`/`mock-error`/502 만 점검 안내.
- ✅ 한글 카피는 `lib/copy/market/maintenance.ts`(점검 안내·다시 시도)·`lib/copy/flow/labels.ts`(넛지) 단일 위치,
  색·간격은 토큰만(`cn` 헬퍼), 반응형은 `md:`/`lg:` + `useBreakpoint`.
- ❌ 점검 안내에 **다음 개장 시각을 표기하지 않는다**(마감이 아니라 점검 — ②의 "장 마감/다음 개장" 언어와 구분).
- ❌ 점검 안내에 **빨강·경고색을 쓰지 않는다**(점검은 에러가 아니라 대기 — `critical` 금지).
- ❌ 점검 상태에서 회색 **점만 남기지 않는다**(색맹 접근성 — 제목 라벨 동반, 이중 인코딩).
- ❌ 일반 사용자에게 **재시도 버튼을 노출하지 않는다**(점검은 기다리면 복구 — 헛수고 유인 금지).
- ❌ 점검 안내·탭바에 그림자·펄스·hex/px 직타를 넣지 않는다(플랫·정적·토큰만).

---

## 유저 시나리오 (태스크 플로우)

### S1. KIS 야간점검 중 마켓 홈 진입 — 실시간 순위 전탭 실패

1. 평일 밤 21:50~23시대(KIS 전 TR 500) 또는 일시 장애 시 홈 진입 → 4탭을 모두 프로브 → 전탭 unavailable.
2. 탭바·리스트 대신 `MaintenanceNotice`(회색 점 + "현재 점검 중이에요" + "잠시 후 다시 확인해 주세요").
3. 일반 사용자는 안내만 본다(재시도 버튼 없음) → "앱 고장이 아니라 잠깐 점검 중"으로 인지, 기다리면 복구.
4. **다음 개장 시각은 안 뜬다**(장 마감이 아니므로) — ②의 헤더 배지("장 마감 · 다음 개장")와 언어가 다르다.

### S2. 관리자가 점검 안내에서 수동 재조회

1. 관리자 세션(`/api/auth/me` → role=admin, `useIsAdmin()===true`)으로 홈 진입.
2. 전탭 실패 시 `MaintenanceNotice` 에 **"다시 시도" 버튼이 추가로** 뜬다(일반 사용자엔 없던 슬롯).
3. 클릭 → 4탭 전부 refetch → 점검이 끝났으면 available 탭이 다시 노출, 아직이면 점검 안내 유지.

### S3. 일부 탭만 실패 — 가변 탭바

1. 예: 거래량·거래대금은 `kis`(available), 급상승·급하락은 `mock-error`(unavailable).
2. 탭바에 **거래량·거래대금 2탭만** 노출(급상승·급하락 버튼은 숨김). 정상 리스트를 본다.
3. 활성 탭이 급상승이었다면 → 남은 첫 available 탭(거래량)으로 자동 이동. 점검 안내는 뜨지 않는다(일부만 실패).
4. 만약 available 탭이 1개뿐이면 → 탭바 대신 "거래량" 정적 소제목 + 리스트.

### S4. 주말·장외 정상 랭킹 (회귀 정정)

1. 일요일 낮에 홈 진입 → KIS 가 랭킹을 정상 제공(`dataSource=kis`) → 4탭 모두 available.
2. **에러/숨김 없이 4탭 정상 노출**. 초판이 `!isRegularOpen` 으로 숨기던 것을 회복(장 시각 무관).

### S5. 순매수 당일 점검 — 7일 누적으로 유도

1. 점검 시각에 순매수 "당일" unavailable → `MaintenanceNotice` + "7일 누적은 계속 볼 수 있어요 · **7일 누적 보기**"(파랑 링크).
2. "7일 누적 보기" 클릭 → 토글이 `cumulative` 로 전환 → KV 스냅샷 데이터를 본다(항상 정상).
3. "7일 누적"은 점검과 무관하게 언제나 정상 리스트(가용성 판정 대상 아님).

### S6. dev 로컬(KIS 미설정) — mock 정상 표시

1. 동료 로컬(무키) → 4탭 모두 `X-Data-Source: mock`(200) → available.
2. **4탭 모두 mock 데이터 정상 표시**. "영구 점검중" 회귀 없음(mock 은 점검이 아니라 개발 편의 데이터).

---

## 핸드오프 명세 (화면별 상태)

frontend-dev 가 바로 구현 가능한 상태 매트릭스. 카피는 `lib/copy/market/maintenance.ts`(공용 점검 안내·다시
시도)·`lib/copy/flow/labels.ts`(순매수 넛지) 단일 위치. 색·간격 토큰만.

### 가용성 판정 규칙 (PRD §6)

- **available** = `isError=false` **AND** `dataSource ∈ {kis, mock}`
- **unavailable** = `isError=true`(502) **OR** `dataSource ∈ {mock-timeout, mock-empty, mock-error}`
- cumulative(`kv`)는 판정 대상 아님 — 항상 표시.

### 세 상태 시각 분리 매트릭스

| 상태 | 트리거 | 배경 | 점/아이콘 | 텍스트 | 액션 |
|---|---|---|---|---|---|
| **(a) 점검**(전탭 실패) | 4탭 모두 unavailable(프로브 settled) | `maintenance-panel`(surface-muted) | `maintenance-dot`(회색 점) | 제목 `primary` + 보조 `text-muted` | **관리자만** `maintenance-retry-button`. 일반 사용자 없음 |
| **(b) 일부 탭 실패** | 일부 unavailable·나머지 available | (정상 리스트) | 없음 | 정상 리스트 | 해당 탭 **숨김**(탭바 가변) |
| **(c) 로딩** | 프로브 진행 중(settled 전) | `skeleton-row`(surface-muted) | 없음 | 없음 | 없음 |

- 핵심 구분축: 셋 다 무채색이나 **형태·카피·액션**으로 갈린다 — 정적 안내 텍스트(점검) vs 정상 리스트(일부 실패)
  vs shimmer(로딩). (a)는 관리자에게만 액션이 붙는다.

### 실시간 순위 섹션 상태 (`RealtimeRankingSection`)

| 조건 | 렌더 | 카피 |
|---|---|---|
| 프로브 진행 중(모두 loading) | `skeleton-row` ×N + 탭바 스켈레톤 | — |
| available ≥ 2 | available 탭만 탭바 렌더 + 활성 탭 리스트. 활성 탭이 unavailable 이면 첫 available 로 이동 | 기존 리스트(무변경) |
| available == 1 | 탭바 → 정적 소제목 라벨(비인터랙티브) + 리스트 | 탭 이름(예 "거래량") |
| available == 0 (전탭 실패) | `MaintenanceNotice`(점+제목+보조). 관리자면 "다시 시도" | `MAINTENANCE_TITLE`·`MAINTENANCE_SUPPLEMENT`·`MAINTENANCE_RETRY` |
| 활성 탭만 loading(다른 탭 settled) | 탭바 렌더 + 활성 탭 영역 `skeleton-row` | — |

### 순매수 Top10 카드 상태 (`InvestorFlowTop10Card`)

| 조건 | 렌더 | 카피 |
|---|---|---|
| `cumulative` 탭 (항상) | **정상 리스트/`cumulativeCollecting`**(가용성 판정 안 함) | 기존 무변경 |
| `today` + available | 외국인\|기관 Top10 정상(장외여도) | 기존 무변경 |
| `today` + unavailable | `MaintenanceNotice` + `maintenance-nudge` + `maintenance-nudge-link`("7일 누적 보기" → 토글 `cumulative`). 관리자면 "다시 시도" | `MAINTENANCE_TITLE`·`MAINTENANCE_SUPPLEMENT` + 넛지 `FLOW_CUMULATIVE_NUDGE`·`FLOW_CUMULATIVE_LINK` |
| `today` + loading | `skeleton-row` | — |

### 배선 규칙

- 가용성 판정 원천은 도메인 훅(`useQueryVolumeRank`·`useQueryFluctuation`·`useQueryFlowTop10`)이 노출하는
  `dataSource` + `isError`(PRD §3-0). 컴포넌트는 도메인 훅만 소비(`useQuery` 직접 import 금지 —
  `docs/rules/frontend.md` §1).
- 관리자 여부는 **신설 `useIsAdmin()`**(`hooks/auth/`, `/api/auth/me` 소비, `queryKeys.auth.me` 단일 위치).
  role 판정은 서버(HMAC 검증)에서만 — 클라 `isAdmin` 은 재시도 버튼 표시 여부만 결정(재시도는 공개 refetch).
- 공용 점검 안내는 신규 컴포넌트로 뽑는다(`components/market/MaintenanceNotice.tsx`). `props`:
  `isAdmin`(재시도 버튼 게이트)·`onRetry`(refetch 콜백)·`nudge?`(순매수만 슬롯 주입). 점·제목·보조는 공용,
  넛지·재시도는 조건부 렌더.
- 초판의 `components/market/MarketClosedNotice.tsx`(#247)는 **소비처 소멸로 제거**하고 이 컴포넌트로 대체한다.
  `isRegularOpen` 하드 게이팅(`!isRegularOpen ? … : …` 분기·`enabled: … && isRegularOpen` 곱)도 전부 걷어낸다.
- 가변 탭바: `RANK_TABS` 를 `available` 탭으로 필터해 렌더. 활성 탭 state 는 available 목록 변화에 반응
  (활성 탭이 목록에서 빠지면 첫 available 로 재설정). 사용자 클릭 자동 전환은 금지(활성 탭 소실 시에만 강제 이동).
- 반응형: `md:`/`lg:` prefix 1차, `useBreakpoint` 로 넛지 링크·재시도 버튼 줄바꿈만 판단(모바일=다음 줄).

---

## OPEN QUESTION 결정 (디자이너 영역)

PRD §9 중 디자이너 결정 영역(q6) + 시각 설계 파생 결정.

| # | 항목 | 결정 |
|---|---|---|
| R1 | 공용 점검 UI 형태 (PRD §9 q6) | **신규 공용 컴포넌트 `MaintenanceNotice`**(`components/market/MaintenanceNotice.tsx`) 채택. 실시간 순위·순매수 당일이 재사용. `isAdmin`·`onRetry`·`nudge?` props. 초판 `MarketClosedNotice`(#247)는 소비처 소멸로 제거·대체. |
| R2 | 점검 표현 톤 | **중립(muted)**: `maintenance-panel`(surface-muted) + `maintenance-dot`(정적 회색 점) + `primary` 제목 + `text-muted` 보조. 빨강·경고색·`critical` 금지 — 점검은 에러가 아니라 일시 대기다. |
| R3 | 점검 카피 (마감과 구분) | "현재 점검 중이에요 · 잠시 후 다시 확인해 주세요". **다음 개장 시각 표기 없음**(마감이 아니라 점검 — ②`toss-market-calendar` 의 "장 마감/다음 개장" 언어와 명확히 분리). `lib/copy/market/maintenance.ts` 신규 단일 위치. |
| R4 | 다시 시도 버튼 배치 | **관리자(`useIsAdmin()===true`)에게만** 노출. 일반 사용자에겐 버튼 슬롯 자체를 비운다(빈 placeholder 없음). 점검은 기다리면 복구되므로 일반 사용자엔 재시도가 헛수고 — 관리자만 에러/점검 구분·수동 재조회. |
| R5 | 가변 탭바 (탭 숨김) | available 탭만 DOM 렌더, unavailable 탭은 **제거**(흐림 opacity 아님). 남은 탭 좌측 정렬 유지(폭 균등 확장 안 함). |
| R6 | 활성 탭 소실 시 동작 | 활성 탭이 unavailable 로 바뀌면 **남은 첫 available 탭으로 자동 이동**(빈 콘텐츠 방지). available 탭 사이 전환은 사용자 클릭 존중(그 외 자동 전환 금지). |
| R7 | 탭 1개만 남을 때 | 탭바 → **정적 소제목 라벨**(비인터랙티브)로 강등. 선택지 없는 탭 어포던스 제거. |
| R8 | 세 상태 시각 분리 | (a)점검=`MaintenancePanel` muted·관리자만 액션 / (b)일부 탭 실패=해당 탭 숨김·나머지 정상 리스트 / (c)로딩=스켈레톤. **형태 + 카피 + 액션** 축으로 구분(색은 셋 다 무채색). |
| R9 | 순매수 당일 일관 적용 | 당일도 가용성 기반(시각 게이팅 폐기). unavailable=`MaintenanceNotice` + "7일 누적 보기" 넛지(`link` 파랑), 재시도 관리자만. "7일 누적"(KV)은 항상 정상(판정 대상 아님). |
| R10 | dev mock 처리 | `X-Data-Source: mock`(미설정 dev) = **available·정상 표시**. `mock-timeout`/`mock-empty`/`mock-error`/502(KIS 시도 후 실패)만 점검 안내. "영구 점검중" 회귀 방지. |
| R11 | 신규 색 토큰 | **0개**. `surface-muted`·`text-muted`·`primary`·`link`(라이브) 전부 재사용. 초판이 쓰던 `critical`/`critical-soft`(빨간 에러 카드)는 가용성 모델에서 소비처 소멸 → 토큰 선언 제외. SSOT(`finsight-redesign.md`) 병합 불필요. |
| R12 | 레이아웃 시프트 | 섹션 헤더·토글 유지, 콘텐츠 영역만 교체. `maintenance-panel` 최소 높이 ≈`table-row-h`×3 로 탭·상태 전환 시 높이 안정. |
