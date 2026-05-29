# PRD — Watchlist 화면 KIS 실데이터 전환 (`watchlist-real-data`)

> **slug**: `watchlist-real-data`
> **작성**: PM 에이전트 · 2026-05-30
> **UI 포함 여부**: **yes** — `/watchlist` 화면을 mock(server component) → KIS 실데이터(client container + 훅)로 전환한다. 관심종목 리스트가 사용자가 담은 ticker 의 실시세+종목명으로 렌더되고, **종목 추가/삭제 인터랙션(검색 모달 + 행별 삭제)** 이 신설되므로 화면·상태 변경이 발생한다. 단 **시안 정합 레이아웃·v8 토큰 체계는 유지**(`card` 셸 / 12-col grid / `badge-signal-up`·`badge-asset-stock` 등 그대로). 신규 Tailwind 토큰 도입 0.
> **UX/UI 디자이너 합류**: **미합류 확정**(§9 q6=RESOLVED, 2026-05-30). 검색 모달·경고 배지는 모두 기존 v8 합성 토큰(`card`/`input`/`button-primary`/`badge-*`)으로 충당하며 신규 토큰 0. 따라서 본 트랙의 다음 단계는 디자이너 없이 **구현(backend+frontend)** 으로 직행한다.
> **단일 PR 룰**: 적용(분할 금지). 한 도메인(`watchlist`) 한 PR. (직전 `finsight-redesign` 9분할 / `stock-api-integration` 3분할은 종료, 본 PRD 부터 단일 PR 룰 복귀 — MEMORY.)

---

## 0. 한눈에

`/watchlist` 화면의 **관심종목 리스트** 를 하드코딩 mock 6건(주식 3 + 코인 3)에서 KIS 실데이터로 전환한다. 사용자가 담은 ticker 배열에 대해 **시세(`inquire-price`, 구현됨) + 종목명/메타(`search-stock-info`, 신규)** 를 합쳐 렌더한다. 이 프로젝트는 **조회·분석 전용 + 실전(prod) 키** 정책이며 주문은 미구현(`stock-order-integration` 별도 PRD 책임). **표시 모델은 국내주식 전용**(코인·해외주식 제거 — §9 q4).

핵심 결정(2026-05-30 사용자 결정으로 §9 OPEN QUESTION 6개 전부 RESOLVED):

1. **관심종목 ticker 영구화 = localStorage** — 클라이언트 localStorage 로 시작하되 **추후 engine 쪽 API 를 통한 DB 저장으로 마이그레이션 예정.** `useWatchlistTickers` 훅을 **저장소 중립적 시그니처**로 설계해 내부 구현만 localStorage→engine API DB 로 교체 가능하게 한다(추상화 경계 명시). 본 트랙은 localStorage 까지, 백엔드/engine 연동은 별도 후속 트랙(§9 q1, §3.5, §8.2).
2. **종목당 2 API 합성** — `inquire-price`(시세, 짧은 TTL) + `search-stock-info`(종목명/메타, 별도 긴 TTL). `Promise.allSettled` 부분 성공, soft cap 30종목(초과 truncate + 헤더 경고). `intstock_multprice` 일괄조회는 본 트랙 비채택·후속 최적화(§9 q2, §8.4).
3. **`search-stock-info` 실전 전용(모의 미지원)** — `KIS_ENV !== "prod"` 또는 키 미설정 시 종목명 fallback = **symbols.json 시드 name → 없으면 ticker**. 시세 `extractStockName`(`hts_kor_isnm` prod 빈 값) 의존 금지(§9 q3).
4. **국내주식만 실데이터** — 코인(BTC/ETH/SOL)·해외주식(엔비디아/테슬라)은 KIS 국내주식 엔드포인트로 조달 불가(`market-real-data` 선례 동일 논리). mock 표시 모델을 **국내 대표주**로 교체, 코인·해외는 별도 트랙(§9 q4, §4).
5. **초기 상태 = 대표주 3종 시드 + 행별 삭제 간편** — 최초 진입(localStorage 비어있음) 시 국내 대표주 3종(삼성전자·SK하이닉스·NAVER)을 기본 시드로 담고, 각 행의 삭제(관심목록 제거)를 쉽게 제공. 삭제로 0개가 되면 빈 상태 CTA 노출(§9 q5, §3.5·§3.9).
6. **디자이너 미합류** — 검색 모달·경고 배지는 기존 v8 토큰으로 충당, 신규 토큰 0. 다음 단계는 구현(backend+frontend) 직행(§9 q6).

---

## 1. 배경 / 문제

### 1.1 사용자 의도 (verbatim)

> Watchlist(관심종목) 화면을 mock 에서 KIS 실데이터로 전환한다. 조회·분석 전용 + 실전(prod) 키 정책.

### 1.2 현재 상태 (main, `stock-api-integration` + `market-real-data` 머지 직후)

- `/watchlist`(`app/(main)/watchlist/page.tsx`)는 **server component** 로, `WATCHLIST_ITEMS_MOCK`(6건 = 삼성전자·엔비디아·테슬라 + 비트코인·이더리움·솔라나) 을 **하드코딩 import 하여 props 전달**. BFF / fetch / axios 호출 0건. `useState` 0(인터랙티브 셸 없음).
- 표시 모델 `WatchlistItem` = `{ name, symbol, priceDisplay(문자열), changeDisplay(문자열), isUp, assetType("stock"|"crypto") }`. 컴포넌트 = `WatchlistPage`(헤더 + "+ 그룹 추가" 버튼) → `WatchlistTable`(12-col grid 카드) → `WatchlistRow`(자산 배지 + 종목명/심볼 + 현재가 + 등락 칩 + 관리 `MoreVertical` 버튼). 셋 다 server component, 인터랙션은 정적(버튼 핸들러 없음).
- `stock-api-integration` PR-C 에서 **Watchlist 도메인 어댑터·훅 인프라는 이미 신설됨**:
  - `lib/api/watchlist/list.ts` — `getWatchlist(tickers)`. **단 `fetchStockPriceClient(ticker)` 를 `Promise.all` 반복 호출**하는 임시 구현. `WatchlistQuote = StockPrice` alias. 종목명/메타 합성 없음.
  - `hooks/watchlist/useQueryWatchlist.ts` — `queryKeys.watchlist.list(tickers)`(tickers sort+join 정규화) + `queryConfig.watchlist.list`(staleTime 10s / gcTime 5min). `enabled: tickers.length > 0`.
  - **이 훅은 현재 어떤 화면에서도 호출되지 않는다**(page 는 server + mock).
- KIS 클라이언트(`lib/api/kis/`): `price`(현재가/일자별, **구현됨**) · `index-price`(지수) · `search`(symbols.json, **구현됨**) · `token` 구현. **`search-stock-info`(`CTPF1002R`) 호출·타입·매퍼는 미구현**(`git grep search-stock-info|CTPF1002R|prdt_abrv_name -- lib app` → 0건).
- **관심종목 영구화는 어디에도 없다** — `git grep "localStorage\|supabase"` 는 어댑터/훅의 "후속 PR 책임" **주석만** 매칭. 실제 저장소(localStorage/DB) 0.

### 1.3 문제

1. `getWatchlist` 가 `fetchStockPriceClient` 만 호출 → **종목명이 `mapStockPrice`→`extractStockName`(`hts_kor_isnm`→`prdt_name`→ticker)** 로 채워지는데, KIS 스펙 §0(2026-05-29 스모크)은 **`hts_kor_isnm` 이 prod 에서도 빈 값** 임을 명시 → 실데이터에서 종목명이 **ticker(`005930`)** 로만 표시될 위험. 종목명 1차 소스 = `search-stock-info` 의 `prdt_abrv_name`("삼성전자").
2. `/watchlist` 가 mock 을 직접 import 하는 server component 라 실데이터 진입점(훅)이 연결돼 있지 않다.
3. 관심종목 ticker 가 **영구화되지 않음** → "관심종목"이라는 개념 자체가 성립 안 함(새로고침 시 사라짐). 실데이터 전환 전에 **저장소 결정이 선행**돼야 한다(§9 q1).
4. mock 6건 중 코인 3종(BTC/ETH/SOL)은 KIS 국내주식 엔드포인트로 **원천적으로 조달 불가**(`inquire-price` `FID_COND_MRKT_DIV_CODE=J` 는 KRX 주식). `market-real-data` 가 해외/환율/코인을 제거한 것과 동일 — 본 트랙 처리 결정 필요(§9 q4).

### 1.4 컨텍스트 메모 (KIS 함정 — 반드시 인지)

- **종목명 함정**: `bstp_kor_isnm`= **업종명**("전기·전자"), 종목명 아님. `hts_kor_isnm`= 종목명이나 prod 빈 값 케이스 확인. → 종목명 1차 소스 = `search-stock-info` `prdt_abrv_name`(실호출 확정, 005930→"삼성전자"). 스펙: `domestic-stock-quotations.md` §0·§2-7.
- **`search-stock-info`(CTPF1002R) 는 실전 전용·모의 미지원·`tr_cont` 불가** — `market-real-data` 의 `inquire-index-price` 와 동일 제약. **이중 게이트**(`isKisConfigured()` AND `resolveKisEnv()==="prod"`) 필요(§9 q3).
- `search-stock-info` 한 번 호출로 **종목명(`prdt_abrv_name`) + 시장 배지(`mket_id_cd` STK/KSQ, `excg_dvsn_cd` 02/03) + 거래정지(`tr_stop_yn`)·관리종목(`admn_item_yn`) 경고 배지** 가 거의 다 해결됨. 메타는 거의 안 변하므로 긴 TTL 분리 권고(§9 q2).
- 파라미터 주의: `search-stock-info` 는 `PRDT_TYPE_CD=300`(주식/ETF/ETN/ELW) + `PDNO=<6자리>`. 응답 `pdno` 는 12자리 패딩(`00000A005930`) — 6자리는 입력값 그대로 사용.
- KIS 스펙에 **`intstock_multprice`(FHKST11300006, 관심종목 복수 시세)** 가 존재(1-5절). 종목당 N개 단건 호출 대신 1회 일괄 시세 가능성 — 단 응답 필드 미수집("확인 필요") → 본 트랙은 기존 단건 `inquire-price` 패턴 유지, multprice 는 후속 최적화로 분리 권고(§9 q2 보조).
- 실전계좌(72245021) 안전장치(다중 게이트)는 **주문 API 한정** — 본 PRD read-only 라 무관.

---

## 2. 목표 (측정 가능)

> 목표는 §9 OPEN QUESTION 6개 전부 RESOLVED(2026-05-30) 기준으로 확정됐다: 영구화=localStorage(engine DB 마이그레이션 경계 추상화), 표시 모델=국내주식만, 초기 시드=대표주 3종.

- `/watchlist` 가 **사용자가 담은(또는 대표주 3종 시드) 국내주식 ticker 배열** 에 대해 `KIS_ENV=prod` + 키 설정 시 KIS 실데이터(현재가·등락·등락률 = `inquire-price`, 종목명·시장배지 = `search-stock-info`)로 렌더된다.
- **종목명이 ticker 가 아닌 한글명**으로 표시된다(`prdt_abrv_name` 우선). prod 키에서 `005930`→"삼성전자", 모의/키미설정 시 fallback = **symbols.json 시드 name → 없으면 ticker**(§9 q3) 로 회귀 0.
- **최초 진입(localStorage 비어있음) 시 국내 대표주 3종(삼성전자·SK하이닉스·NAVER)** 이 시드로 담겨 실시세가 즉시 렌더된다. **각 행 삭제(관심목록 제거)** 가 쉽게 동작하고, 삭제로 0개가 되면 빈 상태 CTA 가 노출된다.
- **종목 추가**(검색 → 선택 → ticker 영구화) + **삭제**(행에서 제거 + 영구화 갱신) 가 동작하고, 추가 즉시 시세가 로드되어 리스트에 반영된다.
- `KIS_ENV !== "prod"` 또는 키 미설정 시 mock/fallback 으로 **화면 회귀 0**(시세 단일 게이트 + 메타 이중 게이트). 종목 중 일부 실패 시 `Promise.allSettled` 부분 성공(성공분만 표시), soft cap 30종목 초과 시 truncate + 헤더 경고.
- BFF 응답에 `X-Data-Source`(`kis`/`mock`/`mock-timeout`) + `X-KIS-Env` 헤더(`stock-api-integration`·`market-real-data` 선례 정합).
- 시세 TTL 은 `queryConfig.watchlist.list`(짧음), 종목명/메타 TTL 은 별도 긴 항목(§9 q2)으로 분리 — 단일 진실 원천.
- **영구화 훅은 저장소 중립적 시그니처**(`useWatchlistTickers`) — 내부 구현만 localStorage→engine API DB 로 교체 가능한 추상화 경계가 코드상 명확하다.
- `npm run typecheck && npm run lint && npm run build` 0 에러, 신규 매퍼·어댑터 단위 테스트 통과.

---

## 3. 범위 (In Scope)

> 본 §3 은 **§9 q1=localStorage(engine DB 마이그레이션 경계 추상화) / q3=symbols.json name fallback / q4=국내주식만(코인·해외 제거) / q5=대표주 3종 시드+행별 삭제 / q6=디자이너 미합류** 확정 결정(2026-05-30) 기준으로 기술한다.

### 3.1 KIS 종목 기본정보 호출 추가 (`lib/api/kis/stock-info.ts` 신설)

- `fetchStockInfo(ticker: string): Promise<StockInfo>` 신설.
  - `GET /uapi/domestic-stock/v1/quotations/search-stock-info`, TR_ID `CTPF1002R`.
  - params: `PRDT_TYPE_CD=300`(주식/ETF/ETN/ELW), `PDNO=<6자리 ticker>`.
  - auth 헤더 빌드는 `price.ts` 의 `buildAuthHeaders` 패턴 답습(`custtype: "P"`). price.ts 공통화 리팩터링은 비범위(§4).
  - `rt_cd !== "0"` → `makeKisBusinessError(msg1, msg_cd)`. 네트워크 오류 → `makeKisTransportError`.
- 응답 타입 `KisSearchStockInfoOutput`(`lib/api/kis/types.ts` 추가): `prdt_abrv_name` · `prdt_name` · `mket_id_cd` · `excg_dvsn_cd` · `scty_grp_id_cd` · `kospi200_item_yn` · `tr_stop_yn` · `admn_item_yn` (전체 string).
- `lib/api/kis/index.ts` re-export 에 `fetchStockInfo` + 타입 추가(read-only 만 export 하는 안전장치 주석 정합 — 주문 함수 추가 금지).

### 3.2 종목 메타 매퍼 (`lib/api/kis/mappers.ts` 확장)

- `mapStockInfo(output, ticker): StockInfo` 신설.
  - `prdt_abrv_name`(빈 값이면 `prdt_name` → ticker) → `name`.
  - `mket_id_cd`/`excg_dvsn_cd` → `market`("KOSPI"|"KOSDAQ"|"KONEX"|"ETF"|"기타"). 매핑 상수(`STK`/`02`→KOSPI, `KSQ`/`03`→KOSDAQ 등).
  - `tr_stop_yn === "Y"` → `isTradeStopped`, `admn_item_yn === "Y"` → `isAdminItem`(경고 배지용 boolean).
  - `StockInfo` 타입(`lib/api/kis/types.ts`): `{ ticker, name, market, isTradeStopped, isAdminItem, isKospi200 }`.
- 단위 테스트(`lib/api/kis/__tests__/stock-info.mappers.test.ts`): ① `prdt_abrv_name` 우선·빈 값 시 `prdt_name`·둘 다 빈 값 시 ticker fallback ② `mket_id_cd`/`excg_dvsn_cd` → 시장 매핑 ③ `tr_stop_yn`/`admn_item_yn` "Y"/"N" → boolean ④ `bstp_kor_isnm`(업종명) 미사용 검증.

### 3.3 BFF 라우트 (`app/api/watchlist/route.ts` 신설)

- `GET /api/watchlist?tickers=005930,000660`(또는 반복 `?tickers=005930&tickers=000660`). tickers 빈 값 → 빈 배열 반환(200, 호출 안 함).
- 종목당 **시세(`fetchStockPrice`) + 메타(`fetchStockInfo`)** 합성:
  - **시세 게이트(단일)**: `inquire-price` 는 모의 지원 → `isKisConfigured()` 만 통과하면 KIS 시세, 아니면 mock.
  - **메타 게이트(이중)**: `search-stock-info` 는 실전 전용 → `isKisConfigured()` AND `resolveKisEnv()==="prod"` 통과 시에만 호출. prod 아님/키 미설정 시 종목명 fallback(§9 q3=symbols.json `searchSymbols`/`getCorpCode` 시드의 name, 없으면 ticker).
  - 합성 결과 `WatchlistQuote[]`(§3.4 새 스키마) 반환 + `X-Data-Source: kis|mock|mock-timeout` + `X-KIS-Env`.
- **부분 성공**: `Promise.allSettled` 로 종목 병렬 호출 → 성공분만 반환, 실패 종목은 결과에서 제외(또는 시세만/이름만 부분 성공도 허용 — 메타 실패 시 fallback name 으로 디그레이드). 전체 실패 시에만 에러/타임아웃.
- BFF 5s 타임아웃 가드(`withTimeout`, `market/indices/route.ts` 패턴) → 타임아웃 시 mock + `X-Data-Source: mock-timeout` + `X-Error` 한글.
- 4xx 메시지 통과 / 5xx·전체실패 한글 fallback / `Cache-Control: no-store`.
- **호출량 가드**(§9 q2 확정): tickers soft cap 30종목 — 초과분 truncate + 헤더 경고.

### 3.4 도메인 어댑터 재배선 (`lib/api/watchlist/list.ts` 수정)

- 현재 `fetchStockPriceClient(ticker)` 반복 → **`/api/watchlist` BFF 단일 호출**로 교체:
  - `getWatchlist(tickers): Promise<WatchlistQuote[]>` — `httpClient.get("/watchlist", { params })`.
- `WatchlistQuote` 타입을 관심종목 친화 스키마로 재정의(현재 `= StockPrice` alias):
  - `{ ticker, name(메타 종목명), market?, price, change, changePercent, direction, volume, isTradeStopped?, isAdminItem? }`.
- 기존 어댑터 테스트(`lib/api/watchlist/__tests__/list.test.ts`)는 `fetchStockPriceClient` 모킹 기반 → **`httpClient` 모킹 기반으로 갱신**(빈 배열 즉시 반환 / BFF 1회 호출 / 입력 순서 보존).

### 3.5 영구화 — 저장소 중립 커스텀훅 (§9 q1=localStorage, engine DB 마이그레이션 경계 추상화)

- `hooks/watchlist/useWatchlistTickers.ts` 신설(client) — 관심종목 ticker 배열의 단일 진실 원천:
  - `useWatchlistTickers(): { tickers, addTicker, removeTicker, hasTicker }`.
  - **저장소 중립 시그니처** — 본 트랙 내부 구현은 localStorage(`"watchlist:tickers"` JSON string[]) 이나, **추후 engine 쪽 API 를 통한 DB 저장으로 마이그레이션 예정**. 훅의 공개 시그니처(`tickers`/`addTicker`/`removeTicker`/`hasTicker`)는 유지하고 **내부 read/write 만 교체 가능한 추상화 경계**를 둔다(예: `lib/api/watchlist/store.ts` 가칭에 `readTickers`/`writeTickers` 격리, 훅은 그 함수만 호출). 컴포넌트·BFF·시세 훅은 이 경계 너머의 저장 방식을 알지 못한다.
  - SSR 안전(초기 hydration 시 빈 배열 → mount 후 동기화, hydration mismatch 가드).
  - 중복 추가 무시, 최대 개수 가드(§3.3 soft cap 30 과 정합).
  - **시드 기본값(§9 q5)**: 최초 진입 시 localStorage 비어있으면 **국내 대표주 3종(`005930` 삼성전자 · `000660` SK하이닉스 · `035420` NAVER)** 을 기본으로 채운다. 시드 상수는 mock/copy 와 별도 식별자 상수(예 `WATCHLIST_SEED_TICKERS`)로 둔다. 사용자가 시드를 전부 삭제하면 빈 배열로 영구화(다시 시드되지 않음 — "한번이라도 손댄 목록"을 존중).
- 커스텀훅 의무화(frontend.md §1) 준수 — 컴포넌트는 `useWatchlistTickers` + `useQueryWatchlist` 만 소비.

### 3.6 훅 + 화면 배선

- `useQueryWatchlist` 시그니처 유지(반환 타입이 새 `WatchlistQuote[]` 로 자연 갱신). `queryKeys.watchlist.list` 그대로. `queryConfig.watchlist.list` staleTime(10s) 유지 또는 §9 q2 결정값.
- `app/(main)/watchlist/page.tsx` → **client 경계 분리**:
  - 방안 A(권장): page 는 server 유지, **`WatchlistContainer`(client)** 신설 — `useWatchlistTickers()` 로 ticker 배열 → `useQueryWatchlist(tickers)` 로 시세+메타 fetch → 로딩/에러/빈/성공 분기 → `WatchlistPage` 에 props + 추가/삭제 핸들러 전달.
  - `WatchlistPage`/`WatchlistTable`/`WatchlistRow` 를 **client 전환 + 인터랙션 추가**. **행별 삭제(관심목록 제거)를 쉽게**(§9 q5) — 각 행에 명확한 삭제 버튼(`button-icon` 톤, 예 휴지통/`X` 아이콘) 노출 → `onClick` 시 `removeTicker(ticker)`. 행 클릭(삭제 버튼 외 영역) 시 `/profile/[ticker]` 라우팅. 정적 셸 → 인터랙티브.
- `WatchlistRow` 표시 변환은 컨테이너/표시 유틸에서: `price`(number)→`"84,500"`(`toLocaleString`/`formatNumber`), `changeDisplay`(`formatPct`+부호), `isUp`(`direction === "up"`). 거래정지/관리종목 시 경고 배지는 **기존 `badge-*` 토큰으로 충당**(§9 q6=디자이너 미합류, 신규 토큰 0).

### 3.7 종목 추가 UX (검색 모달/패널)

- `components/watchlist/WatchlistAddModal.tsx`(client) 신설 — "+ 그룹 추가"(또는 "+ 종목 추가"로 카피 조정) 버튼 클릭 시 오픈:
  - 검색 입력 → `useQueryStockSearch(keyword)`(기존 훅 재사용) → 결과 리스트.
  - 항목 선택 → `addTicker(ticker)` → 모달 닫고 리스트 갱신.
  - 이미 담긴 종목은 비활성/체크 표시(`hasTicker`).
  - 기존 합성 토큰(`button-primary`/`button-icon`/`card`/`input` 류) 재사용 — 신규 토큰 0.
- 카피 상수 `lib/copy/watchlist/labels.ts` 확장(검색 placeholder, 빈 결과 안내, 추가 완료 등).

### 3.8 mock fallback (`lib/mock/watchlist/items.ts` 보강)

- BFF 가 반환할 **데이터 모델(`WatchlistQuote[]`) mock** 신설: `getMockWatchlist(tickers)` — ticker 별 정합 fixture(price/change/direction/name). 사용자 노출 한글 카피 0건(식별자만 — frontend.md §3).
- 표시 모델 mock(`WATCHLIST_ITEMS_MOCK`): §9 q4=국내주식만 결정에 따라 **코인 3종 + 해외주식 2종(엔비디아·테슬라) 전부 제거**하고 **국내 대표주로 교체** — 시드(§3.5)와 정합하게 `005930` 삼성전자 · `000660` SK하이닉스 · `035420` NAVER 중심(필요 시 카카오 등 추가). 자산배지는 "stock"(국내주식)만 사용 — "crypto" 배지는 자연 미사용.

### 3.9 로딩 / 에러 / 빈 상태 카피

- 로딩 — WatchlistTable body 스켈레톤(row placeholder, 기존 `bg-surface-muted` 토큰).
- 에러 — 카드 내 인라인 한글 안내("관심종목 시세를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.") + 재시도(선택).
- 빈 — tickers 0건 시(시드를 전부 삭제한 경우 포함, §9 q5) "관심종목을 추가해 보세요" + 추가 CTA. copy = `lib/copy/watchlist/labels.ts`.

### 3.10 환경변수

- 신규 환경변수 없음 — `KIS_APP_KEY`/`KIS_APP_SECRET`/`KIS_ENV` 재사용. `search-stock-info` 가 실전 전용이므로 메타는 **이중 게이트**, 시세(`inquire-price`)는 모의 지원이라 **단일 게이트**(§3.3).

---

## 4. 비범위 (Out of Scope)

- **engine API 기반 DB 영구화** — §9 q1=localStorage 결정. 본 트랙은 localStorage 까지만(§3.5). **추후 engine 쪽 API 를 통한 DB 저장으로 마이그레이션은 별도 후속 트랙**(`watchlist-engine-persistence` 가칭) — `useWatchlistTickers` 시그니처는 유지하고 내부 저장 구현만 교체(추상화 경계는 본 트랙에서 마련). engine API 스펙·인증은 그 트랙 책임.
- **코인(BTC/ETH 등) 실시세** — KIS 국내주식 엔드포인트 조달 불가. 코인 API 별도 소스 필요 → 별도 트랙(`market-foreign-data` 또는 `crypto-data` 가칭, §9 q4).
- **해외주식(엔비디아/테슬라 등) 실시세** — `inquire-price` `J`(KRX) 는 국내만. 해외주식은 overseas-stock TR 별도 → 별도 트랙.
- **`intstock_multprice`(FHKST11300006) 일괄 시세 최적화** — 응답 필드 미수집. 본 트랙은 단건 `inquire-price` 반복 유지, 일괄 조회는 후속 성능 최적화(§9 q2 보조, §8.4).
- **관심종목 그룹(폴더) 기능** — 시안의 "+ 그룹 추가" 는 단일 그룹 가정. 다중 그룹/탭은 별도 트랙. 본 트랙은 단일 관심목록.
- **price.ts auth 헤더 공통화 리팩터링** — 회귀 위험. 본 PRD 는 stock-info 호출 신설만.
- **주문 / 매매 API** — 프로젝트 정책상 미구현. read-only 만.
- **WebSocket 실시간 시세** — 폴링(staleTime)으로 충분.
- **디자인 토큰 신규 추가** — 기존 v8 토큰 재사용.

---

## 5. 수용 기준 (AC)

> 검증 명령은 저장소 루트에서 실행. §9 OPEN QUESTION 6개 전부 RESOLVED(2026-05-30) — 아래 AC 는 확정 결정 기준이다.

### AC-1 KIS 종목 기본정보 호출 모듈 존재
- `find lib/api/kis -name "stock-info.ts"` → 1건.
- `git grep -n "CTPF1002R" lib/api/kis` → 1건 이상.
- `git grep -n "PRDT_TYPE_CD\|search-stock-info" lib/api/kis` → 각 1건 이상.

### AC-2 종목명 1차 소스 = prdt_abrv_name (ticker 노출 회피)
- `git grep -n "prdt_abrv_name" lib/api/kis` → 1건 이상.
- 매퍼 테스트가 `prdt_abrv_name`→`prdt_name`→ticker fallback 순서 + `bstp_kor_isnm`(업종명) 미사용을 커버.

### AC-3 BFF watchlist 라우트 존재 + 헤더 + 게이트
- `find app/api/watchlist -name "route.ts"` → 1건.
- `git grep -n "X-Data-Source\|X-KIS-Env" app/api/watchlist/route.ts` → 각 1건 이상.
- `git grep -n "isKisConfigured\|resolveKisEnv" app/api/watchlist/route.ts` → 둘 다 존재(시세 단일 게이트 + 메타 이중 게이트).
- `git grep -n "allSettled" app/api/watchlist/route.ts` → 1건(부분 성공).

### AC-4 KIS 직접 호출 없음 (BFF 경유)
- `git grep -rn "search-stock-info\|fetchStockInfo\|inquire-price" components hooks app/\(main\)` → 0건.
- 어댑터(`lib/api/watchlist/list.ts`)는 `httpClient`(same-origin `/api`)만 사용 — `git grep -n "getKisClient\|fetchStockInfo\|fetchStockPrice\b" lib/api/watchlist` → 0건.

### AC-5 도메인 한 뎁스 + queryKeys + 커스텀훅 정합 (frontend.md §1·§7)
- `git grep -n "queryKeys.watchlist.list" hooks/watchlist/useQueryWatchlist.ts` → 1건.
- `git grep -rn "useQuery(" components/watchlist` → 0건(컴포넌트는 커스텀훅만 소비).
- `git grep -rn "useQueryWatchlist\|useWatchlistTickers" components/watchlist` → 각 1건 이상.

### AC-6 영구화 동작 + 저장소 추상화 경계 + 시드 (q1=localStorage / q5=대표주 3종 시드)
- `find hooks/watchlist -name "useWatchlistTickers.ts"` → 1건.
- 추가/삭제 후 새로고침 시 ticker 유지(수동 또는 hook 단위 테스트). hydration mismatch 0(SSR 가드).
- **저장소 추상화 경계**: 훅이 localStorage 를 직접 두드리지 않고 격리 함수(`readTickers`/`writeTickers` 가칭)만 호출 — `git grep -n "localStorage" hooks/watchlist/useWatchlistTickers.ts` → 0건(localStorage 접근은 store 격리 모듈에만). 시그니처는 engine DB 로 교체해도 불변.
- **시드**: 최초 진입(localStorage 비어있음) 시 대표주 3종(`005930`/`000660`/`035420`)이 담긴다. 시드 상수 존재 — `git grep -rn "WATCHLIST_SEED" lib hooks` → 1건 이상. 시드 전부 삭제 후 새로고침 시 빈 목록 유지(재시드 안 됨).

### AC-7 종목 추가/삭제 UX
- "+ 추가" 버튼 클릭 → 검색 모달 → 종목 선택 → 리스트에 추가 + 시세 로드. **행마다 명확한 삭제 버튼** → 클릭 시 리스트에서 제거 + 영구화 갱신. 마지막 항목 삭제로 0개 → 빈 상태 CTA 노출.
- `find components/watchlist -name "WatchlistAddModal.tsx"` → 1건. `git grep -n "useQueryStockSearch" components/watchlist` → 1건 이상(기존 검색 훅 재사용).
- `git grep -n "removeTicker" components/watchlist` → 1건 이상(행별 삭제 핸들러 배선).

### AC-8 mock fallback 동작 (환경변수 미설정 시)
- `KIS_APP_KEY` 미설정 상태 `GET /api/watchlist?tickers=005930` → 200 + `X-Data-Source: mock` + `WatchlistQuote[]` 본문.
- `git grep -n "getMockWatchlist" lib/mock/watchlist` → 1건. mock 표시 모델에 코인·해외주식 0건 — `git grep -rn "crypto\|BTC\|ETH\|엔비디아\|테슬라" lib/mock/watchlist lib/types/watchlist` → 0건(국내주식만, §9 q4).
- `KIS_ENV` 가 prod 아님(키 설정) → 시세는 KIS(`X-Data-Source: kis` 가능), **메타는 fallback name = symbols.json 시드 name → 없으면 ticker**(§9 q3) — 종목명에 ticker 만 노출되지 않음. 시세 `extractStockName` 의존 금지.

### AC-9 화면 종단 실데이터 (수동, prod 키 설정 시)
- `KIS_ENV=prod` + 키 설정 후 `/watchlist` 진입 → 담은 종목이 실시세 + 한글 종목명("삼성전자")으로 렌더. DevTools Network `/api/watchlist` 응답 `X-Data-Source: kis` 확인.

### AC-10 표시 변환 + 한국식 색 정합
- 현재가 천단위 콤마, 등락률 부호+퍼센트, 한국식 색(상승 빨강/하락 파랑 — `badge-signal-up`/`badge-signal-down`) 유지. `git grep -n "badge-signal-up\|badge-signal-down" components/watchlist` → 유지.

### AC-11 typecheck / lint / build / test 0 에러
- `npm run typecheck` → 0. `npm run lint` → 0. `npm run build` → 0(Turbopack). `npm run test -- watchlist` (+ stock-info 매퍼) 통과.

### AC-12 화면 회귀 0 (수동, 양 뷰포트)
- 모바일/데스크탑에서 `/watchlist` 레이아웃(12-col grid, 카드 셸) 회귀 0. 리스트가 담은 국내종목(코인·해외 0, §9 q4)으로 렌더. 최초 진입 시 대표주 3종 시드 표시, 행별 삭제·추가 모달·빈 상태/로딩/에러 분기 정상.

---

## 6. 가정 · 제약

- **선행 전제**: `stock-api-integration` PR-A/B/C + `market-real-data` 머지 완료(main 정합). `lib/api/kis/{client,token,errors,mappers,price,search}` · `httpClient` · `queryConfig`/`queryKeys`(`watchlist.list`) · `useQueryWatchlist`/`useQueryStockSearch` 인프라 존재 — 본 PRD 는 그 위에 종목명 합성 + 영구화 + UX 를 얹는다.
- **`search-stock-info`(CTPF1002R) 는 실전 전용·모의 미지원·`tr_cont` 불가** — 단건 object output. prod 아니면 메타 fallback.
- **`inquire-price` 는 모의 지원**(실전/모의 TR_ID 동일 `FHKST01010100`) — 시세는 단일 게이트.
- **종목명은 `prdt_abrv_name` 1차** — `hts_kor_isnm` 단독 의존 금지(prod 빈 값). `bstp_kor_isnm`= 업종명(종목명 아님).
- **관심종목은 단순 목록 저장**(조회·분석 전용 프로젝트) — 주문/계좌/잔고와 무관. 영구화 결정은 UX·인프라 사정이지 금융 리스크 없음.
- **도구 가정**: `npm run typecheck/lint/build/test` 동작. Turbopack 일상 build.

---

## 7. 참고

- 현행 화면: `app/(main)/watchlist/page.tsx` · `components/watchlist/{WatchlistPage,WatchlistTable,WatchlistRow}.tsx`.
- 현행 인프라(PR-C): `lib/api/watchlist/list.ts`(+`__tests__/list.test.ts`) · `hooks/watchlist/useQueryWatchlist.ts` · `lib/query/queryConfig.ts`(`watchlist.list`) · `hooks/query/queryKeys.ts`(`watchlist.list`).
- 검색 재사용: `hooks/stock/useQueryStockSearch.ts` · `lib/api/stock/search.ts` · `app/api/stock/search/route.ts` · `lib/api/kis/search.ts`(`searchSymbols`/`getCorpCode` — fallback name 소스).
- mock / 타입 / copy: `lib/mock/watchlist/items.ts` · `lib/types/watchlist/items.ts` · `lib/copy/watchlist/labels.ts`.
- KIS 선례: `lib/api/kis/{price,mappers,types,index}.ts` · `app/api/market/indices/route.ts`(이중 게이트 + 부분성공 + 타임아웃 + 헤더 패턴 — **가장 가까운 선례**) · `app/api/stock/price/route.ts`(시세 단일 게이트).
- KIS 스펙: `docs/references/kis-api/domestic-stock-quotations.md` **§2-7**(`search_stock_info`, `prdt_abrv_name`·시장·거래정지/관리 필드표) · **§0**(종목명 함정·`hts_kor_isnm` 빈 값) · §1-5(`intstock_multprice` 후속 최적화) · 공통 인증 `00-auth-and-common.md`.
- 선례 PRD: `docs/prd/market-real-data.md`(이중 게이트·부분성공·`X-Data-Source`/`X-KIS-Env`·코인/해외 제거 논리) · `docs/prd/stock-api-integration.md`(BFF+어댑터+매퍼+mock fallback, 주문 안전장치 §9 q4).
- 룰: `docs/rules/frontend.md`(§1 커스텀훅 · §3 copy · §7 queryKeys · 도메인 한 뎁스).

---

## 8. 영향 분석

### 8.1 변경 라인 추정 (q1=localStorage / q4=국내주식만 / q5=시드+삭제 확정 기준)

| 영역 | 파일 | 추정 라인 | 성격 |
|---|---|---|---|
| KIS 종목정보 호출 | `lib/api/kis/stock-info.ts` (신규) | ~70 | 신규 |
| 종목정보 타입 | `lib/api/kis/types.ts` (+추가) | ~30 | 추가 |
| 종목정보 매퍼 | `lib/api/kis/mappers.ts` (+추가) | ~40 | 추가 |
| kis index re-export | `lib/api/kis/index.ts` (+추가) | ~5 | 추가 |
| BFF 라우트 | `app/api/watchlist/route.ts` (신규) | ~110 | 신규(시세+메타 합성, market/indices 패턴) |
| 어댑터 재배선 | `lib/api/watchlist/list.ts` (수정) | ~40 | 교체 |
| 어댑터 테스트 갱신 | `lib/api/watchlist/__tests__/list.test.ts` (수정) | ~30 | 교체 |
| 영구화 훅 | `hooks/watchlist/useWatchlistTickers.ts` (신규) | ~60 | 신규 |
| 저장소 격리 모듈 | `lib/api/watchlist/store.ts` (신규, read/write 추상화) | ~30 | 신규(engine DB 교체 경계) |
| 훅 타입 갱신 | `hooks/watchlist/useQueryWatchlist.ts` (소폭) | ~5 | 수정 |
| 컨테이너 | `components/watchlist/WatchlistContainer.tsx` (신규) | ~80 | 신규 |
| 추가 모달 | `components/watchlist/WatchlistAddModal.tsx` (신규) | ~90 | 신규 |
| Page/Table/Row client 전환 + 인터랙션 | `components/watchlist/*` (수정) | ~70 | 수정 |
| 표시 변환 유틸 | (기존 formatNumber/formatPct 재사용 + 소폭) | ~15 | 추가 |
| mock 데이터 모델 | `lib/mock/watchlist/items.ts` (+추가) | ~50 | 추가 |
| copy | `lib/copy/watchlist/labels.ts` (+추가) | ~15 | 추가 |
| 단위 테스트 | `lib/api/kis/__tests__/stock-info.mappers.test.ts` (+) | ~70 | 추가 |
| **합계** | | **~810** | |

### 8.2 PR 분할 권고

- 본 PRD 는 **단일 PR**(단일 PR 룰 적용). ~810 라인은 한 도메인(`watchlist`) 내 응집된 수직 슬라이스(KIS 호출→BFF→어댑터→저장소 격리+영구화 훅→화면 + 추가/삭제 UX). 중간 상태(BFF 만 있고 화면 미연결)는 무의미(PR-C 가 이미 겪은 "인터페이스만" 상태). 분할 안 함.
- **q1=localStorage 확정**으로 영구화 슬라이스가 클라이언트 내 완결 → 단일 PR 유지 안정적. **engine API DB 마이그레이션은 별도 후속 트랙**이며, 본 트랙이 `store.ts`(read/write 격리) + 저장소 중립 훅 시그니처로 **교체 경계를 미리 마련**해 후속 트랙의 변경면을 store 격리 모듈 1곳으로 국소화한다(훅·컴포넌트·BFF 무변경 목표).
- 커밋 분할 권고(브랜치 내): ① `docs(prd): watchlist-real-data` → ② `feat(kis): search-stock-info 호출+타입+매퍼+테스트` → ③ `feat(bff): /api/watchlist 시세+메타 합성 라우트+mock` → ④ `feat(watchlist): 어댑터 재배선+저장소 격리+영구화 훅(시드 3종)` → ⑤ `feat(watchlist): 컨테이너+추가/행별 삭제 UX+표시변환`.

### 8.3 회귀 위험

- **중**: `WatchlistQuote` 타입을 `StockPrice` alias 에서 관심종목 친화 스키마로 변경 → 어댑터 테스트 + 이를 import 하는 곳(현재 어댑터·훅·테스트만, 화면 미연결이라 범위 좁음) typecheck 깨질 수 있음. 테스트 갱신 필수.
- **중**: Page/Table/Row 를 server→client 전환 → `/watchlist` 렌더 회귀 + hydration. 컨테이너만 데이터 fetch, 셸은 props 유지로 최소화. 모달은 lazy/조건부 마운트.
- **저**: localStorage SSR hydration mismatch — `useWatchlistTickers` 가 mount 후 동기화 가드 필수(AC-6).
- **저**: mock fallback 이 새 데이터 모델로 안 맞으면 키 미설정 환경 화면 깨짐 → AC-8 차단.
- **외부 의존**: `search-stock-info` 실전 전용 → CI/로컬(키 없음)은 항상 메타 fallback 경로만 검증 가능. 종목명 실데이터(AC-9)는 prod 키 보유자 수동.
- **rate limit**: 종목당 2 API × N종목 → 호출량 증가. §3.3 soft cap + 메타 긴 TTL + `Promise.allSettled` 로 완화. 운영 후 `intstock_multprice` 일괄 조회로 후속 최적화(§8.4).

### 8.4 후속 PR 자연 연결

- **engine API DB 영구화 마이그레이션 트랙**(`watchlist-engine-persistence` 가칭) — §9 q1=localStorage 결정의 후속. `store.ts`(read/write 격리)만 engine API 호출로 교체, `useWatchlistTickers` 시그니처·컴포넌트·BFF 무변경 목표. engine API 스펙·인증 선행 필요.
- **코인/해외주식 관심종목 트랙** — §9 q4 로 제거된 자산. 별도 소스(`crypto-data`/overseas-stock).
- **`intstock_multprice` 일괄 시세 최적화** — 종목당 단건 N회 → 1회 일괄. 응답 필드 수집 선행 필요.
- **관심종목 그룹(폴더/탭)** — 시안 "+ 그룹 추가" 확장.
- **watchlist TTL 운영 데이터 기반 재조정**(§9 q2 결정값 기준 chore).

---

## 9. OPEN QUESTION (전부 RESOLVED — 2026-05-30 사용자 결정)

> 6개 항목 모두 사용자 결정으로 확정됐다. 본문 §0/§2/§3/§4/§5/§8 에 반영 완료. 본 트랙은 디자이너 없이 구현(backend+frontend) 으로 직행한다.

- **[RESOLVED] q1 — 관심종목 ticker 영구화 방식 = (a) localStorage.**
  - 결정: 영구화는 클라이언트 localStorage 로 시작하되 **추후 engine 쪽 API 를 통한 DB 저장으로 마이그레이션 예정**. `useWatchlistTickers` 훅을 **저장소 중립적 시그니처**로 설계해 내부 구현만 localStorage→engine API DB 로 교체 가능하게 한다(추상화 경계 명시 — `lib/api/watchlist/store.ts` 가칭에 read/write 격리, §3.5·§8.1). 본 트랙은 localStorage 까지, 백엔드/engine 연동은 별도 후속 트랙(`watchlist-engine-persistence` 가칭, §4·§8.4).
  - 근거: ① 클라이언트 저장이 조회·분석 전용 단순 관심목록에 충분(금융 리스크·정합성 요구 낮음). ② 본 트랙을 단일 PR 로 완결 가능. ③ store 격리로 후속 engine DB 마이그레이션의 변경면을 1곳에 국소화.

- **[RESOLVED] q2 — 합성 호출 구조 / 캐싱 TTL / 호출 한도 = PM 권고대로.**
  - 결정: ① **TTL 분리** — 시세(`inquire-price`)는 `queryConfig.watchlist.list`(짧음) / 종목명·메타(`search-stock-info`)는 거의 안 변하므로 **별도 긴 TTL 항목**(`queryConfig.watchlist.info` 류, `disclosure.company` 선례). ② **종목당 2 API 합성** + `Promise.allSettled` 부분 성공. ③ **soft cap 30종목** — 초과분 truncate + 헤더 경고. ④ `intstock_multprice` 일괄조회는 **본 트랙 비채택**, 후속 최적화(§8.4). 단건 `inquire-price` 반복 유지.

- **[RESOLVED] q3 — 모의/키미설정 시 종목명 fallback = (a) symbols.json 시드 name → 없으면 ticker.**
  - 결정: prod 아님/키 미설정 시 종목명 fallback = `searchSymbols`/`getCorpCode`(symbols.json 시드)의 name → 시드 미수록 종목은 ticker. **시세 응답의 `extractStockName`(`hts_kor_isnm` prod 빈 값) 의존 금지.**
  - 근거: ① 기존 symbols.json 시드 재사용으로 추가 인프라 0. ② 시드 내 종목은 모의/CI 에서도 한글명 표시 → 화면 품질 유지.

- **[RESOLVED] q4 — mock/표시 모델 = (a) 국내주식만.**
  - 결정: mock 6건 중 **코인 3종(BTC/ETH/SOL) + 해외주식 2종(엔비디아·테슬라) 전부 제거**, mock 표시 모델을 **국내 대표주로 교체**(시드와 정합 — 삼성전자·SK하이닉스·NAVER 중심, §3.5·§3.8). 자산배지는 "stock"만 사용("crypto" 자연 미사용). 코인·해외주식은 별도 트랙(§4·§8.4).
  - 근거: `market-real-data` 가 해외/환율/코인 4종을 카드에서 제거한 선례와 동일 논리(KIS 국내주식 엔드포인트는 국내만 조달).

- **[RESOLVED] q5 — 초기 상태 = (b) 대표주 3종 시드 + 삭제 간편.**
  - 결정: 최초 진입(localStorage 비어있음) 시 국내 대표주 3종(`005930` 삼성전자 · `000660` SK하이닉스 · `035420` NAVER)을 기본 시드로 담는다. **각 행의 삭제(관심목록 제거)를 쉽게** 제공(행별 명확한 삭제 버튼, §3.6). 삭제로 0개가 되면 빈 상태 CTA 노출(§3.9). 시드를 전부 삭제한 사용자에게는 재시드하지 않는다("손댄 목록" 존중, §3.5).

- **[RESOLVED] q6 — UX/UI 디자이너 = 미합류.**
  - 결정: 검색 모달은 기존 `card`/`input`/`button-primary` 패턴, 거래정지/관리종목 경고 배지는 기존 `badge-*` 토큰으로 충당 — **신규 Tailwind 토큰 0**. 디자이너 합류 없이 구현(backend+frontend) 으로 직행. 자산배지 "코인"은 q4=국내주식만이라 자연 미사용.

---

산출물: `docs/prd/watchlist-real-data.md` | UI: yes | §9 OPEN QUESTION 6개 전부 RESOLVED(2026-05-30) | UX/UI 디자이너: 미합류(no) — 다음 단계 구현(backend+frontend) 직행
