# KIS Open API — ETF / ETN 시세

한국투자증권 Open API 의 ETF/ETN 시세 카테고리(`/uapi/etfetn/v1/quotations/...`) 레퍼런스. NAV(순자산가치) 비교추이·구성종목시세·현재가 등 ETF/ETN 전용 시세 조회와 실시간 NAV 체결 데이터를 다룬다. (ELW 는 본 문서 범위 제외.)

- 출처:
  - 카탈로그: `examples_user/etfetn/etfetn_functions.py` (koreainvestment/open-trading-api)
  - 응답 필드: `examples_llm/etfetn/<함수명>/chk_*.py`
- 갱신일: 2026-05-29
- 인증·공통 헤더·envelope 규약은 [00-auth-and-common.md](./00-auth-and-common.md) 참조.

## 공통 사항

- 도메인: 실전 `https://openapi.koreainvestment.com:9443` / 모의 `https://openapivts.koreainvestment.com:29443`. (ETF/ETN 시세는 REST 조회이며 모의 지원 여부는 TR 별 상이 — 확인 필요.)
- 헤더: `authorization: Bearer <token>`, `appkey`, `appsecret`, `tr_id`, `custtype: "P"`.
- 응답 envelope: `{ rt_cd, msg_cd, msg1, output / output1 / output2 ... }`. 모든 숫자 값은 문자열로 내려온다.
- 공통 요청 파라미터:
  - `FID_COND_MRKT_DIV_CODE`: 시장 분류 코드. 통상 `"J"`(주식/ETF/ETN). 일부 시간대별 추이에서 `"E"` 사용.
  - `FID_INPUT_ISCD`: 종목코드(예: `"069500"` KODEX 200).
- 주의: ETF/ETN 시세에는 시장 체결가(`stck_prpr`)와 별개로 NAV 관련 필드가 함께 내려온다. 두 값의 차이(괴리)를 분석할 때는 시장가 필드와 NAV 필드를 혼동하지 말 것.

## 카탈로그

| API명(한글) | 함수명 | METHOD + URL | TR_ID | 한 줄 설명 |
|---|---|---|---|---|
| ETF 구성종목시세 | `inquire_component_stock_price` | GET `/uapi/etfetn/v1/quotations/inquire-component-stock-price` | `FHKST121600C0` | ETF 를 구성하는 종목들의 시세 목록 조회 |
| ETF/ETN 현재가 | `inquire_price` | GET `/uapi/etfetn/v1/quotations/inquire-price` | `FHPST02400000` | ETF/ETN 현재가 + NAV 등 상세 시세 |
| NAV 비교추이(일) | `nav_comparison_daily_trend` | GET `/uapi/etfetn/v1/quotations/nav-comparison-daily-trend` | `FHPST02440200` | 일자별 NAV 와 종가 비교 추이 |
| NAV 비교추이(분/시간) | `nav_comparison_time_trend` | GET `/uapi/etfetn/v1/quotations/nav-comparison-time-trend` | `FHPST02440100` | 시간대별(분 단위) NAV 비교 추이 |
| NAV 비교추이(종목) | `nav_comparison_trend` | GET `/uapi/etfetn/v1/quotations/nav-comparison-trend` | `FHPST02440000` | 현재 시점 종목별 NAV vs 시장가 비교 |
| ETF NAV 실시간 추이 | `etf_nav_trend` | WebSocket (실시간) | `H0STNAV0` | 실시간 ETF NAV 체결 데이터 구독 |

> METHOD 표기: `etfetn_functions.py` 는 공통 래퍼 `ka._url_fetch` 를 통해 호출하며 코드 상 메서드가 명시되지 않으나, KIS 시세 조회 TR 은 관례상 GET 이다(확인 필요). `etf_nav_trend` 는 REST 가 아닌 실시간 WebSocket 구독(`tr_type`/`tr_key`)이다.

---

## 핵심 엔드포인트 상세

### 1. ETF/ETN 현재가 — `inquire_price`

- METHOD + URL: GET `/uapi/etfetn/v1/quotations/inquire-price`
- TR_ID: `FHPST02400000`

**요청 파라미터**

| 파라미터 | 설명 | 예시 |
|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | 시장 분류 코드 | `"J"` |
| `FID_INPUT_ISCD` | 종목코드 | `"069500"` |

**주요 응답 필드** (단일 output)

| 필드 키 | 설명 |
|---|---|
| `stck_prpr` | 주식(ETF) 현재가 — 시장 체결가 |
| `prdy_vrss` / `prdy_vrss_sign` / `prdy_ctrt` | 전일 대비 / 부호 / 전일 대비율 |
| `acml_vol` / `prdy_vol` | 누적 거래량 / 전일 거래량 |
| `stck_mxpr` / `stck_llam` | 상한가 / 하한가 |
| `stck_prdy_clpr` / `stck_oprc` / `stck_hgpr` / `stck_lwpr` | 전일 종가 / 시가 / 고가 / 저가 |
| `prdy_clpr_vrss_oprc_rate` / `..._hgpr_rate` / `..._lwpr_rate` | 전일종가 대비 시가/고가/저가 비율 |
| `nav` | 현재 NAV(순자산가치) |
| `prdy_last_nav` | 전일 최종 NAV |
| `nav_prdy_vrss` / `nav_prdy_vrss_sign` / `nav_prdy_ctrt` | NAV 전일 대비 / 부호 / 전일 대비율 |
| `dprt` | 괴리율 (시장가 vs NAV) |
| `trc_errt` | 추적오차율 |
| `etf_trc_ert_mltp` | ETF 추적 배율 (레버리지/인버스 배수) |
| `nmix_ctrt` | 지수 대비율 |
| `stck_sdpr` / `stck_sspr` | 기준가 / (정지가, 확인 필요) |
| `etf_crcl_stcn` | ETF 유통 주식수 |
| `etf_ntas_ttam` / `etf_frcr_ntas_ttam` | ETF 순자산 총액 / 외화 순자산 총액 |
| `etf_crcl_ntas_ttam` / `etf_frcr_crcl_ntas_ttam` | ETF 유통 순자산 총액 / 외화 유통 순자산 총액 |
| `etf_frcr_last_ntas_wrth_val` | ETF 외화 최종 순자산 가치 |
| `etf_cu_unit_scrt_cnt` | CU(설정단위) 증권 수 |
| `etf_cnfg_issu_cnt` | 구성종목 수 |
| `etf_dvdn_cycl` | 분배금(배당) 주기 |
| `crcd` | 통화 코드 |
| `frgn_limt_rate` / `frgn_oder_able_qty` | 외국인 한도 비율 / 주문가능 수량 |
| `frgn_hldn_qty` / `frgn_hldn_qty_rate` | 외국인 보유 수량 / 보유 비율 |
| `lstn_stcn` | 상장 주식수 |
| `stck_dryy_hgpr` / `dryy_hgpr_vrss_prpr_rate` / `dryy_hgpr_date` | 연중 최고가 / 현재가 대비율 / 일자 |
| `stck_dryy_lwpr` / `dryy_lwpr_vrss_prpr_rate` / `dryy_lwpr_date` | 연중 최저가 / 현재가 대비율 / 일자 |
| `bstp_kor_isnm` | 업종 한글 종목명 (주의: 종목명이 아니라 업종명) |
| `etf_rprs_bstp_kor_isnm` | ETF 대표 업종 한글명 |
| `etf_trgt_nmix_bstp_code` | ETF 추종 대상 지수 업종 코드 |
| `etf_div_name` | ETF 구분명 |
| `vi_cls_code` | VI(변동성 완화장치) 구분 코드 |
| `lp_oder_able_cls_code` / `lp_hldn_rate` / `lp_hldn_vol` | LP 주문가능 구분 / 보유 비율 / 보유량 |
| `mbcr_name` | 회원사명 |
| `stck_lstn_date` / `mtrt_date` | 상장일 / 만기일(ETN) |
| `shrg_type_code` | 증거금 유형 코드 |

> 주의(NAV vs 시장가 괴리): `stck_prpr`(시장 체결가)와 `nav`(순자산가치)는 별개 값이며, 차이가 `dprt`(괴리율)로 제공된다. 추적 성과는 `trc_errt`(추적오차율)로 본다. ETN 만기일은 `mtrt_date` 에 들어온다.

---

### 2. NAV 비교추이(종목) — `nav_comparison_trend`

- METHOD + URL: GET `/uapi/etfetn/v1/quotations/nav-comparison-trend`
- TR_ID: `FHPST02440000`

**요청 파라미터**

| 파라미터 | 설명 | 예시 |
|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | 시장 분류 코드 | `"J"` |
| `FID_INPUT_ISCD` | 종목코드 | `"069500"` |

**주요 응답 필드** (시장가 그룹 + NAV 그룹)

| 필드 키 | 설명 |
|---|---|
| `stck_prpr` | 주식(ETF) 현재가 |
| `prdy_vrss` / `prdy_vrss_sign` / `prdy_ctrt` | 전일 대비 / 부호 / 전일 대비율 |
| `acml_vol` / `acml_tr_pbmn` | 누적 거래량 / 누적 거래대금 |
| `stck_prdy_clpr` | 주식 전일 종가 |
| `stck_oprc` / `stck_hgpr` / `stck_lwpr` | 시가 / 고가 / 저가 |
| `stck_mxpr` / `stck_llam` | 상한가 / 하한가 |
| `nav` | NAV(순자산가치) |
| `nav_prdy_vrss` / `nav_prdy_vrss_sign` / `nav_prdy_ctrt` | NAV 전일 대비 / 부호 / 전일 대비율 |
| `prdy_clpr_nav` | NAV 전일 종가 |
| `oprc_nav` / `hprc_nav` / `lprc_nav` | NAV 시가 / 고가 / 저가 |

> 주의: 시장가 그룹(`stck_*`)과 NAV 그룹(`nav`, `*_nav`)이 한 응답에 함께 내려온다. NAV 의 시·고·저는 `oprc_nav`/`hprc_nav`/`lprc_nav`, 시장가의 시·고·저는 `stck_oprc`/`stck_hgpr`/`stck_lwpr` 로 키가 분리되어 있으니 혼동 주의.

---

### 3. NAV 비교추이(일) — `nav_comparison_daily_trend`

- METHOD + URL: GET `/uapi/etfetn/v1/quotations/nav-comparison-daily-trend`
- TR_ID: `FHPST02440200`

**요청 파라미터**

| 파라미터 | 설명 | 예시 |
|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | 시장 분류 코드 | `"J"` |
| `FID_INPUT_ISCD` | 종목코드 | `"069500"` |
| `FID_INPUT_DATE_1` | 조회 시작일 (YYYYMMDD) | `"20240101"` |
| `FID_INPUT_DATE_2` | 조회 종료일 (YYYYMMDD) | `"20240220"` |

**주요 응답 필드** (일자별 배열 output)

| 필드 키 | 설명 |
|---|---|
| `stck_bsop_date` | 주식 영업일자 |
| `stck_clpr` | 종가 |
| `prdy_vrss` / `prdy_vrss_sign` / `prdy_ctrt` | 전일 대비 / 부호 / 전일 대비율 |
| `acml_vol` / `cntg_vol` | 누적 거래량 / 체결 거래량 |
| `dprt` | 괴리율 (시장가 vs NAV) |
| `nav_vrss_prpr` | NAV 대비 현재가 |
| `nav` | NAV(순자산가치) |
| `nav_prdy_vrss` / `nav_prdy_vrss_sign` / `nav_prdy_ctrt` | NAV 전일 대비 / 부호 / 전일 대비율 |

> 주의: 일자별 시계열이므로 NAV 와 종가의 일별 괴리(`dprt`) 추이 분석에 사용. 기간은 `FID_INPUT_DATE_1`~`FID_INPUT_DATE_2` 로 지정한다.

---

### 4. ETF 구성종목시세 — `inquire_component_stock_price`

- METHOD + URL: GET `/uapi/etfetn/v1/quotations/inquire-component-stock-price`
- TR_ID: `FHKST121600C0`

**요청 파라미터**

| 파라미터 | 설명 | 예시 |
|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | 시장 분류 코드 | `"J"` |
| `FID_INPUT_ISCD` | (ETF) 종목코드 | `"069500"` (예시 `"123456"`) |
| `FID_COND_SCR_DIV_CODE` | 화면 분류 코드 | `"11216"` |

**주요 응답 필드**

output1(ETF 요약):

| 필드 키 | 설명 |
|---|---|
| `stck_prpr` | ETF 현재가 |
| `prdy_vrss` / `prdy_vrss_sign` / `prdy_ctrt` | 전일 대비 / 부호 / 전일 대비율 |
| `nav` | NAV(순자산가치) |
| `nav_prdy_vrss` / `nav_prdy_vrss_sign` / `nav_prdy_ctrt` | NAV 전일 대비 / 부호 / 전일 대비율 |
| `prdy_clpr_nav` / `oprc_nav` / `hprc_nav` / `lprc_nav` | NAV 전일종가 / 시가 / 고가 / 저가 |
| `acml_vol` / `acml_tr_pbmn` | 누적 거래량 / 누적 거래대금 |
| `tday_rsfl_rate` | 당일 등락 비율 |
| `prdy_vrss_vol` | 전일 대비 거래량 |
| `tr_pbmn_tnrt` | 거래대금 회전율 |
| `hts_avls` | HTS 시가총액 |
| `etf_ntas_ttam` | ETF 순자산 총액 |
| `etf_vltn_amt` | ETF 평가금액 |
| `etf_cu_unit_scrt_cnt` | CU(설정단위) 증권 수 |
| `etf_cnfg_issu_cnt` | 구성종목 수 |

output2(구성종목별, 배열):

| 필드 키 | 설명 |
|---|---|
| `stck_shrn_iscd` | (구성종목) 단축 종목코드 |
| `hts_kor_isnm` | HTS 한글 종목명 |
| `etf_cnfg_issu_avls` | ETF 구성종목 평가금액(시가총액) |
| `etf_cnfg_issu_rlim` | ETF 구성종목 비중 |

> 주의: output1 은 ETF 자체 요약, output2 는 편입 종목 리스트다. `hts_kor_isnm` 이 구성종목명이며, `inquire_price` 의 `bstp_kor_isnm`(=업종명)과 키가 다르다. (참고: chk 파일 COLUMN_MAPPING 에 융자/대주 관련 번역명이 포함돼 있으나, 이는 공용 매핑 사전을 재사용한 것으로 본 TR 응답에 실제 포함되는지는 확인 필요.)

---

### 5. NAV 비교추이(분/시간) — `nav_comparison_time_trend`

- METHOD + URL: GET `/uapi/etfetn/v1/quotations/nav-comparison-time-trend`
- TR_ID: `FHPST02440100`

**요청 파라미터**

| 파라미터 | 설명 | 예시 |
|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | 시장 분류 코드 | `"E"` (시간대 추이에서 `E` 사용) |
| `FID_INPUT_ISCD` | 종목코드 | `"069500"` |
| `FID_HOUR_CLS_CODE` | 시간 구분 코드(분 단위, 예 60=60초/1분) | `"60"` |

> 응답 필드 상세: 시간대별 NAV·시장가 비교 시계열로, `nav_comparison_trend` 와 유사한 시장가/NAV 그룹 구성으로 추정되나 전용 chk 매핑 미확인 — 확인 필요.

---

### 6. ETF NAV 실시간 추이 — `etf_nav_trend` (WebSocket)

- 프로토콜: 실시간 WebSocket 구독 (REST 아님)
- TR_ID: `H0STNAV0`

**요청 파라미터**

| 파라미터 | 설명 | 예시 |
|---|---|---|
| `tr_type` | 구독 등록 `"1"` / 해지 `"0"` | `"1"` |
| `tr_key` | 종목코드 (빈 문자열 불가) | `"069500"` |

> 주의: 실시간 NAV 체결 스트림. 인증·소켓 접속(approval_key 등) 절차는 공통 문서 참조. 실시간 응답 필드 레이아웃은 별도 명세이며 chk 파일에서 미확인 — 확인 필요.

---

## 미확인 / 후속

- HTTP METHOD: `etfetn_functions.py` 가 공통 래퍼를 통해 호출하여 코드 상 GET/POST 가 명시되지 않음. KIS 시세 조회 관례상 GET 으로 표기했으나 공식 문서 대조 필요.
- 모의투자(`:29443`) 지원 여부: ETF/ETN 시세 TR 별 모의 지원 여부 미확인.
- `nav_comparison_time_trend`(FHPST02440100) 응답 필드: 전용 chk 매핑 미확인.
- `etf_nav_trend`(H0STNAV0) 실시간 응답 필드 레이아웃: 미확인.
- `inquire_component_stock_price` chk 의 COLUMN_MAPPING 에 융자/대주 관련 번역명이 섞여 있음 — 공용 사전 재사용 가능성이 높으며 실제 응답 포함 여부 확인 필요.
- `inquire_price` 의 `stck_sspr`, `shrg_type_code` 등 일부 필드의 정확한 의미는 공식 명세 대조 필요.
- ELW 카테고리는 본 문서 범위 제외(별도 문서).
