---
version: alpha
name: workbench-analyze
description: Trading Signal Frontend — 워크벤치 분석 화면 (티커 검색 → 자본·목표 입력 → BE 6블록 응답 표시)
colors:
  primary: "#17202a"
  secondary: "#657385"
  tertiary: "#0f766e"
  tertiary-soft: "#e5f4f1"
  neutral: "#f5f7fa"
  panel: "#ffffff"
  line: "#dbe2ea"
  field-bg: "#f8fafc"
  warn: "#b45309"
  warn-soft: "#fff4df"
  info: "#2563eb"
  info-soft: "#eaf1ff"
  critical: "#991b1b"
  critical-soft: "#fee2e2"
  body-strong: "#344253"
  white: "#ffffff"
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
spacing:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 18px
  2xl: 24px
rounded:
  sm: 8px
  pill: 999px
components:
  shell:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    padding: 18px
  caption:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.secondary}"
    typography: "{typography.caption}"
    padding: 0px
  body-strong:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.body-strong}"
    typography: "{typography.body-strong}"
    padding: 0px
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 16px
  card-elevated:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.primary}"
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
    backgroundColor: "{colors.field-bg}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 11px
    height: 42px
  input-error:
    backgroundColor: "{colors.critical-soft}"
    textColor: "{colors.critical}"
    rounded: "{rounded.sm}"
    padding: 11px
    height: 42px
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    padding: 12px
    typography: "{typography.button}"
    height: 44px
  button-primary-disabled:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    padding: 12px
    typography: "{typography.button}"
    height: 44px
  search-result-item:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 12px
  search-result-item-focus:
    backgroundColor: "{colors.tertiary-soft}"
    textColor: "{colors.tertiary}"
    rounded: "{rounded.sm}"
    padding: 12px
  badge-accent:
    backgroundColor: "{colors.tertiary-soft}"
    textColor: "{colors.tertiary}"
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
    backgroundColor: "{colors.line}"
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
    backgroundColor: "{colors.tertiary}"
    rounded: "{rounded.pill}"
    height: 12px
    width: 4px
---

# workbench-analyze 디자인 가이드

## Overview

Trading Signal Frontend 의 워크벤치 분석 화면은 사용자가 화이트리스트(현재 `AAPL`, `BTC-USD`)에서 종목을 고르고 **자기 자본 · 목표 수익률 · 목표 기간 · 거래당 최대 손실률**을 입력하면, BE 가 응답 6블록(`action`, `feasibility`, `brief`, `risk_plan`, `horizons`, `warnings`)으로 "그 목표가 현실적인가 + 지금 어떻게 움직일 것인가"를 묶어 돌려주는 모델이다.

브랜드 톤은 **토스 서비스풍** — 밝은 배경, 단단한 카드, 정보 밀도는 높지만 상태·강조는 한 화면에 하나씩만 짙게 찍는다. 첫 인상 한 줄(=최종 권고 `action`)이 시선을 가장 먼저 받고, 그 아래로 보조 정보가 단계적으로 내려온다.

모바일을 1차 캔버스로 잡는다 (`shell` 최대 480px). 720px 이상에서는 동일 카드 그대로 가운데 정렬을 유지하며, 차트·테이블 라이브러리는 도입하지 않는다 (PRD §4 비범위). 모든 시각화는 CSS 만으로 표현한다.

## Colors

- **Primary (`#17202a`)** — 본문 텍스트·헤드라인의 기본 색. 거의 검정에 가깝지만 푸른 기를 살짝 줘서 패널의 백색과 어우러진다.
- **Secondary (`#657385`)** — 라벨·캡션·보조 정보 텍스트. WCAG AA 4.5:1 기준 `{colors.panel}` 위에서 통과.
- **Tertiary (`#0f766e`, teal)** — 액션·확정·매수 권고에 한정해서 쓴다. 한 화면에 두 곳 이상 등장하지 않는 원칙.
- **Tertiary-soft (`#e5f4f1`)** — 활성 상태(badge, toggle pressed) 배경. 흰 배경과 자연스럽게 이어지는 옅은 teal.
- **Neutral (`#f5f7fa`)** — 페이지 배경. 패널과의 미세한 대비로 카드 윤곽을 살린다.
- **Panel (`#ffffff`)** — 카드·입력 영역의 표면.
- **Line (`#dbe2ea`)** — 카드 테두리, 구분선.
- **Field-bg (`#f8fafc`)** — 입력 칸 내부 배경. 패널보다 살짝 내려앉아 있어 "여기는 입력하는 자리" 라는 신호.
- **Warn (`#b45309`)** + **Warn-soft (`#fff4df`)** — feasibility 비현실 판정, warnings 블록, 리스크 강조에 쓴다. 빨강이 아니라 따뜻한 주황 — 사용자에게 차단 신호가 아니라 "한 번 다시 보세요" 신호.
- **Info (`#2563eb`)** + **Info-soft (`#eaf1ff`)** — risk_plan 의 진입가 강조. 매수/매도 색과 섞이지 않게 푸른 계열로 분리.
- **Critical (`#991b1b`)** + **Critical-soft (`#fee2e2`)** — 폼 사전 차단 메시지·BE 5xx 폴백·SELL/AVOID 권고. warn 보다 한 단계 더 강한 신호 (사용자가 그대로 두면 손해).
- **Body-strong (`#344253`)** — `body-md` 보다 한 톤 진한 본문 보조 텍스트. 결과 블록 내부 설명 문장.

대비비 검증(주요 쌍):
- `{colors.primary}` × `{colors.panel}` ≈ 15:1 — AA ✅
- `{colors.secondary}` × `{colors.panel}` ≈ 4.7:1 — AA ✅
- `{colors.tertiary}` × `{colors.tertiary-soft}` ≈ 5.5:1 — AA ✅
- `{colors.warn}` × `{colors.warn-soft}` ≈ 5.0:1 — AA ✅
- `{colors.critical}` × `{colors.critical-soft}` ≈ 6.1:1 — AA ✅
- `{colors.info}` × `{colors.info-soft}` ≈ 5.6:1 — AA ✅

## Typography

폰트 패밀리는 시스템 폰트(`Arial, Helvetica, sans-serif`) 그대로. 별도 웹폰트 로딩 없이 첫 화면이 즉시 떠야 한다는 토스 톤 원칙에 맞춘다.

- **display (30px / 700)** — `action` 의 한글 라벨(예: "지금 매수"). 화면당 1회.
- **h1 (22px / 700)** — 상단 헤더 "분석 결과" 또는 "워크벤치".
- **h2 (17px / 700)** — 결과 블록 제목(`feasibility`, `risk_plan` 등).
- **body-md (16px / 400)** — 카드 본문, 입력 라벨 우측 보조.
- **body-strong (16px / 700)** — 핵심 수치(목표 수익률, 진입가) 등 본문 중 강조.
- **body-sm (14px / 400)** — 결과 카드의 설명 문장, `body-strong` 텍스트(`#344253`) 와 결합 가능.
- **caption (12px / 400)** — 필드 라벨, 보조 안내, 타임스탬프.
- **button (15px / 700)** — 제출 버튼·검색 결과 클릭 영역.
- **badge (13px / 700)** — 상태·권고 라벨.
- **mono-numeric (15px / 700, `tnum`)** — 가격·수량·퍼센트 수치. `tnum` 으로 자릿수 정렬.

## Layout

`shell` 은 모바일 480px 기준 좌우 14px 패딩. 720px 이상은 동일 카드 폭을 유지하고 좌우 여백만 자연스럽게 늘린다.

화면 세로 구조 (위→아래):
1. **topBar** — 좌측 "분석" 라벨 + 우측 ticker 선택 상태(미선택 시 "종목 선택 필요").
2. **searchPanel** — ticker 입력 칸 + 자동완성 드롭다운(상태별 결과 카드).
3. **inputPanel** — `capital_amount`, `target_return_pct`, `target_period_days`, `max_loss_pct` 입력 + 제출 버튼.
4. **resultGroup** — BE 응답 6블록을 아래 순서로:
   1. `action` (display + 보조 본문) — 결과의 첫 인상.
   2. `feasibility` — 비현실 판정 시 `badge-warn` 으로 첫 인상에서 인지.
   3. `warnings` — `action` 바로 다음에 노출(PM 권고 수용). `warnings` 가 빈 배열이면 섹션 자체 숨김.
   4. `brief` — 기술 신호. `action` 과 다를 수 있음을 강조 카드 분리로 표현.
   5. `risk_plan` — 진입/손절/익절 표 + CSS 가격 막대.
   6. `horizons` — 단/중/장기 텍스트 요약.

세로 간격: 카드 사이 `{spacing.md}`(10px), 결과 그룹 시작 전 `{spacing.lg}`(14px). 카드 내부 패딩은 `card`(16px) 또는 `card-elevated`(20px, `action` 카드만).

가로 그리드:
- `inputPanel` 은 2칼럼(`1fr 92px`) 기본. 통화 보조 라벨이 두 번째 칼럼에 들어가며 `capital_amount` 행은 두 칼럼 모두 사용, `target_period_days` 와 `max_loss_pct` 는 단위(`일`, `%`) 라벨이 두 번째 칼럼.
- `risk_plan` 가격 막대는 가로 풀폭, 손절-진입-익절을 라인 위에 표식으로.

## Elevation & Depth

평면 디자인 기조. 그림자는 결과 그룹 첫 카드(`action`, `card-elevated`)에만 미세하게 적용해 시선 끌기:
`box-shadow: 0 10px 28px rgba(23, 32, 42, 0.08)` — 토큰화하지 않음(한 군데만 사용, 토큰 도입은 두 곳 이상 쓸 때).

나머지 카드는 `1px solid {colors.line}` 만으로 분리. 입력 칸은 패널보다 한 톤 어두운 `field-bg` 배경으로 깊이를 표현.

## Shapes

- **카드·입력·버튼**: `{rounded.sm}` = 8px. 토스 톤의 부드러움.
- **배지·태그**: `{rounded.pill}` = 999px. 상태 라벨 전용.
- **가격 막대 트랙·표식**: `{rounded.pill}` — 작은 도트도 동일.

## Components

### 검색 영역

- `input` — ticker 검색 필드. `placeholder="종목명·티커 입력 (예: AAPL, BTC-USD)"`. 포커스 시 보더 색은 `{colors.tertiary}` 톤(globals.css 의 보더 변수를 그대로 사용).
- `search-result-item` / `search-result-item-focus` — 자동완성 결과 카드. 키보드 ↑↓ 또는 마우스 hover 시 `search-result-item-focus` (옅은 teal 배경). 결과 카드 안에는 ticker(굵게) · name · `currency` 칩 · `aliases` 일부 노출.
- 미선택 상태에서는 제출 버튼이 `button-primary-disabled` (opacity 0.65, cursor not-allowed).

### 입력 영역

- `input` — 숫자 필드(`inputMode="decimal"`). 각 필드 helper text 는 `typography.caption` 으로 위/아래 어느 쪽에든 한 줄 — 예: "1 ~ 5 사이의 값을 입력해 주세요" (`max_loss_pct`).
- `input-error` — `validateAnalyzePayload` 반환 메시지가 있을 때. 보더·텍스트가 `critical` 톤으로 전환. 메시지는 필드 바로 아래 한 줄(`typography.caption` × `{colors.critical}`).
- `button-primary` — "분석" 라벨. 로딩 중에는 라벨이 "분석 중" 으로 바뀌고 `aria-busy="true"` 설정. 키보드 Tab 4회 후 도달 가능(검색 → 자본 → 수익률 → 기간 → 손실률 → 분석).

### 결과 영역

- `card-elevated` — `action` 한 장. 내부:
  - `badge-accent` / `badge-warn` / `badge-critical` — action 의 권고 강도에 따라.
  - `display` 한 줄(한글 라벨, 아래 OPEN QUESTION 결정).
  - `body-md` 한두 줄 — BE 가 함께 보내는 권고 근거(없으면 생략).
- `card` × `badge-warn` — `feasibility` 가 비현실 판정(`UNREALISTIC`)일 때. 카드 상단에 "⚠ 비현실적인 목표예요" 배지(텍스트 + 이모지 — 라이브러리 미도입 정합), 본문에 BE 가 돌려주는 연환산 목표 수익률·기간·근거.
- `card-warn` — `warnings` 블록. 비어 있으면 렌더 안 함. 각 warning 은 불릿 한 줄.
- `card` — `brief` (기술 신호). 헤더에 `badge-accent`/`badge-warn`(BUY/HOLD/SELL) + 본문에 근거. `action` 과 다른 결론이면 카드 좌측에 두께 3px 의 `line` 컬러 보더 한 줄을 추가해 "이건 별개 신호" 임을 시각적으로 분리.
- `card` — `risk_plan`. 위쪽에 4행 표(진입가 / 손절가 / 익절가 / 제안 수량·금액), 아래쪽에 `price-bar-track` 위로 `price-bar-stop`(critical) · `price-bar-entry`(info) · `price-bar-target`(tertiary) 3개 표식이 가격 비율로 배치. RR 비율은 표 하단 한 줄.
- `card` — `horizons`. 단·중·장기 3개 줄 — `typography.body-sm` × `{colors.body-strong}`.

### 에러·실패 영역

- `card-critical` — 검증 사전 차단 메시지(폼 상단), BE 5xx 폴백("엔진에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요."). `aria-live="polite"` 로 스크린리더 안내.
- whitelist miss 는 `card` × `body-md` 한 문장 — 톤은 사용자 잘못이 아닌 "지원 종목" 프레이밍: "지원 종목이 아니에요. 현재는 AAPL 또는 BTC-USD 만 분석할 수 있어요." 직접 입력 후 분석 시 표시.

## Do's and Don'ts

- ✅ 색은 `{colors.<name>}` 토큰 참조로만 사용한다. 컴포넌트 영역에 hex 직타 금지.
- ✅ `action` 의 한글 라벨은 한 화면에 하나만 `display` 크기로 노출한다. 나머지 카드 제목은 `h2` 이하.
- ✅ feasibility 비현실 강조는 색 + 텍스트 + 이모지 세 트랙 모두로 전달한다 (AC-15: 색만으로 의미를 전달하지 않는다).
- ✅ 숫자는 `typography.mono-numeric` 으로 자릿수를 맞춘다. `1,000,000` 의 콤마는 표시한다.
- ✅ 입력 사전 차단 메시지는 BE 호출 전에, 필드 바로 아래에 보여준다. 분석 버튼 클릭 시점에 화면 상단으로 점프하지 않는다.
- ❌ 결과 카드를 한꺼번에 손절·진입·익절 세 가지 색으로 칠하지 않는다. 한 카드 안의 강조는 한 톤.
- ❌ `brief.action` 과 `action` 이 다른 경우 두 값을 같은 카드, 같은 색에 묶지 않는다.
- ❌ `warnings` 가 비어 있을 때 빈 카드를 보여주지 않는다. 섹션 자체를 렌더하지 않는다.
- ❌ ticker 가 선택되지 않은 상태에서 분석 버튼이 활성화되지 않는다. 활성/비활성을 색만으로 구분하지 않고 `aria-disabled` 와 라벨(예: "종목을 먼저 선택해 주세요") 로도 전달.
- ❌ 가격 막대에 라이브러리(차트·d3)를 도입하지 않는다. CSS 만으로 충분.

---

## 유저 시나리오

### 시나리오 A — 해피 패스 (`AAPL`, 5% / 30일)

1. 사용자가 메인 진입. `searchPanel` 의 입력 칸에 `app` 타이핑.
2. 250ms 디바운스 후 `useWhitelistSearch("app")` 트리거 → 결과 카드 1건 (`AAPL — Apple Inc. (USD)`). 키보드 ↓ 한 번 + Enter 또는 카드 클릭으로 선택.
3. `topBar` 우측에 "AAPL · Apple Inc. (USD)" 표시. `capital_amount` 필드 옆 보조 라벨이 `USD` 로 갱신.
4. `1000000` (KRW 가 아니라 USD 단위라는 점을 사용자가 인지) — 라고 적었지만 currency 가 USD 인 경우 사용자가 KRW 로 입력하면 안 됨. **시나리오는 currency 일치 가정.** 사용자가 1000 USD 입력 → 5% 수익률 → 30일 → 2% 최대 손실.
5. "분석" 버튼 활성화 (4개 필드 모두 통과 + ticker 선택). 클릭 시 라벨 "분석 중", `aria-busy="true"`, 결과 영역에 스켈레톤 4장(action / feasibility / risk_plan / horizons).
6. 약 1~2초 후 응답 도착. `action` 카드(`card-elevated`) 가 가장 먼저 나타나고 (스켈레톤 → 페이드 전환 X, 단순 교체), `display` 로 한글 라벨(예: "지금 매수"). 아래에 BE 가 보낸 보조 근거 한두 줄.
7. 그 아래 `warnings` (가격 소스 폴백이 있다면 한 줄), `feasibility` (현실적 — `badge-accent`), `brief` (BUY — `badge-accent`, action 과 같으므로 별도 보더 X), `risk_plan` (표 + 가격 막대), `horizons` 순.

### 시나리오 B — 비현실 목표 강조 (`BTC-USD`, 50% / 7일)

1. 같은 흐름으로 `BTC-USD` 선택, `capital_amount=5000000`(KRW 표시 — currency 가 다르면 보조 라벨도 KRW 로), `target_return_pct=50`, `target_period_days=7`, `max_loss_pct=2`.
2. 입력은 모두 사전 차단 통과(범위·정수·양수 OK).
3. 응답 도착. `action` 카드는 `badge-warn` 또는 `badge-critical` (BE 가 `AVOID` 또는 `CONDITIONAL_BUY` 를 돌려준다고 가정 — 어느 쪽이든 디자인은 권고 강도에 따라 배지만 바뀜).
4. **`feasibility` 카드가 `badge-warn` + "⚠ 비현실적인 목표예요" + 본문에 "이 목표는 연 환산 약 X% 에 해당해요. 기간을 늘리거나 목표를 낮춰 보세요." 로 첫 인상에서 인지된다 (AC-3).** 카드 자체는 `card-warn` 배경.
5. `brief` 는 별개의 BUY/HOLD/SELL 권고를 보여줘도 무방하며, `action` 과 다르다면 좌측 보더 3px 로 분리되어 사용자가 "기술 신호와 최종 권고가 다르다" 는 사실을 본다 (AC-4).
6. `risk_plan` 가격 막대는 그대로 표시되지만 표 위에 `body-sm` × `{colors.warn}` 한 줄로 "비현실 목표 기준 계산값 — 참고로만 보세요" 안내.

---

## 핸드오프 명세 — 화면 상태별 컴포넌트·텍스트·토큰

| 상태 | 진입 조건 | 노출 컴포넌트 | 핵심 텍스트 | 사용 토큰 |
|---|---|---|---|---|
| **분석 전 (Empty)** | mutation 미실행, ticker 미선택 또는 입력 미완 | searchPanel, inputPanel, **placeholder card**(`card` × `body-sm` × `{colors.secondary}`) | "종목과 조건을 입력하면 분석 결과가 표시돼요." | `card`, `typography.body-sm`, `{colors.secondary}` |
| **ticker 미선택 → 분석 시도** | 입력은 다 됐지만 ticker 선택 X | 분석 버튼 클릭 시 `aria-disabled` 유지, 검색 영역에 helper | "분석할 종목을 먼저 선택해 주세요." | `button-primary-disabled`, `{colors.warn}` × `typography.caption` |
| **사전 차단 (Validation)** | `validateAnalyzePayload` 가 어느 필드든 거절 | 해당 필드 → `input-error`, helper 메시지 한 줄 | `validateAnalyzePayload` 반환 한글 메시지 그대로 | `input-error`, `typography.caption`, `{colors.critical}` |
| **로딩 (Loading)** | mutation `isPending = true` | 분석 버튼 라벨 "분석 중" + `aria-busy="true"`, 결과 영역에 스켈레톤 4장 (`action`/`feasibility`/`risk_plan`/`horizons`) | 버튼: "분석 중" | `button-primary` (라벨만 교체), 스켈레톤은 `{colors.field-bg}` 배경 카드 |
| **정상 (Success)** | mutation 성공, `warnings` 빈 배열 가능 | `card-elevated`(action) → `feasibility` → `warnings`(있을 때) → `brief` → `risk_plan` → `horizons` | 각 블록 BE 응답 + 토큰 한글 라벨 | 위 Components 절 매핑 |
| **feasibility 비현실** | `feasibility.label === "UNREALISTIC"` 또는 동등 | feasibility 카드 `card-warn` + `badge-warn` "⚠ 비현실적인 목표예요" | "이 목표는 연 환산 약 X% 에 해당해요. 기간을 늘리거나 목표를 낮춰 보세요." | `card-warn`, `badge-warn`, `{colors.warn}` |
| **action vs brief 불일치** | `action.kind !== brief.action` (의미 매핑 기준) | `brief` 카드 좌측 3px 보더 + `caption` 한 줄 "최종 권고와는 별개의 기술 신호예요." | "최종 권고와는 별개의 기술 신호예요." | `{colors.line}` (3px), `typography.caption`, `{colors.secondary}` |
| **whitelist miss** | 사용자가 검색 결과 선택 없이 직접 입력 후 분석 | `card` 한 장 + `body-md` | "지원 종목이 아니에요. 현재는 AAPL 또는 BTC-USD 만 분석할 수 있어요." | `card`, `typography.body-md` |
| **BE 4xx 매핑 가능** | `ApiError.kind === 'validation'` 또는 `'whitelist_miss'` | 결과 영역에 `card-critical` 한 장 + `aria-live="polite"` | BE `detail` 본문이 한글이면 그대로, 영문이면 `errors.ts` 매핑 한글 카피 | `card-critical`, `typography.body-sm`, `{colors.critical}` |
| **BE 5xx · 네트워크 실패** | `ApiError.kind === 'network'` 또는 `'server'` | `card-critical` + "다시 시도" 버튼(보조) | "엔진에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요." | `card-critical`, `button-primary` (보조 액션) |

키보드 Tab 순서: `검색 입력 → (검색 결과: ↑↓ 키 + Enter) → capital_amount → target_return_pct → target_period_days → max_loss_pct → 분석 버튼 → (결과 영역의 details 토글이 있으면 그 다음) → 다시 시도(에러 시)`. 모든 폼 필드에 `<label>` 연결, 자동완성 결과 카드에 `role="option"` + 컨테이너 `role="listbox"`, 선택 시 `aria-selected="true"`.

## OPEN QUESTION 결정 (디자이너 영역)

PRD §9 의 7개 질문에 대한 디자이너 결정. PM 권고와 다른 경우 사유 명시.

| # | 질문 | 결정 | PM 권고 대비 |
|---|---|---|---|
| 1 | 검색 UX 디테일 | **자동완성 드롭다운** (입력 필드 바로 아래로 결과 카드 리스트). debounce **250ms**. 키보드 ↑↓ + Enter, ESC 로 닫기. 결과가 1건일 때도 자동 선택은 X — 사용자가 Enter 또는 클릭으로 확정. | (디자이너 결정 영역) |
| 2 | feasibility 비현실 강조 | **`badge-warn` 배지("⚠ 비현실적인 목표예요") + `card-warn` 배경 + 본문에 BE 가 보낸 연환산 수치**. 색만 아니라 텍스트·이모지 모두로 전달 (AC-15). 발사 자체는 막지 않음 (사용자가 직접 판단). | PM 권고 수용 |
| 3 | `capital_amount` 통화 | **ticker 선택 시 ticker.currency 를 입력 필드 옆(두 번째 칼럼)에 보조 라벨로 표시**. 입력은 단순 숫자 — 통화 변환은 하지 않고 사용자가 그 currency 단위로 입력하는 것으로 간주. ticker 미선택 시 보조 라벨은 "-". | PM 가설 수용 |
| 4 | `action` 6 라벨 한글 톤 | `ACTIONABLE_BUY` → **"지금 매수"** / `CONDITIONAL_BUY` → **"조건 충족 시 매수"** / `HOLD` → **"보유 유지"** / `PARTIAL_SELL` → **"일부 매도"** / `SELL` → **"전량 매도"** / `AVOID` → **"진입 보류"**. 직설적이되 단정적 명령어는 피함(투자 책임은 사용자). 배지 색: BUY 계열 → `badge-accent`, HOLD → `badge-info`, SELL 계열 → `badge-warn` 또는 `badge-critical`(SELL/AVOID 는 critical). | (디자이너 결정 영역) |
| 5 | `risk_plan` 시각화 정도 | **표(진입가 / 손절가 / 익절가 / 제안 수량 · 금액 / RR 비율) + 가로 가격 막대** (`price-bar-track` 위에 `stop`(critical) · `entry`(info) · `target`(tertiary) 3개 표식). CSS 만 사용, 차트 라이브러리 미도입. | (디자이너 결정 영역) |
| 6 | `warnings` 노출 위치 | **`action` 카드 바로 아래** (feasibility 보다 위). 데이터 신뢰성 메시지는 사용자가 결과를 해석하기 전에 보는 게 안전. 빈 배열이면 섹션 자체 숨김. | PM 권고 수용 (action 블록 하단 — 본 디자인에서 "action 카드 직후 + feasibility 위" 로 좀 더 구체화) |
| 7 | 라우트 위치 | **메인 페이지(`app/page.tsx`) = 워크벤치**. MVP 단계에서는 별도 랜딩 화면을 만들지 않는다. 차후 PRD 로 분리. | PM 권고 수용 |

## lint 메모

본 산출물은 ux-designer 에이전트 대신 메인 에이전트가 ux-designer 정의·`docs/rules/design-md.md`·PRD 를 그대로 따라 작성한 버전이다 (ux-designer 에이전트 spawn 이 3 회 연속 API 529 Overloaded 로 실패). 산출 직전 `npx @google/design.md lint` 실행을 시도하며 결과는 PR 본문에 첨부한다.
