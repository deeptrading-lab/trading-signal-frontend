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
import { scheduleSessionTickLabeling } from "@/lib/server/intraday/tickLabels";
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
  /**
   * 세션 단위 틱 직렬화 체인(미영속) — 창 dedup 이 check-then-act(검사→LLM 수십 초→append)라
   * 동시 호출(탭 폴링·crontab·수동)이 같은 창을 중복 실행하던 레이스를 막는다(리뷰 #2).
   * 뒤 호출은 앞 틱 완료 후 실행되므로 dedup 검사가 항상 최신 ticks 를 본다.
   */
  tickChain?: Promise<unknown>;
};

type PaperTradingStore = {
  sessions: Map<string, StoredSession>;
  /** hydrate 성공(ok|disabled) 여부 — 실패는 미설정으로 남겨 다음 접근에서 재시도(리뷰 #4). */
  hydrated?: boolean;
  /** 진행 중 hydrate(single-flight). 완료 후 해제. */
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
 * Supabase 저장본을 메모리로 복원(성공 시 1회) — dev 재시작 후에도 세션·틱 이력이 이어진다.
 * 메모리에 이미 있는 id 는 건드리지 않는다(메모리가 더 최신).
 * - 미설정(disabled)·성공(ok) → hydrated 확정(재시도 불필요).
 * - 실패(error) → hydrated 미설정으로 남겨 **다음 접근에서 재시도**(첫 시도 일시 장애가
 *   프로세스 수명 동안 복원을 막던 문제 — 리뷰 #4). 개별 fetch 는 4초 타임아웃.
 */
async function ensureHydrated(): Promise<void> {
  const store = getStore();
  if (store.hydrated) return;
  if (!store.hydration) {
    store.hydration = (async () => {
      const loaded = await loadPersistedPaperTrading();
      if (loaded.status === "error") return; // hydrated 미설정 → 재시도 여지.
      if (loaded.status === "ok") {
        for (const entry of loaded.sessions) {
          if (!store.sessions.has(entry.session.id)) {
            store.sessions.set(entry.session.id, {
              session: entry.session,
              positions: entry.positions,
              ticks: entry.ticks,
            });
          }
        }
      }
      store.hydrated = true;
    })()
      .catch(() => undefined)
      .finally(() => {
        store.hydration = undefined;
      });
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
  // 요청 provider 를 존중(화이트리스트). cli-agent 는 단타 주기로 — 세션별 요청값(표 드랍다운) 우선,
  // 미지정 시 env 기본(INTRADAY_TICK_INTERVAL_MINUTES, 기본 5). mock 은 30분 유지.
  const decisionProvider =
    request.decisionProvider === "cli-agent" || request.decisionProvider === "existing-ai"
      ? request.decisionProvider
      : "mock";

  // 생성 멱등 가드(리뷰 #6) — 생성 응답은 첫 틱(CLI 콜) 완료 후라 클라 타임아웃 재클릭이
  // 가능하다. 같은 종목의 running 단타 세션이 이미 있으면 새로 만들지 않고 그 세션을 돌려준다.
  if (decisionProvider === "cli-agent") {
    const ticker = stocks[0]?.ticker;
    const existing = Array.from(getStore().sessions.values()).find(
      (entry) =>
        entry.session.decisionProvider === "cli-agent" &&
        entry.session.status === "running" &&
        (entry.session.stocks[0]?.ticker ?? entry.session.tickers[0]) === ticker,
    );
    if (existing) return toDetail(existing);
  }

  const tickIntervalMinutes =
    decisionProvider === "cli-agent"
      ? (request.tickIntervalMinutes ?? PAPER_TRADING_INTRADAY_TICK_INTERVAL_MINUTES)
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
    aiProvider: decisionProvider === "cli-agent" ? request.aiProvider : undefined,
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

/**
 * 세션 부분 수정 — 상태 전환 및/또는 판단 주기 변경. 주기는 세션 중에도 바꿀 수 있고, 다음 틱 창
 * 계산이 `session.tickIntervalMinutes` 를 매번 읽으므로 **다음 틱부터 자동 반영**된다(스케줄러 무변경).
 */
export async function patchPaperTradingSession(
  sessionId: string,
  patch: {
    status?: Extract<PaperTradingSessionStatus, "running" | "paused" | "completed">;
    tickIntervalMinutes?: number;
  },
): Promise<PaperTradingSessionDetail | null> {
  await ensureHydrated();
  const entry = getStore().sessions.get(sessionId);
  if (!entry) return null;

  const wasCompleted = entry.session.status === "completed";
  const now = new Date().toISOString();
  entry.session = {
    ...entry.session,
    ...(patch.status !== undefined
      ? {
          status: patch.status,
          endedAt: patch.status === "completed" ? now : entry.session.endedAt,
        }
      : {}),
    ...(patch.tickIntervalMinutes !== undefined
      ? { tickIntervalMinutes: patch.tickIntervalMinutes }
      : {}),
    updatedAt: now,
  };
  void persistPaperSession(entry.session, entry.positions);
  // 틱 자가채점(intraday-decision-overhaul PR-2) — 완료 **전이** 시 그날 분봉으로 라벨링.
  // 마감 스윕(tickScheduler)·수동 PATCH 모두 이 함수를 지나므로 여기 한 곳이 완료 훅의 choke point.
  // fire-and-forget + 내부 never-throw — 모의투자 흐름을 절대 막지 않는다(관측 전용).
  if (status === "completed" && !wasCompleted) {
    scheduleSessionTickLabeling(entry.session, [...entry.ticks]);
  }
  return toDetail(entry);
}

/** 상태만 전환(스케줄러 자동 완료 등 기존 호출부 호환 래퍼). */
export async function patchPaperTradingSessionStatus(
  sessionId: string,
  status: Extract<PaperTradingSessionStatus, "running" | "paused" | "completed">,
): Promise<PaperTradingSessionDetail | null> {
  return patchPaperTradingSession(sessionId, { status });
}

export async function runPaperTradingSessionTick(
  sessionId: string,
  options: {
    triggeredBy?: PaperTradingTriggeredBy;
    tickWindowStart?: string;
    priceSnapshotProvider?: PaperTradingPriceSnapshotProvider;
    /** 취소 신호 — 스케줄러 틱 타임아웃 시 abort → CLI 중단(폴백)으로 hang 회피·tickChain 자가복구. */
    abortSignal?: AbortSignal;
  },
): Promise<PaperTradingSessionDetail | null> {
  await ensureHydrated();
  const entry = getStore().sessions.get(sessionId);
  if (!entry) return null;

  // 세션 단위 직렬화 — 앞 틱이 끝난 뒤에야 다음 호출이 창을 판정한다(중복 창 실행 차단).
  const task = (entry.tickChain ?? Promise.resolve()).then(() => runTickOnce(entry, options));
  entry.tickChain = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

async function runTickOnce(
  entry: StoredSession,
  options: {
    triggeredBy?: PaperTradingTriggeredBy;
    tickWindowStart?: string;
    priceSnapshotProvider?: PaperTradingPriceSnapshotProvider;
    abortSignal?: AbortSignal;
  },
): Promise<PaperTradingSessionDetail> {
  if (entry.session.status !== "running") return toDetail(entry);

  // 창 판정은 자기 차례가 온 시점(직렬화 획득 후)에 한다 — 대기 중 창이 넘어갔으면 새 창으로.
  const tickWindowStart =
    options.tickWindowStart ?? resolveNextTickWindow(entry.session, new Date());

  const result = await runPaperTradingTick({
    session: entry.session,
    positions: entry.positions,
    existingTicks: entry.ticks,
    triggeredBy: options.triggeredBy ?? "user",
    tickWindowStart,
    priceSnapshotProvider: options.priceSnapshotProvider,
    abortSignal: options.abortSignal,
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
  // 테스트 격리 — hydration 상태도 초기화(테스트 env 는 Supabase 미설정이라 즉시 disabled).
  store.hydration = undefined;
  store.hydrated = undefined;
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
