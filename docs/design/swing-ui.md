---
version: alpha
name: swing-ui
description: 스윙 체크(규칙서 swing-v1 결정론 판정) 2표면 — (A) `/swing` 스크리너 목록(수급 조건 충족 · 주의 종목 · 전체), (B) 종목 상세 "스윙 체크" 카드(주의 사유 · 조건별 실측값 체크리스트 · 참고 레벨 · 과거 통계). PR-1 검증 결과 출시 형태가 **체크리스트 모드**(매수 추천 아님)라 매수·매도 동사를 쓰지 않고, 표본 밖까지 성립한 유일한 규칙인 **주의(제외) 사유를 가장 눈에 띄게** 둔다. 라이브 source `finsight-redesign` 토큰만 재사용 — 신규 색·타이포·spacing 0. 충족 여부 색은 등락색(signal-up/down)과 분리(#391 원칙) — 충족 = `outcome-hit`, 미충족 = `text-muted`, 주의 = `warn`.
colors:
  primary: "#1f3b4d"
  surface: "#ffffff"
  surface-muted: "#f6f8fa"
  text-strong: "#0f1419"
  text-muted: "#5b6470"
  warn: "#a14a06"
  warn-soft: "#fff3df"
  outcome-hit: "#166534"
  accent-soft: "#eaf0f6"
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
spacing:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  table-row-h: 48px
  button-sm-h: 32px
rounded:
  sm: 8px
  md: 12px
  pill: 999px
components:
  swing-page-title:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.h1}"
    padding: 0px
  swing-section-title:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.h2}"
    padding: 0px
  swing-meta:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: 0px
  swing-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-sm-strong}"
    height: "{spacing.table-row-h}"
    padding: "{spacing.md}"
  swing-row-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
  swing-tabs-track:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    height: "{spacing.button-sm-h}"
  swing-tab-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.pill}"
  swing-caution-callout:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    typography: "{typography.body-sm-strong}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  swing-caution-chip:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "{spacing.sm}"
  swing-met-chip:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "{spacing.sm}"
  swing-check-pass:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.outcome-hit}"
    typography: "{typography.label-sm}"
  swing-check-miss:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label-sm}"
  swing-check-value:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body-sm}"
  swing-disclaimer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
---

# swing-ui 디자인 가이드

## Overview

스윙 체크는 사용자의 스윙 체크리스트(수급·매물대·1년 위치·RSI/MACD/골든크로스·쌍바닥)를 **규칙서 swing-v1** 으로 코드가 계산한 결과를 보여 주는 화면이다. PR-1 사전 등록 검증에서 "매수 후보"의 우위가 증명되지 않아 **체크리스트 모드**로 출시한다 — 화면은 "무엇을 사라"가 아니라 **"조건이 몇 개 맞는지, 지금 피해야 할 이유가 있는지"** 를 숫자로 보여 준다.

- **표면 A `/swing`** — 매일 07:20 KST 전 거래일 확정 데이터로 만든 스크리너. 탭 3개: **수급 조건 충족**(개인−·외국인+·기관+ ∧ 주의 없음) · **주의 종목**(제외 사유 있음) · **전체**. 거래대금 순.
- **표면 B 종목 상세 "스윙 체크" 카드** — 기존 4축 시그널 요약 자리를 국내 종목에서 대체(미국 종목은 기존 유지). 주의 사유 → 체크리스트 표 → 참고 레벨 → 과거 통계 → 면책 순.

톤은 토스톤 카드리스 화이트(기존 `/stock`·`/watchlist` 와 같은 플랫 리스트·헤어라인).

## Colors

신규 색 **0개**. 의미 매핑:

- **`warn` / `warn-soft`** — **주의(제외) 사유**. 표본 밖 2.5년에서 10일 −0.57% 로 확인된 유일한 규칙이라 화면에서 가장 강한 강조를 받는다(콜아웃·칩).
- **`outcome-hit`** — 체크리스트 **충족**. 등락색(빨강/파랑)을 쓰지 않는다 — 충족이 "오른다"로 읽히지 않게(#391 원칙).
- **`text-muted`** — **미충족·판단 불가**. 경고색을 쓰지 않는다(미충족은 위험 신호가 아니다).
- **`accent-soft` / `primary`** — "충족 n/7" 칩.
- 등락률·순매수 금액의 부호 색은 기존 규칙(`signal-up`/`signal-down`) 그대로(코드에서 기존 헬퍼 재사용).

## Typography

신규 0. `h1` 페이지 제목, `h2` 카드 제목, `body-sm-strong` 종목명·콜아웃, `body-sm` 값, `label-sm` 충족 표시, `caption` 메타·칩·면책.

## Layout

- `/swing`: `max-w-main-max-w` 단일 컬럼. 헤더(제목·기준일·집계 상태) → 탭(필터) + 시장 토글 → 행 목록(헤어라인 구분). 모바일·데스크톱 같은 행 구조(정보가 적어 표 전환 불필요).
- 행: `[이름·시장] [오른쪽: 종가]` + 둘째 줄 칩(수급 탭 = "충족 n/7"·국면, 주의 탭 = 사유 칩). 행 전체가 종목 상세 링크.
- 종목 카드: 섹션 헤어라인(`mt-lg border-t pt-lg`) 안에 제목 → 주의 콜아웃(있을 때만) → 체크리스트 표(조건 · 실측값 · 충족) → 참고 레벨 3칸 → 과거 통계 한 줄 → 면책.

## Elevation & Depth

그림자 없음(플랫). 탭 활성 pill 만 기존 `shadow-sm`.

## Shapes

칩·탭 pill(`rounded.pill`), 콜아웃 `rounded.md`.

## Components

- **swing-caution-callout** — 주의 사유가 있으면 카드 맨 위. 사유마다 한 줄: "고변동 — 하루 평균 변동폭 7.0% (KOSPI 기준 4.97% 이상)". 아래 한 줄로 그 상태의 과거 통계("이 상태였던 종목은 10일 뒤 같은 날 전체 종목보다 평균 0.48%p 낮았어요").
- **swing-row / swing-caution-chip / swing-met-chip** — 목록 행과 칩.
- **swing-check-pass / -miss / -value** — 체크리스트 표 셀. 충족 "충족", 미충족 "—", 판단 불가 "확인 불가".
- **swing-disclaimer** — "투자 권유가 아니에요. 과거 통계는 미래 수익을 보장하지 않아요."

상태: 로딩(스켈레톤 행/블록), 빈 목록("오늘은 조건을 충족한 종목이 없어요" + 주의 탭 안내), 오류(재시도 버튼), 집계 전(아직 한 번도 안 돈 경우 안내).

## Do's and Don'ts

- Do: 주의 사유와 실제 수치를 함께 보여 준다(기준값 병기).
- Do: 과거 통계는 n·비교 기준(같은 날 전체 종목)을 같이 쓴다. n < 30 이면 숫자를 숨긴다.
- Don't: "매수 후보·추천·확실·보장·지금 사세요" 같은 표현(체크리스트 모드 금지어).
- Don't: 충족을 빨강/파랑 등락색으로 칠하지 않는다.
- Don't: 손절가·목표가라는 이름을 쓰지 않는다 — "참고 지지·참고 저항".
