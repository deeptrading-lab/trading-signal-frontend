---
version: alpha
name: codex-ai-analysis
description: 종목 상세 AI 분석에서 Claude와 Codex 실행기를 명확히 구분하는 공급자 선택 UI
colors:
  primary: "#4338ca"
  secondary: "#047857"
  tertiary: "#b45309"
  neutral: "#ffffff"
typography:
  label:
    fontFamily: Pretendard, -apple-system, BlinkMacSystemFont, Arial
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
rounded:
  md: 8px
spacing:
  sm: 8px
components:
  provider-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  provider-codex:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  provider-claude:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.tertiary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
---

# Codex AI Analysis 디자인 가이드

## Overview

기존 AI 종합분석 패널의 정보 밀도와 빠른 조작성을 유지하면서, 사용자가 분석 실행 전에 Claude와 Codex 중 실제 실행기를 명확히 선택하도록 한다. 공급자 선택은 모델 비교 기능이 아니라 실행 경로 선택 기능이다.

## Colors

- 활성 공급자는 기존 AI 영역의 인디고 강조색을 사용한다.
- Codex 액션은 초록 계열 텍스트, Claude 액션은 앰버 계열 텍스트로 빠르게 구분한다.
- 선택되지 않은 공급자는 흰색 배경을 유지해 분석 결과보다 강하게 보이지 않게 한다.

## Typography

- 공급자 이름은 13px Bold 레이블로 표시한다.
- 영문 고유명사 `Claude`, `Codex`는 원문 표기를 유지한다.

## Layout

- 종목 헤더: `AI 분석 | Claude | Codex`를 하나의 연결된 컨트롤로 배치한다.
- 패널 헤더: ticker 옆에 Claude/Codex 2분할 선택기를 둔다.
- 모바일: 공급자 선택기를 종목명 아래 한 줄에 유지하며 가로 스크롤 없이 노출한다.
- 분석 중: 선택기를 disabled 처리하고 현재 공급자 상태를 유지한다.

## Components

- `provider-active`: 패널에서 현재 선택한 공급자.
- `provider-codex`: 종목 헤더의 Codex 즉시 실행 액션.
- `provider-claude`: 종목 헤더의 Claude 즉시 실행 액션.
- 공급자 변경 후 기존 결과는 숨기고 시작 전 빈 상태로 전환한다.

## Do's and Don'ts

- 공급자 이름과 선택 상태를 항상 함께 보여준다.
- 키보드 접근을 위해 실제 `button`과 `aria-pressed`를 사용한다.
- 분석 도중 공급자 전환을 허용하지 않는다.
- Claude와 Codex의 중간 결과를 한 패널 실행 안에서 혼합하지 않는다.
