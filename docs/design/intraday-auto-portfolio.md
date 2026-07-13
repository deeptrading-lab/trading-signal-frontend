---
version: alpha
name: AI 단타 자동 포트폴리오
description: 금액 하나로 시작하는 밝고 간결한 자동 모의매매 진입 영역
colors:
  primary: "#191F28"
  secondary: "#4E5968"
  tertiary: "#3182F6"
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
    rounded: "{rounded.control}"
    padding: 16px
  amount-input:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: 16px
---

# AI 단타 자동 포트폴리오 디자인 가이드

## Overview

첫 화면의 주인공은 종목이나 설정이 아니라 투자금이다. 자동 운용 규칙은 한 줄로 요약하고 세부 조정은 노출하지 않아 사용자가 “금액 입력 → 시작”만 이해하게 한다.

## Colors

- Primary는 금액과 핵심 지표에 사용한다.
- Tertiary는 자동 시작 CTA 한 곳에만 사용한다.
- Neutral은 기존 밝은 금융 도구 지면과 이어진다.

## Typography

- 투자금은 heading 크기와 tabular 숫자로 빠르게 읽힌다.
- 설명·안전 안내는 body 또는 caption 계층으로 낮춘다.

## Layout

- 모바일은 입력과 버튼을 세로로, `sm` 이상은 가로로 배치한다.
- 시작 후 합산 지표는 2열에서 4열로 확장한다.
- 기존 수동 검색과 추천 후보는 자동 영역 아래에 유지한다.

## Shapes

- 자동 영역은 큰 라운드 카드 하나만 사용하고 내부 지표는 추가 카드로 쪼개지 않는다.
- 종목별 배정은 작은 pill로 표시한다.

## Components

- `primary-action`: 로딩 중 비활성화하고 “종목별 AI 첫 판단 중…”으로 진행 상태를 설명한다.
- `amount-input`: 숫자 키패드와 천 단위 콤마를 사용한다.
- 포트폴리오 요약: 종목 수·투자금·평가금·수익률을 동일 계층으로 배치한다.

## Do's and Don'ts

- ✅ 필수 입력을 금액 하나로 유지한다.
- ✅ 모의매매·자동 종료·현금 버퍼를 시작 전에 짧게 알린다.
- ❌ 후보 순위나 위험 설정을 시작 폼에 추가하지 않는다.
- ❌ 수익을 보장하는 표현을 쓰지 않는다.
