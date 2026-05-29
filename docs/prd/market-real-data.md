# PRD — Market 화면 KIS 실데이터 전환 (`market-real-data`)

> **slug**: `market-real-data`
> **작성**: PM 에이전트 · 2026-05-29
> **UI 포함 여부**: **yes** — 본 트랙은 `/market` 화면의 IndicesCard 를 mock → KIS 실데이터로 전환한다. 로딩 스켈레톤 / 에러 / 빈 상태 / 지수 카드 구성 변경(6종 → **국내 3종**)이 동반되므로 화면 변경이 발생한다. 단 **시안 정합 레이아웃·v8 토큰 체계는 유지** (기존 `card` / `signal-up-text` / grid 구조 그대로). 색·타이포·spacing 신규 토큰 도입 0.
> **UX/UI 디자이너 합류**: **no** — q6 결정(2026-05-29)으로 기존 셀 3요소(지수명·현재가·등락률) 그대로 유지하므로 디자이너 미합류. 거래량·상승/하락 종목수 등 신규 필드 노출은 후속(필요 시 디자이너 1회 리뷰). 따라서 본 PRD 다음 단계는 **구현(backend + frontend)** 이다.
> **단일 PR 룰**: 적용 (분할 금지). 한 도메인(`market`) 한 PR.

---

## 0. 한눈에

`/market` 화면의 **주요 지수 카드(IndicesCard)** 를 하드코딩 mock 에서 KIS **국내업종 현재지수**(`inquire-index-price`, TR_ID `FHPUP02100000`) 실데이터로 전환한다. 이 프로젝트는 **조회·분석 전용 + 실전(prod) 키** 정책이며 주문은 미구현이다(별도 PRD `stock-order-integration` 책임).

**범위 확정(2026-05-29 결정)**: 본 트랙은 **국내 지수 3종 — KOSPI(`0001`) / KOSDAQ(`1001`) / KOSPI200(`2001`)** 만 실데이터로 전환한다. 기존 mock 6종 중 **해외(S&P 500 / NASDAQ) · 환율(USDKRW) · 코인(BTC Dominance) 4종은 본 트랙에서 카드에서 제거**한다(§9 q1=a). 이 4종은 데이터 소스가 제각각이라 **별도 트랙(`market-foreign-data` 가칭, 소스 리서치 진행 중)** 에서 다룬다 — 본 PRD 비범위.

핵심 제약 두 가지가 본 PRD 의 범위를 규정한다:

1. **`inquire-index-price` 는 국내 업종지수만 지원** — 코스피 `0001` / 코스닥 `1001` / 코스피200 `2001`. mock 에 있던 **S&P 500 / NASDAQ / USDKRW / BTC Dominance 는 이 엔드포인트로 못 가져오므로 본 트랙에서 카드에서 제거**(별도 트랙 예정). → §9 q1=a(RESOLVED).
2. **실전 전용(모의 미지원)** — `KIS_ENV=prod` + 키 설정에서만 실데이터. `KIS_ENV !== "prod"` 또는 키 미설정이면 무조건 mock fallback(이중 게이트). → §9 q5=a(RESOLVED).

---

## 1. 배경 / 문제

### 1.1 사용자 의도 (verbatim)

> Market 화면을 현재 mock 데이터에서 KIS 실데이터로 전환한다. 이 프로젝트는 조회·분석 전용 + 실전(prod) 키 정책이다(주문 미구현).

### 1.2 현재 상태 (main, `stock-api-integration` 시리즈 PR-A/B/C 머지 직후)

- `/market` 화면(`app/(main)/market/page.tsx`)은 **server component** 로, `MARKET_THEMES_MOCK`(4건) + `MARKET_INDICES_MOCK`(6건)을 **하드코딩 import 하여 props 로 전달**한다. BFF / fetch / axios 호출 0건.
- `IndicesCard`(`components/market/IndicesCard.tsx`)는 `MarketIndex[]`(`{ name, value, changeDisplay, isUp }`) 를 받아 6칸 2-col grid 로 렌더. 표시 필드 = 지수명 · 값(문자열) · 변동률 표시(문자열) · 상승여부.
- mock 지수 6종 = **KOSPI / KOSDAQ / S&P 500 / NASDAQ / USDKRW / BTC Dominance**.
- `stock-api-integration` PR-C 에서 **Market 도메인 어댑터·훅 인프라는 이미 신설됨**:
  - `lib/api/market/indices.ts` — `getMarketIndices(codes)`. **단, `/api/stock/price` BFF 를 지수 코드로 반복 호출**하는 임시 구현(주석에 "매퍼 정밀화는 화면 전환 PR 의 책임"으로 명시).
  - `hooks/market/useQueryIndices.ts` — `queryKeys.market.indices(codes)` + `queryConfig.market.indices`(staleTime 10s / gcTime 5min).
  - **이 훅은 현재 어떤 화면에서도 호출되지 않는다**(page 는 server + mock).
- KIS 클라이언트(`lib/api/kis/`)는 `price`(현재가/일자별) · `search`(symbols.json) · `token` 만 구현. **지수 전용 호출(`inquire-index-price`)·타입·매퍼는 미구현**.

### 1.3 문제

1. `getMarketIndices` 가 `/api/stock/price`(TR `FHKST01010100`, `FID_COND_MRKT_DIV_CODE=J`)로 지수 코드를 조회한다. 지수는 **별도 TR `FHPUP02100000` + `FID_COND_MRKT_DIV_CODE=U`** 가 필요하며, 응답 스키마도 다르다(`stck_prpr` 가 아니라 `bstp_nmix_prpr`). 즉 현재 어댑터는 **실호출 시 정상 동작 보장 없음** — 인터페이스만 정착된 상태.
2. `/market` 화면이 mock 을 직접 import 하는 server component 라 실데이터 진입점(훅)이 연결돼 있지 않다.
3. mock 지수 6종 중 4종(S&P 500 / NASDAQ / USDKRW / BTC Dominance)은 국내업종지수 엔드포인트로 **원천적으로 조달 불가** → 본 트랙에서 카드에서 제거하고 국내 3종만 남긴다(§9 q1=a 결정). 4종은 별도 트랙 예정.

### 1.4 컨텍스트 메모

- KIS 응답 함정: `inquire-index-price` 에는 종목명 필드가 없다(업종 자체가 식별자). 지수명은 **클라이언트 상수 매핑**(`0001`→"KOSPI" 등)으로 해결 — 종목 단위가 아니라 종목명 API 불필요. (cf. 종목 리스트가 화면에 추가되는 경우에만 `search-stock-info`(`prdt_abrv_name`) 필요 — §9 q3.)
- KIS 컨벤션: 모의 포트 `:29443`, 실전계좌(72245021) 안전장치 다중 게이트는 **주문 API 한정** — 본 PRD 는 read-only 라 무관.

---

## 2. 목표 (측정 가능)

- `/market` 의 **국내 지수 카드(KOSPI/KOSDAQ/KOSPI200 3종)** 가 `KIS_ENV=prod` + 키 설정 시 KIS `inquire-index-price` 실데이터로 렌더된다(현재가·전일대비·등락률 최소 3필드). 카드 grid 는 6종 → **국내 3종** 구성으로 축소(해외/환율/코인 4종 제거).
- `KIS_ENV !== "prod"` 또는 키 미설정 시 mock fallback 으로 **화면 회귀 0**(이중 게이트) — 빌드·렌더 정상, 사용자 노출 카피 동일 톤. 3종 중 일부만 실패 시 `Promise.allSettled` 부분 성공(성공분만 표시).
- BFF 응답에 `X-Data-Source`(`kis`/`mock`/`mock-timeout`) + `X-KIS-Env` 헤더가 실린다(`stock-api-integration` 선례 정합).
- 지수 응답 캐싱 TTL 이 단일 진실 원천(`queryConfig.market.indices`)을 따른다 — staleTime **30s**(§9 q7=b)로 장중 과호출·rate limit 보호.
- `npm run typecheck && npm run lint && npm run build` 0 에러, 신규 매퍼 단위 테스트 통과.

---

## 3. 범위 (In Scope)

### 3.1 KIS 지수 호출 추가 (`lib/api/kis/index-price.ts` 신설)

- `fetchIndexPrice(code: string): Promise<MarketIndexQuote>` 신설.
  - `GET /uapi/domestic-stock/v1/quotations/inquire-index-price`, TR_ID `FHPUP02100000`.
  - params: `FID_COND_MRKT_DIV_CODE=U`, `FID_INPUT_ISCD=<code>`(`0001`/`1001`/`2001`).
  - auth 헤더 빌드는 `price.ts` 의 `buildAuthHeaders` 패턴 답습(`custtype: "P"`). 공통화 가능하면 추출하되 **본 PRD 범위는 지수 한정** — price.ts 리팩터링은 비범위(§4).
  - `rt_cd !== "0"` → `makeKisBusinessError(msg1, msg_cd)`. 네트워크 오류 → `makeKisTransportError`.
- 응답 타입 `KisInquireIndexPriceOutput`(`lib/api/kis/types.ts` 에 추가): `bstp_nmix_prpr` · `bstp_nmix_prdy_vrss` · `prdy_vrss_sign` · `bstp_nmix_prdy_ctrt` · `acml_vol` · `acml_tr_pbmn` · `bstp_nmix_oprc/hgpr/lwpr` · `ascn_issu_cnt` · `down_issu_cnt` · `stnr_issu_cnt` · `uplm_issu_cnt` · `lslm_issu_cnt` · `dryy_bstp_nmix_hgpr/lwpr` (전체 string).
- `lib/api/kis/index.ts` 에서 `fetchIndexPrice` + 타입 re-export (read-only 만 export 하는 안전장치 주석 정합 — 주문 함수 추가 금지).

### 3.2 지수 매퍼 (`lib/api/kis/mappers.ts` 확장 또는 `index-price` 전용)

- `mapIndexPrice(output, code): MarketIndexQuote` 신설.
  - `bstp_nmix_prpr` → `value`(number), `bstp_nmix_prdy_vrss` → `change`, `bstp_nmix_prdy_ctrt` → `changePercent`, `prdy_vrss_sign` → `direction`(기존 `mapDirection` 재사용: "1"/"2"→up, "4"/"5"→down, else flat).
  - `acml_vol` → `volume`, `acml_tr_pbmn` → `tradeAmount`(number, 거래대금).
  - 상승/하락/보합 종목수: `ascn_issu_cnt`/`down_issu_cnt`/`stnr_issu_cnt` → `advances`/`declines`/`unchanged`(number).
  - 지수명은 **클라이언트 상수 매핑**(`INDEX_NAME_BY_CODE`)으로 부여 — 응답에 종목명 없음. ⚠️ `extractStockName`/`bstp_kor_isnm` 미사용(지수는 종목이 아님).
  - `toNumber` 헬퍼 재사용(기존 mappers.ts).
- 단위 테스트(`lib/api/kis/__tests__/index-price.mappers.test.ts` 또는 기존 mappers.test.ts 확장):
  - `prdy_vrss_sign` 부호별 direction 매핑.
  - 숫자 문자열 → number 변환(콤마/빈값/NaN → 0).
  - 지수명 코드→이름 상수 매핑 정확성.

### 3.3 BFF 라우트 (`app/api/market/indices/route.ts` 신설)

- `GET /api/market/indices?codes=0001,1001,2001`(또는 `?codes=0001&codes=1001`). codes 미입력 시 `DEFAULT_INDEX_CODES = ["0001","1001","2001"]`(국내 3종).
- **이중 게이트(§9 q5=a)**: `isKisConfigured()` 미설정 **또는** `resolveKisEnv() !== "prod"` → mock 반환 + `X-Data-Source: mock`(신규 `getMockMarketIndices()` 사용 — §3.6). 지수는 모의 미지원이므로 prod 가 아니면 KIS 호출 자체를 시도하지 않는다.
- 두 게이트 통과 시 codes 각각 `fetchIndexPrice` 호출 → `MarketIndexQuote[]` 반환 + `X-Data-Source: kis` + `X-KIS-Env: <env>`.
- **부분 성공(§9 q4=a)**: `Promise.allSettled` 로 codes 병렬 호출 → 성공분(`fulfilled`)만 반환, 실패분은 결과에서 제외(화면에서 카드 제외 또는 "—"). 전체 실패 시에만 에러/타임아웃 처리.
- BFF 5s 타임아웃 가드(`withTimeout`, `stock/price/route.ts` 패턴) → 타임아웃 시 mock + `X-Data-Source: mock-timeout` + `X-Error` 한글 메시지.
- 4xx 메시지 통과 / 5xx 한글 fallback / `Cache-Control: no-store`(클라이언트 TTL 은 TanStack Query 가 관리).

### 3.4 도메인 어댑터 재배선 (`lib/api/market/indices.ts` 수정)

- 현재 `fetchStockPriceClient(code)` 반복 호출 → **`/api/market/indices` BFF 단일 호출**로 교체.
  - `fetchMarketIndicesClient(codes): Promise<MarketIndexQuote[]>` — `httpClient.get("/market/indices", { params })`.
- `MarketIndexQuote` 타입을 지수 친화 스키마로 재정의(현재 `= StockPrice` alias):
  - `code`(지수코드) · `name`(상수 매핑) · `value`(number) · `change` · `changePercent` · `direction` · `volume` · `tradeAmount?` · `advances?`/`declines?`/`unchanged?` · `open?`/`high?`/`low?` · `yearHigh?`/`yearLow?`.
- `getMarketIndices` 시그니처(codes 기본값·빈배열 처리)는 유지 — 기존 테스트(`lib/api/market/__tests__/indices.test.ts`) 호환되게 조정.

### 3.5 훅 + 화면 배선 (`hooks/market/useQueryIndices.ts` 유지 + page 전환)

- `useQueryIndices` 는 시그니처 유지(반환 타입이 새 `MarketIndexQuote[]` 로 자연 갱신). `queryKeys.market.indices` 그대로. `queryConfig.market.indices` 의 **staleTime 을 10s → 30s 로 상향**(§9 q7=b, 단일 진실 원천 1줄 변경).
- `app/(main)/market/page.tsx` 또는 `MarketPage` 를 **client 경계 분리**:
  - 방안 A(권장): page 는 server 유지, `IndicesCard` 를 감싸는 **`IndicesCardContainer`(client)** 신설 — `useQueryIndices()` 로 데이터 fetch → 로딩/에러/성공 분기 → `IndicesCard` 에 props. `ThemesCard`(테마) 는 **mock 유지**(§9 q2=a — 테마는 별도 트랙).
  - 커스텀훅 의무화(frontend.md §1) 준수 — 컴포넌트는 `useQueryIndices` 만 소비, `useQuery` 직접 호출 금지.
- `IndicesCard` 의 `MarketIndex`(표시 모델) 와 어댑터 `MarketIndexQuote`(데이터 모델) 사이 **표시 변환은 컨테이너 또는 표시 유틸**에서 수행: `value`(number)→`"2,750.23"`(`toLocaleString`/`formatNumber`), `changeDisplay`(`formatPct`/부호), `isUp`(`direction === "up"`). copy 상수는 `lib/copy/market/labels.ts`.

### 3.6 mock fallback (`lib/mock/market/indices.ts` 보강)

- 현재 mock 은 표시 모델(`MarketIndices` = `MarketIndex[]`). BFF 가 반환할 **데이터 모델(`MarketIndexQuote[]`) mock** 신설: `getMockMarketIndices(codes)` — 코드별 `value/change/changePercent/direction/volume` 등 정합 fixture(KOSPI/KOSDAQ/KOSPI200 3종만). 사용자 노출 한글 카피 0건(식별자만 — frontend.md §3).
- 표시 모델 mock(`MARKET_INDICES_MOCK`)은 **국내 3종(KOSPI/KOSDAQ/KOSPI200)만 남기고 해외/환율/코인 4종 제거**(§9 q1=a). 제거된 4종은 별도 트랙(`market-foreign-data` 가칭)에서 자체 mock/소스로 다룬다.

### 3.7 로딩 / 에러 / 빈 상태 카피

- 로딩 — IndicesCard 영역 스켈레톤(2-col grid placeholder). 기존 v8 토큰(`bg-surface-muted` 등) 재사용.
- 에러 — 카드 내 인라인 한글 안내(예: "지수 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.") + 재시도 트리거(선택). copy 는 `lib/copy/market/labels.ts`.
- 빈 — codes 결과 0건 시 안내. (실무상 드묾 — 디펜시브.)

### 3.8 환경변수

- 신규 환경변수 없음 — `stock-api-integration` 의 `KIS_APP_KEY`/`KIS_APP_SECRET`/`KIS_ENV` 재사용. `inquire-index-price` 가 **실전 전용**이므로 **`KIS_ENV !== "prod"` 면 무조건 mock fallback**(키가 있어도 — §9 q5=a). 게이트 = `isKisConfigured()` **AND** `resolveKisEnv() === "prod"` 이중 조건 통과 시에만 KIS 실호출.

---

## 4. 비범위 (Out of Scope)

- **해외 지수(S&P 500/NASDAQ) · 환율(USDKRW) · 코인(BTC Dominance) 실데이터 — 본 트랙 비범위, 별도 트랙 예정(소스 리서치 중)** — `inquire-index-price` 조달 불가. 별도 소스(overseas-stock / 환율 API / 코인 API)가 제각각이라 별도 트랙(`market-foreign-data` 가칭)에서 다룬다. 본 PRD 는 이 4종을 카드에서 **제거**(§9 q1=a).
- **인기 테마/섹터(ThemesCard) 실데이터** — KIS 단일 엔드포인트로 "테마" 개념 조달 불가(테마는 큐레이션/집계 필요). 본 트랙은 **ThemesCard mock 유지**, 테마는 별도 트랙(`market-themes-data` 가칭)에서 다룬다(§9 q2=a).
- **종목 단위 리스트**(지수 구성종목·등락 상위 등) — 현재 `/market` 화면에 없음. **본 트랙에서 추가하지 않고 현행 IA 유지**(§9 q3=a). 추가 시 `search-stock-info`(`prdt_abrv_name`)로 종목명 해결 필요 → 별도 트랙.
- **price.ts 의 auth 헤더 공통화 리팩터링** — 회귀 위험. 본 PRD 는 지수 호출 신설만.
- **주문 / 매매 API** — 프로젝트 정책상 미구현. read-only 만.
- **WebSocket 실시간 지수** — 폴링(TanStack Query staleTime) 으로 충분. 실시간 PRD 별도.
- **디자인 토큰 신규 추가** — 기존 v8 토큰 재사용.

---

## 5. 수용 기준 (AC)

> 검증 명령은 저장소 루트에서 실행.

### AC-1 KIS 지수 호출 모듈 존재
- `find lib/api/kis -name "index-price.ts"` → 1건.
- `git grep -n "FHPUP02100000" lib/api/kis` → 1건 이상.
- `git grep -n "FID_COND_MRKT_DIV_CODE: \"U\"\|FID_COND_MRKT_DIV_CODE:\"U\"" lib/api/kis` → 1건(업종 코드 U).

### AC-2 BFF 지수 라우트 존재 + 헤더
- `find app/api/market/indices -name "route.ts"` → 1건.
- `git grep -n "X-Data-Source" app/api/market/indices/route.ts` → 1건 이상.
- `git grep -n "X-KIS-Env" app/api/market/indices/route.ts` → 1건.
- `git grep -n "isKisConfigured" app/api/market/indices/route.ts` → 1건(mock 분기).

### AC-3 KIS 직접 호출 없음 (BFF 경유)
- `git grep -n "inquire-index-price" components hooks app/\(main\)` → 0건(화면/훅이 KIS 직접 호출 안 함).
- 어댑터(`lib/api/market/indices.ts`)는 `httpClient`(same-origin `/api`)만 사용 — `git grep -n "getKisClient\|fetchIndexPrice" lib/api/market` → 0건.

### AC-4 도메인 한 뎁스 + queryKeys + 커스텀훅 정합 (frontend.md §1·§7)
- `git grep -n "queryKeys.market.indices" hooks/market/useQueryIndices.ts` → 1건.
- `git grep -rn "useQuery(" components/market` → 0건(컴포넌트는 커스텀훅만 소비).
- `git grep -n "useQueryIndices" components/market` → 1건 이상(컨테이너가 훅 소비).

### AC-5 지수 매퍼 회귀 차단 (단위 테스트)
- `npm run test -- index-price` (또는 mappers 테스트) 통과.
- 테스트가 다음을 커버: ① `prdy_vrss_sign` "1/2"→up, "4/5"→down, else flat ② 숫자 문자열→number(빈값/NaN→0) ③ 지수코드→지수명 상수 매핑 ④ 지수명에 `bstp_kor_isnm`(업종명) 미사용.

### AC-6 mock fallback 동작 (환경변수 미설정 시)
- `KIS_APP_KEY` 미설정 상태에서 `GET /api/market/indices` → 200 + `X-Data-Source: mock` + `MarketIndexQuote[]` 본문(수동 또는 route 단위 테스트).
- `git grep -n "getMockMarketIndices" lib/mock/market` → 1건.

### AC-7 화면 종단 실데이터 (수동, prod 키 설정 시)
- `KIS_ENV=prod` + 키 설정 후 `/market` 진입 → IndicesCard 의 국내 지수가 실데이터 렌더(현재가·전일대비·등락률). DevTools Network 에서 `/api/market/indices` 응답 헤더 `X-Data-Source: kis` 확인.

### AC-8 캐싱 TTL 정합 (DevTools Network 수동)
- `queryConfig.market.indices` 의 staleTime = **30s**(§9 q7=b). `git grep -n "staleTime" lib/query/queryConfig.ts` → market.indices 가 30s(예: `30 * 1000`).
- `/market` 재진입 시 staleTime(30s) 내 추가 `/api/market/indices` 요청 없음. `git grep -n "queryConfig.market.indices" hooks/market/useQueryIndices.ts` → 1건.

### AC-9 표시 변환 정합
- IndicesCard 에 number→천단위 콤마 표시, 등락률 부호+퍼센트, 한국식 색(상승 빨강/하락 파랑 — `signal-up-text`/`signal-down-text`) 적용. `git grep -n "signal-up-text\|signal-down-text" components/market/IndicesCard.tsx` → 유지.

### AC-10 typecheck / lint / build 0 에러
- `npm run typecheck` → 0. `npm run lint` → 0. `npm run build` → 0(Turbopack 일상 build).

### AC-11 화면 회귀 0 (수동, 양 뷰포트)
- 모바일/데스크탑 양 뷰포트에서 `/market` 레이아웃(grid, 카드 셸) 회귀 0. IndicesCard 가 **국내 3종(KOSPI/KOSDAQ/KOSPI200)** 으로 렌더(해외/환율/코인 4종 제거 반영). ThemesCard 변경 0(§9 q2=a mock 유지).

### AC-12 부분 성공 + 이중 게이트 (route 단위 테스트)
- BFF 가 `Promise.allSettled` 로 부분 성공 처리(§9 q4=a): codes 중 1건 실패 fixture → 성공분만 본문 반환, 200 유지. `git grep -n "allSettled" app/api/market/indices/route.ts` → 1건.
- 이중 게이트(§9 q5=a): `git grep -n "resolveKisEnv\|isKisConfigured" app/api/market/indices/route.ts` → 둘 다 존재. `KIS_ENV` 가 prod 아님 + 키 설정 상태에서 `GET /api/market/indices` → `X-Data-Source: mock`(KIS 실호출 안 함).

---

## 6. 가정 · 제약

- **선행 전제**: `stock-api-integration` PR-A/B/C 머지 완료(main 정합). `lib/api/kis/{client,token,errors,mappers}` · `httpClient` · `queryConfig`/`queryKeys` 인프라 존재 — 본 PRD 는 그 위에 지수 호출만 얹는다.
- **KIS `inquire-index-price` 는 실전 전용(모의 미지원)** · `tr_cont` 다음조회 불가 — 단건 object output. 폴링은 TanStack Query staleTime 으로 제어. 지수는 실시간성 요구가 낮아 **staleTime 을 10s → 30s 로 상향**(§9 q7=b) — rate limit 보호.
- **지수명은 응답에 없음** — 클라이언트 상수(`0001→KOSPI`, `1001→KOSDAQ`, `2001→KOSPI200`)로 매핑. 종목명 API 불필요.
- **실전 키 read-only** — 주문 API 미사용이라 실전계좌 안전장치(다중 게이트)는 본 PRD 무관.
- **도구 가정**: `npm run typecheck/lint/build/test` 동작. Turbopack 일상 build(bundle-analyzer 비호환은 무관).

---

## 7. 참고

- 현행 화면: `app/(main)/market/page.tsx` · `components/market/{MarketPage,IndicesCard,ThemesCard}.tsx`.
- 현행 인프라(PR-C): `lib/api/market/indices.ts` · `hooks/market/useQueryIndices.ts` · `lib/query/queryConfig.ts`(`market.indices`) · `hooks/query/queryKeys.ts`(`market.indices`).
- mock / 타입 / copy: `lib/mock/market/{indices,themes}.ts` · `lib/types/market/{indices,themes}.ts` · `lib/copy/market/labels.ts`.
- KIS 선례: `lib/api/kis/{price,mappers,types,client,token,errors}.ts` · `app/api/stock/price/route.ts`(BFF mock fallback + 타임아웃 + 헤더 패턴) · `lib/mock/stock/price.ts`.
- KIS 스펙: `docs/references/kis-api/domestic-stock-quotations.md` **§2-4**(`inquire_index_price`, 응답 필드표) · 공통 인증/헤더 `docs/references/kis-api/00-auth-and-common.md`.
- 선례 PRD: `docs/prd/stock-api-integration.md`(BFF+어댑터+매퍼+mock fallback+`X-Data-Source`/`X-KIS-Env` 컨벤션, 주문 안전장치 §9 q4).
- 룰: `docs/rules/frontend.md`(§1 커스텀훅 · §3 copy · §7 queryKeys · 도메인 한 뎁스).

---

## 8. 영향 분석

### 8.1 변경 라인 추정

| 영역 | 파일 | 추정 라인 | 성격 |
|---|---|---|---|
| KIS 지수 호출 | `lib/api/kis/index-price.ts` (신규) | ~80 | 신규 |
| 지수 타입 | `lib/api/kis/types.ts` (+추가) | ~40 | 추가 |
| 지수 매퍼 | `lib/api/kis/mappers.ts` 또는 전용 (+추가) | ~50 | 추가 |
| kis index re-export | `lib/api/kis/index.ts` (+추가) | ~5 | 추가 |
| BFF 라우트 | `app/api/market/indices/route.ts` (신규) | ~90 | 신규(price 라우트 패턴 답습) |
| 어댑터 재배선 | `lib/api/market/indices.ts` (수정) | ~50 | 교체 |
| 훅 | `hooks/market/useQueryIndices.ts` (소폭) | ~5 | 타입 갱신 |
| TTL 상향 | `lib/query/queryConfig.ts` (`market.indices` staleTime 10s→30s) | ~1 | 수정(q7) |
| 화면 컨테이너 | `components/market/IndicesCardContainer.tsx` (신규) + page/MarketPage 배선 | ~80 | 신규 + 수정 |
| IndicesCard 표시 변환 | `components/market/IndicesCard.tsx` (소폭) | ~20 | 수정 |
| mock 데이터 모델 | `lib/mock/market/indices.ts` (+추가) | ~40 | 추가 |
| copy | `lib/copy/market/labels.ts` (+추가) | ~10 | 추가 |
| 단위 테스트 | `lib/api/kis/__tests__/*.test.ts` (+추가) | ~80 | 추가 |
| **합계** | | **~550** | |

### 8.2 PR 분할 권고

- 본 PRD 는 **단일 PR**(단일 PR 룰 적용). ~550 라인은 한 도메인(`market`) 내 응집된 수직 슬라이스(KIS 호출→BFF→어댑터→훅→화면)라 분할 시 중간 상태가 무의미(BFF 만 있고 화면 미연결 = PR-C 가 이미 겪은 "인터페이스만" 상태). 분할 안 함.
- 커밋 분할 권고(브랜치 내): ① `docs(prd): market-real-data`(본 PRD) → ② `feat(kis): inquire-index-price 호출+타입+매퍼+테스트` → ③ `feat(bff): /api/market/indices 라우트+mock` → ④ `feat(market): 어댑터 재배선+훅 배선` → ⑤ `feat(market): IndicesCard 실데이터 컨테이너+표시변환`.

### 8.3 회귀 위험

- **중**: `MarketIndexQuote` 타입을 `StockPrice` alias 에서 지수 친화 스키마로 변경 → `lib/api/market/__tests__/indices.test.ts` · 이를 import 하는 곳 깨질 수 있음. typecheck + 테스트 갱신 필수. (현재 `getMarketIndices` import 처: 어댑터 자신·훅·테스트만 — 화면 미연결이라 범위 좁음.)
- **저**: page 를 server→client 경계 분리 시 `/market` 렌더 회귀. IndicesCardContainer 만 client, 나머지 server 유지로 최소화.
- **저**: mock fallback 이 새 데이터 모델로 안 맞으면 키 미설정 환경에서 화면 깨짐 → AC-6 으로 차단.
- **외부 의존**: KIS `inquire-index-price` 가 실전 전용 — CI/로컬(키 없음)에서는 항상 mock 경로만 검증 가능. 실데이터 종단(AC-7)은 prod 키 보유자 수동 검증.

### 8.4 후속 PR 자연 연결

- **해외 지수/환율/코인 트랙(`market-foreign-data` 가칭)** — §9 q1=a 로 본 트랙에서 제거된 4종. 소스 리서치 진행 중.
- **테마/섹터 실데이터 트랙(`market-themes-data` 가칭)** — §9 q2=a.
- 지수 구성종목·등락 상위 종목 리스트(§9 q3=a 로 본 트랙 비범위, `search-stock-info` 종목명 해결).
- 거래량·상승/하락 종목수 셀 추가(§9 q6 후속, 필요 시 디자이너 1회 리뷰).
- 지수 TTL 운영 데이터 기반 재조정(`queryConfig` chore — 현 30s 기준).

---

## 9. OPEN QUESTION → 전부 RESOLVED (2026-05-29)

> q1~q7 모두 사용자 결정 완료. 결정 내용은 §0/§2/§3/§4/§6/§8 본문에 반영됨.

- **[RESOLVED] q1 — 해외/환율/코인 지수 처리 → (a) 국내 3종만 실데이터.** KOSPI(`0001`)/KOSDAQ(`1001`)/KOSPI200(`2001`)만 `inquire-index-price` 실데이터. 해외(S&P 500/NASDAQ)·환율(USDKRW)·코인(BTC Dominance) **4종은 본 트랙에서 카드에서 제거**. 이 4종은 데이터 소스가 제각각이라 **별도 트랙(`market-foreign-data` 가칭, 소스 리서치 진행 중)** 에서 다룬다. 반영: §0, §2, §3.3/§3.6, §4, §8.4.

- **[RESOLVED] q2 — 인기 테마/섹터(ThemesCard) → (a) mock 유지.** 테마는 데이터 소스 미정이라 본 트랙(지수 실데이터)과 분리. 별도 트랙(`market-themes-data` 가칭). 반영: §3.5, §4, §8.4.

- **[RESOLVED] q3 — 지수 외 종목 단위 리스트 → (a) 추가 안 함.** 현행 `/market` IA 유지. 지수 구성종목·등락 상위 리스트는 `search-stock-info`(종목명)·별도 rankings TR 필요 → 별도 트랙. 반영: §4, §8.4.

- **[RESOLVED] q4 — 지수 부분 실패 → (a) 부분 성공(`Promise.allSettled`).** 3종 중 일부 실패 시 성공분만 표시, 실패분은 카드에서 제외 또는 "—". 반영: §2, §3.3, AC-12.

- **[RESOLVED] q5 — `KIS_ENV=prod` 아닐 때 동작 → (a) 무조건 mock fallback.** `KIS_ENV !== "prod"` 면 키가 있어도 mock. 게이트 = `isKisConfigured()` **AND** `resolveKisEnv() === "prod"` 이중 조건(지수는 모의 미지원). 반영: §0, §3.3, §3.8, AC-12.

- **[RESOLVED] q6 — UX/UI 디자이너 합류 → (a) 미합류.** 기존 셀 3요소(지수명·현재가·등락률) 유지. 거래량·상승/하락 종목수는 후속(필요 시 디자이너 1회 리뷰). 따라서 본 PRD **다음 단계는 구현(backend + frontend)**. 반영: 헤더(UX/UI 디자이너: no), §8.4.

- **[RESOLVED] q7 — 지수 폴링 TTL → (b) 30s.** `queryConfig.market.indices` staleTime 10s → 30s 상향(rate limit 보호). 단일 진실 원천 1줄 변경. 반영: §2, §3.5, §6, AC-8.

---

산출물: `docs/prd/market-real-data.md`
