---
version: alpha
name: local-program-trading
description: 기존 finsight-redesign 토큰을 사용하는 한투 실전·모의 및 리플레이 자동매매 메뉴
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
독립 /program-trading 메뉴에서 한국투자증권 계좌 연결→시작→종료까지 두 조작으로 운용한다. 실전투자·한투 모의투자·리플레이는 제목 옆 배지, 연결계좌 안내, 시작 버튼 문구로 구분한다. 실전에는 실제 주문 실행 문구와 한도를 시작 전에 표시한다. 가이드 화면에는 운용 패널을 두지 않는다.

## Colors
기존 docs/design/finsight-redesign.md 및 tailwind.theme.json을 재사용한다. 신규 토큰 없음. 상태는 색과 텍스트를 함께 제공한다.

## Typography
제목 text-h1, 영역 제목 text-h2, 본문 text-body-sm, 보조 설명 text-caption, 금액 tabular-nums. 잔액은 비용 후 자산으로 표시한다.

## Layout
모바일 지표 2열, lg 이상 4열. 계좌 폼 sm부터 2열, 모바일 1열. 시작/종료 버튼은 모바일에서 동일 너비. 독립 메뉴는 Sidebar/BottomNav 공통 메뉴 정의에 등록한다. 기존 sm/md/lg/xl 경계를 재사용한다.

## Components
- 계좌 연동: 연결 전 펼침, 연결 후 접힘. 계좌번호와 상품코드, 선택적 API 키, 계좌유형. 비밀 입력 password 및 브라우저 저장 금지. 연결 오류 inline alert.
- 주문 상태: 거래 로그 안에 접수·부분체결·전량체결·취소확인중·거절·결과불명 상태와 주문/체결 수량·번호를 표시한다. 보유잔량과 마지막 계좌대사 시각을 함께 표시한다. unknown은 신규 매수 잠금과 재전송 금지를 명시한다.
- 수익 현황: 시작 자산/현재 또는 종료 자산/비용 후 손익/수익률 4지표. 실시간 값과 확정 값을 텍스트로 구분한다. 단절 시 마지막 수신 상태 표시. 실제 운용은 계좌 잔액을 사용하고 대사실패/외부거래/결과불명일 때 손익·수익률을 대시로 표시한다.
- 실행: 시작·종료 두 버튼. 중복 명령 잠금. 잔여 보유 시 종료 처리 중 표시, 완전 청산 전 완료 표기 금지. 오류를 버튼 근처에 제공한다.
- 다이어그램: 요약 기본 표시, 상세 전환 버튼 aria-pressed. 독립 인쇄 링크. iframe은 제목과 sandbox를 제공하고 모바일 내부 스크롤 허용.
- 로그: 최신 거래부터 전체 화면 수신 원장을 스크롤 표로 제공. 키보드 스크롤 영역, caption, scope 제공. 마지막 수신시각은 일반 텍스트로 제공하여 주기적인 스크린리더 반복 공지를 방지한다.

## Do's and Don'ts
- 합성/실전 표시와 계좌 조회 성공을 분리한다.
- 후보 목록·규칙 설정·복기 패널을 별도 추가하지 않는다. 규칙과 복기 흐름은 다이어그램에서 설명한다.
- 사용자 종료 시 별도 확인 팝업으로 조작을 늘리지 않는다. 엔진이 청산·중지 상태를 직접 추적한다.
- 실계좌 수익으로 오인시키는 가상 지표를 표시하지 않는다.

## UI 표시 보정 (2026-11-02)
- 자동매매 입력·선택 컨트롤은 `hit-area-min` 높이와 수직 여백 0을 사용한다. 모바일 글자 크기는 text-base, sm부터 text-body-sm으로 입력 확대와 글자 잘림을 방지한다. native select에 appearance-none·우측 여백·비상호작용 ChevronDown을 제공한다.
- 시작·종료·계좌 연결 버튼은 inline-flex로 아이콘과 문구를 가운데 정렬한다. 비활성 커서·투명도와 키보드 포커스 표시를 제공한다.
- 계좌 연동 summary에 펼침 상태 화살표를 표시한다. 지표 카드는 min-w-0, 모바일 본문 크기와 긴 금액 줄바꿈으로 화면 넘침을 방지한다.
- 다이어그램 선택은 모바일 2열·sm 이상 내용 너비를 사용한다. 요약·상세 iframe은 h-screen 영역에서 내부 스크롤한다. 로그 표는 max-w-full 영역 안에서 가로·세로 스크롤하고 포커스를 표시한다.
