---
version: alpha
name: AI 단타 가이드 상품
description: 오늘 이용권 진입과 한 번에 하나의 행동 알림에 집중하는 단타 가이드 경험
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
    rounded: "{rounded.control}"
    padding: 16px
  guide-card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.card}"
    padding: 24px
---

# AI 단타 가이드 상품 디자인 가이드

## Overview

화면은 운영 대시보드가 아니라 “오늘 무엇을 하면 되는지 알려주는 유료 가이드”처럼 읽혀야 한다. 시작 전에는 상품 가치와 단일 CTA, 시작 후에는 가장 최근 행동 한 건이 주인공이다. 밝고 단정한 금융 서비스 톤을 유지하며 수익 보장이나 실제 주문처럼 보이는 표현은 피한다.

## Colors

- Primary는 종목명·가격·핵심 수량에 사용한다.
- Tertiary는 시작과 수행 확인 같은 한 화면의 최우선 CTA에만 사용한다.
- 매수/매도 방향은 기존 signal 토큰을 재사용하되 색만으로 구분하지 않고 반드시 텍스트와 아이콘을 함께 둔다.
- Neutral 바탕과 기존 surface/border 토큰을 재사용해 신규 전역 테마를 만들지 않는다.

## Typography

- 상품명과 현재 행동 종목명은 heading 위계다.
- 가격·수량은 tabular 숫자와 굵은 본문을 사용한다.
- 근거·면책·예정 시각은 caption 위계로 낮춰 행동 정보와 경쟁하지 않게 한다.

## Layout

- 최대 폭은 기존 main shell을 따른다.
- 시작 전: 상품 설명 → 이용 조건 3개 → 기준 금액 → CTA → 체험/면책 순서다.
- 진행 중: 상태 스트립 → 최신 행동 카드 → 보유 요약 → 최근 활동 순서다.
- 모바일은 모든 액션을 세로 전체 폭으로 쌓고, `sm` 이상은 수행/패스 버튼을 나란히 둔다.
- 기존 검색·후보·표는 접을 수 있는 `직접 분석 도구` 아래에 배치해 첫 viewport의 행동 알림을 밀어내지 않는다.

## Shapes

- 상품/최신 행동 영역에만 큰 card 라운드를 사용한다.
- 상태·방향·대기 수는 pill badge로 압축한다.
- 최근 활동은 중첩 카드 대신 헤어라인 목록으로 표현한다.

## Components

- `primary-action`: 시작 전 한 번, 수행 재확인 단계 한 번만 노출한다.
- `guide-card`: 방향 라벨, 종목, 가격·수량, 근거, 응답 버튼을 포함한다.
- 상태 스트립: 진행 상태와 다음 분석 시각을 한 줄에 표시하고 과도한 실시간 애니메이션은 쓰지 않는다.
- 수행 확인: 기존 카드 안에서 내용을 교체하는 인라인 단계다. 모달을 추가해 맥락을 끊지 않는다.
- 빈 상태: `상위 거래·수급 종목을 분석 중이에요`와 다음 분석 안내를 보여준다.

## Do's and Don'ts

- ✅ 현재 사용자가 해야 할 행동을 첫 번째로 보여준다.
- ✅ `AI 가상 체결`과 `내가 수행한 기록`의 명칭을 구분한다.
- ✅ 매수·매도·수행·패스를 텍스트로 명시한다.
- ✅ 가격 옆에 결제 연동 전 체험 상태를 표시한다.
- ❌ 모든 알림을 같은 크기의 카드로 쌓지 않는다.
- ❌ 사용자가 수행하지 않은 매수를 보유 중으로 표시하지 않는다.
- ❌ `자동 수익`, `확정 수익`, `실시간 주문` 같은 표현을 쓰지 않는다.
