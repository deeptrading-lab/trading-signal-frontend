# QA — watchlist-chart-prefetch (PR #267)

- 대상 브랜치: `feature/watchlist-chart-prefetch` (격리 worktree `/Applications/하영/code_source/tsf-wt-wl-prefetch`)
- 대상 커밋: `3897cc6 perf(peek): 관심종목 상위 행 차트 배경 선반입 — #266 랭킹→관심 확장`
- 성격: 경량 perf, PRD 없음. #266(`useVisibleChartPrefetch`)의 **관심종목 확장**.
- 변경 파일: `components/watchlist/WatchlistContainer.tsx` 단일 (+5/-0 = import 1 + 훅호출 1). **신규 로직 0**.
- 판정: **qa-passed** (실패 0건)

## 검증 환경 한계 (명기)

격리 worktree 에서 수행. worktree 의 `node_modules` 는 공유 메인 트리로의 **심볼릭 링크**라
`next dev`/`next build` (Turbopack) 이 문서화된 함정으로 거부한다(아래 AC5 로그 실측). 또한 본 환경에
브라우저 자동화 도구(playwright/puppeteer)가 없고, BE(`127.0.0.1:8000`)는 다운(주말)이다.
→ **라이브 네트워크 탭 관찰**(스태거 발사 육안·hover 캐시히트 육안·touch 에뮬레이션)은 이 worktree 에서
**실행 불가**. 대신 AC1~AC5 를 소스 로직 정밀 검증 + 게이트(tsc/eslint)로 검증했다. 핵심 리스크
(쿼리키 정합 → 캐시 히트, 레이트리밋 가드)는 전부 정적 검증 가능하며 통과. 결정적으로 **프리패치 훅
자체는 #266 에서 이미 머지·검증 완료**(신규 코드 0)이고, 본 PR 은 동일 훅을 관심종목 컨테이너에
`useVisibleChartPrefetch(tickers, !isEmpty)` 1줄로 배선한 확장이다. 메인 트리(실 node_modules)는 병렬
세션 소유라 건드리지 않았다.

## AC 별 결과

| AC | 기대 | 재현·검증 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 배경 프리패치 | /watchlist 열면 마우스 기기에서 유휴에 상위 6개 관심종목 `/api/stock/chart?...&days=280` 스태거 발사, hover 시 캐시 히트 즉시 | 배선: `useVisibleChartPrefetch(tickers, !isEmpty)`. 훅 내부(#266 검증분): `targets.forEach((t,i)=>setTimeout(...,i*STAGGER_MS))`, `STAGGER_MS=400`, `MAX_PREFETCH=6`, 트리거 `requestIdleCallback(run,{timeout:3000})`(폴백 `setTimeout 1200`), `PEEK_CHART_FETCH_DAYS=warmupFetchDays("D",90)=280` | 상위 6개가 유휴 진입 뒤 0/400/…/2000ms 발사되도록 배선. hover peek 경로와 동일 키라 캐시 fresh 히트 | 통과(정적) |
| AC2 dedupe 공유 | 홈 랭킹에서 이미 데운 종목이 관심에도 있으면 재요청 안 함 | 모듈 스코프 `warmed:Set` 을 랭킹·관심이 **같은 훅 모듈**로 공유. 발사 시 `warmed.add`, 스케줄 전 `filter(!warmed.has(t))`. 두 화면 모두 동일 `queryKeys.stock.chart(ticker,"D",280)` → prefetchQuery 도 fresh 캐시면 no-op | 랭킹서 데운 종목은 관심에서 재스케줄·재요청 0 | 통과 |
| AC3 가드 | 빈 목록(isEmpty) 미실행, 터치 기기 미실행 | 배선 `enabled=!isEmpty`(0건이면 early return). 훅 내부 `if(!matchMedia("(pointer: fine)").matches) return`(터치 조기 return). `isEmpty=tickers.length===0` | 빈 관심목록·터치 기기에서 프리패치 미발생 | 통과 |
| AC4 무회귀 | 시세·경고배지·디그레이드 행·검색 무영향, 신규 Tailwind 0 | diff = 추가만(import 1 + 훅호출 1). JSX/className 변경 0(`git diff | grep className` → none). 훅은 배경 prefetch 만 — `useQueryWatchlist`·`useQueryStockWarningsBatch`·`WatchlistSearch`·디그레이드 행 로직 전부 불변 | 기존 관심종목 동작 100% 유지, 신규 Tailwind 0 | 통과 |
| AC5 게이트 | tsc·eslint 통과, build 가능 방식 | 아래 로그 | tsc 0 · eslint 0 · build=Turbopack 심볼릭 함정(환경 제약, 코드 결함 아님) | 통과 |

## 게이트 로그

```
$ npx tsc --noEmit
TSC_EXIT=0

$ npx eslint components/watchlist/WatchlistContainer.tsx hooks/stock/useVisibleChartPrefetch.ts
ESLINT_EXIT=0

$ npm run dev   (PORT=3199, Turbopack)
▲ Next.js 16.2.6 (Turbopack)  ✓ Ready in 249ms
FATAL: TurbopackInternalError: Symlink [project]/node_modules is invalid, it points out of the filesystem root
# → 격리 worktree 의 심볼릭 node_modules 를 Turbopack 이 거부(문서화된 함정, [reference_tailwind...] 아닌
#   [project_user-login-auth] worktree 심볼릭 함정과 동일). 코드 결함 아님. tsc/eslint 는 심볼릭 정상 통과.
#   빌드 게이트는 순수 additive 1-파일·+5 라인 TS 변경 + tsc 0 + 훅 본체 #266 검증분으로 대리 충족.
```

- BFF 무회귀: 신규 훅 배선은 `fetchStockChart`(axios `/api` same-origin) 경유 — 클라 `fetch(`/`127.0.0.1` 직접 호출 0 (`git grep` 확인).
- 한글 톤: 사용자 노출 문구 신규 0(순수 배선). 무회귀.
- 쿼리키 정합(캐시 히트 근거): 프리패치 키 `queryKeys.stock.chart(t,"D",280)` = 관심 peek 경로 `WatchlistRow→useStockPeek→MiniStockChart(t,"D",90)→useChartData→warmupFetchDays("D",90)=280→queryKeys.stock.chart(t,"D",280)`. **완전 동일** → hover 시 캐시 히트.

## 에지 케이스

- **프리패치 실패(BE/KIS 다운·ECONNREFUSED)**: `prefetchQuery` 가 에러 삼킴(배경 throw 0). 실패 종목은 캐시 미적재 → hover 시 정상 경로 재요청(즉시성만 상실, 기능 무손상). 관심종목 시세/경고 쿼리와 독립이라 표 렌더 무영향. 실측: BE 다운 상태에서도 tsc/정적 경로 무결.
- **빈 관심목록**: `!isEmpty=false` → 훅 early return, 유휴 스케줄·타이머 0.
- **디그레이드 행(부분 시세 실패)**: 프리패치는 `tickers` 원본(담은 전체) 상위 6을 대상 → 시세 실패 행도 차트는 데움. 단 디그레이드 행은 peek 미부착(WatchlistRow `!quote` 분기)이라 캐시가 소비되지 않을 뿐 낭비도 무해(레이트리밋 상위 6 보수).
- **탭 이동·재마운트**: `warmed` Set 세션 유지로 재스케줄 0. cleanup 이 미발사 타이머·idle 핸들 정리(리크 0).
- **SSR/StrictMode 더블 마운트**: `typeof window==="undefined"` 가드 + cleanup 으로 타이머 리크 없음.

## 미실행 항목(환경 제약)

- 라이브 dev 서버 네트워크 탭에서의 스태거 발사 육안·hover 캐시히트 육안·DevTools touch 에뮬레이션은
  worktree Turbopack 심볼릭 제약 + BE 다운(주말) + 브라우저 도구 부재로 미실행. 해당 AC(1·2·3-touch)는
  소스 로직 + #266 검증분(동일 훅) + 쿼리키 정합으로 대체 검증. 메인 트리 배포/prod QA(평일 장중)에서
  육안 재확인 권장.
