---
version: alpha
name: toss-orderbook
description: >-
  토스 호가창 공용 컴포넌트 `OrderbookPanel` 디자인 가이드. 매도(asks) 10단계 위 · 매수(bids) 10단계 아래 ·
  중앙 현재가/스프레드 요약의 전형적 호가창 레이아웃. 색은 신규 토큰 없이 `finsight-redesign` 의 등락 의미 토큰을
  그대로 재매핑 — **매도(asks) = `signal-up`(빨강 계열)**, **매수(bids) = `signal-down`(파랑 계열)** — 로
  PRD `toss-orderbook` §3-5 · AC-2/AC-3 을 충족한다. 잔량 비례 배경 바는 매수·매도 통합 max 정규화(PRD q5).
  두 variant(compact = `/intraday` 단타 · full = `/stock` 종목상세)를 같은 컴포넌트 prop 으로 분기하고,
  로딩(스켈레톤) · 빈 호가(장마감/미지원) · 정상 3상태를 정의한다. 신규 토큰은 행 높이 2개(`orderbook-row-h`,
  `orderbook-row-h-compact`)로 한정하며 도입 근거를 Layout 절에 명시한다. WCAG AA 4.5:1 무회귀.
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
  ask-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-up}"
    typography: "{typography.table-cell-numeric}"
    height: "{spacing.orderbook-row-h}"
    padding: "{spacing.xs}"
  ask-row-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-up}"
    typography: "{typography.caption}"
    height: "{spacing.orderbook-row-h-compact}"
    padding: "{spacing.xs}"
  ask-bar:
    backgroundColor: "{colors.signal-up-soft}"
    rounded: "{rounded.sm}"
  bid-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-down}"
    typography: "{typography.table-cell-numeric}"
    height: "{spacing.orderbook-row-h}"
    padding: "{spacing.xs}"
  bid-row-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-down}"
    typography: "{typography.caption}"
    height: "{spacing.orderbook-row-h-compact}"
    padding: "{spacing.xs}"
  bid-bar:
    backgroundColor: "{colors.signal-down-soft}"
    rounded: "{rounded.sm}"
  qty-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  center-band:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    typography: "{typography.mono-numeric}"
    padding: "{spacing.sm}"
  spread-label:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  total-qty:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
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
---

# toss-orderbook 디자인 가이드

## Overview

한국 개인 투자자에게 가장 익숙한 화면 중 하나가 **호가창**이다. 이 가이드는 토스 `GET /api/v1/orderbook`
응답(매도 10단계 + 매수 10단계)을 토스톤(밝고 간결·정보밀도 높음)으로 렌더하는 공용 `OrderbookPanel` 을 정의한다.

핵심 방향:

- **전형적 호가창 골격 유지**: 위에서부터 매도(asks) 10줄 → 중앙 현재가/스프레드 → 매수(bids) 10줄. 각 줄은
  `가격 · 잔량 · 잔량 비례 가로 바` 3요소. 사용자가 별도 학습 없이 매도벽/매수벽을 한눈에 읽는다.
- **판단 도구로서의 호가**: 우리 제품은 조회·분석 전용(주문 미구현)이라 호가는 체결 UI 가 아니라 **순간 수급 압력**을
  보여주는 정보다. 그래서 잔량 바의 시각 대비(매도벽 vs 매수벽)를 최우선 가치로 둔다.
- **한 컴포넌트 두 밀도**: `/intraday`(단타)는 빠른 스캔이 목적이라 compact(정보밀도 최대), `/stock`(종목상세)은
  차트·수급과 함께 읽는 참고 정보라 full(약간의 여백). 레이아웃 구조는 동일하고 typography/행 높이만 분기한다.
- **신규 색 토큰 0개**: 등락 색 관례(`finsight-redesign` 의 `signal-up` 빨강 / `signal-down` 파랑)를 그대로
  매도/매수에 재매핑한다. 종목코드 미표시 관례 유지(헤더는 종목명만).

## Colors

색은 **신규 토큰을 만들지 않고** `finsight-redesign` 의 라이브 토큰을 그대로 참조한다(`design:sync` SSOT 는
`finsight-redesign.md` 하나이므로, frontend-dev 는 이미 존재하는 `bg-signal-up-soft` · `text-signal-down`
같은 유틸을 그대로 호출하면 된다 — 이 문서의 front matter 는 lint 참조 해소용 동일값 재선언이다).

- **매도(asks) = `signal-up`(#c81e1e, 빨강) / `signal-up-soft`(#fee2e2)**: 가격 텍스트는 `signal-up`,
  잔량 비례 바 배경은 `signal-up-soft`. PRD §3-5 "매도 호가(위, 빨강 계열)" 를 등락 상승 색에 직결해
  신규 토큰 없이 충족한다. (등락 색 관례 = 상승 빨강 / 하락 파랑을 그대로 재사용.)
- **매수(bids) = `signal-down`(#1d4ed8, 파랑) / `signal-down-soft`(#dbeafe)**: 가격 텍스트는 `signal-down`,
  바 배경은 `signal-down-soft`. PRD §3-5 "매수 호가(아래, 파랑 계열)".
- **가격 텍스트는 항상 `surface`(흰색) 위**에 놓아 대비를 확보한다. `signal-up`/`signal-down` 원색은 이미
  `finsight-redesign` 에서 흰 배경 AA(4.5:1) 검증된 값이다. **soft 색은 바(배경 장식) 전용** — 그 위에 원색
  텍스트를 얹지 않는다(대비 저하 회피). 즉 잔량 바는 행 텍스트 뒤 레이어이고, 텍스트는 흰 배경 기준으로 읽힌다.
- **중앙 밴드/총잔량 요약 = `accent-soft`(#eaf0f6) · `surface-muted`(#f6f8fa)**: 중립 회청 배경으로 매도/매수
  두 색 블록을 시각적으로 분리한다. 현재가는 `primary`(#1f3b4d) 로 강조.
- **구분선 = `border-line`(#eceff3)**: 매도/매수 존 경계, 헤더 하단.

## Typography

- **가격(full) = `table-cell-numeric`(14px/700, tnum)**: 숫자 폭 고정(tnum)으로 10단계 가격이 소수점·자릿수
  기준 정렬된다. 강조도가 필요한 호가 가격에 700.
- **가격(compact) = `caption`(12px)**: 단타는 밀도 우선 — 12px 로 10단계를 세로 스크롤 없이 담는다.
- **현재가(중앙 밴드) = `mono-numeric`(15px/700, tnum)**: 패널에서 가장 강조되는 단일 숫자.
- **잔량 = `caption`(12px, `text-muted`)**: 가격보다 한 단 낮춘 위계. 부차 정보.
- **패널 제목 = `h2`(full) / `label-sm`(compact)**: full 은 카드 제목, compact 은 시트/워크스페이스 소제목 톤.
- **스프레드·라벨 = `caption`**: "스프레드", "총매수", "총매도" 등 라벨은 최소 위계.

## Layout

### 공통 골격 (전형적 호가창)

세로 스택 1열: `[헤더] → [매도 존 10줄] → [중앙 밴드: 현재가·스프레드] → [매수 존 10줄] → [푸터: 총잔량 요약]`.

각 행의 내부는 2열 그리드다.

- **좌열 = 잔량 + 잔량 비례 바**, **우열 = 가격.** — 이는 국내 HTS 관례(가격이 중앙/우측, 잔량 바가 바깥쪽)를
  따른 것으로, 매도 바는 **우측 정렬**(중앙 가격 쪽으로 자라남)·매수 바는 **좌측 정렬**로 두어 매도벽/매수벽이
  중앙을 향해 마주 보게 한다. (PRD 문구 "매도 우측정렬·매수 좌측정렬" 을 바 성장 방향으로 해석.)
- **잔량 바 정규화**: 매수·매도를 **통합한 max 잔량** 을 100% 로 잡는다(PRD q5 권고). 매도벽이 매수벽보다 두꺼우면
  매도 바가 더 길게 보이는 것이 목적 — 각 존을 독립 정규화하면 이 대비가 사라진다. 잔량 0 단계는 바 없음(가격만).
- 바 폭 = `(단계 잔량 / 통합 max) × 100%`. 최소 가시 폭 하한은 두지 않는다(0 은 0).

### 밀도 variant

| 구분 | compact (`/intraday` 단타) | full (`/stock` 종목상세) |
|---|---|---|
| 행 높이 | `spacing.orderbook-row-h-compact`(24px) | `spacing.orderbook-row-h`(30px) |
| 가격 typography | `caption`(12px) | `table-cell-numeric`(14px) |
| 패널 제목 | `label-sm` | `h2` |
| 존 간 여백 | `spacing.xs`(4px) | `spacing.sm`(6px) |
| 총잔량 푸터 | 1줄 축약(총매수·총매도만) | 총매수·총매도·비율 바 |

> **신규 토큰 근거**: 호가 10+10 단계를 모바일 1뷰포트에 세로 스크롤 없이 담으려면 행 높이가 기존 `table-row-h`(42px)
> 보다 촘촘해야 한다(42px × 20행 = 840px, 모바일 초과). 그래서 `orderbook-row-h`(30px) · `orderbook-row-h-compact`
> (24px) 두 키만 신규 도입한다. `finsight-redesign` SSOT 에 이 두 spacing 키를 병합하면 `h-orderbook-row` 유틸로
> 소비된다(파이프라인 병합은 frontend-dev 영역). 그 외 색·라운드·타이포는 전부 기존 토큰 재사용이다.

### 반응형 (두 뷰포트)

- **모바일 (< `md` 768px)**: 패널 폭 100%(1열). 각 행은 `flex`, 가격 우측 고정폭·잔량 바 좌측 flex-1. 10+10 단계 =
  compact 24px×20 ≈ 480px, full 30px×20 ≈ 600px — 둘 다 헤더/푸터 포함 세로 스크롤 없이 한 화면에 담긴다
  (**AC-10: 모바일 10단계 전부 노스크롤**). 잔량 수치는 축약 표기(예: 12,345 → 1.2만)로 폭 절약.
- **태블릿 (`md` ~ `lg`)**: `/stock` 은 차트/수급과 2열 그리드에서 우측 컬럼(약 320~360px)에 배치. 패널 자체 폭은
  컨테이너가 결정, 내부 레이아웃 무변경.
- **데스크탑 (≥ `lg` 1024px)**: `/stock` 상세는 `main-max-w`(1152px) 컨테이너 안에서 우측 사이드 컬럼(고정폭)에,
  `/intraday` 는 디테일 시트/워크스페이스 우측에 배치. 사이드바 정책은 셸(`Sidebar`) 소유 — 패널은 관여하지 않음.
- **JS 분기가 필요하면 `useBreakpoint`** (`window.innerWidth` 직접 검사 금지). 잔량 축약 표기 임계 등.

## Elevation & Depth

- 패널 자체는 **카드 그림자(`shadow.card`)** 한 겹 — `finsight-redesign` 카드 관례 그대로. 호가 표는 정보 밀도가
  높아 추가 그림자를 얹지 않는다(플랫). 잔량 바는 그림자 없는 **배경 레이어**(z-index 상 텍스트 아래).
- compact(단타 시트) 안에 들어갈 때는 이미 시트가 elevation 을 가지므로 패널은 그림자 없이 `border-line` 구분선만.

## Shapes

- 패널 컨테이너: `rounded.lg`(13px) — 앱 카드 표준.
- 잔량 바·총잔량 칩·스켈레톤: `rounded.sm`(8px).
- 중앙 밴드: `rounded.sm`.
- 원형/pill 은 호가창에 쓰지 않는다(수치 정렬을 해치는 라운드 지양).

## Components

- `panel` / `panel-header` / `panel-header-compact`: 컨테이너 + 제목행(종목명·"호가", 종목코드 미표시).
- `ask-row` / `ask-row-compact` (매도): `signal-up` 텍스트, full/compact 행 높이·타이포 분기.
- `ask-bar` (매도 잔량 바): `signal-up-soft` 배경, 우측 정렬 성장. 텍스트 없음(장식 레이어).
- `bid-row` / `bid-row-compact` (매수): `signal-down` 텍스트.
- `bid-bar` (매수 잔량 바): `signal-down-soft` 배경, 좌측 정렬 성장.
- `qty-text`: 잔량 수치(`text-muted`, caption).
- `center-band`: 현재가(`mono-numeric`, `primary`) — 매도/매수 존 사이 구분 밴드.
- `spread-label`: 스프레드 라벨(호가·%), caption.
- `total-qty`: 푸터 총매수/총매도 잔량 칩(`surface-muted`).
- `divider`: 존 경계·헤더 하단 1px 선(`border-line`).
- `empty-state`: 빈 호가/미지원 안내(`text-muted`).
- `skeleton-row`: 로딩 스켈레톤(`surface-muted`, 20줄 반복).

## Do's and Don'ts

- ✅ 매도 = `{colors.signal-up}` 계열, 매수 = `{colors.signal-down}` 계열로 **등락 색 관례 그대로 재매핑**한다.
- ✅ 잔량 바 배경은 반드시 **soft 토큰**, 가격 텍스트는 **원색 + 흰 배경** 조합으로 AA 대비를 지킨다.
- ✅ 잔량 바는 **매수·매도 통합 max** 로 정규화한다(매도벽 vs 매수벽 대비가 목적).
- ✅ 상태 3종(로딩·빈 호가·정상)을 항상 분기하고, 데이터가 없어도 레이아웃이 무너지지 않게 한다.
- ✅ 한글 카피는 `lib/copy/stock/orderbook.ts` 단일 위치, 색·간격은 토큰만(`cn` 헬퍼).
- ❌ soft 색 배경 **위에 원색 텍스트**를 얹지 않는다(대비 저하 — 바는 장식, 텍스트는 흰 배경 기준).
- ❌ 매도/매수 존을 **각각 독립 정규화**하지 않는다(벽 대비 소실).
- ❌ 종목코드를 헤더에 노출하지 않는다(관례 유지). hex/px 직타 금지.
- ❌ 모바일에서 10단계에 세로 스크롤을 두지 않는다(행 높이 토큰으로 1뷰포트 수렴).

---

## 유저 시나리오 (태스크 플로우)

### S1. 종목 상세에서 호가 확인 (`/stock/[ticker]`, variant=full)

1. 사용자가 종목 상세 진입 → 차트·수급 인접에 `OrderbookPanel variant="full"` 렌더.
2. 진입 직후 **로딩 상태**(스켈레톤 20줄) → 첫 응답 도착 시 정상 표로 교체.
3. 매도 10 + 매수 10 단계, 각 가격·잔량·잔량 비례 바. 중앙에 현재가/스프레드, 푸터에 총매수/총매도 잔량.
4. 느슨한 폴링(상세, PRD q3 권고 ~10s)으로 갱신. 백그라운드 탭 전환 시 폴링 정지.

### S2. 단타워치에서 선택 종목 호가 (`/intraday`, variant=compact)

1. 단타워치에서 종목 선택 → 디테일 시트/워크스페이스에 `OrderbookPanel variant="compact"`.
2. 촘촘한 폴링(단타, ~3s)으로 매수벽/매도벽 변화를 빠르게 스캔. 밀도 최대(12px 행).
3. 스프레드가 좁고 매수벽이 두꺼워지는 순간을 시각(바 길이)으로 포착 — 진입/이탈 참고.

### S3. 장 마감 / 미지원 / 키 없음

1. 장외 시간 또는 미지원 종목 → 빈 호가 응답 → **빈 호가 상태**("호가 정보가 없어요") 카드.
2. 토스 키 없는 로컬 → 패널 미표시 또는 "미지원" 안내, 폴링 0콜(AC-1). 화면 무회귀.

---

## 핸드오프 명세 (화면별 상태)

frontend-dev 가 바로 구현 가능한 상태 매트릭스. 카피는 `lib/copy/stock/orderbook.ts` 신규 단일 위치.

### 상태 매트릭스

| 상태 | 트리거 | 렌더 | 카피(한글) |
|---|---|---|---|
| **로딩** | 첫 fetch pending | `skeleton-row` × 20(매도 10·매수 10) + 중앙 밴드 자리 placeholder. 헤더는 즉시 표시. | — (스켈레톤) |
| **정상** | `orderbook.isEmpty === false` | 매도 10 + 중앙 + 매수 10 + 총잔량 푸터. 각 행 가격·잔량·바. | 헤더 "호가" |
| **빈 호가(장마감)** | `isEmpty === true`, 키 있음 | `empty-state` 1블록(아이콘 옵션 + 문구). 헤더 유지, 표 자리 대체. | 제목 "호가 정보가 없어요" · 보조 "장이 열리면 매수·매도 잔량을 볼 수 있어요." |
| **미지원/미존재** | 404·빈 응답 fail-soft | `empty-state`(동일 슬롯) | 제목 "호가 정보가 없어요" · 보조 "이 종목은 호가를 제공하지 않아요." |
| **키 없음(로컬)** | `X-Data-Source: none` | 패널 **미표시**(지면에서 조건부 렌더 안 함). 폴백 안내 불필요. | — (미표시) |
| **에러(네트워크)** | fail-soft 로 빈 호가 수렴 | 빈 호가 상태와 동일(별도 에러 UI 없음 — never-throw 관례) | 빈 호가 카피 재사용 |

### 행(row) 구현 스펙

- **레이아웃**: `flex items-center`. 매도행 = `[잔량+바(우측정렬, flex-1)] [가격(고정폭)]`, 매수행 = `[잔량+바(좌측정렬, flex-1)] [가격]`. (중앙 가격열 정렬은 두 존 동일 x 축.)
- **바**: `absolute`/배경 레이어. 폭 = `min(100, qty/unifiedMax*100)%`. 매도 `right-0` 기준, 매수 `left-0` 기준. 배경 `ask-bar`/`bid-bar`(soft), radius `rounded.sm`.
- **잔량 0 단계**: 바 미렌더, 가격만. NaN/null 방어(`isEmpty` 이전에 단계별 가드).
- **가격**: `signal-up`(매도)/`signal-down`(매수) 텍스트, `tnum` 정렬. compact=caption, full=table-cell-numeric.
- **잔량 수치**: caption `text-muted`, 모바일 축약(만/억) — `useBreakpoint` 로 임계 판단.

### 중앙 밴드 / 푸터

- **중앙 밴드**(`center-band`): 현재가(`mono-numeric` `primary`) + 스프레드. 스프레드 = `asks[0].price − bids[0].price`,
  양쪽 존재 시만 표기(아니면 "—"). 표기 예: "스프레드 50원 (0.12%)".
- **푸터**(`total-qty` × 2): "총매도 {합}" / "총매수 {합}". 총잔량 = 각 존 잔량 합(응답 총잔량 필드 있으면 우선).
  full 은 매수:매도 비율 미니바 1줄 추가(통합 정규화와 동일 색), compact 은 숫자만.

### 배선 규칙

- 두 지면 모두 **동일 `OrderbookPanel`** import(AC-7). 차이는 `variant` prop + 폴링 주기 주입뿐.
- 패널은 자족(내부에서 `useQueryStockOrderbook` 호출) — 지면은 배치·variant·enabled 만 결정.
- 폴링 주기는 지면이 `refetchInterval` 로 주입(단타 촘촘·상세 느슨, PRD q3). 백그라운드 탭 정지(기본값).

---

## OPEN QUESTION 결정 (디자이너 영역)

PRD §9 중 디자이너 결정 영역 + 시각 설계에서 파생된 결정.

| # | 항목 | 결정 |
|---|---|---|
| R1 | 매도/매수 색 매핑 (PRD §3-5) | 신규 토큰 없이 **매도 = `signal-up`(빨강)·매수 = `signal-down`(파랑)** 재매핑. 등락 색 관례 그대로. soft 는 바 전용, 원색은 흰 배경 위 텍스트로만. |
| R2 | 잔량 바 정규화 (PRD q5) | **매수·매도 통합 max** 정규화 채택 — 매도벽 vs 매수벽 시각 대비가 목적. 존 독립 정규화 금지. |
| R3 | 바 성장 방향 (PRD "매도 우측·매수 좌측") | 매도 바 **우측 정렬**(중앙 가격 쪽으로)·매수 바 **좌측 정렬**. 두 벽이 중앙을 향해 마주 봄. |
| R4 | variant 밀도 차이 | compact = 24px 행·caption·label-sm 제목 / full = 30px 행·table-cell-numeric·h2 제목. 구조 동일, 밀도만. |
| R5 | 모바일 노스크롤 (AC-10) | 행 높이 신규 토큰(`orderbook-row-h` 30 / `-compact` 24)으로 10+10 단계를 1뷰포트에 수렴. 잔량 축약 표기 병행. |
| R6 | 빈 호가 카피 | 제목 "호가 정보가 없어요", 장마감 보조 "장이 열리면 매수·매도 잔량을 볼 수 있어요.", 미지원 보조 "이 종목은 호가를 제공하지 않아요." (`lib/copy/stock/orderbook.ts`) |
| R7 | 키 없음 처리 | 패널 **미표시**(안내 카드도 없음). 에러 UI 없음 — never-throw fail-soft 는 빈 호가 카피로 흡수. |
| R8 | 종목코드 노출 | 헤더에 종목명만, 코드 미표시(앱 전역 관례 유지). |
