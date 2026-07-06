/**
 * 단타 자동 틱 스케줄러 — dev 서버 in-process(instrumentation 기동). intraday-paper-watch.
 *
 * 워치 화면(브라우저 폴링)이 틱을 밀던 구조를 서버로 이관 — **화면을 벗어나거나 브라우저를
 * 꺼도 dev 서버가 켜져 있으면** running cli-agent 세션이 주기마다 자동 판단·가상 체결된다.
 * (시황 refreshScheduler 선례. crontab 스크립트·수동 틱과 겹쳐도 세션 직렬화+창 dedup 으로 무해.)
 *
 * - 60초 체크, 평일 장중+마감 유예(09:00~15:40)만 발화 — 15:20 전량 청산 창 보장.
 * - 세션 간 **병렬 처리**: 동시 `INTRADAY_TICK_CONCURRENCY`(기본 3, AI 종합분석 동시 3건과 동일
 *   폭의 별도 풀). 세션 내부(분석가→판단가)는 순차가 본질. CLI 는 호출마다 독립 프로세스라
 *   병렬 안전, 세션 상태는 tickChain 직렬화가 보호.
 * - Vercel 은 타이머 유지 불가 + CLI 부재 → no-op. dev HMR 중복 기동은 globalThis 가드.
 */

import { isVercelEnv } from "@/lib/server/env";
import { createLogger } from "@/lib/server/logTag";
import { isKstAfterMarketClose, isKstMarketHoursWithCloseGrace } from "@/lib/utils/kstMarketHours";
import {
  listPaperTradingSessions,
  patchPaperTradingSessionStatus,
  runPaperTradingSessionTick,
} from "@/lib/server/paperTrading/sessionStore";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

const log = createLogger("intraday-tick");

const POLL_MS = 60_000;

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

/** 세션 간 동시 판단 수 — CLI 부하와 KIS/토스 레이트리밋을 감안한 기본 3(1~5). */
const TICK_CONCURRENCY = envInt("INTRADAY_TICK_CONCURRENCY", 3, 1, 5);

/**
 * 개별 틱 상한(ms) — 초과하면 이 사이클에서 그 세션을 포기(다음 사이클 재시도)한다.
 *
 * ★ 프리즈 버그 방지: 틱의 CLI 분석 호출엔 자체 타임아웃이 없어(abortSignal 미발화), 한 틱이 무한
 *   대기하면 `runWithLimit` 이 끝나지 않아 `cycleRunning` 을 되돌리는 finally 가 실행되지 못하고
 *   → 이후 모든 사이클이 즉시 return -1 → **스케줄러 전체 정지**(사용자 지적: 실행중인데 판단이
 *   특정 시각에서 멈춤). Promise.race 타임아웃으로 매 틱을 유한하게 만들어 사이클이 항상 완료되게 한다.
 *   기본 120초(30초~10분) — 정상 단타 틱(LLM 분석)보다 넉넉하고, hang 은 확실히 끊는다.
 */
const TICK_TIMEOUT_MS = envInt("INTRADAY_TICK_TIMEOUT_MS", 120_000, 30_000, 600_000);

/** abort 후 CLI 가 중단·폴백까지 도달할 유예(ms) — 이 안에 틱이 settle 하면 tickChain 자가복구된다. */
const ABORT_SETTLE_GRACE_MS = 15_000;

/**
 * 틱을 상한 시간으로 보호 — 2단 방어:
 * ① `TICK_TIMEOUT_MS` 에 **abort** → 틱의 CLI 호출(abortSignal 존중, intradayCli try/catch 폴백)이
 *    중단되고 결정론 폴백으로 틱이 **settle** → 해당 세션의 `tickChain` 이 풀려 **자가 복구**(다음
 *    사이클 정상 틱). hang 한 CLI 프로세스도 실제로 종료된다.
 * ② abort 로도 settle 되지 않는 hang(취소 미존중 경로)엔 `+ABORT_SETTLE_GRACE_MS` 백스톱 race 로
 *    사이클만은 확실히 진행(그 세션은 다음 재시작까지 degraded — #292 동작).
 */
async function tickWithTimeout(sessionId: string): Promise<void> {
  const controller = new AbortController();
  let backstopTimer: ReturnType<typeof setTimeout> | undefined;
  const abortTimer = setTimeout(() => controller.abort(), TICK_TIMEOUT_MS);
  const backstop = new Promise<never>((_, reject) => {
    backstopTimer = setTimeout(
      () => reject(new Error(`tick-timeout ${TICK_TIMEOUT_MS}ms`)),
      TICK_TIMEOUT_MS + ABORT_SETTLE_GRACE_MS,
    );
  });
  try {
    await Promise.race([
      runPaperTradingSessionTick(sessionId, {
        triggeredBy: "auto",
        abortSignal: controller.signal,
      }),
      backstop,
    ]);
  } finally {
    clearTimeout(abortTimer);
    if (backstopTimer) clearTimeout(backstopTimer);
  }
}

const STARTED_KEY = "__intradayTickSchedulerStarted";
type GlobalWithFlag = typeof globalThis & { [STARTED_KEY]?: boolean };

/** 스케줄 대상 — running 단타(cli-agent) 세션 전부(수명 관리는 일시정지/완료 버튼). */
export function selectSchedulableSessions(sessions: PaperTradingSession[]): PaperTradingSession[] {
  return sessions.filter(
    (session) => session.status === "running" && session.decisionProvider === "cli-agent",
  );
}

/** 동시 실행 상한 풀 — limit 개 워커가 큐를 소진(세션 간 병렬, 리스트 순서 보존 불필요). */
export async function runWithLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      await fn(item);
    }
  });
  await Promise.all(workers);
}

/** 사이클 중첩 방지 — 한 사이클(세션 N개 판단)이 60초를 넘겨도 다음 발화는 건너뛴다. */
let cycleRunning = false;

/**
 * 1사이클 실행 — running cli-agent 세션을 동시 TICK_CONCURRENCY 로 틱. 테스트를 위해 export
 * (now 주입으로 장중 게이트 확인). 반환: 시도한 세션 수(-1 = 게이트/중첩으로 미실행).
 */
export async function runScheduledIntradayTicks(now: Date = new Date()): Promise<number> {
  if (cycleRunning || !isKstMarketHoursWithCloseGrace(now)) return -1;
  cycleRunning = true;
  try {
    const sessions = selectSchedulableSessions(await listPaperTradingSessions());
    if (sessions.length === 0) return 0;
    await runWithLimit(sessions, TICK_CONCURRENCY, async (session) => {
      try {
        await tickWithTimeout(session.id);
      } catch (error) {
        // 개별 세션 실패(KIS 일시 오류·시간초과 등)는 다음 사이클에 재시도 — 다른 세션·사이클을 막지 않는다.
        log.warn(`틱 실패/시간초과 session=${session.id.slice(0, 8)}`, error);
      }
    });
    return sessions.length;
  } finally {
    cycleRunning = false;
  }
}

/** 마감 종료 스윕 중첩 방지. */
let closeOutRunning = false;

/**
 * 장 마감(평일 15:40 초과) 후 남은 running 단타 세션을 **완료로 자동 종료**한다.
 *
 * 단타 = 하루 1세션 — 자동 종료가 없으면 세션이 계속 running 으로 남아 (a) 다음 거래일 스케줄러가
 * 다시 틱해 크로스데이로 누적되고 (b) 워치 표에 어제 세션이 계속 자동 상주한다. 종료로 그날 결과를
 * 확정하고 표에서 내려(✕ 제거 가능) 다음 날 새 세션으로 시작하게 한다. 15:20 전량 청산이 이미
 * 지나 종료 시 열린 포지션은 없다. 완료 후 사이클은 대상 0 → no-op(로그·부하 없음).
 *
 * 테스트를 위해 export(now 주입). 반환: 완료한 세션 수(-1 = 장중·프리마켓·주말·중첩으로 미실행).
 */
export async function closeOutRunningSessionsAtClose(now: Date = new Date()): Promise<number> {
  if (closeOutRunning || !isKstAfterMarketClose(now)) return -1;
  closeOutRunning = true;
  try {
    const running = selectSchedulableSessions(await listPaperTradingSessions());
    if (running.length === 0) return 0;
    for (const session of running) {
      try {
        await patchPaperTradingSessionStatus(session.id, "completed");
      } catch (error) {
        // 개별 실패(영속 오류 등)는 다음 사이클 재시도 — 다른 세션 종료를 막지 않는다.
        log.warn(`마감 자동 완료 실패 session=${session.id.slice(0, 8)}`, error);
      }
    }
    log(`장 마감 — running 단타 세션 ${running.length}건 완료 처리`);
    return running.length;
  } finally {
    closeOutRunning = false;
  }
}

/** 서버 부팅 시 1회 기동(멱등). Vercel no-op. */
export function startIntradayTickScheduler(): void {
  const g = globalThis as GlobalWithFlag;
  if (g[STARTED_KEY]) return;
  if (isVercelEnv()) return; // 서버리스: 타이머 미유지 + CLI 부재.
  g[STARTED_KEY] = true;
  log(
    `단타 자동 틱 스케줄러 시작 — 60초 체크 · 동시 ${TICK_CONCURRENCY}세션 · 평일 09:00~15:40(마감 유예) · 15:40 이후 running 세션 자동 완료`,
  );
  // 매 사이클: 장중이면 틱, 마감 후면 종료 스윕(시간대가 겹치지 않아 둘 중 하나만 실행된다).
  const cycle = () => {
    void runScheduledIntradayTicks();
    void closeOutRunningSessionsAtClose();
  };
  setInterval(cycle, POLL_MS);
  cycle();
}
