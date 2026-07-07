/**
 * 단타(cli-agent) 틱 결정 오케스트레이터 (intraday-scalping-agent §3-5).
 *
 * runTick 이 `session.decisionProvider==="cli-agent"` 일 때 호출. 분봉/일봉 데이터를 페치하고
 * 포지션·직전결정 컨텍스트를 만들어 `decideIntradayWithCli` 를 호출, PaperTradingDecision +
 * 청산 트리거(forcedExit)를 돌려준다. KIS 미설정/실패는 결정론 폴백으로 degrade.
 *
 * ⚠️ 분봉 페치는 콜이 많다 — 전일 warmup 분봉은 프로세스 캐시(ticker+date), 당일분만 틱마다 갱신.
 */

import { fetchDailyChunked } from "@/lib/api/kis/chartChunked";
import {
  fetchMinuteCandlesForDate,
  fetchTodayMinuteCandles,
} from "@/lib/api/kis/minuteChartChunked";
import { isKisConfigured } from "@/lib/api/kis";
import { dailyRegimeFromCandles } from "@/lib/signal/intradayProfile";
import { decideIntradayWithCli } from "@/lib/server/paperTrading/decisionProviders/intradayCli";
import { detectProviders } from "@/lib/server/ai/detectCli";
import {
  PAPER_TRADING_CLOSE_FLATTEN_HHMM,
  PAPER_TRADING_DAILY_LOSS_KILL_PCT,
  PAPER_TRADING_INTRADAY_PRIOR_DAYS,
  deriveIntradayTimeframe,
} from "@/lib/server/paperTrading/constants";
import type { StockMinuteCandle } from "@/lib/api/kis/types";
import type {
  PaperTradingPosition,
  PaperTradingPriceSnapshot,
  PaperTradingSession,
  PaperTradingTick,
} from "@/lib/types/paperTrading/paperTrading";
import type {
  IntradayAction,
  IntradayDecisionEcho,
  IntradayPositionView,
} from "@/lib/types/intraday/intradayDecision";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";

export interface IntradayTickArgs {
  session: PaperTradingSession;
  positions: PaperTradingPosition[];
  priceSnapshot: PaperTradingPriceSnapshot[];
  existingTicks: PaperTradingTick[];
  /** 틱 윈도 시작 ISO(UTC). nowHhmm(KST) 산출 기준. */
  tickWindowStart: string;
  abortSignal?: AbortSignal;
}

export interface IntradayTickResult {
  decision: import("@/lib/types/paperTrading/paperTrading").PaperTradingDecision;
  forcedExit: { targetPrice?: number | null; stopPrice?: number | null; flattenAll: boolean };
}

/** 전일 warmup 분봉 캐시(ticker|tf|당일) — 같은 날 틱들이 공유. */
const priorMinuteCache = new Map<string, StockMinuteCandle[]>();

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function nDaysAgoYyyymmdd(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/** ISO(UTC) → KST "HH:mm". */
export function kstHhmm(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** 분봉 페치 — 전일 warmup(캐시) + 당일분, 오름차순. */
async function getMinuteCandles(ticker: string, timeframe: number): Promise<StockMinuteCandle[]> {
  const cacheKey = `${ticker}|${timeframe}|${todayYmd()}`;
  let prior = priorMinuteCache.get(cacheKey);
  if (!prior) {
    prior = [];
    let filled = 0;
    const maxBack = PAPER_TRADING_INTRADAY_PRIOR_DAYS * 2 + 10;
    for (let back = 1; back <= maxBack && filled < PAPER_TRADING_INTRADAY_PRIOR_DAYS; back++) {
      const day = await fetchMinuteCandlesForDate(ticker, nDaysAgoYyyymmdd(back), timeframe);
      if (day.length > 0) {
        prior.push(...day);
        filled += 1;
      }
    }
    priorMinuteCache.set(cacheKey, prior);
  }
  const today = await fetchTodayMinuteCandles(ticker, timeframe, 400);
  const seen = new Set<string>();
  return [...prior, ...today]
    .filter((c) => (seen.has(c.date) ? false : (seen.add(c.date), true)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function ptActionToIntraday(action: string): IntradayAction {
  if (action === "BUY" || action === "INCREASE") return "BUY";
  if (action === "SELL" || action === "EXIT" || action === "REDUCE") return "SELL";
  return "HOLD";
}

function buildPreviousEcho(existingTicks: PaperTradingTick[]): IntradayDecisionEcho | null {
  const last = existingTicks.at(-1);
  if (!last) return null;
  const d = last.decision;
  return {
    action: ptActionToIntraday(d.action),
    targetPrice: d.targetPrice ?? null,
    stopPrice: d.invalidationPrice ?? null,
    invalidationPrice: d.invalidationPrice ?? null,
    rationale: d.rationale,
  };
}

function resolveSessionAiProvider(session: PaperTradingSession): AIAnalysisProvider {
  if (session.aiProvider) return session.aiProvider;
  const providers = detectProviders();
  if (providers.codex) return "codex";
  return "claude";
}

/** 보유 경과분 추정 — 마지막 BUY 체결 틱 이후 경과(틱수 × 주기). */
function estimateHeldMinutes(
  existingTicks: PaperTradingTick[],
  ticker: string,
  intervalMinutes: number,
): number {
  let lastBuyIdx = -1;
  for (let i = existingTicks.length - 1; i >= 0; i--) {
    if (existingTicks[i].orders.some((o) => o.ticker === ticker && o.side === "BUY")) {
      lastBuyIdx = i;
      break;
    }
  }
  if (lastBuyIdx < 0) return 0;
  return (existingTicks.length - lastBuyIdx) * intervalMinutes;
}

function buildPositionView(
  positions: PaperTradingPosition[],
  ticker: string,
  heldMinutes: number,
): IntradayPositionView | null {
  const p = positions.find((x) => x.ticker === ticker && x.quantity >= 1);
  if (!p) return null;
  return {
    avgEntryPrice: p.avgEntryPrice,
    quantity: p.quantity,
    unrealizedPnlPct: p.unrealizedPnlPct,
    heldMinutes,
    allocationPct: p.allocationPct,
  };
}

export async function resolveIntradayTickDecision(
  args: IntradayTickArgs,
): Promise<IntradayTickResult> {
  const { session } = args;
  const stock = session.stocks[0] ?? { ticker: session.tickers[0] ?? "", name: session.tickers[0] ?? "" };
  // 분봉 단위는 세션 판단 주기에서 파생(주기마다 최소 1봉 마감) — env 는 실험용 오버라이드.
  const timeframe = deriveIntradayTimeframe(session.tickIntervalMinutes);
  const nowHhmm = kstHhmm(args.tickWindowStart);
  const flattenAll = nowHhmm >= PAPER_TRADING_CLOSE_FLATTEN_HHMM;
  const dailyLossKill = session.returnPct <= PAPER_TRADING_DAILY_LOSS_KILL_PCT;

  const snapshotPrice = args.priceSnapshot.find((p) => p.ticker === stock.ticker)?.price ?? 0;
  const heldMinutes = estimateHeldMinutes(args.existingTicks, stock.ticker, session.tickIntervalMinutes);
  const position = buildPositionView(args.positions, stock.ticker, heldMinutes);
  const previousDecision = buildPreviousEcho(args.existingTicks);

  // KIS 미설정 → 데이터 없음. 폴백(빈 분봉 → 결정론 HOLD).
  let minuteCandles: StockMinuteCandle[] = [];
  let dailyRegime: -1 | 0 | 1 = 0;
  if (isKisConfigured()) {
    try {
      minuteCandles = await getMinuteCandles(stock.ticker, timeframe);
    } catch {
      minuteCandles = [];
    }
    try {
      const to = todayYmd();
      const from = nDaysAgoYyyymmdd(200);
      const daily = await fetchDailyChunked(stock.ticker, from, to);
      dailyRegime = dailyRegimeFromCandles(daily);
    } catch {
      dailyRegime = 0;
    }
  }

  const price = snapshotPrice > 0 ? snapshotPrice : (minuteCandles.at(-1)?.close ?? 0);

  const { decision, intraday } = await decideIntradayWithCli({
    ticker: stock.ticker,
    name: stock.name,
    minuteCandles,
    timeframe,
    tickIntervalMinutes: session.tickIntervalMinutes,
    dailyRegime,
    price,
    nowHhmm,
    position,
    previousDecision,
    dailyLossKill,
    riskMode: session.riskMode,
    maxPositionPct: session.maxPositionPct,
    provider: resolveSessionAiProvider(session),
    abortSignal: args.abortSignal ?? new AbortController().signal,
  });

  return {
    decision,
    forcedExit: {
      targetPrice: intraday.targetPrice,
      stopPrice: intraday.stopPrice ?? intraday.invalidationPrice,
      flattenAll,
    },
  };
}
