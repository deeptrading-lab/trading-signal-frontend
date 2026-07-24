/**
 * 오토파일럿 런 스토어 + 스윕 오케스트레이션 — 인메모리 1차 진실 + Supabase write-through
 * (sessionStore 패턴 미러). intraday-autopilot.
 *
 * 런의 수명: startAutopilotRun(멱등) → [스케줄러 사이클마다 sweepAutopilotRuns — 10분 창 dedup]
 * → stopAutopilotRun(수동) 또는 closeOutAutopilotRuns(15:41+/크로스데이 자동 완료).
 *
 * 스윕 1회 = 슬롯 reconcile → 스크리너 → planRotation(순수) → 교체 실행(완료 patch — 자가채점
 * 훅 자동 발동) → fill 실행(자식 세션 생성, 직렬). 자식 세션은 일반 cli-agent 세션이라
 * 스케줄러의 틱/리스크/마감 스윕에 자동 편입된다(이 파일은 세션 내부를 일절 만지지 않는다).
 *
 * ★ 다중 운영자 격리: 런은 owner === operator **엄격 일치**만 스윕/마감(세션의 own-or-unowned
 *   하위호환과 달리 런은 신규 개념 — 미지정 폴백 없음). 친구 서버의 런·세션은 건드리지 않는다.
 */

import { randomUUID } from "crypto";
import { isoToKstDate } from "@/lib/api/toss/kst";
import { createLogger } from "@/lib/server/logTag";
import { getPaperTradingAiCliGate } from "@/lib/server/paperTrading/aiCliGate";
import {
  AUTOPILOT_DEFAULT_SLOT_COUNT,
  AUTOPILOT_DEFAULT_TOTAL_CAPITAL,
  AUTOPILOT_MAX_SLOT_COUNT,
  AUTOPILOT_ROTATION_LOG_MAX,
  AUTOPILOT_SWEEP_INTERVAL_MINUTES,
} from "@/lib/server/paperTrading/autopilot/constants";
import {
  loadPersistedAutopilotRuns,
  persistAutopilotRun,
  persistAutopilotScreenerSnapshot,
} from "@/lib/server/paperTrading/autopilot/persistence";
import {
  buildSlotSessionView,
  cooldownUntil,
  isTickerInCooldown,
  planRotation,
  type AutopilotSlotSessionView,
} from "@/lib/server/paperTrading/autopilot/rotation";
import { runAutopilotScreener } from "@/lib/server/paperTrading/autopilot/screener";
import { resolveServerOperator } from "@/lib/server/paperTrading/operator";
import {
  completePaperTradingAutopilotRun,
  createPaperTradingSession,
  getPaperTradingSessionDetail,
  listPaperTradingSessions,
  patchPaperTradingSessionStatus,
} from "@/lib/server/paperTrading/sessionStore";
import { floorToTickWindow } from "@/lib/server/paperTrading/time";
import { isKstAfterMarketClose, isKstMarketHoursWithCloseGrace } from "@/lib/utils/kstMarketHours";
import type {
  AutopilotGuideResponseKind,
  AutopilotRun,
  AutopilotScreenerSnapshot,
  AutopilotScreenerSummary,
  StartAutopilotRunRequest,
} from "@/lib/types/paperTrading/autopilot";

const log = createLogger("autopilot");

// ─── 스토어(globalThis — dev HMR 무손실) ──────────────────────────────────────

type AutopilotStore = {
  runs: Map<string, AutopilotRun>;
  /** hydrate 성공(ok|disabled) 여부 — 실패는 미설정으로 남겨 다음 접근에서 재시도(세션 관례). */
  hydrated?: boolean;
  hydration?: Promise<void>;
};

const STORE_KEY = "__autopilotRunStore";
type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: AutopilotStore };

function getStore(): AutopilotStore {
  const g = globalThis as GlobalWithStore;
  if (!g[STORE_KEY]) g[STORE_KEY] = { runs: new Map() };
  return g[STORE_KEY];
}

async function ensureHydrated(): Promise<void> {
  const store = getStore();
  if (store.hydrated) return;
  if (!store.hydration) {
    store.hydration = (async () => {
      const loaded = await loadPersistedAutopilotRuns(resolveServerOperator());
      if (loaded.status === "error") return; // hydrated 미설정 → 재시도 여지.
      if (loaded.status === "ok") {
        for (const run of loaded.runs) {
          if (!store.runs.has(run.id)) store.runs.set(run.id, run);
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

function myRuns(operator: string): AutopilotRun[] {
  return Array.from(getStore().runs.values()).filter((run) => run.owner === operator);
}

/** KST YYYY-MM-DD 키 — isoToKstDate 의 null(비정상 ISO)을 UTC 일자로 폴백해 비교를 항상 성립시킨다. */
function kstDateKey(iso: string): string {
  return isoToKstDate(iso) ?? iso.slice(0, 10);
}

function touchAndPersist(run: AutopilotRun): void {
  run.updatedAt = new Date().toISOString();
  if (run.rotationLog.length > AUTOPILOT_ROTATION_LOG_MAX) {
    run.rotationLog = run.rotationLog.slice(-AUTOPILOT_ROTATION_LOG_MAX);
  }
  // write-through(fail-soft) — 실패해도 오토파일럿 흐름 비차단(세션 관례).
  void persistAutopilotRun(run);
}

function completeRun(run: AutopilotRun, nowIso: string): void {
  run.status = "completed";
  run.endedAt = nowIso;
  touchAndPersist(run);
}

// ─── 공개 API(런 수명) ────────────────────────────────────────────────────────

/**
 * 오늘(KST) 내 active 런 반환 — 없으면 오늘 시작한 최근 런(stopped/completed, UI 요약용),
 * 그것도 없으면 null.
 */
export async function getActiveAutopilotRun(): Promise<AutopilotRun | null> {
  await ensureHydrated();
  const operator = resolveServerOperator();
  const runs = myRuns(operator).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const active = runs.find((run) => run.status === "active");
  if (active) return active;
  const todayKey = kstDateKey(new Date().toISOString());
  return runs.find((run) => kstDateKey(run.startedAt) === todayKey) ?? null;
}

/**
 * 런 시작(멱등) — 오늘(KST) 내 active 런이 있으면 그대로 반환(세션 생성 멱등가드 관례).
 * 이전 날 active 잔존 런은 여기서 즉시 완료 확정(closeOut 을 기다리지 않음 — 이중 active 방지).
 * 검증(총자본·슬롯 범위)은 API 라우트 책임 — 여기선 기본값 채움 + 클램프만.
 */
export async function startAutopilotRun(request: StartAutopilotRunRequest): Promise<AutopilotRun> {
  await ensureHydrated();
  const operator = resolveServerOperator();
  const now = new Date();
  const nowIso = now.toISOString();
  const todayKey = kstDateKey(nowIso);

  for (const run of myRuns(operator)) {
    if (run.status !== "active") continue;
    if (kstDateKey(run.startedAt) === todayKey) return run; // 멱등 재사용.
    completeRun(run, nowIso); // 크로스데이 잔존 정리.
  }

  const slotCount = Math.min(
    AUTOPILOT_MAX_SLOT_COUNT,
    Math.max(1, Math.round(request.slotCount ?? AUTOPILOT_DEFAULT_SLOT_COUNT)),
  );
  const totalCapital =
    request.totalCapital && request.totalCapital > 0
      ? Math.floor(request.totalCapital)
      : AUTOPILOT_DEFAULT_TOTAL_CAPITAL;
  const run: AutopilotRun = {
    id: randomUUID(),
    status: "active",
    purpose: request.purpose ?? "research",
    owner: operator,
    totalCapital,
    slotCount,
    perSlotCash: Math.floor(totalCapital / slotCount),
    riskMode: request.riskMode ?? "balanced",
    tickIntervalMinutes: request.tickIntervalMinutes,
    slots: Array.from({ length: slotCount }, (_, i) => ({
      slotIndex: i,
      sessionId: null,
      ticker: null,
      filledAt: null,
    })),
    cooldownUntilByTicker: {},
    rotationLog: [],
    lastSweepWindowStart: null,
    startedAt: nowIso,
    endedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  getStore().runs.set(run.id, run);
  touchAndPersist(run);
  log(`오토파일럿 시작 — 총자본 ${totalCapital.toLocaleString("ko-KR")}원 · 슬롯 ${slotCount}`);
  return run;
}

type StopAutopilotRunOptions = {
  /** research 수동 중지용 — 현재 런 자식 세션을 최신 가격으로 청산·완료한다. */
  completeChildSessions?: boolean;
  /** 테스트 대역 주입. */
  completeSessions?: typeof completePaperTradingAutopilotRun;
};

/**
 * 런 중지 — 기본은 가이드 호환을 위해 오케스트레이션만 멈춘다. research 수동 중지는
 * completeChildSessions=true로 자식 모의세션도 최신 가격 청산 후 완료한다. 남의 런이면 null.
 */
export async function stopAutopilotRun(
  runId: string,
  options: StopAutopilotRunOptions = {},
): Promise<AutopilotRun | null> {
  await ensureHydrated();
  const run = getStore().runs.get(runId);
  if (!run || run.owner !== resolveServerOperator()) return null;
  if (run.status === "active") {
    run.status = "stopped";
    run.endedAt = new Date().toISOString();
    touchAndPersist(run);
  }
  if (options.completeChildSessions && run.status === "stopped") {
    // 청산 가격 조회가 일시 실패해도 같은 중지 요청으로 남은 세션을 재시도할 수 있게 stopped에서도 실행.
    const result = await (options.completeSessions ?? completePaperTradingAutopilotRun)(run.id);
    log(
      `오토파일럿 중지 — run=${run.id.slice(0, 8)}(자식 세션 ${result.completedSessionIds.length}건 완료)`,
    );
  } else if (!options.completeChildSessions) {
    log(`오토파일럿 중지 — run=${run.id.slice(0, 8)}(자식 세션은 유지)`);
  }
  return run;
}

export type RespondToAutopilotGuideResult =
  | { ok: true; run: AutopilotRun }
  | { ok: false; reason: "not_found" | "conflict" | "no_position" | "invalid_guide" };

function parseGuideId(
  guideId: string,
): { sessionId: string; tickId: string; orderIndex: number } | null {
  const parts = guideId.split(":");
  if (parts.length !== 3) return null;
  const orderIndex = Number(parts[2]);
  if (!parts[0] || !parts[1] || !Number.isInteger(orderIndex) || orderIndex < 0) return null;
  return { sessionId: parts[0], tickId: parts[1], orderIndex };
}

function guideHoldingQuantity(run: AutopilotRun, ticker: string): number {
  return Object.values(run.guideResponses ?? {}).reduce((quantity, item) => {
    if (item.ticker !== ticker || item.response !== "performed") return quantity;
    return item.side === "BUY"
      ? quantity + item.executedQuantity
      : Math.max(0, quantity - item.executedQuantity);
  }, 0);
}

/**
 * 가이드 응답 확정 — 원본 주문 검증 + guideId 멱등 + 사용자 수행 원장 보유량 게이트.
 * 동일 응답 재시도는 기존 런을 반환하고, 수행/패스 상충은 conflict로 거절한다.
 */
export async function respondToAutopilotGuide(
  runId: string,
  guideId: string,
  response: AutopilotGuideResponseKind,
  getDetail: typeof getPaperTradingSessionDetail = getPaperTradingSessionDetail,
): Promise<RespondToAutopilotGuideResult> {
  await ensureHydrated();
  const run = getStore().runs.get(runId);
  if (!run || run.owner !== resolveServerOperator()) return { ok: false, reason: "not_found" };

  const parsed = parseGuideId(guideId);
  if (!parsed) return { ok: false, reason: "invalid_guide" };
  const existing = run.guideResponses?.[guideId];
  if (existing) {
    return existing.response === response
      ? { ok: true, run }
      : { ok: false, reason: "conflict" };
  }

  const detail = await getDetail(parsed.sessionId);
  if (!detail || detail.session.autopilotRunId !== run.id) {
    return { ok: false, reason: "invalid_guide" };
  }
  const tick = detail.ticks.find((item) => item.id === parsed.tickId);
  const order = tick?.orders[parsed.orderIndex];
  if (!tick || !order) return { ok: false, reason: "invalid_guide" };

  // 원본 조회 중 다른 요청이 먼저 확정됐을 수 있으므로 await 이후 멱등 상태를 다시 확인한다.
  const raced = run.guideResponses?.[guideId];
  if (raced) {
    return raced.response === response
      ? { ok: true, run }
      : { ok: false, reason: "conflict" };
  }

  const holding = guideHoldingQuantity(run, order.ticker);
  if (response === "performed" && order.side === "SELL" && holding < 1) {
    return { ok: false, reason: "no_position" };
  }
  const executedQuantity =
    response === "passed"
      ? 0
      : order.side === "BUY"
        ? order.quantity
        : Math.min(order.quantity, holding);
  const item = {
    guideId,
    sessionId: parsed.sessionId,
    tickId: parsed.tickId,
    orderIndex: parsed.orderIndex,
    ticker: order.ticker,
    name: order.name,
    side: order.side,
    recommendedPrice: order.price,
    recommendedQuantity: order.quantity,
    recommendedAt: tick.createdAt,
    executedQuantity,
    response,
    respondedAt: new Date().toISOString(),
  } as const;
  run.guideResponses = { ...(run.guideResponses ?? {}), [guideId]: item };
  touchAndPersist(run);
  return { ok: true, run };
}

// ─── 스케줄러 진입점 ──────────────────────────────────────────────────────────

/** 스윕 IO 의존성 주입(테스트) — 미지정 시 실제 구현. */
export type AutopilotSweepDeps = {
  screener?: typeof runAutopilotScreener;
  createSession?: typeof createPaperTradingSession;
  patchSessionStatus?: typeof patchPaperTradingSessionStatus;
  listSessions?: typeof listPaperTradingSessions;
  getSessionDetail?: typeof getPaperTradingSessionDetail;
  cliGate?: typeof getPaperTradingAiCliGate;
  persistSnapshot?: typeof persistAutopilotScreenerSnapshot;
};

/** 스윕 중첩 방지(스케줄러 사이클 60초 < 스윕 소요 가능성 대비). */
let sweepRunning = false;

/**
 * 오토파일럿 스윕 — 내 active 런에 대해 스크리너+로테이션 1회. 60초 사이클마다 불리지만
 * 런별 `lastSweepWindowStart`(10분 창, 영속) dedup 으로 실제 실행은 주기당 1회.
 * 반환: 스윕한 런 수(-1 = 장외/중첩 미실행).
 */
export async function sweepAutopilotRuns(
  now: Date = new Date(),
  deps: AutopilotSweepDeps = {},
): Promise<number> {
  if (sweepRunning || !isKstMarketHoursWithCloseGrace(now)) return -1;
  sweepRunning = true;
  try {
    await ensureHydrated();
    const operator = resolveServerOperator();
    const active = myRuns(operator).filter((run) => run.status === "active");
    if (active.length === 0) return 0;

    const window = floorToTickWindow(now, AUTOPILOT_SWEEP_INTERVAL_MINUTES);
    let swept = 0;
    for (const run of active) {
      if (run.lastSweepWindowStart === window) continue; // 이번 10분 창 이미 처리.
      run.lastSweepWindowStart = window; // 창 선점 — 실패해도 같은 창 재실행 안 함(다음 창 재시도).
      try {
        await sweepOneRun(run, now, operator, deps);
        swept += 1;
      } catch (error) {
        // 스윕 실패(스크리너 예외 등)는 다음 창에서 재시도 — 런·다른 사이클을 막지 않는다.
        log.warn(`스윕 실패 run=${run.id.slice(0, 8)}`, error);
      }
      touchAndPersist(run);
    }
    return swept;
  } finally {
    sweepRunning = false;
  }
}

async function sweepOneRun(
  run: AutopilotRun,
  now: Date,
  operator: string,
  deps: AutopilotSweepDeps,
): Promise<void> {
  const nowIso = now.toISOString();
  const screener = deps.screener ?? runAutopilotScreener;
  const createSession = deps.createSession ?? createPaperTradingSession;
  const patchSessionStatus = deps.patchSessionStatus ?? patchPaperTradingSessionStatus;
  const listSessions = deps.listSessions ?? listPaperTradingSessions;
  const getSessionDetail = deps.getSessionDetail ?? getPaperTradingSessionDetail;
  const persistSnapshot = deps.persistSnapshot ?? persistAutopilotScreenerSnapshot;
  // 스냅샷 골격 — 스윕이 어느 분기로 끝나든 이 창의 선정 근거를 남긴다(종목 선정 사후 검증 데이터).
  const sweepWindowStart = run.lastSweepWindowStart ?? nowIso;
  const snapshot: AutopilotScreenerSnapshot = {
    id: `${run.id}:${sweepWindowStart}`,
    runId: run.id,
    owner: run.owner,
    at: nowIso,
    sweepWindowStart,
    status: "ok",
    universeSize: 0,
    excludedTickers: [],
    ranking: [],
    rejected: [],
    picks: [],
    replaced: [],
  };

  // ① 슬롯 세션 뷰 + 제외 집합 조립.
  const slotViews = new Map<string, AutopilotSlotSessionView>();
  const slotTickers = new Set<string>();
  for (const slot of run.slots) {
    if (!slot.sessionId) continue;
    if (slot.ticker) slotTickers.add(slot.ticker);
    const detail = await getSessionDetail(slot.sessionId);
    if (detail) slotViews.set(slot.sessionId, buildSlotSessionView(detail));
  }

  // 오늘 running cli-agent 티커(소유자 무관) — 사용자 수동 세션·친구 서버 세션과의 경합/흡수 방지.
  // 단, 내 슬롯 티커는 유니버스에 남겨야 교체 순위 판정이 성립한다(스크리너 주석 참조).
  const todayKey = kstDateKey(nowIso);
  const excludeTickers = new Set<string>();
  for (const session of await listSessions()) {
    if (session.decisionProvider !== "cli-agent" || session.status !== "running") continue;
    if (kstDateKey(session.startedAt ?? session.createdAt) !== todayKey) continue;
    const ticker = session.stocks[0]?.ticker ?? session.tickers[0];
    if (ticker && !slotTickers.has(ticker)) excludeTickers.add(ticker);
  }
  for (const [ticker] of Object.entries(run.cooldownUntilByTicker)) {
    if (isTickerInCooldown(run, ticker, now)) excludeTickers.add(ticker);
  }

  // ② 스크리너.
  snapshot.excludedTickers = [...excludeTickers];
  const result = await screener({ excludeTickers });
  if (result.status === "unavailable") {
    run.lastScreenerSummary = {
      at: nowIso,
      universeSize: 0,
      passed: 0,
      top: [],
      unavailableReason: result.reason,
    } satisfies AutopilotScreenerSummary;
    run.rotationLog.push({
      at: nowIso,
      kind: "skip",
      slotIndex: null,
      note: `스크리너 미가용 — ${result.reason}`,
    });
    snapshot.status = "unavailable";
    snapshot.unavailableReason = result.reason;
    void persistSnapshot(snapshot);
    return;
  }
  // 스냅샷 랭킹 — shortlist 는 2차·최종 점수가 병합된 fillRanking 사본으로 대체(전 필드 보존).
  const fillByTicker = new Map(result.fillRanking.map((c) => [c.ticker, c]));
  snapshot.universeSize = result.universeSize;
  snapshot.ranking = result.stage1Ranking.map((c) => fillByTicker.get(c.ticker) ?? c);
  snapshot.rejected = result.rejected;
  const finalScoreByTicker = new Map(result.fillRanking.map((c) => [c.ticker, c.finalScore]));
  run.lastScreenerSummary = {
    at: nowIso,
    universeSize: result.universeSize,
    passed: result.stage1Ranking.length,
    top: result.stage1Ranking.slice(0, 8).map((c) => ({
      ticker: c.ticker,
      name: c.name,
      score1: Number(c.score1.toFixed(3)),
      finalScore: finalScoreByTicker.get(c.ticker),
    })),
  };

  // ③ 로테이션 계획(순수) → 실행.
  const plan = planRotation({
    run,
    slotViews,
    stage1Ranking: result.stage1Ranking,
    fillRanking: result.fillRanking,
    now,
  });
  run.rotationLog.push(...plan.events); // reconcile·skip 이벤트.
  for (const item of plan.reconciled) {
    emptySlot(run, item.slotIndex);
  }

  for (const replacement of plan.replacements) {
    try {
      await patchSessionStatus(replacement.sessionId, "completed"); // 자가채점 훅 자동 발동.
      run.cooldownUntilByTicker[replacement.ticker] = cooldownUntil(now);
      emptySlot(run, replacement.slotIndex);
      snapshot.replaced.push({
        ticker: replacement.ticker,
        sessionId: replacement.sessionId,
        reason: replacement.reason,
      });
      run.rotationLog.push({
        at: nowIso,
        kind: "replace",
        slotIndex: replacement.slotIndex,
        outgoing: {
          sessionId: replacement.sessionId,
          ticker: replacement.ticker,
          reason: replacement.reason,
        },
      });
      log(`슬롯 ${replacement.slotIndex} 회수 — ${replacement.ticker}(${replacement.reason})`);
    } catch (error) {
      // 완료 patch 실패 — 슬롯을 비우지 않는다(fill 충돌 방지). 다음 스윕에서 재시도.
      log.warn(`교체 회수 실패 session=${replacement.sessionId.slice(0, 8)}`, error);
    }
  }

  // ④ fill — 자식 세션 생성(직렬). CLI 게이트 미충족이면 생성 자체를 건너뛴다(결정론 폴백
  //    세션을 양산하지 않기 위해 — judge 없는 자동 매매는 오토파일럿 취지 밖).
  if (plan.fills.length > 0) {
    const cliGate = (deps.cliGate ?? getPaperTradingAiCliGate)();
    if (!cliGate.ok) {
      run.rotationLog.push({
        at: nowIso,
        kind: "skip",
        slotIndex: null,
        note: "AI CLI 미설치 — fill 건너뜀",
      });
      void persistSnapshot(snapshot);
      return;
    }
    for (const fill of plan.fills) {
      const slot = run.slots[fill.slotIndex];
      if (!slot || slot.sessionId !== null) continue; // 교체 실패로 안 비워진 슬롯 — fill 취소.
      const candidate = fill.candidate;
      try {
        const detail = await createSession({
          name: `오토파일럿 · ${candidate.name}`,
          tickers: [candidate.ticker],
          stocks: [{ ticker: candidate.ticker, name: candidate.name }],
          initialCash: run.perSlotCash,
          targetReturnPct: 5,
          riskMode: run.riskMode,
          decisionProvider: "cli-agent",
          aiProvider: cliGate.provider,
          tickIntervalMinutes: run.tickIntervalMinutes,
          autopilotRunId: run.id,
        });
        const session = detail.session;
        // 멱등가드 레이스 방어 — 같은 종목의 남/수동 세션을 되돌려받았으면 슬롯 미배정 + 쿨다운.
        // (내가 이 런에서 만든 세션의 재반환은 autopilotRunId 일치 → 정상 채택 = 크래시 자가복구.)
        if (session.owner !== operator || session.autopilotRunId !== run.id) {
          run.cooldownUntilByTicker[candidate.ticker] = cooldownUntil(now);
          run.rotationLog.push({
            at: nowIso,
            kind: "skip",
            slotIndex: fill.slotIndex,
            note: `${candidate.ticker} 기존 세션과 충돌(멱등가드) — 쿨다운`,
          });
          continue;
        }
        slot.sessionId = session.id;
        slot.ticker = candidate.ticker;
        slot.filledAt = nowIso;
        snapshot.picks.push({
          ticker: candidate.ticker,
          slotIndex: fill.slotIndex,
          sessionId: session.id,
          score: Number((candidate.finalScore ?? candidate.score1).toFixed(3)),
        });
        run.rotationLog.push({
          at: nowIso,
          kind: "fill",
          slotIndex: fill.slotIndex,
          incoming: {
            sessionId: session.id,
            ticker: candidate.ticker,
            score: Number((candidate.finalScore ?? candidate.score1).toFixed(3)),
          },
        });
        log(
          `슬롯 ${fill.slotIndex} 채움 — ${candidate.name}(${candidate.ticker}) ` +
            `점수 ${(candidate.finalScore ?? candidate.score1).toFixed(3)}`,
        );
      } catch (error) {
        // 생성 실패(첫 틱 오류 등) — 슬롯은 빈 채로 다음 스윕 재시도.
        log.warn(`fill 실패 ticker=${candidate.ticker}`, error);
        run.rotationLog.push({
          at: nowIso,
          kind: "skip",
          slotIndex: fill.slotIndex,
          note: `${candidate.ticker} 세션 생성 실패`,
        });
      }
    }
  }

  // ⑤ 스크리너 스냅샷 영속(fire-and-forget) — 이 창의 랭킹·탈락·편입/교체 전수 기록.
  void persistSnapshot(snapshot);
}

function emptySlot(run: AutopilotRun, slotIndex: number): void {
  const slot = run.slots[slotIndex];
  if (!slot) return;
  slot.sessionId = null;
  slot.ticker = null;
  slot.filledAt = null;
}

/** 마감 스윕 중첩 방지. */
let closeOutRunning = false;

/**
 * 런 자동 완료 — (a) 시작일(KST)이 오늘보다 이전인 active 런은 시간대 무관 완료(다운타임 복구,
 * closeOutStaleCrossdaySessions 미러) (b) 15:41+ 이면 오늘 active 런 완료. 자식 세션은 기존
 * 마감 스윕(④)이 별도로 완료 처리한다. 반환: 완료한 런 수(-1 = 중첩 미실행).
 */
export async function closeOutAutopilotRuns(now: Date = new Date()): Promise<number> {
  if (closeOutRunning) return -1;
  closeOutRunning = true;
  try {
    await ensureHydrated();
    const operator = resolveServerOperator();
    const nowIso = now.toISOString();
    const todayKey = kstDateKey(nowIso);
    const afterClose = isKstAfterMarketClose(now);
    let closed = 0;
    for (const run of myRuns(operator)) {
      if (run.status !== "active") continue;
      const isStale = kstDateKey(run.startedAt) < todayKey;
      if (!isStale && !afterClose) continue;
      completeRun(run, nowIso);
      closed += 1;
      log(`런 자동 완료 — run=${run.id.slice(0, 8)}(${isStale ? "크로스데이" : "장 마감"})`);
    }
    return closed;
  } finally {
    closeOutRunning = false;
  }
}

// ─── 테스트 헬퍼 ──────────────────────────────────────────────────────────────

export function resetAutopilotStoreForTest(): void {
  const g = globalThis as GlobalWithStore;
  g[STORE_KEY] = { runs: new Map(), hydrated: true }; // hydrate IO 생략.
}

export function seedAutopilotRunForTest(run: AutopilotRun): void {
  getStore().runs.set(run.id, run);
  getStore().hydrated = true;
}
