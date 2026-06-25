# QA — ai-paper-trading-mvp

- **slug**: `ai-paper-trading-mvp`
- **작성일**: 2026-06-24
- **대상 브랜치**: `feature/ai-paper-trading-mvp`
- **범위**: MVP-A — mock/in-memory 기반 AI 모의투자 흐름.

## 작업 체크리스트

| 항목 | 상태 | 확인 방법 |
|---|---|---|
| 별도 브랜치 생성 | 완료 | `feature/ai-paper-trading-mvp` |
| 디자인 문서 추가 | 완료 | `docs/design/ai-paper-trading.md` |
| 타입/엔진 추가 | 완료 | `lib/types/paperTrading`, `lib/server/paperTrading` |
| BFF 추가 | 완료 | `/api/paper-trading/sessions*` |
| 클라이언트 API/훅 추가 | 완료 | `lib/api/paperTrading`, `hooks/paperTrading` |
| 목록/상세 UI 추가 | 완료 | `/dashboard/paper-trading` |
| 프로필 보조메뉴 진입점 | 완료 | `/profile` 메뉴 |
| 단위 테스트 | 완료 | `vitest run lib/server/paperTrading/__tests__` |
| lint/typecheck | 완료 | `eslint .`, `tsc --noEmit` |
| 브라우저 검증 | 대체 완료 | agent-browser 부재로 dev server + HTTP smoke |

## 수용 기준 매핑

| AC | 재현 | 기대 |
|---|---|---|
| 세션 생성 | `/dashboard/paper-trading`에서 종목/투자금 입력 후 시작 | 상세 화면 이동, 첫 tick 생성 |
| tick 추가 | 상세 화면에서 “지금 재판단” 클릭 | 타임라인과 자산곡선 갱신 |
| 리스크 가드 | 100% 목표 비중 fixture | 최대 비중 50%, 현금 버퍼 10% 유지 |
| 상태 변경 | 일시정지/재개/완료 버튼 | 재판단 가능 여부가 상태에 맞게 변함 |
| BFF 패턴 | 코드 검색 | 브라우저는 `/api/paper-trading/*`만 axios로 호출 |

## MVP-A 한계

- in-memory store 라 서버 재시작 시 세션이 사라질 수 있다.
- 실제 KIS 장중 가격, Supabase ledger, CLI agent 연결은 후속 PRD/PR에서 다룬다.

## 검증 기록

| 항목 | 결과 |
|---|---|
| paperTrading 단위 테스트 | 5 passed |
| 전체 테스트 | 387 passed, 1 skipped |
| 타입체크 | 통과 |
| 린트 | 통과 |
| 프로덕션 빌드 | 통과. sandbox 포트 제한으로 1차 Turbopack panic 후 권한 상승 재실행 |
| HTTP smoke | `/dashboard/paper-trading` 200, 세션 생성 200, tick 추가 200, 상세 페이지 200 |
| 브라우저 자동화 | `agent-browser` CLI 미설치로 미수행 |
