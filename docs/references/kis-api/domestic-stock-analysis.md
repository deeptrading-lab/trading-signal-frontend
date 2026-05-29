# KIS Open API — 국내주식 재무정보 / 투자자동향 / 프로그램매매 / 배당·권리

한국투자증권 Open API 국내주식 중 **펀더멘털(재무) · 수급(투자자/외국인) · 프로그램매매 · 배당/권리(예탁원) · 대차/공매도/회원사** 데이터 엔드포인트 레퍼런스. (시세 단건/호가/차트/지수, 계좌/주문, 순위분석은 별도 문서)

- 출처: `koreainvestment/open-trading-api` — `examples_user/domestic_stock/domestic_stock_functions.py` (전체 13,463줄에서 직접 추출). 함수명/URL/TR_ID/파라미터는 소스 그대로.
- 갱신일: 2026-05-29
- 인증·공통 헤더·실전/모의 구분·연속조회(tr_cont)·응답 규약은 [00-auth-and-common.md](./00-auth-and-common.md) 참조.

## 공통 메모

- 실전 도메인 포트 `:9443`, 모의 `:29443`. 단, 본 문서의 다수 API(특히 시장 수급·예탁원·재무)는 **실전 전용**이며 모의 미지원인 경우가 많다 (각 항목 "주의" 참조, 미표기는 확인 필요).
- 공통 헤더: `authorization: Bearer <token>`, `appkey`, `appsecret`, `tr_id`, `custtype: "P"`.
- 모든 메서드 **GET** (소스 `ka._url_fetch` 호출). 숫자 값도 응답에서는 **문자열**로 내려온다.
- `fid_cond_mrkt_div_code`: 보통 `J`(KRX). 일부 API는 `NX`(NXT), `UN`(통합), `U`(업종), `V` 사용.
- `inquire_investor` 만 `env_dv`(real/demo) 인자로 실전/모의 분기 + 동일 `tr_id`(FHKST01010900) 사용.

---

## 1. 카탈로그

### 1-1. 재무정보 (finance / quotations / ranking)

| API명(한글) | 함수명 | METHOD + URL | TR_ID | 한 줄 설명 |
|---|---|---|---|---|
| 대차대조표 | `finance_balance_sheet` | GET `/uapi/domestic-stock/v1/finance/balance-sheet` | `FHKST66430100` | 자산/부채/자본 재무상태표 (년/분기) |
| 손익계산서 | `finance_income_statement` | GET `/uapi/domestic-stock/v1/finance/income-statement` | `FHKST66430200` | 매출·영업이익·순이익 등 손익 (년/분기) |
| 재무비율 | `finance_financial_ratio` | GET `/uapi/domestic-stock/v1/finance/financial-ratio` | `FHKST66430300` | 종합 재무비율 (년/분기) |
| 수익성비율 | `finance_profit_ratio` | GET `/uapi/domestic-stock/v1/finance/profit-ratio` | `FHKST66430400` | ROE/ROA/매출이익률 등 |
| 기타주요비율 | `finance_other_major_ratios` | GET `/uapi/domestic-stock/v1/finance/other-major-ratios` | `FHKST66430500` | PER/PBR/EPS 등 기타 비율 |
| 안정성비율 | `finance_stability_ratio` | GET `/uapi/domestic-stock/v1/finance/stability-ratio` | `FHKST66430600` | 부채비율/유동비율 등 |
| 성장성비율 | `finance_growth_ratio` | GET `/uapi/domestic-stock/v1/finance/growth-ratio` | `FHKST66430800` | 매출/이익 증가율 등 |
| 재무비율 순위 | `finance_ratio` | GET `/uapi/domestic-stock/v1/ranking/finance-ratio` | `FHPST01750000` | 수익성/안정성/성장성/활동성 순위 (screen 20175) |
| 국내주식 예상실적 | `estimate_perform` | GET `/uapi/domestic-stock/v1/quotations/estimate-perform` | `HHKST668300C0` | 종목 실적 예상치 |
| 종목투자의견 | `invest_opinion` | GET `/uapi/domestic-stock/v1/quotations/invest-opinion` | `FHKST663300C0` | 종목별 투자의견 이력 (⚠️실전 전용, 상세 §2-7) |
| 증권사별 투자의견 | `invest_opbysec` | GET `/uapi/domestic-stock/v1/quotations/invest-opbysec` | `FHKST663400C0` | 회원사별 투자의견 (⚠️실전 전용, 상세 §2-7) |

> `finance_ratio` 는 `finance/` 가 아니라 `ranking/` 경로의 순위성 API (screen `20175`). `invest_opinion`(`FHKST663300C0`)/`invest_opbysec`(`FHKST663400C0`) TR_ID 포털 확정(2026-05-29).

### 1-2. 투자자동향 / 외국인 (quotations)

| API명(한글) | 함수명 | METHOD + URL | TR_ID | 한 줄 설명 |
|---|---|---|---|---|
| 종목별 투자자매매동향 | `inquire_investor` | GET `/uapi/domestic-stock/v1/quotations/inquire-investor` | `FHKST01010900` | 개인/외국인/기관 순매수 (실전·모의 모두, env_dv 분기) |
| 시장별 투자자매매동향(일별) | `inquire_investor_daily_by_market` | GET `/uapi/domestic-stock/v1/quotations/inquire-investor-daily-by-market` | `FHPTJ04040000` | 시장(코스피/코스닥)별 일별 투자자 동향 |
| 시장별 투자자매매동향(시간) | `inquire_investor_time_by_market` | GET `/uapi/domestic-stock/v1/quotations/inquire-investor-time-by-market` | `FHPTJ04030000` | 시장별 시간대 투자자 동향 |
| 국내기관·외국인 매매종목 가집계 | `foreign_institution_total` | GET `/uapi/domestic-stock/v1/quotations/foreign-institution-total` | `FHPTJ04400000` | 외국인/기관 순매수 상위 종목 가집계 |
| 외국계 회원사 추정매수 추이 | `frgnmem_pchs_trend` | GET `/uapi/domestic-stock/v1/quotations/frgnmem-pchs-trend` | `FHKST644400C0` | 외국계 회원사 매수 추이 |
| 외국계 매매 종목 추이 | `frgnmem_trade_trend` | GET `/uapi/domestic-stock/v1/quotations/frgnmem-trade-trend` | `FHPST04320000` | 외국계 회원사 매매 추이 (screen 20432) |
| 외국계 매매 추정 | `frgnmem_trade_estimate` | GET `/uapi/domestic-stock/v1/quotations/frgnmem-trade-estimate` | `FHKST644100C0` | 외국계 순매수 추정 상위 (screen 16441) |
| 투자자 매매동향(추정) | `investor_trend_estimate` | GET `/uapi/domestic-stock/v1/quotations/investor-trend-estimate` | `HHPTJ04160200` | 장중 투자자 순매수 추정 |
| 종목별 일별 투자자매매 | `investor_trade_by_stock_daily` | GET `/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily` | `FHPTJ04160001` | 종목별 일자별 투자자 매매 (⚠️실전 전용·모의 미지원, 상세 §2-6) |

### 1-3. 프로그램매매 (quotations)

| API명(한글) | 함수명 | METHOD + URL | TR_ID | 한 줄 설명 |
|---|---|---|---|---|
| 프로그램매매 종합현황(일별) | `comp_program_trade_daily` | GET `/uapi/domestic-stock/v1/quotations/comp-program-trade-daily` | `FHPPG04600001` | 시장 전체 프로그램매매 일별 |
| 프로그램매매 종합현황(당일) | `comp_program_trade_today` | GET `/uapi/domestic-stock/v1/quotations/comp-program-trade-today` | `FHPPG04600101` | 시장 전체 프로그램매매 당일(시간) |
| 투자자별 프로그램매매(당일) | `investor_program_trade_today` | GET `/uapi/domestic-stock/v1/quotations/investor-program-trade-today` | `HHPPG046600C1` | 투자자별 프로그램매매 당일 |
| 종목별 프로그램매매추이(체결) | `program_trade_by_stock` | GET `/uapi/domestic-stock/v1/quotations/program-trade-by-stock` | `FHPPG04650101` | 종목별 프로그램매매 체결 추이 |
| 종목별 프로그램매매추이(일별) | `program_trade_by_stock_daily` | GET `/uapi/domestic-stock/v1/quotations/program-trade-by-stock-daily` | `FHPPG04650201` | 종목별 프로그램매매 일별 추이 |

> 시드의 `index_program_trade` 는 본 functions.py 에 동명 함수 없음 → 지수 관련은 별도 문서 또는 미제공 (확인 필요). 종목 단위 프로그램매매(`program_trade_by_stock*`)를 시리즈에 포함.

### 1-4. 배당 / 권리 — 예탁원(ksdinfo) (quotations / ksdinfo)

| API명(한글) | 함수명 | METHOD + URL | TR_ID | 한 줄 설명 |
|---|---|---|---|---|
| 배당률 순위 | `dividend_rate` | GET `/uapi/domestic-stock/v1/ranking/dividend-rate` | `HHKDB13470100` | 기간별 배당률 순위 (ranking 경로) |
| 예탁원 배당정보 | `ksdinfo_dividend` | GET `/uapi/domestic-stock/v1/ksdinfo/dividend` | `HHKDB669102C0` | 결산/중간 배당 일정·내역 |
| 무상증자 일정 | `ksdinfo_bonus_issue` | GET `/uapi/domestic-stock/v1/ksdinfo/bonus-issue` | `HHKDB669101C0` | 무상증자 권리 정보 |
| 자본감소(감자) | `ksdinfo_cap_dcrs` | GET `/uapi/domestic-stock/v1/ksdinfo/cap-dcrs` | `HHKDB669106C0` | 감자 일정·내역 |
| 실권주 | `ksdinfo_forfeit` | GET `/uapi/domestic-stock/v1/ksdinfo/forfeit` | `HHKDB669109C0` | 실권주 일반공모 정보 |
| 상장정보 | `ksdinfo_list_info` | GET `/uapi/domestic-stock/v1/ksdinfo/list-info` | `HHKDB669107C0` | 상장(신규/추가) 정보 |
| 의무예치 | `ksdinfo_mand_deposit` | GET `/uapi/domestic-stock/v1/ksdinfo/mand-deposit` | `HHKDB669110C0` | 의무보호예수 정보 |
| 합병/분할 | `ksdinfo_merger_split` | GET `/uapi/domestic-stock/v1/ksdinfo/merger-split` | `HHKDB669104C0` | 합병·분할 일정 |
| 유상증자 | `ksdinfo_paidin_capin` | GET `/uapi/domestic-stock/v1/ksdinfo/paidin-capin` | `HHKDB669100C0` | 유상증자 권리 정보 |
| 공모주 청약 | `ksdinfo_pub_offer` | GET `/uapi/domestic-stock/v1/ksdinfo/pub-offer` | `HHKDB669108C0` | 공모주 청약 일정 |
| 주식매수청구 | `ksdinfo_purreq` | GET `/uapi/domestic-stock/v1/ksdinfo/purreq` | `HHKDB669103C0` | 주식매수청구권 정보 |
| 액면병합(역분할) | `ksdinfo_rev_split` | GET `/uapi/domestic-stock/v1/ksdinfo/rev-split` | `HHKDB669105C0` | 액면병합 정보 |
| 주주총회 일정 | `ksdinfo_sharehld_meet` | GET `/uapi/domestic-stock/v1/ksdinfo/sharehld-meet` | `HHKDB669111C0` | 주주총회 일정 |

> 시드의 `period_rights` 는 `/uapi/domestic-stock/v1/trading/period-rights` (TR_ID `CTRGA011R`, "기간별계좌권리현황조회") 로 **계좌 기반 권리현황** → 계좌/주문 문서 소관. 시장 공통 권리정보는 `ksdinfo_*` 사용.

### 1-5. 대차 / 공매도 / 회원사 (quotations)

| API명(한글) | 함수명 | METHOD + URL | TR_ID | 한 줄 설명 |
|---|---|---|---|---|
| 일별 대차거래추이 | `daily_loan_trans` | GET `/uapi/domestic-stock/v1/quotations/daily-loan-trans` | `HHPST074500C0` | 종목 일별 대차거래 잔고/추이 |
| 일별 공매도추이 | `daily_short_sale` | GET `/uapi/domestic-stock/v1/quotations/daily-short-sale` | `FHPST04830000` | 종목 일별 공매도 거래량/비중 |
| 회원사 매도/매수 현황 | `inquire_member` | GET `/uapi/domestic-stock/v1/quotations/inquire-member` | `FHKST01010600` | 종목별 회원사(거래원) 매매 현황 |
| 회원사 일별 매매추이 | `inquire_member_daily` | GET `/uapi/domestic-stock/v1/quotations/inquire-member-daily` | `FHPST04540000` | 회원사 일별 순매수 추이 |

---

## 2. 핵심 엔드포인트 상세

### 2-1. `finance_income_statement` — 손익계산서 ✅ 포털 스펙 확정 (2026-05-29)

`FHKST66430200` · GET `/uapi/domestic-stock/v1/finance/income-statement` · **⚠️ 실전 전용(모의 미지원)** · HTS [0635] 재무분석종합 > 2.손익계산서 · `tr_cont` 다음조회 불가

**요청 파라미터**

| 키 | 필수 | 설명 | 예 |
|---|---|---|---|
| `FID_DIV_CLS_CODE` | O | 분류 구분 코드 — `0`: 년, `1`: 분기 (**분기데이터는 연단위 누적합산**) | `0` |
| `fid_cond_mrkt_div_code` | O | 조건 시장 분류 코드 | `J` |
| `fid_input_iscd` | O | 입력 종목코드 | `000660` |

**응답 필드 (`output`, Object Array — 결산기별 다건)**

| 필드 키 | 설명 |
|---|---|
| `stac_yymm` | 결산 년월 (`YYYYMM`) |
| `sale_account` | 매출액 |
| `sale_cost` | 매출원가 |
| `sale_totl_prfi` | 매출총이익 |
| `depr_cost` | 감가상각비 — ⚠️ **미출력 데이터(`99.99`로 표시)** |
| `sell_mang` | 판매및관리비 — ⚠️ **미출력 데이터(`99.99`)** |
| `bsop_prti` | 영업이익 |
| `bsop_non_ernn` | 영업외수익 — ⚠️ **미출력(`99.99`)** |
| `bsop_non_expn` | 영업외비용 — ⚠️ **미출력(`99.99`)** |
| `op_prfi` | 경상이익 |
| `spec_prfi` / `spec_loss` | 특별이익 / 특별손실 |
| `thtr_ntin` | 당기순이익 |

**주의:** 결산기준 데이터로 분기 시차 존재. 일부 필드(`depr_cost`/`sell_mang`/`bsop_non_ernn`/`bsop_non_expn`)는 값이 없으면 **`99.99`** 로 와서 그대로 숫자 변환하면 안 됨 — 파싱 시 `99.99` 가드 필요. 분기 선택 시 연단위 누적이므로 단일 분기값은 직전 분기 차감으로 산출.

### 2-2. `finance_ratio` — 재무비율 순위

`FHPST01750000` · GET `/uapi/domestic-stock/v1/ranking/finance-ratio` (screen `20175`)

**요청 파라미터** (소스 시그니처 그대로)

| 키 | 설명 | 예 |
|---|---|---|
| `fid_trgt_cls_code` | 대상 구분 코드 | `0`(전체) |
| `fid_cond_mrkt_div_code` | 조건 시장 분류 코드 | `J`(KRX), `NX`(NXT) |
| `fid_cond_scr_div_code` | 조건 화면 분류 코드(Unique key) | `20175` |
| `fid_input_iscd` | 입력 종목코드 | `0000`전체/`0001`거래소/`1001`코스닥/`2001`코스피200 |
| `fid_div_cls_code` | 분류 구분 코드 | `0`(전체) |
| `fid_input_price_1` / `fid_input_price_2` | 가격 범위(이상/이하) | 공백=전체 |
| `fid_vol_cnt` | 거래량 이상 | 공백=전체 |
| `fid_input_option_1` | 회계년도 | `2023` |
| `fid_input_option_2` | 분기 — `0`:1Q, `1`:반기, `2`:3Q, `3`:결산 | `3` |
| `fid_rank_sort_cls_code` | 순위 정렬 — `7`:수익성, `11`:안정성, `15`:성장성, `20`:활동성 | `7` |
| `fid_blng_cls_code` | 소속 구분 | `0` |
| `fid_trgt_exls_cls_code` | 대상 제외 구분 | `0`(전체) |

**주의:** `finance/` 가 아닌 `ranking/` 경로의 순위형 API. 개별 종목 단건 재무비율은 `finance_financial_ratio`(FHKST66430300) 사용.

### 2-3. `inquire_investor` — 주식현재가 투자자 [국내주식-012] ✅ 포털 스펙 확정 (2026-05-29)

`FHKST01010900` · GET `/uapi/domestic-stock/v1/quotations/inquire-investor` · **✅ 실전·모의 모두 지원(모의 TR_ID 동일 `FHKST01010900`)** · `tr_cont` 다음조회 **불가**

개인·외국인·기관 투자정보. 외국인 = 외국인(외국인투자등록 고유번호 보유)+기타 외국인. **당일 데이터는 장 종료 후 제공.**

**요청 파라미터**

| 키 | 필수 | 설명 | 예 |
|---|---|---|---|
| `env_dv` | (함수 인자) | 실전/모의 도메인 구분 — `real` / `demo`. TR_ID 는 동일 | `real` |
| `FID_COND_MRKT_DIV_CODE` | O | 조건 시장 분류 코드 | `J`(KRX), `NX`(NXT), `UN`(통합) |
| `FID_INPUT_ISCD` | O | 입력 종목코드 | `005930` |

**응답 필드 (`output`, Object Array — 일자별 다건)**

날짜/시세: `stck_bsop_date`(영업일자) · `stck_clpr`(종가) · `prdy_vrss`/`prdy_vrss_sign`(전일대비/부호).
투자자별: **`<prsn|frgn|orgn>_<지표>`** 3주체(개인/외국인/기관계) × 지표 조합.

| 지표 suffix | 의미 |
|---|---|
| `_ntby_qty` | 순매수 수량 |
| `_ntby_tr_pbmn` | 순매수 거래대금 |
| `_shnu_vol` / `_shnu_tr_pbmn` | 매수 거래량 / 매수 거래대금 |
| `_seln_vol` / `_seln_tr_pbmn` | 매도 거래량 / 매도 거래대금 |

→ 총 18개: `prsn_ntby_qty`/`frgn_ntby_qty`/`orgn_ntby_qty`, `*_ntby_tr_pbmn`, `*_shnu_vol`, `*_shnu_tr_pbmn`, `*_seln_vol`, `*_seln_tr_pbmn`.

**주의:** 위 §2-6 `investor_trade_by_stock_daily` 와 달리 **개인·외국인·기관계 3주체로만** 집계(증권/투신/사모펀드 등 세분류 없음)되고 **실전·모의 모두 지원**한다. 순매수는 음수면 순매도(문자열). 다음조회 불가라 한 번에 오는 최근 N일치만 제공.

### 2-4. `frgnmem_trade_trend` — 회원사 실시간 매매동향(틱) ✅ 포털 스펙 확정 (2026-05-29)

`FHPST04320000` · GET `/uapi/domestic-stock/v1/quotations/frgnmem-trade-trend` (screen `20432`) · **⚠️ 실전 전용(모의 미지원)** · `tr_cont` 다음조회 불가 · **최근 100건까지** 조회

HTS [0432] 회원사 실시간 매매동향 화면. (이름은 "추이"지만 실제는 틱 단위 실시간 매매동향)

**요청 파라미터**

| 키 | 설명 | 예 |
|---|---|---|
| `FID_COND_SCR_DIV_CODE` | 화면분류코드(primary key) | `20432` |
| `FID_COND_MRKT_DIV_CODE` | 조건 시장 분류 코드 (고정) | `J` |
| `FID_INPUT_ISCD` | 종목코드 | `005930` |
| `FID_INPUT_ISCD_2` | 회원사 코드 | `99999`(전체) |
| `FID_MRKT_CLS_CODE` | 시장구분 — `A`전체/`K`코스피/`Q`코스닥/`K2`코스피200/`W`ELW | `A` |
| `FID_VOL_CNT` | 거래량 이상 | 공백=전체 |

> ⚠️ `FID_INPUT_ISCD`(종목코드) 와 `FID_MRKT_CLS_CODE`(시장구분코드) 는 **둘 중 하나만** 입력. 회원사 코드는 KIS Developers 포털 FAQ "종목정보 다운로드(국내)" 참조.

**응답 — `output1` (Object, 합계)**

| 필드 키 | 의미 |
|---|---|
| `total_seln_qty` | 총 매도 수량 |
| `total_shnu_qty` | 총 매수 수량 |

**응답 — `output2` (Object Array, 틱별 최대 100건)**

| 필드 키 | 의미 |
|---|---|
| `bsop_hour` | 영업시간 (`HHMMSS`) |
| `mbcr_name` | 회원사명 |
| `hts_kor_isnm` | HTS 한글 종목명 |
| `stck_prpr` | 주식 현재가 |
| `prdy_vrss` / `prdy_vrss_sign` | 전일대비 / 부호 |
| `cntg_vol` | 체결 거래량 |
| `acml_ntby_qty` | 누적 순매수 수량 |
| `glob_ntby_qty` | 외국계 순매수 수량 |
| `frgn_ntby_qty_icdc` | 외국인 순매수 수량 증감 |

**주의:** 시그널엔 `glob_ntby_qty`(외국계 순매수)·`frgn_ntby_qty_icdc`(외국인 순매수 증감)가 외국계 수급 강도 피처로 유용. 실시간 틱이라 장중에만 의미.

### 2-5. `daily_short_sale` — 일별 공매도 추이 ✅ 포털 스펙 확정 (2026-05-29)

`FHPST04830000` · GET `/uapi/domestic-stock/v1/quotations/daily-short-sale` · **⚠️ 실전 전용(모의 미지원)** · `tr_cont` 다음조회 불가

**요청 파라미터**

| 키 | 필수 | 설명 | 예 |
|---|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | O | 시장분류코드 | `J`(주식) |
| `FID_INPUT_ISCD` | O | 종목코드 | `005930` |
| `FID_INPUT_DATE_1` | O | 입력 날짜1 (기간 시작, 공백시 전체) | `20250101` |
| `FID_INPUT_DATE_2` | O | 입력 날짜2 (기간 종료, ~누적) | `20250131` |

**응답 — `output1` (Object, 현재 요약)**: `stck_prpr`(현재가) · `prdy_vrss`/`prdy_vrss_sign`/`prdy_ctrt`(전일대비/부호/율) · `acml_vol`(누적거래량) · `prdy_vol`(전일거래량).

**응답 — `output2` (Object Array, 일자별)**

| 필드 키 | 의미 |
|---|---|
| `stck_bsop_date` | 영업일자 |
| `stck_clpr` · `stck_oprc`/`stck_hgpr`/`stck_lwpr` | 종가 · 시/고/저 |
| `prdy_vrss`/`prdy_vrss_sign`/`prdy_ctrt` | 전일대비/부호/율 |
| `acml_vol` · `acml_tr_pbmn` | 누적 거래량 · 누적 거래대금 |
| `ssts_cntg_qty` | **공매도 체결 수량** |
| `ssts_vol_rlim` | **공매도 거래량 비중(%)** |
| `acml_ssts_cntg_qty` / `acml_ssts_cntg_qty_rlim` | 누적 공매도 체결수량 / 비중 |
| `ssts_tr_pbmn` / `ssts_tr_pbmn_rlim` | 공매도 거래대금 / 비중 |
| `acml_ssts_tr_pbmn` / `acml_ssts_tr_pbmn_rlim` | 누적 공매도 거래대금 / 비중 |
| `stnd_vol_smtn` / `stnd_tr_pbmn_smtn` | 기준 거래량 합계 / 거래대금 합계 |
| `avrg_prc` | 평균가격(공매도 평균체결가) |

**주의:** 시그널엔 `ssts_vol_rlim`(공매도 거래량 비중) 급증이 하락 압력 피처. 공매도 집계는 거래소 기준 통상 1영업일 시차.

### 2-6. `investor_trade_by_stock_daily` — 종목별 일별 투자자매매동향 ✅ 포털 스펙 확정 (2026-05-29)

`FHPTJ04160001` · GET `/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily`
HTS eFriend Plus [0416] 종목별 일별동향 화면. **⚠️ 실전 전용 — 모의투자 미지원.**

> **단위**: 금액 = **백만원**, 수량 = **주**.
> **시간 제약**: 당일 데이터는 **15:40 이후** 가집계·산출되어 그때부터 조회 가능. API로는 `00:00~15:40` 시간대의 **당일 조회가 제한**됨(과거 일자는 무관). 당일 조회는 장 종료 후 정상.

**요청 파라미터** (Query)

| 키 | 필수 | 설명 | 예 |
|---|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | O | 조건 시장 분류 코드 | `J`(KRX) / `NX`(NXT) / `UN`(통합) |
| `FID_INPUT_ISCD` | O | 입력 종목코드(6자리) | `005930` |
| `FID_INPUT_DATE_1` | O | 입력 날짜(`YYYYMMDD`). 당일은 장 종료 후 조회 | `20250812` |
| `FID_ORG_ADJ_PRC` | O | 수정주가 원주가 가격 — **공란 입력** | `` |
| `FID_ETC_CLS_CODE` | O | 기타 구분 코드 — **`1` 입력** | `1` |

**응답 — `output1` (Object, 종목 요약 현재가)**

| 필드 키 | 의미 |
|---|---|
| `stck_prpr` | 주식 현재가 |
| `prdy_vrss` / `prdy_vrss_sign` / `prdy_ctrt` | 전일 대비 / 부호(1상한·2상승·3보합·4하한·5하락) / 전일 대비율 |
| `acml_vol` / `prdy_vol` | 누적 거래량 / 전일 거래량 |
| `rprs_mrkt_kor_name` | 대표 시장 한글명 |

**응답 — `output2` (Object Array, 일자별 + 투자자별)**

날짜·시세 컬럼 + 투자자별 매매 컬럼으로 구성. 투자자별 컬럼은 **`<투자자prefix>_<지표suffix>`** 조합이라 아래 두 표만으로 ~110개 필드 전부를 도출할 수 있다.

날짜/시세 컬럼: `stck_bsop_date`(영업일자) · `stck_clpr`(종가) · `prdy_vrss`/`prdy_vrss_sign`/`prdy_ctrt` · `acml_vol`(누적거래량, 주) · `acml_tr_pbmn`(누적거래대금, 백만원) · `stck_oprc`/`stck_hgpr`/`stck_lwpr`(시/고/저) · `bold_yn`(BOLD 여부).

투자자 prefix:

| prefix | 투자자 | prefix | 투자자 |
|---|---|---|---|
| `frgn` | 외국인(전체) | `scrt` | 증권 |
| `frgn_reg` / `frgn_nreg` | 외국인 등록 / 비등록 | `ivtr` | 투자신탁 |
| `prsn` | 개인 | `pe_fund` | 사모펀드 |
| `orgn` | 기관계 | `bank` | 은행 |
| `insu` | 보험 | `mrbn` | 종금 |
| `fund` | 기금 | `etc` | 기타 |
| `etc_corp` | 기타법인 | `etc_orgt` | 기타단체 |

지표 suffix:

| suffix | 의미 | 단위 |
|---|---|---|
| `_ntby_qty` (일부 `_ntby_vol`) | **순매수 수량** | 주 |
| `_ntby_tr_pbmn` (외국인 일부 `_ntby_pbmn`) | **순매수 거래대금** | 백만원 |
| `_shnu_vol` / `_seln_vol` | 매수 / 매도 거래량 | 주 |
| `_shnu_tr_pbmn` / `_seln_tr_pbmn` | 매수 / 매도 거래대금 | 백만원 |
| `_bidp_qty` / `_askp_qty` (외국인 등록·비등록 한정) | 매수 / 매도 수량 | 주 |

예) `frgn_ntby_qty`=외국인 순매수 수량, `orgn_ntby_tr_pbmn`=기관계 순매수 거래대금, `prsn_shnu_vol`=개인 매수 거래량.

**시그널 관점 핵심 필드** (수급 피처로 바로 쓸 것):

| 필드 | 의미 |
|---|---|
| `frgn_ntby_qty` | 외국인 순매수 수량 (외국인 전체) |
| `orgn_ntby_qty` | 기관계 순매수 수량 |
| `prsn_ntby_qty` | 개인 순매수 수량 |
| `frgn_reg_ntby_qty` | 외국인 등록(=거래소 신고 외국인) 순매수 수량 |
| `*_ntby_tr_pbmn` | 위 각 주체의 순매수 거래대금(백만원) — 금액 가중에 사용 |

**부호 규칙**: 순매수 컬럼은 **음수면 순매도**(예: `-12345`). 매수우위 = 양수. (포털 스펙에 부호 별도 명시는 없으나 KIS 순매수 표준이며 문자열로 옴 → `Number.parseFloat` 자연 처리.)

### 2-7. `invest_opinion` / `invest_opbysec` — 투자의견 ✅ 포털 스펙 확정 (2026-05-29)

둘 다 **⚠️ 실전 전용(모의 미지원)** · `tr_cont` 다음조회 불가 · 일자 파라미터(`FID_INPUT_DATE_1`~`FID_INPUT_DATE_2`)로 페이징.

**(a) `invest_opinion` — 종목 투자의견** `FHKST663300C0` · `/quotations/invest-opinion` · HTS [0605] · **1회 100건**

요청: `FID_COND_MRKT_DIV_CODE`(`J`) · `FID_COND_SCR_DIV_CODE`(`16633` primary key) · `FID_INPUT_ISCD`(종목코드) · `FID_INPUT_DATE_1`(이후~) · `FID_INPUT_DATE_2`(~이전).

응답 (`output`, Array): `stck_bsop_date`(영업일자) · `invt_opnn`(투자의견) · `invt_opnn_cls_code`(투자의견구분코드) · `rgbf_invt_opnn`(직전투자의견) · `rgbf_invt_opnn_cls_code` · `mbcr_name`(회원사명) · `hts_goal_prc`(**HTS목표가격**) · `stck_prdy_clpr`(전일종가) · `stck_nday_esdg`/`nday_dprt`(N일 괴리도/괴리율) · `stft_esdg`/`dprt`(선물 괴리도/괴리율).

**(b) `invest_opbysec` — 증권사별 투자의견** `FHKST663400C0` · `/quotations/invest-opbysec` · HTS [0608] · **1회 20건**

요청: `FID_COND_MRKT_DIV_CODE`(`J`) · `FID_COND_SCR_DIV_CODE`(`16634`) · `FID_INPUT_ISCD`(**회원사코드** — 포털 FAQ 종목정보 다운로드 참조) · `FID_DIV_CLS_CODE`(전체0/매수1/중립2/매도3) · `FID_INPUT_DATE_1`~`FID_INPUT_DATE_2`.

응답 (`output`, Array): `stck_bsop_date` · `stck_shrn_iscd`(단축종목코드) · `hts_kor_isnm`(종목명) · `invt_opnn`/`invt_opnn_cls_code` · `rgbf_invt_opnn`/`rgbf_invt_opnn_cls_code` · `mbcr_name` · `stck_prpr`/`prdy_vrss`/`prdy_vrss_sign`/`prdy_ctrt` · `hts_goal_prc`(목표가) · `stck_prdy_clpr` · `stft_esdg`/`dprt`(괴리도/괴리율).

> 시그널엔 `hts_goal_prc`(목표가) vs `stck_prpr`(현재가) 의 상승여력, `invt_opnn_cls_code` 변경(직전 대비 상향/하향)이 컨센서스 모멘텀 피처. 두 API 다 `invt_opnn_cls_code` enum 값 의미는 (확인 필요).

---

## 3. 시그널 알고리즘 활용 힌트

- **수급 모멘텀**: `inquire_investor` / `frgnmem_trade_trend` / `foreign_institution_total` 의 외국인·기관 순매수 수량(연속 N일 누적, 거래대금 가중)을 매수/매도 압력 피처로 사용 — 외국인+기관 동반 순매수는 강세 시그널 입력.
- **펀더멘털 필터**: `finance_financial_ratio`·`finance_profit_ratio`(ROE)·`finance_stability_ratio`(부채비율)·`finance_growth_ratio`(이익증가율) 로 저(高)퀄리티 종목을 사전 스크리닝해 기술적 시그널의 오탐을 줄이는 게이트로 활용.
- **반대 수급 경보**: `daily_short_sale`(공매도 비중 급증), `daily_loan_trans`(대차잔고 증가), 프로그램 순매도(`program_trade_by_stock`)는 하락 리스크 가중치 또는 청산 트리거로 사용.

---

## 4. 미확인 / 후속

- **응답 output 필드 키**: `examples_llm/*/*.py` 가 `pd.DataFrame(res.getBody().output)` 만 표기, 실제 컬럼 키 미수록. **§2 핵심 5종(`finance_income_statement`·`inquire_investor`·`frgnmem_trade_trend`·`daily_short_sale`·`investor_trade_by_stock_daily`)은 포털 스펙으로 확정(2026-05-29).** 나머지(대차대조표·각종 재무비율·프로그램매매·예탁원·회원사 등) 응답 키는 미검증.
- **`invest_opinion` / `invest_opbysec` TR_ID**: 소스에서 명시 추출 실패(screen 16633/16634 만 확인). 포털 문서로 TR_ID 확인 필요.
- **`index_program_trade`**: 시드에 있으나 functions.py 동명 함수 부재. 지수 단위 프로그램매매는 별도 문서/미제공 여부 확인 필요. (종목 단위 `program_trade_by_stock`·`program_trade_by_stock_daily` 로 대체 포함)
- **`period_rights`(`CTRGA011R`)**: 계좌 기반 권리현황 → 계좌/주문 문서로 이관 대상.
- **실전/모의 지원 매트릭스** (검증된 것):
  - ✅ 실전·모의 모두: `inquire_investor`(모의 TR_ID 동일 `FHKST01010900`)
  - ⚠️ 실전 전용(모의 미지원): `finance_income_statement`, `frgnmem_trade_trend`, `daily_short_sale`, `investor_trade_by_stock_daily`
  - 미검증: 나머지 재무·수급·예탁원 API (실전 전용일 가능성 높음 — 항목별 확인 필요)
- **추가 발견 시리즈 함수**(시드 미포함, 본 문서 카탈로그에 포함): `finance_ratio`(ranking), `program_trade_by_stock`, `program_trade_by_stock_daily`, `ksdinfo_merger_split`, `ksdinfo_paidin_capin`, `ksdinfo_pub_offer`, `ksdinfo_purreq`, `ksdinfo_rev_split`, `ksdinfo_sharehld_meet`.
