# QA — 단타 틱 스케줄러 프리즈 방지 + 멈춤 UI (`intraday-tick-freeze-guard`)

- 대상 PR: #292 (`feature/intraday-tick-freeze-guard`)
- 성격: 버그픽스 (PRD 없음)
- 검증 위치: 격리 worktree `/Applications/하영/code_source/tsf-wt-tick-freeze` (공유 메인 트리 미접촉)
- 판정: **qa-passed** (실패 0건)

## 변경 파일
| 파일 | 성격 |
|---|---|
| `lib/server/paperTrading/tickScheduler.ts` | per-tick `Promise.race` 타임아웃(`tickWithTimeout`) |
| `lib/utils/paperTradingStale.ts` | 신규 순수 판정 util `isPaperSessionStalled` |
| `lib/utils/__tests__/paperTradingStale.test.ts` | 신규 vitest 5건 |
| `components/intraday/IntradayWatchTable.tsx` | stalled 시 warn "멈춤" 배지 |
| `lib/copy/stock/intradayRead.ts` | `stalled`/`stalledHint` 카피 |

> 스케줄러/판정은 서버·순수 로직이라 **코드 경로 + 테스트**로 판정. UI 배지는 순수 util 파생 + 기존 폴링 재렌더 배선이라 코드 경로로 확인.

## AC 별 검증

| AC | 재현/근거 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 프리즈 방지 | `tickScheduler.ts` 코드 경로: 매 틱을 `tickWithTimeout`(`Promise.race([tick, timeout(TICK_TIMEOUT_MS)])`) 로 감싸고, catch 로그 후 진행, `runScheduledIntradayTicks` 의 `finally { cycleRunning = false }` | hang 틱이 사이클을 못 막음 → `cycleRunning` 항상 리셋 → 다음 사이클 진행 | `tickWithTimeout` 이 기본 120초(30s~10m, `INTRADAY_TICK_TIMEOUT_MS`)에 reject → `runWithLimit` 유한 종료 → finally 도달. hang 이 finally 를 막던 경로 제거 확인 | 통과 |
| AC2 멈춤 판정 | `isPaperSessionStalled`: running + `isKstMarketHoursWithCloseGrace` + `now - (lastTickWindowStart??startedAt) > interval*2 + 120s` | paused/completed=false, 장마감·주말=false, 임계 초과=true. vitest 5건 | 신규 suite 5/5 통과 (아래 명령 출력). 테스트 날짜 가정 검증: `2026-07-06`=Mon, 05:00Z=14:00 KST(장중), 12:00Z=21:00 KST(마감) — `node` 실측 일치 | 통과 |
| AC3 UI 배지 | `WatchRow`: `stalled = current ? isPaperSessionStalled(current) : false` → true 면 `<Badge variant="warn" title={P.stalledHint}>{P.stalled}</Badge>`, 아니면 기존 `STATUS_LABEL[status]` | stalled=warn "멈춤"(title=힌트), 정상 running="실행 중". refresh 폴링 재렌더로 갱신 | 코드 경로 일치. `badge-warn` = `app/components.css` 기존 토큰, `Badge` 가 `title` 을 HTMLAttributes rest 로 전달 | 통과 |
| AC4 무회귀 | 기존 scheduler suite / 신규 커스텀 Tailwind / BFF·직접호출 | scheduler 8건 통과, 커스텀 Tailwind 0, fetch/127 0 | scheduler 8/8 통과. 추가 className=`text-caption text-text-muted`(기존 토큰), 신규 커스텀 Tailwind 0. `git diff` 내 `fetch(`/`http://127` 0건 | 통과 |
| AC5 게이트 | `tsc`/`eslint`/`vitest`/`build` | tsc·eslint·vitest 0에러, build 가능 시 | tsc 0, eslint 0, vitest 13/13. build 는 worktree 심볼릭 node_modules 를 Turbopack 이 거부(인프라 제약) → tsc 를 타입 빌드 프록시로 대체 | 통과 |

## 게이트 명령 출력

```
$ npx vitest run lib/utils/__tests__/paperTradingStale.test.ts lib/server/paperTrading/__tests__/tickScheduler.test.ts
 ✓ lib/utils/__tests__/paperTradingStale.test.ts (5 tests) 13ms
 ✓ lib/server/paperTrading/__tests__/tickScheduler.test.ts (8 tests) 28ms
 Test Files  2 passed (2)
      Tests  13 passed (13)

$ npx tsc --noEmit         → TSC_EXIT=0
$ npx eslint <5 changed files> → ESLINT_EXIT=0
```

### build (참고 — 인프라 제약)
```
$ npm run build
Error [TurbopackInternalError]: Symlink [project]/node_modules is invalid, it points out of the filesystem root
```
worktree 의 `node_modules` 가 메인 트리로의 심볼릭 링크라 Turbopack 이 거부(코드 결함 아님, 알려진 worktree 제약). tsc `--noEmit` 0에러로 타입 레벨 빌드 무결성 확인.

## 에지 케이스 / 공통 무회귀
- **BFF 무회귀**: 변경 파일 diff 내 `fetch(`·`http://127`·`http://localhost` 직접 호출 0건.
- **커스텀 Tailwind 0**: UI 변경은 기존 토큰(`badge-warn`, `text-caption`, `text-text-muted`, `text-body-sm-strong`)만 사용.
- **한글 톤**: 신규 노출 문구 `멈춤`/`장중인데 자동 판단이 멈췄어요 — 모니터링을 재시작해 주세요.` — 한글, ticker/필드 노출 없음.
- **장마감/주말 예외**: `isPaperSessionStalled` 가 `isKstMarketHoursWithCloseGrace(now)===false` 면 즉시 false → 마감/주말 오탐 없음. vitest "장 마감 → 멈춤 아님" 케이스로 커버.
- **timer 누수**: `tickWithTimeout` 의 `finally { clearTimeout }` 로 race 승패 무관 타이머 정리.
- **잘못된 시각 문자열**: `Date.parse` 결과 `!Number.isFinite` 면 false 반환(멈춤 오탐 방지).

## 결론
5개 AC + 공통 무회귀 모두 통과. build 는 worktree 심볼릭 제약으로 미수행(tsc 프록시). 실패 0건 → `qa-passed`.
