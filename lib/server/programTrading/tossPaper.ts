import { isApiError } from "@/lib/api/errors";
import { fetchCandlesPage } from "@/lib/api/toss/candles";
import { isTossConfigured } from "@/lib/api/toss/client";
import { isoToKstDate, isoToKstHm, isoToKstMinuteStamp, todayKstDate } from "@/lib/api/toss/kst";
import { fetchMarketCalendar } from "@/lib/api/toss/marketCalendar";
import { fetchOrderbook } from "@/lib/api/toss/orderbook";
import { fetchTrades } from "@/lib/api/toss/trades";
import type { Quote, TradingState } from "@/lib/types/programTrading/programTrading";
import { hasCandidates } from "@/lib/validation/programTrading/candidateGate";
import { command, RULES, settleExpiredPaperStop, step } from "./engine";
import { logPaperMarket, withinMarketBudget } from "./marketBudget";

export function minuteInKorea(now: number) {
  const [hours, minutes] = isoToKstHm(new Date(now).toISOString())!.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function tossPaperSession(previous?: Awaited<ReturnType<typeof readSessionCalendar>>) {
  return readSessionCalendar(previous);
}

async function readSessionCalendar(previous?: { date: string; start: number; end: number; close: number; holiday: boolean }) {
  const date = todayKstDate();
  const today = (await withinMarketBudget(fetchMarketCalendar(date), null, 3_000))?.today;
  const regular = today?.date === date ? today.integrated?.regularMarket : undefined;
  const reused = !regular && today?.integrated !== null && previous?.date === date && Number.isFinite(previous.start);
  const start = reused ? previous.start : Date.parse(regular?.startTime ?? "");
  const end = reused ? previous.end : Date.parse(regular?.endTime ?? "");
  const auction = Date.parse(regular?.singlePriceAuctionStartTime ?? "");
  const hardClose = Date.parse(`${date}T15:20:00+09:00`);
  const close = reused ? previous.close : Math.min(Number.isFinite(end) ? end : hardClose, Number.isFinite(auction) && auction > start ? auction : hardClose, hardClose);
  const now = Date.now();
  const open = Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end;
  const minute = minuteInKorea(now);
  if (!Number.isFinite(start) && today?.integrated !== null) logPaperMarket("calendar-unavailable", { date });
  return {
    date, start, end, close, open, minute,
    canStart: open && now < close && minute >= RULES.entryStart && minute < RULES.entryEnd,
    holiday: today?.date === date && today.integrated === null,
  };
}

type CandlePage = Awaited<ReturnType<typeof fetchCandlesPage>>;

function completedCandleSignal(page: CandlePage, currentMinute: number): Quote["signal"] {
  const bars = new Map((page?.candles ?? []).map(bar => [isoToKstMinuteStamp(bar.timestamp), bar]));
  // Compare the last complete minute with three complete preceding minutes.
  // The in-progress bar is deliberately ignored to avoid minute-age bias.
  const completed = [1, 2, 3, 4].map(offset => {
    const expectedAt = currentMinute - offset * 60_000;
    const bar = bars.get(isoToKstMinuteStamp(new Date(expectedAt).toISOString()));
    const values = {
      open: Number(bar?.openPrice), high: Number(bar?.highPrice),
      low: Number(bar?.lowPrice), close: Number(bar?.closePrice), volume: Number(bar?.volume),
    };
    const valid = Date.parse(bar?.timestamp ?? "") === expectedAt
      && Object.values(values).every(value => Number.isFinite(value) && value > 0)
      && values.high >= Math.max(values.open, values.close)
      && values.low <= Math.min(values.open, values.close) && values.low <= values.high;
    return { ...values, valid };
  });
  const [last, ...prior] = completed;
  const complete = completed.every(bar => bar.valid);
  const previousHigh = complete ? Math.max(...prior.map(bar => bar.high)) : 0;
  const volumeRatio = complete ? last.volume / (prior.reduce((total, bar) => total + bar.volume, 0) / 3) : 0;
  return complete ? {
    closedAt: currentMinute, open: last.open, high: last.high, low: last.low, close: last.close,
    previousHigh, volumeRatio,
  } : undefined;
}

const CANDLE_RECHECK_MS = 30_000;
const PAPER_CANDLE_RATE_LIMIT_PAUSE_MS = 60_000;
let candleMinute = -1;
let paperCandlesPausedUntil = 0;
const candleRequests = new Map<string, { pending: Promise<Quote["signal"]>; retryAt: number }>();

function readCandles(ticker: string) {
  const minute = Math.floor(Date.now() / 60_000) * 60_000;
  if (candleMinute !== minute) {
    candleMinute = minute;
    candleRequests.clear();
  }

  const existing = candleRequests.get(ticker);
  if (existing && Date.now() < existing.retryAt) {
    return withinMarketBudget(existing.pending, undefined, 2_500);
  }
  if (Date.now() < paperCandlesPausedUntil) return undefined;

  // Ask for the four completed minutes, excluding the bar at the current boundary.
  const before = new Date(minute - 1).toISOString();
  const pending = fetchCandlesPage(ticker, "1m", { before, count: 4, source: "program-paper" })
    .then(page => completedCandleSignal(page, minute))
    .catch(error => {
      if (isApiError(error) && error.status === 429) {
        paperCandlesPausedUntil = Date.now() + PAPER_CANDLE_RATE_LIMIT_PAUSE_MS;
      }
      return undefined;
    })
    .then(signal => {
      if (!signal && candleRequests.get(ticker) === entry) entry.retryAt = Date.now() + CANDLE_RECHECK_MS;
      return signal;
    });
  const entry = { pending, retryAt: Infinity };
  candleRequests.set(ticker, entry);
  return withinMarketBudget(pending, undefined, 2_500);
}

async function loadTossPaperQuote(ticker: string, needCandles: boolean): Promise<Quote | null> {
  try {
    const [candleSignal, trades, book] = await Promise.all([
      needCandles ? readCandles(ticker) : null,
      fetchTrades(ticker, 1),
      fetchOrderbook(ticker),
    ]);
    const now = Date.now();
    const latest = trades[0];
    const bid = book.bids[0];
    const ask = book.asks[0];
    if (!latest || !bid || !ask || ![latest.price, bid.price, ask.price, bid.qty, ask.qty].every(Number.isFinite)
      || latest.price <= 0 || bid.price <= 0 || ask.price <= 0 || bid.qty <= 0 || ask.qty <= 0 || ask.price < bid.price) return null;

    const tradeAge = now - Date.parse(latest.timestamp);
    const bookAge = now - Date.parse(book.updatedAt ?? "");
    if (![tradeAge, bookAge].every(age => Number.isFinite(age) && age >= 0 && age <= 5_000)) return null;

    const currentMinute = Math.floor(now / 60_000) * 60_000;
    const signal = candleSignal?.closedAt === currentMinute ? candleSignal : undefined;
    return {
      ticker, name: ticker, price: latest.price,
      bid: bid.price, ask: ask.price, bidQty: bid.qty, askQty: ask.qty,
      previousHigh: signal?.previousHigh ?? 0, volumeRatio: signal?.volumeRatio ?? 0, signal,
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

  if (settleExpiredPaperStop(state, minuteInKorea(Date.now()))) return true;
  const priorDay = state.lifecycle && isoToKstDate(state.lifecycle.startedAt ?? undefined) !== session.date;
  if (priorDay || Date.now() >= session.close) requestPaperClose(state);

  const nowBeforeQuotes = Date.now();
  const minuteBoundary = Math.floor(nowBeforeQuotes / 60_000) * 60_000;
  const nextTicker = state.running && !state.positions.length && !state.killed
    && (state.entryCount ?? 0) < RULES.maxEntries && session.canStart && hasCandidates(state.candidates, nowBeforeQuotes)
    ? state.candidates.rows[state.tick % state.candidates.rows.length]?.ticker
    : undefined;
  const candidate = nextTicker && !state.blockedTickers?.includes(nextTicker)
    && (state.cooldown[nextTicker] ?? 0) <= minuteBoundary / 60_000
    && (state.signalTimes?.[nextTicker] ?? 0) < minuteBoundary ? nextTicker : undefined;
  const tickers = new Set(state.positions.map(position => position.ticker));
  if (candidate) tickers.add(candidate);
  const quotes = session.open
    ? (await Promise.all([...tickers].map(ticker => withinMarketBudget(loadTossPaperQuote(ticker, ticker === candidate), null, 3_000)))).filter(quote => quote !== null)
    : [];

  // Recheck time and quote age after all ticker requests have settled.
  const now = Date.now();
  if (now >= session.close) requestPaperClose(state);
  if (settleExpiredPaperStop(state, minuteInKorea(now), now)) return true;
  if (session.open && tickers.size && !quotes.length) logPaperMarket("no-fresh-quotes", { tickers: [...tickers] });
  const fresh = now < session.end
    ? quotes.map(quote => ({ ...quote, ageMs: quote.ageMs + now - (quote.receivedAt ?? now) }))
    : [];
  step(state, fresh, minuteInKorea(now), Math.floor(now / 60_000));
  return true;
}

function requestPaperClose(state: TradingState) {
  if (state.lifecycle?.status === "stopping" || state.lifecycle?.status === "completed") return;
  state.quotes = [];
  command(state, "flatten", "close");
}
