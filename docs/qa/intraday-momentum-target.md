# QA — 오토파일럿 모멘텀 목표형(+2% 전량 익절)

- 검증일: 2026-08-06
- 브랜치: `feature/intraday-trend-target-2pct`
- 대상 PRD: `docs/prd/intraday-momentum-target.md`
- 판정: **변경 범위 PASS / 전체 스위트 기존 시간 의존 실패 5건**

## 1. 수용 기준 검증

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 | `autopilotRunId` 유/무 세션 | 자동만 momentum-target | 유→고정 정책, 무→adaptive 입력 비트 유지 | PASS |
| AC-2~5 | 스크리너 후보 출처·stage2 피처 조합 | 거래/수급+상승 확인, 추격 제외 | 탈락 사유까지 단위/E2E 검증 | PASS |
| AC-6 | conviction BUY, maxPositionPct=50 | 목표 비중 50% | 20% 입력을 50%로 덮어씀 | PASS |
| AC-7~8 | 평단 10,000원 | 목표 10,200원, 손절 9,900원 | KRX 호가 단위 산출 일치 | PASS |
| AC-9 | 보유 중 SELL 40/20, signal HOLD/SELL | 40은 HOLD, 20 또는 signal SELL은 EXIT 유지 | 세 경계 전부 일치 | PASS |
| AC-10 | 최근 AI 목표 10,400원, 평단 10,000원, 현재 10,200원 | 60초 스윕이 10,200원에서 전량 EXIT | risk 틱·SELL·10,200원 사유 기록 | PASS |
| AC-11 | 기존 게이트 코드/회귀 테스트 | 안전핀 불변 | 관련 기존 테스트 포함 통과 | PASS |

## 2. 라운드트립

```text
KIS 거래대금·등락·외국인/기관 수급 랭킹
→ stage1 하드필터·점수
→ 당일 5분봉 stage2
→ 거래/수급 확인 + VWAP 위 상승 구조 + 추격 제한
→ autopilotRunId 자식 cli-agent 세션
→ AI conviction(진입 확인·강한 테제 훼손만)
→ 최대 비중 진입
→ 실제 평단 +2% / −1%
→ 60초 가격-only 리스크 스윕
→ 전량 가상 EXIT
```

- 브라우저→BFF→외부 API 기존 경로 변경 없음.
- 실계좌 주문 경로 없음. `virtualExecution`의 가상 주문만 사용.
- 새 DB 컬럼 없음. 기존 세션·틱 JSON payload 필드로 관측.

## 3. 실행 결과

| 명령 | 결과 |
|---|---|
| 관련 vitest 5파일 | 119/119 PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | 오류 0, 기존 분석 스크립트 unused 경고 2 |
| `npm run build` | PASS (75 정적 페이지; 최초 샌드박스 포트 제한 후 허용된 동일 빌드 재실행) |
| `git diff --check` | PASS |

전체 `npm test`는 1,451개 중 1,443 PASS·3 SKIP·5 FAIL이다. 실패는 변경 파일이 아니라
`packages/intraday-mistake-note/CM.md`의 SHADOW 규칙 `UNTIL:2026-08-04`가 현재 날짜에 만료되어
`memory.test.ts` 1건과 그 규칙 주입을 기대한 `intradayConviction.test.ts` 4건이 실패한 기존
시간 의존 문제다. `CM.md`는 자동 생성물이고 만료 규칙을 근거 없이 연장할 수 없어 본 작업에서
수정하지 않았다.

## 4. 에지 케이스

- 무포지션 HOLD에는 가짜 목표/손절을 만들지 않는다.
- LLM 실패 시 신규 진입 금지는 유지하고, 보유 중 결정론 SELL은 계속 허용한다.
- 최근 AI 목표가가 바뀌어도 오토파일럿 리스크 스윕은 실제 평단에서 목표를 재계산한다.
- VWAP 아래, 상승 구조 미확인, 수급/거래량 미확인, +15% 초과, VWAP +3% 초과 후보는 편입하지 않는다.
- 목표/손절보다 장 막판·세션 손실·동적/하드 손절 우선순위는 기존 `virtualExecution` 그대로다.

## 5. 잔여 리스크

- 관련 테스트는 로직 정확성을 검증할 뿐 전략 수익성을 입증하지 않는다.
- 50% 비중에서 종목 +2%는 세션 +1% **gross**다. 현재 왕복 비용 모델 약 0.28%를 포지션 비중에
  적용하면 단일 완승의 세션 순수익은 대략 +0.86% 수준이라 일 +1% net은 보장되지 않는다.
- −1% 손절은 고변동 종목에서 잦은 정상 변동 손절을 만들 수 있다. 최소 20회 왕복 뒤 ATR 손절
  반사실과 비용 후 기대값·낙폭을 비교해야 한다.
