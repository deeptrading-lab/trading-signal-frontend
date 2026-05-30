# PRD — header-market-ticker (헤더 글로벌 마켓 티커 실데이터 전환)

> 데스크탑 헤더(`components/layout/Header.tsx`) 우측 글로벌 마켓 티커를
> mock 3건(KOSPI/NASDAQ/BTC) → **실데이터 5건**(코스피·코스닥·S&P500·NASDAQ 종합·BTC)으로 전환한다.
> 조회·분석 전용, 실전(prod) 키 정책. **UI 변경 경미**(디자이너 미합류, 기존 토큰·레이아웃 유지).

- **slug**: `header-market-ticker`
- **작성일**: 2026-05-30
- **OPEN QUESTION**: **전부 RESOLVED (2026-05-30, q1~q6 PM 권고 채택)** — §9 참조, 본문 반영 완료.
- **다음 단계**: **구현(backend + frontend)** — 디자이너 미합류(UI 경미).
- **티커 순서(고정)**: 코스피 → 코스닥 → S&P500 → NASDAQ(COMP) → BTC.
- **PR 정책**: 단일 PR (한 브랜치 한 PR 룰 복귀 — MEMORY `single-pr-rule-exception` 종료 확인).
- **UI 포함 여부**: **yes (경미)** — 헤더 티커 3건→5건, 로딩/부분실패 표시. 신규 디자인 토큰 0, 기존 `header-glass`/`signal-up`/`signal-down`/`hidden lg:flex` 그대로. 디자이너 합류 트리거 아님.

---

## 0. 한눈에

| 항목 | 내용 |
|---|---|
| 무엇 | 헤더 데스크탑 티커 mock → 실데이터 5건 (코스피·코스닥·S&P500·NASDAQ 종합·BTC 원화) |
| 데이터 소스 | KIS 국내지수(재사용) + KIS 해외지수(신설) + CoinGecko BTC(신설) |
| 신규 인프라 | `fetchOverseasIndex`(KIS 해외) · `lib/api/coingecko/`(BTC) · `app/api/market/ticker` 합성 BFF · `useQueryMarketTicker` 훅 · 헤더 client 컨테이너 분리 |
| 핵심 제약 | KIS 초당 유량 제한(EGW00201) → 소량 동시성/순차 + 소스별 TTL 캐싱 · `Promise.allSettled` 부분 성공 |
| 게이트 | 국내·해외 KIS = prod 이중 게이트 / BTC(CoinGecko) = KIS env 무관 별도 처리(키 없이 호출, 실패 시 mock) |
| UI | 경미 — 기존 토큰·레이아웃 유지, 디자이너 미합류 |

---

## 1. 배경 / 문제

### 1.1 사용자 의도 (verbatim 요약)
데스크탑 헤더 우측 글로벌 마켓 티커를 **mock(KOSPI/NASDAQ/BTC 3건) → 실데이터 5건**(코스피·코스닥·S&P500·NASDAQ·BTC)으로 전환. 조회·분석 전용 + 실전(prod) 키 정책.

### 1.2 현재 상태 (main 기준)
- `components/layout/Header.tsx` 가 `HEADER_MARKET_TICKERS` mock(`lib/mock/layout/marketTickers.ts`)을 직접 import 해 3건 렌더. `"use client"` 컴포넌트.
- 티커 영역은 `hidden lg:flex` **데스크탑 전용** — 모바일 영향 없음.
- 타입 `MarketTicker = { code, value, changePct, isUp }` (`lib/types/layout/marketTicker.ts`). `isUp` = 한국식 등락(상승=true→`signal-up` red, 하락=false→`signal-down` blue). `value` 는 사전 포매팅된 표시 문자열.
- **국내 지수 실데이터는 이미 구축됨** (`market-real-data` 트랙): `lib/api/kis/index-price.ts`(`fetchIndexPrice(code)`), `lib/api/kis/mappers.ts`(`mapIndexPrice`), `app/api/market/indices/route.ts`(이중 게이트 + `Promise.allSettled` 부분 성공 + `X-Data-Source`/`X-KIS-Env` 헤더 + 5s 타임아웃 + mock fallback), `lib/api/market/indices.ts`(어댑터), `hooks/market/useQueryIndices.ts`, `components/market/IndicesCardContainer.tsx`(client 데이터 경계 선례).
- **해외 지수·BTC 실데이터는 미구축.** 레퍼런스만 존재: `docs/references/market-foreign-data-sources.md`, `docs/references/kis-api/overseas-stock.md`.

### 1.3 문제
1. 헤더 티커가 mock 고정값이라 실제 시장과 무관 — 조회·분석 전용 서비스의 신뢰도 저하.
2. 국내 지수 파이프라인은 있으나 **해외 지수(S&P500/NASDAQ)·BTC** 호출 인프라가 없음 → 신설 필요.
3. KIS 4개 콜(코스피·코스닥·SPX·COMP) 동시 난사 시 초당 유량 제한(EGW00201)으로 일부 실패가 **라이브 재현**됨 → 동시성 제어·캐싱 필수.

### 1.4 컨텍스트 메모 (필수 인지)
- 스택: Next.js App Router + Tailwind v3 + TanStack Query v5 + axios + BFF(route handler). FE 컨벤션 `docs/rules/frontend.md` 8개 절 — 본 PRD 는 이 룰 안에서만 짠다(네이밍/커스텀훅 의무/도메인 한 뎁스/cn/layout/copy/queryKeys/반응형).
- KIS 클라이언트는 **서버 전용**(`lib/api/kis/client.ts`). 브라우저가 직접 import 금지 — BFF route 에서만. CoinGecko 도 동일(서버 전용, 키 노출 방지).
- 지수명은 응답에 없거나(국내) 신뢰 불가 → 상수 매핑(`INDEX_NAME_BY_CODE`)이 단일 진실. `bstp_kor_isnm`(업종명)을 종목/지수명으로 끌어쓰지 않는다(stock-api AC-10 회귀 정책).

---

## 2. 목표 (측정 가능)

1. 헤더 데스크탑 티커가 **실데이터 5건**(코스피·코스닥·S&P500·NASDAQ 종합·BTC 원화)을 표시한다 (prod 키 + CoinGecko 가용 시).
2. `Header.tsx` 가 `HEADER_MARKET_TICKERS` mock 을 **직접 import 하지 않는다**(`git grep` 0건) — 티커 부분은 client 컨테이너가 훅으로 데이터 조달.
3. 합성 BFF `/api/market/ticker` 가 5건을 `MarketTicker[]` 로 반환하고, **부분 성공**(BTC 실패해도 4개 지수 표시, 일부 KIS 실패해도 받은 것만)을 지원한다.
4. KIS 4콜이 **동시 난사되지 않고**(소량 동시성/순차) 소스별 TTL 캐싱으로 초당 유량 제한(EGW00201) 재현이 사라진다 (라이브 수동 확인).
5. `typecheck` / `lint` / `build` 0 에러. 신규 디자인 토큰 0건. 모바일·기타 라우트 회귀 0.

---

## 3. 범위 (In Scope)

### 3.1 KIS 해외지수 호출 신설 (`lib/api/kis/overseas-index.ts` 신설 — 가칭)
- `fetchOverseasIndex(code: string): Promise<MarketIndexQuote>` — `GET /uapi/overseas-price/v1/quotations/inquire-daily-chartprice`, **TR_ID = `FHKST03030100`**, `FID_COND_MRKT_DIV_CODE=N`(해외지수).
- **필수 파라미터**(레퍼런스 3-3 확정): `FID_INPUT_ISCD=<code>`, `FID_INPUT_DATE_1`(시작일 YYYYMMDD), `FID_INPUT_DATE_2`(종료일 YYYYMMDD), `FID_PERIOD_DIV_CODE=D`(일봉). → 날짜 범위는 호출 시점 기준 최근 N영업일(예: 오늘-10일~오늘)로 생성하는 헬퍼 포함. **주말/휴장 대비** 시작일을 충분히 당겨(예: 7~10일) 최신 영업일 종가가 반드시 포함되게 한다.
- 코드: **S&P500 = `SPX`, NASDAQ 종합 = `COMP`** (라이브 확정값 SPX 7580.06 / COMP 26972.62. `US500`/`.INX`/`IXIC`/`NDX` 는 본 트랙 비사용 — **§9 q3 확정: 종합 COMP, NDX 아님**).
- 응답 매핑: `output1`(요약) 의 `ovrs_nmix_prpr`(현재값)·`prdy_ctrt`(등락률)·`prdy_vrss_sign`(부호)·`hts_kor_isnm`(한글명, 표시엔 미사용 — 코드→이름 상수 사용). **일봉 종가 기준**(미국장 마감값). `output1` 에 현재값/등락이 비면 `output2`(시계열 배열) 의 최신 원소 종가로 폴백.
- 매퍼: `MarketIndexQuote`(기존 타입 재사용) 또는 해외 전용 슬림 타입으로 매핑. `toNumber`/`mapDirection` 규약은 기존 `mappers.ts` 와 동일하게(부호 1·2=up / 4·5=down / 그 외 flat). 신규 응답 타입 `KisOverseasDailyChartOutput`(가칭) 을 `lib/api/kis/types.ts` 에 추가.
- 해외 지수명 상수: `OVERSEAS_INDEX_NAME_BY_CODE = { SPX: "S&P500", COMP: "NASDAQ" }` 류를 `types.ts` 또는 매퍼에 추가(`INDEX_NAME_BY_CODE` 와 동일 패턴, 종목명 API 미사용).
- `lib/api/kis/index.ts` 에 `fetchOverseasIndex` + 신규 타입 export 추가.

### 3.2 CoinGecko BTC 호출 신설 (`lib/api/coingecko/` 신규 도메인 — 한 뎁스)
- 서버 전용 모듈. `lib/api/coingecko/client.ts`(axios 인스턴스, 5s 타임아웃) + `lib/api/coingecko/btc.ts`(`fetchBtcKrw()`) + `lib/api/coingecko/types.ts`.
- `GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=krw&include_24hr_change=true` → `{ bitcoin: { krw: number, krw_24h_change: number } }`.
- **키 없이 동작 확인됨**(라이브). **§9 q2 확정(옵션)**: env `COINGECKO_API_KEY` 가 설정돼 있으면 헤더 `x_cg_demo_api_key` 부착, 없으면 무키 호출 + BFF 캐싱으로 한도 내 운영 — env 강제 추가 안 함. 무료 rate limit(~10–30/min) → **BFF 캐싱 필수**.
- 매핑: `{ value: krw, changePct: krw_24h_change, isUp: krw_24h_change >= 0 }` 형태로 BFF 가 `MarketTicker` 합성에 사용. (BTC 는 24h 등락이라 한국식 부호 대신 `change >= 0` 으로 up/down 직접 판정 — 보합 0 은 up 톤으로 흡수, 기존 2색 체계 유지.)
- ⚠️ CoinGecko 도메인은 KIS 와 분리 — KIS 클라이언트/env 와 무관(별도 client).

### 3.3 합성 BFF 라우트 (`app/api/market/ticker/route.ts` 신설)
- `GET /api/market/ticker` → `MarketTicker[]` 5건. 화면이 직접 소스를 호출하지 않는다(BFF 단일 진입).
- 합성 구성:
  - **국내**: `fetchIndexPrice("0001")`(코스피) + `fetchIndexPrice("1001")`(코스닥) — 기존 모듈 **재사용**.
  - **해외**: `fetchOverseasIndex("SPX")` + `fetchOverseasIndex("COMP")` — §3.1 신설.
  - **BTC**: `fetchBtcKrw()` — §3.2 신설.
- **이중 게이트(KIS 분)**: `isKisConfigured()` AND `resolveKisEnv()==="prod"` 통과 시에만 KIS 4콜 시도. 미통과 시 국내·해외 지수는 mock fallback.
- **BTC 게이트(별도)**: KIS env 와 무관하게 시도(키 없이 호출 가능). 실패 시 BTC 만 mock.
- **부분 성공**: `Promise.allSettled` 로 묶어 성공분만 반영. BTC 실패해도 지수는 표시, 일부 KIS 실패해도 받은 것만. **5건 모두 실패 시에만 전체 mock degrade(§9 q6 확정 — `X-Data-Source: mock`/`mock-timeout`).** 명시적 에러 응답으로 승격하지 않는다.
- **동시성 제어(EGW00201 회피, §9 q5 확정)**: KIS 4콜을 **동시 난사하지 않는다** → **2개씩 청크 + 청크 간 짧은 지연**(watchlist 일괄조회 chunk 교훈 재사용). 라이브 EGW00201 재현 시 **완전 순차로 강등**. (해외는 일봉이라 캐시 적중률이 높아 실호출 빈도 자체가 낮음.)
- **소스별 TTL 캐싱(§9 q1 확정)**: BFF 측 in-memory(또는 `Cache-Control`) 캐싱으로 초당 한도 보호 — **국내 지수 30s / 해외 지수 10분 / BTC 3분**. 합성 응답 헤더에 `X-Data-Source`(kis/mock/mock-timeout 등) + `X-KIS-Env` 부착(기존 indices route 정합). 캐시 상태는 `X-Cache`(옵션) 노출.
- 5s 타임아웃 가드, 4xx 메시지 통과, 5xx/네트워크 한글 fallback — 기존 `app/api/market/indices/route.ts` 패턴 재사용.
- ⚠️ **순서 보장**: 부분 성공이라 결과 길이가 5보다 짧을 수 있고 순서가 섞일 수 있으므로, BFF 가 `[코스피, 코스닥, S&P500, NASDAQ, BTC]` **정해진 순서**로 정렬해 반환(헤더 표시 순서 일관).

### 3.4 도메인 어댑터 (`lib/api/market/ticker.ts` 신설)
- `getMarketTicker(): Promise<MarketTicker[]>` — same-origin `/api/market/ticker` 호출(`httpClient`). KIS/CoinGecko 직접 호출 import 금지(BFF 경유, AC 정합). 응답은 이미 `MarketTicker[]`.

### 3.5 훅 + 헤더 배선
- `hooks/market/useQueryMarketTicker.ts` 신설 — `useQuery`, `queryKey = queryKeys.market.ticker`, `queryFn = getMarketTicker`, TTL = `queryConfig.market.ticker`(신설), `retry: 1`, `refetchOnWindowFocus: false`. (커스텀훅 의무 — frontend.md §1.)
- `hooks/query/queryKeys.ts` 에 `market.ticker` 키 추가(인자 없음 — `["market","ticker"] as const`).
- `lib/query/queryConfig.ts` 에 `market.ticker.staleTime = 60s` 추가(§9 q1 확정 — 헤더 티커는 거시 표시용, 짧을 필요 없음).
- **헤더 client 컨테이너 분리(§9 q4 확정)**: `Header.tsx` 가 mock import 를 끊고, **티커 부분만** client 컨테이너 `components/layout/HeaderMarketTicker.tsx` 로 분리해 훅 소비. `IndicesCardContainer`/`WatchlistContainer` 선례 정합. 로딩(skeleton/placeholder)·부분 실패(받은 것만)·전체 실패(mock 5건 degrade — §3.7)·빈 상태 분기. 기존 `hidden lg:flex`·구분선(`w-px h-3 bg-border-line`)·`signal-up/down`·`▲/▼`·`tabular-nums` 마크업 유지. `Header.tsx` 는 `"use client"` 유지하되 mock 의존만 제거.
  - ⚠️ **Header server 화는 비범위(§9 q4)**: 본 트랙은 데이터 경계를 컨테이너로 분리하는 것까지만. Header 를 server 컴포넌트로 내리는 작업은 하지 않는다.

### 3.6 mock 갱신 (`lib/mock/layout/marketTickers.ts`)
- mock 을 **5건으로 갱신**(코스피/코스닥/S&P500/NASDAQ/BTC) — BFF fallback 및 미설정 환경 표시용. `MarketTicker[]` 형태 유지. 사용자 노출 한글 카피 0건(식별자만 — frontend.md §3).
- BFF 가 fallback 으로 쓸 수 있게 5건 fixture 를 `MarketTicker` 표준 형태로 둔다(value 는 표시 문자열, changePct 숫자, isUp 한국식). 단 BTC 는 24h 부호 기반.

### 3.7 로딩 / 에러 / 빈 상태 (헤더 한정, 카피 최소)
- 헤더 티커는 보조 정보이므로 **전체 페이지 에러로 승격 금지**. 로딩 시 skeleton/placeholder. 부분 실패 시 받은 것만.
- **전체 실패 시 mock degrade(§9 q6 확정)**: BFF 가 타임아웃/전체실패 시 `mock`/`mock-timeout` 으로 graceful degrade → 헤더는 **mock 5건을 표시(끊김 0)**. 영역을 숨기거나 명시적 에러 배지를 띄우지 않는다(에러 배지는 비범위 — §4).
- 노출 카피가 필요하면 `lib/copy/layout/` 에 둔다(frontend.md §3 — 컴포넌트 인라인 한글 금지).

---

## 4. 비범위 (Out of Scope)

- **환율(USD/KRW)**: 레퍼런스에 KIS 시장코드 `X` 로 조달 가능하나 본 헤더 트랙 비범위(코드 미확정). 별도 `market-foreign-data` 트랙.
- **NASDAQ-100(NDX)·다우(.DJI)·BTC Dominance**: 본 트랙은 S&P500(SPX)·NASDAQ 종합(COMP)·BTC 원화가격만. (BTC Dominance 는 `market-foreign-data` 트랙 `/global` 엔드포인트.)
- **`/market` 화면 지수 카드 확장**: `IndicesCardContainer`/`IndicesCard` 변경 없음. 본 트랙은 **헤더 티커만**.
- **모바일 티커 노출**: 현재 `hidden lg:flex` 데스크탑 전용 유지 — 모바일에 티커를 새로 노출하지 않는다(디자이너 미합류).
- **실시간 WS/폴링**: TanStack staleTime 기반 + 수동 새로고침/focus 갱신만. 폴링 인터벌·WebSocket 미도입.
- **주문/매매 API**: 영구 비범위(조회·분석 전용, 주문 코드 부재가 안전 경계).
- **디자인 토큰·레이아웃 변경**: 신규 토큰·색·간격 신설 금지. 기존 헤더 마크업 유지.
- **`COINGECKO_API_KEY` 강제**: 키 없이 동작하므로 env 필수화 안 함(옵션 — §9 q2).

---

## 5. 수용 기준 (AC)

### AC-1 KIS 해외지수 호출 모듈 존재
- `git grep -l "FHKST03030100" lib/api/kis/` 가 신규 모듈을 반환. `fetchOverseasIndex` 가 `lib/api/kis/index.ts` 에서 export 된다 (`git grep "fetchOverseasIndex" lib/api/kis/index.ts`).
- 해외지수 요청에 `FID_COND_MRKT_DIV_CODE=N`, `FID_PERIOD_DIV_CODE=D`, 날짜 범위 파라미터가 포함된다 (코드 리뷰 + 매퍼 단위 테스트).

### AC-2 CoinGecko 도메인 신설 (한 뎁스)
- `find lib/api/coingecko -type f` 가 `client.ts`/`btc.ts`/`types.ts` 를 반환. `fetchBtcKrw` 가 `simple/price?ids=bitcoin&vs_currencies=krw&include_24hr_change=true` 를 호출하고 `{krw, krw_24h_change}` 를 매핑한다 (코드 리뷰 + 단위 테스트).
- CoinGecko 모듈은 KIS 클라이언트를 import 하지 않는다 (`git grep "kis" lib/api/coingecko/` 0건, 주석 제외).

### AC-3 합성 BFF 라우트 존재 + 헤더 + 순서
- `find app/api/market/ticker -name route.ts` 가 존재. `GET /api/market/ticker` 가 `MarketTicker[]` 를 반환하고 `X-Data-Source` + `X-KIS-Env` 헤더를 부착한다 (route 단위 테스트).
- 결과는 항상 `[코스피, 코스닥, S&P500, NASDAQ, BTC]` 정의 순서를 따른다(부분 성공 시 누락분은 빠지되 상대 순서 유지) — route 단위 테스트.

### AC-4 직접 호출 없음 (BFF 경유)
- `lib/api/market/ticker.ts`(어댑터)·헤더 컨테이너가 `getKisClient`/`fetchIndexPrice`/`fetchOverseasIndex`/`fetchBtcKrw`/CoinGecko client 를 **직접 import 하지 않는다** (`git grep` 으로 확인 — 어댑터는 `httpClient` 만).

### AC-5 도메인 한 뎁스 + queryKeys + 커스텀훅 (frontend.md §1·§4·§7)
- `queryKeys.market.ticker` 가 `hooks/query/queryKeys.ts` 한 곳에 정의 (`git grep "ticker" hooks/query/queryKeys.ts`). 헤더 컨테이너는 `useQuery` 를 직접 import 하지 않고 `useQueryMarketTicker` 만 소비 (`git grep "@tanstack/react-query" components/layout/` 0건).
- `lib/api/coingecko/`·`hooks/market/`·`app/api/market/ticker/` 모두 도메인 한 뎁스 유지.

### AC-6 헤더 mock 직접 import 제거
- `git grep "HEADER_MARKET_TICKERS" components/layout/Header.tsx` 0건. mock 은 BFF fallback·미설정 환경에서만 경유.

### AC-7 mock fallback / 전체 실패 degrade (§9 q6 확정)
- `KIS_ENV` 미설정/`!=prod` 또는 키 미설정 시, BFF 가 국내·해외 지수를 mock 으로 응답(`X-Data-Source: mock`)하고 헤더가 5건(또는 BTC 라이브 + 지수 mock)을 끊김 없이 표시 (수동 + route 단위 테스트).
- **전체 실패(타임아웃 포함) 시**: BFF 가 `X-Data-Source: mock`/`mock-timeout` 으로 graceful degrade 하고 헤더는 **mock 5건을 표시(끊김 0)**. 영역 숨김·명시적 에러 배지 없음 (route 단위 테스트 + 수동).

### AC-8 부분 성공 + 이중 게이트 (route 단위 테스트)
- BTC 호출 실패를 주입해도 4개 지수가 반환된다. 일부 KIS 콜 실패를 주입해도 성공분만 반환된다. 5건 모두 실패 시에만 mock/에러 분기. KIS 분은 prod 가 아니면 실호출 0회(이중 게이트). BTC 는 KIS env 와 무관하게 호출 시도.

### AC-9 동시성 제어 — KIS 4콜 동시 난사 없음 (§9 q5 확정)
- 코드 리뷰: KIS 4콜이 단일 `Promise.all([...4...])` 동시 호출이 아니라 **2개씩 청크 + 청크 간 짧은 지연** 구조다(라이브 재현 시 순차 강등 여지). **prod 키 수동 검증**: 헤더 새로고침 반복 시 EGW00201(초당 거래건수 초과) 미재현 (수동 — prod 키 설정 시).

### AC-10 캐싱 TTL 정합 (수동 + 코드)
- `queryConfig.market.ticker.staleTime === 60s`(코드 — §9 q1 확정). BFF 소스별 TTL = 국내 30s / 해외 10분 / BTC 3분(코드). DevTools Network 로 연속 헤더 mount 시 staleTime(60s) 내 재호출 0회(수동).

### AC-11 표시 변환 정합 (한국식 등락 + BTC 부호)
- 지수 4건: `isUp = direction === "up"`(flat 은 하락 톤 흡수, 기존 2색 유지). BTC: `isUp = krw_24h_change >= 0`. `value` 는 천단위 콤마 포함 표시 문자열(기존 `formatNumber` 류 재사용), `changePct` 절댓값을 `▲/▼ {x.x}%` 로 렌더(기존 마크업 정합).

### AC-12 typecheck / lint / build 0 에러
- `npm run typecheck` && `npm run lint` && `npm run build` 모두 0 에러 (Turbopack — `build:analyze` 아님).

### AC-13 화면 회귀 0 (수동, 양 뷰포트)
- 데스크탑(`>= lg`): 티커 5건 표시·구분선·색·정렬 정상. 모바일(`< lg`): 티커 영역 여전히 비표시(`hidden lg:flex`), 헤더 레이아웃·프로필 아이콘·wordmark 회귀 0. 다른 라우트 영향 0.

### AC-14 매퍼 회귀 차단 (단위 테스트)
- 해외지수 매퍼: `prdy_vrss_sign` 1·2→up / 4·5→down / 그 외→flat, `output1` 비었을 때 `output2` 최신 종가 폴백을 검증. BTC 매퍼: `krw_24h_change` 음수→isUp false 를 검증. 지수명은 상수 매핑만 사용(응답 한글명 미사용) 검증.

---

## 6. 가정 · 제약

- **선행 머지 전제**: `market-real-data`(KIS 국내지수 — `fetchIndexPrice`/`mapIndexPrice`/`/api/market/indices`/`useQueryIndices`) + `stock-api-integration`(KIS client/token/env 인프라) **main 머지 완료**(확인됨, 커밋 #38~#40).
- **BE LIVE 가정**: prod 키로 코스피/코스닥/SPX/COMP 라이브 확정(2026-05-30). CoinGecko BTC 원화 라이브 확정(키 없이). 본 트랙은 그 위에서 합성·배선.
- **prod 키 정책**: 조회·분석 전용. `KIS_ENV=prod` 권장(지수·해외는 prod 전용). 주문 코드 부재가 안전 경계. CoinGecko 는 env 무관.
- **KIS 초당 유량 제한(EGW00201)**: 4콜 동시 난사 시 일부 실패 라이브 재현 → **2개씩 청크 + 짧은 지연**(§9 q5 확정, 라이브 재현 시 순차 강등) + 소스별 TTL 캐싱 의무.
- **캐싱 TTL 확정값(§9 q1)**: `queryConfig.market.ticker.staleTime = 60s`. BFF in-memory — 국내 지수 30s / 해외 지수 10분 / BTC 3분.
- **해외 일봉 특성**: 미국장 마감 종가 기준이라 장중 변동 없음 → 긴 TTL(10분) 적합. 날짜 범위는 휴장 대비 충분히(7~10영업일) 당겨 최신 종가 보장.
- **CoinGecko 무료 한도**: ~10–30 calls/min + 월 쿼터. BFF 캐싱(3분 TTL)으로 보호. Demo 키는 **옵션**(§9 q2 확정 — `COINGECKO_API_KEY` 있으면 헤더 부착, 없어도 무키 동작).
- **도구**: typecheck/lint/build = npm scripts(Turbopack). route·매퍼 단위 테스트는 기존 `__tests__` 패턴(`app/api/market/indices/__tests__/route.test.ts`, `lib/api/kis/__tests__/*.mappers.test.ts`) 재사용.
- **반응형**: 티커는 CSS `hidden lg:flex` — JS 뷰포트 분기 미사용(frontend.md §8).

---

## 7. 참고

### 코드 (재사용 / 확장 / 신설)
- `components/layout/Header.tsx` — 티커 렌더(`hidden lg:flex`, `signal-up/down`, `▲/▼`, `tabular-nums`). mock import 제거 대상.
- `lib/mock/layout/marketTickers.ts` · `lib/types/layout/marketTicker.ts` — mock 5건 갱신 / 타입 재사용.
- `lib/api/kis/index-price.ts` · `mappers.ts`(`mapIndexPrice`/`toNumber`/`mapDirection`) · `types.ts`(`MarketIndexQuote`/`INDEX_NAME_BY_CODE`) — 국내 재사용 + 해외 타입/상수 확장.
- `app/api/market/indices/route.ts` — 이중 게이트·`Promise.allSettled` 부분 성공·`X-Data-Source`/`X-KIS-Env`·5s 타임아웃·mock fallback **패턴 복제 원본**.
- `app/api/market/indices/__tests__/route.test.ts` — route 단위 테스트 패턴.
- `lib/api/market/indices.ts` · `hooks/market/useQueryIndices.ts` · `components/market/IndicesCardContainer.tsx` — 어댑터/훅/client 컨테이너 선례.
- `hooks/query/queryKeys.ts` · `lib/query/queryConfig.ts` — 키/TTL 추가 지점.
- `lib/api/kis/client.ts`(`getKisClient`/`resolveKisEnv`/`isKisConfigured`) · `lib/api/client.ts`(`httpClient`).
- `components/watchlist/WatchlistContainer.tsx` — client 컨테이너 분리 선례.

### 문서
- `docs/references/market-foreign-data-sources.md` — 해외/BTC 소스 비교 + 라이브 확정값(SPX/COMP/BTC).
- `docs/references/kis-api/overseas-stock.md` §3-3 — `inquire-daily-chartprice`(FHKST03030100, 시장코드 N) 파라미터·응답.
- `docs/rules/frontend.md` — FE 컨벤션 8개 절.
- `docs/prd/market-real-data.md` — 직전 동일 계열 PRD(양식·AC 분량 참고).
- MEMORY: `reference_kis-api-conventions.md`(스키마 함정·실전계좌 게이트), `reference_bundle-analyzer-turbopack.md`(build 는 Turbopack).

---

## 8. 영향 분석

### 8.1 변경 라인 추정
| 영역 | 파일 | 추정 LOC | 성격 |
|---|---|---|---|
| KIS 해외 호출 | `lib/api/kis/overseas-index.ts`(신설) | +90 | 신설 |
| KIS 해외 타입/상수 | `lib/api/kis/types.ts`(확장) | +35 | 확장 |
| KIS 해외 매퍼 | `mappers.ts`(확장) 또는 모듈 내 | +40 | 확장 |
| KIS index export | `lib/api/kis/index.ts` | +4 | 확장 |
| CoinGecko 도메인 | `lib/api/coingecko/{client,btc,types}.ts`(신설) | +110 | 신설 |
| 합성 BFF route | `app/api/market/ticker/route.ts`(신설) | +160 | 신설(패턴 복제) |
| 어댑터 | `lib/api/market/ticker.ts`(신설) | +25 | 신설 |
| 훅 | `hooks/market/useQueryMarketTicker.ts`(신설) | +30 | 신설 |
| queryKeys/Config | 2파일 | +10 | 확장 |
| 헤더 컨테이너 | `components/layout/HeaderMarketTicker.tsx`(신설) + `Header.tsx` 수정 | +90/−25 | 신설+수정 |
| mock | `lib/mock/layout/marketTickers.ts` | +15/−10 | 수정 |
| copy(옵션) | `lib/copy/layout/*` | +10 | 신설(필요 시) |
| 테스트 | route + 매퍼 `__tests__` | +180 | 신설 |
| **합계** | | **~+870 / −60** | |

### 8.2 PR 분할 권고
- **단일 PR 권고.** 5개 소스가 하나의 합성 BFF + 단일 헤더 배선으로 수렴하고, 부분 성공·순서 보장·동시성 제어가 한 route 의 책임이라 분할 시 중간 PR 이 동작 불완전(예: BFF 만 있고 헤더 미배선)해 회귀 검증이 어렵다. UI 변경이 경미(디자이너 미합류)해 한 PR 변경량(~870 LOC, 다수 신설)이 리뷰 가능 범위.
- 분할이 굳이 필요하면 (a) KIS 해외 + CoinGecko 인프라(호출/매퍼/테스트), (b) 합성 BFF + 어댑터 + 훅 + 헤더 배선 — 2단계가 자연 경계이나, **본 트랙은 단일 PR 룰 복귀 대상**이므로 단일 권고.

### 8.3 회귀 위험
- **EGW00201(초당 유량)**: 가장 큰 운영 위험. 동시성 제어 + 캐싱이 없으면 헤더 새로고침마다 4콜 난사 → 라이브 실패 재현. AC-9 로 차단.
- **순서/부분 성공 혼동**: `allSettled` 결과가 섞이면 티커 순서가 흔들림 → AC-3 정의 순서 정렬로 차단.
- **CoinGecko rate limit**: 캐싱 부족 시 429. 긴 TTL + 실패 시 BTC만 mock(부분 성공)으로 graceful.
- **헤더 mock 잔존**: `HEADER_MARKET_TICKERS` direct import 제거 누락 → AC-6 `git grep` 0건으로 차단.
- **모바일 회귀**: 티커는 `hidden lg:flex` 라 모바일 영향 0이어야 함 → AC-13 양 뷰포트 수동.
- **client 경계 누설**: KIS/CoinGecko client(서버 전용)를 헤더 client 컨테이너가 직접 import 하면 키 누설 → AC-4 로 차단(어댑터는 `httpClient` 만).
- **지수명 함정**: 해외 응답 `hts_kor_isnm` 을 표시명으로 끌어쓰면 stock-api 정책 위반 → 상수 매핑만(AC-14).

### 8.4 후속 PR 자연 연결 (PR 본문 `## 다음 작업` 후보 — frontend-dev 작성)
- `market-foreign-data` 트랙(환율 USD/KRW 시장코드 X + BTC Dominance `/global`) — `/market` 화면 확장.
- TTL 운영 데이터(`X-Data-Source` 분포) 기반 staleTime/소스별 캐싱 재조정.
- CoinGecko Demo 키 env 추가 여부 운영 판단(429 빈도 관찰 후).

---

## 9. OPEN QUESTION

> 사용자 결정 필요 항목. 각 항목에 **PM 권고** 동봉. 결정 시 `[OPEN QUESTION]` → `[RESOLVED]` 로 변경.
> **전체 결정 완료 (2026-05-30): 6개 항목 모두 PM 권고 채택. 본문(§2·§3·§5·§6) 반영 완료.**

- **[RESOLVED] q1 — 캐싱 TTL(헤더 티커 staleTime + BFF 소스별 TTL)** _(2026-05-30, PM 권고 채택)_
  - 헤더 티커는 거시 표시용·보조 정보. 해외는 일봉(장중 불변), BTC 는 분 단위 변동, 국내는 장중 변동.
  - **결정**: TanStack `queryConfig.market.ticker.staleTime = 60s`. BFF 소스별 in-memory TTL — 국내 지수 30s(`market.indices` 정합) / 해외 지수 10분(일봉, 거의 불변) / BTC 3분(CoinGecko 무료 보호 + 변동성 절충). 운영 후 §8.4 로 재조정. (§3.5·§5 AC-10·§6 반영.)

- **[RESOLVED] q2 — CoinGecko Demo 키(`COINGECKO_API_KEY`) env 추가 여부** _(2026-05-30, PM 권고 채택)_
  - 키 없이 라이브 동작 확인됨. Demo 키는 한도 상향(~30/min) 효과.
  - **결정**: env 는 **옵션**으로 코드만 지원 — `COINGECKO_API_KEY` 설정 시 `x_cg_demo_api_key` 헤더 부착, 없으면 무키 호출 + BFF 긴 TTL 캐싱으로 한도 내 운영. 강제 추가 안 함(비범위). 429 빈도 관찰 후 추가 판단. (§3.2·§4·§6 반영.)

- **[RESOLVED] q3 — NASDAQ = 종합(COMP) vs NASDAQ-100(NDX)** _(2026-05-30, PM 권고 채택)_
  - 라이브 확정: COMP=26972.62 / NDX=30333.18 둘 다 유효. mock 기존 라벨은 "NASDAQ".
  - **결정**: **종합(COMP) 확정**(NDX 아님). 헤더 라벨 "NASDAQ"=종합지수가 일반 통념. NDX(나스닥100)는 파생 지표라 헤더 거시 표시엔 종합이 적합. (§3.1 코드 `COMP` 전제 확정, §4 NDX 비범위.)

- **[RESOLVED] q4 — 헤더 server/client 분리 방식** _(2026-05-30, PM 권고 채택)_
  - 현재 `Header.tsx` 는 `"use client"`. 티커 데이터 경계를 어디에 둘지.
  - **결정**: **티커 부분만 별도 client 컨테이너**(`components/layout/HeaderMarketTicker.tsx`)로 분리해 훅 소비(`IndicesCardContainer` 선례). `Header.tsx` 는 mock import 만 제거(현 `"use client"` 유지). Header 를 server 로 내리는 것은 **비범위**(데이터 경계 컨테이너화로 충분). (§3.5·§5 AC-5/AC-6 반영.)

- **[RESOLVED] q5 — KIS 동시성 전략(소량 동시 청크 vs 완전 순차)** _(2026-05-30, PM 권고 채택)_
  - EGW00201 회피 방법. 4콜(코스피/코스닥/SPX/COMP).
  - **결정**: **2개씩 청크 + 청크 간 짧은 지연**(watchlist chunk 교훈). 완전 순차는 응답 지연 누적(4×왕복), 동시 난사는 EGW00201. 절충으로 2-동시. 해외는 일봉이라 캐시 적중률이 높아 실호출 빈도 자체가 낮음. **라이브 재현 시 순차로 강등.** (§3.3·§5 AC-9 반영.)

- **[RESOLVED] q6 — 전체 실패 시 헤더 UX(영역 숨김 vs mock 표시 vs 에러 배지)** _(2026-05-30, PM 권고 채택)_
  - 헤더 티커는 보조 정보.
  - **결정**: **전체 실패 시 mock degrade** — BFF 가 타임아웃/전체실패 시 `mock`/`mock-timeout` 으로 graceful degrade 하면 헤더는 mock 5건 표시(끊김 0). 페이지 에러로 승격 금지. **명시적 에러 배지는 비범위**(보조 정보라 과함). (§3.3·§3.7·§4·§5 AC-7 반영.)

---

산출물: `docs/prd/header-market-ticker.md`
