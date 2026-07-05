---
version: alpha
name: ranking-columns
description: >-
  마켓 홈 실시간 순위(`RealtimeRankingSection`, 4탭 거래량/거래대금/급상승/급하락)에 토스 실시간 차트식
  **헤더 컬럼 행 + 시가총액·산업 컬럼 + 경고 배지 인라인 + 위험종목 숨기기 토글**을 얹는 디자인 가이드.
  기존 행([♥ 관심][순위][로고닷+종목명][현재가][등락률])은 정보가 부족했다 — 어떤 종목이 대형주인지, 어떤
  산업이 통째로 움직이는지, 어떤 종목이 투자유의(투자위험·투자경고·정리매매·VI)인지 순위에서 알 수 없었다.
  본 가이드는 (a) **컬럼 라벨 헤더 행**(순위·종목·산업·현재가·등락률·시총, 수치=우측 정렬, 토스톤 muted
  캡션), (b) **경고 배지 인라인**(기존 `StockWarningBadges` 재사용 — 관심종목·단타 워치와 동일 시각, 항상
  표시), (c) **시가총액 컬럼**(신규 `formatMarketCap` "12.3조"/"8,450억", enrich 실패 시 "-" fail-soft),
  (d) **산업 컬럼**(업종명 muted, ⑥ 지금뜨는산업 톤 정합, 없으면 빈칸), (e) **위험종목 숨기기 토글**(섹션
  헤더 탭 근처, 기본 off·opt-in, 켜면 위험군 필터), (f) **반응형 컬럼 우선순위**(모바일=시총·산업 숨김,
  핵심 종목명·현재가·등락률·배지 유지, 배지는 종목명 아래 줄바꿈)를 정의한다. 핵심 원칙은 **순수 add**다 —
  #247 가용성 모델·`MaintenanceNotice`·가변 탭바·관리자 재시도는 완전 무변경, 컬럼/옵션만 더한다.
  신규 색 토큰 0 — 등락 의미색(`signal-up`/`signal-down`)·muted·경고칩(`critical`/`warn`/`info`)은 전부
  `finsight-redesign` 라이브 토큰 재사용. 신규 spacing 은 컬럼 폭·헤더행 높이 4키(Layout 근거 명시).
  종목코드 미표시, hex/px 직타 0, WCAG AA 4.5:1 무회귀. PRD `ranking-columns` §3-3~§3-7 · AC-1~AC-13 충족.
colors:
  primary: "#1f3b4d"
  surface: "#ffffff"
  surface-muted: "#f6f8fa"
  border-line: "#eceff3"
  text-strong: "#0f1419"
  text-muted: "#5b6470"
  accent-soft: "#eaf0f6"
  signal-up: "#c81e1e"
  signal-down: "#1d4ed8"
  warn: "#a14a06"
  warn-soft: "#fff3df"
  info: "#1c4fd1"
  info-soft: "#e7efff"
  critical: "#8e1717"
  critical-soft: "#fde1e1"
typography:
  body-strong:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.4
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
  col-header:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
  table-cell-numeric:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tnum"
  badge-label:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.2
  button-sm:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
rounded:
  sm: 8px
  md: 12px
  pill: 999px
spacing:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 18px
  card-px: 16px
  table-row-h: 42px
  header-row-h: 30px
  col-sector: 128px
  col-marketcap: 96px
  button-sm-h: 32px
  badge-h: 20px
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
components:
  column-header-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.col-header}"
    height: "{spacing.header-row-h}"
    padding: 0px
  column-header-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.col-header}"
    padding: 0px
  rank-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-strong}"
    height: "{spacing.table-row-h}"
    padding: "{spacing.sm}"
  rank-row-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  stock-name:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-strong}"
    padding: 0px
  industry-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  price-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.table-cell-numeric}"
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
  marketcap-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.table-cell-numeric}"
    padding: 0px
  badge-critical:
    backgroundColor: "{colors.critical-soft}"
    textColor: "{colors.critical}"
    typography: "{typography.badge-label}"
    rounded: "{rounded.sm}"
    height: "{spacing.badge-h}"
    padding: "{spacing.sm}"
  badge-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    typography: "{typography.badge-label}"
    rounded: "{rounded.sm}"
    height: "{spacing.badge-h}"
    padding: "{spacing.sm}"
  badge-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    typography: "{typography.badge-label}"
    rounded: "{rounded.sm}"
    height: "{spacing.badge-h}"
    padding: "{spacing.sm}"
  risk-toggle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.pill}"
    height: "{spacing.button-sm-h}"
    padding: "{spacing.md}"
  risk-toggle-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.pill}"
    height: "{spacing.button-sm-h}"
    padding: "{spacing.md}"
  skeleton-cell:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.sm}"
    height: "{spacing.md}"
  empty-filtered:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.body-sm}"
    padding: "{spacing.lg}"
  divider:
    backgroundColor: "{colors.border-line}"
    height: 1px
---

# ranking-columns 디자인 가이드

## Overview

마켓 홈 실시간 순위(`components/home/RealtimeRankingSection.tsx`)는 KIS 실시간 랭킹 4탭(거래량/거래대금/
급상승/급하락)을 카드리스 플랫 표로 보여준다. 현재 각 행은 `[♥ 관심][순위][로고닷+종목명][현재가][등락률]`
뿐이라 세 가지 정보 격차가 있다 — (1) 대형주인지 잔주인지(시가총액), (2) 어떤 산업이 통째로 움직이는지
(업종), (3) 투자유의 종목인지(경고). 우리는 이 셋의 데이터·컴포넌트 자산을 **이미 갖고 있다**(⑥ 지금뜨는산업의
`enrichMarketCap`, `loadKisPriceMeta` 산업, 관심종목·단타 워치가 쓰는 `StockWarningBadges`). 본 가이드는 그
자산들을 실시간 순위에 **컬럼/옵션으로 얹는 시각 규칙**을 정한다.

핵심 방향은 넷이다.

- **순수 add — #247 무경계 (최우선 원칙).** `market-status-aware-home`(#247)의 가용성 모델·가변 탭바·공용
  `MaintenanceNotice`(중립 muted)·관리자 재시도는 **완전 무변경**이다. 본 가이드는 그 위에 헤더 컬럼 행·
  시총 셀·산업 셀·경고 배지·위험숨기기 토글만 더한다. 점검/로딩/빈 상태의 시각·톤은 #247·⑥ 문서를 SSOT 로
  상속하며 여기서 재정의하지 않는다(공용 `MaintenanceNotice` 재사용).
- **헤더 컬럼 행으로 표를 표답게.** 토스 실시간 차트처럼 리스트 상단에 **컬럼 라벨 행**(순위·종목·산업·현재가·
  등락률·시총)을 둔다. 수치 컬럼(현재가·등락률·시총)은 우측 정렬, 라벨은 토스톤 회색 캡션(`col-header`,
  12px/600 `text-muted`). 헤더-바디 컬럼은 동일 grid 트랙으로 정렬 정합을 강제한다.
- **배지·시총·산업은 기존 자산 재사용, 신규 색 토큰 0.** 경고 배지는 관심종목·단타와 **똑같은**
  `StockWarningBadges`(`badge-critical`/`badge-warn`/`badge-info`)를 쓴다 — 사용자가 지면마다 다른 위험 시각을
  학습하지 않게. 등락은 앱 전역 관례(`signal-up` 빨강=상승 / `signal-down` 파랑=하락), 시총·산업은 `text-muted`
  로 한 위계 낮춰 1차 정보(종목명·등락)를 방해하지 않는다. ⑥ 지금뜨는산업의 업종명 톤과 정합.
- **컬럼이 늘어도 모바일은 안 무너진다.** 컬럼이 6개로 늘면 좁은 화면이 깨진다. **모바일은 시총·산업을 숨기고**
  (`md:` + `useBreakpoint`) 핵심(종목명·현재가·등락률·배지)만 남긴다. 배지는 좁은 화면에서 종목명 옆이 아니라
  **아래 줄로 내리고**(줄바꿈) 최상위 심각도 1개만(`max=1`) 표시해 행 높이 폭발을 막는다.

## Colors

색은 **신규 토큰을 만들지 않고** `finsight-redesign` 라이브 토큰을 참조한다(`design:sync` SSOT 는
`finsight-redesign.md` 하나 — 이 문서 front matter 의 재선언은 lint 참조 해소용 동일값이다). frontend-dev 는
`text-signal-up`·`text-text-muted`·`bg-surface-muted` 같은 이미 존재하는 유틸과 `badge-critical`/`badge-warn`/
`badge-info`(`app/components.css` @layer components) 를 그대로 호출한다.

- **상승 = `signal-up`(#c81e1e, 빨강) · 하락 = `signal-down`(#1d4ed8, 파랑)**: 등락률 셀의 유일한 유채색.
  한국 개인 투자자 멘탈모델(상승=빨강/하락=파랑) 직결. 부호(±)를 함께 표기해 색+텍스트 이중 인코딩(색맹
  접근성). 흰 `surface` 위 AA 검증값. 본 PR 무변경(기존 `changeClass` 재사용).
- **종목명·현재가 = `text-strong`(#0f1419)**: 행의 1차 정보. 흰 배경 위 최고 대비로 스캔성 확보.
- **시가총액·산업·순번·컬럼 헤더 = `text-muted`(#5b6470)**: 2차 정보(보조 컨텍스트)는 한 위계 낮춘 회색으로
  눌러 종목명·등락과 위계를 가른다. 흰 `surface` 위 대비 ~5.9:1 로 AA 4.5:1 충족. 시총·산업이 굵거나 진하면
  "무엇이 오르나(등락)" 라는 순위의 본래 초점을 흐린다 — 그래서 보조색.
- **경고 배지 = `critical`/`warn`/`info` + 각 soft 배경**: 투자위험·정리매매 등 최고 심각도는 `critical`
  (#8e1717 on `critical-soft` #fde1e1), 투자경고·단기과열 등은 `warn`(#a14a06 on `warn-soft` #fff3df), VI·기타
  안내는 `info`(#1c4fd1 on `info-soft` #e7efff). **세 페어 전부 관심종목·단타 워치·종목 헤더가 이미 쓰는 동일
  토큰** — 지면 간 위험 시각 일관성이 목적이라 순위 전용 배지색을 새로 만들지 않는다. soft 배경 위 진한 텍스트
  로 AA 충족(finsight 검증값).
- **위험숨기기 토글 활성 = `accent-soft`(#eaf0f6) 배경 + `primary`(#1f3b4d) 텍스트**: 토글 on 상태. 회청 배경
  + 슬레이트 텍스트로 대비 ~10:1, 시끄러운 CTA 색을 쓰지 않는다(필터는 강조가 아니라 상태 표시 — ⑥ 세그먼트
  활성과 동일 언어). off 상태는 `surface` 흰 바탕 + `text-muted`(비활성 회색).
- **행 hover·순번 배경·스켈레톤 = `surface-muted`(#f6f8fa)**: 흰 위에서 아주 옅게 한 단 눌러 hover 어포던스·
  로딩 shimmer 를 표현. 카드리스 톤이라 테두리·그림자 대신 명도차만.
- **구분선 = `border-line`(#eceff3)**: 헤더 컬럼 행 하단·행 사이 1px 헤어라인.
- **점검 상태에 빨강 없음**: KIS/토스 실패는 #247 공용 `MaintenanceNotice`(중립 muted)로 흡수(본 PR enrich 는
  never-block 이라 컬럼만 빈칸 → 랭킹 자체는 무붕괴). `critical`(빨강 에러 카드)은 이 화면에 등장하지 않는다.

## Typography

- **종목명 = `body-strong`(14px/700)**: 행의 1차 텍스트. 굵게 눌러 스캔 시선을 잡는다(순위 표는 행 높이가
  좁아 16px 대신 14px/700).
- **현재가·등락률·시가총액 = `table-cell-numeric`(14px/700, tnum)**: 숫자 폭 고정(tnum)으로 자릿수 기준 세로
  정렬. 시총도 tnum 이라 "12.3조"·"8,450억" 이 우측에서 가지런히 선다.
- **산업·순번 = `caption`(12px/400)**: 업종명(예 "전기·전자")·순번은 보조 위계 caption. 산업은 truncate.
- **컬럼 헤더 = `col-header`(12px/600)**: "순위·종목·산업·현재가·등락률·시총" 라벨. caption 과 같은 크기지만
  600 으로 살짝 눌러 "라벨 행"임을 신호(본문 caption 400 과 구분). 토스톤 muted 회색.
- **경고 배지 = `badge-label`(12px/700)**: "투자경고"·"정리매매" 등 칩 텍스트. 좁은 배지 안에서 또렷하게 700.
  `StockWarningBadges` size `sm`(높이 `badge-h` 20px) 로 표 행에 맞춘다.
- **위험숨기기 토글 = `button-sm`(13px/700)**: "위험종목 숨기기" 라벨. 작지만 또렷한 버튼 톤.
- **빈 상태 = `body-sm`(14px/400)**: "숨긴 종목뿐이에요" 안내.
- 산업명·라벨 이외 tnum 은 쓰지 않는다(비례폭 유지).

## Layout

실시간 순위 섹션 골격은 무변경이다 — `[섹션 헤더(제목 + 탭 + 위험숨기기 토글)] → [헤더 컬럼 행] →
[랭킹 리스트(행 N개)] → [기준 각주]`. 본 가이드가 더하는 건 **헤더 컬럼 행**과 **행 grid 의 시총 셀**,
그리고 **섹션 헤더의 토글**이다. 로딩/점검/빈 탭 상태는 #247 그대로(스켈레톤·`MaintenanceNotice`·가변 탭바).

### 헤더 컬럼 행 (`column-header-row`) — 신규

- 리스트 바로 위 1행. 컬럼 라벨: **순위 · 종목 · 산업 · 현재가 · 등락률 · 시총**. `col-header`(muted) + 하단
  `divider`(1px `border-line`). 높이 `header-row-h`(30px).
- **바디 행과 동일 grid 트랙**을 공유해 헤더-바디 컬럼이 정확히 정렬된다. ♥ 관심 컬럼은 **라벨 없음**(아이콘
  전용 트랙). 수치 컬럼(현재가·등락률·시총)은 라벨도 **우측 정렬**, 텍스트 컬럼(종목·산업)은 좌측 정렬.
- **활성 탭 지표는 별도 값 컬럼을 만들지 않는다**(R1): 랭킹 행 타입은 `marketCap?`·`sector?` 만 add 하고
  거래대금/거래량 원값 필드는 PRD §3-1 범위 밖이다. 무엇으로 줄 세운 순위인지는 리스트 하단 **기준 각주**
  (`RANK_CAPTIONS`, 기존)가 이미 말한다("거래대금 순" 등). 헤더의 "현재가·등락률·시총" 은 표시 컬럼 라벨이다.

### 행 grid (`rank-row`) — 시총 셀 add

데스크탑(md+) 트랙(좌→우):

| 트랙 | 컬럼 | 정렬 | 폭 |
|---|---|---|---|
| 1 | ♥ 관심 | 중앙 | auto |
| 2 | 순위 | 중앙 | 1.25rem |
| 3 | 로고닷 + 종목명 + 경고배지 | 좌 | 1fr(신축) |
| 4 | 산업(업종명) | 좌 | `col-sector`(128px, truncate) |
| 5 | 현재가 | 우 | auto |
| 6 | 등락률 | 우 | 4rem(부호색) |
| 7 | 시가총액 | 우 | `col-marketcap`(96px) |

- 산업(4)·시총(7)은 **md+ 에서만 렌더**(모바일 숨김, §반응형). 기존 산업 셀의 `hidden … md:block` 패턴을
  시총 셀도 그대로 답습한다. 헤더 컬럼 행의 산업·시총 라벨도 동일 브레이크포인트로 표시/숨김 동기화.
- 행 높이 `table-row-h`(42px), hover 시 `rank-row-hover`(`surface-muted` + `rounded.sm`). 행 사이 헤어라인.
  종목명은 truncate, 산업은 truncate. 클릭 → `/stock/[ticker]`(기존, 무변경). Peek 프리페치 무변경.
- **신규 spacing 근거**: `col-sector`(128px)·`col-marketcap`(96px)·`header-row-h`(30px)·`badge-h`(20px) 4키를
  신규 도입한다. 컬럼 폭을 arbitrary 리터럴(`8rem`) 대신 토큰으로 잠가 헤더-바디 정합을 SSOT 로 고정하기
  위함(hex/px 직타 금지 원칙). `col-sector` 는 "전기·전자·서비스업" 같은 업종명 truncate 폭, `col-marketcap`
  은 "8,450억"·"12.3조" 최대폭 기준. `table-row-h`·`spacing.*`·`button-sm-h` 는 기존 재사용. SSOT
  (`finsight-redesign.md`) 병합은 frontend-dev 영역.

### 경고 배지 배치 (`StockWarningBadges` 재사용)

- **데스크탑/태블릿(md+)**: 종목명 **오른쪽 인라인**(gap `xs`). `size="sm"`(높이 `badge-h` 20px), `max=2`
  (좁은 순위 지면이라 최상위 2개). 활성 항목 없으면 무표시(레이아웃 무변화 — `StockWarningBadges` 가 null 반환).
- **모바일(< md)**: 종목명 셀을 **2줄 flex-wrap** 으로 — 1줄=로고닷+종목명, 2줄=배지. `max=1`(최상위 심각도만)
  으로 행 높이 폭발 방지(R3). `useBreakpoint().isMobile` 로 `max` 를 1↔2 분기.
- 배지는 **별도 헤더 컬럼 없음**(종목 셀에 종속) — 종목 정체성의 일부라 종목명에 붙인다.

### 위험종목 숨기기 토글 (`risk-toggle`)

- 위치: **섹션 헤더의 탭 근처**. 데스크탑은 `Section` 액션 슬롯에서 탭(`RankTabs`) **오른쪽**에 pill 토글로
  나란히. 모바일은 제목줄 아래 탭 행(현행 `self-start` 모바일 탭 줄)과 **같은 줄 우측**(`justify-between`),
  좁으면 탭 아래로 줄바꿈. 리스트 위에 항상 보이되 탭 전환을 방해하지 않는 위치.
- 형태: 라벨 "위험종목 숨기기" pill 버튼. **기본 off**(`risk-toggle`: 흰 바탕 + `text-muted`) → **on**
  (`risk-toggle-active`: `accent-soft` + `primary`). `aria-pressed` 로 상태 노출. 켜면 위험군(투자위험·투자경고
  등 severity `critical`+`warn`) 행을 리스트에서 필터(추가 fetch 0 — 배지 배치 데이터 재사용).

### 반응형 (모바일·태블릿·데스크탑, `useBreakpoint`)

| 뷰포트 | 표시 컬럼 | 배지 | 토글 위치 |
|---|---|---|---|
| **데스크탑 (≥ `lg` 1024px)** | ♥·순위·종목·**산업**·현재가·등락률·**시총** 전 컬럼. 헤더 컬럼 행 정렬 정합. `main-max-w` 컨테이너 상속(무변경). | 종목명 오른쪽 인라인, `max=2` | 헤더 액션, 탭 오른쪽 |
| **태블릿 (`md`~`lg`)** | 동일 전 컬럼(산업·시총 유지). 폭 여유. | 인라인 `max=2` | 동일 |
| **모바일 (< `md` 768px)** | ♥·순위·종목·현재가·등락률만. **산업·시총 숨김**(`hidden md:block`). 핵심 4정보 유지. | 종목명 **아래 줄바꿈**, `max=1`(최상위 심각도) | 모바일 탭 줄 우측(좁으면 아래로) |

- 헤더 컬럼 행도 동일 브레이크포인트로 산업·시총 라벨을 표시/숨김(헤더-바디 컬럼 정합 강제).
- **JS 분기는 `useBreakpoint`**(`window.innerWidth` 직접 검사 금지). Tailwind `md:`/`lg:` prefix 1차 병행.
  `isMobile` 로 판단하는 것은 배지 `max`(1↔2)·배지 배치(아래 줄바꿈 여부)뿐 — 컬럼 표시/숨김은 `md:` 유틸.
- **컨테이너 최대폭·grid 배치·sidebar 정책**은 마켓 홈 기존 레이아웃 상속(본 PR 무변경).

## Elevation & Depth

- 실시간 순위 표는 **그림자 없는 플랫**이다. 홈이 카드리스(화이트포워드) 톤이라 헤더 컬럼 행·행·배지 전부
  그림자 없이 명도차(`surface-muted` hover·soft 배지 배경)로만 위계를 준다.
- 위험숨기기 토글도 플랫 — on 상태는 그림자 대신 `accent-soft` 배경 명도차. 탭(`RankTabs`)의 흰 활성 pill
  관례(`shadow-sm`)는 기존 그대로(무변경), 토글은 그와 형제 톤.
- 시총·산업 로딩 스켈레톤(`skeleton-cell`)도 플랫(`surface-muted`, `rounded.sm`). enrich 지연을 흡수하되
  shimmer 외 elevation 없음.

## Shapes

- 헤더 컬럼 행·행: 각진 헤어라인(`divider` 1px). 행 hover 만 `rounded.sm`(8px).
- 경고 배지: `rounded.sm`(8px) — `StockWarningBadges` 기존 칩 라운드 그대로.
- 위험숨기기 토글: `rounded.pill`(999px) — 탭(`RankTabs`)과 동일 pill 어포던스(형제 컨트롤).
- 시총·산업 스켈레톤: `rounded.sm`. 순번 배경(있다면)·로고닷은 기존 `rounded.sm`(무변경).
- 각진 직각·과한 라운드는 쓰지 않는다.

## Components

- `column-header-row` / `column-header-cell`: 리스트 상단 컬럼 라벨 행(순위·종목·산업·현재가·등락률·시총).
  `col-header`(muted 12px/600), 하단 `divider`. 바디 행과 동일 grid 트랙 공유. 수치 라벨 우측 정렬. ♥ 트랙은
  라벨 없음. 산업·시총 라벨은 `md:` 에서만 노출(바디와 동기).
- `rank-row` / `rank-row-hover`: 랭킹 1행. `body-strong`(종목명 기준), 높이 `table-row-h`, hover
  `surface-muted`+`rounded.sm`. **grid 에 시총 셀 add**(기존 산업 셀 md+ 조건 재사용, 시총도 동일). ♥·순위·
  로고닷·현재가·등락률 셀은 기존 무변경.
- `stock-name`: 종목명(`body-strong`, `text-strong`, truncate). 종목코드 미표시(앱 전역 관례).
- `industry-cell`: 업종명(`caption`, `text-muted`, truncate). `loadKisPriceMeta` 산업. 미조회 시 빈칸(graceful
  omit, 크래시 없음). ⑥ 지금뜨는산업 업종명 톤 정합. md+ 에서만.
- `price-cell`: 현재가(`table-cell-numeric`, `text-strong`, 우측). 기존 무변경.
- `change-up` / `change-down`: 등락률(`+2.1%` 빨강 / `-1.3%` 파랑), `table-cell-numeric` tnum, 부호(±) 표기.
  기존 `changeClass` 재사용(무변경).
- `marketcap-cell`: 시가총액(`table-cell-numeric`, `text-muted`, 우측). `formatMarketCap`("12.3조"/"8,450억").
  enrich 실패·토스 미설정 시 "-"(fail-soft, NaN 방어). md+ 에서만.
- `badge-critical` / `badge-warn` / `badge-info`: `StockWarningBadges` 심각도 배지(재사용, 재정의 아님 —
  `app/components.css` @layer components 가 SSOT). 순위 행에서 `size="sm"`(높이 `badge-h`)·`max`(md=2/모바일=1)
  로 렌더. critical=정리매매·투자위험, warn=투자경고·단기과열, info=VI·기타. 활성 항목 없으면 무렌더.
- `risk-toggle` / `risk-toggle-active`: "위험종목 숨기기" pill 토글. off=`surface`+`text-muted`,
  on=`accent-soft`+`primary`. `aria-pressed`. 켜면 위험군(severity `critical`+`warn`) 행 필터(추가 fetch 0).
  기본 off(opt-in).
- `skeleton-cell`: 시총·산업 컬럼 로딩 표현(`surface-muted`, `rounded.sm`). enrich 지연 흡수 — 랭킹 행은
  즉시 렌더되고 시총·산업 셀만 스켈레톤 → 값 도착 시 교체(레이아웃 시프트 최소).
- `empty-filtered`: 위험숨기기 on 으로 리스트가 전부 필터돼 비면(`text-muted`, `body-sm`) — "숨긴 종목뿐이에요"
  (크래시 없음, off 로 복원).
- `divider`: 헤더 컬럼 행 하단·행 사이 1px 헤어라인(`border-line`).
- **점검/로딩/가변 탭바는 #247 공용 재사용**: 전탭 실패=`MaintenanceNotice`(중립 muted, 관리자만 재시도),
  로딩=`skeleton-row`(기존), 가변 탭바=available 탭만. 본 문서는 이들을 **재정의하지 않는다**(SSOT =
  `market-status-aware-home.md`). enrich(시총·산업) 실패는 점검을 유발하지 않는다(컬럼만 빈칸, never-block).

## Do's and Don'ts

- ✅ 헤더 컬럼 행은 **바디 행과 동일 grid 트랙**을 공유해 정렬을 강제한다(수치 라벨 우측·텍스트 라벨 좌측).
- ✅ 경고 배지는 **기존 `StockWarningBadges` 재사용** — 관심종목·단타 워치와 동일 시각(지면 간 위험 일관성).
  배지는 **항상 표시**(활성 항목 없으면 무렌더, 레이아웃 무변화).
- ✅ 시총은 **`formatMarketCap` 조/억 컴팩트 표기**("12.3조"/"8,450억"), enrich 실패는 **"-"**(fail-soft·NaN 방어).
- ✅ 산업은 **`text-muted` 업종명**(⑥ 지금뜨는산업 톤 정합), 미조회는 **빈칸**(graceful omit).
- ✅ 위험숨기기 토글은 **기본 off(opt-in)**, on=`accent-soft`+`primary` pill, 켜면 위험군(severity
  `critical`+`warn`) 필터(추가 fetch 0 — 배지 데이터 재사용).
- ✅ **모바일은 시총·산업 컬럼을 숨기고**(`md:` + `useBreakpoint`) 핵심(종목명·현재가·등락률·배지)만. 배지는
  **종목명 아래 줄바꿈** + `max=1`.
- ✅ 시총·산업 enrich 지연은 **`skeleton-cell`** 로 흡수 — 랭킹 행은 즉시, 컬럼만 스켈레톤(레이아웃 시프트 최소).
- ✅ 한글 카피는 `lib/copy/home/marketOverview.ts` 단일 위치, 색·간격은 토큰만(`cn` 헬퍼), 반응형은 `md:`/
  `lg:` + `useBreakpoint`.
- ❌ **#247 가용성 로직·`MaintenanceNotice`·가변 탭바·관리자 재시도를 편집하지 않는다**(순수 add — AC-11 diff 무변경).
- ❌ enrich(시총·산업) 실패를 **점검 상태로 승격하지 않는다**(랭킹 rows 는 정상, 컬럼만 빈칸 — never-block).
- ❌ 순위 전용 경고 배지색·시총 색을 **새로 만들지 않는다**(기존 `critical`/`warn`/`info`·`text-muted` 재사용).
- ❌ 시총·산업 값을 **종목명·등락보다 진하게** 두지 않는다(2차 정보 = `text-muted`, 순위 초점 유지).
- ❌ **종목코드·업종코드를 노출하지 않는다**(앱 전역 관례 — 업종명·종목명만). hex/px 직타 금지.
- ❌ 위험숨기기 토글을 **기본 on 으로 두지 않는다**(예고 없이 리스트를 줄여 혼란 — opt-in).

---

## 유저 시나리오 (태스크 플로우)

### S1. 실시간 순위에서 대형주·산업·위험을 한눈에 (데스크탑)

1. 마켓 홈 진입 → 실시간 순위(거래대금 탭) 렌더. 리스트 위 **헤더 컬럼 행**(순위·종목·산업·현재가·등락률·시총).
2. 각 행에서 종목명 옆 **경고 배지**(있으면 "투자경고" 등), 산업("전기·전자"), 시총("12.3조")을 함께 스캔.
3. "급등한 이 종목이 8,450억 소형주에 투자경고까지 붙었구나" 를 한 행에서 읽는다(위험 종목 선별).
4. 시총·산업 enrich 가 지연되면 그 셀만 잠깐 `skeleton-cell` → 값 도착 시 교체(랭킹 행은 즉시 렌더).

### S2. 위험종목 숨기기 (opt-in 필터)

1. 사용자가 섹션 헤더의 **"위험종목 숨기기"** 토글 클릭(off→on, `accent-soft`+`primary`).
2. 위험군(투자위험·투자경고 등 severity `critical`+`warn`) 행이 리스트에서 **즉시 제외**(추가 fetch 0).
3. 재클릭(on→off) → 전체 복원. 필터로 리스트가 전부 비면 "숨긴 종목뿐이에요"(`empty-filtered`), 크래시 없음.

### S3. 모바일 — 핵심 컬럼만, 배지는 아래 줄

1. 좁은 화면 진입 → 산업·시총 컬럼 **숨김**. 행 = `[♥][순위][종목명 + (아래줄)배지][현재가][등락률]`.
2. 배지는 종목명 아래 줄바꿈 + **최상위 심각도 1개**(`max=1`)만 → 행 높이 폭발 없음.
3. 위험숨기기 토글은 모바일 탭 줄 우측(좁으면 탭 아래로 줄바꿈). 필터 동작은 데스크탑과 동일.

### S4. enrich 실패 / 토스 미설정 — fail-soft 빈칸

1. prod 야간점검(KIS/토스 실패) 또는 로컬 무키(토스 미설정) → 시총·산업 enrich 실패.
2. 랭킹 rows 는 **정상 렌더**(#247 판정에 따라 kis/mock), 시총 셀 "-", 산업 셀 빈칸. **에러 카드 0**.
3. 경고 배치도 토스 미설정 시 빈 맵 → 배지 0(크래시 없음). 리스트는 무붕괴.

### S5. #247 점검·가변 탭바 무회귀

1. 전탭 실패(KIS 야간점검) → 헤더 컬럼 행·리스트 대신 공용 `MaintenanceNotice`(중립 muted, 관리자만 재시도).
2. 일부 탭만 실패 → 가변 탭바(available 탭만), 정상 탭에서 헤더 컬럼 행 + 신규 컬럼 정상. #247 동작 그대로.

---

## 핸드오프 명세 (화면별 상태)

frontend-dev 가 바로 구현 가능한 상태 매트릭스. 카피는 `lib/copy/home/marketOverview.ts` 단일 위치(헤더 라벨·
토글 라벨·필터 빈 상태 추가). 점검/로딩/탭 상태 카피·컴포넌트는 #247·⑥ 공용 재사용. 색·간격 토큰만.

### 데이터 소스별 컬럼 (PRD §6-1)

| 컬럼 | 소스 | 위치 | fail-soft |
|---|---|---|---|
| 경고 배지 | 토스 warnings(`useQueryStockWarningsBatch`) | **클라** 배치(가시 티커 union 1회) | 빈 맵 → 배지 0 |
| 시가총액 | 토스 마스터 `sharesOutstanding × price`(`enrichMarketCap`) | **서버** route enrich(top-N) | `null` → "-" |
| 산업 | KIS `inquire-price` `bstp_kor_isnm`(`loadKisPriceMeta`) | **서버** route enrich(top-N) | 미설정 → 빈칸 |

### 실시간 순위 섹션 상태 (`RealtimeRankingSection`)

| 조건 | 렌더 | 카피(한글) |
|---|---|---|
| 프로브 진행 중(로딩) | `skeleton-row` ×N + 탭바 스켈레톤(#247 무변경) | — |
| available · 랭킹 있음 | `column-header-row` + `rank-row` ×N(신규 컬럼 포함) + 기준 각주 | 헤더 라벨 "순위·종목·산업·현재가·등락률·시총" |
| available · 랭킹 빈 배열 | 기존 빈 안내(`RANK_EMPTY`, 무변경) | "표시할 종목이 없어요"(기존) |
| **위험숨기기 on · 전량 필터** | `empty-filtered` 1블록. 헤더·토글 유지 | "숨긴 종목뿐이에요" |
| enrich 지연(시총·산업 미도착) | 랭킹 행 즉시 + 해당 셀 `skeleton-cell` | — |
| enrich 실패/토스 미설정 | 랭킹 행 정상 + 시총 "-"·산업 빈칸·배지 0 | — |
| 전탭 unavailable(#247) | 공용 `MaintenanceNotice`(관리자만 재시도) | `MAINTENANCE_TITLE`·`MAINTENANCE_SUPPLEMENT`(기존) |

### 행(row) 구현 스펙

- **`rank-row`**(md+): grid 트랙 `[♥ auto][순위 1.25rem][종목 1fr][산업 col-sector][현재가 auto][등락률 4rem]
  [시총 col-marketcap]`. 산업·시총 셀 `hidden md:block`. 종목 셀 = `[로고닷][종목명][배지 인라인 max=2]`(flex,
  gap `xs`, 종목명 truncate). 등락 부호색은 `direction`(up=빨강/down=파랑), tnum.
- **`rank-row`**(모바일): grid 트랙 `[♥][순위][종목 1fr][현재가][등락률]`(산업·시총 제거). 종목 셀 flex-wrap
  → 1줄 로고닷+종목명, 2줄 배지 `max=1`.
- 시총 `formatMarketCap(marketCap)` → "12.3조"/"8,450억"/`null`→"-"(신규 유틸, `formatNetBuy` 패턴·NaN 방어).
- 배지 `<StockWarningBadges warnings={warnings[ticker]} size="sm" max={isMobile ? 1 : 2} />`.

### 배선 규칙

- 컴포넌트는 도메인 훅만 소비(`useQuery` 직접 import 금지 — `docs/rules/frontend.md` §1). 시총·산업은 랭킹
  도메인 훅(`useQueryVolumeRank`·`useQueryFluctuation`)이 노출하는 행에 이미 실려 온다(서버 enrich).
- 경고는 **클라 배치**: 가시(effective 탭) 티커 union 을 `useQueryStockWarningsBatch(tickers)` 로 1회 조회
  (기존 훅·`/api/stock/warnings/batch` BFF, 신규 배선 0). 섹션이 단일 인스턴스로 소유(행마다 개별 호출 금지).
- 위험숨기기 필터는 §경고 배치 데이터 재사용(추가 fetch 0). 위험군 판정 = `lib/copy/stock/warnings.ts` 의
  severity `critical`+`warn`(R2). 토글 state 는 컴포넌트 로컬(URL 동기화·영속 없음 — 후속).
- 반응형: `md:`/`lg:` prefix 1차, `useBreakpoint` 는 배지 `max`(1↔2)·모바일 배지 아래줄 여부만 판단
  (`window.innerWidth` 직접 검사 금지).
- **#247 무편집**: `lib/market/availability.ts`·`lib/market/rankingView.ts`·`components/market/
  MaintenanceNotice.tsx` 는 편집 대상 아님(AC-11 diff 무변경). 편집 지점 = `RealtimeRankingSection`(헤더행·
  시총 셀·배지·토글) + 행 타입 옵셔널 add + route enrich + `formatMarketCap` + 카피.

---

## OPEN QUESTION 결정 (디자이너 영역)

PRD §9 중 디자이너 결정 영역(q3·q4·q5) + 시각 설계 파생 결정.

| # | 항목 | 결정 |
|---|---|---|
| R1 | 헤더 컬럼 구성 (PRD §3-5) | **순위 · 종목 · 산업 · 현재가 · 등락률 · 시총** 6라벨(♥ 트랙은 라벨 없음). 수치=우측 정렬, 텍스트=좌측. 바디 행과 동일 grid 트랙 공유(정렬 강제). **활성탭 지표(거래대금/거래량) 값 컬럼은 add 안 함** — 행 타입이 원값 필드를 안 실음(PRD §3-1 범위 밖). 정렬 기준은 기존 하단 기준 각주(`RANK_CAPTIONS`)가 전달. FE 가 값 컬럼을 원하면 PRD §3-1 에 필드 추가 필요(PM 영역). |
| R2 | 경고 배지 배치·재사용 (PRD §9 q3·q4) | **기존 `StockWarningBadges` 재사용**(관심종목·단타와 동일 시각). **항상 표시**(활성 없으면 무렌더). 데스크탑=종목명 오른쪽 인라인 `max=2`, 모바일=종목명 아래 줄바꿈 `max=1`(최상위 심각도). 위험군 판정 = severity `critical`+`warn`. |
| R3 | 모바일 컬럼 우선순위 (PRD §9 q3) | **모바일=시총·산업 숨김**(`hidden md:block`), 핵심 유지 `[♥][순위][종목+배지][현재가][등락률]`. 배지는 종목명 아래 줄바꿈 + `max=1`. 컬럼 표시/숨김은 `md:` 유틸, 배지 max·배치만 `useBreakpoint`. |
| R4 | 위험숨기기 토글 위치·기본값 (PRD §9 q4) | **섹션 헤더 탭 근처**(데스크탑=탭 오른쪽 액션, 모바일=탭 줄 우측). **기본 off(opt-in)** — 배지가 이미 위험을 표면화하므로 기본 숨김은 예고 없이 리스트를 줄여 혼란. pill 형태(off=흰+muted / on=`accent-soft`+`primary`). |
| R5 | 시가총액 표기 (PRD §9 q5) | **신규 `formatMarketCap` 조/억 컴팩트 표기**("12.3조"/"8,450억"/`null`→"-"). `formatNetBuy`(억원) 패턴 답습·NaN 방어. `formatMoney`(콤마 원값)는 자릿수 과다로 셀 오버플로 → 컴팩트 필수. `table-cell-numeric` tnum·`text-muted`(2차 정보). |
| R6 | 산업 컬럼 톤 | 업종명(`caption`·`text-muted`·truncate), ⑥ 지금뜨는산업 업종명 톤 정합. 미조회=빈칸(graceful omit). md+ 에서만. 업종코드 미표시. |
| R7 | 신규 색 토큰 | **0개**. 등락(`signal-up`/`signal-down`)·2차정보(`text-muted`)·경고칩(`critical`/`warn`/`info`+soft)·토글 활성(`accent-soft`+`primary`)·hover(`surface-muted`)·선(`border-line`) 전부 라이브 재사용. SSOT(`finsight-redesign.md`) 병합 불필요. |
| R8 | 신규 spacing 토큰 | **4키**: `col-sector`(128px, 업종명 truncate 폭)·`col-marketcap`(96px, "8,450억" 최대폭)·`header-row-h`(30px, 컬럼 라벨 행)·`badge-h`(20px, `sm` 배지 높이). 컬럼 폭을 arbitrary 리터럴 대신 토큰으로 잠가 헤더-바디 정합 SSOT 고정(hex/px 금지 원칙). SSOT 병합은 frontend-dev 영역. |
| R9 | enrich 지연·실패 시각 | 지연=`skeleton-cell`(시총·산업 셀만, 랭킹 행 즉시). 실패/미설정=시총 "-"·산업 빈칸·배지 0(fail-soft). **점검 상태로 승격 안 함**(never-block — 랭킹 rows 무붕괴, 에러 카드 0). |
| R10 | 위험숨기기 전량 필터 빈 상태 | `empty-filtered`("숨긴 종목뿐이에요", `text-muted`·`body-sm`). 헤더·토글 유지, off 로 복원. 크래시 없음. |
| R11 | #247 무경계 | 가용성 로직·`MaintenanceNotice`·가변 탭바·관리자 재시도 **무편집**(AC-11 diff 무변경). 점검/로딩/탭 상태는 공용 재사용(본 문서 재정의 없음, SSOT=`market-status-aware-home.md`). |
