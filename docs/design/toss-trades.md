---
version: alpha
name: toss-trades
description: >-
  토스 체결강도(틱룰 파생) + 체결 테이프 공용 컴포넌트 `TradeStrengthPanel` 디자인 가이드. 상단 체결강도 게이지
  (매수 vs 매도 체결 비중, 하나의 가로 누적 바) + 하단 체결 테이프(최근 N건 · 시각/가격/수량 · 상승틱/하락틱 색)
  구조. 색은 신규 색 토큰 없이 `finsight-redesign` 등락 의미 토큰 재매핑 — 단, `OrderbookPanel` 과 **의도적으로
  반대** 로 매핑한다: **매수/상승틱 = `signal-up`(빨강) · 매도/하락틱 = `signal-down`(파랑)**. 근거는
  Colors·Do's 절과 R1 에 명시(호가는 price-level 축, 체결은 momentum/등락 축 → 각자 도메인 관례를 따라야 하며,
  체결 게이지·테이프가 한 컴포넌트 안에서 색이 일치해야 한다). 게이지 세그먼트는 orderbook 바와 동일한 soft 톤으로
  같은 지면 시각 정합. 두 variant(compact = `/intraday` · full = `/stock`)를 prop 분기, 로딩(스켈레톤)·
  빈 체결(장마감)·정상 3상태. 테이프 행 높이·타이포는 orderbook 토큰(`orderbook-row-h`) 재사용, 신규 토큰은
  게이지 높이 `strength-gauge-h` 1개로 한정. 근사(추정) 성격은 큰 배너 대신 "추정치" 미세 칩 + 툴팁으로 정직 표기.
  WCAG AA 4.5:1 무회귀.
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
  table-cell-numeric:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tnum"
  mono-numeric:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tnum"
rounded:
  sm: 8px
  md: 12px
  lg: 13px
spacing:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  card-px: 16px
  orderbook-row-h: 30px
  orderbook-row-h-compact: 24px
  orderbook-divider-h: 1px
  strength-gauge-h: 10px
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
components:
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-px}"
  panel-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.h2}"
    padding: 0px
  panel-header-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.label-sm}"
    padding: 0px
  section-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-sm}"
    padding: 0px
  strength-gauge-track:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    height: "{spacing.strength-gauge-h}"
  strength-gauge-buy:
    backgroundColor: "{colors.signal-up-soft}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    height: "{spacing.strength-gauge-h}"
  strength-gauge-sell:
    backgroundColor: "{colors.signal-down-soft}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    height: "{spacing.strength-gauge-h}"
  strength-gauge-neutral:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    height: "{spacing.strength-gauge-h}"
  strength-pct-buy:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-up}"
    typography: "{typography.mono-numeric}"
    padding: 0px
  strength-pct-sell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-down}"
    typography: "{typography.mono-numeric}"
    padding: 0px
  approx-label:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  tape-row-up:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-up}"
    typography: "{typography.table-cell-numeric}"
    height: "{spacing.orderbook-row-h}"
    padding: "{spacing.xs}"
  tape-row-up-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-up}"
    typography: "{typography.caption}"
    height: "{spacing.orderbook-row-h-compact}"
    padding: "{spacing.xs}"
  tape-row-down:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-down}"
    typography: "{typography.table-cell-numeric}"
    height: "{spacing.orderbook-row-h}"
    padding: "{spacing.xs}"
  tape-row-down-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-down}"
    typography: "{typography.caption}"
    height: "{spacing.orderbook-row-h-compact}"
    padding: "{spacing.xs}"
  tape-row-neutral:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.table-cell-numeric}"
    height: "{spacing.orderbook-row-h}"
    padding: "{spacing.xs}"
  tape-time:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  tape-qty:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  divider:
    backgroundColor: "{colors.border-line}"
    height: "{spacing.orderbook-divider-h}"
  empty-state:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.body-sm}"
    padding: "{spacing.lg}"
  skeleton-row:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.sm}"
    height: "{spacing.orderbook-row-h}"
  skeleton-gauge:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.sm}"
    height: "{spacing.strength-gauge-h}"
---

# toss-trades 디자인 가이드

## Overview

토스 앱 사용자에게 **체결강도**(매수 체결이 우세한지 매도 체결이 우세한지)와 **체결 테이프**(방금 어떤 가격에
얼마가 체결됐는지 흘러가는 목록)는 순간 수급을 읽는 익숙한 도구다. 이 가이드는 토스 `GET /api/v1/trades` 응답을
토스톤(밝고 간결·정보밀도 높음)으로 렌더하는 공용 `TradeStrengthPanel` 을 정의한다. 이 패널은 시리즈 ①
`OrderbookPanel`(호가창)과 **같은 지면에 나란히** 놓이므로 톤·밀도·라운드·여백을 그대로 맞춘다.

핵심 방향:

- **한 패널 두 블록**: 상단 = 체결강도 게이지(매수 vs 매도 비중 하나의 가로 누적 바 + % 표기), 하단 = 체결 테이프
  (최근 N건 · 시각/가격/수량 · 상승틱/하락틱 색). 게이지가 "지금 어느 쪽이 세냐"를, 테이프가 "그 근거인 개별 체결"을
  보여주는 요약→디테일 구조.
- **정직한 근사(핵심 제약)**: 토스 체결 응답에는 **매수/매도 방향 필드가 없다**. 체결강도는 틱룰(상승틱=매수·
  하락틱=매도·동일가=상속)으로 **파생한 추정치**다. 정확한 수급이 아니다. 이 성격을 큰 경고 배너가 아니라 게이지 옆
  **"추정치" 미세 칩 + 툴팁 한 개**로 정직하게 표기해 과신만 차단한다(PRD q1).
- **한 컴포넌트 두 밀도**: `/intraday`(단타)는 빠른 스캔용 compact, `/stock`(종목상세)은 참고용 full. 구조는 동일,
  게이지 %·테이프 행 높이/타이포만 분기한다.
- **신규 색 토큰 0개**: 등락 색 관례(`signal-up` 빨강 / `signal-down` 파랑)를 재매핑한다. 단 **`OrderbookPanel`
  과는 의도적으로 반대**로 매핑한다(아래 Colors·R1 근거). 종목코드 미표시 관례 유지.

## Colors

색은 **신규 색 토큰을 만들지 않고** `finsight-redesign` 라이브 토큰(`signal-up`·`signal-down`·soft 페어·중립
회청 계열)을 그대로 참조한다. front matter 는 lint 참조 해소용 동일값 재선언이며, frontend-dev 는 이미 존재하는
`bg-signal-up-soft`·`text-signal-down` 같은 유틸을 그대로 호출한다.

**★ 매핑 방향 — `OrderbookPanel` 과 의도적으로 반대 (R1 핵심):**

- **매수 체결 / 상승틱 = `signal-up`(#c81e1e, 빨강) / `signal-up-soft`(#fee2e2)**
- **매도 체결 / 하락틱 = `signal-down`(#1d4ed8, 파랑) / `signal-down-soft`(#dbeafe)**

`OrderbookPanel` 은 **매도호가 = `signal-up`(빨강)·매수호가 = `signal-down`(파랑)** 을 썼다. 체결 패널은 그
반대다. 이유:

1. **테이프가 색 방향을 고정한다(양보 불가).** 체결 테이프의 각 행은 **가격 등락(상승틱/하락틱)** 으로 색칠한다 —
   상승틱은 반드시 빨강, 하락틱은 반드시 파랑이어야 한다(앱 전역 캔들 차트가 상승=빨강). 그런데 틱룰상 **상승틱 =
   매수 체결**이다. 따라서 테이프에서 매수 체결은 이미 빨강으로 확정된다. 게이지의 매수 세그먼트만 파랑으로 두면 **한
   컴포넌트 안에서 "매수"가 게이지=파랑·테이프=빨강** 으로 모순된다 — 한눈에 보이는 자기모순이라 절대 금지.
2. **두 패널은 서로 다른 축을 측정한다.** 호가의 빨강/파랑은 **가격 레벨 축**(매도호가가 현재가 위 = 관례상 빨강)이고,
   체결의 빨강/파랑은 **가격 변화/모멘텀 축**(상승틱 = 상승 압력 = 빨강)이다. 각 도메인 관례를 따르는 것이 옳고,
   억지로 색을 맞추면 오히려 "빨강"의 의미가 두 패널에서 (호가=매도, 체결=매수/상승) 뒤엉킨다.
3. **매수 우위 = 상승 압력(bullish) = 빨강** 이 한국 등락 멘탈모델과도 정합한다. "매수 62%"가 빨강으로 강조되는 것이
   직관적이다.
4. **혼동 완충**: 두 패널은 각자 텍스트 라벨("호가" vs "체결강도")로 명시 구분되고, 게이지는 색 단독이 아니라 항상
   **"매수 62% · 매도 38%" 글자**를 함께 노출한다(색맹·색약 접근성 포함 — 색은 보강, 라벨이 1차 신호).

기타:

- **게이지 세그먼트 = soft 톤**(`signal-up-soft`·`signal-down-soft`): orderbook 잔량 바와 **동일한 밝기**로 같은
  지면에서 톤이 튀지 않게 한다. 게이지의 "강조"는 세그먼트 채도가 아니라 위 % 숫자(원색 mono-numeric)가 담당한다.
- **게이지 트랙/불명 = `surface-muted`(#f6f8fa)**: `strength=null`(분모 0·빈 체결·전부 동일가)일 때 중립 회색
  트랙만 표시.
- **"추정치" 칩 = `accent-soft`(#eaf0f6) 배경 · `text-muted` 텍스트**: 정보 힌트 톤(경고 아님).
- **시각/수량 = `text-muted`**: 가격보다 한 단 낮춘 위계.
- **구분선 = `border-line`(#eceff3)** · **패널 제목 = `text-strong`** · **소제목 = `primary`(#1f3b4d)**.
- 원색 텍스트(`signal-up`/`signal-down`)는 항상 **흰 배경(`surface`) 위**에서만 쓴다 — orderbook 에서 AA(4.5:1)
  검증된 조합. **soft 색 위에 원색 텍스트를 얹지 않는다**(게이지 세그먼트에는 텍스트를 올리지 않고, %는 흰 배경 위에).

## Typography

- **체결강도 % = `mono-numeric`(15px/700, tnum)**: 패널에서 가장 강조되는 숫자. "매수 62%"는 `signal-up`,
  "매도 38%"는 `signal-down` — 좌우 대칭 readout(우열 로직 없이 두 값 동일 크기·색 코드).
- **테이프 가격(full) = `table-cell-numeric`(14px/700, tnum)** / **(compact) = `caption`(12px)**: orderbook 가격
  관례와 동일 토큰. tnum 으로 자릿수 정렬.
- **시각·수량 = `caption`(12px, `text-muted`)**: 부차 정보 위계.
- **패널 제목 = `h2`(full) / `label-sm`(compact)** · **소제목("체결강도"/"최근 체결") = `label-sm`(`primary`)**:
  orderbook 헤더 위계와 정합.
- **"추정치" 칩·빈 상태 = `caption` / `body-sm`**: 최소 위계.

## Layout

### 공통 골격

세로 스택 1열: `[헤더] → [체결강도 블록] → [divider] → [체결 테이프 N행]`.

- **체결강도 블록**: `[소제목 "체결강도" + "추정치" 칩] → [게이지 트랙(가로 100%)] → ["매수 n% · 매도 m%" readout]`.
  - 게이지 = **하나의 가로 누적 바**. 좌측 = 매수 세그먼트(`signal-up-soft`), 우측 = 매도 세그먼트(`signal-down-soft`).
    세그먼트 폭 = `buyVolume / (buyVolume+sellVolume)` : 나머지. 경계 위치가 곧 강도. 좌측(매수)을 선두에 두는 이유는
    "매수 우위 %"가 헤드라인 지표이고 좌→우 읽기 흐름에 맞기 때문.
  - `strength=null` → 세그먼트 없이 `strength-gauge-neutral`(중립 회색 트랙) + readout "—".
- **체결 테이프**: 최근 N행. 각 행 = 3열 그리드 `[시각(좌, muted)] · [가격(우정렬, 등락색)] · [수량(우정렬, muted)]`.
  최신 체결이 맨 위(최신순). 상승틱 행 = `signal-up`, 하락틱 행 = `signal-down`, 동일가(zero-tick)는 **상속된 분류의
  색**(상승 뒤 동일가 = 빨강, 하락 뒤 동일가 = 파랑), seed 불명 첫 행은 `tape-row-neutral`(text-muted).

### 밀도 variant

| 구분 | compact (`/intraday` 단타) | full (`/stock` 종목상세) |
|---|---|---|
| 패널 제목 | `label-sm` | `h2` |
| 게이지 높이 | `spacing.strength-gauge-h`(10px) | `spacing.strength-gauge-h`(10px) |
| 게이지 % | `mono-numeric` | `mono-numeric` |
| 테이프 건수 | 10건 | 30건 |
| 테이프 행 높이 | `spacing.orderbook-row-h-compact`(24px) | `spacing.orderbook-row-h`(30px) |
| 테이프 가격 typography | `caption`(12px) | `table-cell-numeric`(14px) |
| 블록 간 여백 | `spacing.xs`(4px) | `spacing.sm`(6px) |
| 시각 표기 | HH:MM(초 생략, 폭 절약) | HH:MM:SS |

> **신규 토큰 근거**: 게이지 높이 `strength-gauge-h`(10px) **1개만** 신규 도입한다. 게이지는 20행 테이블이 아니라
> 단일 요약 미터라 밀도에 따라 줄일 필요가 없어 compact/full 공용 1값으로 둔다(밀도 차이는 테이프 행·타이포·여백이
> 담당). 테이프 행 높이는 시리즈 ①에서 이미 SSOT 병합된 `orderbook-row-h`(30) / `orderbook-row-h-compact`(24)를
> **그대로 재사용**한다 — 호가와 체결이 한 지면에 나란히 놓이므로 행 높이가 일치해야 시각이 정렬된다. 색·라운드·타이포·
> 나머지 spacing 은 전부 기존 토큰이다. `strength-gauge-h` 는 `finsight-redesign` SSOT 병합 대상이며
> (`h-strength-gauge` 유틸로 소비) 파이프라인 병합은 frontend-dev 영역.

### 반응형 (두 뷰포트)

- **모바일 (< `md` 768px)**: 패널 폭 100%(1열). `OrderbookPanel` 과 세로로 쌓인다(호가 → 체결 순 권장). 게이지는
  가로 full, 테이프는 그 아래. compact 10건 × 24px ≈ 240px, full 30건 × 30px ≈ 900px(full 은 종목상세 스크롤 맥락
  이라 허용). 수량은 축약 표기(예: 12,345 → 1.2만)로 폭 절약, 시각은 compact 에서 초 생략.
- **태블릿 (`md` ~ `lg`)**: `/stock` 은 차트/수급과 2열 그리드의 우측 컬럼(약 320~360px)에서 `OrderbookPanel`
  바로 아래(또는 옆)에 배치. 패널 자체 폭은 컨테이너가 결정, 내부 레이아웃 무변경.
- **데스크탑 (≥ `lg` 1024px)**: `/stock` 은 `main-max-w` 컨테이너 우측 사이드 컬럼에서 호가와 스택, `/intraday` 는
  디테일 시트/워크스페이스 우측에 compact 로 배치. 사이드바 정책은 셸(`Sidebar`) 소유 — 패널 무관여.
- **JS 분기는 `useBreakpoint`** (`window.innerWidth` 직접 검사 금지): 수량 축약 임계·시각 초 표기 토글 등.

## Elevation & Depth

- 패널 자체는 **카드 그림자(`shadow.card`)** 한 겹 — `finsight-redesign`/orderbook 카드 관례 그대로. 게이지·테이프는
  정보 밀도가 높아 추가 그림자 없이 플랫. 게이지 세그먼트는 그림자 없는 배경 레이어.
- compact(단타 시트) 안에 들어갈 때는 시트가 이미 elevation 을 가지므로 패널은 그림자 없이 `border-line` 구분선만.
- 호가 패널과 나란히 놓일 때 **두 패널의 elevation·라운드·카드 padding 을 동일**하게 맞춘다(한 지면 시각 정합).

## Shapes

- 패널 컨테이너: `rounded.lg`(13px) — 앱 카드 표준(orderbook 과 동일).
- 게이지 트랙·세그먼트·"추정치" 칩·스켈레톤: `rounded.sm`(8px).
- 원형/full-pill 게이지는 쓰지 않는다 — orderbook 이 "수치 정렬을 해치는 라운드 지양"으로 pill 을 배제했고, 나란히
  놓이는 체결 게이지도 같은 `rounded.sm` 으로 톤을 맞춘다(양 끝만 8px, 내부 세그먼트 경계는 직선).

## Components

- `panel` / `panel-header` / `panel-header-compact`: 컨테이너 + 제목행(종목명·"체결강도", 종목코드 미표시).
- `section-label`: 블록 소제목("체결강도"·"최근 체결"), `primary` label-sm.
- `strength-gauge-track`: 게이지 바탕 트랙(`surface-muted`).
- `strength-gauge-buy` (매수 세그먼트): `signal-up-soft` 배경, 좌측 성장. 텍스트 없음(장식 레이어).
- `strength-gauge-sell` (매도 세그먼트): `signal-down-soft` 배경, 우측 성장. 텍스트 없음.
- `strength-gauge-neutral`: `strength=null`(불명·빈 체결) 중립 트랙.
- `strength-pct-buy` / `strength-pct-sell`: "매수 62%"(`signal-up`) · "매도 38%"(`signal-down`) 좌우 대칭 readout,
  흰 배경 위 원색 mono-numeric(AA).
- `approx-label`: "추정치" 미세 칩(`accent-soft`/`text-muted`) — 정직성 안내(툴팁 트리거).
- `tape-row-up` / `-compact` (상승틱=매수): `signal-up` 가격 텍스트, full/compact 분기.
- `tape-row-down` / `-compact` (하락틱=매도): `signal-down` 가격 텍스트.
- `tape-row-neutral`: seed 불명 첫 체결 가격(`text-muted`).
- `tape-time` / `tape-qty`: 시각·수량 열(`text-muted`, caption).
- `divider`: 게이지 블록과 테이프 경계·헤더 하단 1px(`border-line`).
- `empty-state`: 빈 체결/미지원 안내(`text-muted`).
- `skeleton-row` / `skeleton-gauge`: 로딩 스켈레톤(`surface-muted`) — 게이지 1줄 + 테이프 N줄.

## Do's and Don'ts

- ✅ 체결 패널은 **매수/상승틱 = `{colors.signal-up}`(빨강)·매도/하락틱 = `{colors.signal-down}`(파랑)** 으로
  매핑한다 — orderbook 과 반대이며, 게이지와 테이프가 **한 컴포넌트 안에서 색이 일치**하는 것이 최우선이다(R1).
- ✅ 게이지 세그먼트는 **soft 토큰**(장식 배경), % 숫자는 **원색 + 흰 배경**으로 AA 대비를 지킨다.
- ✅ 게이지는 색 단독이 아니라 **"매수 n% · 매도 m%" 글자를 항상 함께** 노출한다(접근성·색약 대응).
- ✅ 근사(추정) 성격은 **"추정치" 미세 칩 + 툴팁 1개**로만 안내한다 — 큰 경고 배너는 정보를 위축시키므로 지양(q1).
- ✅ 테이프 행 높이·가격 타이포는 **orderbook 토큰(`orderbook-row-h`)을 재사용**해 나란한 두 패널 행을 정렬한다.
- ✅ 상태 3종(로딩·빈 체결·정상)을 항상 분기하고, 데이터가 없어도 레이아웃이 무너지지 않게 한다.
- ✅ 한글 카피는 `lib/copy/stock/trades.ts` 단일 위치, 색·간격은 토큰만(`cn` 헬퍼).
- ❌ 게이지 매수 세그먼트를 파랑으로 두지 않는다 — 테이프의 매수 체결(상승틱)이 이미 빨강이라 자기모순이 된다.
- ❌ soft 색 세그먼트 **위에 원색/텍스트**를 얹지 않는다(대비 저하 — 세그먼트는 장식, %는 흰 배경 위).
- ❌ 강도를 정확한 수급으로 단정하는 카피("매수세 유입 확정" 등)를 쓰지 않는다 — 항상 추정 톤.
- ❌ 종목코드를 헤더에 노출하지 않는다. hex/px 직타 금지.

---

## 유저 시나리오 (태스크 플로우)

### S1. 종목 상세에서 체결 확인 (`/stock/[ticker]`, variant=full)

1. 사용자가 종목 상세 진입 → 차트·수급·호가(`OrderbookPanel`) 인접에 `TradeStrengthPanel variant="full"` 렌더.
2. 진입 직후 **로딩 상태**(게이지 스켈레톤 1줄 + 테이프 스켈레톤 30줄) → 첫 응답 도착 시 정상으로 교체.
3. 상단 게이지에서 "매수 62%(빨강) · 매도 38%(파랑)" 로 순간 수급 우열을 한눈에, 하단 테이프에서 최근 30건 개별 체결
   (시각·가격·수량, 상승틱 빨강/하락틱 파랑)로 근거를 확인. 게이지 옆 "추정치" 칩에 hover/tap → "체결 방향 추정치 ·
   실제 수급과 다를 수 있어요" 툴팁.
4. 느슨한 폴링(상세, ~10s)으로 갱신. 백그라운드 탭 전환 시 폴링 정지.

### S2. 단타워치에서 선택 종목 체결 (`/intraday`, variant=compact)

1. 단타워치에서 종목 선택 → 디테일 시트/워크스페이스에 `TradeStrengthPanel variant="compact"`(호가 옆).
2. 촘촘한 폴링(단타, ~3s)으로 게이지 경계(매수/매도 비중)와 테이프 상단 10건이 빠르게 갱신 — 매수 체결이 몰리는
   순간(게이지 빨강 확장 + 테이프 상단 빨강 연속)을 스캔해 진입/이탈 참고.
3. 밀도 최대(12px 가격, 24px 행, 시각 HH:MM). "추정치" 칩은 유지(과신 차단).

### S3. 장 마감 / 미지원 / 키 없음

1. 장외 시간 또는 빈 체결 응답 → **빈 체결 상태**("체결 내역이 없어요" + 장마감 보조) 카드. 게이지는 중립 트랙, 테이프
   자리는 empty-state.
2. 미지원/미존재 종목(404·fail-soft) → 동일 empty-state(미지원 보조 카피).
3. 토스 키 없는 로컬(`X-Data-Source: none`) → 패널 **미표시**, 폴링 0콜(AC-1). 화면 무회귀.

---

## 핸드오프 명세 (화면별 상태)

frontend-dev 가 바로 구현 가능한 상태 매트릭스. 카피는 `lib/copy/stock/trades.ts` 신규 단일 위치.

### 상태 매트릭스

| 상태 | 트리거 | 렌더 | 카피(한글) |
|---|---|---|---|
| **로딩** | 첫 fetch pending | `skeleton-gauge` 1줄 + `skeleton-row` × N(compact 10·full 30). 헤더·소제목 즉시 표시. | — (스켈레톤) |
| **정상** | `isEmpty === false` && `strength.strength !== null` | 게이지(매수/매도 세그먼트 + % readout + 추정치 칩) + divider + 테이프 N행. | 소제목 "체결강도" / "최근 체결" |
| **강도 불명(정상 테이프)** | `strength === null` (분모 0·전부 동일가) but 테이프 有 | 게이지 = `strength-gauge-neutral` + readout "—", 테이프는 정상 렌더. | 게이지 "체결 방향을 추정할 수 없어요"(추정치 칩 유지) |
| **빈 체결(장마감)** | `isEmpty === true`, 키 있음 | 게이지 자리 = 중립 트랙 placeholder, 테이프 자리 = `empty-state` 1블록. 헤더 유지. | 제목 "체결 내역이 없어요" · 보조 "장이 열리면 실시간 체결을 볼 수 있어요." |
| **미지원/미존재** | 404·빈 응답 fail-soft | `empty-state`(동일 슬롯) | 제목 "체결 내역이 없어요" · 보조 "이 종목은 체결 정보를 제공하지 않아요." |
| **키 없음(로컬)** | `X-Data-Source: none` | 패널 **미표시**(지면 조건부 렌더 안 함). 폴링 0콜. | — (미표시) |
| **에러(네트워크)** | fail-soft 로 빈 체결 수렴 | 빈 체결 상태와 동일(별도 에러 UI 없음 — never-throw 관례) | 빈 체결 카피 재사용 |

### 게이지 구현 스펙

- **트랙**: `strength-gauge-track`(surface-muted), 가로 100%, height `strength-gauge-h`(10px), radius `rounded.sm`.
- **세그먼트**: 트랙 위 좌측 `strength-gauge-buy`(signal-up-soft, 폭 = `buyRatio×100%`) + 우측
  `strength-gauge-sell`(signal-down-soft, 나머지). `buyRatio = strength`(0~1). 텍스트 없음(장식 레이어).
- **readout**: 게이지 아래 `[strength-pct-buy "매수 {round(strength×100)}%"] · [strength-pct-sell "매도 {round((1-strength)×100)}%"]`.
  두 값 동일 크기(mono-numeric), 색 코드로만 구분. `strength=null` → readout "—" + `strength-gauge-neutral`.
- **추정치**: 소제목 옆 `approx-label` 칩("추정치") — hover/tap 툴팁 노출. NaN/음수/합계 0 방어(`strength=null` 경로).

### 테이프(row) 구현 스펙

- **레이아웃**: `grid` 3열 `[시각(고정폭 좌, tape-time)] [가격(flex, 우정렬, tnum)] [수량(고정폭 우, tape-qty)]`.
  가격 정렬 x 축은 orderbook 가격열과 동일 정렬 관례.
- **가격 색**: `side` 파생 분류를 그대로 색으로 — `buy/상승틱 → tape-row-up`(signal-up), `sell/하락틱 → tape-row-down`(signal-down),
  seed 불명 첫 행 → `tape-row-neutral`(text-muted). 동일가(zero-tick)는 상속된 side 색을 따른다(별도 색 없음).
- **행 높이·타이포**: full = `orderbook-row-h`(30px)·`table-cell-numeric`, compact = `orderbook-row-h-compact`(24px)·`caption`.
- **건수·정렬**: full 30건·compact 10건. 응답 최신순 가정 + `timestamp` 방어정렬(주말 스냅샷 동일 timestamp 다수 대비
  stable sort) 후 상위 N slice. **최신 체결이 맨 위**.
- **수량·시각**: `text-muted` caption. 수량 모바일 축약(만/억, `useBreakpoint`), 시각 compact 는 초 생략.

### 배선 규칙

- 두 지면 모두 **동일 `TradeStrengthPanel`** import(AC-9). 차이는 `variant` prop + 폴링 주기 주입뿐.
- 패널은 자족(내부에서 `useQueryStockTrades` 호출) — 지면은 배치·variant·enabled 만 결정.
- 폴링 주기는 지면이 `refetchInterval` 로 주입(단타 촘촘·상세 느슨). 백그라운드 탭 정지(기본값).
- `OrderbookPanel` 과 **동일 컨테이너 스타일**(카드 padding·라운드·shadow·행 높이)로 나란히 배치해 시각 정합.

---

## OPEN QUESTION 결정 (디자이너 영역)

PRD §9 중 디자이너 결정 영역 + 시각 설계에서 파생된 결정. (q3 폴링 게이팅·q4 LLM 주입은 엔지니어링/후속 영역이라 제외.)

| # | 항목 | 결정 |
|---|---|---|
| R1 | **체결 색 매핑 (핵심 · orderbook 충돌)** | **매수/상승틱 = `signal-up`(빨강)·매도/하락틱 = `signal-down`(파랑)** — `OrderbookPanel`(매도=빨강)과 **의도적으로 반대**. 근거: (1) 테이프는 상승틱=빨강(캔들 관례)으로 고정 → 상승틱=매수라 매수는 이미 빨강 → 게이지만 파랑이면 한 컴포넌트 내 자기모순. (2) 호가=price-level 축, 체결=momentum/등락 축 → 각 도메인 관례가 옳음. (3) 매수 우위=상승 압력(bullish)=빨강이 등락 멘탈모델과 정합. 혼동은 텍스트 라벨("호가"/"체결강도")+% 글자 병기로 완충. |
| R2 | 게이지 형태 (PRD §3-6a) | **하나의 가로 누적 바** — 좌측 매수(`signal-up-soft`)·우측 매도(`signal-down-soft`), 경계=강도. 세그먼트는 orderbook 바와 동일 soft 톤, 강조는 아래 % 숫자(원색 mono-numeric). full-pill 아님(`rounded.sm`). |
| R3 | 근사 정직성 (q1) | 게이지 옆 **"추정치" 미세 칩 1개 + 툴팁**("체결 방향 추정치 · 실제 수급과 다를 수 있어요"). 큰 경고 배너 지양. 코드 레벨은 `TradeStrength.isApproximation`·`method:"tick-rule"` 이 오용 잠금. |
| R4 | 테이프 건수·정렬 (q2) | **compact 10건·full 30건**, 최신순(응답 최신순 가정 + `timestamp` stable 방어정렬 후 slice). 최신 체결 맨 위. |
| R5 | variant 밀도 | compact = label-sm 제목·24px 테이프 행·caption 가격·HH:MM / full = h2 제목·30px 행·table-cell-numeric·HH:MM:SS. 게이지 높이·% 는 공용. 구조 동일, 밀도만. |
| R6 | 테이프 행 색·동일가 | 상승틱 = `signal-up`·하락틱 = `signal-down`·동일가(zero-tick) = **상속된 분류 색**·seed 불명 첫 행 = `tape-row-neutral`(text-muted). 색은 `side` 파생 그대로. |
| R7 | 상태 3종 + 불명 + 키없음 | 로딩(스켈레톤)·정상·빈 체결(장마감)·강도 불명(중립 게이지+정상 테이프)·미지원 분기. 키 없음 = 패널 **미표시**(안내 카드 없음). 에러 UI 없음(never-throw fail-soft → 빈 체결 카피 흡수). |
| R8 | 신규 토큰 | **색 신규 0**(등락 토큰 재매핑). spacing 신규 **1개**(`strength-gauge-h` 10px, `finsight-redesign` SSOT 병합 대상). 테이프 행 높이는 orderbook `orderbook-row-h`/`-compact` 재사용. |
| R9 | 종목코드 노출 | 헤더에 종목명만, 코드 미표시(앱 전역 관례 유지). |
