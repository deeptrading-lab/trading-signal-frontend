/**
 * OpenDART API 응답 타입.
 *
 * PRD `stock-api-integration` §3.2.
 *
 * ## 공통 envelope
 *
 * 모든 OpenDART 응답은 다음 envelope 을 가진다:
 *   {
 *     status: "000" | "010" | "011" | "012" | "013" | "014" | "020" | ...,
 *     message: "정상" | <한글 에러>,
 *     ...payload (엔드포인트별)
 *   }
 *
 * - status "000" = 정상.
 * - "013" = 조회된 데이터가 없습니다.
 * - "020" = 사용한도 초과.
 * - 기타 코드는 `https://opendart.fss.or.kr/guide/main.do` 참고.
 *
 * ## 인증
 *
 * `crtfc_key` 를 query param 으로 매번 전송. token 캐싱 불필요.
 */

export type DartEnvelope = {
  status: string;
  message: string;
};

/**
 * 기업개황 응답 (`/api/company.json`).
 *
 * 본 PR-A 는 일부 필드만 사용 — 후속 PR-B 의 Profile 화면이 표시할 항목 우선.
 */
export type DartCompanyResponse = DartEnvelope & {
  /** 정식 명칭. "삼성전자주식회사". */
  corp_name?: string;
  /** 영문 명칭. */
  corp_name_eng?: string;
  /** 종목명 (영문). */
  stock_name?: string;
  /** 종목코드 (6자리). */
  stock_code?: string;
  /** 대표자명. */
  ceo_nm?: string;
  /** 법인구분: Y(유가) / K(코스닥) / N(코넥스) / E(기타). */
  corp_cls?: string;
  /** 사업자등록번호. */
  bizr_no?: string;
  /** 법인등록번호. */
  jurir_no?: string;
  /** 주소. */
  adres?: string;
  /** 홈페이지 URL. */
  hm_url?: string;
  /** IR URL. */
  ir_url?: string;
  /** 전화번호. */
  phn_no?: string;
  /** 팩스번호. */
  fax_no?: string;
  /** 업종 (KSIC). "264 - 컴퓨터 및 주변장치 제조업". */
  induty_code?: string;
  /** 설립일. YYYYMMDD. */
  est_dt?: string;
  /** 결산월. MM. */
  acc_mt?: string;
};

/**
 * 공시 목록 응답 (`/api/list.json`).
 */
export type DartDisclosureListResponse = DartEnvelope & {
  /** 페이지 번호. */
  page_no?: number;
  /** 페이지당 건수. */
  page_count?: number;
  /** 총 건수. */
  total_count?: number;
  /** 총 페이지 수. */
  total_page?: number;
  list?: DartDisclosureItem[];
};

export type DartDisclosureItem = {
  /** 공시 고유번호 (14자리). */
  rcept_no: string;
  /** 공시 대상회사 정식 명칭. */
  corp_name: string;
  /** 공시 대상회사 종목코드. */
  stock_code: string;
  /** 법인구분. */
  corp_cls: string;
  /** 보고서명. */
  report_nm: string;
  /** 제출인. */
  flr_nm: string;
  /** 접수일자 (YYYYMMDD). */
  rcept_dt: string;
  /** 비고. */
  rm?: string;
  /** 회사고유번호 (8자리). */
  corp_code: string;
};

/**
 * 클라이언트 친화 스키마 — BFF route handler 응답.
 */
export type CompanyProfile = {
  ticker: string;
  /** 정식 명칭 — DART corp_name. KIS hts_kor_isnm 과 다를 수 있음 (DART 는 "삼성전자주식회사", KIS 는 "삼성전자"). */
  corpName: string;
  /** 대표자명. */
  ceoName: string;
  /** 시장 구분. */
  market: "KOSPI" | "KOSDAQ" | "KONEX" | "OTHER";
  /** 설립일 (ISO 8601). */
  establishedDate?: string;
  /** 업종 코드 + 명. */
  industry?: string;
  /** 홈페이지 URL. */
  homepage?: string;
  /** 주소. */
  address?: string;
};

export type DisclosureItem = {
  rceptNo: string;
  corpName: string;
  reportName: string;
  filerName: string;
  /** 접수일자 (ISO 8601 일자). */
  rceptDate: string;
};
