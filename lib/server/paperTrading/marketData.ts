import {
  fetchStockPrice,
  getSymbolName,
  isKisConfigured,
} from "@/lib/api/kis";
import { withTimeout } from "@/lib/server/bffUtils";
import type {
  PaperTradingPriceSnapshot,
  PaperTradingSelectedStock,
} from "@/lib/types/paperTrading/paperTrading";

export type PaperTradingPriceSnapshotProvider = (
  stocks: PaperTradingSelectedStock[],
  tickIndex: number,
  tickWindowStart: string,
) => Promise<PaperTradingPriceSnapshot[]>;

export const getLivePriceSnapshot: PaperTradingPriceSnapshotProvider = async (
  stocks,
  _tickIndex,
  tickWindowStart,
) => {
  if (!isKisConfigured()) {
    throw new Error("실제 현재가 조회를 위한 KIS 환경변수가 설정되지 않았어요.");
  }

  return Promise.all(
    stocks.map(async (stock) => {
      const normalized = stock.ticker.trim().toUpperCase();
      const price = await withTimeout(fetchStockPrice(normalized), 5_000);
      return {
        ticker: normalized,
        name: price.name && price.name !== normalized
          ? price.name
          : stock.name || getSymbolName(normalized) || normalized,
        price: price.price,
        changePct: round(price.changePercent),
        asOf: tickWindowStart,
        freshnessSeconds: 0,
      };
    }),
  );
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
