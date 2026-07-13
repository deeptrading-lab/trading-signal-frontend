/**
 * 토스 환율 어댑터 — `/api/v1/exchange-rate` (us-stock-support 원화 환산).
 *
 * 미국 종목은 달러 시세라 원화 환산가를 곁들이려면 환율이 필요하다. 토스가 `baseCurrency`/
 * `quoteCurrency` 로 실시간 환율을 준다(rate 문자열, validUntil ~5분). 부가 정보라 실패는
 * null 로 삼켜 화면을 막지 않는다(never-throw).
 */

import { tossGet } from "./client";

type TossExchangeRate = {
  baseCurrency?: string;
  quoteCurrency?: string;
  rate?: string;
  midRate?: string;
};

/** 1 base 통화 = 반환값 quote 통화. 실패·비정상 응답이면 null. */
export async function fetchExchangeRate(
  base: string,
  quote: string,
): Promise<number | null> {
  try {
    const res = await tossGet<TossExchangeRate>("/api/v1/exchange-rate", {
      baseCurrency: base,
      quoteCurrency: quote,
    });
    const rate = Number(res?.rate ?? res?.midRate);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}
