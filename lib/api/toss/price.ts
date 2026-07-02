/**
 * 토스 현재가 어댑터 — `/prices`(lastPrice) + 일봉 컨텍스트 + 종목 마스터 합성 → `StockPrice`.
 *
 * PRD `toss-market-data-adapter` §3-3, AC-3. 토스 `/prices` 는 symbol/timestamp/lastPrice/currency
 * 4필드뿐이라 KIS `inquire-price` 가 한 콜에 주던 등락·거래량·시고저를 아래처럼 합성한다:
 *
 *   - price          = lastPrice (실시간 — NXT·미국 프리마켓 포함)
 *   - change/percent = lastPrice − 전일종가(일봉 컨텍스트), 부호로 direction
 *   - volume/open/high/low = 당일 진행 일봉(실측상 라이브 갱신). 장전엔 당일 봉이 없어 0/undefined
 *   - name           = 종목 마스터 한글명(24h 캐시) → 시드 → ticker
 *
 * 토스 미제공 디그레이드(§8): sector(업종명)·foreignRatio(외국인 지분율) = undefined — UI 는
 * 옵셔널 필드라 "-" 표시로 수렴. KIS 폴백 모드에서는 기존대로 채워진다.
 */

import { pickTossArray, tossGet } from "./client";
import { fetchRecentDailyContext } from "./candles";
import { makeTossTransportError } from "./errors";
import { getTossStockMaster } from "./stock-master";
import type { TossPriceRow, TossStockRow } from "./types";
import { getSymbolName } from "@/lib/api/kis/search";
import type { StockPrice } from "@/lib/api/kis/types";
import type { StockPriceWithShares } from "@/lib/api/kis/price";

function num(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchPriceRow(symbol: string): Promise<TossPriceRow | null> {
  const result = await tossGet<unknown>("/api/v1/prices", { symbols: symbol });
  const rows = pickTossArray<TossPriceRow>(result, "prices");
  return rows.find((r) => r.symbol === symbol) ?? rows[0] ?? null;
}

type PriceParts = { price: StockPrice; master: TossStockRow | null };

async function fetchPriceParts(ticker: string): Promise<PriceParts> {
  const [row, context, master] = await Promise.all([
    fetchPriceRow(ticker),
    fetchRecentDailyContext(ticker),
    // 마스터는 name 보강용 — 실패해도 시세 서빙은 계속(시드/ticker 폴백).
    getTossStockMaster(ticker).catch(() => null),
  ]);

  const last = num(row?.lastPrice);
  const price = last > 0 ? last : context.today?.close ?? 0;
  if (price <= 0) {
    throw makeTossTransportError({
      message: `토스 시세 응답에 ${ticker} 데이터가 없어요.`,
    });
  }

  const prevClose = context.prevClose;
  const change = prevClose ? price - prevClose : 0;
  const changePercent = prevClose
    ? Math.round((change / prevClose) * 10_000) / 100
    : 0;

  const stockPrice: StockPrice = {
    ticker,
    name: master?.name?.trim() || getSymbolName(ticker) || ticker,
    price,
    change,
    changePercent,
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    volume: context.today?.volume ?? 0,
    open: context.today?.open || undefined,
    high: context.today?.high || undefined,
    low: context.today?.low || undefined,
    sector: undefined,
    foreignRatio: undefined,
  };

  return { price: stockPrice, master };
}

/** `fetchStockPrice(ticker)` 의 토스 구현. */
export async function fetchStockPriceToss(ticker: string): Promise<StockPrice> {
  const { price } = await fetchPriceParts(ticker);
  return price;
}

/** `fetchStockPriceWithShares(ticker)` 의 토스 구현 — 상장주수는 마스터 `sharesOutstanding`. */
export async function fetchStockPriceWithSharesToss(
  ticker: string,
): Promise<StockPriceWithShares> {
  const { price, master } = await fetchPriceParts(ticker);
  const listed = num(master?.sharesOutstanding);
  return { price, listedShares: listed > 0 ? listed : null };
}
