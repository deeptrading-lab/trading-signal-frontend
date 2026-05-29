# KIS Open API — 해외주식 (Overseas Stock) 시세 / 검색 / 계좌·잔고 / 주문

한국투자증권(KIS) Open API 중 **해외주식 계열**(현재가·체결·호가·기간/차트시세·종목검색·조건검색·랭킹·계좌/잔고/주문가능·주문매매) 엔드포인트 레퍼런스.

- **출처**: [`examples_user/overseas_stock/overseas_stock_functions.py`](https://github.com/koreainvestment/open-trading-api/blob/main/examples_user/overseas_stock/overseas_stock_functions.py) (카탈로그·URL·TR_ID·파라미터), [`examples_llm/overseas_stock/*/chk_*.py`](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock) (응답 필드)
- **갱신일**: 2026-05-29
- **인증·도메인(실전 `:9443` / 모의 `:29443`)·공통 헤더(`authorization: Bearer …`, `appkey`, `appsecret`, `tr_id`, `custtype:"P"`)·envelope(`{rt_cd, msg_cd, msg1, output…}`)·연속조회(`tr_cont`) 규약은 [00-auth-and-common.md](./00-auth-and-common.md) 참조.**

응답 값은 **모두 문자열**로 내려온다(예: `last="185.50"`). 숫자 변환은 클라이언트 책임. URL은 시세는 `/uapi/overseas-price/v1/...`, 주문/계좌는 `/uapi/overseas-stock/v1/...` 로 **prefix가 다르다**. 별도 표기 없으면 HTTP GET(소스의 `ka._url_fetch` 기본, 주문 류는 POST).

---

> ## ⚠️ 안전장치 (필독)
> 이 프로젝트는 **조회(read-only)만** 사용한다. 아래 카탈로그의 **주문/매매 API**(해외 `order` / `order_resv` / `order_rvsecncl` / `daytime_order` 등 `*U` 계열 TR_ID)는 **구현 금지 · 호출 코드 작성 금지**다.
> 주문 기능이 필요해지면 **별도 PRD 책임**이며 다음 **다중 게이트**를 의무로 통과해야 한다:
> 1. **주문 BFF 분리** (조회 BFF와 물리적으로 다른 라우트/권한)
> 2. **비밀번호 재확인** (주문 직전 재인증)
> 3. **dry-run** (실제 전송 전 모의 검증)
> 4. **금액 상한** (1회/일일 한도)
> 5. **audit log** (모든 주문 시도·파라미터·결과 기록)
>
> 본 문서에서 주문 엔드포인트는 **카탈로그에만** 수록하며 각 행에 `🚫 안전장치 필수` 를 표시한다. 상세 파라미터/예시는 의도적으로 생략한다.

---

## 1. 거래소 코드 (EXCD / OVRS_EXCG_CD) — 시세용 vs 계좌·주문용이 다름

**시세 API**(`price`, `dailyprice`, `inquire_search`, 랭킹 등)는 `EXCD` 파라미터에 **3글자 코드**를 쓴다:

| EXCD | 거래소 | 통화 |
| --- | --- | --- |
| `NAS` | 미국 나스닥 | USD |
| `NYS` | 미국 뉴욕 (NYSE) | USD |
| `AMS` | 미국 아멕스 (AMEX) | USD |
| `HKS` | 홍콩 | HKD |
| `SHS` | 중국 상해 | CNY |
| `SZS` | 중국 심천 | CNY |
| `HSX` | 베트남 호치민 | VND |
| `HNX` | 베트남 하노이 | VND |
| `TSE` | 일본 도쿄 | JPY |

**계좌·주문 API**(`inquire_balance`, `inquire_psamount` 등)는 `OVRS_EXCG_CD` 파라미터에 **4글자 코드**(시세용과 다름)를 쓴다:

| OVRS_EXCG_CD | 거래소 | 비고 |
| --- | --- | --- |
| `NASD` | 미국 전체 (실전) / 나스닥(모의) | 실전·모의 의미 차이 주의 |
| `NAS` | 나스닥 (실전) | |
| `NYSE` | 뉴욕 | |
| `AMEX` | 아멕스 | |
| `SEHK` | 홍콩 | |
| `SHAA` | 중국 상해 | |
| `SZAA` | 중국 심천 | |
| `TKSE` | 일본 | |
| `HASE` | 베트남 하노이 | |
| `VNSE` | 베트남 호치민 | |

**통화 코드(`TR_CRCY_CD`)**: `USD`(미국달러) / `HKD`(홍콩달러) / `CNY`(중국위안화) / `JPY`(일본엔화) / `VND`(베트남동).

---

## 2. 카탈로그

> 표기: METHOD는 별도 표기 없으면 GET. TR_ID `(실전/모의)` — 모의가 동일하거나 없으면 단일 표기. 주문 류 TR_ID는 보통 실전 `T...U` / 모의 `V...U`.

### 2-1. 기본시세 (시세) — `/uapi/overseas-price/v1/quotations/...`

| API명(한글) | 함수명 | METHOD + URL | TR_ID (실전/모의) | 설명 |
| --- | --- | --- | --- | --- |
| 해외주식 현재체결가 | `price` | GET `…/price` | `HHDFS00000300` (공통) | EXCD·SYMB로 현재가/대비/등락율/거래량 |
| 해외주식 현재가상세 | `price_detail` | GET `…/price-detail` | `HHDFS76200200` | 현재가 + 52주최고저·PER·EPS 등 상세 |
| 해외주식 현재가 1호가 | `inquire_asking_price` | GET `…/inquire-asking-price` | `HHDFS76200100` | 매수/매도 1호가·잔량 |
| 해외주식 체결추이 | `quot_inquire_ccnl` | GET `…/inquire-ccnl` | `HHDFS76200300` | 최근 체결 내역(틱) |
| 해외주식 기간별시세 | `dailyprice` | GET `…/dailyprice` | `HHDFS76240000` (공통) | 일/주/월 OHLCV (GUBN·BYMD) |
| 종목·지수·환율 기간별시세(일주월년) | `inquire_daily_chartprice` | GET `…/inquire-daily-chartprice` | `FHKST03030100` (공통) | 지수/환율/국채/금선물 기간시세 (FID_* 파라미터) |
| 해외주식 분봉조회 | `inquire_time_itemchartprice` | GET `…/inquire-time-itemchartprice` | `HHDFS76950200` | 종목 분봉 차트 |
| 해외지수 분봉조회 | `inquire_time_indexchartprice` | GET `…/inquire-time-indexchartprice` | `FHKST03030200` | 지수 분봉 차트 |
| 해외주식 업종별시세 | `industry_price` | GET `…/industry-price` | `HHDFS76370100` | 업종별 시세 |
| 해외주식 업종별코드조회 | `industry_theme` | GET `…/industry-theme` | `HHDFS76370000` | 업종/테마 코드 |
| 해외결제일자조회 | `countries_holiday` | GET `/uapi/overseas-stock/v1/quotations/countries-holiday` | `CTOS5011R` | 국가별 휴장/결제일 (연속조회) |
| 해외주식 상품기본정보 | `search_info` | GET `…/search-info` | `CTPF1702R` | 종목 기본정보 |
| 해외뉴스종합(제목) | `news_title` | GET `…/news-title` | `HHPSTH60100C1` | 뉴스 제목 목록 |
| 해외속보(제목) | `brknews_title` | GET `…/brknews-title` | `FHKST01011801` | 속보 제목 |
| 당사 해외주식담보대출 가능종목 | `colable_by_company` | GET `…/colable-by-company` | `CTLN4050R` | 담보대출 가능종목 (연속조회) |
| 해외주식 기간별권리조회 | `period_rights` | GET `…/period-rights` | `CTRGT011R` | 권리(배당 등) 기간조회 |
| 해외주식 권리종합 | `rights_by_ice` | GET `…/rights-by-ice` | `HHDFS78330900` | 권리 종합 |

### 2-2. 종목검색 / 조건검색 / 랭킹 (검색)

| API명(한글) | 함수명 | METHOD + URL | TR_ID (실전/모의) | 설명 |
| --- | --- | --- | --- | --- |
| 해외주식조건검색 | `inquire_search` | GET `/uapi/overseas-price/v1/quotations/inquire-search` | `HHDFS76410000` (실전·✅모의 동일) | 가격·등락·거래량·PER·EPS 등 다중 조건검색, 최대 100건 (상세 §3-6) |
| 해외주식 시가총액순위 | `market_cap` | GET `/uapi/overseas-stock/v1/ranking/market-cap` | `HHDFS76350100` | 시총 랭킹 |
| 해외주식 거래량순위 | `trade_vol` | GET `…/ranking/trade-vol` | `HHDFS76310010` | 거래량 랭킹 |
| 해외주식 거래대금순위 | `trade_pbmn` | GET `…/ranking/trade-pbmn` | `HHDFS76320010` | 거래대금 랭킹 |
| 해외주식 거래증가율순위 | `trade_growth` | GET `…/ranking/trade-growth` | `HHDFS76330000` | 거래증가율 랭킹 |
| 해외주식 거래회전율순위 | `trade_turnover` | GET `…/ranking/trade-turnover` | `HHDFS76340000` | 거래회전율 랭킹 |
| 해외주식 상승률/하락률 | `updown_rate` | GET `…/ranking/updown-rate` | `HHDFS76290000` | 등락률 랭킹 |
| 해외주식 가격급등락 | `price_fluct` | GET `…/ranking/price-fluct` | `HHDFS76260000` | 가격 급등락 |
| 해외주식 거래량급증 | `volume_surge` | GET `…/ranking/volume-surge` | `HHDFS76270000` | 거래량 급증 |
| 해외주식 매수체결강도상위 | `volume_power` | GET `…/ranking/volume-power` | `HHDFS76280000` | 체결강도 상위 |
| 해외주식 신고/신저가 | `new_highlow` | GET `…/ranking/new-highlow` | `HHDFS76300000` | 신고가/신저가 |

### 2-3. 계좌 / 잔고 / 주문가능 (조회)

| API명(한글) | 함수명 | METHOD + URL | TR_ID (실전/모의) | 설명 |
| --- | --- | --- | --- | --- |
| 해외주식 잔고 | `inquire_balance` | GET `/uapi/overseas-stock/v1/trading/inquire-balance` | `TTTS3012R` / `VTTS3012R` | 보유종목·평가손익 (연속조회 FK/NK200) |
| 해외주식 체결기준현재잔고 | `inquire_present_balance` | GET `…/inquire-present-balance` | `CTRP6504R` / `VTRP6504R` | 체결기준 현재잔고 |
| 해외주식 결제기준잔고 | `inquire_paymt_stdr_balance` | GET `…/inquire-paymt-stdr-balance` | `CTRP6010R` | 결제기준 잔고 |
| 해외주식 매수가능금액조회 | `inquire_psamount` | GET `…/inquire-psamount` | `TTTS3007R` / `VTTS3007R` | 주문가능 금액·수량·환율 |
| 해외주식 주문체결내역 | `inquire_ccnl` | GET `…/inquire-ccnl` | `TTTS3035R` / `VTTS3035R` | 체결내역 (연속조회) |
| 해외주식 미체결내역 | `inquire_nccs` | GET `…/inquire-nccs` | `TTTS3018R` | 미체결 주문 |
| 해외주식 기간손익 | `inquire_period_profit` | GET `…/inquire-period-profit` | `TTTS3039R` | 기간별 실현손익 |
| 해외주식 일별거래내역 | `inquire_period_trans` | GET `…/inquire-period-trans` | `CTOS4001R` | 일별 거래내역 |
| 해외증거금 통화별조회 | `foreign_margin` | GET `…/foreign-margin` | `TTTC2101R` | 통화별 증거금 |
| 해외주식 지정가주문번호조회 | `algo_ordno` | GET `…/algo-ordno` | `TTTS6058R` | 지정가(알고) 주문번호 |
| 해외주식 지정가체결내역조회 | `inquire_algo_ccnl` | GET `…/inquire-algo-ccnl` | `TTTS6059R` | 지정가(알고) 체결내역 |
| 해외주식 예약주문조회 | `order_resv_list` | GET `…/order-resv-list` | `TTTT3039R` / `TTTS3014R` | 예약주문 조회(읽기) |

### 2-4. 주문 / 매매 (🚫 구현 금지 — 참고용)

> 아래는 **호출 코드를 작성하지 않는다.** 사용하려면 상단 ⚠️ 안전장치 다중 게이트 + 별도 PRD 필수.

| API명(한글) | 함수명 | METHOD + URL | TR_ID (실전/모의) | 비고 |
| --- | --- | --- | --- | --- |
| 해외주식 주문(매수/매도) | `order` | POST `/uapi/overseas-stock/v1/trading/order` | 거래소·매수매도별 상이 (미국매수 `TTTT1002U`/`VTTT1002U`, 미국매도 `TTTT1006U`/`VTTT1006U`, 홍콩 `TTTS1002U`/`TTTS1001U`, 상해 `TTTS0202U`/`TTTS1005U`, 심천 `TTTS0305U`/`TTTS0304U`, 일본 `TTTS0308U`/`TTTS0307U`, 베트남 `TTTS0311U`/`TTTS0310U`) | 🚫 안전장치 필수 |
| 해외주식 정정취소주문 | `order_rvsecncl` | POST `…/order-rvsecncl` | `TTTT1004U` / `VTTT1004U` | 🚫 안전장치 필수 |
| 해외주식 예약주문접수 | `order_resv` | POST `…/order-resv` | 미국 `TTTT3014U`·`TTTT3016U` / 기타 `TTTS3013U` (모의 `V…`) | 🚫 안전장치 필수 |
| 해외주식 예약주문접수취소 | `order_resv_ccnl` | POST `…/order-resv-ccnl` | `TTTT3017U` / `VTTT3017U` | 🚫 안전장치 필수 |
| 해외주식 미국주간주문 | `daytime_order` | POST `…/daytime-order` | 매수 `TTTS6036U` / 매도 `TTTS6037U` | 🚫 안전장치 필수 |
| 해외주식 미국주간정정취소 | `daytime_order_rvsecncl` | POST `…/daytime-order-rvsecncl` | `TTTS6038U` | 🚫 안전장치 필수 |

---

## 3. 핵심 엔드포인트 상세 (조회 전용)

### 3-1. 해외주식 현재체결가 — `price` (`HHDFS00000300`)

`GET /uapi/overseas-price/v1/quotations/price` · 실전/모의 공통 TR_ID.

**요청 파라미터**

| 키 | 필수 | 설명 |
| --- | --- | --- |
| `AUTH` | Y | 사용자권한정보. `""`(공백) 입력 |
| `EXCD` | Y | 거래소코드 (예: `NAS`, `NYS`) — §1 시세용 3글자 코드 |
| `SYMB` | Y | 종목 심볼 (예: `AAPL`, `TSLA`) |

**주요 응답 필드** (`output`)

| 키 | 설명 |
| --- | --- |
| `rsym` | 실시간조회종목코드 |
| `zdiv` | 소수점 자리수 |
| `base` | 전일종가 |
| `pvol` | 전일거래량 |
| `last` | **현재가** |
| `sign` | 대비기호 |
| `diff` | 대비(전일 대비 변동액) |
| `rate` | 등락율 |
| `tvol` | 거래량 |
| `tamt` | 거래대금 |
| `ordy` | 매수가능여부 |

**주의**: 값은 전부 문자열. `zdiv`(소수점 자리수)를 적용해 `last` 등을 표시해야 거래소별 통화 단위가 맞다.

### 3-2. 해외주식 기간별시세 — `dailyprice` (`HHDFS76240000`)

`GET /uapi/overseas-price/v1/quotations/dailyprice` · 실전/모의 공통 TR_ID · 연속조회 지원(`tr_cont`).

**요청 파라미터**

| 키 | 필수 | 설명 |
| --- | --- | --- |
| `AUTH` | Y | `""`(공백) |
| `EXCD` | Y | 거래소코드 (예: `NAS`) |
| `SYMB` | Y | 종목 심볼 (예: `TSLA`) |
| `GUBN` | Y | 일/주/월 구분 (`0`=일, `1`=주, `2`=월) |
| `BYMD` | Y | 조회기준일자 `YYYYMMDD` (공란 시 최근일) |
| `MODP` | Y | 수정주가 반영여부 (`0`=미반영, `1`=반영) |

**주요 응답 필드** (`output2` = 일자별 시계열, `output1` = 종목 요약)

| 키 | 설명 |
| --- | --- |
| `xymd` | 일자 `YYYYMMDD` |
| `clos` | 종가 |
| `open` | 시가 |
| `high` | 고가 |
| `low` | 저가 |
| `tvol` | 거래량 |
| `tamt` | 거래대금 |
| `diff` / `rate` / `sign` | 대비 / 등락율 / 대비기호 |
| `pbid` / `pask` | 매수호가 / 매도호가 |
| `vbid` / `vask` | 매수호가잔량 / 매도호가잔량 |
| `rsym` / `zdiv` / `nrec` | 실시간조회종목코드 / 소수점자리수 / 전일종가 |

**주의**: 차트용 대량 조회는 `tr_cont`=`M`(다음 데이터 존재) → `N`(다음 페이지 요청) 루프로 연속조회. 미국 종목은 다우30/나스닥100/S&P500 외 광범위 종목은 이 API를 사용(지수 한정 API는 `inquire_daily_chartprice`).

### 3-3. 종목·지수·환율 기간별시세 — `inquire_daily_chartprice` (`FHKST03030100`)

`GET /uapi/overseas-price/v1/quotations/inquire-daily-chartprice` · 실전/모의 공통 · FID 파라미터(국내주식 차트와 유사 컨벤션).

**요청 파라미터**

| 키 | 필수 | 설명 |
| --- | --- | --- |
| `FID_COND_MRKT_DIV_CODE` | Y | `N`=해외지수, `X`=환율, `I`=국채, `S`=금선물 |
| `FID_INPUT_ISCD` | Y | 종목/지수코드 (예: `.DJI`=다우). 해외주식 마스터코드 참조 |
| `FID_INPUT_DATE_1` | Y | 시작일자 `YYYYMMDD` |
| `FID_INPUT_DATE_2` | Y | 종료일자 `YYYYMMDD` |
| `FID_PERIOD_DIV_CODE` | Y | `D`=일, `W`=주, `M`=월, `Y`=년 |

**응답**: `output1`(요약, 단일 객체), `output2`(기간 시계열 배열). 미국 개별주식은 다우30/나스닥100/S&P500 구성종목만 조회 가능 — 그 외 종목 시세는 `dailyprice` 사용.

### 3-4. 해외주식 잔고 — `inquire_balance` (`TTTS3012R` / `VTTS3012R`)

`GET /uapi/overseas-stock/v1/trading/inquire-balance` · **실전/모의 TR_ID 다름** · 연속조회(FK200/NK200).

**요청 파라미터**

| 키 | 필수 | 설명 |
| --- | --- | --- |
| `CANO` | Y | 종합계좌번호 (8-2 체계 앞 8자리) |
| `ACNT_PRDT_CD` | Y | 계좌상품코드 (뒤 2자리, 예 `01`) |
| `OVRS_EXCG_CD` | Y | 해외거래소코드 — §1 계좌용 4글자(`NASD`/`SEHK`/…) |
| `TR_CRCY_CD` | Y | 거래통화코드 (`USD`/`HKD`/`CNY`/`JPY`/`VND`) |
| `CTX_AREA_FK200` | N | 연속조회검색조건200 (최초 `""`) |
| `CTX_AREA_NK200` | N | 연속조회키200 (최초 `""`) |

**주요 응답 필드** (`output1` = 보유종목 배열, `output2` = 합계)

| 키 | 설명 |
| --- | --- |
| `ovrs_pdno` | 해외상품번호(종목코드) |
| `ovrs_cblc_qty` | 해외잔고수량 |
| `ord_psbl_qty` | 주문가능수량 |
| `pchs_avg_pric` | 매입평균가격 |
| `now_pric2` | 현재가격 |
| `frcr_pchs_amt1` | 외화매입금액1 |
| `ovrs_stck_evlu_amt` | 해외주식평가금액 |
| `frcr_evlu_pfls_amt` | 외화평가손익금액 |
| `evlu_pfls_rt` | 평가손익율 |
| `tr_crcy_cd` / `ovrs_excg_cd` | 거래통화코드 / 해외거래소코드 |
| `tot_evlu_pfls_amt` (output2) | 총평가손익금액 |
| `tot_pftrt` (output2) | 총수익률 |
| `ovrs_tot_pfls` (output2) | 해외총손익 |

**주의**: 실전 `TTTS3012R` / 모의 `VTTS3012R` 로 반드시 분기. `OVRS_EXCG_CD`는 실전에서 `NASD`=미국전체로 묶이지만 모의에서는 `NASD`=나스닥 의미 — §1 표 참조.

### 3-5. 해외주식 매수가능금액조회 — `inquire_psamount` (`TTTS3007R` / `VTTS3007R`)

`GET /uapi/overseas-stock/v1/trading/inquire-psamount` · **실전/모의 TR_ID 다름** · 연속조회.

**요청 파라미터**

| 키 | 필수 | 설명 |
| --- | --- | --- |
| `CANO` | Y | 종합계좌번호 앞 8자리 |
| `ACNT_PRDT_CD` | Y | 계좌상품코드 뒤 2자리 |
| `OVRS_EXCG_CD` | Y | 해외거래소코드(4글자, `NASD` 등) |
| `OVRS_ORD_UNPR` | Y | 해외주문단가 (정수 23·소수 8자리) |
| `ITEM_CD` | Y | 종목코드 |

**주요 응답 필드** (`output`)

| 키 | 설명 |
| --- | --- |
| `tr_crcy_cd` | 거래통화코드 |
| `ord_psbl_frcr_amt` | 주문가능 외화금액 |
| `ovrs_ord_psbl_amt` | 해외주문가능금액 |
| `max_ord_psbl_qty` | 최대주문가능수량 |
| `ovrs_max_ord_psbl_qty` | 해외최대주문가능수량 |
| `echm_af_ord_psbl_amt` | 환전 이후 주문가능금액 |
| `echm_af_ord_psbl_qty` | 환전 이후 주문가능수량 |
| `ord_psbl_qty` | 주문가능수량 |
| `sll_ruse_psbl_amt` | 매도재사용가능금액 |
| `exrt` | 환율 |
| `frcr_ord_psbl_amt1` | 외화주문가능금액1 |

**주의**: 이 API는 **조회 전용**이지만 `OVRS_ORD_UNPR`(주문단가)를 입력으로 받는다 — 실제 주문이 아니라 "이 단가로 살 수 있는 수량/금액" 계산용. 주문 실행은 별도(🚫 §2-4).

---

### 3-6. 해외주식 조건검색 — `inquire_search` (`HHDFS76410000`) ✅ 포털 스펙 확정 (2026-05-29)

다중 조건(가격·등락률·시총·발행주식·거래량·거래대금·EPS·PER)으로 해외 종목 스크리닝. HTS [7641]. **✅ 실전·모의 동일 TR_ID** · 최대 **100건**(이후 페이징 개선검토중) · `tr_cont` 다음조회 불가.

> 지연시세: 미국 0분(실시간무료) / 홍콩·베트남·중국·일본 15분 지연. `output2.rank` 는 **거래량 내림차순** 순위. 거래/시세 미형성 종목은 조건검색에 안 잡힘(기간별시세로는 조회됨).

**요청 파라미터** (Query)

| 키 | 필수 | 설명 |
|---|---|---|
| `AUTH` | Y | 사용자권한정보 — `""`(Null) |
| `EXCD` | Y | 거래소 3글자 — `NYS`/`NAS`/`AMS`/`HKS`/`SHS`/`SZS`/`HSX`/`HNX`/`TSE` (§1 표) |
| `CO_YN_*` / `CO_ST_*` / `CO_EN_*` | N | 조건 **사용여부(1)/시작값/끝값** 3종 세트. 대상: `PRICECUR`(현재가, 각국통화) · `RATE`(등락율 %) · `VALX`(시총, 천) · `SHAR`(발행주식, 천) · `VOLUME`(거래량, 주) · `AMT`(거래대금, 천) · `EPS` · `PER` |
| `KEYB` | N | NEXT KEY BUFF — `""` 공백 |

예) 등락률 5~30% + 거래량 100만↑ 검색: `CO_YN_RATE=1, CO_ST_RATE=5, CO_EN_RATE=30, CO_YN_VOLUME=1, CO_ST_VOLUME=1000000`.

**응답 — `output1` (Object, 요약)**: `zdiv`(소수점자리수) · `stat`(거래상태) · `crec`(현재조회종목수) · `trec`(전체조회종목수) · `nrec`(Record Count).

**응답 — `output2` (Object Array, 종목별)**

| 키 | 의미 |
|---|---|
| `rsym` | 실시간조회심볼 (`D`+시장3자리+종목코드, 예 `DNASAAPL`) |
| `excd` / `symb` / `name` / `ename` | 거래소 / 종목코드 / 종목명 / 영문명 |
| `last` | 현재가 |
| `diff` / `rate` / `sign` | 대비 / 등락율(%) / 기호 |
| `popen` / `phigh` / `plow` | 시가 / 고가 / 저가 |
| `tvol` / `avol` | 거래량(주) / 거래대금(천) |
| `shar` / `valx` | 발행주식수(천) / 시가총액(천) |
| `eps` / `per` | EPS / PER |
| `rank` | 순위(거래량 내림차순) |
| `e_ordyn` | 매매가능 (`O`=가능) |

> ⚠️ 가격/금액은 `zdiv`(소수점 자리수)를 적용해 해석해야 정확(미국주식 소수점). 시그널엔 `rate`·`tvol`·`per`·`eps` 조건 조합이 해외 스크리너로 바로 활용 가능. **모의 지원**이라 모의 환경에서도 개발 가능한 드문 해외 시세 API.

---

## 4. 미확인 / 후속

- **랭킹/검색 API의 정확한 요청 파라미터 키 일부**: `market_cap`, `trade_vol` 등 랭킹 함수의 전체 쿼리 파라미터(정렬·필터)는 본 작업에서 키 전수 추출 안 함 — 구현 시 각 함수의 `params={}` 블록 재확인 필요 (확인 필요).
- ~~`inquire_search`(조건검색) 응답 필드 스키마~~ → ✅ 포털 확정(§3-6, 2026-05-29). 모의 지원 확인.
- **`price_detail` / `inquire_asking_price` 응답 필드 전체**: 호가 1~10단계 잔량 키(`pask1`/`vbid1` 등) 명칭은 `chk_*.py` COLUMN_MAPPING에서 추가 확인 필요 (확인 필요).
- **실전/모의 TR_ID 매핑 완전성**: 주문 류 TR_ID는 functions.py 주석 기준으로 옮겼으나, 일부 거래소(중국상해 매수 `TTTS0202U` 등)는 KIS 포털 최신 명세와 교차검증 권장 (확인 필요).
- **연속조회 헤더 운용**: `tr_cont` 응답값(`M`/`F`/`D`/`E`)과 `ctx_area_fk/nk` 의 정확한 의미는 [00-auth-and-common.md](./00-auth-and-common.md) 의 공통 규약 참조.
