import { randomUUID } from "crypto";
import {
  PAPER_TRADING_CLOSE_FLATTEN_HHMM,
  PAPER_TRADING_DEFAULT_CASH_BUFFER_PCT,
  PAPER_TRADING_DEFAULT_INITIAL_CASH,
  PAPER_TRADING_DEFAULT_MAX_POSITION_PCT,
  PAPER_TRADING_DEFAULT_TICK_INTERVAL_MINUTES,
  PAPER_TRADING_INTRADAY_TICK_INTERVAL_MINUTES,
  PAPER_TRADING_SESSION_HARD_STOP_PCT,
  defaultPositionHardStopPct,
} from "@/lib/server/paperTrading/constants";
import { addTickWindow, floorToTickWindow, riskSweepTickWindow } from "@/lib/server/paperTrading/time";
import { kstHhmm, type IntradayTickResult } from "@/lib/server/paperTrading/intradayTickDecision";
import {
  loadPersistedPaperTrading,
  persistPaperSession,
  persistPaperTick,
} from "@/lib/server/paperTrading/persistence";
import { runPaperTradingTick } from "@/lib/server/paperTrading/runTick";
import { resolveServerOperator } from "@/lib/server/paperTrading/operator";
import { scheduleSessionTickLabeling } from "@/lib/server/intraday/tickLabels";
import { isoToKstDate } from "@/lib/api/toss/kst";
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
  /** 타 운영자 세션 마지막 DB 재조회 시각(ms epoch) — TTL 게이트 키(intraday-session-owner). */
  foreignRefreshedAt?: number;
  /** 진행 중 타 운영자 세션 재조회(single-flight). 완료 후 해제. */
  foreignRefresh?: Promise<void>;
};

/**
 * 타 운영자 세션 DB 재조회 TTL(ms) — 잦은 폴링·새로고침이 매번 전량 리로드하지 않게 한다.
 * 단타 판단은 5분 주기라 20초 신선도면 "최근 판단"이 멈춰 보이지 않으면서 DB 부하도 낮다.
 */
const FOREIGN_REFRESH_TTL_MS = 20_000;

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

/**
 * 타 운영자(owner 가 내 operator 도 아니고 미지정도 아닌) 세션을 DB 최신본으로 덮어쓴다
 * (intraday-session-owner).
 *
 * ★ 왜 필요한가: 부팅 hydrate 는 1회뿐(`ensureHydrated`)이고 소유자 게이트 때문에 이 서버는 남의
 *   세션을 틱하지 않는다 → 남의 세션 인메모리 복사본은 **부팅 스냅샷에 영구 고정**돼 "최근 판단"이
 *   멈춰 보인다. 같은 프로세스 = 같은 globalThis 메모리라 **브라우저 새로고침으로도 안 풀린다**
 *   (재조회 트리거가 프로세스 재시작뿐이었음). 목록·상세 조회에서 TTL 게이트로 DB 를 되읽어 남의
 *   세션만 갱신한다.
 * ★ 내/레거시(미소유) 세션은 이 서버가 직접 틱하므로 메모리가 항상 최신 — 덮어쓰지 않는다(소유자
 *   게이트 `!owner || owner === operator` 와 대칭).
 * - 실패 시 `foreignRefreshedAt` 미갱신 → 다음 접근에서 재시도. single-flight 로 중복 로드 방지.
 */
async function refreshForeignSessions(operator: string, now = Date.now()): Promise<void> {
  const store = getStore();
  if (store.foreignRefresh) return store.foreignRefresh;
  if (store.foreignRefreshedAt && now - store.foreignRefreshedAt < FOREIGN_REFRESH_TTL_MS) return;
  store.foreignRefresh = (async () => {
    const loaded = await loadPersistedPaperTrading();
    if (loaded.status !== "ok") return; // disabled/error → TTL 미갱신, 다음 접근 재시도.
    for (const entry of loaded.sessions) {
      const owner = entry.session.owner;
      if (!owner || owner === operator) continue; // 내/레거시 세션은 메모리 우선.
      const existing = store.sessions.get(entry.session.id);
      store.sessions.set(entry.session.id, {
        session: entry.session,
        positions: entry.positions,
        ticks: entry.ticks,
        tickChain: existing?.tickChain, // 방어적 보존(남의 세션엔 보통 없음).
      });
    }
    store.foreignRefreshedAt = now;
  })()
    .catch(() => undefined)
    .finally(() => {
      store.foreignRefresh = undefined;
    });
  return store.foreignRefresh;
}

export async function listPaperTradingSessions(): Promise<PaperTradingSession[]> {
  await ensureHydrated();
  await refreshForeignSessions(resolveServerOperator());
  return Array.from(getStore().sessions.values())
    .map((entry) => entry.session)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getPaperTradingSessionDetail(
  sessionId: string,
): Promise<PaperTradingSessionDetail | null> {
  await ensureHydrated();
  const operator = resolveServerOperator();
  const existing = getStore().sessions.get(sessionId);
  // 남의 세션(또는 부팅 후 새로 나타난 미지의 세션)이면 DB 최신본으로 갱신 후 다시 읽는다.
  // 내/레거시 세션은 메모리가 최신이라 재조회 불필요.
  if (!existing || (existing.session.owner && existing.session.owner !== operator)) {
    await refreshForeignSessions(operator);
  }
  const entry = getStore().sessions.get(sessionId);
  if (!entry) return null;
  return toDetail(entry);
}

export async function createPaperTradingSession(
  request: CreatePaperTradingSessionRequest,
  options: { priceSnapshotProvider?: PaperTradingPriceSnapshotProvider; now?: Date } = {},
): Promise<PaperTradingSessionDetail> {
  await ensureHydrated();
  const now = (options.now ?? new Date()).toISOString();
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
  // 가능하다. 같은 종목의 "오늘(KST) running" 단타 세션만 재사용한다. 날짜가 바뀐 뒤에도
  // 어제 세션이 running 으로 남아 있으면 오늘 모의투자 시작을 막지 않아야 한다.
  if (decisionProvider === "cli-agent") {
    const ticker = stocks[0]?.ticker;
    const todayKey = isoToKstDate(now);
    const existing = Array.from(getStore().sessions.values()).find(
      (entry) =>
        entry.session.decisionProvider === "cli-agent" &&
        entry.session.status === "running" &&
        (entry.session.stocks[0]?.ticker ?? entry.session.tickers[0]) === ticker &&
        isoToKstDate(entry.session.startedAt ?? entry.session.createdAt) === todayKey,
    );
    if (existing) return toDetail(existing);
  }

  const tickIntervalMinutes =
    decisionProvider === "cli-agent"
      ? (request.tickIntervalMinutes ?? PAPER_TRADING_INTRADAY_TICK_INTERVAL_MINUTES)
      : PAPER_TRADING_DEFAULT_TICK_INTERVAL_MINUTES;
  // 하드스톱 스탬프(intraday-stop-slippage C) — 명시 override(포지션 −N% 또는 null=끄기) 존중,
  // 미지정이면 riskMode 기본(−3/−5/−8). 세션 하드스톱은 명시값 또는 기본 −7. payload jsonb 로 영속.
  const positionHardStopPct =
    request.positionHardStopPct !== undefined
      ? request.positionHardStopPct
      : defaultPositionHardStopPct(request.riskMode);
  const sessionHardStopPct =
    request.sessionHardStopPct !== undefined
      ? request.sessionHardStopPct
      : PAPER_TRADING_SESSION_HARD_STOP_PCT;
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
    positionHardStopPct,
    sessionHardStopPct,
    aiProvider: decisionProvider === "cli-agent" ? request.aiProvider : undefined,
    // 소유자 스탬프(intraday-session-owner) — 이 서버 운영자로 고정. 공유 Supabase 로 영속(payload
    // 통째 저장)돼 다른 서버의 스케줄러가 own-or-unowned 게이트로 남의 세션을 틱하지 않게 한다.
    // 모든 provider 에 스탬프(mock 은 스케줄 대상이 아니라 무해, 규칙 일관).
    owner: resolveServerOperator(),
    portfolioId: request.portfolioId,
    portfolioName: request.portfolioName,
    portfolioAllocationPct: request.portfolioAllocationPct,
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
  if (patch.status === "completed" && !wasCompleted) {
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

export type CompletePaperTradingPortfolioResult = {
  portfolioId: string;
  completedSessionIds: string[];
  alreadyCompletedSessionIds: string[];
};

/**
 * 자동 포트폴리오 일괄 종료 — 이 서버 소유(또는 레거시 미지정) 세션만 대상으로 한다.
 * 보유 포지션은 최신 가격으로 EXIT 체결한 뒤에만 completed 전환한다. 세션 tickChain 을 공유해
 * 진행 중인 자동 틱과 직렬화하며, 재호출 시 이미 완료된 세션은 건너뛰는 멱등 동작이다.
 */
export async function completePaperTradingPortfolio(
  portfolioId: string,
  options: { priceSnapshotProvider?: PaperTradingPriceSnapshotProvider; now?: Date } = {},
): Promise<CompletePaperTradingPortfolioResult | null> {
  await ensureHydrated();
  const operator = resolveServerOperator();
  const entries = Array.from(getStore().sessions.values()).filter(
    (entry) =>
      entry.session.portfolioId === portfolioId &&
      (!entry.session.owner || entry.session.owner === operator),
  );
  if (entries.length === 0) return null;

  const completedSessionIds: string[] = [];
  const alreadyCompletedSessionIds: string[] = [];
  const failures: string[] = [];
  for (const entry of entries) {
    if (entry.session.status === "completed") {
      alreadyCompletedSessionIds.push(entry.session.id);
      continue;
    }
    const task = (entry.tickChain ?? Promise.resolve()).then(() =>
      closeAndCompletePortfolioEntry(entry, options),
    );
    entry.tickChain = task.then(
      () => undefined,
      () => undefined,
    );
    try {
      await task;
      completedSessionIds.push(entry.session.id);
    } catch (error) {
      failures.push(
        error instanceof Error
          ? error.message
          : `${entry.session.stocks[0]?.name ?? "종목"}을 청산하지 못했어요.`,
      );
    }
  }
  if (failures.length > 0) throw new Error(failures.join(" "));
  return { portfolioId, completedSessionIds, alreadyCompletedSessionIds };
}

async function closeAndCompletePortfolioEntry(
  entry: StoredSession,
  options: { priceSnapshotProvider?: PaperTradingPriceSnapshotProvider; now?: Date },
): Promise<void> {
  if (entry.session.status === "completed") return;
  const held = entry.positions.some((position) => position.quantity > 0);
  if (held) {
    const tickWindowStart = (options.now ?? new Date()).toISOString();
    const exitResolver = async (): Promise<IntradayTickResult> => ({
      decision: {
        action: "EXIT",
        targetAllocationPct: 0,
        targetAllocations: [],
        confidence: "HIGH",
        rationale: "사용자가 자동 포트폴리오를 종료해 보유 수량을 전량 청산합니다.",
        riskNotes: [],
        source: "cli-agent",
      },
      forcedExit: { targetPrice: null, stopPrice: null, flattenAll: true },
    });
    const result = await runPaperTradingTick({
      session: entry.session,
      positions: entry.positions,
      existingTicks: entry.ticks,
      triggeredBy: "user",
      tickWindowStart,
      priceSnapshotProvider: options.priceSnapshotProvider,
      intradayResolver: exitResolver,
    });
    const fullyClosed = result.positions.every((position) => position.quantity === 0);
    const sellRecorded = result.tick.orders.some((order) => order.side === "SELL");
    if (!fullyClosed || !sellRecorded) {
      throw new Error(`${entry.session.stocks[0]?.name ?? "종목"} 청산 가격을 확인하지 못했어요.`);
    }
    entry.session = result.session;
    entry.positions = result.positions;
    if (!entry.ticks.some((tick) => tick.id === result.tick.id)) {
      entry.ticks = [...entry.ticks, result.tick];
      void persistPaperTick(result.tick);
    }
  }

  const now = new Date().toISOString();
  entry.session = {
    ...entry.session,
    status: "completed",
    endedAt: now,
    updatedAt: now,
  };
  void persistPaperSession(entry.session, entry.positions);
  scheduleSessionTickLabeling(entry.session, [...entry.ticks]);
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

/**
 * A(60초 리스크-only 체크) — 보유 포지션의 청산 조건만 검사하는 경량 스윕(intraday-stop-slippage).
 *
 * LLM 5분 틱과 **별개로** 매 60초 사이클에서 호출된다. LLM 을 호출하지 않고(가격 스냅샷만) 세션의
 * **가장 최근 틱 decision**(동적 손절선=invalidationPrice·익절가=targetPrice) + 하드스톱(runTick 이
 * 세션 설정에서 주입) + 장막판(15:20)을 검사해, 걸리면 즉시 EXIT 가상 체결하고 리스크 틱을 남긴다.
 * 트리거가 없으면 **아무 틱도 만들지 않는다**(60초마다 HOLD 틱 스팸 방지 — 무발동은 no-op).
 *
 * - LLM 미호출: 내부 리스크 stub resolver 로 runPaperTradingTick 을 재사용(HOLD + forced-exit).
 * - 무포지션 스킵: 보유 없으면 가격 조회조차 없이 즉시 no-op(멱등 — LLM 이 이미 청산했으면 스킵).
 * - 창 dedup 안전: 리스크 틱 창은 `riskSweepTickWindow`(초=30)라 5분 LLM 창(초=00)과 절대 겹치지
 *   않아 중복 EXIT/창 삼킴이 없다. triggeredBy="risk" 로 체결 내역에서도 식별된다.
 * - 세션 직렬화(tickChain) 공유: LLM 틱과 같은 체인이라 사이클 내 순서(리스크 먼저)·멱등이 보장된다.
 * - 가격 미신선/조회 실패는 executeVirtualTrade 의 staleness 가드(markOnly)로 무주문 → no-op
 *   (신선하지 않은 가격으로는 절대 청산하지 않는다).
 */
export async function runPaperTradingSessionRiskCheck(
  sessionId: string,
  options: { now?: Date; priceSnapshotProvider?: PaperTradingPriceSnapshotProvider } = {},
): Promise<PaperTradingSessionDetail | null> {
  await ensureHydrated();
  const entry = getStore().sessions.get(sessionId);
  if (!entry) return null;
  const task = (entry.tickChain ?? Promise.resolve()).then(() => runRiskCheckOnce(entry, options));
  entry.tickChain = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

async function runRiskCheckOnce(
  entry: StoredSession,
  options: { now?: Date; priceSnapshotProvider?: PaperTradingPriceSnapshotProvider },
): Promise<PaperTradingSessionDetail> {
  const session = entry.session;
  // 리스크 스윕은 running cli-agent 세션의 보유 포지션에만 관여(mock 무영향).
  if (session.status !== "running" || session.decisionProvider !== "cli-agent") return toDetail(entry);
  const held = entry.positions.find((position) => position.quantity >= 1);
  if (!held) return toDetail(entry); // 무포지션 → 가격 조회 없이 즉시 no-op(플랫 스킵).

  const now = options.now ?? new Date();
  const tickWindowStart = riskSweepTickWindow(now);
  const lastTick = entry.ticks.at(-1);
  const flattenAll = kstHhmm(tickWindowStart) >= PAPER_TRADING_CLOSE_FLATTEN_HHMM;

  // 리스크 stub — LLM 없이 HOLD(리밸런싱 없음) + 최근 틱의 동적 손절선/익절가/장막판만 싣는다.
  // 하드스톱·세션 수익률은 runTick 이 세션 설정에서 주입(LLM 5분 틱과 동일 경로).
  const riskResolver = async (): Promise<IntradayTickResult> => ({
    decision: {
      action: "HOLD",
      targetAllocationPct: 0,
      targetAllocations: [],
      confidence: "LOW",
      rationale: "60초 리스크 점검 — 청산 조건 미도달.",
      riskNotes: [],
      source: "cli-agent",
    },
    forcedExit: {
      targetPrice: lastTick?.decision.targetPrice ?? null,
      stopPrice: lastTick?.decision.invalidationPrice ?? null,
      flattenAll,
    },
  });

  const result = await runPaperTradingTick({
    session,
    positions: entry.positions,
    existingTicks: entry.ticks,
    triggeredBy: "risk",
    tickWindowStart,
    priceSnapshotProvider: options.priceSnapshotProvider,
    intradayResolver: riskResolver,
  });

  // 실제 청산(SELL 체결)이 있을 때만 틱 기록 — 무발동/무신선은 no-op(엔트리 무변경).
  if (result.tick.orders.length === 0) return toDetail(entry);
  if (entry.ticks.some((tick) => tick.id === result.tick.id)) return toDetail(entry);

  entry.session = result.session;
  entry.positions = result.positions;
  entry.ticks = [...entry.ticks, result.tick];
  void persistPaperSession(entry.session, entry.positions);
  void persistPaperTick(result.tick);
  return toDetail(entry);
}

export function resetPaperTradingStoreForTest(): void {
  const store = getStore();
  store.sessions.clear();
  // 테스트 격리 — hydration 상태도 초기화(테스트 env 는 Supabase 미설정이라 즉시 disabled).
  store.hydration = undefined;
  store.hydrated = undefined;
}

/** 테스트 전용 — 세션(+선택적 포지션·틱)을 메모리 스토어에 직접 시드(hydrate 스킵). */
export function seedPaperTradingSessionForTest(
  session: PaperTradingSession,
  extra: { positions?: PaperTradingPosition[]; ticks?: PaperTradingTick[] } = {},
): void {
  const store = getStore();
  store.sessions.set(session.id, {
    session,
    positions: extra.positions ?? [],
    ticks: extra.ticks ?? [],
  });
  store.hydrated = true;
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
