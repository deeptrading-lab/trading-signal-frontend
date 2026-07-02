# PRD — toss-market-data-adapter (시세·캔들·종목정보 토스증권 어댑터, KIS 하이브리드)

- 슬러그: `toss-market-data-adapter`
- 상태: 구현
- 작성: 2026-07-02 (PM 역할)
- 관련: 스모크 실측 `scripts/tossSmokeTest.mjs` (같은 브랜치 커밋), `docs/prd/stock-api-integration.md` (KIS 원 PRD)

## 1. 배경 / 문제

토스증권 Open API(`openapi.tossinvest.com`)가 신규 출시됐고, 2026-07-02 스모크 실측 결과가 KIS 대비 시세 레이어에서 우위다:

| 항목 | KIS | 토스 (실측) |
|---|---|---|
| 일봉 깊이 | 청크당 ~100봉 | **상장 전체** (005930: 1975-06-12~, 콜당 200봉 커서 페이징) |
| 과거 분봉 | 당일 + 과거일 tr 분리, 1콜 ~30봉 | **84거래일+ 확인** (콜당 200봉, 단일 커서) |
| 시세 | KRX 정규장 | **실시간 + NXT 애프터마켓(~20:00) + 미국 프리마켓** |
| 종목정보 | search-stock-info (prod 전용) | `/stocks` 한글명·상장주식수·NXT 플래그 (env 무관, 미국 포함) |
| 심볼 | 국내 6자리 | 국내 6자리 + 미국 티커 동일 엔드포인트 |

단, 토스에는 **지수(코스피/코스닥)·투자자 수급 API가 없고**, `/prices` 응답이 4필드(symbol/timestamp/lastPrice/currency)뿐이라 등락률·거래량은 일봉 캔들과 합성해야 한다. 또 **단일 활성 토큰**(재발급 시 기존 토큰 즉시 무효) 정책이라 토큰 캐시 인프라가 필수다.

→ 결론: 전면 교체 불가. **하이브리드** — 시세·캔들·종목정보만 토스 어댑터로 교체 가능하게 하고, 지수·수급은 KIS 잔존.

## 2. 목표 (측정 가능)

1. `MARKET_DATA_SOURCE=toss` 설정 시 종목 현재가·일봉·기간차트·분봉·종목정보가 토스 데이터로 서빙된다 (BFF 응답 스키마 무변경).
2. **토스 키 미설정이면(토글값과 무관하게) 기존 KIS 경로로 100% 동일 동작** — 같은 레포를 쓰는 다른 로컬 사용자는 `.env.local` 무수정으로 무영향.
3. 토스 경로 런타임 실패 시 해당 호출은 KIS로 폴백(warn 로그 1줄), KIS 미설정이면 에러 전파(기존 mock 분기 유지).
4. 시그널 엔진·스코어카드·BFF 라우트·프론트 코드 수정 0 (기존 `lib/api/kis/*` 함수 시그니처·반환 타입 유지).
5. 미국 티커 입력 시에도 어댑터 레벨은 동작(심볼 무관 설계) — UI/라우트의 미국 지원은 비범위.

## 3. 범위 (In scope)

### 3-1. 토스 클라이언트 인프라 (`lib/api/toss/`)

- `client.ts` — axios 인스턴스(base `https://openapi.tossinvest.com`, timeout 5s), `isTossConfigured()`(TOSS_CLIENT_ID/SECRET), `tossGet()` 헬퍼: `{result}` envelope unwrap + 429(`Retry-After` 대기, 최대 2회) + 401(`invalid-token`/`expired-token` → 토큰 강제갱신 후 1회 재시도) + 에러 envelope → `ApiError`(한글 fallback).
- `token.ts` — OAuth2 client credentials. **단일 활성 토큰 대응**: L1 인스턴스 메모리 + inflight dedupe + 만료 60s 전 갱신 + L2 공유 store(`getKisStore()` 재사용, 키 `toss:token:{sha256 16}`, 분산 락) — 다중 프로세스(dev+worker, Vercel 다인스턴스)가 토큰 1개로 수렴. `invalidateTossToken()` — 외부 재발급으로 죽은 토큰 폐기.
- `errors.ts` — `makeApiError` 래핑(토스 에러 code/requestId 보존, 한글 메시지).

### 3-2. 소스 토글 (`lib/api/marketdata/source.ts`)

- `resolveMarketDataSource(): "kis" | "toss"` — `MARKET_DATA_SOURCE === "toss"` **AND** `isTossConfigured()` 일 때만 `"toss"`, 그 외 전부 `"kis"`.
- `withTossFallback(label, tossFn, kisFn)` — 위 목표 2·3의 단일 구현 지점.

### 3-3. 어댑터 (`lib/api/toss/`) + 기존 KIS 함수 배선

기존 함수 본문 최상단에서 `withTossFallback` 위임. 반환 타입 동일:

| 기존 함수 (시그니처 유지) | 토스 구현 |
|---|---|
| `fetchStockPrice(ticker)` | `/prices` lastPrice + 일봉(count=3)으로 전일종가·당일 OHLCV 합성 → change/changePercent/direction/volume/open/high/low. name=`/stocks` 캐시(한글명) |
| `fetchStockPriceWithShares(ticker)` | 위 + `/stocks` `sharesOutstanding` |
| `fetchStockDaily(ticker, D/W/M)` | `/candles 1d` (W/M은 일봉 리샘플, 최근 ~30단위) |
| `fetchStockDailyChart(ticker, from, to, period)` | `/candles 1d` `before` 커서 범위 페치 + W/M 리샘플 (기존 `fetchDailyChunked` 무수정 호환) |
| `fetchTodayMinuteCandles` / `fetchMinuteCandlesForDate` / `fetchMinuteHistory` | `/candles 1m` 커서 페이징(콜당 200봉). 국내 심볼은 **KRX 정규장(09:00~15:30) 필터로 KIS 파리티** 유지. 기존 `resampleMinuteCandles`/`dropFillerBars` 재사용 |
| `fetchStockInfo(ticker)` | `/stocks` → `StockInfo` (KOSPI/KOSDAQ/KONEX 매핑, 정지=`krxTradingSuspended`) |

- 종목 마스터(`/stocks`)는 프로세스 내 24h TTL 캐시 — 현재가 경로의 name/상장주수 반복 조회 흡수.
- 분봉 리샘플 순수 함수는 `lib/api/kis/minuteResample.ts` 로 추출(순환 import 방지), `minuteChartChunked.ts` 가 re-export (기존 import 경로 무변경).
- 레이트리밋: candles 5/s — 페이지 간 250ms 간격 + 429 Retry-After 재시도.

### 3-4. env 문서화

`.env.local.example` — `MARKET_DATA_SOURCE`(기본/미설정=kis) 추가. 서버 전용.

## 4. 비범위 (Out of scope — FOLLOWUPS)

- **지수·수급·해외지수** — 토스 API 부재. KIS/Yahoo 잔존 (구조적).
- **관심종목 `fetchIntstockMultprice`** — 토스 `/prices`는 200종목/콜이지만 등락률 부재로 종목당 전일종가 콜(5/s)이 필요 → 콜드 로드가 라우트 5s 타임아웃 초과. 전일종가 KV/일단위 캐시 워밍 설계와 함께 후속 (§9 q2).
- **BFF 라우트 게이트/`X-Data-Source` 헤더** — `isKisConfigured()`·prod 이중게이트·헤더 문자열("kis") 무변경. 토스 모드에서도 KIS 키·게이트는 그대로 필요(하이브리드 전제).
- prod(Vercel) 반영 — 로컬 검증 후 별도 결정. 반영 시 Vercel env(TOSS_*, MARKET_DATA_SOURCE)만 추가하면 코드 준비는 본 PR로 완료.
- 미국 종목 UI/라우트/검색 시드/공시(SEC)/통화 포맷 — 별도 PRD.
- NXT 애프터마켓 분봉 활용(정규장 필터 해제 레버) — 관측 후 별도 결정.

## 5. 수용 기준 (AC)

- **AC-1 (무영향 기본값)**: TOSS 키 미설정 상태에서 `MARKET_DATA_SOURCE` 값과 무관하게 `/api/stock/price·daily·chart·chart-minute` 응답이 main 과 동일 (KIS 실호출 or mock).
- **AC-2 (토스 서빙)**: 키 + `MARKET_DATA_SOURCE=toss` 설정 시 위 4개 라우트가 토스 데이터로 200 응답, 스키마(`StockPrice`/`StockDailyCandle[]`) 동일.
- **AC-3 (등락률 합성)**: toss 현재가의 price=`/prices` lastPrice, change/changePercent=전일종가 대비 계산치 — KIS 응답과 방향 일치, 값 오차는 실시간 시차 범위 내.
- **AC-4 (캔들 동등성)**: 동일 종목·기간 일봉을 kis/toss 로 각각 조회 시 과거 확정 봉(전일 이전)의 OHLC가 일치 (수정주가 기준, 오차 허용 0 — 불일치 발견 시 §9 q1 판정).
- **AC-5 (분봉 파리티)**: toss 분봉이 09:00~15:30 밖 봉을 포함하지 않고, `YYYY-MM-DDTHH:mm` 키·오름차순·0거래량 필터 규약을 지킨다.
- **AC-6 (폴백)**: 토스 키를 잘못된 값으로 설정 시(=토스 호출 실패) 라우트가 KIS 데이터로 정상 응답 + 서버 로그에 `[marketdata]` warn.
- **AC-7 (기존 스위트)**: `npm run typecheck` / `lint` / `test` 전부 통과, 기존 테스트 무수정.
- **AC-8 (W/M 리샘플)**: toss `fetchStockDaily(W|M)` 가 주/월 단위 OHLCV 집계 규칙(첫봉 시가·극값·마지막 종가·거래량 합)을 지킨다 (단위 테스트).

## 6. 데이터 / API

- 토스: `POST /oauth2/token`, `GET /api/v1/candles|prices|stocks` (§1 실측 근거). 응답 전부 `{result}` 래핑, 숫자는 문자열.
- 캔들 timestamp 는 시장 로컬 자정 anchor 의 `+09:00` 표기(KR=`T00:00`, US=`T13:00`) — KST 변환 유틸(`Intl` Asia/Seoul) 경유로 date 키 생성 (서버 타임존 비의존).

## 7. 릴리즈 / 운영

- 로컬: `.env.local` 에 `MARKET_DATA_SOURCE=toss` 추가/제거로 즉시 전환(dev 재시작).
- 단일 활성 토큰 운영 수칙: 같은 client_id 로 **다른 토큰 캐시 주체**(스모크 스크립트 포함)를 동시에 돌리면 서로 무효화 → 401 재시도 로직이 흡수하지만, `npm run all`(dev+worker 2프로세스) 상시 병행 시 `KIS_TOKEN_STORE=kv` 권장.

## 8. 영향 분석

- **시그널 엔진/스코어카드/단타**: 캔들 배열 주입 구조라 코드 무영향. 단 toss 일봉 close 가 NXT 를 반영한다면 KIS(KRX 15:30 확정가)와 과거 봉이 다를 수 있음 → AC-4 실측으로 판정, 불일치 시 §9 q1.
- **BFF 라우트**: 수정 0. 타임아웃 내 수렴 확인 — daily(M) 최대 4콜(~2.5s < 5s), chart 청크당 1콜, 분봉 세션당 2~3콜(< 20s).
- **KIS 모듈**: 각 함수 최상단 1줄 위임 + 분봉 리샘플 파일 추출(re-export 로 경로 호환). 기존 테스트 무수정 통과가 무회귀 증거.
- **비용/쿼터**: 토스 무료·클라이언트 단위 TPS. 현재가 1콜→2콜(+캔들), 종목정보는 24h 캐시로 순감.

## 9. OPEN QUESTION

- **q1. toss 과거 일봉 close ≠ KIS close 케이스**: NXT 반영 여부 실측 후, 불일치면 스코어카드 채점 경로만 KIS 고정(함수 분리) 검토. — *PM 권고: E2E 대조 결과를 QA 리포트에 수치로 남기고, 불일치 0이면 그대로, 발견 시 후속 PR.*
- **q2. 관심종목 토스 전환**: 전일종가 일단위 캐시(KV) 워밍 설계 필요. — *PM 권고: 본 PR 비범위, 토스 모드 안정 확인 후 별도 트랙.*
- **q3. WTS client 추가 발급 가능 여부**: dev/prod client_id 분리가 되면 토큰 충돌 근본 해소. — *PM 권고: 사용자가 WTS 콘솔에서 확인.*
- **q4. NXT 애프터마켓 분봉 활용**: 정규장 필터를 env 레버로 열지. — *PM 권고: 단타 엔진의 세션 가정(09:00~15:30) 검토 후 별도 PRD.*
