# KIS Open API — 국내주식 기본시세 / 호가 / 체결 / 차트 / 지수

한국투자증권(KIS) Open API 중 **국내주식 시세 계열**(현재가·일자별·호가·체결·차트·지수·관심종목·휴장일 등) 엔드포인트 레퍼런스.

- **출처**: [`examples_user/domestic_stock/domestic_stock_functions.py`](https://github.com/koreainvestment/open-trading-api/blob/main/examples_user/domestic_stock/domestic_stock_functions.py) (카탈로그·URL·TR_ID·파라미터), [`examples_llm/domestic_stock/*/chk_*.py`](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock) (응답 필드)
- **갱신일**: 2026-05-29
- **인증·도메인·공통 헤더·연속조회(`tr_cont`) 규약은 [00-auth-and-common.md](./00-auth-and-common.md) 참조.**

모든 URL은 `/uapi/domestic-stock/v1/...` 이며 별도 표기 없으면 **HTTP GET**(소스의 `ka._url_fetch` 기본). 응답 값은 **모두 문자열**로 내려온다(예: `stck_prpr="71500"`). 숫자 변환은 클라이언트 책임.

---

## 0. 시세 계열 공통 함정 (우리 코드 기준 — 반드시 숙지)

- **종목명 vs 업종명 혼동 주의**
  - `hts_kor_isnm` = **종목명** (예: `삼성전자`)
  - `bstp_kor_isnm` = **업종 한글명** (예: `전기·전자`) — **종목명이 아니다!**
  - `prdt_name` = 종목명 fallback
  - → `inquire_price` 응답 내 종목명 추출 우선순위: **`hts_kor_isnm` → `prdt_name` → ticker(종목코드)**
  - ⚠️ **`inquire_price`의 `hts_kor_isnm`은 prod에서도 빈 값으로 오는 경우 확인됨**(2026-05-29 스모크) → 단독으로는 종목명 못 얻을 수 있음.
  - ✅ **종목명 1차 소스는 `search-stock-info`(주식기본조회, §2-7)의 `prdt_abrv_name`**("삼성전자", 실호출 확정). KIS 내부에서 해결되므로 DART corp_code 매핑 불필요. 정식 법인명("삼성전자주식회사")이 필요할 때만 DART `company.json` 보조 사용.
- **숫자도 문자열로 옴**: `stck_prpr`, `prdy_vrss`, `acml_vol` 등 전부 string. 파싱 필요.
- **`prdy_vrss_sign` (전일 대비 부호) 코드값**: `1`=상한, `2`=상승, `3`=보합, `4`=하한, `5`=하락.
- **쿼리 공통 파라미터**
  - `FID_COND_MRKT_DIV_CODE` = 조건 시장 분류 코드: **`J`=KRX(주식)**, `NX`=NXT, `UN`=통합
  - `FID_INPUT_ISCD` = 입력 종목코드: **6자리 종목코드**(예 `005930` 삼성전자). ETN은 6자리 앞에 `Q` 붙임.
- **현재가 TR_ID** = `FHKST01010100`, **일자별 TR_ID** = `FHKST01010400` (`FID_PERIOD_DIV_CODE=D|W|M`, `FID_ORG_ADJ_PRC=0`(미반영)/`1`(수정주가반영)).
- **휴장일조회(`chk_holiday`)** 는 원장 서비스 부하로 **1일 1회 호출 권장**. 개장일 여부는 `opnd_yn` 사용.
- `env_dv`(`real`/`demo`) 파라미터는 소스 함수의 실전/모의 분기용일 뿐이며, 대부분 시세 TR은 실전/모의 TR_ID가 동일하다(예: `inquire_price` 둘 다 `FHKST01010100`).

---

## 1. 카탈로그 표

> METHOD는 전부 GET. URL 접두어 `/uapi/domestic-stock/v1` 는 표에서 생략.

### 1-1. 기본시세 / 호가 / 체결

| API명(한글 용도) | 함수명 | URL (GET) | TR_ID | 설명 |
|---|---|---|---|---|
| 주식 현재가 시세 | `inquire_price` | `/quotations/inquire-price` | `FHKST01010100` | 현재가·등락·거래량·PER/PBR·52주/연중 고저 등 종합 시세 |
| 주식 현재가 시세2 | `inquire_price_2` | `/quotations/inquire-price-2` | `FHPST01010000` | 현재가 시세 보조(시세2) |
| 주식 현재가 일자별 | `inquire_daily_price` | `/quotations/inquire-daily-price` | `FHKST01010400` | 일/주/월 주가(최근 30건 제한), 수정주가 옵션 |
| 시간외 일자별 주가 | `inquire_daily_overtimeprice` | `/quotations/inquire-daily-overtimeprice` | `FHPST02320000` | 시간외 단일가 일자별 시세 |
| 시간외 현재가 | `inquire_overtime_price` | `/quotations/inquire-overtime-price` | `FHPST02300000` | 시간외 단일가 현재가 |
| 시간외 호가 | `inquire_overtime_asking_price` | `/quotations/inquire-overtime-asking-price` | `FHPST02300400` | 시간외 단일가 호가 |
| 주식 현재가 호가/예상체결 | `inquire_asking_price_exp_ccn` | `/quotations/inquire-asking-price-exp-ccn` | `FHKST01010200` | 10단계 매도/매수 호가·잔량 + 예상체결가 |
| 주식 현재가 체결 | `inquire_ccnl` | `/quotations/inquire-ccnl` | `FHKST01010300` | 체결가/체결량 시계열(틱) |
| ELW 현재가 시세 | `inquire_elw_price` | `/quotations/inquire-elw-price` | `FHKEW15010000` | ELW 현재가 |
| 종목별 일별 매수매도 체결량 | `inquire_daily_trade_volume` | `/quotations/inquire-daily-trade-volume` | `FHKST03010800` | 일자별 매수/매도 체결량 |
| 변동성완화장치(VI) 현황 | `inquire_vi_status` | `/quotations/inquire-vi-status` | `FHPST01390000` | VI 발동 종목 현황 |
| 국내 휴장일 조회 | `chk_holiday` | `/quotations/chk-holiday` | `CTCA0903R` | 영업/거래/개장/결제일 여부 (1일 1회 권장) |

### 1-2. 예상체결 / 예상지수

| API명(한글 용도) | 함수명 | URL (GET) | TR_ID | 설명 |
|---|---|---|---|---|
| 예상체결 종가 추이 | `exp_closing_price` | `/quotations/exp-closing-price` | `FHKST117300C0` | 장마감 예상 종가 추이 |
| 예상체결가 추이 | `exp_price_trend` | `/quotations/exp-price-trend` | `FHPST01810000` | 시간대별 예상체결가 추이 |
| 예상체결 상승/하락 추이 | `exp_trans_updown` | `/ranking/exp-trans-updown` | `FHPST01820000` | 예상체결 기준 상승/하락 (URL이 `ranking` 하위) |
| 예상 업종지수 추이 | `exp_index_trend` | `/quotations/exp-index-trend` | `FHPST01840000` | 예상 업종지수 시간대별 추이 |
| 예상 전체지수 | `exp_total_index` | `/quotations/exp-total-index` | `FHKUP11750000` | 예상 전체(시장) 지수 |

### 1-3. 지수(업종) 시세

| API명(한글 용도) | 함수명 | URL (GET) | TR_ID | 설명 |
|---|---|---|---|---|
| 업종 지수 현재가 | `inquire_index_price` | `/quotations/inquire-index-price` | `FHPUP02100000` | 업종/지수 현재가·등락·상승/하락 종목수 |
| 업종 지수 일자별 | `inquire_index_daily_price` | `/quotations/inquire-index-daily-price` | `FHPUP02120000` | 업종/지수 일자별 시세 |
| 업종별 지수 | `inquire_index_category_price` | `/quotations/inquire-index-category-price` | `FHPUP02140000` | 업종 카테고리별 지수 |
| 지수 분틱 시세 | `inquire_index_tickprice` | `/quotations/inquire-index-tickprice` | `FHPUP02110100` | 지수 틱 시세 |
| 지수 시간별 시세 | `inquire_index_timeprice` | `/quotations/inquire-index-timeprice` | `FHPUP02110200` | 지수 분/시간별 시세 |

### 1-4. 차트 (기간별/분봉)

| API명(한글 용도) | 함수명 | URL (GET) | TR_ID | 설명 |
|---|---|---|---|---|
| 국내주식 기간별 시세(일/주/월/년) | `inquire_daily_itemchartprice` | `/quotations/inquire-daily-itemchartprice` | `FHKST03010100` | 종목 일/주/월/년 차트(1회 최대 100건) |
| 업종 기간별 차트(일/주/월/년) | `inquire_daily_indexchartprice` | `/quotations/inquire-daily-indexchartprice` | `FHKUP03500100` | 업종/지수 기간별 차트 |
| 종목 당일 분봉 | `inquire_time_itemchartprice` | `/quotations/inquire-time-itemchartprice` | `FHKST03010200` | 종목 당일 분봉 차트 |
| 업종 당일 분봉 | `inquire_time_indexchartprice` | `/quotations/inquire-time-indexchartprice` | `FHKUP03500200` | 업종/지수 당일 분봉 |
| 종목 일별 분봉(기간) | `inquire_time_dailychartprice` | `/quotations/inquire-time-dailychartprice` | `FHKST03010230` | 종목 일자별 분봉(과거 분봉) |
| 당일 시간대별 체결 | `inquire_time_itemconclusion` | `/quotations/inquire-time-itemconclusion` | `FHPST01060000` | 당일 시간대별 체결 내역 |
| 시간외 시간대별 체결 | `inquire_time_overtimeconclusion` | `/quotations/inquire-time-overtimeconclusion` | `FHPST02310000` | 시간외 단일가 시간대별 체결 |

### 1-5. 관심종목(Interest Stock)

| API명(한글 용도) | 함수명 | URL (GET) | TR_ID | 설명 |
|---|---|---|---|---|
| 관심종목 그룹 목록 | `intstock_grouplist` | `/quotations/intstock-grouplist` | `HHKCM113004C7` | 사용자 관심종목 그룹 리스트 |
| 관심종목 그룹별 종목 목록 | `intstock_stocklist_by_group` | `/quotations/intstock-stocklist-by-group` | `HHKCM113004C6` | 특정 그룹의 종목 리스트 |
| 관심종목 복수 시세 | `intstock_multprice` | `/quotations/intstock-multprice` | `FHKST11300006` | 복수 종목 일괄 시세 조회 |

### 1-6. 종목 기본정보 (종목명·메타 조회)

| API명(한글 용도) | 함수명 | URL (GET) | TR_ID | 설명 |
|---|---|---|---|---|
| 주식기본조회 | `search_stock_info` | `/quotations/search-stock-info` | `CTPF1002R` | **종목명(`prdt_abrv_name`)+시장·상장·업종·거래정지/관리·NXT 등 상세** (⚠️실전 전용, 상세 §2-7) |
| 상품기본조회 | `search_info` | `/quotations/search-info` | `CTPF1604R` | 상품(주식/선물/해외 등) 공통 기본정보·종목명 (⚠️실전 전용) |

> 두 API 모두 **모의 미지원·`tr_cont` 다음조회 불가**. 종목명/메타 해결의 1차 소스는 `search_stock_info`(§2-7).

---

## 2. 핵심 엔드포인트 상세

### 2-1. `inquire_price` — 주식 현재가 시세 (TR_ID `FHKST01010100`)

시그널/화면에서 가장 자주 쓰는 단일 종목 종합 시세. 실시간이 필요하면 웹소켓 사용.

**요청 파라미터**

| 키 | 필수 | 설명 | 예시 |
|---|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | Y | 조건 시장 분류 코드 (`J`=KRX, `NX`=NXT, `UN`=통합) | `J` |
| `FID_INPUT_ISCD` | Y | 입력 종목코드(6자리). ETN은 앞에 `Q` | `005930` |

> 소스의 `env_dv`(`real`/`demo`)는 호출 함수 인자이며 둘 다 TR_ID 동일(`FHKST01010100`).

**주요 응답 필드** (`output`, 단일 객체)

| 원문키 | 한글 의미 | 타입 |
|---|---|---|
| `stck_prpr` | 주식 현재가 | string(숫자) |
| `prdy_vrss` | 전일 대비 | string(숫자) |
| `prdy_vrss_sign` | 전일 대비 부호 (1상한 2상승 3보합 4하한 5하락) | string |
| `prdy_ctrt` | 전일 대비율(%) | string(숫자) |
| `acml_vol` | 누적 거래량 | string(숫자) |
| `acml_tr_pbmn` | 누적 거래 대금 | string(숫자) |
| `stck_oprc` / `stck_hgpr` / `stck_lwpr` | 시가 / 최고가 / 최저가 | string(숫자) |
| `stck_mxpr` / `stck_llam` / `stck_sdpr` | 상한가 / 하한가 / 기준가 | string(숫자) |
| `bstp_kor_isnm` | **업종 한글명** (종목명 아님!) | string |
| `rprs_mrkt_kor_name` | 대표 시장 한글명 | string |
| `stck_shrn_iscd` | 주식 단축 종목코드 | string |
| `per` / `pbr` / `eps` / `bps` | PER / PBR / EPS / BPS | string(숫자) |
| `hts_avls` | 시가총액(HTS) | string(숫자) |
| `lstn_stcn` | 상장 주수 | string(숫자) |
| `cpfn` | 자본금 | string(숫자) |
| `vol_tnrt` | 거래량 회전율 | string(숫자) |
| `hts_frgn_ehrt` | HTS 외국인 소진율 | string(숫자) |
| `frgn_ntby_qty` / `frgn_hldn_qty` | 외국인 순매수 수량 / 보유 수량 | string(숫자) |
| `pgtr_ntby_qty` | 프로그램매매 순매수 수량 | string(숫자) |
| `w52_hgpr` / `w52_hgpr_date` / `w52_lwpr` / `w52_lwpr_date` | 52주 최고/최저가 및 일자 | string |
| `d250_hgpr` / `d250_lwpr` | 250일 최고/최저가 | string(숫자) |
| `stck_dryy_hgpr` / `stck_dryy_lwpr` | 연중 최고/최저가 | string(숫자) |
| `vi_cls_code` / `ovtm_vi_cls_code` | VI 적용 구분 / 시간외단일가 VI 적용 구분 | string |
| `mrkt_warn_cls_code` | 시장경고 코드 | string |
| `invt_caful_yn` / `short_over_yn` / `sltr_yn` / `mang_issu_cls_code` | 투자유의 / 단기과열 / 정리매매 / 관리종목 여부 | string(Y/N·코드) |
| `ssts_yn` | 공매도 가능 여부 | string |
| `iscd_stat_cls_code` | 종목 상태 구분 코드 | string |

> ⚠️ 이 엔드포인트의 `output`에는 `hts_kor_isnm`이 직접 없을 수 있어 종목명은 `prdt_name`/별도 조회로 보완. `bstp_kor_isnm`을 종목명으로 쓰면 안 됨(업종명). (응답에 `prdt_name` 포함 여부는 환경별로 다를 수 있어 **확인 필요**.)

---

### 2-2. `inquire_daily_price` — 주식 현재가 일자별 (TR_ID `FHKST01010400`)

일/주/월 주가. **최근 30건으로 제한**. 기간을 더 길게/세밀하게 받으려면 `inquire_daily_itemchartprice`(차트) 사용.

**요청 파라미터**

| 키 | 필수 | 설명 | 예시 |
|---|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | Y | 시장 분류 (`J`=KRX 등) | `J` |
| `FID_INPUT_ISCD` | Y | 종목코드 6자리 | `005930` |
| `FID_PERIOD_DIV_CODE` | Y | 기간 분류 `D`(일 30거래일) / `W`(주 30주) / `M`(월 30개월) | `D` |
| `FID_ORG_ADJ_PRC` | Y | `0`=수정주가 미반영, `1`=수정주가 반영(액면분할/병합 보정) | `0` |

**주요 응답 필드** (`output`, 배열 — 일자별 row)

| 원문키 | 한글 의미 | 타입 |
|---|---|---|
| `stck_bsop_date` | 주식 영업 일자(YYYYMMDD) | string |
| `stck_oprc` / `stck_hgpr` / `stck_lwpr` / `stck_clpr` | 시가 / 고가 / 저가 / 종가 | string(숫자) |
| `acml_vol` | 누적 거래량 | string(숫자) |
| `prdy_vrss` / `prdy_vrss_sign` / `prdy_ctrt` | 전일 대비 / 부호 / 대비율 | string |
| `prdy_vrss_vol_rate` | 전일 대비 거래량 비율 | string(숫자) |
| `hts_frgn_ehrt` | HTS 외국인 소진율 | string(숫자) |
| `frgn_ntby_qty` | 외국인 순매수 수량 | string(숫자) |
| `flng_cls_code` | 락 구분 코드 | string |
| `acml_prtt_rate` | 누적 분할 비율 | string(숫자) |

---

### 2-3. `inquire_daily_itemchartprice` — 국내주식 기간별 시세(일/주/월/년) (TR_ID `FHKST03010100`)

차트용. **1회 호출 최대 100건**. 응답이 **2개 블록**(output1=종목 요약, output2=기간별 OHLCV)으로 나뉜다.

**요청 파라미터**

| 키 | 필수 | 설명 | 예시 |
|---|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | Y | 시장 분류 (`J` 등) | `J` |
| `FID_INPUT_ISCD` | Y | 종목코드 6자리 | `005930` |
| `FID_INPUT_DATE_1` | Y | 조회 시작일자 (YYYYMMDD) | `20240101` |
| `FID_INPUT_DATE_2` | Y | 조회 종료일자 (YYYYMMDD) | `20240331` |
| `FID_PERIOD_DIV_CODE` | Y | 기간분류 `D`/`W`/`M`/`Y` | `D` |
| `FID_ORG_ADJ_PRC` | Y | `0`=미반영, `1`=수정주가 반영 | `0` |

**응답 — output1 (종목 요약 단일 객체)**

| 원문키 | 한글 의미 | 타입 |
|---|---|---|
| `hts_kor_isnm` | **HTS 한글 종목명** (종목명!) | string |
| `stck_shrn_iscd` | 주식 단축 종목코드 | string |
| `stck_prpr` | 주식 현재가 | string(숫자) |
| `prdy_vrss` / `prdy_vrss_sign` / `prdy_ctrt` | 전일 대비 / 부호 / 대비율 | string |
| `stck_prdy_clpr` / `stck_prdy_oprc` / `stck_prdy_hgpr` / `stck_prdy_lwpr` | 전일 종가/시가/고가/저가 | string(숫자) |
| `acml_vol` / `acml_tr_pbmn` | 누적 거래량 / 거래대금 | string(숫자) |
| `stck_mxpr` / `stck_llam` | 상한가 / 하한가 | string(숫자) |
| `askp` / `bidp` | 매도호가 / 매수호가 | string(숫자) |
| `per` / `eps` / `pbr` | PER / EPS / PBR | string(숫자) |
| `hts_avls` / `lstn_stcn` / `cpfn` / `stck_fcam` | 시총 / 상장주수 / 자본금 / 액면가 | string(숫자) |
| `vol_tnrt` | 거래량 회전율 | string(숫자) |

**응답 — output2 (기간별 OHLCV 배열)**

| 원문키 | 한글 의미 | 타입 |
|---|---|---|
| `stck_bsop_date` | 영업 일자(YYYYMMDD) | string |
| `stck_oprc` / `stck_hgpr` / `stck_lwpr` / `stck_clpr` | 시가 / 고가 / 저가 / 종가 | string(숫자) |
| `acml_vol` / `acml_tr_pbmn` | 누적 거래량 / 거래대금 | string(숫자) |
| `flng_cls_code` | 락 구분 코드 | string |
| `prtt_rate` | 분할 비율 | string(숫자) |
| `mod_yn` | 변경 여부 | string(Y/N) |
| `prdy_vrss` / `prdy_vrss_sign` | 전일 대비 / 부호 | string |
| `revl_issu_reas` | 재평가 사유 코드 | string |

> 차트에서 종목명은 **output1.`hts_kor_isnm`** 사용. (여기엔 종목명이 명시적으로 있음.)

---

### 2-4. `inquire_index_price` — 국내업종 현재지수 (TR_ID `FHPUP02100000`) ✅ 포털 스펙 확정 (2026-05-29)

업종/지수 현재지수. HTS [0210] 업종 현재지수 화면. **⚠️ 실전 전용(모의 미지원)** · `tr_cont` 다음조회 **불가**.

**요청 파라미터** ✅ 지수 코드 체계 확정

| 키 | 필수 | 설명 | 예시 |
|---|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | Y | FID 조건 시장 분류 코드 — 업종은 **`U`** | `U` |
| `FID_INPUT_ISCD` | Y | FID 입력 종목(업종)코드 — **코스피 `0001` / 코스닥 `1001` / 코스피200 `2001`** (그 외 업종코드는 포털 FAQ "종목정보 다운로드(국내) - 업종코드" 참조) | `0001` |

**주요 응답 필드** (`output`)

| 원문키 | 한글 의미 | 타입 |
|---|---|---|
| `bstp_nmix_prpr` | 업종 지수 현재가 | string(숫자) |
| `bstp_nmix_prdy_vrss` | 업종 지수 전일 대비 | string(숫자) |
| `prdy_vrss_sign` | 전일 대비 부호 | string |
| `bstp_nmix_prdy_ctrt` | 업종 지수 전일 대비율 | string(숫자) |
| `acml_vol` / `prdy_vol` | 누적 / 전일 거래량 | string(숫자) |
| `acml_tr_pbmn` / `prdy_tr_pbmn` | 누적 / 전일 거래대금 | string(숫자) |
| `bstp_nmix_oprc` / `bstp_nmix_hgpr` / `bstp_nmix_lwpr` | 지수 시가 / 고가 / 저가 | string(숫자) |
| `ascn_issu_cnt` / `uplm_issu_cnt` | 상승 종목 수 / 상한 종목 수 | string(숫자) |
| `stnr_issu_cnt` | 보합 종목 수 | string(숫자) |
| `down_issu_cnt` / `lslm_issu_cnt` | 하락 종목 수 / 하한 종목 수 | string(숫자) |
| `dryy_bstp_nmix_hgpr` / `dryy_bstp_nmix_lwpr` | 연중 업종지수 최고 / 최저가 | string(숫자) |
| `total_askp_rsqn` / `total_bidp_rsqn` | 총 매도/매수 호가 잔량 | string(숫자) |
| `seln_rsqn_rate` / `shnu_rsqn_rate` | 매도 / 매수 잔량 비율 | string(숫자) |
| `ntby_rsqn` | 순매수 잔량 | string(숫자) |

---

### 2-5. `inquire_asking_price_exp_ccn` — 주식 현재가 호가/예상체결 (TR_ID `FHKST01010200`)

10단계 호가창 + 예상체결가. 호가 화면에 사용.

**요청 파라미터**

| 키 | 필수 | 설명 | 예시 |
|---|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | Y | 시장 분류 (`J` 등) | `J` |
| `FID_INPUT_ISCD` | Y | 종목코드 6자리 | `005930` |

**주요 응답 필드** (`output1` 호가, `output2` 예상체결 — 객체)

| 원문키 | 한글 의미 | 타입 |
|---|---|---|
| `askp1` ~ `askp10` | 매도호가 1~10단계 | string(숫자) |
| `bidp1` ~ `bidp10` | 매수호가 1~10단계 | string(숫자) |
| `askp_rsqn1` ~ `askp_rsqn10` | 매도호가 잔량 1~10 | string(숫자) |
| `bidp_rsqn1` ~ `bidp_rsqn10` | 매수호가 잔량 1~10 | string(숫자) |
| `total_askp_rsqn` / `total_bidp_rsqn` | 총 매도/매수 호가 잔량 | string(숫자) |
| `antc_cnpr` | 예상 체결가 | string(숫자) |
| `antc_vol` | 예상 거래량 | string(숫자) |
| `antc_cntg_vrss` | 예상 체결 대비 | string(숫자) |
| `antc_cntg_prdy_ctrt` | 예상 체결 전일 대비율 | string(숫자) |

---

### 2-6. `chk_holiday` — 국내 휴장일 조회 (TR_ID `CTCA0903R`)

**요청 파라미터**

| 키 | 필수 | 설명 | 예시 |
|---|---|---|---|
| `BASS_DT` | Y | 기준일자 (YYYYMMDD) | `20260529` |
| `CTX_AREA_NK` (`NK100`) | N | 연속조회키 | `""` |
| `CTX_AREA_FK` (`FK100`) | N | 연속조회 검색조건 | `""` |

주요 응답 필드(소스 docstring 기준): `opnd_yn`(개장일 여부) — 주문 가능 판단에 사용. 그 외 영업일/거래일/결제일 여부 필드 포함(상세 필드 키는 **확인 필요**).

> ⚠️ 원장 서비스 부하로 **1일 1회 호출 권장**. 연속조회 지원(`tr_cont` + `CTX_AREA_FK/NK`).

---

### 2-7. `search_stock_info` — 주식기본조회 (TR_ID `CTPF1002R`) ✅ 실호출 확정 (2026-05-29)

**종목명 + 종목 메타데이터의 1차 소스.** `inquire_price`의 `hts_kor_isnm`이 prod에서도 빈 값으로 오는 문제의 해결책. **⚠️ 실전 전용(모의 미지원)** · `tr_cont` 다음조회 불가.

**요청 파라미터** (Query)

| 키 | 필수 | 설명 | 예 |
|---|---|---|---|
| `PRDT_TYPE_CD` | Y | 상품유형코드 — **`300`=주식/ETF/ETN/ELW**, `301`선물옵션, `302`채권, `306`ELS | `300` |
| `PDNO` | Y | 종목번호(6자리). ETN은 `Q`로 시작(예 `Q500001`) | `005930` |

**핵심 응답 필드** (`output`, Object) — 005930 실호출 결과 포함:

| 키 | 의미 | 005930 실측 |
|---|---|---|
| `prdt_abrv_name` | **상품약어명 = 표시용 종목명** ← 1차 사용 | `"삼성전자"` |
| `prdt_name` | 상품명(정식) | `"삼성전자보통주"` |
| `prdt_eng_abrv_name` | 영문 약어명 | `"SamsungElec"` |
| `mket_id_cd` | 시장ID — `STK`유가/`KSQ`코스닥/`KNX`코넥스/`ETF`… | `"STK"` |
| `excg_dvsn_cd` | 거래소구분 — `02`증권거래소(코스피)/`03`코스닥… | `"02"` |
| `scty_grp_id_cd` | 증권그룹 — `ST`주권/`EF`ETF/`EN`ETN/`EW`ELW… | (주권 `ST`) |
| `kospi200_item_yn` | 코스피200 종목여부 | `"Y"` |
| `tr_stop_yn` / `admn_item_yn` | 거래정지 / 관리종목 여부 | `"N"` / `"N"` |
| `cptt_trad_tr_psbl_yn` / `nxt_tr_stop_yn` | NXT 거래가능 / NXT 거래정지 여부 | `"Y"` / (N) |
| `lstg_stqt` | 상장주수 (시총 계산용) | — |
| `papr` / `cpta` | 액면가 / 자본금 | — |
| `std_idst_clsf_cd_name` | 표준산업분류명 (업종) | — |
| `scts_mket_lstg_dt` / `kosdaq_mket_lstg_dt` | 유가증권/코스닥 상장일 | — |

> ⚠️ `pdno`는 출력 시 12자리 표준코드로 패딩됨(`00000A005930`). 6자리 단축코드는 `shtn_pdno`(상품기본조회 기준) 또는 입력값 그대로 사용.
> **활용**: `prdt_abrv_name`=종목명, `mket_id_cd`/`excg_dvsn_cd`=시장 배지(KOSPI/KOSDAQ), `tr_stop_yn`/`admn_item_yn`=⚠️경고 배지, `kospi200_item_yn`=유니버스 필터, `lstg_stqt`×현재가=시가총액. 한 번 호출로 종목 메타가 거의 다 해결됨.

**상품기본조회 `search_info`(CTPF1604R)** 는 주식 외 선물·해외 등 공통 상품정보용. 종목명은 `prdt_name`/`prdt_abrv_name`로 동일하게 제공하나, 주식 전용 메타(시장/상장/업종/거래정지)는 `search_stock_info`가 더 풍부 → **국내주식은 `search_stock_info` 사용 권장**.

---

## 3. 연속조회(페이징) 필요 엔드포인트

소스에서 `tr_cont`/`CTX_AREA(FK/NK)` 기반 연속조회 로직을 가진 엔드포인트(다건 응답 시 추가 호출 필요):

| 함수명 | 페이징 방식 |
|---|---|
| `chk_holiday` | `CTX_AREA_FK/NK` + `tr_cont` |
| `inquire_index_price` | `tr_cont` 연속조회 |
| `inquire_index_daily_price` | `tr_cont` 연속조회 |
| `inquire_index_category_price` | `tr_cont` 연속조회 |
| `inquire_index_tickprice` | `tr_cont` 연속조회 |
| `inquire_index_timeprice` | `tr_cont` 연속조회 |
| `inquire_daily_indexchartprice` | `tr_cont` 연속조회 |
| `inquire_time_indexchartprice` | `tr_cont` 연속조회 |
| `inquire_vi_status` | `tr_cont` 연속조회 |
| `inquire_elw_price` | `tr_cont` 연속조회 |
| `exp_trans_updown` | `tr_cont` 연속조회 |
| `exp_index_trend` | `tr_cont` 연속조회 |
| `exp_total_index` | `tr_cont` 연속조회 |

> 그 외 단건/소량 엔드포인트(`inquire_price`, `inquire_daily_price`, `inquire_daily_itemchartprice`, 분봉류, `intstock_*` 등)는 소스에 명시적 `CTX_AREA` 페이징 키가 없다. 단 `inquire_daily_itemchartprice`는 **1회 100건 제한**이 있어 기간이 길면 날짜 윈도우(`FID_INPUT_DATE_1/2`)를 나눠 반복 호출해야 한다.
>
> 연속조회 공통 헤더/응답(`tr_cont` 응답값 `F`/`M`/`D`/`E`, `ctx_area_fk100`/`ctx_area_nk100`) 규약은 [00-auth-and-common.md](./00-auth-and-common.md) 참조.

---

## 4. 분봉/시간대 차트 파라미터 요약

(상세 응답 필드 미확인 — 파라미터만 정리)

| 함수명 | 주요 파라미터 |
|---|---|
| `inquire_time_itemchartprice` | `FID_COND_MRKT_DIV_CODE`, `FID_INPUT_ISCD`, `FID_INPUT_HOUR_1`(기준시각 HHMMSS), `FID_PW_DATA_INCU_YN`(과거 데이터 포함여부 Y/N), `FID_ETC_CLS_CODE` |
| `inquire_time_indexchartprice` | `FID_COND_MRKT_DIV_CODE`, `FID_ETC_CLS_CODE`, `FID_INPUT_ISCD`, `FID_INPUT_HOUR_1`, `FID_PW_DATA_INCU_YN` |
| `inquire_time_dailychartprice` | `FID_COND_MRKT_DIV_CODE`, `FID_INPUT_ISCD`, `FID_INPUT_HOUR_1`, `FID_INPUT_DATE_1`, `FID_PW_DATA_INCU_YN`, `FID_FAKE_TICK_INCU_YN` |
| `inquire_time_itemconclusion` | `FID_COND_MRKT_DIV_CODE`, `FID_INPUT_ISCD`, `FID_INPUT_HOUR_1` |
| `inquire_time_overtimeconclusion` | `FID_COND_MRKT_DIV_CODE`, `FID_INPUT_ISCD`, `FID_HOUR_CLS_CODE` |
| `inquire_daily_indexchartprice` | `FID_COND_MRKT_DIV_CODE`, `FID_INPUT_ISCD`, `FID_INPUT_DATE_1`, `FID_INPUT_DATE_2`, `FID_PERIOD_DIV_CODE` |
| `inquire_daily_trade_volume` | `FID_COND_MRKT_DIV_CODE`, `FID_INPUT_ISCD`, `FID_PERIOD_DIV_CODE`, `FID_INPUT_DATE_1`, `FID_INPUT_DATE_2` |
| `inquire_vi_status` | `FID_DIV_CLS_CODE`, `FID_COND_SCR_DIV_CODE`, `FID_MRKT_CLS_CODE`, `FID_INPUT_ISCD`, `FID_RANK_SORT_CLS_CODE`, `FID_INPUT_DATE_1`, `FID_TRGT_CLS_CODE`, `FID_TRGT_EXLS_CLS_CODE` |
| `intstock_grouplist` | `TYPE`, `FID_ETC_CLS_CODE`, `USER_ID` |
| `intstock_stocklist_by_group` | `TYPE`, `USER_ID`, `INTER_GRP_CODE`, `INTER_GRP_NAME`, `FID_ETC_CLS_CODE`, `DATA_RANK`, `HTS_KOR_ISNM`, `CNTG_CLS_CODE` |
| `intstock_multprice` | `FID_COND_MRKT_DIV_CODE_1`, `FID_INPUT_ISCD_1` (복수 종목은 `_1`,`_2`... 인덱스 확장 — **확인 필요**) |

---

## 5. 미확인 / 후속

- **소스 파일에 함수가 없는 엔드포인트**: 요청 목록 중 `asking_price_krx`, `asking_price_nxt`, `asking_price_total`, `ccnl_krx`, `ccnl_nxt`, `ccnl_total`, `ccnl_notice`, `exp_ccnl_krx`, `exp_ccnl_nxt`, `exp_ccnl_total`, `index_ccnl`, `index_exp_ccnl` 은 `domestic_stock_functions.py`(REST 카탈로그)에 **존재하지 않음**. KRX/NXT/통합 구분 호가·체결 및 실시간 체결통보(`ccnl_notice`)는 **웹소켓(실시간) API** 또는 별도 모듈일 가능성. → 웹소켓 functions 파일에서 재확인 필요.
- **응답 필드 미수집(파라미터만 확보)**: 분봉류(`inquire_time_*`), `inquire_index_daily_price`/`tickprice`/`timeprice`/`category_price`, `inquire_daily_indexchartprice`, `exp_*`, `inquire_vi_status`, `inquire_elw_price`, `inquire_daily_trade_volume`, `intstock_*`, `inquire_ccnl`, `inquire_price_2`, 시간외(`inquire_overtime_*`, `inquire_daily_overtimeprice`). 필요 시 해당 `examples_llm/.../chk_*.py`에서 추가 추출.
- **`inquire_price` 응답의 `hts_kor_isnm`**: prod에서도 빈 값 케이스 확인됨(2026-05-29) → 종목명은 `search_stock_info`(§2-7) `prdt_abrv_name`로 해결(실호출 확정). `inquire_price` 단독 종목명 의존 금지.
- **지수 코드 체계**(`FID_COND_MRKT_DIV_CODE`/`FID_INPUT_ISCD` 지수용 코드값, 예 KOSPI/KOSDAQ 코드)는 본 소스에서 구체값 미확인 — KIS 포털 문서로 확인 필요.
- `inquire_overtime_price` TR_ID는 `FHPST02300000`, `inquire_overtime_asking_price`는 `FHPST02300400`, `inquire_daily_overtimeprice`는 `FHPST02320000`로 추출됨(검증됨).
