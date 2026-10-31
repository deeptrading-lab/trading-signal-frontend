# QA — swing-rulebook (PR-1: 스윙 규칙서 오프라인 검증)

- 실행: 2026-11-01 06:20~06:30 KST
- 대상: 브랜치 `feature/swing-rulebook` (워크트리 `.claude/worktrees/swing-rulebook`)
- 근거: `docs/prd/swing-judgment.md` §5 PR-1 AC-1.1~1.8, 사전 등록 2건(`swing-rulebook-v1-preregistration.md`, `swing-v2-candidates-preregistration.md`)
- 성격: 앱 런타임 변경이 없는 분석 PR. UI·BFF·반응형·DESIGN.md 동기화는 해당 없음.

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1.1 테스트·타입·린트 | `npm test` · `npm run typecheck` · `npm run lint` | 통과 | 테스트 **1,652 통과**(3 skip, 기존) · 타입 오류 0 · 린트 에러 0(경고 3건은 이번에 안 건드린 기존 스크립트 `scripts/intraday/analysis/stop-cf.mts`·`stop-sweep.mts`·`scripts/signal/collect-oos.mts`) | 통과 |
| AC-1.2 결정성·창 불변성 | `lib/swing/__tests__/judge.test.ts` | 같은 입력 deep equal · 600봉 = 마지막 300봉 | 두 테스트 통과 | 통과 |
| AC-1.3 단위 테스트 범위 | `lib/swing/__tests__/*`, `lib/api/kis/__tests__/investorTradeDaily.test.ts` | 수급 단위·사모·단계·쌍바닥·계획·제외 경계 | features 12 · patterns 7 · plan 11 · judge 15 · audit 17 · candidates 5 · auditV2 8 · stats 4 · 수급 행 매핑 3 | 통과 |
| AC-1.4 사전 등록 순서 | `git log --format='%h %ct %s' main..HEAD` | 사전 등록 커밋 < 결과 커밋, 수익률 계산은 그 사이 | v1: 사전 등록 `56e97a1` 1793462876(01:07:56) < 결과 `b813039` 1793463057. v2: 사전 등록 `0b1307b` 1793481394(06:16:34) < 결과 `3a10721` 1793481552. 동결 코드 `49759ce` 이후 변경 없음(`git diff --stat 49759ce -- lib/swing scripts/swing/audit-v2.mts` 비어 있음 — 이후 커밋은 stats·테스트·문서만) | 통과 |
| AC-1.5 재현성 | 같은 캐시로 재실행 후 `shasum` | 동일 | `audit-discovery.json` c2f80e31… = 재실행 c2f80e31… · `audit-v2-holdout.json` dedc0982… = dedc0982… · `stats-v1.json` 2874f656… = 재실행 2874f656… | 통과 |
| AC-1.6 런타임 변경 0 | `git diff --stat main -- app components hooks` | 비어 있음 | 비어 있음 | 통과 |
| AC-1.7 결과 문서 | `docs/analysis/swing-rulebook-v1-result.md` · `swing-v2-candidates-result.md` | O/x 표 · 커버리지 · 다르게 한 점 | 둘 다 판정 O/x 표, 표본·커버리지, "사전 등록과 다르게 한 점" 절 있음 | 통과 |
| AC-1.8 통계 가드 | `lib/swing/__tests__/stats.test.ts` | stats.rulebook = RULEBOOK | 통과. `RULEBOOK.highVolAtrPct` 를 바꾸면 실패하는 것을 수동 확인(값 1개 임시 변경 → 실패 → 원복) | 통과 |

## 데이터 수집 (조회 전용)

| 항목 | 결과 |
|---|---|
| 주문 API 사용 | 0 — `scripts/swing/collect.mts` 의 KIS 경로는 `quotations/*`(일봉·수급·신용잔고·프로그램매매·투자의견·지수)뿐 |
| 일봉 · 수급 · 세부 수급 · 신용 · 프로그램 · 투자의견 | 2,534 · 2,445 · 2,445 · 2,445 · 2,445 · 2,445 파일, 최종 실패 0 |
| 수집 중 발견·수정 | 상장 전 채움 행으로 137종목 실패 → `isInvestorTradeFiller`(테스트 3건) · 지수 청크 간헐 500 → 청크 재시도 · KIS "SESSION FULL" 1건 재수집 |

## 판정 결과 요약 (사전 등록 그대로)

- v1 체크리스트 "매수 후보": 발견 미달(NW t 1.00) → **체크리스트 출시**(KOSPI·KOSDAQ).
- v2: C1 제외 집단 저조 **홀드아웃 통과**(−0.568%/10일, t −3.87) · C2 수급 동시 조건 미달 · 새 피처 8종 발견 통과 0.

## 해당 없음

UI·BFF·반응형 두 뷰포트·DESIGN.md 토큰 동기화 — 이 PR 은 화면·라우트를 바꾸지 않는다(PR-2·PR-3 에서 검증).
