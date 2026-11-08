import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { isoToKstDate } from "@/lib/api/toss/kst";
import type { Command, TradingState } from "@/lib/types/programTrading/programTrading";
import { emptyCandidateSnapshot, hasCandidates } from "@/lib/validation/programTrading/candidateGate";
import { createCandidateRefresh } from "./candidateRefresh";
import { command, initialState } from "./engine";
import { openJournal } from "./journal";
import { loadRecommendationCandidates } from "./recommendationCandidates";
import { requireTossPaperConfig, stepTossPaper, tossPaperSession } from "./tossPaper";

const directory = ".local/program-trading/toss-paper";
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

  const journal = await openJournal(directory);
  journal.reconcile(state);
  state.startBlockReason = "토스 시세와 장 운영 시간을 확인하고 있어요.";

  let queue = Promise.resolve();
  let commandVersion = 0;
  function serial<T>(fn: () => Promise<T>) {
    const next = queue.then(fn);
    queue = next.then(() => undefined, () => {
      state.running = false;
      state.lastError = "모의투자 상태를 저장하지 못했어요. 로컬 원장을 확인해 주세요.";
    });
    return next;
  }

  async function persist() {
    await journal.record(state);
    await writeFile(`${directory}/state.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
    await rename(`${directory}/state.tmp`, `${directory}/state.json`);
    await journal.report(state);
  }

  async function updateSession() {
    const session = await tossPaperSession();
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
    if (!hasCandidates(snapshot)) state.running = false;
  }));

  let tickPending = false;
  function tick() {
    if (tickPending) return;
    tickPending = true;
    void serial(async () => {
      if (!hasCandidates(state.candidates)) state.running = false;
      if (await stepTossPaper(state, await updateSession())) await persist();
    }).catch(() => undefined).finally(() => { tickPending = false; });
  }

  tick();
  setInterval(() => { void refreshCandidates().catch(() => undefined); }, 60_000).unref();
  setInterval(tick, 5_000).unref();

  return {
    async snapshot() {
      // Await the first lookup in the request that opens the screen. Retry a failed
      // lookup while the screen is open instead of waiting for the next full refresh.
      if (!hasCandidates(state.candidates) && Date.now() - lastCandidateAttempt >= 15_000) {
        await refreshCandidates();
      }
      return structuredClone(state);
    },
    async run(action: Command) {
      const version = ++commandVersion;
      if (action === "start") await refreshCandidates();
      else state.running = false;

      return serial(async () => {
        if (action === "start") {
          await updateSession();
          if (version !== commandVersion) return { error: "더 최근 운용 명령이 있어 시작을 취소했어요." };
          if (state.lastError) return { error: state.lastError };
          if (state.lifecycle?.status === "completed" || state.lifecycle?.status === "stopping") {
            return { error: "종료했거나 종료 중인 세션은 시작할 수 없어요." };
          }
          if (state.killed) return { error: "손실 제한에 도달해 이 세션을 다시 시작할 수 없어요." };
          if (state.startBlockReason) return { error: state.startBlockReason };
          if (!hasCandidates(state.candidates)) return { error: "AI 단타의 실제 추천 종목을 조회하지 못했어요." };
        }
        if (action === "flatten") state.quotes = [];
        command(state, action);
        await persist();
        return { state: structuredClone(state) };
      });
    },
    download: (kind: "logs" | "review") => readFile(`${directory}/${kind === "logs" ? "trades.jsonl" : "review.json"}`, "utf8"),
  };
}
