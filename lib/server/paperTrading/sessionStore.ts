import { randomUUID } from "crypto";
import {
  PAPER_TRADING_DEFAULT_CASH_BUFFER_PCT,
  PAPER_TRADING_DEFAULT_INITIAL_CASH,
  PAPER_TRADING_DEFAULT_MAX_POSITION_PCT,
  PAPER_TRADING_DEFAULT_TICK_INTERVAL_MINUTES,
  PAPER_TRADING_INTRADAY_TICK_INTERVAL_MINUTES,
} from "@/lib/server/paperTrading/constants";
import { addTickWindow, floorToTickWindow } from "@/lib/server/paperTrading/time";
import {
  loadPersistedPaperTrading,
  persistPaperSession,
  persistPaperTick,
} from "@/lib/server/paperTrading/persistence";
import { runPaperTradingTick } from "@/lib/server/paperTrading/runTick";
import type { PaperTradingPriceSnapshotProvider } from "@/lib/server/paperTrading/marketData";
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
  /** Supabase 저장본 1회 hydrate(single-flight) — 프로세스 첫 접근에서 시작. */
  hydration?: Promise<void>;
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

/**
 * Supabase 저장본을 메모리로 1회 복원(멱등) — dev 재시작 후에도 세션·틱 이력이 이어진다.
 * 메모리에 이미 있는 id 는 건드리지 않는다(메모리가 더 최신). 미설정/실패는 조용히 skip.
 */
async function ensureHydrated(): Promise<void> {
  const store = getStore();
  if (!store.hydration) {
    store.hydration = (async () => {
      const persisted = await loadPersistedPaperTrading();
      if (!persisted) return;
      for (const entry of persisted) {
        if (!store.sessions.has(entry.session.id)) {
          store.sessions.set(entry.session.id, {
            session: entry.session,
            positions: entry.positions,
            ticks: entry.ticks,
          });
        }
      }
    })().catch(() => undefined);
  }
  return store.hydration;
}

export async function listPaperTradingSessions(): Promise<PaperTradingSession[]> {
  await ensureHydrated();
  return Array.from(getStore().sessions.values())
    .map((entry) => entry.session)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getPaperTradingSessionDetail(
  sessionId: string,
): Promise<PaperTradingSessionDetail | null> {
  await ensureHydrated();
  const entry = getStore().sessions.get(sessionId);
  if (!entry) return null;
  return toDetail(entry);
}

export async function createPaperTradingSession(
  request: CreatePaperTradingSessionRequest,
  options: { priceSnapshotProvider?: PaperTradingPriceSnapshotProvider } = {},
): Promise<PaperTradingSessionDetail> {
  await ensureHydrated();
  const now = new Date().toISOString();
  const initialCash = sanitizePositiveNumber(
    request.initialCash,
    PAPER_TRADING_DEFAULT_INITIAL_CASH,
  );
  const targetReturnPct = sanitizePositiveNumber(request.targetReturnPct, 5);
  const stocks = normalizeStocks(request);
  // 요청 provider 를 존중(화이트리스트). cli-agent 는 단타 주기(5분)로 — 30분이면 5분 cron 이 같은
  // 틱 윈도로 묶여 중복 제거되므로 단타 루프가 동작하지 않는다.
  const decisionProvider =
    request.decisionProvider === "cli-agent" || request.decisionProvider === "existing-ai"
      ? request.decisionProvider
      : "mock";
  const tickIntervalMinutes =
    decisionProvider === "cli-agent"
      ? PAPER_TRADING_INTRADAY_TICK_INTERVAL_MINUTES
      : PAPER_TRADING_DEFAULT_TICK_INTERVAL_MINUTES;
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
    tickIntervalMinutes,
    decisionProvider,
    mode: "live-paper",
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
  const firstTick = await runPaperTradingTick({
    session: entry.session,
    positions: entry.positions,
    existingTicks: entry.ticks,
    triggeredBy: "user",
    tickWindowStart: firstWindow,
    priceSnapshotProvider: options.priceSnapshotProvider,
  });

  entry.session = firstTick.session;
  entry.positions = firstTick.positions;
  entry.ticks = [firstTick.tick];

  getStore().sessions.set(entry.session.id, entry);
  // write-through(fail-soft) — 실패해도 세션 생성 흐름 비차단.
  void persistPaperSession(entry.session, entry.positions);
  void persistPaperTick(firstTick.tick);
  return toDetail(entry);
}

export async function patchPaperTradingSessionStatus(
  sessionId: string,
  status: Extract<PaperTradingSessionStatus, "running" | "paused" | "completed">,
): Promise<PaperTradingSessionDetail | null> {
  await ensureHydrated();
  const entry = getStore().sessions.get(sessionId);
  if (!entry) return null;

  const now = new Date().toISOString();
  entry.session = {
    ...entry.session,
    status,
    endedAt: status === "completed" ? now : entry.session.endedAt,
    updatedAt: now,
  };
  void persistPaperSession(entry.session, entry.positions);
  return toDetail(entry);
}

export async function runPaperTradingSessionTick(
  sessionId: string,
  options: {
    triggeredBy?: PaperTradingTriggeredBy;
    tickWindowStart?: string;
    priceSnapshotProvider?: PaperTradingPriceSnapshotProvider;
  },
): Promise<PaperTradingSessionDetail | null> {
  await ensureHydrated();
  const entry = getStore().sessions.get(sessionId);
  if (!entry) return null;
  if (entry.session.status !== "running") return toDetail(entry);

  const tickWindowStart =
    options.tickWindowStart ?? resolveNextTickWindow(entry.session, new Date());

  const result = await runPaperTradingTick({
    session: entry.session,
    positions: entry.positions,
    existingTicks: entry.ticks,
    triggeredBy: options.triggeredBy ?? "user",
    tickWindowStart,
    priceSnapshotProvider: options.priceSnapshotProvider,
  });

  const alreadyExists = entry.ticks.some((tick) => tick.id === result.tick.id);
  entry.session = result.session;
  entry.positions = result.positions;
  if (!alreadyExists) {
    entry.ticks = [...entry.ticks, result.tick];
    // write-through(fail-soft) — 새 틱이 실제로 생겼을 때만 저장(멱등 dedup 반환은 무기록).
    void persistPaperSession(entry.session, entry.positions);
    void persistPaperTick(result.tick);
  }

  return toDetail(entry);
}

export function resetPaperTradingStoreForTest(): void {
  const store = getStore();
  store.sessions.clear();
  // 테스트 격리 — hydration single-flight 도 초기화(테스트 env 는 Supabase 미설정이라 즉시 no-op).
  store.hydration = undefined;
}

/**
 * 다음 틱 윈도 산출 (tickWindowStart 미지정 시 폴백).
 * - 단타(cli-agent): **벽시계 현재 창으로 고정** — 브라우저 폴링·crontab 이 몇 번 오든 창당 1틱으로
 *   dedup 되고, 폴링이 끊겼다 재개돼도 라벨이 과거에 머무는 드리프트가 없다(15:00 게이트·15:20
 *   flatten 판정이 tickWindowStart 기준이라 정확한 벽시계가 필수).
 * - mock 등 기존 provider: 마지막 창 +interval (기존 동작 유지 — "지금 재판단" 버튼이 창과 무관하게
 *   항상 새 틱을 만드는 UX 를 보존).
 */
export function resolveNextTickWindow(session: PaperTradingSession, now: Date): string {
  if (session.decisionProvider === "cli-agent") {
    return floorToTickWindow(now, session.tickIntervalMinutes);
  }
  return session.lastTickWindowStart
    ? addTickWindow(session.lastTickWindowStart, session.tickIntervalMinutes)
    : floorToTickWindow(now, session.tickIntervalMinutes);
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
