# PRD — 종목 메타/시세 공유 스토어 (stock-meta-store)

> Phase 2 데이터레이어 P0. 근거: [api-optimization-roadmap.md](../references/api-optimization-roadmap.md) §2·§4.
> 선작업: `pickStockName`(#73). 본 PR은 스택 `refactor/render-cleanup`(#74) 위에 쌓는다.

## 1. 배경 / 문제

목록(관심종목·검색 드롭다운)은 이미 `price·changePercent·direction·name`을 들고 있는데, 상세 `/stock/[ticker]` 진입 시 `StockHeader`가 **다른 캐시 키(`stock.price`)로 KIS를 새로 호출**한다(목록은 `watchlist.list` 키 — React Query 캐시 미스). "방금 본 값을 버리고 다시 호출 + 빈 화면→로딩"이 반복된다.

React Query 캐시는 *같은 키* 재요청만 dedup하므로 키가 다른 화면 간 값 공유에는 부적합하다. → **여러 화면이 참고하는 "마지막으로 본 시세"를 zustand 런타임 스토어**에 모아, 상세 진입 시 즉시 페인트(placeholderData) 후 백그라운드 재검증한다.

## 2. 목표 / 비목표

**목표(P0)**
- zustand 도입 + `useStockMetaStore`(런타임 공유 시세 레지스트리) 신설.
- watchlist/현재가 쿼리 성공 시 스토어에 upsert(쓰기 단일 지점).
- 상세 `StockHeader`가 스토어 last-known 으로 **즉시 페인트** → KIS 응답 도착 시 자연 교체. (네비게이션 콜드 페치 체감 제거.)
- **이름 해석 공유(일원화)** — 목록 화면(검색·관심)이 `pickStockName` 후보로 스토어 name 을 사용해, 상세에서 본 실종목명을 목록에서도 재사용. (StockHeader 는 `placeholderData`/응답으로 이미 스토어 값을 받으므로 무변경.)

**비목표(본 PR 제외 → P1 후속)**
- 의도 기반 prefetch / symbols 클라이언트화 / 접힌 카드 쿼리 지연.
- localStorage 3종(관심·최근검색·즐겨찾기) 이전(계정/DB 트랙).

## 3. 사용자 시나리오 / 기능 요구

- **S1.** `/watchlist`·홈 검색 드롭다운에서 종목 클릭 → `/stock/[ticker]` 진입 시, **가격·등락이 즉시 표시**(빈 로딩 깜빡임 없음)되고 곧 최신값으로 갱신된다.
- **S2.** 캐시·스토어에 값이 전혀 없는 직접 진입(URL 직접 입력)은 기존대로 로딩 → 표시(회귀 없음).
- **S3.** 스토어 값은 휘발성(새로고침 시 초기화). 사용자 소유 데이터(localStorage)와 분리.

## 4. 기술 설계

### 4.1 스토어 — `lib/store/stockMetaStore.ts`
```ts
type StockMetaQuote = {
  name?: string; price: number; change: number;
  changePercent: number; direction: "up" | "down" | "flat";
  asOf: number; // Date.now() — 디버그/후속 TTL용
};
// state: { quotes: Record<ticker, StockMetaQuote> }
// action: upsertQuotes(list: Array<{ticker} & StockMetaQuote-ish>): void  // 부분 병합
// selector hook: useStockQuote(ticker): StockMetaQuote | undefined
// vanilla: useStockMetaStore.getState() — React 밖(QueryCache 콜백·placeholderData)에서 read/write
```
- **persist 없음**(휘발성 런타임 캐시). zustand `persist` 미들웨어 미사용.

### 4.2 쓰기 — 전역 `QueryCache.onSuccess` (단일 지점)
React Query v5 는 `useQuery` 의 `onSuccess` 가 제거됨 → 도메인 훅마다 useEffect 다는 대신, `app/providers.tsx` 의 `QueryClient` 에 `queryCache: new QueryCache({ onSuccess })` 를 달아 **쿼리 키로 라우팅**:
```ts
onSuccess: (data, query) => {
  const [d0, d1] = query.queryKey as string[];
  if (d0 === "watchlist" && d1 === "list") upsert(data as WatchlistQuote[]);
  else if (d0 === "stock" && d1 === "price") upsert([data as StockPrice]);
}
```
- 장점: 쓰기 1곳, 도메인 훅 무변경. 단점: 쿼리 키 구조에 결합(주석으로 명시).

### 4.3 읽기 — 상세 즉시 페인트
`hooks/stock/useQueryStockPrice.ts` 에 `placeholderData` 추가:
```ts
placeholderData: () => {
  const q = useStockMetaStore.getState().quotes[ticker];
  return q ? { ticker, name: q.name ?? ticker, price: q.price, change: q.change,
              changePercent: q.changePercent, direction: q.direction } : undefined;
}
```
- `placeholderData`(initialData 아님): 항상 재검증 + `isPlaceholderData` 로 "잠정값" 구분 가능. staleTime 무시하고 KIS 재호출 보장.

## 5. 작업 범위

- 신규: `lib/store/stockMetaStore.ts` + 단위 테스트.
- 수정: `app/providers.tsx`(QueryCache onSuccess), `hooks/stock/useQueryStockPrice.ts`(placeholderData).
- 의존성: `zustand` 추가.
- 문서: roadmap P0 "착수/완료" 갱신.

## 6. 수용 기준 (AC)

- **AC-1** `useStockMetaStore` 신설, persist 없음, `upsertQuotes` 부분 병합(기존 필드 보존).
- **AC-2** `/watchlist` 또는 홈 검색 후 `/stock/[ticker]` 진입 시 `StockHeader` 가 즉시 가격/등락 표시(placeholder), 곧 실값 교체. (DevTools: 진입 직후 network 응답 전에 값 노출.)
- **AC-3** 값 없는 직접 진입은 기존 로딩 동작 유지(회귀 0).
- **AC-4** watchlist·stock.price 쿼리 성공 시 스토어에 반영(다른 쿼리는 무시).
- **AC-5** 새로고침 시 스토어 초기화(휘발성). localStorage 미사용.
- **AC-6** typecheck/lint/test/build 통과, behavior 회귀 0(상세/관심/검색 수동 확인).

## 7. 테스트 계획

- 단위: `upsertQuotes` 병합/부분 갱신, selector. QueryCache 라우팅(키별 분기) 단위 테스트.
- 수동: 관심→상세, 검색→상세 즉시 페인트 / 직접 진입 회귀 / 새로고침 초기화.

## 8. 영향 분석

- `app/providers.tsx` 는 모든 쿼리의 onSuccess 경유점이 됨 — 분기는 watchlist/stock.price 만, 그 외 early-return(성능 영향 무시 가능).
- `placeholderData` 추가는 `useQueryStockPrice` 소비처 전체(StockHeader 등)에 영향하나, 값 없으면 `undefined` 반환 → 기존과 동일. 회귀 위험 낮음.
- 신규 의존성 `zustand`(경량 ~1KB). 번들 영향 미미.
- Phase 3(구조 리팩토링)·P1(prefetch 등)과 독립.

## 9. OPEN QUESTION → RESOLVED

- **Q1. P0 범위** — [RESOLVED] **P0 + 이름 일원화**(사용자 확정). 시세 instant-paint + 스토어 인프라 + 목록 이름 해석 공유. prefetch·symbols 클라이언트화·접힌 카드 지연은 P1 후속.
- **Q2. 쓰기 메커니즘** — [RESOLVED] **전역 `QueryCache.onSuccess`**(1곳, 도메인 훅 무변경). 쿼리 키 결합은 주석 명시.
- **Q3. 즉시 페인트** — [RESOLVED] **`placeholderData`**(항상 재검증, `isPlaceholderData` 로 잠정값 구분).
- **Q4. persist** — [RESOLVED] **휘발성**(persist 없음). localStorage(사용자 데이터)와 분리.
- **Q5. 스토어 위치** — [RESOLVED] **`lib/store/stockMetaStore.ts`**.
