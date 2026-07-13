/** 환율 응답 — `/api/market/exchange-rate` (us-stock-support 원화 환산). */
export type ExchangeRateResponse = {
  base: string;
  quote: string;
  /** 1 base = rate quote. 소스 미설정·실패 시 null(호출부 미표시 degrade). */
  rate: number | null;
};
