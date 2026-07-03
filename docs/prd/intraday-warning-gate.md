# PRD — intraday-warning-gate (단타 결정론 게이트: 정리매매·투자위험 신규 진입 차단)

- 작성: PM 역할 (2026-07-03)
- 브랜치: `feature/intraday-warning-gate`
- 선행: PR #204 `stock-warnings`, PR #205 `intraday-warnings`(§4 후속 ④).

## 1. 배경 / 문제

#205 는 매수 유의사항을 단타 LLM 프롬프트에 **참고 정보로 주입**한다(소프트 — AI 가 무시 가능).
자동 틱 단타는 가상이지만 스스로 체결(virtual fill)까지 하므로, 정리매매(상폐 절차)·투자위험 종목에
LLM 이 BUY 를 내면 자동 루프가 실제로 신규 진입할 수 있다. 결정론 안전핀이 없다.

기존 사후 게이트(`applyPostGate`)는 이미 약세 레짐·손익비<1.5·장 막판을 BUY→HOLD 로 하드 강등한다.
경보 게이트는 **이 패턴에 한 절을 더하는 것**이다.

⚠️ **순수 시그널 엔진(`evaluateSignal`)엔 넣지 않는다** — 경보는 이력이 없어(토스는 현재 활성만 제공)
백테스트가 불가능하고, 엔진은 캔들만 받는 순수 함수(백테스트 재사용)라 계약이 깨진다. 라이브 결정
계층(단타 사후 게이트 + 폴백)에만 적용한다.

## 2. 목표 (측정 가능)

- 활성 정리매매·투자위험(critical 심각도) 경보가 있으면 단타 신규 BUY 를 결정론적으로 HOLD 강등한다.
  LLM 판단 경로(`applyPostGate`)와 **LLM 실패 폴백 경로(`deriveFromSignal`)** 둘 다 차단한다.
- 단기과열·투자경고·VI(warn/info)는 차단하지 않는다 — 진입 금지까지 갈 신호가 아니라 프롬프트
  참고(#205)로 남긴다.
- 토스 키 없는 로컬·무경보: 동작 무변경(경보 배열 비어 게이트 미발동).

## 3. 범위 (In scope)

- `lib/copy/stock/warnings.ts`: `isEntryBlockingWarning(warningType)` — critical 심각도(정리매매·투자위험)
  판정. 단일 진실 원천(심각도 분류 재사용 → UI 빨간 배지 = 진입 차단이 구조적으로 일치).
- `intradayCli.ts`:
  - `applyPostGate` 에 경보 veto 절(레짐·손익비보다 우선순위 높게).
  - `deriveFromSignal` 의 `canBuy` 조건에 `!hasEntryBlockingWarning` 추가(폴백 경로 차단).
  - 두 곳이 공유하는 `hasEntryBlockingWarning(ctx)` 로컬 헬퍼.

## 4. 비범위

- 순수 엔진 게이트(위 배경 참조 — 하지 않음).
- 단기과열·투자경고·VI 의 진입 차단(참고 주입만 유지).
- AI 종합분석(일봉) 경로의 하드 게이트 — 사람이 최종 판단하는 decision-support 라 프롬프트 주입(#204)
  으로 충분. 단타 자동 체결 루프에만 안전핀을 둔다.
- 보유분 강제 청산(경보 발효 시) — 신규 진입만 차단, 청산은 기존 손절/익절 트리거 유지.

## 5. 수용 기준 (AC)

| # | 시나리오 | 기대 |
|---|---|---|
| AC-1 | 정리매매 활성 + LLM BUY | `applyPostGate` → HOLD 강등 + 조정 사유 기록 |
| AC-2 | 투자위험 활성 + LLM BUY | 동일 HOLD 강등 |
| AC-3 | 정리매매 활성 + LLM 실패 폴백(신호 BUY) | `deriveFromSignal` → HOLD(BUY 미발생) |
| AC-4 | 단기과열/투자경고/VI 만 활성 + BUY | 차단 안 함(BUY 유지 — warn/info 는 참고) |
| AC-5 | 무경보/키없음 + BUY | 무변경(기존 게이트만 적용) |
| AC-6 | 경보 활성 + SELL/HOLD | 영향 없음(신규 진입 차단만 — 청산·관망은 통과) |

## 6. 영향 분석

- `applyPostGate`/`deriveFromSignal` 는 이미 warnings 를 담은 ctx 를 받는다(#205) — 신규 인자 없음.
- LLM 프롬프트 무변경(#205 주입 그대로) — 본 PR 은 결정만 하드 강등.
- 백테스트·스코어카드·순수 엔진 무영향(라이브 결정 계층만).
- 조정 사유는 기존 `gateAdjustments` 배열로 틱 로그(체결 내역)에 표시 — 관측성 유지.

## 7. OPEN QUESTION

- q1. critical 심각도 재사용 vs 명시 타입 열거 — **PM 권고: critical 재사용**(`warningSeverity`
  단일 분류가 UI 배지 색과 트레이딩 차단을 구조적으로 일치시킴. 새 critical 경보 추가 시 자동 차단).
