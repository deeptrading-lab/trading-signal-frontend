import { PAPER_TRADING_PRICE_PATH } from "@/lib/server/paperTrading/constants";
import type {
  PaperTradingPriceSnapshot,
  PaperTradingSelectedStock,
} from "@/lib/types/paperTrading/paperTrading";

export function getMockPriceSnapshot(
  stock: PaperTradingSelectedStock,
  tickIndex: number,
  tickWindowStart: string,
  stockIndex = 0,
): PaperTradingPriceSnapshot {
  const normalized = stock.ticker.trim().toUpperCase();
  const index = (tickIndex + stockIndex) % PAPER_TRADING_PRICE_PATH.length;
  const previousIndex =
    tickIndex === 0
      ? index
      : (tickIndex - 1 + stockIndex) % PAPER_TRADING_PRICE_PATH.length;
  const current = Number(PAPER_TRADING_PRICE_PATH[index]);
  const previous =
    tickIndex === 0
      ? current
      : Number(PAPER_TRADING_PRICE_PATH[previousIndex]);
  const changePct = previous === 0 ? 0 : ((current - previous) / previous) * 100;

  return {
    ticker: normalized,
    name: stock.name || normalized,
    price: current,
    changePct: round(changePct),
    asOf: tickWindowStart,
    freshnessSeconds: 15,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
