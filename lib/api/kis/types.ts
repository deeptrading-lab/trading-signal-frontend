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
