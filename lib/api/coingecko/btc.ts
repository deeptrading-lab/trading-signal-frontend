/**
 * CoinGecko BTC 원화 시세 호출.
 *
 * PRD `header-market-ticker` §3.2.
 *
 * `GET /simple/price?ids=bitcoin&vs_currencies=krw&include_24hr_change=true`
 *   → `{ bitcoin: { krw, krw_24h_change } }` → `BtcQuote`.
 *
 * 서버 전용. KIS env 와 무관(키 없이 호출, 실패 시 BFF 가 BTC 만 mock).
 * 무료 한도(~10–30/min) 보호는 BFF 의 3분 TTL 캐싱이 담당.
 */

import { makeApiError } from "@/lib/api/errors";
import { getCoinGeckoClient } from "./client";
import type { BtcQuote, CoinGeckoSimplePriceResponse } from "./types";

/**
 * CoinGecko `/simple/price` 응답 → `BtcQuote`.
 *
 * BTC 는 24h 등락이라 `krw_24h_change >= 0` 으로 up/down 직접 판정(보합 0 은 up 흡수).
 *
 * 단위 테스트 위치: `lib/api/coingecko/__tests__/btc.test.ts`.
 */
export function mapBtcQuote(response: CoinGeckoSimplePriceResponse): BtcQuote {
  const krw = response.bitcoin?.krw;
  const change = response.bitcoin?.krw_24h_change;
  if (typeof krw !== "number" || !Number.isFinite(krw)) {
    throw makeApiError("server", {
      message: "비트코인 시세를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
    });
  }
  const changePct = typeof change === "number" && Number.isFinite(change) ? change : 0;
  return {
    value: krw,
    changePct,
    isUp: changePct >= 0,
  };
}

/**
 * BTC 원화 현재가 + 24h 등락 조회.
 *
 * 네트워크/한도(429) 실패는 `ApiError`(network/server) 로 throw — BFF 가 BTC 만 mock degrade.
 */
export async function fetchBtcKrw(): Promise<BtcQuote> {
  const client = getCoinGeckoClient();

  let response;
  try {
    response = await client.get<CoinGeckoSimplePriceResponse>("/simple/price", {
      params: {
        ids: "bitcoin",
        vs_currencies: "krw",
        include_24hr_change: true,
      },
    });
  } catch (error) {
    const status =
      typeof (error as { response?: { status?: number } }).response?.status ===
      "number"
        ? (error as { response: { status: number } }).response.status
        : undefined;
    const kind = status && status >= 500 ? "server" : "network";
    throw makeApiError(kind, {
      status,
      message:
        error instanceof Error
          ? error.message
          : "비트코인 시세 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  return mapBtcQuote(response.data);
}
