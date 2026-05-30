# QA 리포트 — header-market-ticker (헤더 글로벌 마켓 티커 실데이터 전환)

- **slug**: `header-market-ticker`
- **PR**: #47 (`feature/header-market-ticker`)
- **PRD**: [`docs/prd/header-market-ticker.md`](../prd/header-market-ticker.md)
- **QA 일자**: 2026-05-30
- **환경**: KIS `KIS_ENV=prod`(`.env.local`, app key/secret/account 설정) / CoinGecko `COINGECKO_API_KEY` **미설정**(키리스 라이브 경로 입증) / Next.js 16.2.6 Turbopack / dev `127.0.0.1:3000`
- **판정**: **PASS** — 14/14 AC 통과. **5건 실데이터 확인 / EGW00201 0건 확인.**

> 본 트랙의 데이터 소스는 KIS REST + CoinGecko 로, FastAPI BE(`:8000`)와 무관하다.
> 따라서 라운드트립은 BE LIVE 대신 **KIS prod 키 + CoinGecko 키리스 라이브** 환경에서 재현했다.

---

## 1. AC 별 검증 표

| AC | 요지 | 방법 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | KIS 해외지수 모듈 존재 | `git grep` + 코드리뷰 | `FHKST03030100` 모듈 반환 + `fetchOverseasIndex` export + `FID_COND_MRKT_DIV_CODE=N`/`FID_PERIOD_DIV_CODE=D`/날짜범위 | `overseas-index.ts`·`types.ts` 반환, `index.ts` export 확인, route params `N`/`D`/`buildDateRange()` 확인 | PASS |
| AC-2 | CoinGecko 도메인 한 뎁스 + KIS 무관 | `find` + `git grep` | `client/btc/types.ts` 반환 + `simple/price?ids=bitcoin…` 매핑 + kis import 0 | 3파일 반환, `fetchBtcKrw` 파라미터 정합, kis 는 주석 2줄뿐 import 0건 | PASS |
| AC-3 | 합성 BFF + 헤더 + 순서 | `find` + 라이브 + 단위테스트 | route 존재, `MarketTicker[]` + `X-Data-Source`/`X-KIS-Env`, 순서 [코스피,코스닥,SPX,COMP,BTC] | route 존재, 라이브 `x-data-source: kis`/`x-kis-env: prod`, 5건 순서 정확 | PASS |
| AC-4 | 직접 호출 없음(BFF 경유) | `git grep` | 어댑터·컨테이너가 `fetchIndexPrice`/`fetchOverseasIndex`/`fetchBtcKrw`/client 직접 import 0 | 어댑터는 `httpClient` 만, 컨테이너는 훅만. 매치는 주석뿐 | PASS |
| AC-5 | 도메인 한 뎁스 + queryKeys + 커스텀훅 | `git grep` | `queryKeys.market.ticker` 1곳, 컨테이너 `@tanstack/react-query` 0 | 키 정의 확인, `components/layout/` 에 react-query import 0건 | PASS |
| AC-6 | 헤더 mock 직접 import 제거 | `git grep` | `Header.tsx` 에 `HEADER_MARKET_TICKERS` 0 | 0건. 사용처는 BFF route(fallback)·mock·PRD 뿐 | PASS |
| AC-7 | mock fallback / 전체 실패 degrade | 단위테스트 + 라이브 | 게이트 미통과 시 지수 mock, 전체 실패 시 `mock`/`mock-timeout` 5건 200 | route.test [AC-7] 전체실패→`mock` 5건, [AC-8] 게이트미통과→`mixed`. 라이브 정상 흐름 `kis` | PASS |
| AC-8 | 부분 성공 + 이중 게이트 | 단위테스트 | BTC 실패→지수 4건, 일부 지수 실패→나머지, prod 아니면 실호출 0, BTC 무관 호출 | route.test 4건 모두 green(BTC실패→4건, SPX실패→순서유지, vts→실호출0, 키미설정→BTC포함) | PASS |
| AC-9 | 동시성 — 4콜 동시 난사 없음 | 코드리뷰 + 단위테스트 + **prod 라이브** | 2개씩 청크+지연, EGW00201 미재현 | `KIS_CHUNK_SIZE=2`/`120ms` 청크 구조, test maxInFlight≤2. **라이브 연속 10회+만료후 5회 EGW00201 0건** | PASS |
| AC-10 | 캐싱 TTL 정합 | 코드 + 단위테스트 + 라이브 | `staleTime===60s`, BFF 국내30s/해외10분/BTC3분, 재호출 0 | queryConfig 60s 확인, CACHE_TTL_MS 정합, test 2번째 호출 실호출 0, 라이브 캐시적중 | PASS |
| AC-11 | 표시 변환 정합 | 코드 + 라이브 | 지수 `isUp=direction==="up"`, BTC `change>=0`, 천단위 콤마 + `▲/▼ x.x%` | assemble 로직 정합. 라이브: KOSPI▲(red)/KOSDAQ▼(blue)/BTC▼, value `8,476.15`/`110,737,098` | PASS |
| AC-12 | typecheck/lint/build 0 에러 | npm scripts | 모두 0 에러 | typecheck 0, lint 0, build 성공(`/api/market/ticker` ƒ 등록) | PASS |
| AC-13 | 화면 회귀 0(양 뷰포트) | SSR 마크업 + 토큰 검증 | 데스크탑 5건 표시, 모바일 `hidden lg:flex` 유지, 신규 토큰 0 | SSR `hidden lg:flex`·aria·header-glass·wordmark `lg:hidden`·프로필 정상. 토큰 전부 기존값 | PASS |
| AC-14 | 매퍼 회귀 차단 | 단위테스트 | 해외 부호/폴백, BTC 음수, 상수명 매핑 | overseas 10 tests + btc 6 tests green | PASS |

---

## 2. 자동화 검증 (명령·출력)

### 2.1 정적 grep (AC-1/2/4/5/6)

```
$ git grep -l "FHKST03030100" lib/api/kis/
lib/api/kis/overseas-index.ts
lib/api/kis/types.ts
$ git grep "fetchOverseasIndex" lib/api/kis/index.ts
lib/api/kis/index.ts:export { fetchOverseasIndex } from "./overseas-index";

$ find lib/api/coingecko -type f
lib/api/coingecko/types.ts / client.ts / btc.ts / __tests__/btc.test.ts
$ git grep -nE "import|require" lib/api/coingecko/ | grep -i kis
(0건 — KIS import 없음; 매치는 주석뿐)

$ git grep -n "@tanstack/react-query" components/layout/
(0건)
$ git grep "HEADER_MARKET_TICKERS" components/layout/Header.tsx
(0건)  ← 사용처: app/api/market/ticker/route.ts(fallback) · mock · PRD 만
```

`lib/api/market/ticker.ts` import = `httpClient` + `MarketTicker` 타입뿐(직접 소스 호출 0). AC-4 정합.

### 2.2 BFF 원칙 무회귀

```
$ git grep -nE "http://127\.0\.0\.1" -- app/
app/api/whitelist/search/route.ts:11  (route handler fallback — 제외 대상)
app/api/workbench/_adapters/fastapi.ts:7,32  (route handler adapter — 제외 대상)
```
→ 본 PR 신규 파일에서 추가된 직접 참조 **0건**. 합성 BFF route 는 KIS/CoinGecko 서버 모듈을 import(정상 BFF 경유).

### 2.3 typecheck / lint / build (AC-12)

```
$ npm run typecheck     → tsc --noEmit, 0 에러
$ npm run lint          → eslint ., 0 에러/경고
$ npm run build         → ✓ build 성공, /api/market/ticker ƒ(Dynamic) 등록
```

### 2.4 단위 테스트 (AC-3/7/8/9/10/14)

```
$ npx vitest run app/api/market/ticker lib/api/coingecko lib/api/kis/__tests__/overseas-index.mappers.test.ts
 ✓ lib/api/coingecko/__tests__/btc.test.ts (6 tests)
 ✓ lib/api/kis/__tests__/overseas-index.mappers.test.ts (10 tests)
 ✓ app/api/market/ticker/__tests__/route.test.ts (8 tests)
 Test Files  3 passed (3) | Tests  24 passed (24)

$ npx vitest run   (전체 회귀)
 Test Files  21 passed (21) | Tests  110 passed (110)
```
route.test 가 실제 `GET`/`collect`/`assembleTickers`/`resolveSource`/degrade 코드를 커버 →
AC-7(전체실패→`mock` 5건)·AC-8(부분성공·이중게이트·BTC무관)·AC-9(maxInFlight≤2)·AC-10(캐시 재호출 0) 결정적 검증.

---

## 3. 라운드트립 (KIS prod + CoinGecko 키리스 라이브)

> dev 서버 `npx next dev -p 3000` 본인이 기동(`.env.local` KIS prod 로드). 검증 후 종료.

### 3.1 ⭐ 5건 실데이터 + 헤더 (AC-3/11) — 1차 호출

```
$ curl -D - http://127.0.0.1:3000/api/market/ticker
HTTP 200 | 0.45s
cache-control: no-store
x-data-source: kis
x-kis-env: prod

[ {"code":"KOSPI",  "value":"8,476.15",     "changePct":3.55, "isUp":true },
  {"code":"KOSDAQ", "value":"1,074.80",     "changePct":-2.68,"isUp":false},
  {"code":"S&P 500","value":"7,580.06",     "changePct":0.22, "isUp":true },
  {"code":"NASDAQ", "value":"26,972.62",    "changePct":0.2,  "isUp":true },
  {"code":"BTC",    "value":"110,737,098",  "changePct":-0.44,"isUp":false} ]
count=5, codes=[KOSPI, KOSDAQ, S&P 500, NASDAQ, BTC]
```

- **5건 고정 순서 정확.** `X-Data-Source: kis` / `X-KIS-Env: prod`.
- mock 값(2,750.23 / 89,240,000)과 **다른 라이브 값** → 실데이터 확인. KOSPI/KOSDAQ=inquire-index-price, SPX/COMP=해외 inquire-daily-chartprice(시장코드 N), BTC=CoinGecko 원화.
- 한국식 등락 색: KOSPI 상승=`signal-up`(red), KOSDAQ 하락=`signal-down`(blue), BTC 하락=blue. (AC-11)
- BTC 110,737,098원 = **키리스 호출 라이브**(COINGECKO_API_KEY 미설정 확인). (§3.2 정합)

### 3.2 ⭐ EGW00201 회피 — 연속 10회 버스트 (AC-9, blocking)

```
$ for i in 1..10: curl /api/market/ticker
call 1~10: X-Data-Source=kis | count=5 | EGW00201-in-body=0   (전부)
$ grep -iE "EGW00201|초당 거래건수|거래건수를 초과" dev.log
>>> EGW00201 0건 (로그 클린)
```

### 3.3 EGW00201 회피 — 캐시 만료 후 실호출 버스트 (AC-9 강화)

국내 30s TTL 경과 후(실제 KIS 재호출 발생 구간) 5회 버스트:

```
post-expiry call 1~5: X-Data-Source=kis | count=5   (전부)
>>> EGW00201 0건 (만료 재호출 포함)
```

→ 캐시 적중 구간뿐 아니라 **실 KIS 재호출 구간에서도** 2개씩 청크+120ms 지연이 초당 한도를 지켜 **EGW00201 0건**. **blocking 기준 통과.**

### 3.4 부분/전체 실패 graceful (AC-7/8)

라이브에서는 전 소스 정상이라 정상 흐름(`kis`)만 관측. 실패 분기는 route 단위 테스트로 결정적 검증:
- BTC 실패 주입 → 지수 4건 + `X-Data-Source: mixed` (헤더 끊김 0). ✓
- SPX 실패 주입 → KOSPI/KOSDAQ/NASDAQ/BTC 4건 상대 순서 유지. ✓
- KIS 게이트 미통과(env=vts / 키 미설정) → 지수 실호출 0, BTC 라이브 합성 → `mixed`. ✓
- 5건 전부 실패 → `X-Data-Source: mock` 으로 mock 5건 200 degrade(끊김 0, 에러 배지 없음). ✓

### 3.5 헤더 화면 — 양 뷰포트 (AC-13)

SSR HTML(`GET /`) 마크업 검증(반응형은 CSS `hidden lg:flex`, JS 분기 미사용):

| 항목 | 실측 |
|---|---|
| 티커 래퍼 | `hidden lg:flex items-center gap-lg text-caption` 존재 — **데스크탑 표시 / 모바일(`<lg`) 숨김 유지** |
| aria | `aria-label="글로벌 마켓 시세"`(copy 모듈) + 로딩 시 `aria-busy` |
| 로딩 placeholder | 5슬롯 + 4구분선(`bg-border-line`/`bg-surface-muted`) — 동일 래퍼라 **레이아웃 시프트 0** |
| 구분선 | `w-px h-3 bg-border-line` (i>0) |
| 헤더 셸 | `header-glass sticky top-0` 고정 높이 — 회귀 0 |
| wordmark | `header-brand lg:hidden` — 데스크탑 비표시 정상 |
| 프로필 | `aria-label="프로필 메뉴"` 정상 |

데이터 hydration 후 placeholder → 실데이터 5건 swap 은 동일 `hidden lg:flex` 컨테이너 내부 교체 → 시프트 0. `Header.tsx` mock import 0 / 컴포넌트 useQuery 직접 import 0 / 신규 토큰 0 (모든 클래스가 구 `Header.tsx`에 존재했던 기존 토큰).

---

## 4. 에지 케이스

| 케이스 | 처리 | 결과 |
|---|---|---|
| 해외 `output1` 빈값 | `output2[0]` 최신 캔들 종가 폴백 | mapper test [#3] green |
| 해외 `output1`·`output2` 모두 빈값 | value/change/changePct 0, direction flat | mapper test [#2] green |
| `prdy_vrss_sign` 9(미정의) | flat(2색 흡수) | mapper test green |
| `hts_kor_isnm`="엉뚱한이름" | 상수 매핑만 사용(응답 한글명 미사용) | mapper test [#4] green |
| BTC `krw` 누락/NaN | `ApiError` throw → BFF 가 BTC 만 mock | btc test [#3] green |
| BTC `krw_24h_change` 0(보합) | isUp true(up 톤 흡수) | btc test green |
| CoinGecko 429/네트워크 | catch → null → BTC 만 mock(부분 성공) | route test green |
| BFF 타임아웃(5s) | `mock-timeout` degrade, 헤더 끊김 0 | 코드 + route test |
| StrictMode 더블 마운트 | `useQuery` 캐시 dedup + staleTime 60s | 컨테이너 훅 1개 소비 |
| 모듈 캐시(in-memory) | dev HMR 시 모듈 재평가로 초기화 — 운영 무관 | `resetTickerCacheForTest` 제공 |

---

## 5. 공통 게이트 무회귀

- **BFF 원칙**: 신규 파일 `127.0.0.1` 직접 참조 0건(기존 whitelist/workbench fallback 만, 제외 대상). 어댑터는 same-origin `httpClient`. ✓
- **한글 톤**: `HeaderMarketTicker.tsx` 인라인 한글 카피 0건(JSDoc 제외). 신규 카피 `HEADER_MARKET_TICKER_ARIA="글로벌 마켓 시세"` 는 `lib/copy/layout/navCopy.ts`(frontend.md §6 정합). ✓
- **접근성**: 티커 영역 `aria-label`(copy 경유) + 로딩 `aria-busy`, 구분선/placeholder `aria-hidden`. 프로필/wordmark aria 회귀 0. ✓
- **디자인 토큰**: 신규 토큰 0건 — 사용 클래스 전부 기존 `Header.tsx`/글로벌 토큰. ✓

---

## 6. 판정

- **14/14 AC PASS.**
- ⭐ **5건 실데이터 확인** (prod 키, `x-data-source: kis`, mock 과 다른 라이브 값).
- ⭐ **EGW00201 0건 확인** (연속 10회 + 캐시 만료 후 5회 실호출 버스트 모두 클린).
- 전체 회귀 110 tests green, typecheck/lint/build 0 에러.

→ **`qa-passed`** 라벨 부여 + `impl-ready` 제거. PR 본문 `## 다음 작업` 섹션 존재(머지 후 후속 명시) — handoff 게이트 충족.
