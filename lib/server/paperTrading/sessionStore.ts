import { randomUUID } from "crypto";
import {
  PAPER_TRADING_DEFAULT_CASH_BUFFER_PCT,
  PAPER_TRADING_DEFAULT_INITIAL_CASH,
  PAPER_TRADING_DEFAULT_MAX_POSITION_PCT,
  PAPER_TRADING_DEFAULT_TICK_INTERVAL_MINUTES,
} from "@/lib/server/paperTrading/constants";
import { addTickWindow, floorToTickWindow } from "@/lib/server/paperTrading/time";
import { runPaperTradingTick } from "@/lib/server/paperTrading/runTick";
import type {
  CreatePaperTradingSessionRequest,
  PaperTradingEquityPoint,
  PaperTradingPosition,
  PaperTradingSelectedStock,
  PaperTradingSession,
  PaperTradingSessionDetail,
  PaperTradingSessionStatus,
  PaperTradingTick,
  PaperTradingTriggeredBy,
} from "@/lib/types/paperTrading/paperTrading";

type StoredSession = {
  session: PaperTradingSession;
  positions: PaperTradingPosition[];
  ticks: PaperTradingTick[];
};

type PaperTradingStore = {
  sessions: Map<string, StoredSession>;
};

const STORE_KEY = "__paperTradingStore";

type GlobalWithPaperTradingStore = typeof globalThis & {
  [STORE_KEY]?: PaperTradingStore;
};

function getStore(): PaperTradingStore {
  const globalStore = globalThis as GlobalWithPaperTradingStore;
  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = { sessions: new Map() };
  }
  return globalStore[STORE_KEY];
}

export function listPaperTradingSessions(): PaperTradingSession[] {
  return Array.from(getStore().sessions.values())
    .map((entry) => entry.session)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getPaperTradingSessionDetail(
  sessionId: string,
): PaperTradingSessionDetail | null {
  const entry = getStore().sessions.get(sessionId);
  if (!entry) return null;
  return toDetail(entry);
}

export function createPaperTradingSession(
  request: CreatePaperTradingSessionRequest,
): PaperTradingSessionDetail {
  const now = new Date().toISOString();
  const initialCash = sanitizePositiveNumber(
    request.initialCash,
    PAPER_TRADING_DEFAULT_INITIAL_CASH,
  );
  const targetReturnPct = sanitizePositiveNumber(request.targetReturnPct, 5);
  const stocks = normalizeStocks(request);
  const session: PaperTradingSession = {
    id: randomUUID(),
    name: request.name.trim() || "AI 모의투자",
    status: "running",
    tickers: stocks.map((stock) => stock.ticker),
    stocks,
    initialCash,
    targetReturnPct,
    cash: initialCash,
    portfolioValue: initialCash,
    returnPct: 0,
    riskMode: request.riskMode,
    maxPositionPct: PAPER_TRADING_DEFAULT_MAX_POSITION_PCT,
    cashBufferPct: PAPER_TRADING_DEFAULT_CASH_BUFFER_PCT,
    tickIntervalMinutes: PAPER_TRADING_DEFAULT_TICK_INTERVAL_MINUTES,
    decisionProvider: "mock",
    mode: "sandbox",
    lastTickWindowStart: null,
    startedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const entry: StoredSession = {
    session,
    positions: [],
    ticks: [],
  };

  const firstWindow = floorToTickWindow(new Date(now), session.tickIntervalMinutes);
  const firstTick = runPaperTradingTick({
    session: entry.session,
    positions: entry.positions,
    existingTicks: entry.ticks,
    triggeredBy: "user",
    tickWindowStart: firstWindow,
  });

  entry.session = firstTick.session;
  entry.positions = firstTick.positions;
  entry.ticks = [firstTick.tick];

  getStore().sessions.set(entry.session.id, entry);
  return toDetail(entry);
}

export function patchPaperTradingSessionStatus(
  sessionId: string,
  status: Extract<PaperTradingSessionStatus, "running" | "paused" | "completed">,
): PaperTradingSessionDetail | null {
  const entry = getStore().sessions.get(sessionId);
  if (!entry) return null;

  const now = new Date().toISOString();
  entry.session = {
    ...entry.session,
    status,
    endedAt: status === "completed" ? now : entry.session.endedAt,
    updatedAt: now,
  };
  return toDetail(entry);
}

export function runPaperTradingSessionTick(
  sessionId: string,
  options: {
    triggeredBy?: PaperTradingTriggeredBy;
    tickWindowStart?: string;
  },
): PaperTradingSessionDetail | null {
  const entry = getStore().sessions.get(sessionId);
  if (!entry) return null;
  if (entry.session.status !== "running") return toDetail(entry);

  const tickWindowStart =
    options.tickWindowStart ??
    (entry.session.lastTickWindowStart
      ? addTickWindow(entry.session.lastTickWindowStart, entry.session.tickIntervalMinutes)
      : floorToTickWindow(new Date(), entry.session.tickIntervalMinutes));

  const result = runPaperTradingTick({
    session: entry.session,
    positions: entry.positions,
    existingTicks: entry.ticks,
    triggeredBy: options.triggeredBy ?? "user",
    tickWindowStart,
  });

  const alreadyExists = entry.ticks.some((tick) => tick.id === result.tick.id);
  entry.session = result.session;
  entry.positions = result.positions;
  if (!alreadyExists) {
    entry.ticks = [...entry.ticks, result.tick];
  }

  return toDetail(entry);
}

export function resetPaperTradingStoreForTest(): void {
  getStore().sessions.clear();
}

function toDetail(entry: StoredSession): PaperTradingSessionDetail {
  const ticks = [...entry.ticks].sort((a, b) => a.tickIndex - b.tickIndex);
  return {
    session: entry.session,
    positions: entry.positions,
    ticks,
    equityCurve: toEquityCurve(entry.session.initialCash, ticks),
    latestDecision: ticks.at(-1)?.decision ?? null,
  };
}

function toEquityCurve(
  initialCash: number,
  ticks: PaperTradingTick[],
): PaperTradingEquityPoint[] {
  return [
    {
      tickIndex: -1,
      value: initialCash,
      returnPct: 0,
      at: ticks[0]?.tickWindowStart ?? new Date().toISOString(),
    },
    ...ticks.map((tick) => ({
      tickIndex: tick.tickIndex,
      value: tick.portfolioValueAfter,
      returnPct: tick.returnPctAfter,
      at: tick.tickWindowStart,
    })),
  ];
}

function normalizeStocks(request: CreatePaperTradingSessionRequest): PaperTradingSelectedStock[] {
  const source: PaperTradingSelectedStock[] =
    request.stocks && request.stocks.length > 0
      ? request.stocks
      : request.tickers.map((ticker) => ({ ticker, name: ticker }));
  const deduped = new Map<string, PaperTradingSelectedStock>();

  for (const stock of source) {
    const ticker = stock.ticker.trim().toUpperCase();
    if (!ticker) continue;
    deduped.set(ticker, {
      ticker,
      name: stock.name?.trim() || ticker,
      market: stock.market,
    });
  }

  if (deduped.size === 0) {
    deduped.set("005930", { ticker: "005930", name: "삼성전자", market: "KOSPI" });
  }

  return Array.from(deduped.values()).slice(0, 5);
}

function sanitizePositiveNumber(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.round(value * 100) / 100;
}
