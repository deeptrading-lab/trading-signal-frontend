---
version: alpha
name: AI 단타 가이드 서비스 v2
description: 전략 이해, 운영 투명성, 시간 유효성을 중심으로 신뢰를 만드는 고객 가이드 화면
colors:
  primary: "#191F28"
  secondary: "#4E5968"
  tertiary: "#1D4ED8"
  neutral: "#FFFFFF"
typography:
  heading:
    fontFamily: Pretendard
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  card: 16px
  control: 12px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  primary-action:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.neutral}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: 16px
  status-panel:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: 16px
---

# AI 단타 가이드 서비스 v2 디자인 가이드

## Overview

전문가용 지표를 그대로 노출하는 화면이 아니라, 고객이 `지금 행동`, `왜 대기`, `얼마까지 위험`을 한 번에 구분하는 금융 가이드다. 밝고 간결한 톤을 유지하되 수익보다 계획손실과 유효시간을 같은 위계로 보여 신뢰를 만든다.

## Colors

- Primary는 종목명, 가격, 현재 상태처럼 의미가 확정된 정보에 사용한다.
- Secondary는 근거, 비용 미포함, 다음 분석처럼 보조 설명에 사용한다.
- Tertiary는 시작과 수행 확인 CTA에만 사용한다.
- 매수·매도·위험은 기존 signal 토큰을 재사용하고 반드시 텍스트를 함께 둔다.

## Typography

- 상품명과 종목명은 heading 위계를 사용한다.
- 목표/손절 금액은 같은 크기와 굵기로 표시해 수익만 강조하지 않는다.
- 유효시간은 짧고 명확한 body 문장으로 표시하고 만료 시 색상과 텍스트를 함께 바꾼다.

## Layout

- 시작 전 순서는 상품 가치 → 전략 4요소 → 금액 시나리오 → 위험 확인 → CTA다.
- 진행 중 순서는 런 상태 → 운영 현황 → 최신 행동 → 수행 보유 → 활동 기록이다.
- 모바일은 전략·금액 지표를 2열로, `lg` 이상은 4열로 배치한다.
- 대기 이유는 한 문단과 최근 스크리닝 수치 한 줄로 제한한다.

## Shapes

- 상품, 운영 현황, 행동 가이드는 큰 card 라운드를 사용한다.
- 전략 수치와 상태는 중첩 카드 대신 muted surface의 compact cell로 표현한다.
- 위험 확인은 전체 클릭 가능한 control 라운드를 사용한다.

## Components

- `primary-action`: 위험 확인 전 disabled 상태여야 하며 한 화면에 하나만 둔다.
- `status-panel`: 활성 종목, 빈 슬롯, 최근 후보를 동일한 숫자 위계로 표시한다.
- 전략 셀: `+2% 목표`, `-1% 손절`, `최대 50%`, `최대 3종목`을 2×2 또는 4×1로 표시한다.
- 가이드 계획: 목표가/손절가와 금액 손익을 좌우 대칭으로 배치한다.
- 만료 상태: 행동 버튼을 제거하고 `기한 만료` 텍스트를 기록에 남긴다.

## Do's and Don'ts

- ✅ 행동이 없을 때에도 마지막 분석 시각과 대기 이유를 보여준다.
- ✅ 비용 전 시나리오임을 금액 바로 옆에서 설명한다.
- ✅ 목표와 손절을 같은 크기로 보여준다.
- ✅ 유효시간이 지난 가이드는 서버에서도 거절한다.
- ❌ 빈 슬롯을 시스템 장애처럼 표현하지 않는다.
- ❌ `일 1% 달성`, `승률 보장`, `안전한 종목` 같은 단정 표현을 쓰지 않는다.
- ❌ 긴 AI 원문을 그대로 펼치지 않고 위험 메모는 최대 2개만 노출한다.
