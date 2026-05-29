# KIS Open API — 국내주식 순위분석 / 시세분석 (Rankings)

거래량·등락률·시가총액·괴리도·공매도 등 종목 순위/시세분석 계열 엔드포인트 모음. 시그널 후보 발굴(스크리닝)에 직접 쓰인다.

- 출처: [domestic_stock_functions.py](https://github.com/koreainvestment/open-trading-api/blob/main/examples_user/domestic_stock/domestic_stock_functions.py) (examples_user), 응답 필드는 [examples_llm/domestic_stock/*](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock) 검증 파일.
- 갱신일: 2026-05-29
- 인증 헤더(`authorization` / `appkey` / `appsecret` / `tr_id` / `custtype:"P"`), 도메인(실전 `:9443` / 모의 `:29443`), 토큰 발급 등 공통 규약은 **[00-auth-and-common.md](./00-auth-and-common.md) 참조**.
- 모든 엔드포인트 **GET**. 응답 숫자도 전부 문자열로 내려온다.

---

## 카탈로그

| API명(한글) | 함수명 | METHOD + URL | TR_ID | 한 줄 설명 |
|---|---|---|---|---|
| 등락률 순위 | `fluctuation` | GET `/uapi/domestic-stock/v1/ranking/fluctuation` | `FHPST01700000` | 등락률/연속상승·하락/시가대비 등 기준 상위 종목 |
| 거래량 순위 | `volume_rank` | GET `/uapi/domestic-stock/v1/quotations/volume-rank` | `FHPST01710000` | 거래량·거래증가율·거래금액·회전율 상위 (URL은 quotations/) |
| 호가잔량 순위 | `quote_balance` | GET `/uapi/domestic-stock/v1/ranking/quote-balance` | `FHPST01720000` | 매수/매도 호가잔량·잔량비 상위 |
| 수익자산지표 순위 | `profit_asset_index` | GET `/uapi/domestic-stock/v1/ranking/profit-asset-index` | `FHPST01730000` | 수익성/자산가치 지표 순위 |
| 시가총액 상위 | `market_cap` | GET `/uapi/domestic-stock/v1/ranking/market-cap` | `FHPST01740000` | 시가총액 상위 + 시장전체 시총비중 |
| 재무비율 순위 | `finance_ratio` | GET `/uapi/domestic-stock/v1/ranking/finance-ratio` | `FHPST01750000` | 재무비율 기준 순위 |
| 시간외잔량 순위 | `after_hour_balance` | GET `/uapi/domestic-stock/v1/ranking/after-hour-balance` | `FHPST01760000` | 시간외 단일가 잔량 순위 |
| 우선주 괴리율 상위 | `prefer_disparate_ratio` | GET `/uapi/domestic-stock/v1/ranking/prefer-disparate-ratio` | `FHPST01770000` | 보통주-우선주 괴리율 상위 |
| 이격도 순위 | `disparity` | GET `/uapi/domestic-stock/v1/ranking/disparity` | `FHPST01780000` | 이동평균 이격도(disparity) 상위 |
| 시장가치 순위 | `market_value` | GET `/uapi/domestic-stock/v1/ranking/market-value` | `FHPST01790000` | PER/PBR 등 시장가치 지표 순위 |
| 관심종목등록 상위 | `top_interest_stock` | GET `/uapi/domestic-stock/v1/ranking/top-interest-stock` | `FHPST01800000` | 관심종목 등록 건수 상위 |
| 예상체결 상승·하락 상위 | `exp_trans_updown` | GET `/uapi/domestic-stock/v1/ranking/exp-trans-updown` | `FHPST01820000` | 장전/장후 예상체결 등락 상위 |
| 당사매매종목 상위 | `traded_by_company` | GET `/uapi/domestic-stock/v1/ranking/traded-by-company` | `FHPST01860000` | 당사(증권사) 매매 상위 종목 |
| 신고·신저근접 상위 | `near_new_highlow` | GET `/uapi/domestic-stock/v1/ranking/near-new-highlow` | `FHPST01870000` | 신고가/신저가 근접 종목 상위 |
| 체결강도 상위 | `volume_power` | GET `/uapi/domestic-stock/v1/ranking/volume-power` | `FHPST01680000` | 체결강도(매수/매도 체결비) 상위 |
| 신용잔고 상위 | `credit_balance` | GET `/uapi/domestic-stock/v1/ranking/credit-balance` | `FHKST17010000` | 신용융자/대주 잔고 상위 |
| 대량체결건수 상위 | `bulk_trans_num` | GET `/uapi/domestic-stock/v1/ranking/bulk-trans-num` | `FHKST190900C0` | 대량 체결 건수 상위 |
| 배당률 상위 | `dividend_rate` | GET `/uapi/domestic-stock/v1/ranking/dividend-rate` | `HHKDB13470100` | 배당수익률 상위 (FID 미사용, GB/UPJONG 파라미터) |
| 공매도 상위종목 | `short_sale` | GET `/uapi/domestic-stock/v1/ranking/short-sale` | `FHPST04820000` | 공매도 거래대금/비중 상위 |
| 시간외 등락율 순위 | `overtime_fluctuation` | GET `/uapi/domestic-stock/v1/ranking/overtime-fluctuation` | `FHPST02340000` | 시간외 단일가 등락률 순위 |
| 시간외 거래량 순위 | `overtime_volume` | GET `/uapi/domestic-stock/v1/ranking/overtime-volume` | `FHPST02350000` | 시간외 단일가 거래량 순위 |
| 시간외 예상체결 등락 | `overtime_exp_trans_fluct` | GET `/uapi/domestic-stock/v1/ranking/overtime-exp-trans-fluct` | `FHKST11860000` | 시간외 예상체결 등락률 순위 |
| HTS 조회상위 20종목 | `hts_top_view` | GET `/uapi/domestic-stock/v1/ranking/hts-top-view` | `HHMCM000100C0` | HTS에서 조회 많이 된 상위 20종목 |
| 상하한가 포착 | `capture_uplowprice` | GET `/uapi/domestic-stock/v1/quotations/capture-uplowprice` | `FHKST130000C0` | 상한가/하한가 포착 (시세분석, URL은 quotations/) |
| 신용잔고 일별추이 | `daily_credit_balance` | GET `/uapi/domestic-stock/v1/quotations/daily-credit-balance` | `FHPST04760000` | 종목 신용잔고 일별 추이 (시세분석, URL은 quotations/) |

> 주의: `volume_rank`, `capture_uplowprice`, `daily_credit_balance` 세 건은 KIS 카테고리상 순위/시세분석 계열이지만 URL 경로가 `ranking/`이 아니라 `quotations/`다. 코드 그대로 호출할 것.

---

## 핵심 엔드포인트 상세

### 1. 등락률 순위 — `fluctuation` (`FHPST01700000`) ✅ 포털 스펙 확정 (2026-05-29)

급등/급락 종목 스크리닝의 1순위 API. **⚠️ 실전 전용(모의 미지원)** · **최대 30건, 다음조회 불가** (30건↑ 필요 시 종목조건검색 API 대안).

**요청 파라미터** (모두 필수, 함수 시그니처 기준)

| 파라미터 | 설명 / 고정·예시값 |
|---|---|
| `fid_cond_mrkt_div_code` | 시장 분류. `J`:KRX, `NX`:NXT (코드 검증: `J`/`W`/`Q` 허용) |
| `fid_cond_scr_div_code` | 화면 분류 코드. **`20170` 고정** (다른 값이면 ValueError) |
| `fid_input_iscd` | 종목코드. `0000`:전체, 코스피`0001`, 코스닥`1001`, 코스피200`2001` |
| `fid_rank_sort_cls_code` | 정렬 구분 ✅ `0`:상승율순, `1`:하락율순, `2`:시가대비상승율, `3`:시가대비하락율, `4`:변동율 |
| `fid_input_cnt_1` | 입력 수1. `0`:전체, 또는 누적일수 입력 |
| `fid_prc_cls_code` | 가격 구분 ✅ 정렬=`0`(상승율)일 때 `0`:저가대비/`1`:종가대비, 정렬=`1`(하락율)일 때 `0`:고가대비/`1`:종가대비, 그 외 `0`:전체 |
| `fid_input_price_1` | 가격 하한 |
| `fid_input_price_2` | 가격 상한 |
| `fid_vol_cnt` | 최소 거래량 필터 |
| `fid_trgt_cls_code` | 대상 구분 (9자리 `0`/`1`: 증거금 30/40/50/60/100%, 신용보증금 30/40/50/60%) |
| `fid_trgt_exls_cls_code` | 대상 제외 (10자리 `0`/`1`: 투자위험·경고·주의, 관리, 정리매매, 불성실공시, 우선주, 거래정지, ETF, ETN, 신용주문불가, SPAC) |
| `fid_div_cls_code` | 분류 구분. `0`:전체 |
| `fid_rsfl_rate1` | 등락 비율1 (하락률 하한) |
| `fid_rsfl_rate2` | 등락 비율2 (상승률 상한) |

**주요 응답 필드** (`output`)

| 필드 | 설명 |
|---|---|
| `data_rank` | 데이터 순위 |
| `stck_shrn_iscd` | 주식 단축 종목코드 |
| `hts_kor_isnm` | 종목명 |
| `stck_prpr` | 현재가 |
| `prdy_vrss` / `prdy_vrss_sign` | 전일 대비 / 부호 |
| `prdy_ctrt` | 전일 대비율(등락률) |
| `acml_vol` | 누적 거래량 |
| `stck_hgpr` / `stck_lwpr` | 최고가 / 최저가 |
| `cnnt_ascn_dynu` / `cnnt_down_dynu` | 연속 상승 일수 / 연속 하락 일수 |
| `oprc_vrss_prpr_rate` | 시가 대비 현재가 비율 |
| `hgpr_vrss_prpr_rate` / `lwpr_vrss_prpr_rate` | 고가 대비 / 저가 대비 현재가 비율 |
| `prd_rsfl` / `prd_rsfl_rate` | 기간 등락 / 기간 등락 비율 |

---

### 2. 거래량 순위 — `volume_rank` (`FHPST01710000`) ✅ 포털 스펙 확정 (2026-05-29)

거래량 급증 종목 발굴. URL이 `quotations/volume-rank`인 점, 파라미터 키가 **대문자 FID_**인 점 주의. **⚠️ 실전 전용(모의 미지원)** · 최대 30건, 다음조회 불가.

**요청 파라미터** (모두 필수)

| 파라미터 | 설명 / 고정·예시값 |
|---|---|
| `FID_COND_MRKT_DIV_CODE` | `J`:KRX, `NX`:NXT, `UN`:통합, `W`:ELW |
| `FID_COND_SCR_DIV_CODE` | **`20171` 고정** |
| `FID_INPUT_ISCD` | `0000`:전체, 그 외 업종코드 (빈 문자열 불가) |
| `FID_DIV_CLS_CODE` | `0`:전체, `1`:보통주, `2`:우선주 |
| `FID_BLNG_CLS_CODE` | 소속 구분. `0`:평균거래량, `1`:거래증가율, `2`:평균거래회전율, `3`:거래금액순, `4`:평균거래금액회전율 |
| `FID_TRGT_CLS_CODE` | 대상 구분 (자릿수 코드, 보통 `0` 또는 전체 `1`) |
| `FID_TRGT_EXLS_CLS_CODE` | 대상 제외 구분 |
| `FID_INPUT_PRICE_1` / `FID_INPUT_PRICE_2` | 가격 하한 / 상한 (전체는 공란) |
| `FID_VOL_CNT` | 최소 거래량 (전체는 공란) |
| `FID_INPUT_DATE_1` | 입력 날짜 (공란) |

**주요 응답 필드** (`output`)

| 필드 | 설명 |
|---|---|
| `data_rank` | 데이터 순위 |
| `mksc_shrn_iscd` | 단축 종목코드 |
| `hts_kor_isnm` | 종목명 |
| `stck_prpr` | 현재가 |
| `prdy_ctrt` | 전일 대비율 |
| `acml_vol` / `prdy_vol` | 누적 거래량 / 전일 거래량 |
| `avrg_vol` | 평균 거래량 |
| `vol_inrt` | 거래량 증가율 |
| `vol_tnrt` / `nday_vol_tnrt` | 거래량 회전율 / N일 거래량 회전율 |
| `acml_tr_pbmn` / `avrg_tr_pbmn` | 누적 / 평균 거래대금 |
| `lstn_stcn` | 상장 주식수 |
| `n_befr_clpr_vrss_prpr_rate` | 전일종가 대비 현재가(%) |

---

### 3. 시가총액 상위 — `market_cap` (`FHPST01740000`)

대형주 유니버스 구성 / 시총비중 기반 필터링.

**요청 파라미터**

| 파라미터 | 설명 / 고정·예시값 |
|---|---|
| `fid_cond_mrkt_div_code` | **`J` 고정** (검증상 J만 허용. 설명: J:KRX, NX:NXT) |
| `fid_cond_scr_div_code` | **`20174` 고정** |
| `fid_div_cls_code` | `0`:전체, `1`:보통주, `2`:우선주 |
| `fid_input_iscd` | `0000`:전체, `0001`:거래소, `1001`:코스닥, `2001`:코스피200 |
| `fid_trgt_cls_code` | `0`:전체 (고정) |
| `fid_trgt_exls_cls_code` | `0`:전체 (고정) |
| `fid_input_price_1` / `fid_input_price_2` | 가격 하한 / 상한 (공란=전체) |
| `fid_vol_cnt` | 최소 거래량 (공란=전체) |

**주요 응답 필드** (`output`)

| 필드 | 설명 |
|---|---|
| `data_rank` | 데이터 순위 |
| `mksc_shrn_iscd` | 단축 종목코드 |
| `hts_kor_isnm` | 종목명 |
| `stck_prpr` | 현재가 |
| `prdy_vrss` / `prdy_vrss_sign` / `prdy_ctrt` | 전일 대비 / 부호 / 대비율 |
| `acml_vol` | 누적 거래량 |
| `lstn_stcn` | 상장 주수 |
| `stck_avls` | 시가 총액 |
| `mrkt_whol_avls_rlim` | 시장 전체 시가총액 비중 |

---

### 4. 이격도 순위 — `disparity` (`FHPST01780000`)

이동평균 대비 이격도(과매수/과매도) 스크리닝. (응답 필드는 검증 파일 미확인 — 후속 참조)

**요청 파라미터**

| 파라미터 | 설명 / 고정·예시값 |
|---|---|
| `fid_cond_mrkt_div_code` | 시장 분류 (J 등) |
| `fid_cond_scr_div_code` | **`20178` 고정** (필수) |
| `fid_div_cls_code` | 분류 구분 |
| `fid_rank_sort_cls_code` | 정렬 구분 |
| `fid_hour_cls_code` | 이격도 기준 기간(시간 구분) 코드 |
| `fid_input_iscd` | 종목/시장 코드 (`0000`:전체 등) |
| `fid_trgt_cls_code` / `fid_trgt_exls_cls_code` | 대상 / 대상 제외 구분 |
| `fid_input_price_1` / `fid_input_price_2` | 가격 하한 / 상한 |
| `fid_vol_cnt` | 최소 거래량 |

---

### 5. 배당률 상위 — `dividend_rate` (`HHKDB13470100`) ✅ 포털 스펙 확정 (2026-05-29)

배당수익률 상위. HTS [0188]. **⚠️ 실전 전용(모의 미지원)** · 최대 30건, 다음조회 불가. **FID 계열이 아닌 별도 파라미터 체계**.

**요청 파라미터**

| 파라미터 | 설명 |
|---|---|
| `CTS_AREA` | CTS 영역 — **공백** |
| `GB1` | 시장 — `0`:전체, `1`:코스피, `2`:코스피200, `3`:코스닥 |
| `UPJONG` | 업종구분 — 코스피 `0001`:종합·`0002`:대형주…`0027`:제조업 / 코스닥 `1001`:종합…`1041`:IT부품 / 코스피200 `2001`·`2007`(KOSPI100)·`2008`(KOSPI50) |
| `GB2` | 종목선택 — `0`:전체, `6`:보통주, `7`:우선주 |
| `GB3` | 배당구분 — `1`:주식배당, `2`:현금배당 |
| `F_DT` / `T_DT` | 기준일 From / To (`YYYYMMDD`) |
| `GB4` | 결산/중간 — `0`:전체, `1`:결산배당, `2`:중간배당 |

**응답 필드** (`output1`, Array): `rank`(순위) · `sht_cd`(종목코드) · `isin_name`(종목명) · `record_date`(기준일) · `per_sto_divi_amt`(현금/주식배당금) · **`divi_rate`(배당률 %)** · `divi_kind`(배당종류).

---

## 시그널 알고리즘 활용 힌트

- **모멘텀 매수 후보**: `fluctuation`(등락률·연속상승일수) + `volume_rank`(거래량 증가율/회전율) 교집합 → 거래량 동반 상승 종목.
- **과열/되돌림(매도·역추세)**: `disparity`(이동평균 이격도 과매수) + `near_new_highlow`(신고가 근접) 조합으로 단기 고점 경계 신호.
- **수급 경계**: `short_sale`(공매도 비중 급증), `credit_balance`(신용잔고 과다)는 하방 리스크 필터로 유용. `volume_power`(체결강도)는 매수세 우위 판단 보조.
- **유니버스 구성**: `market_cap` + `fid_input_iscd=2001`(코스피200)로 대형주 풀을 먼저 고정한 뒤 위 순위들을 적용하면 잡주 노이즈를 줄일 수 있다.

---

## 미확인 / 후속

- 응답 필드 포털 확정(2026-05-29): `fluctuation` / `volume_rank` / `market_cap` / `dividend_rate` + 정렬코드 enum(§1). 나머지(`disparity`, `volume_power`, `short_sale`, `near_new_highlow`, `quote_balance`, `top_interest_stock`, `credit_balance`, `bulk_trans_num`, `traded_by_company`, `profit_asset_index`, `market_value`, `finance_ratio`, `exp_trans_updown`, 시간외 3종, `after_hour_balance`, `prefer_disparate_ratio`, `hts_top_view`, `capture_uplowprice`, `daily_credit_balance`)의 정확한 `output` 필드 키는 examples_llm 또는 KIS 포털 명세에서 추가 확인 필요.
- `fid_rank_sort_cls_code` enum 은 `fluctuation`(§1)만 확정. `disparity`·`volume_power` 등 다른 순위 API의 정렬·`fid_hour_cls_code`·`fid_blng_cls_code` enum 값은 API별 포털 문서 확인 필요.
- **순위 API 공통(확정)**: 대부분 **최대 30건·다음조회 불가·실전 전용**. 30건↑/100건 필요 시 종목조건검색 API 대안.
- `fid_cond_mrkt_div_code`의 NXT(`NX`)/통합(`UN`) 지원 여부는 API마다 다르다(`fluctuation`은 코드 검증상 `J`/`W`/`Q`만, `market_cap`은 `J`만 허용). 호출 전 각 함수의 ValueError 조건 확인 권장.
