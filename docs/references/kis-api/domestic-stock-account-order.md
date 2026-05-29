# KIS Open API — 국내주식 · 계좌/잔고 및 주문(매매)

한국투자증권(KIS) Open API 국내주식 `/uapi/domestic-stock/v1/trading/*` 경로의 계좌·잔고·주문가능 조회 및 주문(매매) 엔드포인트 레퍼런스.

- **출처**: `koreainvestment/open-trading-api` GitHub 레포
  - 카탈로그: [`examples_user/domestic_stock/domestic_stock_functions.py`](https://github.com/koreainvestment/open-trading-api/blob/main/examples_user/domestic_stock/domestic_stock_functions.py) (함수명·URL·tr_id·요청 파라미터 추출)
  - 응답 필드: `examples_llm/domestic_stock/{inquire_balance,inquire_psbl_order,order_cash}/chk_*.py` 의 `COLUMN_MAPPING` (검증된 컬럼명)
  - 포털 문서(`order-cash` 등)는 JS 렌더로 raw 추출 불가 → 위 GitHub 소스로 대체함을 명시.
- **갱신일**: 2026-05-29
- **인증/공통 헤더**: → `docs/references/kis-api/` 의 인증(OAuth/토큰·hashkey) 문서 참조. 공통 헤더: `authorization: Bearer {token}`, `appkey`, `appsecret`, `tr_id`, `custtype: "P"`. 계좌 조회는 `CANO`(계좌번호 앞 8자리) + `ACNT_PRDT_CD`(뒤 2자리) 필수.
- **서버**: 모의 `:29443` / 실전 `:9443`.

---

> ## ⚠️ 안전장치 — 이 프로젝트는 조회(read-only) 전용
>
> **본 프로젝트(trading-signal-frontend)는 KIS API 의 조회(inquire) 엔드포인트만 사용한다.**
> 사용자가 실전계좌(**72245021**)를 보유하므로 주문 API 의 오발주 위험이 실재한다.
>
> 주문/매매(`order-*`) 엔드포인트는 **별도 PRD `stock-order-integration` 의 책임**이며, 구현 시 아래 다중 게이트가 **의무**다:
> 1. 주문 BFF 라우트(`app/api/order/*`) 를 조회 라우트와 **물리적으로 분리**
> 2. **계좌비밀번호 재확인** (매 주문 1회)
> 3. **dry-run 모드** (`KIS_DRY_RUN=1` 시 실호출 차단)
> 4. **단일주문 금액상한** (`KIS_ORDER_MAX_KRW` 초과 시 거부)
> 5. **audit log** (모든 주문 시도 기록)
>
> 아래 "주문/매매" 표·상세는 **카탈로그 참고용**이며, 본 레포에 실제 호출 코드를 작성하지 않는다.

---

## 1. 카탈로그 — 계좌/잔고/주문가능 조회 (read-only · 본 프로젝트 사용)

METHOD 는 모두 **GET**. URL 은 `/uapi/domestic-stock/v1/trading/` 접두사 생략 표기.

| API명 | 함수명 | URL (GET) | TR_ID (실전 / 모의) | 설명 |
|---|---|---|---|---|
| 투자계좌자산현황조회 | `inquire_account_balance` | `…/inquire-account-balance` | `CTRP6548R` / ❌모의 미지원 | 계좌 자산현황(요약) 조회 (상세 §3.6) |
| 주식잔고조회 | `inquire_balance` | `…/inquire-balance` | `TTTC8434R` / `VTTC8434R` | 보유 종목·예수금 등 잔고 |
| 주식잔고조회_실현손익 | `inquire_balance_rlz_pl` | `…/inquire-balance-rlz-pl` | `TTTC8494R` / ❌모의 미지원 | 실현손익 포함 잔고 (체결기준, 상세 §3.5) |
| 신용매수가능조회 | `inquire_credit_psamount` | `…/inquire-credit-psamount` | `TTTC8909R` / (확인 필요) | 신용매수 가능금액 |
| 주식일별주문체결조회 | `inquire_daily_ccld` | `…/inquire-daily-ccld` | 3개월이내 `TTTC0081R` / `VTTC0081R`<br>3개월이전 `CTSC9215R` / `VTSC9215R` | 일별 주문/체결 내역 |
| 기간별손익일별합산조회 | `inquire_period_profit` | `…/inquire-period-profit` | `TTTC8708R` / (확인 필요) | 기간별 손익 일별합산 |
| 기간별매매손익현황조회 | `inquire_period_trade_profit` | `…/inquire-period-trade-profit` | `TTTC8715R` / (확인 필요) | 기간별 매매손익 |
| 매수가능조회 | `inquire_psbl_order` | `…/inquire-psbl-order` | `TTTC8908R` / `VTTC8908R` | 종목별 매수가능 수량/금액 |
| 정정취소가능주문조회 | `inquire_psbl_rvsecncl` | `…/inquire-psbl-rvsecncl` | `TTTC0084R` / (확인 필요) | 정정·취소 가능 주문 목록 |
| 매도가능수량조회 | `inquire_psbl_sell` | `…/inquire-psbl-sell` | `TTTC8408R` / ❌모의 미지원 | 종목별 매도가능 수량 (상세 §3.4) |
| 주식통합증거금현황 | `intgr_margin` | `…/intgr-margin` | `TTTC0869R` / ❌모의 미지원 | 통합증거금 현황 (국내+해외, 상세 §3.3) |
| 기간별계좌권리현황조회 | `period_rights` | `…/period-rights` | `CTRGA011R` / (확인 필요) | 기간별 권리(배당 등) |
| 예약주문 조회 | `order_resv_ccnl` | `…/order-resv-ccnl` | `CTSC0004R` / (확인 필요) | 예약주문 조회 (GET) |
| 퇴직연금 잔고조회 | `pension_inquire_balance` | `…/pension/inquire-balance` | `TTTC2208R` / (확인 필요) | 퇴직연금 잔고 |
| 퇴직연금 미체결내역 | `pension_inquire_daily_ccld` | `…/pension/inquire-daily-ccld` | `TTTC2201R` / (확인 필요) | 퇴직연금 미체결 |
| 퇴직연금 예수금조회 | `pension_inquire_deposit` | `…/pension/inquire-deposit` | `TTTC0506R` / (확인 필요) | 퇴직연금 예수금 |
| 퇴직연금 체결기준잔고 | `pension_inquire_present_balance` | `…/pension/inquire-present-balance` | `TTTC2202R` / (확인 필요) | 퇴직연금 체결기준잔고 |
| 퇴직연금 매수가능조회 | `pension_inquire_psbl_order` | `…/pension/inquire-psbl-order` | `TTTC0503R` / (확인 필요) | 퇴직연금 매수가능 |

> **메모**
> - PRD 에서 언급된 `inquire_ccnl`(체결내역)은 functions.py 의 `/trading/` 경로에 **독립 함수로 존재하지 않음**. 체결/미체결 내역은 `inquire_daily_ccld`(일별주문체결)로 조회한다. (실시간 체결통보는 별도 WebSocket 카테고리.)
> - **모의투자 지원 매트릭스** (포털 확정 2026-05-29): `inquire_balance`(`VTTC8434R`)·`inquire_psbl_order`(`VTTC8908R`)·`inquire_daily_ccld`(`VTTC0081R`)는 **모의 지원**. 반면 `inquire_account_balance`·`inquire_balance_rlz_pl`·`inquire_psbl_sell`·`intgr_margin`은 **❌ 모의 미지원(실전 전용)**. → Dashboard 보유종목·예수금은 모의 지원되는 `inquire_balance` 로 충분하나, 실현손익/통합증거금/매도가능은 모의에서 mock 폴백 필요.
> - 나머지 "(확인 필요)" 항목(`inquire_credit_psamount`·`inquire_psbl_rvsecncl`·`inquire_period_*`·`period_rights`·연금계)은 모의 지원 여부 미검증.

---

## 2. 카탈로그 — 주문/매매 (⚠️ 참고용 · 본 프로젝트 미구현)

> **이 표의 모든 엔드포인트는 구현 시 상단 안전장치(5종)가 필수다. 본 레포에 호출 코드를 두지 않는다.**

METHOD 는 모두 **POST** (hashkey 필요 가능 — 인증 문서 참조).

| API명 | 함수명 | URL (POST) | TR_ID (실전 / 모의) | 설명 | 안전장치 |
|---|---|---|---|---|---|
| 주식주문(현금) | `order_cash` | `…/order-cash` | 매수 `TTTC0012U`/`VTTC0012U`<br>매도 `TTTC0011U`/`VTTC0011U` | 현금 매수/매도 주문 | **필수** |
| 주식주문(신용) | `order_credit` | `…/order-credit` | 매수 `TTTC0051U` / 매도 `TTTC0052U`<br>(모의 불가) | 신용 매수/매도 | **필수** |
| 주식주문(정정취소) | `order_rvsecncl` | `…/order-rvsecncl` | `TTTC0013U` / `VTTC0013U` | 기존 주문 정정/취소 | **필수** |
| 주식예약주문 | `order_resv` | `…/order-resv` | `CTSC0008U` / (확인 필요) | 예약주문 등록 | **필수** |
| 주식예약주문정정취소 | `order_resv_rvsecncl` | `…/order-resv-rvsecncl` | 정정 `CTSC0013U` / 취소 `CTSC0009U` | 예약주문 정정/취소 | **필수** |

> - `order_credit` 은 **모의투자 미지원**(소스 주석: "※ 모의투자는 사용 불가").
> - `order_cash` TR_ID 매핑(소스 확인): `ord_dv="buy"` → 매수, `ord_dv="sell"` → 매도. 끝자리 `U` = 주문(POST)계.

---

## 3. 핵심 엔드포인트 상세

### 3.1 `inquire_balance` — 주식잔고조회 (GET)

- URL: `/uapi/domestic-stock/v1/trading/inquire-balance`
- TR_ID: 실전 `TTTC8434R` / 모의 `VTTC8434R`
- 연속조회: 실전 1회 최대 50건, 모의 20건 (이후 `CTX_AREA_FK100`/`CTX_AREA_NK100` + `tr_cont` 로 연속조회).

**요청 파라미터 (query)**

| 파라미터 | 키 | 필수 | 설명 |
|---|---|---|---|
| 종합계좌번호 | `CANO` | Y | 계좌 앞 8자리 |
| 계좌상품코드 | `ACNT_PRDT_CD` | Y | 계좌 뒤 2자리 |
| 시간외단일가·거래소여부 | `AFHR_FLPR_YN` | Y | `N`:기본, `Y`:시간외단일가, `X`:NXT |
| 오프라인여부 | `OFL_YN` | - | 빈값 |
| 조회구분 | `INQR_DVSN` | Y | `01`:대출일별, `02`:종목별 |
| 단가구분 | `UNPR_DVSN` | Y | `01` |
| 펀드결제분포함여부 | `FUND_STTL_ICLD_YN` | Y | `N`/`Y` |
| 융자금액자동상환여부 | `FNCG_AMT_AUTO_RDPT_YN` | Y | `N` |
| 처리구분 | `PRCS_DVSN` | Y | `00`:전일매매포함, `01`:미포함 |
| 연속조회검색조건100 | `CTX_AREA_FK100` | - | 연속조회용 |
| 연속조회키100 | `CTX_AREA_NK100` | - | 연속조회용 |

**주요 응답 필드** — `output1`(보유종목 배열)

| 키 | 의미 |
|---|---|
| `pdno` | 상품번호(종목코드) |
| `prdt_name` | 상품명 |
| `hldg_qty` | 보유수량 |
| `ord_psbl_qty` | 주문가능수량 |
| `pchs_avg_pric` | 매입평균가격 |
| `prpr` | 현재가 |
| `evlu_amt` | 평가금액 |
| `evlu_pfls_amt` | 평가손익금액 |
| `evlu_pfls_rt` | 평가손익율 |

**주요 응답 필드** — `output2`(계좌요약)

| 키 | 의미 |
|---|---|
| `dnca_tot_amt` | 예수금총금액 |
| `nxdy_excc_amt` | 익일정산금액 |
| `prvs_rcdl_excc_amt` | 가수도정산금액(D+2 예수금 성격) |
| `tot_evlu_amt` | 총평가금액 |
| `nass_amt` | 순자산금액 |
| `pchs_amt_smtl_amt` | 매입금액합계 |
| `evlu_pfls_smtl_amt` | 평가손익합계 |
| `asst_icdc_amt` | 자산증감액 |
| `asst_icdc_erng_rt` | 자산증감수익율 |

---

### 3.2 `inquire_psbl_order` — 매수가능조회 (GET)

- URL: `/uapi/domestic-stock/v1/trading/inquire-psbl-order`
- TR_ID: 실전 `TTTC8908R` / 모의 `VTTC8908R`
- 1회 호출당 최대 1건.

**요청 파라미터 (query)**

| 파라미터 | 키 | 필수 | 설명 |
|---|---|---|---|
| 종합계좌번호 | `CANO` | Y | 앞 8자리 |
| 계좌상품코드 | `ACNT_PRDT_CD` | Y | 뒤 2자리 |
| 상품번호 | `PDNO` | Y | 종목코드(6자리) |
| 주문단가 | `ORD_UNPR` | Y | 1주당 가격 (시장가 시 0) |
| 주문구분 | `ORD_DVSN` | Y | 예) `01`: 시장가 |
| CMA평가금액포함여부 | `CMA_EVLU_AMT_ICLD_YN` | Y | `Y`/`N` |
| 해외포함여부 | `OVRS_ICLD_YN` | Y | `N` |

**주요 응답 필드** — `output`

| 키 | 의미 |
|---|---|
| `ord_psbl_cash` | 주문가능현금 |
| `ruse_psbl_amt` | 재사용가능금액 |
| `nrcvb_buy_amt` | 미수없는매수금액 |
| `nrcvb_buy_qty` | 미수없는매수수량 |
| `max_buy_amt` | 최대매수금액 |
| `max_buy_qty` | 최대매수수량 |
| `cma_evlu_amt` | CMA평가금액 |

---

### 3.3 `intgr_margin` — 주식통합증거금현황 (GET) ✅ 포털 스펙 확정 (2026-05-29)

- URL: `/uapi/domestic-stock/v1/trading/intgr-margin` · **⚠️ 실전 전용(모의 미지원)** · `tr_cont` 다음조회 불가
- TR_ID: 실전 `TTTC0869R`
- HTS [0867] 통합증거금조회. 일반계좌+통합증거금 신청계좌의 국내·해외 주문가능금액을 한 번에 조회. (해외 국가별 상세는 [해외] 해외증거금 통화별조회 별도)

**요청 파라미터 (query)**

| 파라미터 | 키 | 필수 | 설명 |
|---|---|---|---|
| 종합계좌번호 | `CANO` | Y | 앞 8자리 |
| 계좌상품코드 | `ACNT_PRDT_CD` | Y | 뒤 2자리 |
| CMA평가금액포함여부 | `CMA_EVLU_AMT_ICLD_YN` | Y | **`N` 입력** |
| 원화외화구분코드 | `WCRC_FRCR_DVSN_CD` | Y | `01`:외화기준, `02`:원화기준 |
| 선도환계약외화구분코드 | `FWEX_CTRT_FRCR_DVSN_CD` | Y | `01`:외화기준, `02`:원화기준 |

**응답 필드** (`output`, Object) — 총 ~110필드. 명명 규칙으로 도출:

- 국내 핵심: `acmga_rt`(계좌증거금율) · `rcvb_amt`(미수금액) · `lmt_amt`(한도금액).
- **주문가능금액 패턴**: `stck_cash_ord_psbl_amt`(주식현금주문가능) · `stck_sbst_ord_psbl_amt`(대용) · `stck_evlu_ord_psbl_amt`(평가) · 증거금률별 `stck_cash{20|30|40|50|60|100}_max_ord_psbl_amt` · 융자 `stck_fncg{45|50|60|70}_max_ord_psbl_amt` · 대주 `stck_stln_max_ord_psbl_amt`.
- **대상/사용/주문가능 3단**: 각 자원에 `_objt_amt`(대상) / `_use_amt`(사용) / `_ord_psbl_amt`(주문가능) 접미사. 자원 prefix: `stck_cash`(주식현금)·`stck_sbst`(대용)·`stck_evlu`(평가)·`stck_ruse_psbl`(재사용가능)·`bond_ruse_psbl`(채권재사용).
- **통합(해외 합산) 주문가능**: `stck_itgr_cash{20~100}_ord_psbl_amt` · `stck_itgr_fncg{45~70}_ord_psbl_amt` · `bond_itgr_ord_psbl_amt`.
- **외화별** (`usd`/`hkd`/`jpy`/`cny` prefix): `{ccy}_objt_amt`(대상) · `{ccy}_use_amt`(사용) · `{ccy}_ord_psbl_amt`(주문가능) · `{ccy}_gnrl_ord_psbl_amt`(일반) · `{ccy}_itgr_ord_psbl_amt`(통합) · `{ccy}_ruse_*`(재사용) · `{ccy}_frst_bltn_exrt`(최초고시환율).

> 시그널/대시보드엔 `stck_cash_ord_psbl_amt`(현금 주문가능)·`acmga_rt`(증거금율)·외화 `usd_ord_psbl_amt` 정도가 핵심. 나머지는 증거금률·재사용·타시장 세분류라 일반 화면엔 불필요.

---

### 3.4 `inquire_psbl_sell` — 매도가능수량조회 (GET) ✅ 포털 스펙 확정 (2026-05-29)

- URL: `/uapi/domestic-stock/v1/trading/inquire-psbl-sell` · **⚠️ 실전 전용(모의 미지원)** · `tr_cont` 다음조회 불가
- TR_ID: 실전 `TTTC8408R`
- HTS [0971] 주식 매도. 매도하려는 종목(`PDNO`)으로 호출 → `output1.ord_psbl_qty`(주문가능수량)로 매도가능 수량 확인.

**요청 파라미터 (query)**: `CANO`(앞8) · `ACNT_PRDT_CD`(뒤2) · `PDNO`(종목코드 6자리).

**응답 필드** (`output1`, Object)

| 키 | 의미 |
|---|---|
| `pdno` / `prdt_name` | 상품번호 / 상품명 |
| `buy_qty` / `sll_qty` | 매수수량 / 매도수량 |
| `cblc_qty` | 잔고수량 |
| `nsvg_qty` | 비저축수량 |
| `ord_psbl_qty` | **주문(매도)가능수량** ← 핵심 |
| `pchs_avg_pric` / `pchs_amt` | 매입평균가격 / 매입금액 |
| `now_pric` | 현재가 |
| `evlu_amt` / `evlu_pfls_amt` / `evlu_pfls_rt` | 평가금액 / 평가손익금액 / 평가손익율 |

---

### 3.5 `inquire_balance_rlz_pl` — 주식잔고조회_실현손익 (GET) ✅ 포털 스펙 확정 (2026-05-29)

- URL: `/uapi/domestic-stock/v1/trading/inquire-balance-rlz-pl` · **⚠️ 실전 전용(모의 미지원)** · **연속조회 지원**(`CTX_AREA_FK100`/`NK100`, header `tr_cont` F/M=다음 있음, D/E=마지막)
- TR_ID: 실전 `TTTC8494R`
- HTS [0800] 국내 체결기준잔고. `inquire_balance` 와 유사하나 **종목별·계좌 실현손익(`rlzt_pfls`)** 을 추가 제공.

**요청 파라미터 (query)** — `CANO`·`ACNT_PRDT_CD` 외:

| 키 | 설명 |
|---|---|
| `AFHR_FLPR_YN` | 시간외단일가여부 (`N` 기본 / `Y`) |
| `OFL_YN` | 오프라인여부 (공란) |
| `INQR_DVSN` | 조회구분 (`00`:전체) |
| `UNPR_DVSN` | 단가구분 (`01` 기본) |
| `FUND_STTL_ICLD_YN` | 펀드결제포함여부 (`N`/`Y`) |
| `FNCG_AMT_AUTO_RDPT_YN` | 융자금액자동상환여부 (`N` 기본) |
| `PRCS_DVSN` | 처리구분 (`00`:전일매매포함, `01`:미포함) |
| `COST_ICLD_YN` | 비용포함여부 |
| `CTX_AREA_FK100`/`CTX_AREA_NK100` | 연속조회 키 (최초 공란) |

**응답 — `output1` (Object Array, 보유 종목별)**: `pdno`·`prdt_name`·`hldg_qty`(보유수량)·`ord_psbl_qty`(주문가능수량)·`pchs_avg_pric`(매입평균가)·`pchs_amt`(매입금액)·`prpr`(현재가)·`evlu_amt`(평가금액)·`evlu_pfls_amt`(평가손익금액)·`evlu_pfls_rt`(평가손익율)·`evlu_erng_rt`(평가수익율)·`bfdy_cprs_icdc`(전일대비증감)·`fltt_rt`(등락율) + 대출·대주 필드(`loan_dt`/`loan_amt`/`stln_slng_chgs`/`expd_dt`).

**응답 — `output2` (Object Array, 계좌 요약)**: `dnca_tot_amt`(예수금총금액)·`nxdy_excc_amt`(익일정산금액)·`tot_evlu_amt`(총평가금액)·`nass_amt`(순자산금액)·`pchs_amt_smtl_amt`(매입금액합계)·`evlu_amt_smtl_amt`(평가금액합계)·`evlu_pfls_smtl_amt`(평가손익합계)·`bfdy_tot_asst_evlu_amt`(전일총자산평가)·`asst_icdc_amt`(자산증감액)·`asst_icdc_erng_rt`(자산증감수익율)·**`rlzt_pfls`(실현손익)**·`rlzt_erng_rt`(실현수익율)·`real_evlu_pfls`(실평가손익)·`real_evlu_pfls_erng_rt`(실평가손익수익율).

> Dashboard P&L 위젯에 `rlzt_pfls`(실현손익)+`evlu_pfls_smtl_amt`(평가손익) 조합이 유용. 단 실전 전용이라 모의 개발 시 mock.

---

### 3.6 `inquire_account_balance` — 투자계좌자산현황조회 (GET) ✅ 포털 스펙 확정 (2026-05-29)

- URL: `/uapi/domestic-stock/v1/trading/inquire-account-balance` · **⚠️ 실전 전용(모의 미지원)** · 연속조회 지원(header `tr_cont` F/M/D/E)
- TR_ID: 실전 `CTRP6548R`
- HTS [0891] 계좌 자산비중(결제기준). 자산 종류별 비중 + 계좌 총괄 요약.

**요청 파라미터 (query)**: `CANO`·`ACNT_PRDT_CD` · `INQR_DVSN_1`(조회구분1, 공백) · `BSPR_BF_DT_APLY_YN`(기준가이전일자적용여부, 공백).

**응답 — `Output1` (Object Array, 자산종류별 비중)** ⚠️ 대문자 `Output1`/`Output2`. 자산 종류 **순서 고정**(일반계좌 20항목: 1주식·2펀드/MMW·…·9해외주식·18예수금·20합계 / 21번계좌 17항목).

| 키 | 의미 |
|---|---|
| `pchs_amt` / `evlu_amt` / `evlu_pfls_amt` | 매입금액 / 평가금액 / 평가손익금액 |
| `crdt_lnd_amt` | 신용대출금액 |
| `real_nass_amt` | 실제순자산금액 |
| `whol_weit_rt` | **전체비중율(%)** ← 자산배분 차트용 |

**응답 — `Output2` (Object, 계좌 총괄)**: `tot_asst_amt`(총자산금액)·`nass_tot_amt`(순자산총금액)·`pchs_amt_smtl`(매입금액합계)·`evlu_amt_smtl`(평가금액합계, 유가평가)·`evlu_pfls_amt_smtl`(평가손익합계)·`tot_dncl_amt`(총예수금액)·`dncl_amt`(예수금액)·`cma_evlu_amt`(CMA평가금액)·`frcr_evlu_tota`(외화평가총액)·`ovrs_stck_evlu_amt1`(해외주식평가금액)·`ovrs_bond_evlu_amt`(해외채권평가금액)·`thdt_rcvb_amt`(당일미수금액)·`loan_amt_smtl`(대출금액합계) 등.

> 자산배분(파이차트) 화면이면 `Output1[].whol_weit_rt` + 자산종류 순서표가 바로 매핑됨. 계좌 총자산은 `Output2.tot_asst_amt`.

---

### 3.7 `order_cash` — 주식주문(현금) (POST) ⚠️ 참고용 · 미구현

> **호출 코드를 본 레포에 작성하지 않는다. 구현은 `stock-order-integration` PRD + 안전장치 5종 하에서만.**

- URL: `/uapi/domestic-stock/v1/trading/order-cash`
- METHOD: **POST** (`postFlag=True`, hashkey 필요 가능 — 인증 문서 참조)
- TR_ID: 매수 실전 `TTTC0012U` / 모의 `VTTC0012U` · 매도 실전 `TTTC0011U` / 모의 `VTTC0011U`

**요청 파라미터 (body)**

| 파라미터 | 키 | 필수 | 설명 |
|---|---|---|---|
| 종합계좌번호 | `CANO` | Y | 앞 8자리 |
| 계좌상품코드 | `ACNT_PRDT_CD` | Y | 뒤 2자리 |
| 상품번호 | `PDNO` | Y | 종목코드 6자리(ETN 7자리) |
| 주문구분 | `ORD_DVSN` | Y | `00`:지정가, `01`:시장가 등 |
| 주문수량 | `ORD_QTY` | Y | 주문 수량 |
| 주문단가 | `ORD_UNPR` | Y | 1주당 가격(시장가 시 `0`) |
| 거래소ID구분코드 | `EXCG_ID_DVSN_CD` | Y | 예) `KRX` |
| 매도유형 | `SLL_TYPE` | 매도 시 | `01`:일반매도, `02`:임의매매, `05`:대차매도 |
| 조건가격 | `CNDT_PRIC` | - | 스탑지정가호가 주문 시 |

*(소스 함수 시그니처: `env_dv` real/demo, `ord_dv` buy/sell 로 TR_ID 분기)*

**주요 응답 필드** — `output`

| 키 | 의미 |
|---|---|
| `KRX_FWDG_ORD_ORGNO` | 거래소(한국거래소) 전송주문조직번호 |
| `ODNO` | 주문번호 |
| `ORD_TMD` | 주문시각 |

---

## 4. 미확인 / 후속

- **모의 지원 확정(2026-05-29)**: `inquire_account_balance`·`inquire_balance_rlz_pl`·`inquire_psbl_sell`·`intgr_margin` 은 **❌ 모의 미지원(실전 전용)** 으로 확인. 나머지 미확정: `inquire_credit_psamount`·`inquire_psbl_rvsecncl`·`inquire_period_profit`·`inquire_period_trade_profit`·`period_rights`·연금계.
- **응답 스펙 미수집**: 상세 작성한 §3.1~3.6 외 엔드포인트(`inquire_credit_psamount`·`inquire_psbl_rvsecncl`·`inquire_daily_ccld`·`inquire_period_*`·`period_rights`·연금계 등)의 응답 필드는 examples_llm `COLUMN_MAPPING` 추가 수집 또는 포털 문서로 보강 필요.
- **포털 문서 직접 인용 불가**: `apiportal.koreainvestment.com` 페이지가 JS 렌더라 raw 추출 실패 → 본 문서는 GitHub 소스 기반. 공식 응답 코드/제약(`rt_cd`, `msg_cd` 등)은 포털 교차검증 권장.
- **hashkey 필요 여부**: 주문(POST)계는 hashkey 가 필요할 수 있음 — 인증 문서로 확정 필요 (소스에 `postFlag=True` 만 확인됨).
- **`inquire_ccnl` 부재**: PRD 언급 체결내역은 `/trading/` 경로에 독립 함수 없음. `inquire_daily_ccld` 로 대체하거나, 실시간 체결통보(WebSocket)는 별도 카테고리로 분리 문서화 필요.
