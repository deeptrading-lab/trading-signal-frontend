# QA — 토론 제시순서 A/B 레버 (debate-order-lever)

- 대상 PR: `feature/debate-order-lever`
- 범위: 종합 단계(RM·트레이더·PM) 프롬프트의 강세/약세 논거 **제시 순서**를 config로 토글하는 진단 레버(`debateOrder`). 기본 `bull-first`=현행 바이트 동일(무회귀). 순서/recency 편향 격리용 A/B에 사용.
- 배경: 토론이 약세-라스트 구조 + 종합 프롬프트가 강세→약세 순이라 "마지막/순서 주장 쏠림" 우려 → 순서만 뒤집어 verdict 이동을 측정하기 위한 레버.

## 변경
- `analysisConfig.ts`: `AnalysisConfig.debateOrder: "bull-first" | "bear-first"` + DEFAULT(`bull-first`) + override + resolve 병합.
- `aiAnalysis.ts`: `orderedDebate(s, bullBlock, bearBlock)` 헬퍼 — config 순서대로 두 블록 이어붙임. RM·트레이더·PM user 프롬프트의 강세/약세 블록을 이 헬퍼 경유로 변경(기본 bull-first는 기존 출력 바이트 동일).
- `analysisConfig.test.ts`: 순서스왑 검증 3개(RM/trader/PM: bull-first=강세→약세, bear-first=약세→강세).

## 수용 기준 (AC)

| # | 항목 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 | 무회귀 불변식 | config undefined==default==기존 바이트 동일 | analysisConfig.test 11 통과 | ✅ |
| AC-2 | bear-first 순서 뒤집힘 | RM·트레이더·PM 모두 약세 블록 먼저 | 순서스왑 3 통과 | ✅ |
| AC-3 | override 병합 | `{debateOrder:"bear-first"}`만 줘도 나머지 기본 유지 | resolveAnalysisConfig 병합 | ✅ |
| AC-4 | 라우트 적용 | body.config.debateOrder → state.config → 프롬프트 | 라이브 bear-first run 200·정상 verdict | ✅ |

## A/B 진단 결과 (이 레버로 실측, 2026-06-28)
같은 6종목 bull-first vs bear-first(공통 5쌍, 042700 bear-first는 undici idle-timeout으로 실패):
- **4/5 verdict 완전 동일**, 유일 변화(카카오)도 약세 내 1칸(UNDER→REDUCE) — 방향 전환 아님.
- bull-first 유일 강세(한화에어로 OVERWEIGHT)가 **bear-first에서도 OVERWEIGHT 유지**.
- → **제시 순서는 verdict에 유의미한 영향 없음(order-robust)**. UNDERWEIGHT 쏠림은 순서 편향이 아니라 regime/콘텐츠. (평일 다른 국면 재실행으로 추가 확인 예정.)

## 회귀 / 정적 검증
- `npx tsc --noEmit` 0 · `npx eslint` 0 · `npx vitest run analysisConfig.test.ts` 14/14

## 결론
PASS — 순서 편향 진단 레버 추가(기본 무회귀). 실측 결과 순서 편향 없음 확인. 레버는 향후 종목/국면별 재점검용으로 보존.
