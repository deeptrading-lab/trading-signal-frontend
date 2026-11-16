import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { isoToKstDate } from "@/lib/api/toss/kst";
import type { ProgramTradingAction, TradingState } from "@/lib/types/programTrading/programTrading";
import { emptyCandidateSnapshot, hasCandidates } from "@/lib/validation/programTrading/candidateGate";
import { createCandidateRefresh } from "./candidateRefresh";
import { command, initialState, paperStopDeadline, settleExpiredPaperStop } from "./engine";
import { logPaperMarket, withinMarketBudget } from "./marketBudget";
import { openJournal } from "./journal";
import { savePaperResult } from "./reviewHistory";
import { loadRecommendationCandidates } from "./recommendationCandidates";
import { paperArchiveDirectory as archiveDirectory, paperSessionDirectory as directory, trimPaperReviews } from "./sessionStorage";
import { minuteInKorea, requireTossPaperConfig, stepTossPaper, tossPaperSession } from "./tossPaper";

const checkingSession = "토스 시세와 장 운영 시간을 확인하고 있어요.";
const registry = globalThis as typeof globalThis & {
  localTossPaperRuntime?: ReturnType<typeof createRuntime>;
};

export function getLocalPaperRuntime() {
  // Route bundles and development reloads share one queue and timer in the Next process.
  return registry.localTossPaperRuntime ??= createRuntime().catch(error => {
    delete registry.localTossPaperRuntime;
    throw error;
  });
}

async function createRuntime() {
  requireTossPaperConfig();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  let state: TradingState = { ...initialState(), executionMode: "toss-paper" };
  try {
    const saved: TradingState = JSON.parse(await readFile(`${directory}/state.json`, "utf8"));
    if (saved.version !== 1 || saved.executionMode !== "toss-paper") throw new Error("invalid state");
    state = { ...saved, running: false, quotes: [], candidates: emptyCandidateSnapshot() };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  let journal: Awaited<ReturnType<typeof openJournal>> | undefined = await openJournal(directory);
  journal.reconcile(state);
  state.startBlockReason = checkingSession;

  let queue = Promise.resolve();
  let commandVersion = 0;
  let revision = 0;
  let requiresRestart = false;
  let stopTimer: ReturnType<typeof setTimeout> | undefined;

  function settleStop() {
    const now = Date.now();
    if (!settleExpiredPaperStop(state, minuteInKorea(now), now)) return false;
    revision++;
    return true;
  }

  function scheduleStop() {
    clearTimeout(stopTimer);
    const deadline = paperStopDeadline(state.lifecycle);
    if (state.lifecycle?.status !== "stopping" || !Number.isFinite(deadline)) return;
    stopTimer = setTimeout(() => {
      void serial(async () => {
        if (settleStop()) await persist();
        else scheduleStop();
      }).catch(() => undefined);
    }, Math.max(0, deadline - Date.now())).unref();
  }
  function serial<T>(fn: () => Promise<T>) {
    const next = queue.then(fn);
    queue = next.then(() => undefined, () => {
      revision++;
      state.running = false;
      state.lastError = "모의투자 상태를 저장하지 못했어요. 로컬 원장을 확인해 주세요.";
    });
    return next;
  }

  let lastSyncedSession: string | null = null;
  async function persist() {
    if (!journal) {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      journal = await openJournal(directory);
    }
    await journal.record(state);
    await writeFile(`${directory}/state.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
    await rename(`${directory}/state.tmp`, `${directory}/state.json`);
    const report = await journal.report(state);
    if (report && process.env.PROGRAM_PAPER_RESULT_SYNC === "1" && lastSyncedSession !== report.lifecycle.startedAt) {
      const session = report.lifecycle.startedAt;
      lastSyncedSession = session;
      void savePaperResult(report).catch(error => {
        if (lastSyncedSession === session) lastSyncedSession = null;
        logPaperMarket("result-sync-failed", { reason: error instanceof Error ? error.message : undefined });
      });
    }
    if (state.lifecycle?.status === "completed") await trimPaperReviews(true);
  }

  async function openNewSession() {
    if (state.lifecycle?.status !== "completed" || state.positions.length) {
      return { error: "보유 종목의 청산과 거래 종료를 확인한 뒤 새 세션을 열어 주세요." };
    }

    await persist();
    await mkdir(archiveDirectory, { recursive: true, mode: 0o700 });
    const archiveName = `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}`;
    // Move the entire session at once. If the process stops after the move, startup sees a fresh session.
    await rename(directory, `${archiveDirectory}/${archiveName}`);
    state = {
      ...initialState(),
      executionMode: "toss-paper",
      candidates: state.candidates,
      startBlockReason: checkingSession,
    };
    journal = undefined;
    return { state: structuredClone(state) };
  }

  let lastCalendar: Awaited<ReturnType<typeof tossPaperSession>> | undefined;
  async function readCalendar() {
    const session = await tossPaperSession(lastCalendar);
    if (Number.isFinite(session.start) && Number.isFinite(session.end)) lastCalendar = session;
    else if (session.holiday) lastCalendar = undefined;
    return session;
  }

  function updateSession(state: TradingState, session: Awaited<ReturnType<typeof tossPaperSession>>) {
    state.minute = session.minute;
    const priorDay = state.lifecycle && isoToKstDate(state.lifecycle.startedAt ?? undefined) !== session.date;
    if (priorDay) state.startBlockReason = "이전 운용을 종료한 뒤 새 모의 세션을 시작해 주세요.";
    else if (session.canStart) delete state.startBlockReason;
    else if (session.holiday) state.startBlockReason = "오늘은 국내 주식시장 휴장일이에요.";
    else if (Number.isFinite(session.start)) state.startBlockReason = "국내 거래일 09:10~15:00 사이에 시작할 수 있어요.";
    else state.startBlockReason = "토스 장 운영 시간을 확인하지 못했어요.";
    return session;
  }

  let lastCandidateAttempt = 0;
  const refreshCandidates = createCandidateRefresh(() => {
    lastCandidateAttempt = Date.now();
    return loadRecommendationCandidates();
  }, snapshot => serial(async () => {
    state.candidates = snapshot;
    revision++;
    if (!hasCandidates(snapshot)) logPaperMarket("candidates-unavailable", { status: snapshot.status });
  }));

  let tickPending = false;
  let lastHeartbeat = Date.now();
  function tick() {
    const now = Date.now();
    if (now - lastHeartbeat > 15_000) logPaperMarket("heartbeat-gap", { gapMs: now - lastHeartbeat });
    lastHeartbeat = now;
    if (tickPending) return;
    tickPending = true;
    const observedRevision = revision;
    const observedCommand = commandVersion;
    const draft = structuredClone(state);
    // No remote request holds the command queue. A newer command or candidate
    // refresh invalidates the draft, including any late virtual fills.
    void (async () => {
      const session = await readCalendar();
      updateSession(draft, session);
      const changed = await stepTossPaper(draft, session);
      await serial(async () => {
        if (revision !== observedRevision || commandVersion !== observedCommand) return;
        state = draft;
        scheduleStop();
        if (changed) await persist();
      });
    })().catch(() => logPaperMarket("tick-failed")).finally(() => { tickPending = false; });
  }

  if (settleStop() || (state.lifecycle?.status === "completed" && process.env.PROGRAM_PAPER_RESULT_SYNC === "1")) await persist();
  scheduleStop();
  tick();
  setInterval(() => { void refreshCandidates().catch(() => undefined); }, 60_000).unref();
  setInterval(tick, 5_000).unref();

  return {
    async snapshot() {
      // Await the first lookup in the request that opens the screen. Retry a failed
      // lookup while the screen is open instead of waiting for the next full refresh.
      if (!hasCandidates(state.candidates) && Date.now() - lastCandidateAttempt >= 15_000) {
        await withinMarketBudget(refreshCandidates().catch(() => undefined), undefined, 2_000);
      }
      return structuredClone(state);
    },
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
      const version = ++commandVersion;
      const startChecks = action === "start"
        ? await Promise.all([readCalendar(), withinMarketBudget(refreshCandidates(), undefined, 3_000)])
        : undefined;

      return serial(async () => {
        revision++;
        if (action === "new-session") return openNewSession();
        if (startChecks) {
          if (requiresRestart) return { error: "반영한 개선을 사용하려면 로컬 개발 서버를 다시 시작해 주세요." };
          if (version !== commandVersion) return { error: "더 최근 운용 명령이 있어 시작을 취소했어요." };
          updateSession(state, startChecks[0]);
          if (state.lastError) return { error: state.lastError };
          if (state.lifecycle?.status === "completed" || state.lifecycle?.status === "stopping") {
            return { error: "종료했거나 종료 중인 세션은 시작할 수 없어요." };
          }
          if (state.killed) return { error: "손실 제한에 도달해 이 세션을 다시 시작할 수 없어요." };
          if (state.startBlockReason) return { error: state.startBlockReason };
          if (!hasCandidates(state.candidates)) return { error: "AI 단타의 실제 추천 종목을 조회하지 못했어요." };
        }
        if (action === "flatten") {
          state.quotes = [];
          state.minute = minuteInKorea(Date.now());
        }
        command(state, action);
        settleStop();
        scheduleStop();
        await persist();
        return { state: structuredClone(state) };
      });
    },
    download: (kind: "logs" | "review") => readFile(`${directory}/${kind === "logs" ? "trades.jsonl" : "review.json"}`, "utf8"),
  };
}
