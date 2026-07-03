# QA — intraday-warning-gate (단타 결정론 게이트: 정리매매·투자위험 진입 차단)

- 실행: 2026-07-03 13:10~13:15 KST — QA 역할
- 환경: 로컬 유닛 테스트(vitest) — 순수 게이트 함수 검증(CLI 불요)
- 대상: `feature/intraday-warning-gate`

## AC 별 결과 (전부 유닛)

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 | `applyPostGate(buyLlm, ctx{warnings:[정리매매]}, false)` | HOLD + 사유 "시장경보" | HOLD, adjustments 포함 | ✅ |
| AC-2 | 〃 투자위험 | HOLD | HOLD | ✅ |
| AC-3 | `deriveFromSignal(ctx{warnings:[정리매매]}, false)` (BUY 신호) | HOLD(폴백도 차단) | HOLD | ✅ |
| AC-4 | 단기과열·투자경고·VI + BUY (양 경로) | BUY 유지(차단 안 함) | 3종 모두 BUY 유지, 폴백도 BUY | ✅ |
| AC-5 | 무경보/키없음 + BUY | 무변경 | 기존 게이트만(회귀 테스트 유지) | ✅ |
| AC-6 | 경보 활성 + SELL | 영향 없음 | SELL 유지 | ✅ |
| copy | `isEntryBlockingWarning` | 정리매매·투자위험만 true | critical 2종 true, 나머지 false | ✅ |

## 회귀

- 프로젝트 스위트(`lib/ app/`, 워크트리 제외): **709 passed / 0 failed** (신규 8: 게이트 6 + copy 2).
- `tsc --noEmit` 클린, `next build` 성공, eslint 클린. paperTrading provider 스위트 무회귀.

## 환경 노트 (조사 결과 — 본 변경과 무관)

- `npx vitest run`(무스코프)이 `.claude/worktrees/intraday-paused-remove/node_modules/**` 의 3rd-party
  라이브러리 테스트(zod·tsconfig-paths·style-to-js) 12파일을 함께 글로빙해 실패로 집계됨. 원인은
  vitest.config `exclude` 가 `node_modules/**`(최상위만) 이라 **중첩 워크트리 node_modules 미제외**.
  병렬 세션(`feature/intraday-paused-remove`)의 워크트리라 **건드리지 않음**(공유 워크트리 reset 사고
  방지). 본 PR 코드와 무관 — 스코프 실행 시 전부 통과. (후속: exclude 를 `**/node_modules/**` 로.)

## 커버리지 노트

- 실제 단타 세션 자동틱 실행(로컬 CLI)은 유닛으로 갈음 — 두 게이트가 순수 함수라 CLI 없이 완결 검증.
  라이브 확인 경로: 정리매매/투자위험 지정 종목으로 세션 시작 시 판단 근거에 "거래소 시장경보 … 관망".
