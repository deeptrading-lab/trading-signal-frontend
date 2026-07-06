# QA 리포트 — 구성종목 스파크라인 배치 레이트리밋 보강 (PR #282)

- 브랜치: `feature/sparkline-ratelimit` (격리 worktree `tsf-wt-spark-rl`)
- 커밋: `7b13aa5 perf(market): 구성종목 스파크라인 배치 레이트리밋 보강`
- 변경 파일: `lib/api/kis/sectorSparklines.ts` 단일(서버 로직)
- 성격: 경량 perf/견고성, PRD 없음. 라이브 EGW00201 재현은 어려워 **소스 코드 경로 검증 + 게이트 실행**으로 판정.
- 판정: **qa-passed** (실패 0건)

---

## AC 별 검증표

| AC | 재현 절차 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|
| AC1 반환 계약 무변경 | `git show 7b13aa5` diff 로 변환 블록 대조 | `loadSparklines(tickers)` 가 티커→종가 시리즈(오래된→최신 정렬, 최근 30점, finite 필터, 2점 미만 생략) 맵 반환. 모달 렌더 무회귀 | 변환 블록(`sort localeCompare` → `map close` → `filter isFinite` → `slice(-SPARK_POINTS)` → `>=2` 조건) 이 이전과 **바이트 동일**. 변경은 페치/에러 처리부(`Promise.allSettled` → `Promise.all(fetchWithTransientRetry([]))`)에만 한정. 반환 타입 `Record<string, number[]>` 유지 | 통과 |
| AC2 레이트리밋 방어 | 소스 상수·루프 산식 검증 | 동시성 5(과거 8)·배치 간 120ms 지연(마지막 배치 제외)·각 콜 `fetchWithTransientRetry([], 250ms)`. 30콜이 초당 한도(~20/s) 여유 | `SPARK_CONCURRENCY=5`·`BATCH_GAP_MS=120`·`RETRY_BACKOFF_MS=250` 확인. 지연 가드 `if (i + SPARK_CONCURRENCY < uniq.length) await delay(BATCH_GAP_MS)` = 마지막 배치 뒤 생략 정확. 30티커→6배치×5동시성, 배치 간 120ms(총 5×120=600ms) → 피크 5콜/배치, 배치 간격 확보로 초당 한도 여유 | 통과 |
| AC3 fail-soft | `fetchWithTransientRetry` + `fetchStockDaily` 던짐 경로 추적 | 실패 티커는 `[]` → 생략(throw 0). 부분 성공 유지 | `fetchStockDaily` 는 `makeKisTransportError`/`makeKisBusinessError` 만 던짐(BFF_TIMEOUT_SENTINEL 미던짐) → `fetchWithTransientRetry` 가 transient(EGW00201/network)는 250ms backoff 후 1회 재시도, 그 외/재시도 실패는 `[]` 폴백. `loadSparklines` 내부 throw 경로 0. 부분 성공은 `candles.length===0 return`(생략)으로 유지 | 통과 |
| AC4 게이트 | worktree 에서 tsc·eslint·build·test 실행 | 0 에러 | `tsc --noEmit` exit 0 / `eslint .` exit 0 / 유닛 테스트: 스파크라인 대상 테스트 없음(none) / build: 아래 참조 | 통과 |
| AC5 무회귀·BFF | 변경 파일 범위·BFF 위반 grep | 클라/모달/타입 무변경. 서버 전용, 브라우저 직접호출 0 | 변경 파일 `sectorSparklines.ts` 1개뿐(route/client/modal/types 미접촉). 변경 파일·route 에 `http://127.0.0.1` / `fetch(` 0건. route 는 서버 handler(BFF), `loadSparklines` 는 서버 전용 | 통과 |

### 게이트 실행 로그 (AC4)

```
$ npx tsc --noEmit
EXIT_TSC=0            # 에러 없음

$ npx eslint lib/api/kis/sectorSparklines.ts app/api/market/sparklines/route.ts
EXIT_LINT=0

$ npx eslint .
LINT_CLEAN exit=0     # 전체 클린
```

**build**: worktree 의 `node_modules` 가 공유 메인 트리로의 **심볼릭 링크**라 기본 `next build`(Turbopack)는 거부(`Symlink [project]/node_modules is invalid, it points out of the filesystem root` — 알려진 worktree landmine). 서버 로직 변경이라 build 확인이 의미 있어 **webpack 경로로 우회**해 검증:

```
$ npx next build --webpack
✓ Compiled successfully in 5.4s
✓ Generating static pages using 9 workers (72/72)
├ ƒ /api/market/sparklines        # 라우트 정상 컴파일
EXIT=0
```

- Turbopack 거부는 **worktree 심볼릭 환경 제약**(코드 결함 아님). tsc(권위 타입 게이트) + webpack build 로 서버 로직 컴파일 무결성 확인 완료.

---

## 에지 케이스

| 케이스 | 분석 | 결과 |
|---|---|---|
| BE(KIS) 다운 / ECONNREFUSED | `fetchStockDaily` network 에러 → `isTransientError` true → 250ms 후 1회 재시도 → 여전히 실패 시 `[]` 폴백 | 생략(throw 0) |
| EGW00201(초당 한도) | `detail.msg_cd==="EGW00201"` 또는 메시지 "초당 거래건수" 매칭 → transient → 1회 재시도 | 재시도 후 성공하면 채움, 실패면 생략 |
| BFF 타임아웃 | route 레벨 `withTimeout(loadSparklines, 10s)` 가 전체 배치 타임아웃 처리 → catch 에서 빈 맵. `fetchStockDaily` 는 sentinel 미던짐이라 내부 폴백과 충돌 없음 | 빈 맵 graceful |
| 빈 티커 / 잡음 | route `parseTickers` 정규식·상한 40. `loadSparklines` `new Set` 중복 제거 | 방어됨 |
| NaN/비유한 종가 | `.filter((n) => Number.isFinite(n))` 로 제거, 남은 점 2 미만이면 생략 | 방어됨 |
| 빈 캔들(상폐 등) | `candles.length===0 return` | 생략(부분 성공 유지) |
| 마지막 배치 후 불필요 지연 | `if (i + SPARK_CONCURRENCY < uniq.length)` 가드로 마지막 배치 뒤 delay 생략 | 정확(불필요 대기 없음) |

---

## 라운드트립(BE LIVE) 비고

- 본 PR 은 UI/반응형 변경이 아닌 **서버 페치 로직**(레이트리밋 방어)만 손댐. 실 EGW00201(초당 한도)은 홈 위젯 다중 겹침 + prod KIS 실호출 조건에서 간헐 발생이라 로컬 결정론 재현 불가.
- route 이중 게이트(`isKisConfigured() && resolveKisEnv()==="prod"`) 미충족 로컬에서는 `getMockSparklines` 폴백이라 `loadSparklines` 실호출 경로가 타지 않음 → 배치/재시도 로직은 **코드 경로 정적 검증**으로 판정(위 표).
- 라이브 관찰(구성종목 모달 스파크라인 드롭 없음)은 PR 본문 `## 다음 작업`(prod 배포 후 관찰)로 이관됨 — QA 게이트 범위 밖.

---

## DESIGN.md 토큰 동기화

- 해당 없음(스타일링/토큰 변경 0, 서버 로직 단일 파일).

---

## 종합

- AC1~AC5 전부 통과, 실패 0건. 에지 케이스 방어 확인.
- Turbopack build 는 worktree 심볼릭 node_modules 제약으로 거부(환경 이슈) → webpack build 로 대체 검증 통과.
- 판정: **qa-passed**.
