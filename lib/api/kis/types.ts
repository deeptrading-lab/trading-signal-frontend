/**
 * KIS (Korea Investment & Securities) Developers Open API 응답 타입.
 *
 * PRD `stock-api-integration` §3.1, §7 사전 검증 메모 (2026-05-28) 회귀 차단의 1차 방어선.
 *
 * ## ⚠️ 응답 스키마 함정 — 종목명 vs 업종명
 *
 * `inquire-price.output` 에는 두 개의 한글 이름 필드가 있다:
 *   - `bstp_kor_isnm` — **업종명** ("전기·전자", "의약품", "은행" 등). 종목명 아님.
 *   - `hts_kor_isnm` — **종목명** ("삼성전자", "현대차" 등). 1차 종목명 소스.
 *   - `prdt_name` (일부 엔드포인트만 포함) — 종목명 대체 소스. 2차 fallback.
 *
 * → mappers.ts 의 `extractStockName` 이 우선순위 (`hts_kor_isnm` → `prdt_name` → ticker) 로 추출.
 * → AC-10 단위 테스트가 회귀 차단 (`__tests__/mappers.test.ts`).
 *
 * 모든 KIS 응답은 snake_case + 한국식 약어 (예: `stck_prpr` = 주식 현재가). 클라이언트 친화 스키마 매핑은 `mappers.ts` 의 책임.
 *
 * ## 응답 envelope
 *
 * KIS REST 응답은 공통적으로 다음 구조를 가진다:
 *   {
 *     rt_cd: "0" | "1" | ...,  // "0" = 정상, 그 외 = 에러
 *     msg_cd: "MCA00000" | ...,
 *     msg1: "정상처리 되었습니다." | <한글 에러 메시지>,
 *     output: { ... } | output1·output2 (엔드포인트별 다름)
 *   }
 *
 * 본 파일은 본 PR-A 가 호출하는 4개 엔드포인트의 타입만 정의한다.
 */

/** KIS 모든 REST 응답의 공통 envelope. */
export type KisEnvelope<TOutput> = {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output?: TOutput;
};

/**
 * 토큰 발급 응답 (`POST /oauth2/tokenP`).
 *
 * 본 envelope 은 일반 envelope 과 다르며 `rt_cd` 없이 곧장 토큰 필드를 돌려준다.
 * 실패 시 `error_code` + `error_description` (한글) 반환.
 */
export type KisTokenResponse = {
  access_token: string;
  access_token_token_expired?: string; // 만료 시각 (KST 문자열)
  token_type?: string; // "Bearer"
  expires_in?: number; // 남은 초 (보통 86400)
  error_code?: string;
  error_description?: string;
};

/**
 * 현재가 조회 응답 (`GET /uapi/domestic-stock/v1/quotations/inquire-price`).
 *
 * TR_ID = `FHKST01010100`. 본 PR-A 가 직접 호출하는 1차 엔드포인트.
 */
export type KisInquirePriceOutput = {
  /** ⚠️ 종목명 1차 소스. "삼성전자". */
  hts_kor_isnm?: string;
  /** ⚠️ 업종명 — 종목명 아님. "전기·전자". 절대 종목명으로 사용 X. */
  bstp_kor_isnm?: string;
  /** 일부 다른 엔드포인트가 돌려주는 종목명 대체 필드. fallback. */
  prdt_name?: string;
  /** 주식 현재가. 문자열 (KIS 는 숫자도 문자열로 돌려줌). */
  stck_prpr: string;
  /** 전일 대비. 부호 포함 문자열. */
  prdy_vrss: string;
  /** 전일 대비율 (퍼센트). */
  prdy_ctrt: string;
  /** 전일 대비 부호. "1" = 상한, "2" = 상승, "3" = 보합, "4" = 하한, "5" = 하락. */
  prdy_vrss_sign: string;
  /** 누적 거래량. */
  acml_vol: string;
  /** 시가. */
  stck_oprc?: string;
  /** 고가. */
  stck_hgpr?: string;
  /** 저가. */
  stck_lwpr?: string;
};

/**
 * 일자별 시세 조회 응답 (`GET /uapi/domestic-stock/v1/quotations/inquire-daily-price`).
 *
 * TR_ID = `FHKST01010400`. output 은 배열로 최근 30영업일 (or 기간) 반환.
 */
export type KisInquireDailyPriceItem = {
  /** 영업일자 (YYYYMMDD). */
  stck_bsop_date: string;
  /** 종가. */
  stck_clpr: string;
  /** 시가. */
  stck_oprc: string;
  /** 고가. */
  stck_hgpr: string;
  /** 저가. */
  stck_lwpr: string;
  /** 거래량. */
  acml_vol: string;
  /** 전일 대비. */
  prdy_vrss?: string;
  /** 전일 대비 부호. */
  prdy_vrss_sign?: string;
};

export type KisInquireDailyPriceResponse = KisEnvelope<
  KisInquireDailyPriceItem[]
>;

/**
 * 클라이언트 친화 스키마 — BFF route handler 가 응답하는 형태.
 *
 * 화면 컴포넌트가 직접 KIS snake_case 를 다루지 않도록 본 PR-A 의 `mappers.ts` 에서 변환.
 */
export type StockPrice = {
  ticker: string;
  /** ⚠️ 업종명이 아닌 종목명. mappers.ts 의 `extractStockName` 결과. */
  name: string;
  /** 현재가 (숫자). */
  price: number;
  /** 전일 대비 (부호 포함). */
  change: number;
  /** 전일 대비율 (퍼센트, 부호 포함). */
  changePercent: number;
  /** 등락 방향 — "up" / "down" / "flat". */
  direction: "up" | "down" | "flat";
  /** 누적 거래량. */
  volume: number;
  /** 시가·고가·저가 (가능 시). */
  open?: number;
  high?: number;
  low?: number;
};

export type StockDailyCandle = {
  /** YYYY-MM-DD (ISO 8601 일자). */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type StockSearchResult = {
  ticker: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
};

/**
 * 주식기본조회 응답 (`GET /uapi/domestic-stock/v1/quotations/search-stock-info`).
 *
 * TR_ID = `CTPF1002R`. params `PRDT_TYPE_CD=300`(주식/ETF/ETN/ELW) + `PDNO=<6자리 ticker>`.
 *
 * ## ⚠️ 실전 전용 — 모의(vts) 미지원
 *
 * 본 엔드포인트는 prod 키에서만 동작한다(`tr_cont` 다음조회 불가, 단건 object output).
 * BFF route 는 `isKisConfigured()` AND `resolveKisEnv()==="prod"` 이중 게이트 통과 시에만 호출.
 *
 * ## ⚠️ 종목명 1차 소스 = `prdt_abrv_name`
 *
 * `inquire-price` 의 `hts_kor_isnm` 은 prod 에서도 빈 값으로 오는 케이스가 확인됨(2026-05-29).
 * 따라서 표시용 종목명은 본 응답의 `prdt_abrv_name`("삼성전자") 가 1차 소스다.
 * `bstp_kor_isnm`(업종명)·`extractStockName`(inquire-price) 은 종목명으로 사용하지 않는다.
 *
 * 스펙: `docs/references/kis-api/domestic-stock-quotations.md` §2-7.
 */
export type KisSearchStockInfoOutput = {
  /** ⚠️ 상품약어명 = 표시용 종목명 (1차 소스). "삼성전자". */
  prdt_abrv_name?: string;
  /** 상품명(정식). "삼성전자보통주". 2차 fallback. */
  prdt_name?: string;
  /** 시장 ID — `STK`유가/`KSQ`코스닥/`KNX`코넥스/`ETF`… */
  mket_id_cd?: string;
  /** 거래소 구분 — `02`증권거래소(코스피)/`03`코스닥… */
  excg_dvsn_cd?: string;
  /** 증권그룹 — `ST`주권/`EF`ETF/`EN`ETN/`EW`ELW… */
  scty_grp_id_cd?: string;
  /** 코스피200 종목 여부 ("Y"/"N"). */
  kospi200_item_yn?: string;
  /** 거래정지 여부 ("Y"/"N"). */
  tr_stop_yn?: string;
  /** 관리종목 여부 ("Y"/"N"). */
  admn_item_yn?: string;
  /** 상장주수 (시총 계산용). */
  lstg_stqt?: string;
};

/**
 * 클라이언트 친화 종목 메타 스키마 — `search-stock-info` 매핑 결과.
 *
 * 종목명·시장 배지·거래정지/관리 경고 배지의 단일 진실 원천. BFF 가 시세(`StockPrice`)와 합성.
 */
export type StockMarket = "KOSPI" | "KOSDAQ" | "KONEX" | "ETF" | "기타";

export type StockInfo = {
  ticker: string;
  /** ⚠️ 표시용 종목명 — `prdt_abrv_name` → `prdt_name` → ticker. */
  name: string;
  /** 시장 배지 — `mket_id_cd`/`excg_dvsn_cd` 매핑. */
  market: StockMarket;
  /** 거래정지 여부 — 경고 배지용. */
  isTradeStopped: boolean;
  /** 관리종목 여부 — 경고 배지용. */
  isAdminItem: boolean;
  /** 코스피200 종목 여부. */
  isKospi200?: boolean;
};

/**
 * 국내 업종 현재지수 조회 응답
 * (`GET /uapi/domestic-stock/v1/quotations/inquire-index-price`).
 *
 * TR_ID = `FHPUP02100000`. `FID_COND_MRKT_DIV_CODE=U` (업종), `FID_INPUT_ISCD=<code>`.
 *
 * ## ⚠️ 종목명/업종명 함정 — 지수는 종목이 아니다
 *
 * 본 응답에는 **사용 가능한 식별 이름 필드가 없다**. `inquire-price` 의 `bstp_kor_isnm`
 * (업종명) 처럼 보이는 필드를 종목/지수명으로 끌어쓰면 안 된다 (PRD §1.4, §3.2 경고).
 * 지수명은 **클라이언트 상수 `INDEX_NAME_BY_CODE`** (`0001`→"KOSPI" 등) 로만 부여한다.
 *
 * 모든 값은 KIS 관례대로 문자열 (숫자도 string).
 */
export type KisInquireIndexPriceOutput = {
  /** 업종 지수 현재가. "2750.23". */
  bstp_nmix_prpr: string;
  /** 업종 지수 전일 대비. 부호 포함. "+33.10". */
  bstp_nmix_prdy_vrss: string;
  /** 전일 대비 부호. "1" 상한 / "2" 상승 / "3" 보합 / "4" 하한 / "5" 하락. */
  prdy_vrss_sign: string;
  /** 업종 지수 전일 대비율 (퍼센트). "1.20". */
  bstp_nmix_prdy_ctrt: string;
  /** 누적 거래량. */
  acml_vol: string;
  /** 누적 거래대금. */
  acml_tr_pbmn: string;
  /** 업종 지수 시가. */
  bstp_nmix_oprc?: string;
  /** 업종 지수 고가. */
  bstp_nmix_hgpr?: string;
  /** 업종 지수 저가. */
  bstp_nmix_lwpr?: string;
  /** 상승 종목 수. */
  ascn_issu_cnt?: string;
  /** 하락 종목 수. */
  down_issu_cnt?: string;
  /** 보합 종목 수. */
  stnr_issu_cnt?: string;
  /** 상한 종목 수. */
  uplm_issu_cnt?: string;
  /** 하한 종목 수. */
  lslm_issu_cnt?: string;
  /** 연중 지수 최고가. */
  dryy_bstp_nmix_hgpr?: string;
  /** 연중 지수 최저가. */
  dryy_bstp_nmix_lwpr?: string;
};

/**
 * 지수 코드 → 지수명 클라이언트 상수.
 *
 * ⚠️ `inquire-index-price` 응답에는 지수명 필드가 없으므로 본 상수가 단일 진실 원천.
 * 종목명 API (`extractStockName`/`bstp_kor_isnm`) 는 절대 사용하지 않는다 (지수는 종목 아님).
 */
export const INDEX_NAME_BY_CODE: Record<string, string> = {
  "0001": "KOSPI",
  "1001": "KOSDAQ",
  "2001": "KOSPI200",
};

/**
 * 관심종목 복수 시세 일괄조회 응답 종목 1건
 * (`GET /uapi/domestic-stock/v1/quotations/intstock-multprice`).
 *
 * TR_ID = `FHKST11300006`. 한 번의 호출에 최대 30종목 시세를 종목별 객체 배열(`output`)로 돌려준다.
 * 요청은 종목별 `FID_COND_MRKT_DIV_CODE_<i>`("J")/`FID_INPUT_ISCD_<i>`(6자리 ticker) 쌍을 `_1`~`_30`.
 *
 * ## ⚠️ 종목명 미사용 — 본 트랙은 종목명을 BFF 응답에 싣지 않는다
 *
 * - `inter_kor_isnm`(관심 한글 종목명)이 응답에 있을 수 있으나 **종목명 호출 제거 정책상 표시 종목명은
 *   클라이언트 store(`{ticker,name}`) → 시드(symbols.json) → ticker 폴백이 단일 진실**이다.
 *   BFF 는 `name` 을 시드 fallback(`getSymbolName`) → ticker 로만 채우고 클라가 store name 으로 덮는다.
 * - `bstp_kor_isnm`(업종명)은 본 응답·매퍼에서 절대 사용하지 않는다(stock-api-integration AC-10 정합).
 *
 * ## ⚠️ 응답 필드 — 리서치 §C-2(`chk_intstock_multprice.py`) 기준
 *
 * 종목 시세 접두는 `inter2_`(현재가/시고저 등). 일부 등락 필드는 접두 없는 `prdy_ctrt`/`prdy_vrss_sign`.
 * 레퍼런스(`domestic-stock-quotations.md`)는 파라미터만 수집했고 응답 키는 미수집 → `(확인 필요)` 표기한
 * 키는 실호출 1회로 보강 권장. 매퍼는 누락 시 `toNumber` → 0 으로 방어한다.
 *
 * 모든 값은 KIS 관례대로 문자열(숫자도 string).
 */
export type KisIntstockMultpriceItem = {
  /** 관심 단축 종목코드(6자리). 입력 ticker 와 매칭하는 키. */
  inter_shrn_iscd?: string;
  /** 관심 한글 종목명. ⚠️ 본 트랙 미사용(클라 store/시드가 표시명). */
  inter_kor_isnm?: string;
  /** 현재가. */
  inter2_prpr?: string;
  /** 전일 대비. 부호 포함 문자열. */
  inter2_prdy_vrss?: string;
  /** 전일 대비 부호. "1" 상한 / "2" 상승 / "3" 보합 / "4" 하한 / "5" 하락. */
  prdy_vrss_sign?: string;
  /** 전일 대비율(%). */
  prdy_ctrt?: string;
  /** 누적 거래량. */
  acml_vol?: string;
  /** 누적 거래대금. */
  acml_tr_pbmn?: string;
  /** 시가 / 고가 / 저가. */
  inter2_oprc?: string;
  inter2_hgpr?: string;
  inter2_lwpr?: string;
};

/**
 * 관심종목 일괄 시세 표시 모델 — 종목별 정규 시세.
 *
 * ## WS 트랙 재사용 계약 (PRD §3.6 / AC-13)
 *
 * price/change/changePercent/direction/volume 공통 부분집합을 정규 스키마로 유지한다 →
 * `watchlist-realtime-ws` 트랙이 `H0STCNT0` push 델타(현재가/등락/등락률/거래량)로 그대로 갱신 가능.
 * 본 트랙 산출물(`fetchIntstockMultprice`/`mapIntstockMultprice`/본 타입)은 WS 트랙의 초기 스냅샷 +
 * REST 폴백 인프라로 재사용된다. 따라서 시세 외 필드를 늘리지 않는다(메타/배지는 별도 트랙).
 *
 * ⚠️ `name` 은 본 호출에서 신뢰 가능한 값이 오지 않는다 — BFF 가 시드 fallback → ticker 로만 채우고
 * 클라이언트가 store name 으로 덮어쓴다. 표시명의 단일 진실이 아니다.
 */
export type WatchlistQuote = {
  ticker: string;
  /** ⚠️ 식별 폴백용 — 시드 name → ticker. 클라가 store name 으로 덮음. */
  name: string;
  price: number;
  change: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  /**
   * ⚠️ 본 트랙(일괄조회)은 더 이상 채우지 않는 옵셔널 메타 필드.
   * PRD §4 q2 RESOLVED — `search-stock-info` 호출 제거로 데이터 소스가 사라져 일시 보류(미표시).
   * 화면은 옵셔널이라 미표시 시 회귀 0. 배지 복원은 별도 후속 트랙. 타입 호환을 위해 슬롯만 유지.
   */
  market?: StockMarket;
  isTradeStopped?: boolean;
  isAdminItem?: boolean;
};

/**
 * 클라이언트 친화 지수 스키마 — BFF route 가 응답하는 형태.
 *
 * 화면 컴포넌트가 KIS snake_case 를 직접 다루지 않도록 `mappers.ts` 의 `mapIndexPrice` 가 변환.
 */
export type MarketIndexQuote = {
  /** 지수 코드 ("0001"/"1001"/"2001"). */
  code: string;
  /** 지수명 — `INDEX_NAME_BY_CODE` 상수 매핑. */
  name: string;
  /** 현재 지수 값 (숫자). */
  value: number;
  /** 전일 대비 (부호 포함). */
  change: number;
  /** 전일 대비율 (퍼센트, 부호 포함). */
  changePercent: number;
  /** 등락 방향 — "up" / "down" / "flat". */
  direction: "up" | "down" | "flat";
  /** 누적 거래량. */
  volume: number;
  /** 누적 거래대금. */
  tradeAmount?: number;
  /** 상승 종목 수. */
  advances?: number;
  /** 하락 종목 수. */
  declines?: number;
  /** 보합 종목 수. */
  unchanged?: number;
  /** 시가·고가·저가. */
  open?: number;
  high?: number;
  low?: number;
  /** 연중 최고가·최저가. */
  yearHigh?: number;
  yearLow?: number;
};
