---
version: alpha
name: local-program-trading
description: 기존 finsight-redesign 토큰을 사용하는 로컬 모의매매 패널
colors:
  primary: "#1f3b4d"
  surface: "#ffffff"
  text-strong: "#0f1419"
  surface-muted: "#f6f8fa"
typography:
  body-md:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
components:
  action:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
  metric:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-strong}"
---

# 프로그램 자동매매 디자인

## Overview
AI 단타 화면의 AI 단타 가이드 / 프로그램 자동매매 탭으로 구분한다. 합성 시세와 가상 계좌 표시를 먼저 보여준다. 실제 계좌 연결처럼 오인시키지 않는다.

## Colors
기존 docs/design/finsight-redesign.md 및 tailwind.theme.json을 재사용한다. 신규 토큰 없음. 상태는 색과 텍스트를 함께 제공한다.

## Typography
제목 text-h2, 본문 text-body-md, 부가 설명 text-caption, 금액 tabular-nums. 한글을 기본으로 한다.

## Layout
모바일 지표 2열, lg 이상 4열. 제어 버튼은 줄바꿈. 긴 원장은 내부 가로 스크롤. breakpoints는 기존 sm/md/lg/xl 사용.

## Components
상단 두 탭은 선택 상태를 배경·텍스트로 구분한다. tablist/tab/tabpanel 및 키보드 좌우/Home/End를 지원한다. 프로그램 탭에만 후보 합집합과 출처를 표시하며, 후보 없음 안내와 시작 버튼 비활성을 함께 제공한다.
card, button-primary, button-secondary, badge-info 재사용. 제어는 min-h-hit-area-min. 신규 매수 중지와 전량 청산을 분리하고 청산은 확인을 받는다. 규칙은 details로 접고 원장 최근 12건을 표시한다. 로컬 엔진 장애와 종료 상태를 명시한다.

## Do's and Don'ts
- 합성 시세·체결 가정·비용을 명시한다.
- AI 분석 미실행을 명시하고 자동 규칙 변경을 하지 않는다.
- 수익 보장 표현을 쓰지 않는다.
