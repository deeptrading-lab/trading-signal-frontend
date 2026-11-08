import { fetchCandlesPage } from "@/lib/api/toss/candles";
import { isTossConfigured } from "@/lib/api/toss/client";
import { isoToKstDate, isoToKstHm, isoToKstMinuteStamp, todayKstDate } from "@/lib/api/toss/kst";
import { fetchMarketCalendar } from "@/lib/api/toss/marketCalendar";
import { fetchOrderbook } from "@/lib/api/toss/orderbook";
import { fetchTrades } from "@/lib/api/toss/trades";
import type { Quote, TradingState } from "@/lib/types/programTrading/programTrading";
import { command, step } from "./engine";

function minuteInKorea(now: number) {
  const [hours, minutes] = isoToKstHm(new Date(now).toISOString())!.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function tossPaperSession() {
  const date = todayKstDate();
  const today = (await fetchMarketCalendar(date))?.today;
  const regular = today?.date === date ? today.integrated?.regularMarket : undefined;
  const start = Date.parse(regular?.startTime ?? "");
  const end = Date.parse(regular?.endTime ?? "");
  const auction = Date.parse(regular?.singlePriceAuctionStartTime ?? "");
  const close = Math.min(end, Number.isFinite(auction) && auction > start ? auction : end, Date.parse(`${date}T15:20:00+09:00`));
  const now = Date.now();
  const open = Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end;
  const minute = minuteInKorea(now);
  return {
    date, start, end, close, open, minute,
    canStart: open && now < close && minute >= 550 && minute < 900,
    holiday: today?.date === date && today.integrated === null,
  };
}

async function loadTossPaperQuote(ticker: string): Promise<Quote | null> {
  try {
    const [page, trades, book] = await Promise.all([
      fetchCandlesPage(ticker, "1m", { count: 5 }),
      fetchTrades(ticker, 1),
      fetchOrderbook(ticker),
    ]);
    const now = Date.now();
    const latest = trades[0];
    const bid = book.bids[0];
    const ask = book.asks[0];
    if (!latest || !bid || !ask || bid.qty <= 0 || ask.qty <= 0 || ask.price < bid.price) return null;

    const tradeAge = now - Date.parse(latest.timestamp);
    const bookAge = now - Date.parse(book.updatedAt ?? "");
    if (![tradeAge, bookAge].every(age => Number.isFinite(age) && age >= 0 && age <= 5_000)) return null;

    const currentMinute = Math.floor(now / 60_000) * 60_000;
    const bars = new Map((page.candles ?? []).map(bar => [isoToKstMinuteStamp(bar.timestamp), bar]));
    const current = bars.get(isoToKstMinuteStamp(new Date(currentMinute).toISOString()));
    const previous = [1, 2, 3].map(offset => bars.get(isoToKstMinuteStamp(new Date(currentMinute - offset * 60_000).toISOString())));
    const highs = previous.map(bar => Number(bar?.highPrice));
    const volumes = previous.map(bar => Number(bar?.volume));
    const complete = highs.every(high => Number.isFinite(high) && high > 0) && volumes.every(volume => Number.isFinite(volume) && volume > 0);
    const activeVolume = Number(current?.volume);
    return {
      ticker, name: ticker, price: latest.price,
      previousHigh: complete ? Math.max(...highs) : 0,
      volumeRatio: complete && Number.isFinite(activeVolume) && activeVolume > 0
        ? activeVolume / (volumes.reduce((total, volume) => total + volume, 0) / 3) : 0,
      spreadBps: (ask.price - bid.price) / ((ask.price + bid.price) / 2) * 10_000,
      ageMs: Math.max(tradeAge, bookAge), receivedAt: now, halted: false,
    };
  } catch {
    return null;
  }
}

export function requireTossPaperConfig(): void {
  if (!isTossConfigured()) throw new Error("토스 시세용 TOSS_CLIENT_ID와 TOSS_CLIENT_SECRET을 설정해 주세요.");
}

export async function stepTossPaper(state: TradingState, session: Awaited<ReturnType<typeof tossPaperSession>>) {
  if (!state.running && !state.positions.length && state.lifecycle?.status !== "running" && state.lifecycle?.status !== "stopping") return false;

  const priorDay = state.lifecycle && isoToKstDate(state.lifecycle.startedAt ?? undefined) !== session.date;
  if (priorDay || Date.now() >= session.close) requestPaperClose(state);

  const candidate = state.running && session.canStart
    ? state.candidates.rows[state.tick % state.candidates.rows.length]?.ticker
    : undefined;
  const tickers = new Set(state.positions.map(position => position.ticker));
  if (candidate) tickers.add(candidate);
  const quotes = session.open
    ? (await Promise.all([...tickers].map(loadTossPaperQuote))).filter(quote => quote !== null)
    : [];

  // Recheck time and quote age after all ticker requests have settled.
  const now = Date.now();
  if (now >= session.close) requestPaperClose(state);
  const fresh = now < session.end
    ? quotes.map(quote => ({ ...quote, ageMs: quote.ageMs + now - (quote.receivedAt ?? now) }))
    : [];
  step(state, fresh, minuteInKorea(now), Math.floor(now / 60_000));
  return true;
}

function requestPaperClose(state: TradingState) {
  if (state.lifecycle?.status === "stopping" || state.lifecycle?.status === "completed") return;
  state.quotes = [];
  command(state, "flatten");
}
