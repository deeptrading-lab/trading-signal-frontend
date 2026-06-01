# API 호출 최적화 로드맵

> 페이지별 API 사용 현황([page-api-map.md](./page-api-map.md))을 토대로 한 **rate-limit 방지 · 페이지 간 데이터 공유 · 정적/동적 분리 · 리패칭 최적화** 로드맵.
> 본 문서는 **방향·우선순위 정리용**. 실제 코드 변경은 승인 후 별도 PR(단일 PR 룰)로 진행한다.
>
> 작성 기준: 2026-05-31.

---

## 1. 핵심 발견 (코드 전수 점검 결과)

1. **자동 폴링 0건.** `refetchInterval`/`setInterval` 기반 주기 리패칭이 어디에도 없다. "사용자가 새로고침 안 해도 몇 초/몇 분마다 호출"은 **현재 일어나지 않는다.** 리패칭은 ① stale 상태 mount/remount ② 수동 새로고침 버튼뿐. → 따라서 실질적 호출 증폭 벡터는 **타이머가 아니라 "페이지 이동/리마운트"** 다.
2. **목록 → 상세 진입 시 시세 재호출.** `WatchlistRow`·검색 드롭다운(`watchlist.list` 키)이 이미 `price·changePercent·name`을 들고 있으나, 상세의 `StockHeader`는 `stock.price` 키로 **새로 호출**한다(캐시 키가 달라 미스). 방금 본 값을 버리고 KIS를 또 친다.
3. **이름(ticker→name) 해석 3중 중복.** `StockHeader`·`StockSearchContainer`·`WatchlistRow`가 각자 `watchlist store → 최근검색 → API` 폴백을 구현. 공유 출처가 없다.
4. **정적 데이터가 BFF 왕복.** 종목 검색은 in-repo `symbols.json`(완전 정적)인데 매 키워드마다 `/api/stock/search` 라운드트립.
5. **최다 호출 페이지 = `/stock/[ticker]`.** 진입 시 price+company+list+chart 4콜 + 헤더 티커. (company·chart는 1d 캐시라 재방문 시 저렴, price·list는 짧음.)
6. **국내·해외 지수 이중 BFF 페치.** 헤더(`/api/market/ticker`)와 홈(`/api/market/indices`)이 0001·1001·SPX·COMP를 중복 요청. 단, 서버 `index-store`(L2)가 **KIS 실호출은 1회로 합치므로** rate-limit 위험은 낮다(클라 BFF 호출만 2회).
7. **접힌 카드도 진입 즉시 호출(#63).** 모바일 종목상세의 `CompanyOverview`·`DisclosureList`는 접기카드(기본 접힘)지만, 데이터 훅이 컴포넌트 상단에서 무조건 실행돼 **접혀 있어도 company/list를 즉시 호출**한다(지연 로딩 아님). 접힘은 표시만 숨긴다.
8. **차트 범위 확장 = 추가 호출(#63).** 차트 days가 범위 드롭다운으로 동적(40~3000)이 됐다. `stock.chart` 쿼리키에 `fetchDays`가 들어가므로 봉/범위를 바꿀 때마다 새 키로 KIS를 다시 친다(staleTime 1d라 동일 범위 재선택은 캐시 히트). 큰 범위(특히 D 400/W·M 대범위)는 서버에서 130일 청크로 다중 KIS 콜 → rate-limit 모니터링 대상.

> **결론:** rate-limit의 실위협은 "폭주하는 타이머"가 아니라 **네비게이션마다 반복되는 콜드 페치 + 이미 가진 값 미재사용**이다. 최적화의 1순위는 *주기 축소*가 아니라 *공유·시딩*이다.

---

## 2. 권장 아키텍처 — 3계층 분리 (React Query / zustand / localStorage)

> **확정 방향:** React Query는 *조회/패칭* 전용. **여러 곳에서 참고하는 런타임 값은 zustand 스토어**에 담아 action(dispatch)으로 read/write. localStorage 값은 *사용자 소유 영속 데이터*라 성격이 달라 스토어로 옮기지 않고 그대로 둔다.

```
┌─────────────────────────────────────────────────────────────┐
│ [패칭/서버상태]  React Query                                 │
│   조회·캐시·재검증. 단일 진실 = 서버 응답.                    │
│   훅: useQueryStockPrice / useQueryWatchlist / useQueryIndices │
└───────────────┬─────────────────────────────────────────────┘
                │ 응답 시 dispatch (action 으로 upsert)
                ▼
┌─────────────────────────────────────────────────────────────┐
│ [런타임 공유상태]  zustand store                             │
│   여러 페이지가 참고하는 파생/UI 값.                          │
│   예: 최근 본 시세(ticker→quote), active ticker.              │
└───────────────▲─────────────────────────────────────────────┘
                │ 즉시 페인트 소스 (placeholderData / initialData)
                │ (상세 진입 시 last-known 값으로 즉시 렌더 → 백그라운드 재검증)
┌─────────────────────────────────────────────────────────────┐
│ [영속/사용자소유]  localStorage 유틸                         │
│   관심종목·최근검색·즐겨찾기. DB/계정 생기면 서버 이전.       │
│   런타임 스토어와 혼동 금지 (zustand persist 미들웨어로 안 섞음).│
└─────────────────────────────────────────────────────────────┘
```

### 제안 스토어 (초안)

- **`useStockMetaStore`** — `Map<ticker, { name, price, changePercent, direction, asOf }>` 레지스트리.
  - **쓰기(action) `upsertQuotes()`**: `useQueryWatchlist`·`useQueryIndices`·`useQueryStockPrice` 응답 시 dispatch.
  - **읽기**: `StockHeader`가 진입 즉시 last-known 시세로 **즉시 페인트** → `useQueryStockPrice`의 `placeholderData`/`initialData` 소스로 연결, 백그라운드에서 재검증. 이름 3중 해석도 이 스토어 단일 경로로 일원화.
- **`useActiveTickerStore`** (선택) — `/analyze`의 커스텀 이벤트 버스(`WORKBENCH_*_EVENT`)를 store action으로 대체하는 후보(결합도↓).

### localStorage 경계 규칙 (중요)

관심종목([lib/api/watchlist/store.ts](../../lib/api/watchlist/store.ts))·최근검색([lib/utils/recentSearch.ts](../../lib/utils/recentSearch.ts))·즐겨찾기는 **zustand로 이관하지 않는다.**
- 이유: 계정/로그인 구분이 아직 없어 **브라우저에 임시 영속 중인 사용자 소유 데이터**이며, 추후 DB/계정 도입 시 서버로 이전될 대상.
- 런타임 공유 스토어(zustand=휘발성 공유)와 영속 계층(localStorage=사용자 데이터)을 **명확히 분리**한다. zustand `persist` 미들웨어로 둘을 섞지 않는다.

---

## 3. 정적/동적별 처리 정책

| 성격 | 데이터 | 정책 |
|---|---|---|
| 정적(seed) | 종목 검색(symbols.json) | **BFF 왕복 제거 후보** — 클라 번들 직검색(네트워크 0) 또는 `Cache-Control: public, max-age` 부여 (P1) |
| 정적(seed) | whitelist 검색 | inline 30s → `stock.search`와 동일 5m 상향 (P2) |
| 정적 | company(1d) | 현행 유지(적정) |
| 준정적 | chart·daily(1d) | 현행 유지(적정) |
| 동적 | price·indices·watchlist | TTL 적정·폴링 없음 유지. 핵심은 **store 시딩으로 네비게이션 재호출 제거** |

---

## 4. 우선순위 로드맵

| 우선 | 항목 | 문제 | 해결 | 기대효과 | 규모 |
|---|---|---|---|---|---|
| **P0** ✅완료(#76) | zustand 도입 + `useStockMetaStore` | 목록→상세 시세 재호출 · 이름 3중 해석 | 패칭 응답을 store에 upsert, 상세는 즉시 페인트 + 백그라운드 재검증 | KIS `inquire-price` 호출 절감, 체감 즉시 렌더, 이름 단일 경로 | 중 |
| **P1** | symbols 검색 클라이언트화 | 정적 seed가 매 검색 BFF 왕복 | 번들 직검색 또는 장기 캐시 헤더 | 검색 API 호출 0~최소화 | 소~중 |
| **P1** | 의도 기반 prefetch | 상세 진입 첫 페치 콜드 | 검색결과/관심행 hover·click 시 `queryClient.prefetchQuery`(price/company) | 상세 첫 렌더 지연↓ | 소 |
| **P1** | 접힌 카드 쿼리 지연(#63) | 모바일 접기카드가 접혀 있어도 company/list 즉시 호출 | 접힘 상태를 카드→자식에 전달해 훅 `enabled: open`(또는 펼침 전까지 마운트 보류) | 모바일 진입 4콜→2콜(price+chart), 나머지 온디맨드 | 소 |
| **P2** | whitelist staleTime 정합 | 정적인데 30s | 5m로 상향 | 미세 | 1줄 |
| **P2** | 차트 큰 범위 호출 관측(#63) | days 3000 등 대범위는 서버 다중 청크 | `X-Data-Source`·청크 수 로깅으로 rate-limit 여유 모니터링(수치 변경 전 관측) | 한도 근접 조기 감지 | 소 |
| **P2** | active ticker store화 | 커스텀 이벤트 버스 | `useActiveTickerStore`로 대체 | 결합도↓(호출량 무관) | 소 |
| **관망** | price staleTime(10s) | 네비 churn 시 재호출 | store 즉시페인트로 충분 → 수치 변경 보류, 운영 관측 후 결정 | — | — |

> 실행 순서 권장: **P0(공유 토대) → P1(정적 왕복 제거 + prefetch) → P2(미세 정합)**. P0가 들어가야 "목록↔상세" 왕복 낭비가 근본 해소된다.

---

## 5. 측정·검증 방법

- **폴링 부재 확인:** 한 페이지에 머문 채 DevTools Network에 주기 호출이 없음을 확인 + 코드상 `refetchInterval` grep 0건.
- **중복 호출 정량화:** `/` 또는 `/watchlist` → `/stock/[ticker]` 이동 시 Network에 `stock/price` 신규 콜이 뜨는지 확인(= P0 시딩 대상). P0 적용 후 동일 시나리오에서 콜이 사라지는지 비교.
- **서버 데이터 소스 분포:** 라우트 응답의 `X-Data-Source` 헤더(`kis`/`mock`/`mixed`/`seed`/`mock-quota-exceeded`)로 실호출 비중 관측.
- **회귀 측정:** 후속 PR 전/후 동일 시나리오의 BFF·KIS 호출 수 before/after 기록.

---

## 6. 비고 / Open

- ✅ **P0 완료(#76, 2026-06-01)** — `lib/store/stockMetaStore.ts`(zustand, 휘발성) + 전역 `QueryCache.onSuccess` 라우팅 + `useQueryStockPrice` `placeholderData` 즉시 페인트 + `pickStockName` 스토어 후보(이름 일원화). PRD: `docs/prd/stock-meta-store.md`. 다음은 P1.
- 계정/로그인 도입 시 localStorage 3종(관심종목·최근검색·즐겨찾기) 서버 이전 — 별도 트랙.
- 미연결 영역: `profile.holdings`(보유종목 실데이터, TTL 예약됨), `FearGreed`는 현재 지수 파생값으로 표시.
- **PR 재검토(2026-05-30~06-01, #51~#68 + `7c7b4b8`):** §1 발견 모두 유효. #51이 홈 지수 dedup(서버 index-store)을 이미 적용 → 로드맵 항목 아님. #53이 도입한 `recentSearch`/이름 3중 해석이 P0(zustand 일원화)의 직접 대상. **#63(모바일 종목 UX)**이 차트 days 동적화(40~3000)와 접기카드를 도입 → 발견 7·8 및 P1(접힌 카드 쿼리 지연)·P2(차트 큰 범위 관측) 신규 추가. #60~#68의 나머지는 PWA 스플래시/navbar UI 전용(데이터 무관). (상세 검토표는 [page-api-map.md §5](./page-api-map.md#5-검토한-pr-범위-2026-05-30--06-01).)
- **FE 퀵윈 트랙(별도, #71~#74, 2026-06-01):** 본 로드맵(데이터레이어 P0~P2)과 **다른 트랙**으로 FE 코드품질 퀵윈을 머지 — 스테일 테스트 복구(#71) · 관심모달 `next/dynamic` lazy(#72) · 파생 state 제거(#74). 특히 **종목 표시명 단일화 `lib/utils/resolveStockName.pickStockName`(#73)** 은 P0(zustand stock-meta 이름해석 일원화)의 **선작업** — Phase 2 에서 store 의 last-known name 을 candidate 로 추가하면 자연 확장된다. (**P0 는 #76 으로 완료**, P1/P2 미착수.)
