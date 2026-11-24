import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { withTimeout } from "@/lib/server/bffUtils";
import { isoToKstDate } from "@/lib/api/toss/kst";
import { nextPaperMarketRequestAt, PAPER_MARKET_INTERVAL_MS } from "@/lib/api/toss/paperMarketLimit";
import { PROGRAM_PAPER_COPY as P } from "@/lib/copy/programTrading/programTrading";
import type { ProgramTradingAction, TradingState } from "@/lib/types/programTrading/programTrading";
import { buyCandidates, closeSession, initialState, observePrices, RULES_VERSION, startSession } from "./engine";
import { logPaperMarket } from "./marketBudget";
import { openJournal } from "./journal";
import { savePaperResult } from "./reviewHistory";
import { paperArchiveDirectory as archiveDirectory, paperSessionDirectory as directory, trimPaperReviews } from "./sessionStorage";
import { emptyPaperCandidates, fetchPaperCandidates, fetchPaperPrices, paperSession, requireTossPaperConfig } from "./tossPaper";

const MARKET_TIMEOUT_MS = 5_000;

const registry = globalThis as typeof globalThis & {
  localTossPaperRuntime?: ReturnType<typeof createRuntime>;
};

export function getLocalPaperRuntime() {
  return registry.localTossPaperRuntime ??= createRuntime().catch(error => {
    delete registry.localTossPaperRuntime;
    throw error;
  });
}

async function createRuntime() {
  requireTossPaperConfig();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  let state = initialState();
  try {
    const saved: TradingState = JSON.parse(await readFile(`${directory}/state.json`, "utf8"));
    if (saved.version !== 1 || saved.executionMode !== "toss-paper") throw new Error("invalid state");
    state = { ...saved, running: false };
    if (!state.lifecycle) state = initialState();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  let journal: Awaited<ReturnType<typeof openJournal>> | undefined = await openJournal(directory);
  journal.reconcile(state);
  if (state.lifecycle) await journal.record(state);

  let queue = Promise.resolve();
  let pending: AbortController | undefined;
  let closing: Promise<void> | undefined;
  let requiresRestart = false;
  let lastSyncedSession: string | null = null;

  function serial<T>(fn: () => T | Promise<T>) {
    const next = queue.then(fn);
    queue = next.then(() => undefined, () => {
      pending?.abort();
      state.running = false;
      state.lastError = P.storageError;
    });
    return next;
  }

  async function persist() {
    if (!journal) {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      journal = await openJournal(directory);
    }
    // The snapshot contains the full ledger and can replay any journal writes interrupted by a restart.
    await writeFile(`${directory}/state.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
    await rename(`${directory}/state.tmp`, `${directory}/state.json`);
    await journal.record(state);
    if (state.lifecycle?.status !== "completed") return;
    const report = await journal.report(state);
    if (report && process.env.PROGRAM_PAPER_RESULT_SYNC === "1" && lastSyncedSession !== report.lifecycle.startedAt) {
      const session = report.lifecycle.startedAt;
      lastSyncedSession = session;
      void savePaperResult(report).catch(error => {
        if (lastSyncedSession === session) lastSyncedSession = null;
        logPaperMarket("result-sync-failed", { reason: error instanceof Error ? error.message : undefined });
      });
    }
    await trimPaperReviews(true);
  }

  function snapshot(now = Date.now()) {
    const session = paperSession(now);
    let startBlockReason: string | undefined;
    if (requiresRestart) startBlockReason = P.restartRequired;
    else if (state.lifecycle && state.policyVersion !== RULES_VERSION) startBlockReason = P.legacySession;
    else if (session.weekend) startBlockReason = P.weekend;
    else if (now < session.openAt || now >= session.closeAt) startBlockReason = P.outsideHours;
    return structuredClone({ ...state, minute: session.minute, startBlockReason });
  }

  function markTime(now: number) {
    state.minute = paperSession(now).minute;
    state.updatedAt = new Date(now).toISOString();
    state.lastStepAt = now;
  }

  function priorDate(now: number) {
    return state.lifecycle && isoToKstDate(state.lifecycle.startedAt ?? undefined) !== paperSession(now).date;
  }

  async function readMarket<T>(request: AbortController, promise: Promise<T>, fallback: () => T, budget = MARKET_TIMEOUT_MS) {
    try {
      return await withTimeout(promise, budget);
    } catch {
      return fallback();
    } finally {
      request.abort();
    }
  }

  async function beginClose(cause: "manual" | "close", now: number, allowLookup: boolean) {
    if (!state.lifecycle || state.lifecycle.status === "completed" || closing || state.lastError) return;
    pending?.abort();
    pending = undefined;
    state.running = false;
    state.lifecycle.status = "stopping";
    state.lifecycle.stopCause ??= cause;
    state.lifecycle.stopRequestedAt ??= new Date(now).toISOString();
    markTime(now);
    await persist();

    const tickers = state.positions.map(position => position.ticker);
    const request = new AbortController();
    const result = allowLookup && tickers.length && Date.now() >= nextPaperMarketRequestAt()
      ? readMarket(request, fetchPaperPrices(tickers, request.signal), () => new Map())
      : Promise.resolve(new Map());
    closing = result.then(prices => serial(async () => {
      const at = Date.now();
      markTime(at);
      closeSession(state, prices, cause, at);
      await persist();
    })).catch(() => undefined).finally(() => { closing = undefined; });
  }

  function tick() {
    void serial(async () => {
      const now = Date.now();
      const session = paperSession(now);
      if (!state.lifecycle || state.lifecycle.status === "completed" || closing || state.lastError) return;
      const expiredDate = priorDate(now);
      if (state.lifecycle.status === "stopping" || expiredDate || now >= session.closeAt) {
        const cause = state.lifecycle.stopCause === "manual" ? "manual" : "close";
        await beginClose(cause, now, state.lifecycle.status !== "stopping" && !expiredDate && !session.weekend
          && now < session.closeAt + MARKET_TIMEOUT_MS && state.policyVersion === RULES_VERSION);
        return;
      }
      if (!state.running || pending || now < session.scanAt || state.policyVersion !== RULES_VERSION) return;

      const tickers = state.positions.map(position => position.ticker);
      const dueAt = tickers.length ? state.nextPriceAt ?? now : Math.max(state.nextCandidateAt ?? now, nextPaperMarketRequestAt());
      if (now < dueAt) return;
      // Leave the final slot available for the 15:00 liquidation request.
      if (tickers.length && now >= session.closeAt - PAPER_MARKET_INTERVAL_MS) return;
      const request = new AbortController();
      const budget = Math.min(MARKET_TIMEOUT_MS, session.closeAt - now);
      pending = request;
      const response = tickers.length
        ? readMarket(request, fetchPaperPrices(tickers, request.signal), () => new Map(), budget).then(prices => ({ prices }))
        : readMarket(request, fetchPaperCandidates(request.signal), emptyPaperCandidates, budget).then(candidates => ({ candidates }));

      void response.then(result => serial(async () => {
        if (pending !== request) return;
        pending = undefined;
        const at = Date.now();
        if (!state.running || at >= session.closeAt || priorDate(at)) return;
        markTime(at);
        if ("prices" in result) observePrices(state, result.prices, at);
        else buyCandidates(state, result.candidates, at);
        await persist();
      })).catch(() => undefined);
    }).catch(() => undefined);
  }

  if (state.lifecycle?.status === "completed") {
    // Recover a completed snapshot if the process exited before the review was written.
    try {
      await readFile(`${directory}/review.json`, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await journal.report(state);
    }
  }
  setInterval(tick, 1_000).unref();
  tick();

  return {
    async snapshot() { return snapshot(); },
    async withIdleForImprovement(apply?: () => Promise<void>) {
      const result = await serial(async () => {
        if (state.running || state.positions.length || state.lifecycle?.status === "running" || state.lifecycle?.status === "stopping") return { idle: false };
        try {
          if (apply) {
            await apply();
            requiresRestart = true;
          }
          return { idle: true };
        } catch (error) {
          return { idle: true, error };
        }
      });
      if ("error" in result) throw result.error;
      return result.idle;
    },
    async run(action: ProgramTradingAction) {
      const result = await serial(async () => {
        const now = Date.now();
        const session = paperSession(now);
        if (state.lastError) return { error: state.lastError };
        if (action === "new-session") {
          if (state.lifecycle?.status !== "completed" || state.positions.length) return { error: P.finishBeforeNew };
          await mkdir(archiveDirectory, { recursive: true, mode: 0o700 });
          const archiveName = `${new Date(now).toISOString().replaceAll(":", "-")}-${randomUUID()}`;
          await rename(directory, `${archiveDirectory}/${archiveName}`);
          state = initialState(now);
          journal = undefined;
        } else if (action === "start") {
          const reason = snapshot(now).startBlockReason;
          if (reason) return { error: reason };
          if (state.lifecycle && (state.lifecycle.status !== "running" || priorDate(now))) return { error: P.finishBeforeNew };
          startSession(state, session.scanAt, now);
          markTime(now);
          await persist();
        } else if (action === "pause" && state.lifecycle?.status === "running") {
          pending?.abort();
          pending = undefined;
          state.running = false;
          markTime(now);
          await persist();
        } else if (action === "flatten") {
          await beginClose("manual", now, !priorDate(now) && now < session.closeAt && state.policyVersion === RULES_VERSION);
        }
        return { state: snapshot(now) };
      });
      if (action === "start" && !result.error) tick();
      return result;
    },
    download: (kind: "logs" | "review") => readFile(`${directory}/${kind === "logs" ? "trades.jsonl" : "review.json"}`, "utf8"),
  };
}
