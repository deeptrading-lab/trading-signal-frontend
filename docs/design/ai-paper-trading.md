---
version: alpha
name: ai-paper-trading
description: AI 모의투자 MVP-A — in-memory mock 기반 세션 생성, 가상 체결, 자산곡선, 판단 타임라인
colors:
  surface: "#ffffff"
  surface-muted: "#f6f8fa"
  text-strong: "#111827"
  text-muted: "#5b6470"
  accent-vivid: "#1d4ed8"
  success: "#dc2626"
  danger: "#2563eb"
typography:
  title:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.45
rounded:
  card: 12px
  control: 8px
spacing:
  section-gap: 16px
  card-padding: 16px
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
components:
  summary-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  timeline-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "{spacing.card-padding}"
---

# ai-paper-trading 디자인 가이드

## Overview

AI 모의투자 MVP-A는 실제 주문이 아니라 **가상 체결 기록을 빠르게 읽는 내부 운용 도구**다. 화면은 마케팅 랜딩이 아니라 조작 가능한 대시보드로 시작한다. 첫 화면에서 세션을 만들고, 상세 화면에서 평가금액·수익률·가상 포지션·판단 타임라인을 바로 확인한다.

## Layout

- 목록 화면은 좌측 생성 폼, 우측 세션 목록의 2열 구조를 기본으로 한다. 모바일에서는 단일 열로 쌓는다.
- 상세 화면은 상단 요약 지표 4개, 중단 자산곡선/최신 판단, 하단 포지션/타임라인 순서다.
- 프로필 보조메뉴에서 진입한다. 주 네비 5개 구조는 바꾸지 않는다.

## Interaction

- “세션 시작”은 mock provider로 첫 tick까지 실행한다.
- “지금 재판단”은 다음 30분 window의 가상 tick을 1개 추가한다.
- 일시정지 상태에서는 재판단 버튼을 비활성화한다.
- 완료 상태는 읽기 전용으로 둔다.

## Copy

사용자 노출 문구는 한글을 기본으로 한다. 실제 주문으로 오해되지 않도록 “가상”, “모의”, “참고”를 명시한다.

금지 표현:

- 실전 매수
- 자동 주문
- 수익 보장
- 추천 종목 확정

## MVP-A 한계

- 저장소는 in-memory/mock 이며 서버 재시작 시 사라질 수 있다.
- Supabase ledger, 실제 장중 가격, CLI agent bridge 는 후속 단계다.
