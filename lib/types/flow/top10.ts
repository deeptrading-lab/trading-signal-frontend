/**
 * 표면 A — 시장 전체 외국인/기관 당일 순매수 Top10 도메인 모델.
 *
 * PRD `investor-flow` §4.A / §6.1 — KIS `foreign-institution-total`(`FHPTJ04400000`) output
 * (snake_case + 한국식 약어) → 화면 친화 스키마. BFF(`/api/flow/top10`)가 외국인용·기관용
 * 주체별 2콜을 합쳐 본 형태로 응답한다.
 *
 * ## ⚠️ 단위 — 거래대금(`netBuyAmount`)은 백만원
 *
 * KIS `*_ntby_tr_pbmn` 단위가 백만원이라 본 모델의 `netBuyAmount` 도 **백만원** 그대로 둔다.
 * 표시 단위 환산(억/조 등)·접미 카피는 프론트(컴포넌트/`lib/utils` 포맷터)의 책임이다.
 * 음수(순매도)는 부호를 보존한다.
 */

/** 등락 방향 — 현재가 전일대비 부호 기반. */
export type FlowDirection = "up" | "down" | "flat";

/** 순매수 랭킹 1행(외국인 또는 기관). */
export type InvestorFlowRow = {
  /** 종목 코드(6자리). */
  ticker: string;
  /** 종목명 — KIS `hts_kor_isnm`, 없으면 ticker. */
  name: string;
  /** 현재가(숫자). */
  price: number;
  /** 전일 대비율(%, 부호 포함). */
  changePercent: number;
  /** 등락 방향 — changePercent 부호 기준. */
  direction: FlowDirection;
  /** ⚠️ 순매수 거래대금(백만원, 부호 포함). 표시 환산은 프론트. */
  netBuyAmount: number;
  /** 순매수 수량(주, 부호 포함). */
  netBuyQty: number;
};

/** 외국인·기관 Top10 합성 응답. */
export type InvestorFlowTop10 = {
  /** 외국인 순매수 상위(거래대금 정렬, 최대 10). */
  foreign: InvestorFlowRow[];
  /** 기관 순매수 상위(거래대금 정렬, 최대 10). */
  institution: InvestorFlowRow[];
  /** 기준 시각(ISO 문자열) — "기준 시각" 표기용. 미상 시 생략. */
  asOf?: string;
  /**
   * 누적 모드(`mode=cumulative`)에서 실제 합산에 사용된 영업일 수(≤7). 당일 모드면 생략.
   * 0 이면 적립 전(부트스트랩) — UI 가 "모으는 중" 안내. 7 미만이면 "최근 N영업일 누적".
   */
  cumulativeDays?: number;
};

/** Top10 조회 모드 — 당일 스냅샷 / 최근 N영업일 누적. */
export type FlowMode = "today" | "cumulative";
