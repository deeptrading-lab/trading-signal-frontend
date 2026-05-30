/**
 * CoinGecko Simple Price API 응답 타입 + 클라이언트 친화 스키마.
 *
 * PRD `header-market-ticker` §3.2.
 *
 * `GET /api/v3/simple/price?ids=bitcoin&vs_currencies=krw&include_24hr_change=true`
 *   → `{ bitcoin: { krw: number, krw_24h_change: number } }`
 *
 * 본 모듈은 KIS 와 무관한 별도 도메인(서버 전용). KIS 타입을 import 하지 않는다.
 */

/** `/simple/price` 응답 — ids=bitcoin, vs_currencies=krw. */
export type CoinGeckoSimplePriceResponse = {
  bitcoin?: {
    /** 원화 현재가. 숫자(KIS 와 달리 CoinGecko 는 number 로 응답). */
    krw?: number;
    /** 24시간 등락률(%). 음수 가능. */
    krw_24h_change?: number;
  };
};

/**
 * 클라이언트 친화 BTC 시세 — BFF 가 `MarketTicker` 합성에 사용.
 *
 * BTC 는 24h 등락이라 한국식 부호(`prdy_vrss_sign`) 대신 `changePct >= 0` 으로
 * up/down 을 직접 판정한다(보합 0 은 up 톤으로 흡수, 기존 2색 체계 유지).
 */
export type BtcQuote = {
  /** 원화 현재가(숫자). */
  value: number;
  /** 24시간 등락률(%). */
  changePct: number;
  /** 등락 — `changePct >= 0` → true(상승 톤). */
  isUp: boolean;
};
