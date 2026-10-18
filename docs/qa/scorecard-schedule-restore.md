# QA — scorecard-schedule-restore (멈춘 AI 판정 채점 예약 실행 복구)

- **slug**: `scorecard-schedule-restore`
- **PR**: #390 (`feature/scorecard-schedule-restore`)
- **QA 일자**: 2026-10-18
- **검증 커밋**: `401632f` (fix(scorecard): 멈춘 AI 판정 채점을 매 영업일 예약 실행으로 복구)
- **PRD**: 없음 (경량 버그픽스). 수용 기준은 작업 지시의 AC 1~6.
- **판정**: **qa-passed**, 실패 0건.

QA 범위 밖으로 둔 것: prod 엔드포인트 직접 호출, `workflow_dispatch` 실행. 라이브 근거는 PR 본문의 수동 dispatch 결과(run 39108957428, 39109149016, scoring errors=0, signal_scorecard 130행 pending 0)를 인용만 하고 재실행하지 않았다.

---

## 1. 자동화 검증 (실측)

| 커맨드 | 결과 | 비고 |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | exit 0 |
| `npx eslint app/api/cron/score-decisions/route.ts app/api/cron/score-decisions/__tests__/route.test.ts` | **PASS** | exit 0, 출력 0건 |
| `npx eslint . --ignore-pattern '.claude/**'` | **PASS** | 0 errors, 3 warnings(기존, 본 diff 밖) |
| `npx vitest run app/api/cron/score-decisions lib/server/scorecard/__tests__` | **PASS** | Test Files 10 passed, **Tests 154 passed** |
| `npx vitest run` (전체) | **PASS** | Test Files 170 passed / 3 skipped, Tests 1522 passed / 3 skipped |
| Vercel Preview (PR checks) | **PASS** | `Deployment has completed` |

- 무스코프 `npm run lint` 는 2007 errors 를 내지만 전부 `.claude/worktrees/decision-enum-fix`(로컬 병렬 워크트리, `.git/info/exclude` 로 미추적)에서 나온다. 저장소 추적 파일 기준 0 errors. 회귀 아님.
- BFF 원칙: `git grep -nE "http://127\.0\.0\.1" -- app/api/cron/score-decisions` 0건.
- 한글 톤·접근성: UI 변경 없음 (cron route + workflow 만 변경). 해당 없음.

### 1-1. 신규 회귀 테스트 (QA 가 PR 에 추가)

`app/api/cron/score-decisions/__tests__/route.test.ts`. 기존 route 테스트 위치 컨벤션(`app/api/**/__tests__/route.test.ts`)을 따랐다. `vi.mock` 으로 `isKisConfigured`/`resolveKisEnv`/`relativeRunScoring`/`runBackfillDecisions`/`runTouchScan`/`saveScorecardCronMeta` 를 목킹하고 route `GET` 을 직접 import 한다. 11 tests.

뮤테이션 확인: 같은 테스트를 `main` 의 route.ts 에 대고 돌렸다.

```
✓ 인증 미일치(undefined|Bearer wrong|test-secret) → 401   (3건)
✓ CRON_SECRET 미설정 → 401
✓ KIS configured=false env=prod → skip 200
✓ KIS configured=true env=mock → skip 200
× 채점 성공 → ok:true + backfill/result/touch
× 채점 실패 → scoring-error + 터치 스캔은 실행
× backfill 실패 → backfill=null, 채점·터치 계속
× 채점 성공/실패 경로에서 터치 스캔 예외 → touch=null, 200 유지   (2건)
Tests  5 failed | 6 passed (11)
```

인증·게이트 테스트 6건은 main 에서도 통과하므로 기존 동작이 그대로라는 뜻이다(AC-2). 터치 관련 5건은 main 에서 실패하고 PR 에서 통과하므로 이 PR 의 변경을 실제로 잡는다(AC-3·4). 확인 후 PR 버전 route.ts 로 되돌렸다(`git status` 상 route.ts 변경 없음).

---

## 2. AC별 판정표

| AC | 항목 | 재현/근거 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | workflow 문법·cron·패턴 | `js-yaml` 로 `.github/workflows/score-decisions.yml` 파싱. `diff` 로 flow-snapshot.yml 의 `run:` 블록과 비교 | 파싱 성공, `on.schedule[0].cron = "10 8 * * 1-5"` + `workflow_dispatch`. curl/secret 패턴 동일 | 파싱 결과 `{"schedule":[{"cron":"10 8 * * 1-5"}],"workflow_dispatch":{}}`, `runs-on: ubuntu-latest`. `run:` 블록 차이는 URL 경로(`flow-snapshot` → `score-decisions`) 1줄뿐: `curl -fsS -X GET -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"` 동일. 08:10 UTC = 17:10 KST(평일 월~금) | **PASS** |
| AC-2 | 401 / skip 200 무회귀 | 테스트: 헤더 없음, `Bearer wrong`, `Bearer ` 접두 누락, `CRON_SECRET` 미설정 → 401. `isKisConfigured=false` 또는 `env=mock` → 200 | 401 `{error:"unauthorized"}`. skip 은 200 `{ok:false, reason:"kis-not-prod", env}`. 채점·터치 미호출 | 전부 일치. 같은 6건이 main route 에서도 통과(위 뮤테이션 로그) | **PASS** |
| AC-3 | 두 경로 터치 스캔 + 예외 격리 | 테스트: 채점 성공 / `relativeRunScoring` reject 각각에서 `runTouchScan` 호출 횟수 확인. `runTouchScan` reject 를 성공·실패 두 경로에 주입 | 두 경로 모두 `runTouchScan` 1회. 터치 예외 시 `touch:null`, status 200, `ok` 는 채점 결과대로 | 일치. 예외는 `[score-decisions] 터치 스캔 실패 — 채점 결과는 유지` warn 로그로만 남는다 | **PASS** |
| AC-4 | 응답 shape | `toEqual` 로 본문 전체 비교 | 성공 `{ok:true, backfill, result, touch}`, 실패 `{ok:false, reason:"scoring-error", touch}` | 일치. backfill reject 시 `backfill:null` 로 채점·터치 계속 | **PASS** |
| AC-5 | tsc / eslint / vitest | §1 표 | 0 에러, scorecard 테스트 통과 | tsc exit 0, eslint 0건, 154 tests passed(scorecard 9파일 + 신규 1파일) | **PASS** |
| AC-6 | flow-snapshot.yml 무변경 | `git diff main --quiet -- .github/workflows/flow-snapshot.yml` | exit 0, `workflow_dispatch` 만 | exit 0. `on: workflow_dispatch: {}` 그대로 | **PASS** |

---

## 3. 에지 케이스

| 케이스 | 근거 | 결과 |
|---|---|---|
| backfill 예외 | 테스트 "backfill 실패" | `backfill:null`, 채점·터치 계속, 200 |
| 채점·터치 동시 예외 | 테스트 "채점 실패 경로에서 터치 스캔 예외" | `{ok:false, reason:"scoring-error", touch:null}`, 200 |
| `CRON_SECRET` 미설정인데 `Bearer undefined` 전송 | 테스트 | 401 (`!secret` 가드가 먼저 막음) |
| 인증 실패 시 Actions job | `curl -f` 가 401 에서 비정상 종료 | job 실패로 드러남 (flow-snapshot 과 같은 방식) |
| `saveScorecardCronMeta` 순서 | 코드 확인 | 성공·실패 두 경로 모두 마커를 먼저 저장한 뒤 터치 스캔을 돈다. 터치 예외가 헬스 마커를 지우지 않음 |
| flow-snapshot 과 채점 범위 | `app/api/cron/flow-snapshot/route.ts` 확인 | 양쪽 모두 backfill → relativeRunScoring → runTouchScan. 수동 flow-snapshot 과 예약 score-decisions 가 같은 날 겹쳐도 pending 행 기준이라 중복 채점 없음(기존 멱등 설계) |

---

## 4. 참고 사항 (머지 차단 아님)

1. **schedule 은 머지 후부터 동작한다.** GitHub Actions schedule 은 기본 브랜치에 있는 workflow 만 실행한다. 현재 저장소에 등록된 workflow 목록(`gh api .../actions/workflows`)에 `score-decisions` 가 아직 없다. 머지 후 다음 평일 08:10 UTC 실행 1회를 Actions 탭에서 확인할 것.
2. **`ok:false` 도 job 은 초록.** route 가 fail-soft 로 200 을 돌려주기 때문에 `scoring-error`·`kis-not-prod` 일 때도 job 은 성공으로 끝나고, 결과는 `echo "response: $resp"` 로그에만 남는다. flow-snapshot 과 같은 동작이다. 채점이 다시 조용히 멈추지 않게 하려면 `jq -e '.ok'` 검사를 추가하면 된다. 별도 과제로 판단.
3. GitHub cron 은 부하에 따라 수 분~수십 분 늦게 돌 수 있다. 17:10 KST 는 장 마감(15:30) 뒤라 늦어져도 종가 확정에는 문제가 없다.
4. PR 본문 `## 다음 작업` 섹션 있음 확인 (handoff-append 게이트 충족).
