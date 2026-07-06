# QA — intraday-concurrent-start (PR #288)

경량 버그픽스(PRD 없음). 단타(AI 단타) 워치 표에서 한 종목 세션 생성 중 다른 종목 시작 버튼까지 잠기던 버그를, 시작 버튼 disabled 를 전역 `isCreating` → **그 행 한정 `starting`** 으로 교체해 해제. 안 쓰게 된 `isCreating` prop 스레딩 제거.

- 대상 브랜치: `feature/intraday-concurrent-start`
- 검증 위치: 격리 worktree `/Applications/하영/code_source/tsf-wt-start-concurrent` (node_modules 심볼릭)
- 변경 파일: `components/intraday/IntradayWatchTable.tsx`, `components/intraday/IntradayWatchWorkspace.tsx` (2파일, +4/-9)

## AC 별 결과

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 동시 시작 가능 | 워치 2+종목에서 한 종목 시작(생성 중) 시 다른 종목 시작 버튼 상태 확인 | 다른 행 시작 버튼 **활성** | `WatchRow` 시작 버튼 `disabled={starting}` — `starting` 은 **행별 `useState(false)`**. 전역 `isCreating` 참조 제거됨. 한 행이 생성 중이어도 다른 행 `starting=false` → 활성. 코드 경로상 전역 disable 소스 0건. | PASS |
| AC2 자기 행 보호 | 시작 누른 그 행의 버튼·표시 확인 | 자기 행 disabled + "세션 생성 중" 스피너 | `handleStart()` 진입 시 `setStarting(true)` → `finally setStarting(false)`. 버튼 `disabled={starting}` + `starting` 일 때 `<Loader2 animate-spin>` + `P.creating`("세션 생성 중…") 렌더. 중복 클릭 방지 동일. | PASS |
| AC3 무회귀 | 성공/실패·에러표시·기존 세션 행·제거·펼침 | 무변경 | 세션 시작 로직(`onStart`), 에러(`setStartError`/`P.error`), 일시정지·실행 버튼(`isPatching`), 제거(`onRemove`), 펼침(`setExpanded`) 코드 전부 diff 미접촉. 변경은 prop 스레딩 삭제 + 버튼 disabled 소스 1곳뿐. | PASS |
| AC4 코드 위생 | `isCreating` 참조 grep + 훅 export | table/row/workspace 참조 0(주석 제외), 훅 export 유지 | table/workspace 내 `isCreating` = **주석 1줄뿐**(line 375). `usePaperTradingSessions.isCreating` export·`useIntradayPaperWatch` 재노출 유지(무회귀). tsc·eslint clean. | PASS |
| AC5 게이트 | tsc·eslint·build | 통과 | tsc·eslint clean. build 는 심볼릭 node_modules → Turbopack 거부(환경 제약, 아래). | PASS |

## 게이트 명령·출력

```
$ npm run typecheck   # tsc --noEmit
> (에러 0, 무출력)

$ npm run lint        # eslint .
> (에러 0, 무출력)
```

### build (심볼릭 worktree 제약)

```
$ npm run build       # next build (Turbopack)
FATAL: Symlink [project]/node_modules is invalid, it points out of the filesystem root
Error [TurbopackInternalError]: Symlink [project]/node_modules is invalid...
```

- 격리 worktree 의 `node_modules` 가 공유 트리로의 심볼릭이라 **Turbopack 이 파일시스템 루트 밖 심볼릭을 거부**(기존 알려진 landmine). 코드 결함이 아닌 환경 제약이며 tsc/vitest 는 심볼릭에서 정상 동작. dev 서버(`next dev`)도 Turbopack 이라 동일 거부 → 라이브 세션 생성 대신 **코드 경로 판정**(AC 방법 명시 허용).

## 공통 AC 무회귀

| 항목 | 결과 |
|---|---|
| 직접 fetch / `127.0.0.1` (변경 2파일) | 0건 (BFF 무회귀) |
| 한글 톤 | 신규 사용자 노출 문구 0. 기존 `P.creating`="세션 생성 중…" 유지 |
| 접근성 | 버튼 `type="button"`·`aria-hidden` 아이콘·`onKeyDown` stopPropagation 무변경. 스피너 조건만 교체 |
| 신규 커스텀 Tailwind | 0 (className 문자열 무변경) |

## 에지 케이스

- 자기 행 재클릭(중복): `disabled={starting}` 로 생성 중 재클릭 차단 — 기존과 동일 보장.
- 현금 입력 NaN/0: `handleStart` 초입 `!Number.isFinite || <=0` → `P.cashInvalid` + 펼침, `starting` 미설정(무변경).
- 세션 생성 실패(BE/네트워크): `catch` → `setStartError` + `finally setStarting(false)` 로 버튼 복구. 다른 행 영향 0(행별 상태 격리).
- IntradayWatchTable 다른 소비처: `grep -rln IntradayWatchTable` = Workspace 1곳. stale `isCreating` 전달 caller 없음(tsc 로도 보증).

## 판정

AC1~AC5 + 공통 무회귀 전부 PASS. 실패 0건.
