# QA 리포트 — Peek 미니 차트 hover 선반입 + recharts 청크 워밍

- 대상 PR: #253 (`feature/peek-chart-prefetch`)
- 성격: 경량 UX 성능 폴리시 (PRD 없음 — 수용 기준은 PR 본문 AC 로 대체)
- QA 일자: 2026-07-05 (주말 — KIS 장중 실데이터 제한, 일봉 히스토리 조회는 정상)
- 방법: 정적 코드 검증 + 자동화 게이트(tsc·eslint·vitest·build) + dev 서버 라우트 라운드트립
- 판정: **qa-passed** (실패 0건)

---

## 1. AC 별 재현·기대·실측

### AC1 — 무회귀(핵심): 상세 이동 전용 선반입 콜러는 차트 프리패치 미발생

| 항목 | 내용 |
|---|---|
| 재현 | `usePrefetchStockDetail` 콜러 전수 조사 (`grep -rn "usePrefetchStockDetail("`) 후 각 콜러의 인자 확인 |
| 기대 | detail-nav 전용 3콜러는 `warmDailyChart` 기본 false → 차트 프리패치 없음. Peek 지면만 `{ warmDailyChart: true }` |
| 실측 | **통과**. 아래 배선 확인 |

- `hooks/layout/useStockNavClick.ts:36` — `usePrefetchStockDetail()` (인자 없음 → false). 차트 프리패치 없음.
- `components/home/StockSearchContainer.tsx:53` — `usePrefetchStockDetail()` (컨테이너의 **클릭** 선반입, 인자 없음 → false).
- `components/flow/InvestorFlowTop10Card.tsx:85` — `usePrefetchStockDetail()` (인자 없음 → false).
- Peek 지면(차트 프리패치 ON): `hooks/stock/useStockPeek.ts:102` 에서 `usePrefetchStockDetail({ warmDailyChart: true })`. 이 훅을 소비하는 지면 = `RealtimeRankingSection.tsx:474`, `WatchlistRow.tsx:144`, `StockSearchContainer.tsx:252`(SearchResultRow).

구현부(`usePrefetchStockDetail.ts:84-91`): `if (warmDailyChart)` 가드 안에서만 `stock.chart` prefetchQuery 실행. 기본 false 경로는 `stock.price` + `disclosure.company` 만 데움(기존 무변경).

### AC2 — 키 정합: 팝오버 마운트 시 추가 네트워크 없이 캐시 히트

| 항목 | 내용 |
|---|---|
| 재현 | 프리패치 쿼리키·queryFn vs `useChartData`→`useQueryStockChart` 요청 비교 + dev 라우트로 실데이터 확인 |
| 기대 | 프리패치 키 == 팝오버 마운트 시 요청 키 → 중복 페치 0, 즉시 렌더 |
| 실측 | **통과** |

- 프리패치 (`usePrefetchStockDetail.ts:40,86-87`): `PEEK_CHART_FETCH_DAYS = warmupFetchDays("D", MINI_CHART_DEFAULT_DAYS)` = `warmupFetchDays("D", 90)` = **280**. 키 `queryKeys.stock.chart(ticker, "D", 280)`, queryFn `fetchStockChart(ticker, 280, "D")`.
- 팝오버 마운트 (`MiniStockChart.tsx:54`): `useChartData(ticker, "D", 90)` → `fetchDays = warmupFetchDays("D", 90)` = 280 → `useQueryStockChart(ticker, { period:"D", days:280 })` → 키 `queryKeys.stock.chart(ticker, "D", 280)`, queryFn `fetchStockChart(ticker, 280, "D")`.
- `warmupFetchDays` 를 `useChartData.ts:48` **단일 출처**로 양쪽이 공유 → WARMUP_DAYS(190) 복제 드리프트 원천 차단.
- `fetchStockChart(ticker, days, period)` 는 `params: { ticker, days, period }` 전송(`lib/api/stock/chart.ts:18`) → 양쪽 동일 요청.
- staleTime 도 양쪽 `queryConfig.stock.daily.staleTime` = **1 DAY**(`queryConfig.ts:35`) → 재hover·마운트는 fresh no-op(중복 페치 0).

라이브 라운트트립 (dev :3099):
```
GET /api/stock/chart?ticker=005930&period=D&days=280
→ HTTP 200, 일봉 캔들 배열 반환 (2025-09-29 ~ 최근, 정상 OHLCV)
```
프리패치가 요청하는 정확한 파라미터(D/280)로 라우트가 유효 데이터를 반환 → 캐시 히트 substrate 실재 확인.

### AC3 — 청크 워밍: 마우스 기기 유휴 1회, 터치 전용 skip

| 항목 | 내용 |
|---|---|
| 재현 | `schedulePeekChunkWarm()`(`useStockPeek.ts:62-70`) + `preloadPeekChunk()`(`peekDynamic.ts:26-28`) 코드 경로 분석 |
| 기대 | `pointer: fine` 에서만 유휴 시 1회 청크 워밍, `pointer: coarse`(터치)에서 미발생, 첫 hover 가 청크 다운로드 대기 안 함 |
| 실측 | **통과** |

- 게이트: `if (!window.matchMedia?.("(pointer: fine)").matches) return;` → 터치 전용(coarse)은 조기 반환, 워밍 없음(mobile-perf 무회귀).
- 세션 1회: 모듈 스코프 `peekChunkWarmScheduled` 가드 → Peek 행이 다수여도 preload 1회만 스케줄. StrictMode 더블 마운트에서도 두 번째 effect 는 가드로 no-op.
- 유휴 스케줄: `requestIdleCallback(..., {timeout:2000})`, 미지원 브라우저(Safari)는 `setTimeout(800)` 폴백.
- 동일 청크 보장: `preloadPeekChunk()` 의 `import("./StockPeekPopover")` 가 `peekDynamic.ts` 의 `dynamic(() => import("./StockPeekPopover"))` 와 **동일 import 지정자** → 워밍된 모듈을 실제 dynamic 마운트가 재사용 → 첫 hover 청크 대기 제거.
- 빌드 산출물에서 recharts 는 여전히 Peek 청크로 스플릿(셸 청크 무증가) — `GlobalStockPeek.tsx` 는 `peekDynamic` 의 `dynamic({ssr:false})` 만 참조.

### AC4 — Peek 기존 동작 무회귀

| 항목 | 내용 |
|---|---|
| 재현 | `git diff main...HEAD -- hooks/stock/useStockPeek.ts` 로 기존 로직 변경 여부 확인 |
| 기대 | hover 팝오버 표시/숨김, 롱프레스 시트, 유령 클릭 차단, 단일 활성 Peek 모두 그대로 |
| 실측 | **통과** — 순수 가산 변경 |

diff 결과 useStockPeek 변경은 (a) `preloadPeekChunk` import, (b) 모듈 가드 + `schedulePeekChunkWarm` 함수 추가, (c) `usePrefetchStockDetail({ warmDailyChart: true })` 로 인자 추가, (d) 워밍 스케줄 `useEffect` 추가뿐. 기존 `schedulePopover`·`hideOwnPopover`·롱프레스(`LONG_PRESS_MS`)·유령 클릭 차단(`suppressClick`/`onClickCapture`/`onTouchEnd preventDefault`)·touch 가드(`TOUCH_GUARD_MS`)·단일 활성 Peek(provider `showPopover`/`hidePopover`)·언마운트 정리 로직은 **바이트 무변경**. `GlobalStockPeek.tsx` 는 dynamic 정의를 `peekDynamic.ts` 로 추출한 것뿐(동일 청크·동일 렌더).

### AC5 — 빌드/타입/린트/테스트

| 명령 | 결과 |
|---|---|
| `npx tsc --noEmit` | **0 에러** (TSC_EXIT=0) |
| `npx eslint <변경 7파일>` | **0 에러/경고** (ESLINT_EXIT=0, 무출력) |
| `npx vitest run hooks/stock/__tests__/peekChartPrefetch.test.ts` | **2 passed** (280봉 키 정합 고정) |
| `npm run build` | **✓ Compiled successfully** (Turbopack, 71/71 정적 생성) |

빌드 경고 1건은 `./next.config.ts` NFT 트레이스 경고로 **본 PR 변경 파일과 무관한 기존 경고**(변경 파일은 전부 `hooks/stock`·`components/stock`).

---

## 2. 공통 AC 무회귀

| 점검 | 명령/근거 | 결과 |
|---|---|---|
| BFF 원칙 | `git grep -nE "http://127\.0\.0\.1" -- app/` | route handler fallback(`app/api/workbench/_adapters/fastapi.ts` FASTAPI_BASE_URL 기본값)만 → **위반 0** |
| 클라이언트 직접 fetch | 변경 6파일 `git grep "\bfetch("` | **0건** (axios `/api` 경유만) |
| 한글 톤 | `MiniStockChart.tsx:65` `"차트를 불러오지 못했어요"` | 사용자 노출 문구 한글 유지 |
| 토큰 정합(hex/px 직타) | `MiniStockChart.tsx` hex/px 스캔 | 색은 `useChartTheme` 경유, px 는 차트 레이아웃 prop(`height`)만 — **직타 색상 0** |

---

## 3. 에지 케이스

| 케이스 | 처리 | 판정 |
|---|---|---|
| SSR (window 없음) | `schedulePeekChunkWarm` 첫 줄 `typeof window === "undefined"` 조기 반환 | 안전 |
| `matchMedia` 미지원(구형) | `window.matchMedia?.("...")` 옵셔널 체이닝 — 전체 체인 단락 → undefined → `!undefined`=true → 워밍 skip(throw 없음) | 안전 |
| `requestIdleCallback` 미지원(Safari) | `setTimeout(800)` 폴백 | 안전 |
| StrictMode 더블 마운트 | 모듈 가드 `peekChunkWarmScheduled` → 2번째 effect no-op | 안전 |
| 다수 Peek 행 동시 마운트 | 동일 모듈 가드 → preload 1회만 | 안전 |
| BE(FastAPI) 다운 | Peek 차트는 FastAPI 미사용(KIS 라우트 `/api/stock/chart`). 본 QA 중 FastAPI health=000 이었으나 차트 라우트 200 정상 | 무영향 |
| 스쳐 지나가는 hover | 차트 프리패치도 120ms 의도 게이트(`INTENT_MS`) + `cancelIntent`(mouseleave) 로 취소 | rate-limit 정합 |
| 재hover / 재방문 | `prefetchQuery` staleTime 1 DAY fresh no-op → 무료 | rate-limit 정합 |

---

## 4. 라운드트립 (dev :3099, BE=KIS 라우트)

- FastAPI health: 000(다운) — 단, Peek 차트 경로는 KIS route handler 사용이라 무관.
- Next dev 서버(:3099) home 200 OK.
- `GET /api/stock/chart?ticker=005930&period=D&days=280` → 200, 정상 일봉 캔들(2025-09-29~최근). 프리패치가 데우는 정확한 키/파라미터로 유효 응답 확인 → 팝오버 마운트 캐시 히트 substrate 실재.
- hover 타이밍(120ms 의도 → 팝오버 마운트 캐시 히트, recharts 청크 유휴 워밍)은 브라우저 인터랙션 계측이 필요한 항목으로, 코드 경로 분석 + 키 정합 실증 + 청크 동일 지정자 확인으로 대체 검증(주말 KIS 장중 데이터 제약).

---

## 판정

전 AC 통과 · 공통 무회귀 통과 · 에지 케이스 안전. **qa-passed** (실패 0건).
