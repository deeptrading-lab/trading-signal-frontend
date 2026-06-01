# 페이지별 API 사용 맵 (Page → API Reference)

> 각 URL path가 렌더링 시 호출하는 API와 데이터 패칭 훅, 캐싱 TTL, 정적/동적 성격을 한눈에 정리한 레퍼런스.
> 최적화·리팩토링 방향은 [api-optimization-roadmap.md](./api-optimization-roadmap.md) 참조.
>
> 작성 기준: 2026-05-31 / 검증: `app/**`, `hooks/**`, `lib/query/queryConfig.ts` 코드 1:1 교차 확인.

---

## 0. 읽는 법 / 핵심 전제

- **TTL 표기** = `staleTime / gcTime`. staleTime 경과 후 **다음 mount/focus 때** stale로 전환되어 리패칭, gcTime은 observer 0이 된 뒤 캐시 GC까지의 시간. 단일 진실 원천은 [lib/query/queryConfig.ts](../../lib/query/queryConfig.ts).
- **전역 QueryClient 기본값** ([app/providers.tsx](../../app/providers.tsx)): `staleTime 30s`, `retry 1`, `refetchOnWindowFocus false`. 도메인 훅이 `queryConfig`로 개별 override.
- **폴링(주기 리패칭)은 레포 전체에 0건.** `refetchInterval`/`setInterval` 기반 자동 새로고침 없음. 리패칭 경로는 **① stale 상태에서 mount/remount ② 수동 새로고침 버튼** 두 가지뿐. (`setTimeout`은 검색/입력 디바운스·레이아웃 전환용으로만 존재.)
- 모든 도메인 훅은 `useQuery` 직접 import 금지(`docs/rules/frontend.md` §1) → 도메인 훅 경유, 모든 fetch는 BFF(`/api/**`) 경유.

---

## 1. 전역 레이어 — 모든 페이지 공통

`(main)` 라우트 그룹의 셸([app/(main)/layout.tsx](<../../app/(main)/layout.tsx>))은 모든 하위 페이지에서 항상 렌더된다: `Sidebar` + `Header` + `BottomNav`.

| 컴포넌트 | 훅 | 엔드포인트 | TTL | 폴링 | 분류 |
|---|---|---|---|---|---|
| `HeaderMarketTicker` ([파일](../../components/layout/HeaderMarketTicker.tsx)) | `useQueryMarketTicker` | `GET /api/market/ticker` (KOSPI·KOSDAQ·S&P500·NASDAQ·BTC) | 60s / 5m | 없음 | 동적(거시 보조) |
| `Sidebar` ([파일](../../components/layout/Sidebar.tsx)) | — (`readRecentSearches` localStorage) | 없음 | — | — | 로컬 영속 |
| `BottomNav` ([파일](../../components/layout/BottomNav.tsx)) | — (`readRecentSearches` localStorage) | 없음 | — | — | 로컬 영속 |

> **서버측 중복 제거:** `/api/market/ticker` 라우트는 국내 지수(0001/1001) + 해외 지수(SPX/COMP)를 `lib/api/kis/index-store.ts`(Upstash L2)로 공유한다. 따라서 같은 코드를 `/api/market/indices`가 또 요청해도 **KIS 실호출은 1회로 합쳐진다**(클라 BFF 호출은 라우트별 각 1회).

---

## 2. 페이지별 맵

### `/` — 시장 종합 (홈)
[app/(main)/page.tsx](<../../app/(main)/page.tsx>) → `MarketOverviewPage` ([파일](../../components/home/MarketOverviewPage.tsx), 서버 컴포넌트)

| 자식 컴포넌트 | 훅 | 엔드포인트 | TTL | 활성 조건(enabled) | 분류 |
|---|---|---|---|---|---|
| `StockSearchContainer` | `useQueryStockSearch` | **클라이언트 검색**(`searchSymbols`, 동적 import) — 네트워크 0 (#80) | 5m / 30m | `keyword.length > 0` | **정적(seed)** |
| `StockSearchContainer` | `useQueryWatchlist` ×2 (관심·최근검색 탭) | `GET /api/watchlist?tickers=` | 30s / 5m | 드롭다운 열림 & 키워드 없음 | 동적 |
| `IndicesCardContainer` | `useQueryIndices(DEFAULT_INDEX_CODES)` | `GET /api/market/indices?codes=0001,1001,SPX,COMP` | 30s / 5m | `codes.length > 0` | 동적 |
| `FearGreedContainer` | `useQueryIndices(DEFAULT_INDEX_CODES)` | (동일 쿼리) | 30s / 5m | 동일 | 동적 |
| `DisclosureFeedContainer` | `useQueryDisclosures` (관심 상위 3종 병렬) | `GET /api/disclosure/list?ticker=&count=3` ×3 | 5m / 30m | 티커별 | 준동적 |

> ⚠️ **`IndicesCardContainer`와 `FearGreedContainer`는 동일한 `useQueryIndices(DEFAULT_INDEX_CODES)` 쿼리키를 공유** → React Query가 1개 네트워크 호출로 dedup. (캐시 공유가 의도대로 동작하는 사례.)
> `DEFAULT_INDEX_CODES = ["0001","1001","SPX","COMP"]` ([lib/api/market/indices.ts:25](../../lib/api/market/indices.ts)). 헤더 티커(0001·1001·SPX·COMP·BTC)와 4종이 겹치나, 서로 다른 BFF 라우트라 클라 호출은 2회(KIS 실호출은 index-store가 합침).
> **`DisclosureFeedContainer`(7c7b4b8):** API 패턴은 동일(`useQueryDisclosures(tickers.slice(0,3), 3)` → `/api/disclosure/list` 3병렬). 표시만 **기업별 그룹핑**(관심종목 추가 순) + `isError` 분기 추가. 그룹 헤더명 = `getName(ticker) ?? corpName ?? ticker`.

**`/` 진입 시 BFF 호출:** `/api/market/ticker`(헤더) · `/api/market/indices`(지수+공포탐욕 1회) · `/api/disclosure/list`×3(공시 피드). 검색·관심 시세는 사용자 상호작용 시에만.

---

### `/stock/[ticker]` — 종목 상세 ⭐ 최다 호출 페이지
[app/(main)/stock/[ticker]/page.tsx](<../../app/(main)/stock/[ticker]/page.tsx>) → `StockProfilePage` → `StockPageLayout` ([파일](../../components/profile/StockPageLayout.tsx))

| 자식 컴포넌트 | 훅 | 엔드포인트 | TTL | 분류 |
|---|---|---|---|---|
| `StockHeader` ([파일](../../components/profile/StockHeader.tsx)) | `useQueryStockPrice` | `GET /api/stock/price?ticker=` | **10s / 5m** | **동적** |
| `CompanyOverview` ([파일](../../components/profile/CompanyOverview.tsx)) | `useQueryDisclosureCompany` | `GET /api/disclosure/company?ticker=` | **1d / 7d** | **정적** |
| `DisclosureList` ([파일](../../components/profile/DisclosureList.tsx)) | `useQueryDisclosureList` | `GET /api/disclosure/list?ticker=&count=5` | 5m / 30m | 준동적 |
| `StockDailyChart` ([파일](../../components/profile/StockDailyChart.tsx)) | `useQueryStockChart` | `GET /api/stock/chart?ticker=&period={D/W/M}&days={fetchDays}` | **1d / 7d** | 준정적 |
| `StockSearchContainer` | (홈과 동일 공유 컴포넌트) | — | — | — |

> **진입 시 4콜 + 헤더 티커**(price·company·list·chart + ticker)가 동시에 뜬다.
> **차트 days는 동적(#63):** 범위 드롭다운(D: 40/100/200/400 · W: 100/200/400 · M: 400/1200/3000, 기본 100=3개월). 실제 fetch = `min(선택 days + 워밍업, MAX_FETCH_DAYS=3000)` ([StockDailyChart.tsx:214](../../components/profile/StockDailyChart.tsx)), 라우트도 `MAX_DAYS=3000` 클램프 ([app/api/stock/chart/route.ts:28](../../app/api/stock/chart/route.ts)). 봉/범위 변경마다 `stock.chart(ticker,period,fetchDays)` **새 쿼리키 → 추가 호출**. D 큰 범위는 130일 청크로 다중 KIS 콜(서버측).
> **접기카드(#63)는 표시만 지연, 호출은 즉시:** 모바일에서 `CompanyOverview`·`DisclosureList`는 접기카드(기본 접힘)지만 `useQueryDisclosureCompany`/`useQueryDisclosureList`를 컴포넌트 **상단에서 무조건 호출** ([CompanyOverview.tsx:60](../../components/profile/CompanyOverview.tsx)) → 접혀 있어도 진입 즉시 호출(지연 로딩 아님 → roadmap 후보). 데스크탑 확대/축소 토글은 차트 컨트롤 상태를 부모 `StockPageLayout`이 소유 ([StockPageLayout.tsx:26-28](../../components/profile/StockPageLayout.tsx))해 리마운트돼도 동일 쿼리키 → 캐시 히트(재호출 없음).
> `StockHeader`의 종목명은 **3중 폴백**으로 해석: `useWatchlistTickers().getName()`(watchlist store) → `readRecentSearches()`(최근검색) → API 응답([StockHeader.tsx:42-48](../../components/profile/StockHeader.tsx)).

---

### `/watchlist` — 관심 종목
[app/(main)/watchlist/page.tsx](<../../app/(main)/watchlist/page.tsx>) → `WatchlistContainer` ([파일](../../components/watchlist/WatchlistPage.tsx))

| 데이터 | 훅 | 엔드포인트 | TTL | 비고 |
|---|---|---|---|---|
| 관심 티커 목록 | `useWatchlistTickers` ([파일](../../hooks/watchlist/useWatchlistTickers.ts)) | — (localStorage) | — | 최초 진입 시 대표주 3종 시드 |
| 시세 배치 | `useQueryWatchlist` | `GET /api/watchlist?tickers=A,B,C` (배치 1콜, 최대 30) | 30s / 5m | `placeholderData: keepPreviousData`(새로고침 시 스켈레톤 깜빡임 없음) |

> 수동 "새로고침" 버튼만 존재(`query.refetch()`), 폴링 없음. `WatchlistRow` 클릭 시 `/stock/[ticker]` 라우팅하며, 행이 이미 `price·changePercent·name`을 보유한다.

---

### `/profile` — 마이페이지
[app/(main)/profile/page.tsx](<../../app/(main)/profile/page.tsx>) → `ProfilePage`

- **전부 mock 데이터** (계좌·보유종목·연동거래소·설정). 실 API 호출 0 (헤더 티커만).
- 보유종목 실데이터 전환은 `profile.holdings`(10s/5m) TTL이 `queryConfig`에 예약되어 있으나 미연결.

---

### `/analyze` — AI 분석 워크벤치
[app/(main)/analyze/page.tsx](<../../app/(main)/analyze/page.tsx>) (클라이언트 페이지)

| 데이터 | 훅 | 엔드포인트 | TTL | 분류 |
|---|---|---|---|---|
| 화이트리스트 검색 | `useQueryWhitelistSearch` ([파일](../../hooks/query/useQueryWhitelistSearch.ts)) | `GET /api/whitelist/search?q=` | **inline 30s** | **정적(seed)** |
| 분석 실행 | `useMutationAnalyzeWorkbench` | `POST /api/workbench/analyze` (FastAPI) | — (mutation) | — |

> 사이드바 ↔ 폼의 ticker/history/favorite 동기화에 **커스텀 이벤트 버스** 사용 ([components/workbench/workbenchEvents.ts](../../components/workbench/workbenchEvents.ts)): `WORKBENCH_TICKER_CHANGE_EVENT` · `WORKBENCH_SELECT_HISTORY_EVENT` · `WORKBENCH_SELECT_FAVORITE_EVENT`. 즐겨찾기는 localStorage(`workbench:favorites`), history는 in-session(`WorkbenchSessionProvider`).

---

### `/login`
[app/login/page.tsx](../../app/login/page.tsx) → `POST /api/auth/login` (앱 비밀번호 게이트, PR#48).

### 리다이렉트
- `/stock` → `/` ([app/(main)/stock/page.tsx](<../../app/(main)/stock/page.tsx>))
- `/dashboard` → `/profile`, `/market` → `/`

### 기타 엔드포인트 / 비-데이터 라우트 (참고 — 맵 대상 외)
- **현재 페이지 미소비 BFF:** `GET /api/stock/daily`(`useQueryStockDaily` 훅은 존재하나 어떤 페이지도 렌더 안 함 — 상세 차트는 `chart` 사용) · `POST /api/auth/logout`(UI 미연결) · `GET /api/stock/search`(#80 이후 종목 검색은 **클라이언트 사이드**로 전환 — 라우트는 유지하나 UI 미호출, 향후 제거 후보).
- **메타/PWA 라우트(#54~#57):** `app/opengraph-image.tsx` · `app/icon.tsx` · `app/apple-icon.tsx` · `app/manifest.ts` — 소셜 공유·홈화면 설치용 정적 자산 라우트. 데이터 패칭 API 아님.
- **404:** `app/(main)/[...not_found]/page.tsx`.
- **인증 미들웨어(#58):** 공개 경로 정확 매칭으로 게이트 우회 표면 제거(`/login`·메타 라우트만 공개). 데이터 호출엔 영향 없음.

---

## 3. 정적/동적 분류 요약

| 데이터 | 분류 | staleTime | 갱신 트리거 | 출처 |
|---|---|---|---|---|
| 종목 검색(symbols.json) | **정적(seed)** | 5m | 키워드 입력 | in-repo `symbols.json` |
| whitelist 검색 | **정적(seed)** | inline 30s | 입력 | FastAPI |
| 기업개황 company | **정적** | 1d / 7d | 거의 없음 | OpenDART |
| 일봉/차트 daily·chart | **준정적** | 1d / 7d | 장 종료 후 | KIS |
| 공시 목록 list | 준동적 | 5m / 30m | 신규 공시 | OpenDART |
| 헤더 티커 ticker | 동적 | 60s / 5m | mount(stale) | KIS+CoinGecko |
| 지수 indices | 동적 | 30s / 5m | mount(stale) | KIS |
| 현재가 price | **동적** | 10s / 5m | mount(stale) | KIS |
| 관심종목 시세 watchlist | 동적 | 30s / 5m | mount(stale)/수동 | KIS 배치 |

---

## 4. 페이지 간 공유·중복 후보

| 항목 | 현황 | 비고 |
|---|---|---|
| `HeaderMarketTicker` | 전 페이지 1쿼리(60s) | 효율적 |
| `IndicesCardContainer` + `FearGreedContainer` | 동일 쿼리키 → **1콜 dedup** | React Query 캐시 공유 정상 동작 |
| `StockSearchContainer` | `/`, `/stock/[ticker]` 양쪽 | 쿼리키 동일 → 캐시 재사용 |
| **이름(ticker→name)** | `StockHeader`·`StockSearchContainer`·`WatchlistRow`가 **각자 3중 해석** | 공유 출처 부재 → roadmap P0 |
| **시세(price/등락)** | 목록(`watchlist.list` 키)에 이미 있으나 상세는 `stock.price` 키로 **재호출**(캐시 키 불일치) | roadmap P0 |
| 지수(domestic+overseas) | 헤더(ticker)·홈(indices)이 4종 중복 BFF 호출 | 서버 index-store가 KIS 실호출은 합침 |

→ 위 중복/낭비의 해결 방향은 [api-optimization-roadmap.md](./api-optimization-roadmap.md).

---

## 5. 검토한 PR 범위 (2026-05-30 ~ 06-01)

본 맵은 아래 PR 머지 후 상태를 반영한다. API 맵에 영향을 준 PR만 표기(메타/PWA·문서·UI 전용 PR은 데이터 호출 무관).

| PR/커밋 | 내용 | 맵 영향 |
|---|---|---|
| #51 `5304cbe` | 홈 국내지수 중복 호출 제거 + indices 라우트 청크/캐시 | `FearGreedContainer`가 `useQueryIndices` 공유(1콜 dedup)로 전환 |
| #52 `21dcf3b` | KIS 토큰 인스턴스 간 공유 store(Upstash) | 서버측 토큰/`index-store` L2 — 페이지 API 패턴 불변(배경) |
| #53 `80bc736` | 종목 분석 페이지 + 다중 기술지표 차트 | `/stock/[ticker]` 신설·`useQueryStockChart`·`recentSearch`·이름 3중 해석 도입(맵 본문 대부분) |
| `7c7b4b8` | 공시 피드 기업별 그룹핑 + isError + 헤더명 | `DisclosureFeedContainer` 표시 변경(API 패턴 동일) |
| #54~#57 | OG 메타·동적 og:image·PWA | 정적 자산 라우트만 추가, 데이터 API 아님(§2 기타 라우트) |
| #58 `f2bd5fa` | 미들웨어 공개 경로 정확 매칭 | 공개 경로 범위만 조정, 데이터 호출 무관 |
| #59 `29d4a68` | 지수 카드 셀 2줄 압축 | UI 전용 |
| #60·#61 | PWA navbar 글래스/불투명 safe-area | UI 전용 |
| #62·#64·#65·#67·#68 | PWA 브랜드 스플래시 로고 보정 | UI/PWA 전용(`components/pwa/SplashScreen` 등) |
| **#63 `0d110f7`** | 모바일 종목분석 UX — 차트 범위 드롭다운·접기카드·네비 | **차트 days 동적화(40~3000)·`stockChartConfig`·접기카드 신설 → §2 `/stock/[ticker]` 갱신** |
