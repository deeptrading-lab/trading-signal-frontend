# QA — 단타 틱 타임아웃 abort 배선 (hang 세션 자가 복구) (`intraday-tick-abort`)

- 대상 PR: #293 (`feature/intraday-tick-abort`, 커밋 `34067e6`)
- 성격: 버그픽스 (#292 후속, PRD 없음)
- 검증 위치: 격리 worktree `/Applications/하영/code_source/tsf-wt-tick-abort` (공유 메인 트리 미접촉)
- 판정: **qa-passed** (실패 0건)

## 변경 파일 (#293 커밋)
| 파일 | 성격 |
|---|---|
| `lib/server/paperTrading/runTick.ts` | `RunPaperTradingTickInput.abortSignal` 추가 + resolver args 전달 |
| `lib/server/paperTrading/sessionStore.ts` | `runPaperTradingSessionTick`/`runTickOnce` 옵션에 `abortSignal` 전달 |
| `lib/server/paperTrading/tickScheduler.ts` | `tickWithTimeout` 2단 방어(abort + 백스톱 race) |

> 스케줄러/틱은 서버·비순수(실 120s 타이머) 로직이라 **코드 경로 + 테스트**로 판정. `tickWithTimeout` 은 export 되지 않는 내부 함수라 단위 테스트 대상이 아니며 diff 코드 리뷰로 확인.

## AC 별 검증

| AC | 재현/근거 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 배선 정합 | 5계층 grep 추적: `tickScheduler` `controller.signal` → `runPaperTradingSessionTick(options.abortSignal)` → `runTickOnce(options.abortSignal)` → `runPaperTradingTick(input.abortSignal)` → `resolver({ ...args, abortSignal: input.abortSignal })` → `resolveIntradayTickDecision(args.abortSignal)` → `decideIntradayWithCli({ abortSignal })` → `invokeAgentCliStream(_, _, input.abortSignal)` | signal 이 스케줄러부터 CLI 까지 끊김 없이 흐름 | `runTick.ts:35,85` · `sessionStore.ts:227,249,265` · `intradayTickDecision.ts:45,204` · `intradayCli.ts:566,589` 로 연속 전달 확인. resolver/args 타입(`IntradayTickArgs.abortSignal?`) 이미 존재 | 통과 |
| AC2 abort 동작 | `tickWithTimeout` diff: `const controller = new AbortController()`; `abortTimer = setTimeout(() => controller.abort(), TICK_TIMEOUT_MS)`; backstop `setTimeout(reject, TICK_TIMEOUT_MS + ABORT_SETTLE_GRACE_MS)`; `Promise.race([tick({abortSignal:controller.signal}), backstop])`; `finally { clearTimeout(abortTimer); if(backstopTimer) clearTimeout(backstopTimer) }` | 상한(기본 120s)에 abort, 백스톱은 +15s, 양쪽 finally clear, 정상 틱은 타이머만 붙고 즉시 clear | 코드 경로 일치. `ABORT_SETTLE_GRACE_MS=15_000`. `abortTimer` 무조건 clear(try 전 항상 대입) · `backstopTimer` 가드 clear. CLI 측: `invokeAgentCliStream` 이 `signal.aborted` 선반영 + `abort` 이벤트에 `child.kill("SIGTERM")`(`agentCli.ts:188,234`) → 프로세스 실종료 | 통과 |
| AC3 무회귀 | `abortSignal?` 옵셔널. 미주입 시 `intradayCli` 는 `args.abortSignal ?? new AbortController().signal` 로 폴백(`intradayTickDecision.ts:204`). mock/existing-ai 경로는 resolver 미사용(intradayResolver 주입 세션만) | 미주입 = 기존 동작 동일, mock/existing-ai 무영향, #292 프리즈 방지·멈춤 배지 무회귀 | paperTrading vitest 46/46 통과(신규 회귀 0). #292 산출물(`paperTradingStale.ts`·멈춤 배지) diff 미변경 | 통과 |
| AC4 테스트 | `npx vitest run lib/server/paperTrading/__tests__/` | 46 통과(scheduler 8·runTick 10·runTickIntraday 3 등), 신규 회귀 0 | 6 파일 46/46 통과(아래 출력) | 통과 |
| AC5 게이트 | `tsc`·`eslint`·`vitest`·`build` | tsc·eslint·vitest 0에러, build 가능 시 | tsc 0 · eslint 0 · vitest 46/46. build 는 worktree 심볼릭 node_modules 를 Turbopack 이 거부(인프라 제약) → tsc `--noEmit` 로 타입 빌드 프록시 | 통과 |

## 게이트 명령 출력

```
$ npx vitest run lib/server/paperTrading/__tests__/
 ✓ lib/server/paperTrading/__tests__/aiCliGate.test.ts (3 tests)
 ✓ lib/server/paperTrading/__tests__/validateCreateSession.test.ts (8 tests)
 ✓ lib/server/paperTrading/__tests__/virtualExecution.test.ts (14 tests)
 ✓ lib/server/paperTrading/__tests__/runTickIntraday.test.ts (3 tests)
 ✓ lib/server/paperTrading/__tests__/runTick.test.ts (10 tests)
 ✓ lib/server/paperTrading/__tests__/tickScheduler.test.ts (8 tests)
 Test Files  6 passed (6)
      Tests  46 passed (46)

$ npx tsc --noEmit                                        → TSC_EXIT=0
$ npx eslint runTick.ts sessionStore.ts tickScheduler.ts → ESLINT_EXIT=0
```

### build (참고 — 인프라 제약)
```
$ npm run build
Error [TurbopackInternalError]: Symlink [project]/node_modules is invalid, it points out of the filesystem root
```
worktree 의 `node_modules` 가 메인 트리로의 심볼릭 링크라 Turbopack 이 거부(알려진 worktree 제약, 코드 결함 아님). tsc `--noEmit` 0에러로 타입 레벨 빌드 무결성 확인.

## 에지 케이스 / 공통 무회귀
- **abort 미존중 hang 대비**: CLI 가 취소를 존중하지 않아도 백스톱 `Promise.race`(+15s)가 사이클을 진행시켜 스케줄러 전체 정지를 막음(#292 동작 유지). 그 세션만 다음 재시작까지 degraded — 문서화된 수용 동작.
- **이미 aborted 상태 재사용**: `intradayCli` 는 LLM 호출 전 `!input.abortSignal.aborted` 로 warnings 조회 스킵(`intradayCli.ts:524`), 호출 시 `invokeAgentCliStream` 이 `signal.aborted` 선반영 reject(`agentCli.ts:188`) → 결정론 폴백(`deriveFromSignal`)으로 틱 settle.
- **timer 누수**: `finally` 에서 `abortTimer`(무조건)·`backstopTimer`(가드) 양쪽 clearTimeout — race 승패 무관 정리.
- **BFF 무회귀**: #293 diff 내 `fetch(`·`http://127`·`http://localhost` 직접 호출 0건.
- **한글 톤 / Tailwind**: #293 은 서버 로직만 변경 — 사용자 노출 문구·className 변경 0. 주석은 한글.
- **abortSignal 옵셔널 무회귀**: 미주입 호출부(테스트 스텁·기존 경로)는 signal 없이 기존과 동일 동작 — vitest 46 통과로 확인.

## 결론
5개 AC + 공통 무회귀 모두 통과. abortSignal 5계층 배선 정합·abort/백스톱 2단 방어·finally 정리 확인, paperTrading vitest 46/46 회귀 0. build 는 worktree 심볼릭 제약으로 미수행(tsc 프록시). 실패 0건 → `qa-passed`.
