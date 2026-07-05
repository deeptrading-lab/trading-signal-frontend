# QA — peek-visible-prefetch (PR #266)

- 대상 브랜치: `feature/peek-visible-prefetch` (격리 worktree `/Applications/하영/code_source/tsf-wt-peek-prefetch`)
- 대상 커밋: `345b659 perf(peek): 보이는 순위 상위 행 차트 배경 선반입 — 거의 항상 즉시`
- 성격: 경량 perf, PRD 없음(#253 후속). 변경 파일 2개 · +105/-0.
  - `hooks/stock/useVisibleChartPrefetch.ts` (신규, 순수 로직 훅)
  - `components/home/RealtimeRankingSection.tsx` (훅 배선 2곳)
- 판정: **qa-passed** (실패 0건)

## 검증 환경 한계 (명기)

이 QA 는 격리 worktree 에서 수행했다. worktree 의 `node_modules` 는 공유 메인 트리로의 **심볼릭 링크**라
`next build`/`next dev` (Turbopack) 이 문서화된 함정으로 거부한다(아래 AC7 build 항 로그).
또한 본 환경에 브라우저 자동화 도구(playwright/puppeteer/cypress)가 없다.
→ **라이브 브라우저 네트워크 탭 관찰**(스태거 발사 육안·hover 캐시히트 육안·touch 에뮬레이션)은
이 격리 worktree 에서 **실행 불가**. 대신 AC1~AC5 를 소스 로직 정밀 검증 + 게이트(tsc/eslint/vitest)로
검증했다. 핵심 리스크(쿼리키 정합 → 캐시 히트, 레이트리밋 가드)는 전부 정적 검증 가능하며 통과했다.
메인 트리(실 node_modules)는 병렬 세션 소유라 건드리지 않았다.

## AC 별 결과

| AC | 기대 | 재현·검증 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 배경 프리패치 스태거 | 리스트 표시 후 유휴에 상위 6개 `days=280` 차트 요청 400ms 간격 발사 | 소스: `run()` 이 `targets.forEach((t,i)=> setTimeout(..., i*STAGGER_MS))`, `STAGGER_MS=400`, `MAX_PREFETCH=6`, 트리거는 `requestIdleCallback(run,{timeout:3000})`(폴백 `setTimeout 1200ms`). `PEEK_CHART_FETCH_DAYS=warmupFetchDays("D",90)=280` | 상위 6건이 유휴 진입 후 0/400/800/1200/1600/2000ms 에 발사되도록 배선. 초기 렌더 버스트 뒤(rIC) 실행 | 통과 |
| AC2 hover 즉시(캐시히트) | 선반입된 행 hover 시 추가 네트워크 없이 즉시 | 프리패치 키/queryFn 가 peek 경로(`MiniStockChart→useChartData→useQueryStockChart`)와 동일 + `queryConfig.stock.daily.staleTime=1일`로 fresh → hover 시 refetch 없음 | 키/staleTime 정합 확인. 프리패치 완료 종목은 hover 시 캐시 fresh 히트(네트워크 0) | 통과(정적) |
| AC3 키 정합 | 배경 키 = peek 키 → 중복 페치 0 | 프리패치: `queryKeys.stock.chart(ticker,"D",280)` + `fetchStockChart(ticker,280,"D")`. peek: `useChartData("D",90)`→`warmupFetchDays("D",90)=280`→`useQueryStockChart{period:"D",days:280}`→`queryKeys.stock.chart(ticker,"D",280)` + `fetchStockChart(ticker,280,"D")`. **완전 동일**. 자동 검증: `peekChartPrefetch.test.ts`(#253 고정) | 아래 vitest 2/2 통과 | 통과 |
| AC4 레이트리밋 가드 | 상위 6만·세션 dedupe·touch 미발생 | 상위6: `tickers.slice(0,MAX_PREFETCH).join(",")`. dedupe: 모듈 `warmed:Set`, `targets=...filter(!warmed.has(t))`, 발사 시 `warmed.add`. touch: `if(!matchMedia("(pointer: fine)").matches) return` | 상위 6개만 스케줄, 이미 데운 티커 재요청 없음, `pointer:coarse`(터치)에서 조기 return | 통과 |
| AC5 조건·정리 | list 뷰만 실행·언마운트/탭전환 타이머 정리 | `enabled=view==="list"`(로딩·점검 뷰 false→early return). cleanup 이 `scheduled.forEach(clearTimeout)` + `cancelIdleCallback(idleHandle)`. `scheduled`는 `timers.current` 동일 배열 참조라 `run()`이 push 한 타이머까지 정리 | list 외 미실행, dep(`targetKey`/`enabled`) 변화·언마운트 시 대기 타이머·idle 핸들 정리(리크 없음) | 통과 |
| AC6 무회귀 | #253 hover·#260 도크·값컬럼·경고배지 무영향, 신규 Tailwind 0 | diff = 추가만(2파일 +105). 훅에 JSX/className 없음(`grep className` → none). 같은 캐시 키라 #253·#260 정합 | 기존 동작 불변, 신규 Tailwind 클래스 0 | 통과 |
| AC7 게이트 | tsc·eslint 통과, build 가능 방식 | 아래 로그 | tsc 0 · eslint 0 · vitest 2/2 · build=Turbopack 심볼릭 함정(환경) | 통과(build 은 환경 제약 명기) |

## 게이트 로그

```
$ npx tsc --noEmit
TSC_EXIT=0

$ npx eslint hooks/stock/useVisibleChartPrefetch.ts components/home/RealtimeRankingSection.tsx
ESLINT_EXIT=0

$ npx vitest run peekChartPrefetch
 ✓ hooks/stock/__tests__/peekChartPrefetch.test.ts (2 tests) 1ms
 Test Files  1 passed (1)
      Tests  2 passed (2)   # 키 정합: warmupFetchDays("D",90)=280, queryKeys.stock.chart=["stock","chart",...,"D",280]

$ npx next build
FATAL: TurbopackInternalError: Symlink [project]/node_modules is invalid, it points out of the filesystem root
# → 격리 worktree 의 심볼릭 node_modules 를 Turbopack 이 거부(문서화된 함정, 코드 결함 아님).
#   메인 트리(실 node_modules)는 병렬 세션 소유라 미실행. tsc/eslint/vitest 는 심볼릭 정상 통과.
#   빌드 게이트는 순수 additive 2-파일 TS 변경 + tsc 0 으로 대리 충족.
```

- BFF 무회귀: 신규 훅은 `fetchStockChart`(axios `/api` same-origin) 경유 — 클라 `fetch(`/`127.0.0.1` 직접 호출 0.
- 한글 톤: 사용자 노출 문구 신규 0(순수 로직 훅). 무회귀.

## 에지 케이스

- **프리패치 실패(BE/KIS 다운·ECONNREFUSED)**: `prefetchQuery` 가 에러 삼킴(배경 throw 0). 실패 종목은 캐시 미적재 → hover 시 정상 경로로 재요청(즉시성만 상실, 기능 무손상). `warmed.add`는 발사 시점에 찍혀 배경 재시도는 억제(레이트리밋 보수) — 의도된 거동.
- **effect 재실행 중복 발사**: dep 변화로 재실행 시 cleanup 이 미발사 타이머를 먼저 제거하고 `warmed`로 발사분 필터 → 동일 티커 중복 네트워크 0.
- **rIC 미지원 브라우저**: `window.setTimeout(run,1200)` 폴백 배선, cleanup 에서 `clearTimeout` 분기 처리.
- **SSR/StrictMode**: `typeof window==="undefined"` 가드 + 정상 cleanup 으로 더블 마운트 시 타이머 리크 없음.

## 미실행 항목(환경 제약)

- 라이브 dev 서버에서의 네트워크 탭 스태거 육안·hover 캐시히트 육안·DevTools touch 에뮬레이션 미발생 확인은
  격리 worktree Turbopack 심볼릭 제약 + 브라우저 도구 부재로 미실행. 해당 AC(1·2·4-touch)는 소스 로직 +
  #253 키정합 자동 테스트로 대체 검증. 메인 트리 배포/prod QA 시 육안 재확인 권장.
