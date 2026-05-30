# Market 해외 데이터 소스 리서치 (지수·환율·암호화폐)

> Market 화면에 표시할 **해외 지수(S&P500·NASDAQ)·환율(USD/KRW)·암호화폐(BTC Dominance)** 데이터를 BFF(서버)에서 어디서 조달할지 비교·추천한 리서치 노트. 조회 전용, 무료/저비용·한국 접근성 우선.

- **갱신일**: 2026-05-29
- **범위**: 별도 트랙 `market-foreign-data`(가칭) 입력용. **`market-real-data` 트랙 비범위** (해당 트랙은 KIS 국내 지수·시세 한정).
- **핵심 결론**: 지수·환율은 **이미 보유한 KIS prod 키로 추가 조달 가능**(키 재사용, 신규 발급 불필요). 암호화폐 BTC Dominance만 외부 소스(CoinGecko) 필요.

---

## 0. TL;DR 추천 조합

| 항목 | 추천 소스 | 이유 (1줄) |
|---|---|---|
| 해외 지수 (S&P500·NASDAQ·Dow) | **KIS `inquire-daily-chartprice` (해외지수, 시장코드 `N`)** | 보유 prod 키 재사용·키/한도 추가 부담 0·국내 지수와 동일 클라이언트 |
| 환율 (USD/KRW) | **KIS `inquire-daily-chartprice` (환율, 시장코드 `X`)** | 동일 엔드포인트로 환율도 조달, 단일 클라이언트로 통합 |
| 암호화폐 (BTC Dominance) | **CoinGecko `/global` (Demo 무료 플랜)** | dominance 전용 필드(`market_cap_percentage.btc`) 제공·무료·키 무료 발급 |

> 즉 **KIS 1개 + CoinGecko 1개**로 4종(S&P500/NASDAQ/USD-KRW/BTC.D) 전부 커버. 환율 백업으로 한국수출입은행 또는 open.er-api.com 권장.

---

## 1. 해외 지수 (S&P500 · NASDAQ)

### 1순위 확인: KIS 자체 해외 지수 제공 여부 → **제공함 (확정)**

KIS Open API 공식 GitHub(`koreainvestment/open-trading-api`)의 LLM 예제에서 확정:

- **엔드포인트**: `/uapi/overseas-price/v1/quotations/inquire-daily-chartprice`
  ([해외주식] 기본시세 > **해외주식 종목_지수_환율기간별시세(일/주/월/년)** `v1_해외주식-012`)
- **파라미터**:
  - `fid_cond_mrkt_div_code`: **`N` = 해외지수**, `X` = 환율, `I` = 국채, `S` = 금선물
  - `fid_input_iscd`: 종목코드 (해외주식 마스터 코드 참조)
  - `fid_period_div_code`: `D`/`W`/`M`/`Y`
  - `fid_input_date_1`, `fid_input_date_2`: YYYYMMDD
  - `env_dv`: `real`(실전)/`demo`(모의) — 이 앱은 prod 키 사용
- **중요 제약 (공식 문서 원문)**: "해당 API로 미국주식 조회 시 **다우30·나스닥100·S&P500 종목만** 조회 가능. 더 많은 미국 종목은 해외주식기간별시세 API 사용." → **우리가 필요한 3종(S&P500·NASDAQ·Dow)은 정확히 이 범위 안.**
- **응답 필드**: `ovrs_nmix_prpr`(현재가), `ovrs_nmix_prdy_vrss`(전일대비), `prdy_vrss_sign`(부호), `ovrs_nmix_prdy_clpr`(전일종가), `hts_kor_isnm`(한글 종목명), `ovrs_nmix_oprc/hgpr/lwpr`(시/고/저) 등.
- **분봉 보조**: `inquire-time-indexchartprice` (`v1_해외주식-031`, 시장코드 `N`/`X`/`KX`) — 인트라데이 필요 시.

**종목코드 (확인 필요)**: 공식 예제에서 Dow=`.DJI` 확정, S&P500 분봉 예제에서 `SPX` 사용 확인. NASDAQ Composite/100 코드와 S&P500 일별 코드는 KIS 포럼 > FAQ > 종목정보 다운로드(해외) > **해외지수 마스터 파일**로 최종 확정 필요 (검색상 `SPX`/`US500`, `COMP`/`IXIC`/`NDX` 표기 혼재 → 마스터 파일 기준으로 픽스). **연동 전 마스터 코드 1회 확인 필수.**

> 실시간성 주의: KIS 해외 시세는 **무료(지연) 시세만** 제공(유료 실시간 미제공). Market 화면 용도(지연 허용)엔 충분.

### 무료/저비용 대안 (KIS로 충분하므로 백업·검증용)

| 소스 | 무료 한도 | 키 | 실시간성 | 한국 접근성 | 라이선스/상업표시 | BFF 적합성 |
|---|---|---|---|---|---|---|
| **KIS (추천)** | 보유 prod 키 한도 내 (초당 유량 제한 있음) | 보유 키 재사용 | 지연 | 국내사·안정 | 본인 계약 범위 | 최적 (기존 클라이언트) |
| Yahoo Finance(비공식) | 비공식·불안정 | 불필요 | ~15분 지연 | 가능하나 차단 위험 | 비공식·상업 사용 모호 | 비추 (ToS 리스크) |
| Alpha Vantage | 25 calls/day, 5/min (무료) | 필요(무료) | EOD/지연 | 가능 | 무료티어 상업 제한적 | 한도 너무 빡빡 |
| Twelve Data | 800 calls/day, 8/min (무료) | 필요(무료) | 지연 | 가능 | 무료티어 표시 조건 | 백업 후보로 양호 |
| Finnhub | 60 calls/min (무료) | 필요(무료) | 지연 | 가능 | 무료티어 비상업 권고 | 백업 후보 |
| FRED (세인트루이스 연준) | 사실상 무제한 | 필요(무료) | **일별·종가만** (지수는 SP500 시리즈 등 한정) | 가능 | 공공·자유 | 일별만이라 보조용 |

**추천: KIS `inquire-daily-chartprice` (시장코드 N)** — 키 추가 발급/외부 의존 없이 국내 지수와 동일 파이프라인으로 S&P500·NASDAQ·Dow 조달. 한도 빡빡한 Alpha Vantage나 ToS 리스크 있는 Yahoo 비공식 대비 운영 안정성 우위. (외부 백업이 필요하면 Twelve Data 800/day 차순위.)

---

## 2. 환율 (USD/KRW)

### KIS 환율 전용 조회 → **있음 (위 1번 동일 엔드포인트, 시장코드 `X`)**

- `inquire-daily-chartprice` 의 `fid_cond_mrkt_div_code="X"` (환율). 별도 통합증거금 응답의 부수 환율(`*_frst_bltn_exrt`)이 아닌 **전용 환율 시계열** 조달 가능.
- 분봉은 `inquire-time-indexchartprice` 의 `KX`(원화환율)/`X` 코드.
- USD/KRW 종목코드는 마스터 파일 기준 확인 필요 (검색상 `USD/KRW` 표기) **(확인 필요)**.

### 한국 공식 + 글로벌 무료 비교

| 소스 | 무료 한도 | 키 | 갱신주기 | KRW | 한국 접근성 | 라이선스 | 비고 |
|---|---|---|---|---|---|---|---|
| **KIS (X 코드) — 추천** | 보유 키 한도 | 재사용 | 지연/일중 | O | 국내·안정 | 계약 범위 | 지수와 단일 통합 |
| 한국수출입은행 환율 API | **1,000 calls/day** | 필요(무료) | **일 1회, 영업일 11시 전후** | O | 국내·안정 | 공공 | 일별 고시환율, 인트라데이 X. 도메인 2025.6.25 변경됨 |
| 한국은행 ECOS | 일 한도 있음(키 발급 즉시) | 필요(무료) | 일별 | O (원/달러 시계열) | 국내·안정 | 공공 | 통계 시계열용, 일별 |
| open.er-api.com (ExchangeRate-API 오픈) | 키 없음, 24h 1회 권장(시간당이면 무제한 수준) | 불필요 | **일 1회** | O | 가능 | 상업 OK, **출처 표기 링크 필수**, 재배포 금지 | 무키 간편 |
| exchangerate.host | 무료(키 필요로 정책 변경됨) | 필요 | 무료 60분 | O | 가능 | 플랜별 | 갱신 60분 |
| Frankfurter | 쿼터 없음, 키 없음 | 불필요 | **일별(ECB 기준)** | O (ECB가 KRW 고시) | 가능 | 무료·상업 OK | 일별 참조환율만 |

**추천: KIS (시장코드 X)** — 지수와 동일 엔드포인트·동일 키로 USD/KRW까지 한 번에. 환율을 KIS로 묶으면 외부 의존 0.
**백업 추천: open.er-api.com** (무키·상업 가능, 출처 링크만 표기) 또는 일별이면 충분할 때 **한국수출입은행**(공식 고시환율, 1,000/day).
> 인트라데이 환율이 필요하면 KIS `inquire-time-indexchartprice`(KX); 일별 고시면 한국수출입은행이 "공식 환율"로서 신뢰도 강점.

---

## 3. 암호화폐 (BTC Dominance)

BTC Dominance는 **글로벌 지표**(전체 암호화폐 시총 대비 비트코인 비중)라 국내 거래소(Upbit/Bithumb)로는 직접 산출 불가 — 글로벌 시총 API 필요.

| 소스 | 무료 한도 | 키 | 갱신주기 | dominance 직접 제공 | 한국 접근성 | 라이선스 | BFF 적합성 |
|---|---|---|---|---|---|---|---|
| **CoinGecko `/global` (추천)** | Demo ~30 calls/min (트래픽따라 변동), 월 쿼터 존재 | **Demo 키 무료 발급** (`x_cg_demo_api_key`) | **10분** | **O — `market_cap_percentage.btc`** | 가능·안정 | 무료티어 출처 표기 권장 | 최적 (단일 호출) |
| CoinMarketCap `/global-metrics` | Basic 월 10,000 credits | 필요(무료) | 분 단위 | O (`btc_dominance`) | 가능 | 무료티어 비상업 제한 | 키 필수·상업 제한 |
| Upbit / Bithumb (국내) | 무료 | 시세는 불필요 | 실시간 | **X (글로벌 지표 미제공)** | 국내·최적 | 거래소 ToS | dominance 부적합(코인 시세용) |

**추천: CoinGecko `/global` (Demo 무료 플랜)** — 응답의 `market_cap_percentage.btc` 로 **계산 없이 즉시** BTC Dominance 획득(예: `50.44`). 10분 갱신은 dominance 같은 거시 지표에 충분. CMC 대비 무료티어 상업 제약이 덜하고 단일 호출로 끝남. 국내 거래소는 dominance 미제공이라 부적합(필요 시 개별 코인 시세에만 보조 활용).

> 무키 호출도 가능하나(Public) 5~15 calls/min로 더 빡빡하고 불안정 → **Demo 키 발급 권장**.

---

## 4. 추천 조합 기준: 필요한 키 / 환경변수 / 한도 / 캐싱

### 환경변수 (추가분)

| 변수 | 용도 | 비고 |
|---|---|---|
| (기존) `KIS_APP_KEY` / `KIS_APP_SECRET` / `KIS_ENV=prod` | 해외지수·환율 (`inquire-daily-chartprice`) | **신규 발급 불필요, 재사용** |
| `COINGECKO_API_KEY` | CoinGecko Demo 키 | 무료 발급, 서버 전용(클라이언트 노출 금지). 헤더 `x_cg_demo_api_key` |
| (백업, 선택) `KOREAEXIM_AUTH_KEY` | 한국수출입은행 환율 백업 | 환율 백업 채택 시 |

> open.er-api.com 백업 사용 시 키 불필요. 단 화면 푸터에 `Rates By Exchange Rate API` 출처 링크 표기 의무.

### 호출 한도 주의

- **KIS**: 초당 유량 제한(REST 약 20건/초 수준 — 계정/문서 기준 확인 필요). 지수·환율은 변동 느리므로 캐싱으로 호출 최소화.
- **CoinGecko Demo**: ~30 calls/min + **월 쿼터 존재**(정확 수치 확인 필요). dominance는 10분 갱신이므로 BFF에서 10분 캐싱하면 월 ~4,300건 수준 → 안전.
- **한국수출입은행**: 1,000 calls/day, 영업일 11시 1회 갱신 → 일 1회 호출이면 충분.

### BFF 캐싱 TTL 제안

| 데이터 | 소스 | 권장 TTL | 근거 |
|---|---|---|---|
| 해외지수 (S&P500/NASDAQ/Dow) 일별 | KIS `N` | 장중 1~5분 / 장마감 후 1시간+ | 지연 시세, 거시 표시용 |
| USD/KRW | KIS `X` (또는 백업) | 5~10분 (일별 고시면 1시간+) | 환율 변동 완만 |
| BTC Dominance | CoinGecko `/global` | **10분** | 소스 갱신주기와 일치(과호출 방지) |

> 권장: KIS 응답에 이미 박는 `X-KIS-Env` 패턴처럼, 외부 소스 응답에도 `X-Data-Source`/`X-Cache` 헤더로 출처·캐시 상태 노출(쿼터 초과 시 mock fallback 패턴은 DART 카운터 방식 재사용 가능).

---

## 출처 (공식 문서)

- KIS 해외지수/환율 기간별시세 (`inquire-daily-chartprice`, v1_해외주식-012) 예제 — https://github.com/koreainvestment/open-trading-api (examples_llm/overseas_stock/inquire_daily_chartprice)
- KIS 해외지수분봉조회 (`inquire-time-indexchartprice`, v1_해외주식-031) 예제 — 동 저장소 examples_llm/overseas_stock/inquire_time_indexchartprice
- KIS 해외주식 지수정보 struct (S&P500/NASDAQ100/Dow30 플래그) — https://github.com/koreainvestment/open-trading-api/blob/main/stocks_info/%ED%95%B4%EC%99%B8%EC%A3%BC%EC%8B%9D%EC%A7%80%EC%88%98%EC%A0%95%EB%B3%B4.h
- KIS Developers 포털 — https://apiportal.koreainvestment.com/apiservice
- 한국수출입은행 환율 API (공공데이터포털) — https://www.data.go.kr/data/3068846/openapi.do / https://www.koreaexim.go.kr
- 한국은행 ECOS Open API — https://ecos.bok.or.kr/api/
- open.er-api.com (ExchangeRate-API 오픈 액세스) — https://www.exchangerate-api.com/docs/free
- Frankfurter — https://frankfurter.dev/
- CoinGecko `/global` 엔드포인트 (btc dominance) — https://docs.coingecko.com/reference/crypto-global
- CoinGecko Rate Limit / Demo 키 — https://docs.coingecko.com/docs/common-errors-rate-limit / https://www.coingecko.com/en/api/pricing

---

### "(확인 필요)" 모음

- ✅ **확정(2026-05-30 prod 라이브)**: 시장코드 `N` + **S&P500=`SPX`**(7580.06), **NASDAQ 종합=`COMP`**(26972.62), NASDAQ-100=`NDX`(30333.18). `US500`/`.INX`/`IXIC`/`.IXIC` 는 0/무효. 응답 `ovrs_nmix_prpr`(현재값)·`prdy_ctrt`(등락률)·`prdy_vrss_sign`·`hts_kor_isnm`. (일봉 종가 기준) / **BTC 원화가격**: CoinGecko `/simple/price?ids=bitcoin&vs_currencies=krw&include_24hr_change=true` — 키 없이 동작 확인(`krw`+`krw_24h_change`). USD/KRW 환율 코드는 미확정(본 헤더 트랙 비범위).
- KIS REST 초당 유량 정확 수치(계정 등급별) — 포털/계약 기준 확인.
- CoinGecko Demo 플랜 정확 월 쿼터(공식 수치) — pricing 페이지 재확인.
- exchangerate.host 무료 정책(키 요구로 변경됨) 최신 상태 확인.
