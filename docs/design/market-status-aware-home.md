---
version: alpha
name: market-status-aware-home
description: >-
  마켓 홈(`MarketOverviewPage`)의 라이브 섹션(실시간 순위·순매수 당일)이 장 마감/주말/공휴일에 띄우던
  빨간·회색 에러 카드("실시간 순위를 불러오지 못했어요"·"수급 정보를 불러오지 못했어요")를,
  ②(`toss-market-calendar`)의 `useMarketStatus().isRegularOpen`·`nextOpen` 으로 게이트해 **차분한
  "장 마감" 안내**로 대체하는 디자인 가이드. 핵심은 세 상태의 시각적 분리다: (a) 장 마감 = 중립(muted)
  안내(회색 점 + "장 마감" + "다음 개장 M/D(요일) HH:mm", 다시 시도 버튼 없음, 빨강 금지), (b) 진짜
  에러(장중인데 실패) = 기존 `critical` 빨강 카드 + 다시 시도 유지, (c) 로딩 = 스켈레톤. ②의
  `MarketStatusBadge` 회색(closed=`text-muted`) 톤·"장 마감/휴장 · 다음 개장" 언어를 그대로 답습한다.
  순매수 Top10 은 "7일 누적"(KV 스냅샷 과거 데이터)을 정상 표시하고 "당일"만 게이트하며, 마운트가
  마감이면 토글 초기값만 누적으로 두는 **소프트 넛지**(강제 전환 아님)로 데이터 있는 탭에 착지시킨다.
  신규 색 토큰 0 — `finsight-redesign` 라이브 토큰(`surface-muted`·`text-muted`·`primary`·`link`)과
  ②의 `status-dot-closed`(=`text-muted` 회색 점)를 재사용한다. WCAG AA 4.5:1 무회귀.
  PRD `market-status-aware-home` §3-1·§3-2·§3-4 · AC-1·AC-3·AC-5·AC-11 충족.
colors:
  primary: "#1f3b4d"
  surface: "#ffffff"
  surface-muted: "#f6f8fa"
  text-muted: "#5b6470"
  link: "#1c4fd1"
  critical: "#8e1717"
  critical-soft: "#fde1e1"
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
  market-closed-panel:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    height: "{spacing.table-row-h}"
  status-dot-closed:
    backgroundColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    height: "{spacing.sm}"
    width: "{spacing.sm}"
  market-closed-title:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.primary}"
    typography: "{typography.body-strong}"
    padding: 0px
  market-closed-supplement:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  market-closed-nudge:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  market-closed-nudge-link:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.link}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  error-card:
    backgroundColor: "{colors.critical-soft}"
    textColor: "{colors.critical}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  error-retry-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.critical}"
    typography: "{typography.button-sm}"
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
(`RealtimeRankingSection`, 탭: 거래량/거래대금/급상승/급하락)와 **외국인·기관 순매수 Top10**
(`InvestorFlowTop10Card`, 토글: 당일/7일 누적) — 은 KIS 실시간 랭킹 TR 을 원천으로 한다. 장 마감·
주말·공휴일에는 이 TR 에 라이브 데이터가 없어 빨간/회색 에러 카드("실시간 순위를 불러오지 못했어요"·
"수급 정보를 불러오지 못했어요")로 깨진다. 사용자 입장에선 "장이 닫혔을 뿐인데 앱이 고장난 것처럼" 보인다.

이 가이드는 그 에러 카드를 **차분한 "장 마감" 안내**로 대체하는 시각 규칙을 정한다. 방향은 단 하나:
**"닫힌 것"과 "고장난 것"을 시각으로 명확히 갈라라.**

- **장 마감은 정상 상태다 → 중립(muted) 톤**: 회색 점 + "장 마감" 라벨 + "다음 개장 M/D(요일) HH:mm"
  보조. 빨강·경고색 금지. ②의 `MarketStatusBadge` 가 `closed` 를 `text-muted` 회색 점으로 표현하는
  것과 **정확히 같은 톤·같은 언어**("장 마감/휴장 · 다음 개장")를 쓴다. 헤더 배지와 본문 안내가 한
  목소리를 내야 사용자가 "아, 장이 닫혔구나"를 한 번에 읽는다.
- **다시 시도 버튼은 숨긴다**: 마감 상태에선 애초에 KIS 를 호출하지 않으므로(게이트가 `enabled` 를 끔)
  "다시 시도"는 의미가 없다. 재시도해도 똑같이 데이터가 없다 — 버튼을 노출하면 사용자를 헛수고로 유인한다.
- **세 상태 시각 분리**: (a) **장 마감** = 중립 안내(회색·조용·액션 없음), (b) **진짜 에러**(장중인데
  KIS 실패) = 기존 `critical` 빨강 카드 + 다시 시도 **유지**, (c) **로딩** = 스켈레톤. 색(회색 vs 빨강
  vs 스켈레톤 회색)과 액션 유무(없음 vs 다시 시도 vs 없음)로 갈린다.
- **7일 누적은 게이팅하지 않는다**: 순매수 "7일 누적"은 KV 스냅샷 과거 데이터라 장 상태와 무관하게
  정상이다. 마감이어도 그대로 보여준다. "당일"만 마감 안내로 대체한다.
- **소프트 넛지(강제 아님)**: 마감 상태로 순매수 카드가 마운트되면 토글 **초기값만** "7일 누적"으로 둬
  데이터 있는 탭에 착지시킨다. 사용자가 "당일"을 직접 누르면 마감 안내 + "실시간 순매수는 장중에 제공돼요
  · 7일 누적 보기" 유도만 — 세션 중 선택을 몰래 바꾸지 않는다.
- **신규 색 토큰 0**: 중립 안내는 `surface-muted`·`border-line`·`text-muted`·`primary` 로, 넛지 링크는
  `link` 로, 에러 유지는 `critical`/`critical-soft` 로 전부 라이브 토큰 재사용. 회색 점은 ②의
  `status-dot-closed`(=`text-muted`) 를 그대로 쓴다.

## Colors

색은 **신규 토큰을 만들지 않고** `finsight-redesign` 라이브 토큰과 ②(`toss-market-calendar`)가 이미
정립한 `closed` 회색 톤을 참조한다(`design:sync` SSOT 는 `finsight-redesign.md` 하나 — 이 문서
front matter 의 재선언은 lint 참조 해소용 동일값이다). frontend-dev 는 `bg-surface-muted`·`text-muted`·
`text-primary`·`text-link` 같은 이미 존재하는 유틸을 그대로 호출한다.

- **장 마감 패널 배경 = `surface-muted`(#f6f8fa)**: 리스트 영역을 대체하는 안내 블록의 바탕. 흰
  `surface` 위에서 아주 옅게 한 단 눌러 "여긴 지금 비활성/대기 영역"임을 조용히 신호한다. 에러의 빨간
  틴트(`critical-soft`)와 명확히 다른 무채색 — 이 대비가 (a)마감 vs (b)에러 시각 분리의 1차 축이다.
- **회색 점 = `text-muted`(#5b6470)**: 안내 상단의 `status-dot-closed` 점. ②의 `closed` 점과 **동일
  토큰**. 헤더 배지의 회색 점과 본문 안내의 회색 점이 같은 색이라 "닫힘"의 시각 언어가 일관된다.
- **제목 라벨 = `primary`(#1f3b4d)**: "장 마감"·"휴장" 슬레이트 라벨. `surface-muted` 위 대비 ~8:1 로
  또렷하되 빨강처럼 경보를 울리지 않는 차분한 톤.
- **보조/본문 = `text-muted`(#5b6470)**: "다음 개장 7/6(월) 09:00"·"실시간 순매수는 장중에 제공돼요"
  등 보조 텍스트. 제목보다 한 위계 낮춘 회색. `surface-muted`(#f6f8fa) 위 대비 ~5:1 로 AA 4.5:1 충족.
- **넛지 링크 = `link`(#1c4fd1)**: 순매수 마감 안내의 "7일 누적 보기" 인라인 액션(토글을 누적으로
  되돌림). 시스템의 링크 세만틱 색 그대로 — 유일하게 색을 쓴 클릭 유도점. 마감 안내 전체가 회색인
  가운데 이 링크만 파랑이라 "여기 누르면 볼 게 있다"를 최소 강조한다. `surface-muted` 위 대비 ~7:1.
- **에러 유지 = `critical`(#8e1717) · `critical-soft`(#fde1e1)**: (b) 진짜 에러(장중인데 KIS 실패)는
  **기존 `card-critical` 빨강 카드 + 다시 시도 버튼을 그대로 유지**한다. 마감 안내로 흡수하지 않는다 —
  장중 실패는 진짜 이상 신호라 사용자가 재시도해야 한다. 빨강(에러)과 무채색(마감)의 색 분리로 두
  상태를 즉시 구분한다. 이 페어는 SSOT 기정 토큰이라 대비 무회귀.

## Typography

- **제목 = `body-strong`(16px/700)**: "장 마감"·"휴장" 상태 제목. 섹션 안에서 사용자의 시선을 붙잡는
  1차 텍스트라 굵게. 헤더 배지(`label-sm` 13px)보다 크다 — 본문 지면은 배지보다 여유가 있고, 여기가
  그 섹션의 "현재 상태 헤드라인"이기 때문.
- **보조 = `caption`(12px/400)**: "다음 개장 …"·"실시간 순매수는 장중에 제공돼요" 부차 정보. 제목 아래
  한 단 낮춘 위계. ②의 `next-open-supplement` 와 동일 크기로 두 지면의 다음 개장 표기 톤을 맞춘다.
- **넛지 링크 = `button-sm`(13px/700)**: "7일 누적 보기" 클릭 유도. 인라인 텍스트 링크지만 액션이므로
  캡션보다 굵게(700) 눌러 손가락을 부른다.
- **에러/재시도 = `body-sm`(14px)·`button-sm`(13px/700)**: 기존 에러 카드 문구·다시 시도 버튼. 무변경.
- 마감 안내에는 숫자 정렬(tnum)·종목코드가 없다(리스트가 아니라 상태 안내라서).

## Layout

마감 안내는 **섹션의 리스트/스켈레톤/에러가 놓이던 콘텐츠 영역만** 대체한다. 섹션 헤더(제목·탭바·토글)는
그대로 둔다 — 레이아웃 시프트를 최소화하고, 사용자가 "이 섹션이 사라진 게 아니라 지금 닫힌 것"으로 읽게.

### 실시간 순위 섹션 (`RealtimeRankingSection`)

- **탭바 유지**: 거래량/거래대금/급상승/급하락 4탭은 마감에도 그대로 노출한다(비활성화하지 않음). 탭
  전환은 가능하되 어느 탭이든 콘텐츠 영역이 같은 마감 안내로 채워진다(마감이면 4탭 모두 KIS 무호출).
- **콘텐츠 영역만 교체**: 리스트가 놓이던 자리에 `market-closed-panel`(중앙 정렬 세로 블록). 최소 높이는
  리스트 몇 행에 준하게(≈ `table-row-h` × 3) 확보해 탭 전환 시 높이가 튀지 않게 한다.

### 순매수 Top10 카드 (`InvestorFlowTop10Card`)

- **토글 유지**: 당일/7일 누적 토글은 그대로. "7일 누적"은 마감에도 정상 리스트(게이팅 안 함).
- **"당일" 탭 마감 시**: 그리드/리스트가 놓이던 영역을 `market-closed-panel` 로 교체 + 하단에
  `market-closed-nudge`("실시간 순매수는 장중에 제공돼요") + `market-closed-nudge-link`("7일 누적 보기").
- **소프트 넛지 착지**: 마감 상태로 마운트되면 토글 초기값만 "7일 누적" → 사용자는 데이터 있는 탭에
  바로 착지. 당일 탭은 사용자가 명시적으로 눌렀을 때만 위 안내를 보여준다.

### 컨테이너 · 정렬

`market-closed-panel` 내부는 세로 중앙 정렬 스택: `[● 회색 점 + 제목(가로 인라인)] → [gap=sm] →
[다음 개장 보조] → (순매수만) [gap=md] → [넛지 + 링크]`. 좌우 여백은 `spacing.xl`. 점과 제목은 한 줄에
가로로(`gap=xs`), 나머지는 세로로 쌓는다.

### 반응형 (두 뷰포트, `useBreakpoint`)

| 뷰포트 | 마감 안내 |
|---|---|
| **데스크탑 (≥ `lg` 1024px)** | 회색 점 + "장 마감" 제목 + "다음 개장 7/6(월) 09:00" 보조 한 줄. 순매수는 넛지 + "7일 누적 보기" 링크 한 줄. |
| **태블릿 (`md`~`lg`)** | 동일. 폭 여유가 있어 보조/넛지 그대로. |
| **모바일 (< `md` 768px)** | 제목 + 다음 개장 보조 세로 스택 유지(회색 점 + 제목 한 줄, 보조 다음 줄). 넛지·링크는 세로로 줄바꿈 허용. 좌우 패딩 유지, 텍스트 줄바꿈으로 잘림 방지. |

- 마감 안내는 카드리스 플랫 톤(홈 전체 정합)이라 뷰포트별 구조 변화가 작다 — 텍스트 줄바꿈만 다르다.
- **JS 분기는 `useBreakpoint`**(`window.innerWidth` 직접 검사 금지). Tailwind `md:`/`lg:` prefix 를 1차
  도구로 병행. 넛지 링크의 줄바꿈 여부만 `isMobile` 로 판단(모바일은 링크를 다음 줄로).

## Elevation & Depth

- 마감 안내 패널은 **그림자 없는 플랫** 블록이다. 홈이 카드리스(화이트포워드) 톤이라 elevation 을
  얹지 않고, `surface-muted` 배경의 옅은 명도 차만으로 "대기 영역"을 표현한다.
- 회색 점(`status-dot-closed`)은 정적이다. ②의 장중(`regular`) 녹색 점에 준 펄스를 **여기선 쓰지
  않는다** — 마감은 조용해야 하는 상태(라이브 강조는 열림에만).
- 에러 카드(`error-card`)도 기존대로 플랫. 세 상태 모두 그림자 없이 색·형태로만 구분한다.

## Shapes

- 마감 패널 · 에러 카드: `rounded.lg`(13px) — 홈 카드/섹션 라운드 정합.
- 회색 점(●): `rounded.pill`(999px) 완전한 원. `spacing.sm`(6px) 정사각 → pill. ②의 `status-dot-closed`
  와 동일 크기·형태.
- 넛지 링크 · 재시도 버튼: `rounded.sm`(8px) 작은 라운드(탭 타깃).
- 스켈레톤 행: `rounded.sm`. 각진 사각·과한 라운드는 쓰지 않는다.

## Components

- `market-closed-panel`: 리스트 영역을 대체하는 중립 안내 블록. `surface-muted` 배경, `body-sm` 본문
  톤, `rounded.lg`, 좌우 `spacing.xl` 패딩. `height` 는 최소 높이 기준값(`table-row-h`)으로, 실제로는
  ≈3행 높이를 확보해 레이아웃 시프트를 억제한다(구현 시 `min-h`).
- `status-dot-closed`: 안내 상단 회색 점(6px 원, `text-muted`). ②와 **동일 컴포넌트 개념** — 헤더 배지와
  본문 안내의 "닫힘" 신호를 한 색으로 통일. 색+텍스트 이중 인코딩(점만 남기지 않고 제목 라벨 동반).
- `market-closed-title`: "장 마감"(영업일)·"휴장"(주말·공휴일) 제목. `primary` 슬레이트, `body-strong`.
  마감 vs 휴장 분기는 `useMarketStatus().todayIsBusinessDay`(②의 `marketStatusLabel` 재사용) — 색·구조
  동일, 라벨 텍스트만 다르다.
- `market-closed-supplement`: "다음 개장 M/D(요일) HH:mm" 보조(`text-muted`, `caption`). `nextOpen`
  존재 시만. ②의 `nextOpenText()` 헬퍼(`lib/copy/market/marketStatus.ts`)를 그대로 소비 —
  두 지면이 같은 문자열을 렌더한다.
- `market-closed-nudge`: 순매수 당일 마감 전용 유도 문구("실시간 순매수는 장중에 제공돼요"). `text-muted`,
  `caption`. 실시간 순위 섹션에는 없다(순매수만).
- `market-closed-nudge-link`: "7일 누적 보기" 인라인 액션 링크(`link` 파랑, `button-sm`). 클릭 시 토글을
  `cumulative` 로 되돌린다. 마감 안내 안 유일한 클릭 유도점.
- `error-card`: (b) 진짜 에러(장중인데 KIS 실패) 유지용. `critical-soft` 빨간 틴트 + `critical` 텍스트.
  **마감 경로에서는 도달 불가**(호출 자체를 안 하므로 `isError` 안 뜸) — 장중 실패에서만 노출. 무변경.
- `error-retry-button`: 에러 카드의 "다시 시도"(`refetch`). 마감 안내에는 **없다**(호출 안 하므로
  재시도 무의미). 에러 카드에서만.
- `skeleton-row`: (c) 로딩 표현(`surface-muted`, `rounded.sm`, 행 높이). 첫 조회 중. 무변경.

## Do's and Don'ts

- ✅ 장 마감은 **중립(muted) 톤**으로 — 회색 점 + "장 마감" + "다음 개장 …". ②의 `closed` 회색 톤·
  "장 마감/휴장 · 다음 개장" 언어와 한 목소리.
- ✅ 마감 안내에는 **다시 시도 버튼을 숨긴다**(호출 자체를 안 하므로 재시도 무의미).
- ✅ 순매수 "7일 누적"은 마감에도 **정상 표시**(KV 스냅샷 과거 데이터, 게이팅 안 함). "당일"만 대체.
- ✅ 마감 마운트 시 토글 **초기값만** 누적으로(소프트 넛지). 세션 중 사용자 선택은 존중, 강제 전환 금지.
- ✅ (b) 진짜 에러(장중 실패)는 기존 `critical` 빨강 카드 + 다시 시도 **그대로 유지**. 마감과 색으로 구분.
- ✅ 탭바·토글·섹션 헤더는 유지하고 **콘텐츠 영역만** 교체(레이아웃 시프트 최소).
- ✅ 한글 카피는 `lib/copy/market/marketStatus.ts`(공용 안내)·`lib/copy/flow/labels.ts`(넛지) 단일 위치,
  색·간격은 토큰만(`cn` 헬퍼), 반응형은 `md:`/`lg:` + `useBreakpoint`.
- ❌ 마감 안내에 **빨강·경고색을 쓰지 않는다**(닫힘은 에러가 아님 — `critical` 금지).
- ❌ 마감 상태에서 회색 **점만 남기지 않는다**(색맹 접근성 — 제목 라벨 동반, 이중 인코딩).
- ❌ 마감 안내에 그림자·펄스·hex/px 직타를 넣지 않는다(플랫·정적·토큰만).
- ❌ 사용자가 고른 토글 모드를 마감이 됐다고 **몰래 바꾸지 않는다**(초기값만, 이후 강제 전환 금지).

---

## 유저 시나리오 (태스크 플로우)

### S1. 장 마감/주말에 마켓 홈 진입 — 실시간 순위

1. 평일 20시 이후 또는 주말·공휴일에 홈 진입 → `useMarketStatus().isRegularOpen === false`.
2. 실시간 순위 4탭은 KIS TR 을 **호출하지 않는다**(`enabled` 가 꺼짐). 에러 카드 대신 `market-closed-panel`.
3. 사용자는 `● 장 마감 · 다음 개장 7/6(월) 09:00`(회색·차분)을 본다 — "앱이 고장난 게 아니라 장이
   닫힌 것"을 즉시 인지. 다시 시도 버튼 없음(눌러도 소용없으니).
4. 다른 탭(거래대금·급상승 등)을 눌러도 같은 마감 안내가 유지된다(높이 안 튐).

### S2. 장 마감에 순매수 Top10 — 소프트 넛지 착지

1. 마감 상태로 카드 마운트 → 토글 초기값이 **"7일 누적"**(데이터 있는 탭)에 착지 → 정상 리스트를 본다.
2. 사용자가 궁금해서 "당일"을 직접 누름 → `market-closed-panel` + "실시간 순매수는 장중에 제공돼요 ·
   **7일 누적 보기**"(파랑 링크).
3. "7일 누적 보기" 클릭 → 토글이 누적으로 되돌아가 다시 데이터를 본다. 강제 전환이 아니라 사용자
   선택 → 놀람 없음.

### S3. 장중인데 KIS 실패 — 에러는 그대로 (마감과 구분)

1. 정규장 중(`isRegularOpen === true`)인데 KIS TR 이 실패 → 이건 **진짜 이상 신호**다.
2. 기존 `error-card`(빨강) + "다시 시도" 버튼이 그대로 뜬다 — 마감 안내로 흡수하지 않는다.
3. 회색(마감)과 빨강(에러)의 색 차이로 사용자는 "닫힌 것"과 "고장난 것"을 즉시 구분한다.

### S4. 토스 키 없음 / 캘린더 실패 (fail-open 무회귀)

1. prod(TOSS 키 미설정) 또는 캘린더 조회 실패 → `phase="unknown"` → `isRegularOpen=true`(fail-open).
2. 게이트가 장중처럼 취급 → 기존 동작 그대로(조회·리스트·에러 카드). 마감 안내는 **뜨지 않는다**.
3. 즉, 캘린더가 죽어도 "장중 오정지" 새 실패모드가 생기지 않는다. 마감 안내는 명시적 마감(캘린더
   성공 + `isRegularOpen=false`)에서만 노출된다(의도된 비대칭).

---

## 핸드오프 명세 (화면별 상태)

frontend-dev 가 바로 구현 가능한 상태 매트릭스. 카피는 `lib/copy/market/marketStatus.ts`(공용 마감 안내)·
`lib/copy/flow/labels.ts`(순매수 넛지) 단일 위치. 색·간격 토큰만.

### 세 상태 시각 분리 매트릭스

| 상태 | 트리거 | 배경 | 점/아이콘 | 텍스트 | 액션 |
|---|---|---|---|---|---|
| **(a) 장 마감** | `!isRegularOpen && !isLoading` (명시적 마감) | `market-closed-panel`(surface-muted) | `status-dot-closed`(회색 점) | 제목 `primary` + 보조 `text-muted` | **없음**(재시도 숨김) |
| **(b) 진짜 에러** | 장중(`isRegularOpen`) + `isError` | `error-card`(critical-soft 빨강) | 없음 | `critical` 빨강 문구 | `error-retry-button` "다시 시도" |
| **(c) 로딩** | `isLoading` | `skeleton-row`(surface-muted) | 없음 | 없음 | 없음 |

- 핵심 구분축: **색**(회색 vs 빨강 vs 스켈레톤 회색) + **액션**(없음 vs 다시 시도 vs 없음).
- (a)와 (c)는 둘 다 무채색이나 (a)는 텍스트 안내가 있고 (c)는 shimmer 만 — 정적 안내 vs 로딩 애니메이션.

### 실시간 순위 섹션 상태

| 조건 | 렌더 | 카피 |
|---|---|---|
| `isLoading` | `skeleton-row` ×N | — |
| `!isRegularOpen`(마감/휴장) | `market-closed-panel`(점+제목+다음개장). 탭바 유지. KIS 무호출. | 제목=`marketStatusLabel().full`("장 마감"/"휴장"), 보조=`nextOpenText(nextOpen)` |
| 장중 + `isError` | `error-card` + `error-retry-button` (기존 무변경) | `RANK_ERROR` + "다시 시도" |
| 장중 + 데이터 | 리스트(기존 무변경) | — |
| 장중 + empty | 기존 `RANK_EMPTY` (무변경) | `RANK_EMPTY` |

### 순매수 Top10 카드 상태

| 조건 | 렌더 | 카피 |
|---|---|---|
| 마운트 시 `!isRegularOpen` | 토글 초기값 = `cumulative`(소프트 넛지 착지) | — |
| `cumulative` 탭 (마감 무관) | **정상 리스트/`cumulativeCollecting`**(게이팅 안 함) | 기존 무변경 |
| `today` + `!isRegularOpen` | `market-closed-panel` + `market-closed-nudge` + `market-closed-nudge-link`("7일 누적 보기" → 토글 `cumulative`). KIS 무호출. | 제목=`marketStatusLabel().full`, 보조=`nextOpenText`, 넛지="실시간 순매수는 장중에 제공돼요" |
| `today` + 장중 + `isError` | `error-card`(기존 `card-critical` 무변경) | `FLOW_TOP10_ERROR` + 재시도 |
| `today` + 장중 + 데이터 | 리스트(기존 무변경) | — |

### 배선 규칙

- 마감 판별 원천은 `useMarketStatus()`(②) → `isRegularOpen`(`unknown→true` fail-open). 컴포넌트는 도메인
  훅만 소비(`useQuery` 직접 import 금지 — `docs/rules/frontend.md` §1).
- 라벨/다음 개장 문자열은 ②의 `marketStatusLabel(status)`·`nextOpenText(nextOpen)`
  (`lib/copy/market/marketStatus.ts`)를 **그대로 재사용** — 헤더 배지와 본문 안내가 동일 문자열을 렌더해
  톤 일원화. 신규 카피는 순매수 넛지("실시간 순매수는 장중에 제공돼요"·"7일 누적 보기") 2개만
  `lib/copy/flow/labels.ts` 에 추가.
- 공용 마감 안내는 신규 컴포넌트로 뽑는다(예 `components/market/MarketClosedNotice.tsx`) — 실시간 순위·
  순매수 당일이 재사용. `props`: `status`(제목·다음개장 파생), 선택적 `nudge`(순매수만 넘김). 점·제목·
  보조는 공용, 넛지는 순매수 케이스만 슬롯으로 주입.
- 마감 안내가 뜨는 경로에서는 `enabled=false`(§PRD §3-1·§3-2) 라 `isError`·리스트 분기에 도달하지
  않는다 — 마감 분기를 로딩/에러/리스트 분기 **앞**에 둔다.
- 반응형: `md:`/`lg:` prefix 1차, `useBreakpoint` 로 넛지 링크 줄바꿈만 판단(모바일=다음 줄).

---

## OPEN QUESTION 결정 (디자이너 영역)

PRD §9 중 디자이너 결정 영역 + 시각 설계 파생 결정.

| # | 항목 | 결정 |
|---|---|---|
| R1 | 공용 마감 UI 형태 (PRD §9 q4) | **신규 공용 컴포넌트**(`MarketClosedNotice`) 채택. 실시간 순위·순매수 당일(+향후 라이브 섹션)이 재사용, ②의 `MarketStatusBadge`·`nextOpen` 카피/톤과 일원화. empty-state 섹션별 확장(B)은 톤 분산 우려로 기각. |
| R2 | 마감 표현 톤 | **중립(muted)**: `market-closed-panel`(surface-muted) + `status-dot-closed`(회색 점, ②와 동일) + `primary` 제목 + `text-muted` 보조. 빨강·경고색 금지 — 닫힘은 에러가 아니다. |
| R3 | 다시 시도 버튼 | 마감 안내에서 **숨김**. 마감 시 KIS 무호출이라 재시도가 무의미 — 노출하면 헛수고 유인. 에러(장중 실패) 카드에서만 유지. |
| R4 | 세 상태 시각 분리 | (a)마감=회색 무채색·액션 없음 / (b)에러=`critical` 빨강·다시 시도 유지 / (c)로딩=스켈레톤. **색 + 액션 유무** 두 축으로 즉시 구분. (b) 에러 카드는 무변경. |
| R5 | 순매수 소프트 넛지 (PRD §9 q2) | **초기값만** `cumulative`(마운트가 마감일 때). 강제 자동전환 아님 — 사용자가 당일 클릭 시 마감 안내 + "7일 누적 보기"(`link` 파랑) 유도만. 세션 중 선택 존중. |
| R6 | 7일 누적 게이팅 | **게이팅 안 함**(KV 스냅샷 과거 데이터). 마감에도 정상 리스트. "당일"만 마감 안내로 대체. |
| R7 | 마감 vs 휴장 카피 | 둘 다 회색 점·구조 동일, 라벨만 `todayIsBusinessDay` 로 분기("장 마감" vs "휴장"). ②의 `marketStatusLabel()` 재사용. 둘 다 `nextOpen` 보조 동반. |
| R8 | 레이아웃 시프트 | 탭바·토글·섹션 헤더 유지, **콘텐츠 영역만** 교체. `market-closed-panel` 최소 높이 ≈`table-row-h`×3 로 탭 전환 시 높이 안정. |
| R9 | fail-open (unknown) | `phase="unknown"→isRegularOpen=true` 에선 마감 안내 **미노출**(장중 취급). 마감 안내는 명시적 `isRegularOpen=false` 에서만 — 캘린더 실패가 새 실패모드를 만들지 않는다(의도된 비대칭). |
| R10 | 신규 색 토큰 | **0개**. `surface-muted`·`text-muted`·`primary`·`link`·`critical`/`critical-soft`(라이브) + ②의 `status-dot-closed`(`text-muted`) 전부 재사용. SSOT(`finsight-redesign.md`) 병합 불필요. |
