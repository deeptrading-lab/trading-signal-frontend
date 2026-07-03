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
import { isKstMarketHoursWithCloseGrace } from "@/lib/utils/kstMarketHours";
import {
  listPaperTradingSessions,
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
        await runPaperTradingSessionTick(session.id, { triggeredBy: "auto" });
      } catch (error) {
        // 개별 세션 실패(KIS 일시 오류 등)는 다음 사이클에 재시도 — 다른 세션을 막지 않는다.
        log.warn(`틱 실패 session=${session.id.slice(0, 8)}`, error);
      }
    });
    return sessions.length;
  } finally {
    cycleRunning = false;
  }
}

/** 서버 부팅 시 1회 기동(멱등). Vercel no-op. */
export function startIntradayTickScheduler(): void {
  const g = globalThis as GlobalWithFlag;
  if (g[STARTED_KEY]) return;
  if (isVercelEnv()) return; // 서버리스: 타이머 미유지 + CLI 부재.
  g[STARTED_KEY] = true;
  log(
    `단타 자동 틱 스케줄러 시작 — 60초 체크 · 동시 ${TICK_CONCURRENCY}세션 · 평일 09:00~15:40(마감 유예)`,
  );
  setInterval(() => void runScheduledIntradayTicks(), POLL_MS);
  void runScheduledIntradayTicks();
}
