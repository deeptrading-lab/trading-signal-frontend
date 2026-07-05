# QA — peek-dock-loading (PR #273)

- 대상 브랜치: `feature/peek-dock-loading` (격리 worktree `/Applications/하영/code_source/tsf-wt-dock-loading`)
- 대상 커밋: `93789c7 fix(peek): 도크 차트 로딩 스피너 + 프리패치 커버리지·타이밍 강화`
- 성격: 경량 fix, PRD 없음(#266·#271 후속). 변경 파일 4개 · +53/-15.
  - `hooks/stock/useVisibleChartPrefetch.ts` (프리패치 커버리지·타이밍 상수)
  - `hooks/stock/useStockPeek.ts` (초광폭 도크 청크 워밍 게이트)
  - `components/stock/PeekChart.tsx` (로딩 스켈레톤 → 중앙 스피너)
  - `components/stock/peekDynamic.ts` (`preloadPeekDockChunk` 신설)
- 판정: **qa-passed** (실패 0건)

## 검증 환경

이 QA 는 격리 worktree 에서 수행했다. 게이트(tsc/eslint/build)는 실측했고, 라운드트립은 **BE(FastAPI) 대신 KIS 프록시 경로**를 실측했다(도크/팝오버 차트 데이터 소스는 `/api/stock/chart` KIS 프록시라 로컬 FastAPI 불필요).

- worktree `node_modules` 는 공유 메인 트리 심볼릭 링크(Turbopack build 거부) → 직전 PR 실증 방식대로 `rm node_modules && npm ci` 후 `npm run build` 실행, 완료 후 심볼릭 복원. `git add -A` 미사용(명시 경로만 커밋).
- 브라우저 자동화 도구(playwright 등) 없음 → **육안 상호작용**(스피너 시각·devtools 네트워크 스태거 육안·≥1920px 도크 hover)은 이 격리 환경에서 실행 불가. 대신 소스 로직 정밀 검증 + 실 데이터 라운드트립(캐시 히트 핵심 리스크 = 키 정합)으로 커버.
- 로컬 dev 는 앱 게이트가 Google OAuth 로 활성(`/api/*` 401) → 데이터 경로 실측을 위해 worktree 의 gitignore `.env.local`(공유 트리 복사본)에서 OAuth 3키만 일시 주석 처리해 게이트 비활성화 후 probe, 검증 종료 후 `.env.local` 제거(코드 무변경).

## AC 별 결과

| AC | 기대 | 재현·검증 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 스피너 | 도크 미캐시 로딩 중 중앙 `Loader2 animate-spin`, `aria-busy`+sr-only, 완료 시 4패널 교체 | `PeekChart.tsx` `isLoading` 분기가 Skeleton→`<div aria-busy="true"><Loader2 className="h-5 w-5 animate-spin" aria-hidden><span className="sr-only">차트를 불러오는 중</span></div>`. 로드 완료(`!isLoading && candleSeries.length>0`)면 기존 4패널 렌더 | 스피너 컴포넌트·접근성 속성·완료 교체 배선 확인. PeekChart 는 도크 전용(팝오버/시트는 MiniStockChart 주입)이라 스피너는 도크에만 노출 | 통과 |
| AC2 프리패치 커버리지 | `MAX_PREFETCH=14` 로 랭킹 렌더 행(TOP_N=14) 전부 배경 선반입, `days=280` 스태거 | `MAX_PREFETCH=14`, `targetKey=tickers.slice(0,14).join(",")`. 랭킹 TOP_N=14(`rankingEnrich.ts` "top-N(≤14)" 확인). 프리패치 `PEEK_CHART_FETCH_DAYS=warmupFetchDays("D",90)=90+190=280`, `queryKeys.stock.chart(ticker,"D",280)`. peek `useChartData("D",90)`→동일 280 키 → **캐시 히트** | 14행 커버·키 정합·days=280 확인. 하위 행(7~14)도 이제 스케줄 대상 | 통과 |
| AC3 타이밍 | idle timeout 1200으로 3초 지연 없이 ~1.2s 내 시작 | `IDLE_TIMEOUT_MS=1200`→`ric(run,{timeout:1200})`, 미지원 폴백 `IDLE_FALLBACK_MS=800`→`setTimeout(run,800)`. `STAGGER_MS=300` | rIC 상한 1200ms·폴백 800ms 로 조기 hover 전 데움. 14×300ms=4.2s 총 스태거(마지막 행) | 통과 |
| AC4 도크 청크 워밍 | ≥1920px에서 `preloadPeekDockChunk`가 도크 청크 유휴 워밍, <1920은 팝오버만 | `useStockPeek.schedulePeekChunkWarm`: `pointer:fine` 아니면 return, `wide=matchMedia("(min-width:1920px)").matches`, `warm=()=>{preloadPeekChunk(); if(wide) preloadPeekDockChunk();}`, rIC/폴백 스케줄. `preloadPeekDockChunk`=`import("./StockPeekDock")`(도크 청크, PeekChart 4패널 포함) | ≥1920만 도크 청크 워밍, 좁은 화면은 `preloadPeekChunk`(팝오버=StockPeekPopover) 만 | 통과 |
| AC5 레이트리밋 무회귀 | 14×300ms=3.3/s 스태거·세션 dedupe·pointer:fine·키 정합 | 발사 `setTimeout(..., i*STAGGER_MS)` i∈[0,14)=최대 4200ms 창, 순간 초당 ~3.3건. dedupe `warmed:Set`+`filter(!warmed.has)`+`warmed.add`. `if(!matchMedia("(pointer:fine)")) return`. 키(D,280) 불변 | 초당 3.3건 스태거·세션 dedupe·터치 skip·키 정합 유지(캐시 히트) | 통과 |
| AC6 무회귀 | 팝오버/시트/모바일·<1920 무변경, 신규 Tailwind 0 | PeekChart 는 도크 전용(`StockPeekContent` 는 팝오버/시트에 MiniStockChart 주입, 도크만 PeekChart). 팝오버/시트/터치 경로 diff 없음. 신규 클래스 `flex items-center justify-center text-text-muted h-5 w-5 animate-spin sr-only`=전부 기존 유틸(신규 Tailwind 토큰 0) | 팝오버/시트/모바일 불변, 신규 Tailwind 0 | 통과 |
| AC7 게이트 | tsc·eslint 통과, build 실측 | 아래 로그 | tsc 0 · eslint 0 · `npm run lint` 0 · build EXIT 0(Compiled 6.2s) | 통과 |

## 게이트 로그

```
$ npx tsc --noEmit
TSC_EXIT=0

$ npx eslint hooks/stock/useVisibleChartPrefetch.ts hooks/stock/useStockPeek.ts components/stock/PeekChart.tsx components/stock/peekDynamic.ts
ESLINT_EXIT=0

$ npm run lint   # eslint .
(에러 0)

$ rm node_modules && npm ci          # 심볼릭 → 실 설치(Turbopack build 위해)
CI_EXIT=0
$ npm run build
✓ Compiled successfully in 6.2s
BUILD_EXIT=0
```

## 라운드트립 (KIS 프록시 데이터 경로, gate 일시 비활성 로컬)

프리패치·peek 가 공유하는 정확한 키(`/api/stock/chart?ticker=…&days=280&period=D`)를 실측.

```
GET /api/stock/chart?ticker=005930&days=280&period=D
  → HTTP 200 | 0.65s | candles 184 | first 2025-09-29 last 2026-07-03
GET /api/stock/chart?ticker=000660&days=280&period=D  → HTTP 200 | 0.08s
GET /api/stock/chart?ticker=005930&days=280&period=D (반복) → HTTP 200 | 0.07s
```

- 클라이언트 `fetchStockChart` 는 `params:{ticker,days,period}` 로 `/stock/chart` 호출 → 위 shape 정확 일치. days=280 계정: `warmupFetchDays("D",90)=min(90+190,3000)=280`.
- 280 calendar days → 184 trading-day candle 반환(정상). 프리패치가 이 응답을 TanStack Query `chart(ticker,"D",280)` 캐시에 fresh(1일 staleTime)로 적재 → 이후 hover(도크 PeekChart / 팝오버 MiniStockChart) 는 refetch 없는 캐시 히트.
- gate 활성 상태 probe 시 `/api/stock/chart` 401 `{"error":"unauthorized"}` (proxy.ts OAuth 게이트) — 인증 게이트 정상 동작이며 본 PR 무관.

## 공통 AC

- BFF 무회귀: `git grep http://127.0.0.1` (app/components/hooks/lib 라우트핸들러 제외) → **0건**. 변경 4파일 직접 `fetch(` → 0건(`prefetch` 함수명 substring 매치 1건뿐, 실 fetch 아님).
- 한글 톤: 신규 사용자 노출 문구 = sr-only "차트를 불러오는 중"(한글). 신규 영문 노출 0.
- 접근성: 스피너 `aria-busy="true"` + sr-only 대체 텍스트 + 장식 아이콘 `aria-hidden` — 스크린리더 로딩 인지 보강(무회귀 아닌 개선).

## 정리

- 검증용 `.env.local` 복사본 제거·OAuth 원복(코드 무변경). dev 서버 종료. worktree `node_modules` 심볼릭 복원. `git status` 클린(리포트 파일만 스테이징).

## 최종 판정

**qa-passed** — AC1~AC7 + 공통 AC 전부 통과, 실패 0건.
