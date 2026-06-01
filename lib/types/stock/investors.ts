/**
 * 표면 B — 종목별 개인/외국인/기관 최근 N일 순매수 추이 도메인 모델.
 *
 * PRD `investor-flow` §4.B / §6.2 — KIS `inquire-investor`(`FHKST01010900`) output(일자별
 * 최근 N일 배열) → 화면 친화 스키마. BFF(`/api/stock/investors`)가 본 형태로 응답한다.
 *
 * ## ⚠️ 단위 — 거래대금(`*NetBuyAmount`)은 백만원, 음수=순매도
 *
 * KIS `*_ntby_tr_pbmn` 단위가 백만원이라 본 모델의 거래대금도 **백만원** 그대로 둔다(표시 환산은
 * 프론트). 순매수 수량(`*NetBuyQty`)·거래대금 모두 음수(순매도) 부호를 보존한다.
 */

/** 일자 1건 — 개인/외국인/기관 순매수(수량·거래대금) + 종가/전일대비. */
export type StockInvestorDay = {
  /** 영업일자 — YYYY-MM-DD(ISO). */
  date: string;
  /** 종가(숫자). */
  close: number;
  /** 전일 대비 부호. "1" 상한 / "2" 상승 / "3" 보합 / "4" 하한 / "5" 하락. */
  changeSign: string;
  /** 개인 순매수 거래대금(백만원, 부호 포함). */
  personNetBuyAmount: number;
  /** 개인 순매수 수량(주, 부호 포함). */
  personNetBuyQty: number;
  /** 외국인 순매수 거래대금(백만원, 부호 포함). */
  foreignNetBuyAmount: number;
  /** 외국인 순매수 수량(주, 부호 포함). */
  foreignNetBuyQty: number;
  /** 기관 순매수 거래대금(백만원, 부호 포함). */
  orgNetBuyAmount: number;
  /** 기관 순매수 수량(주, 부호 포함). */
  orgNetBuyQty: number;
};

/** 종목별 최근 N일 순매수 추이. */
export type StockInvestorTrend = {
  /** 일자별 배열(최신이 [0] — KIS 응답 순서 보존). */
  days: StockInvestorDay[];
};
