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
import { resolveServerOperator } from "@/lib/server/paperTrading/operator";
import {
  listPaperTradingSessions,
  patchPaperTradingSessionStatus,
  runPaperTradingSessionRiskCheck,
  runPaperTradingSessionTick,
} from "@/lib/server/paperTrading/sessionStore";
import type { PaperTradingPriceSnapshotProvider } from "@/lib/server/paperTrading/marketData";
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

/**
 * 스케줄 대상 — running 단타(cli-agent) 세션 중 **이 서버가 소유한(또는 미지정) 것**만.
 *
 * ★ 소유자 게이트(intraday-session-owner): 공유 Supabase 를 두 로컬 서버가 함께 쓰면 부팅 시 서로의
 *   세션까지 hydrate 한다. 게이트가 없으면 두 서버가 같은 세션을 **이중 틱**하고 서로의 소유 상태를
 *   덮어쓴다. 그래서 한 서버는 **자기 소유(`owner === 내 operator`)** + **소유자 미지정(레거시,
 *   `!owner`)** 세션만 처리하고, **다른 운영자 소유 세션은 건너뛴다**. 미지정을 포함하는 이유는
 *   소유자 도입 이전 세션을 orphan 으로 남기지 않기 위함(하위호환) — 두 서버가 함께 정리해도 멱등.
 *
 * 이 한 곳에 게이트를 두면 틱(runScheduledIntradayTicks)·마감 종료(closeOutRunningSessionsAtClose)·
 * 밀린 세션 복구(closeOutStaleCrossdaySessions)가 모두 자동으로 own-or-unowned 로 제한된다 —
 * 서버 A 가 서버 B 의 running 세션을 마감/복구하지 않게(소유자별 수명 관리).
 *
 * `operator` 는 테스트 주입용(기본 = 이 서버 운영자). now 주입 패턴과 동일.
 */
export function selectSchedulableSessions(
  sessions: PaperTradingSession[],
  operator: string = resolveServerOperator(),
): PaperTradingSession[] {
  return sessions.filter(
    (session) =>
      session.status === "running" &&
      session.decisionProvider === "cli-agent" &&
      (!session.owner || session.owner === operator),
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

/** 리스크 스윕 중첩 방지 — LLM 틱 사이클과 별개 가드(빠른 가격-only 검사라 보통 즉시 끝난다). */
let riskSweepRunning = false;

/**
 * A(60초 리스크-only 스윕) — 매 사이클 LLM 5분 틱 **앞**에서 실행(intraday-stop-slippage).
 *
 * 스케줄 대상(owner+running+cli-agent)의 보유 포지션을 신선 가격만으로 검사해 동적 손절선/익절가/
 * 하드스톱/장막판에 걸리면 즉시 EXIT 한다(LLM 호출 0). 개별 세션은 `runPaperTradingSessionRiskCheck`
 * 가 무포지션·무신선을 no-op 처리하므로 여기선 게이트·소유자 선별·병렬만 담당. 사이클 앞에서 돌아
 * 청산되면 뒤따르는 LLM 틱은 무포지션으로 보고 중복 EXIT 하지 않는다(같은 tickChain 직렬화).
 *
 * 테스트를 위해 export(now·priceSnapshotProvider 주입). 반환: 검사한 세션 수(-1 = 게이트/중첩 미실행).
 */
export async function runIntradayRiskSweep(
  now: Date = new Date(),
  options: { priceSnapshotProvider?: PaperTradingPriceSnapshotProvider } = {},
): Promise<number> {
  if (riskSweepRunning || !isKstMarketHoursWithCloseGrace(now)) return -1;
  riskSweepRunning = true;
  try {
    const sessions = selectSchedulableSessions(await listPaperTradingSessions());
    if (sessions.length === 0) return 0;
    await runWithLimit(sessions, TICK_CONCURRENCY, async (session) => {
      try {
        await runPaperTradingSessionRiskCheck(session.id, {
          now,
          priceSnapshotProvider: options.priceSnapshotProvider,
        });
      } catch (error) {
        // 개별 세션 실패(가격 조회 오류 등)는 다음 사이클 재시도 — 다른 세션·LLM 틱을 막지 않는다.
        log.warn(`리스크 점검 실패 session=${session.id.slice(0, 8)}`, error);
      }
    });
    return sessions.length;
  } finally {
    riskSweepRunning = false;
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

/** 크로스데이 스윕 중첩 방지. */
let staleCloseOutRunning = false;

/** KST(거래일) YYYY-MM-DD 키 — 세션 시작일과 오늘을 같은 기준으로 비교. */
function kstDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

/**
 * **밀린 이전-거래일 running 세션을 시간대 무관하게 완료 처리**한다(서버 다운타임 복구용).
 *
 * `closeOutRunningSessionsAtClose` 는 평일 15:41~23:59 에만 발화하므로, dev 서버가 그 창에 꺼져
 * 있었으면(퇴근·주말) 세션이 계속 running 으로 남아 UI 에 "진행중"으로 상주하고 다음 거래일
 * 스케줄러가 크로스데이로 다시 틱한다. 이 스윕은 **세션 시작일(KST)이 오늘보다 이전**이면
 * 시간·요일과 무관하게 완료로 확정 → 서버가 언제 다시 켜지든(아침·주말 복귀) 잔여 세션이 정리된다.
 * (오늘 프리마켓에 만든 세션은 시작일=오늘이라 건드리지 않는다. 15:20 전량 청산이 지나 포지션 없음.)
 *
 * 테스트를 위해 export(now 주입). 반환: 완료한 세션 수(-1 = 중첩으로 미실행).
 */
export async function closeOutStaleCrossdaySessions(now: Date = new Date()): Promise<number> {
  if (staleCloseOutRunning) return -1;
  staleCloseOutRunning = true;
  try {
    const todayKey = kstDateKey(now);
    const stale = selectSchedulableSessions(await listPaperTradingSessions()).filter(
      (session) => kstDateKey(new Date(session.startedAt)) < todayKey,
    );
    if (stale.length === 0) return 0;
    for (const session of stale) {
      try {
        await patchPaperTradingSessionStatus(session.id, "completed");
      } catch (error) {
        // 개별 실패는 다음 사이클 재시도 — 다른 세션 종료를 막지 않는다.
        log.warn(`밀린 이전 날 세션 완료 실패 session=${session.id.slice(0, 8)}`, error);
      }
    }
    log(`밀린 이전-거래일 running 단타 세션 ${stale.length}건 완료 처리(다운타임 복구)`);
    return stale.length;
  } finally {
    staleCloseOutRunning = false;
  }
}

/** 서버 부팅 시 1회 기동(멱등). Vercel no-op. */
export function startIntradayTickScheduler(): void {
  const g = globalThis as GlobalWithFlag;
  if (g[STARTED_KEY]) return;
  if (isVercelEnv()) return; // 서버리스: 타이머 미유지 + CLI 부재.
  g[STARTED_KEY] = true;
  log(
    `단타 자동 틱 스케줄러 시작 — 60초 체크(리스크 스윕 + LLM 5분 틱) · 동시 ${TICK_CONCURRENCY}세션 · 평일 09:00~15:40(마감 유예) · 15:40 이후 running 세션 자동 완료 · 밀린 이전날 세션 상시 정리`,
  );
  // 매 사이클(순차): ① 밀린 이전-거래일 세션부터 종료(크로스데이 틱 방지) → ②ᴬ 60초 리스크 스윕
  // (LLM 앞 — 급락 포지션을 ~60초 내 청산) → ② 장중이면 오늘 세션 LLM 틱 → ③ 마감 후(15:41+)면
  // 오늘 세션 종료 스윕. ②③ 은 시간대가 겹치지 않아 둘 중 하나만 실행. 리스크 스윕은 장중+마감 유예.
  const cycle = async () => {
    await closeOutStaleCrossdaySessions();
    await runIntradayRiskSweep();
    await runScheduledIntradayTicks();
    await closeOutRunningSessionsAtClose();
  };
  void cycle();
  setInterval(() => void cycle(), POLL_MS);
}
