"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query/queryKeys";
import { fetchAIAnalysisStream } from "@/lib/api/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import {
  AGENT_ORDER,
  INITIAL_AGENT_STATES,
  getResumeKey,
  type AIAnalysisEvent,
  type AIAnalysisProvider,
  type AgentKey,
  type AgentState,
  type DebateMessage,
  type FinalDecision,
  type ResumeState,
  type SentimentReport,
} from "@/lib/types/stock/aiAnalysis";

/**
 * AI 종목 분석 — 전역 컨텍스트.
 *
 * 분석 상태(에이전트·리포트·토론·결론)와 SSE 스트림을 `(main)` 레이아웃 한 곳에서 소유한다.
 * 종목 상세 페이지가 아니라 셸(레이아웃)에 mount 되므로, 분석 도중 상단 navbar 로 다른 페이지
 * (마이페이지 등)로 이동해도 컴포넌트가 unmount 되지 않아 스트림이 끊기지 않고 **백그라운드에서
 * 계속 진행**된다. 진행 중 표시는 패널의 우측 재열기 탭(스피너+진행수)이 모든 페이지에서 담당한다.
 *
 * **동시 분석은 최대 3건** — 종목(ticker)별 슬롯 맵으로 관리한다. Slack 봇과 동일한 한도.
 *   - slots: 종목별 분석 상태(에이전트·리포트·토론·결론 + 자체 AbortController).
 *   - viewTicker: 패널이 현재 보여주는 종목. 그 슬롯이 패널 본문으로 투영된다(없으면 공급자 선택 진입).
 *   - 게이트: 대상 종목을 제외한 running 슬롯이 3개 이상이면 새 분석을 차단(인라인 안내).
 *
 * ⚠️ route handler 는 로컬(next dev) 전용 — Vercel 에선 503. 동시 3건은 로컬 머신 자원·CLI
 *    구독 rate limit 을 공유하므로, 봇과 동일한 상한(3)으로 부하를 제한한다.
 */

/** 동시 실행 상한 — Slack 봇과 동일(3). */
export const MAX_CONCURRENT_ANALYSES = 3;
/** 슬롯 누적 상한 — running 3 + 완료 잔여 몇 개. 초과 시 가장 오래된 완료 슬롯 evict. */
const MAX_TOTAL_SLOTS = 6;
/** 재분석 프롬프트 노출 임계 — 마지막 분석 완료가 이 시간 이상 지났을 때만 "새로 분석?" 안내(신선하면 미노출). */
const REANALYSIS_PROMPT_MIN_AGE_MS = 30 * 60 * 1000;

// ── 종목별 분석 슬롯 ─────────────────────────────────────────────────────────

interface AnalysisSlot {
  ticker: string;
  provider: AIAnalysisProvider;
  /** 탭 라벨용 종목명 캐시(없으면 ticker 표기). */
  name?: string;
  isRunning: boolean;
  agents: AgentState[];
  reports: Partial<Record<AgentKey, string>>;
  debate: DebateMessage[];
  debatingSide: "bull" | "bear" | null;
  final: FinalDecision | null;
  sentiment: SentimentReport | null;
  error: string | null;
  resumeFrom: AgentKey | null;
  /** 시작 시각(ms) — analyzingTicker 파생·evict 순서용. */
  startedAt: number;
  /** 완료(done) 시각(ms) — 재분석 프롬프트 신선도 판정용. 미완료면 null. */
  finishedAt: number | null;
}

function emptySlot(
  ticker: string,
  provider: AIAnalysisProvider,
  name?: string,
): AnalysisSlot {
  return {
    ticker,
    provider,
    name,
    isRunning: false,
    agents: INITIAL_AGENT_STATES,
    reports: {},
    debate: [],
    debatingSide: null,
    final: null,
    sentiment: null,
    error: null,
    resumeFrom: null,
    startedAt: 0,
    finishedAt: null,
  };
}

function doneCountOf(slot: AnalysisSlot): number {
  return slot.agents.filter((a) => a.status === "done").length;
}

/** 의미 있는 슬롯(진행 중·결과·에러) — 탭/재열기 노출 대상. 빈 슬롯은 제외. */
function isLiveSlot(slot: AnalysisSlot): boolean {
  return (
    slot.isRunning ||
    slot.final != null ||
    slot.error != null ||
    slot.agents.some((a) => a.status !== "pending")
  );
}

/** 대상 ticker 를 제외한 현재 running 슬롯 수(동시성 게이트용). */
function runningCountExcluding(
  slots: Record<string, AnalysisSlot>,
  ticker: string,
): number {
  return Object.values(slots).filter((s) => s.isRunning && s.ticker !== ticker)
    .length;
}

/** 분석 주인(가장 최근 시작한 running 슬롯, 없으면 가장 최근 슬롯). */
function deriveAnalyzingTicker(
  slots: Record<string, AnalysisSlot>,
): string | null {
  const arr = Object.values(slots);
  if (arr.length === 0) return null;
  const running = arr.filter((s) => s.isRunning);
  const pool = running.length ? running : arr;
  return pool.reduce((a, b) => (b.startedAt > a.startedAt ? b : a)).ticker;
}

/** 슬롯 누적 상한 초과 시 가장 오래된 비실행 슬롯부터 제거(방금 추가한 keep 은 보존). */
function evictIfNeeded(
  slots: Record<string, AnalysisSlot>,
  keep: string,
): Record<string, AnalysisSlot> {
  const keys = Object.keys(slots);
  if (keys.length <= MAX_TOTAL_SLOTS) return slots;
  const evictable = Object.values(slots)
    .filter((s) => !s.isRunning && s.ticker !== keep)
    .sort((a, b) => a.startedAt - b.startedAt);
  const next = { ...slots };
  let over = keys.length - MAX_TOTAL_SLOTS;
  for (const s of evictable) {
    if (over <= 0) break;
    delete next[s.ticker];
    over--;
  }
  return next;
}

/** 재개 시 서버로 보낼 이전 완료 결과(fromIndex 이전 에이전트 산출물). */
function buildResumeState(slot: AnalysisSlot, fromIndex: number): ResumeState {
  const r = slot.reports;
  const idx = (k: AgentKey) => AGENT_ORDER.indexOf(k);
  const bullMsgs = slot.debate.filter((d) => d.speaker === "bull" && !d.isStreaming);
  const bearMsgs = slot.debate.filter((d) => d.speaker === "bear" && !d.isStreaming);
  const accBull = bullMsgs.map((m) => m.content).join("\n\n---\n\n");
  const accBear = bearMsgs.map((m) => m.content).join("\n\n---\n\n");
  return {
    marketReport:       fromIndex > idx("market")           ? r["market"]           : undefined,
    newsReport:         fromIndex > idx("news")             ? r["news"]             : undefined,
    fundamentalsReport: fromIndex > idx("fundamentals")     ? r["fundamentals"]     : undefined,
    socialReport:       fromIndex > idx("social")           ? r["social"]           : undefined,
    bullArgument:       fromIndex > idx("bull")             ? (accBull || undefined) : undefined,
    bearArgument:       fromIndex > idx("bear")             ? (accBear || undefined) : undefined,
    researchPlan:       fromIndex > idx("research_manager") ? r["research_manager"] : undefined,
    traderProposal:     fromIndex > idx("trader")           ? r["trader"]           : undefined,
    riskRisky:          fromIndex > idx("risk_risky")       ? r["risk_risky"]       : undefined,
    riskNeutral:        fromIndex > idx("risk_neutral")     ? r["risk_neutral"]     : undefined,
    riskSafe:           fromIndex > idx("risk_safe")        ? r["risk_safe"]        : undefined,
  };
}

// ── SSE 이벤트 → 한 슬롯 리듀서(순수). 기존 handleEvent switch 의 슬롯 스코프 포팅. ──

function reduceSlotEvent(slot: AnalysisSlot, event: AIAnalysisEvent): AnalysisSlot {
  switch (event.type) {
    case "progress": {
      const agents = slot.agents.map((a) =>
        a.key === event.agent
          ? {
              ...a,
              status: event.status,
              streamingChunk: event.status === "done" ? "" : a.streamingChunk,
              // 실패 사유는 error 일 때만 보존(running/done 으로 가면 해제).
              failReason: event.status === "error" ? event.reason : undefined,
            }
          : a,
      );
      const resumeFrom =
        event.status === "error"
          ? slot.resumeFrom ?? getResumeKey(event.agent)
          : slot.resumeFrom;
      return { ...slot, agents, resumeFrom };
    }

    case "stream":
      return {
        ...slot,
        agents: slot.agents.map((a) =>
          a.key === event.agent
            ? { ...a, streamingChunk: a.streamingChunk + event.chunk }
            : a,
        ),
      };

    case "report":
      return {
        ...slot,
        reports: { ...slot.reports, [event.agent]: event.content },
        agents: slot.agents.map((a) =>
          a.key === event.agent ? { ...a, streamingChunk: "" } : a,
        ),
      };

    case "debate_stream": {
      const last = slot.debate[slot.debate.length - 1];
      const debate =
        last && last.speaker === event.speaker && last.round === event.round && last.isStreaming
          ? [...slot.debate.slice(0, -1), { ...last, content: last.content + event.chunk }]
          : [...slot.debate, { speaker: event.speaker, content: event.chunk, isStreaming: true, round: event.round }];
      return { ...slot, debatingSide: event.speaker, debate };
    }

    case "debate": {
      const last = slot.debate[slot.debate.length - 1];
      const replaceLast =
        last && last.speaker === event.speaker && last.round === event.round && last.isStreaming;
      const msg: DebateMessage = {
        speaker: event.speaker,
        content: event.content,
        isStreaming: false,
        round: event.round,
      };
      const debate = replaceLast
        ? [...slot.debate.slice(0, -1), msg]
        : [...slot.debate, msg];
      return { ...slot, debatingSide: null, debate };
    }

    case "sentiment":
      return { ...slot, sentiment: event.report };

    case "final":
      return { ...slot, final: event.data };

    case "error":
      return { ...slot, error: event.message, isRunning: false };

    case "done":
      // 캐시 무효화는 dispatch 래퍼에서(이벤트 자신의 ticker 사용).
      return { ...slot, isRunning: false };

    default:
      return slot;
  }
}

// ── 전역 상태 + 리듀서 ───────────────────────────────────────────────────────

interface AIAnalysisState {
  slots: Record<string, AnalysisSlot>;
  /** 패널 표시 대상 종목. 슬롯 없으면 idle 진입(공급자 선택). */
  viewTicker: string | null;
  isOpen: boolean;
  showReanalysisPrompt: boolean;
  /** 동시성 게이트 안내(transient). */
  limitNotice: string | null;
}

const INITIAL_STATE: AIAnalysisState = {
  slots: {},
  viewTicker: null,
  isOpen: false,
  showReanalysisPrompt: false,
  limitNotice: null,
};

type Action =
  | { kind: "event"; ticker: string; event: AIAnalysisEvent; now: number }
  | { kind: "startSlot"; ticker: string; provider: AIAnalysisProvider; name?: string; now: number }
  | { kind: "clearSlot"; ticker: string }
  | { kind: "resumePrep"; ticker: string; fromIndex: number; clearSentiment: boolean; debateMode: "all" | "bearOnly" | "keep"; clearFinal: boolean }
  | { kind: "halt"; ticker: string }
  | { kind: "fetchError"; ticker: string; message: string }
  | { kind: "removeSlot"; ticker: string }
  | { kind: "setView"; ticker: string; open: boolean; reanalysisPrompt: boolean }
  | { kind: "setOpen"; open: boolean }
  | { kind: "setReanalysisPrompt"; show: boolean }
  | { kind: "collapse" }
  | { kind: "limitNotice"; message: string | null };

function reducer(state: AIAnalysisState, action: Action): AIAnalysisState {
  switch (action.kind) {
    case "event": {
      const slot = state.slots[action.ticker];
      if (!slot) return state;
      let next = reduceSlotEvent(slot, action.event);
      if (next === slot) return state;
      // 완료 시각 기록 — 재분석 프롬프트 신선도(30분) 판정용.
      if (action.event.type === "done") next = { ...next, finishedAt: action.now };
      return { ...state, slots: { ...state.slots, [action.ticker]: next } };
    }

    case "startSlot": {
      const prev = state.slots[action.ticker];
      const slot: AnalysisSlot = {
        ...emptySlot(action.ticker, action.provider, action.name ?? prev?.name),
        isRunning: true,
        startedAt: action.now,
      };
      const slots = evictIfNeeded(
        { ...state.slots, [action.ticker]: slot },
        action.ticker,
      );
      return {
        ...state,
        slots,
        viewTicker: action.ticker,
        isOpen: true,
        showReanalysisPrompt: false,
        limitNotice: null,
      };
    }

    case "clearSlot": {
      // 공급자 재선택(chooseAgain) — 슬롯을 비우고 viewTicker 는 유지(진입 화면 복귀).
      if (!state.slots[action.ticker]) return state;
      const rest = { ...state.slots };
      delete rest[action.ticker];
      return { ...state, slots: rest, showReanalysisPrompt: false };
    }

    case "resumePrep": {
      const slot = state.slots[action.ticker];
      if (!slot) return state;
      const { fromIndex, clearSentiment, debateMode, clearFinal } = action;
      const agents = slot.agents.map((a) =>
        AGENT_ORDER.indexOf(a.key) >= fromIndex
          ? { ...a, status: "pending" as const, streamingChunk: "" }
          : a,
      );
      const reports = { ...slot.reports };
      for (let i = fromIndex; i < AGENT_ORDER.length; i++) {
        delete reports[AGENT_ORDER[i]];
      }
      const debate =
        debateMode === "all"
          ? []
          : debateMode === "bearOnly"
            ? slot.debate.filter((d) => d.speaker !== "bear")
            : slot.debate;
      const next: AnalysisSlot = {
        ...slot,
        agents,
        reports,
        debate,
        debatingSide: null,
        sentiment: clearSentiment ? null : slot.sentiment,
        final: clearFinal ? null : slot.final,
        error: null,
        resumeFrom: null,
        isRunning: true,
      };
      return { ...state, slots: { ...state.slots, [action.ticker]: next } };
    }

    case "halt": {
      const slot = state.slots[action.ticker];
      if (!slot) return state;
      const running = slot.agents.filter((a) => a.status === "running");
      const resumeFrom = running.length
        ? slot.resumeFrom ?? getResumeKey(running[0].key)
        : slot.resumeFrom;
      const runningKeys = new Set(running.map((a) => a.key));
      const agents = slot.agents.map((a) =>
        runningKeys.has(a.key) ? { ...a, status: "error" as const, streamingChunk: "" } : a,
      );
      const debate = slot.debate.map((d) =>
        d.isStreaming ? { ...d, isStreaming: false } : d,
      );
      return {
        ...state,
        slots: {
          ...state.slots,
          [action.ticker]: { ...slot, agents, debate, debatingSide: null, resumeFrom, isRunning: false },
        },
      };
    }

    case "fetchError": {
      const slot = state.slots[action.ticker];
      if (!slot) return state;
      return {
        ...state,
        slots: {
          ...state.slots,
          [action.ticker]: { ...slot, error: action.message, isRunning: false },
        },
      };
    }

    case "removeSlot": {
      if (!state.slots[action.ticker]) return state;
      const rest = { ...state.slots };
      delete rest[action.ticker];
      let viewTicker = state.viewTicker;
      let isOpen = state.isOpen;
      if (state.viewTicker === action.ticker) {
        viewTicker = deriveAnalyzingTicker(rest) ?? Object.keys(rest)[0] ?? null;
        if (!viewTicker) isOpen = false;
      }
      return { ...state, slots: rest, viewTicker, isOpen, showReanalysisPrompt: false };
    }

    case "setView":
      return {
        ...state,
        viewTicker: action.ticker,
        isOpen: action.open,
        showReanalysisPrompt: action.reanalysisPrompt,
      };

    case "setOpen":
      return {
        ...state,
        isOpen: action.open,
        showReanalysisPrompt: action.open ? state.showReanalysisPrompt : false,
      };

    case "setReanalysisPrompt":
      return { ...state, showReanalysisPrompt: action.show };

    case "collapse":
      // 라우트 이동 — 오버레이만 접고 슬롯·스트림은 백그라운드 유지.
      return { ...state, isOpen: false, showReanalysisPrompt: false };

    case "limitNotice":
      return { ...state, limitNotice: action.message };

    default:
      return state;
  }
}

// ── 컨텍스트 ─────────────────────────────────────────────────────────────────

/** 재열기/헤더 탭 한 칸. */
export interface AnalysisTab {
  ticker: string;
  name?: string;
  isRunning: boolean;
  doneCount: number;
  agentCount: number;
}

export interface AIAnalysisContextValue {
  provider: AIAnalysisProvider;
  /** 분석이 도는(또는 마지막으로 돈) 종목. 없으면 null. */
  analyzingTicker: string | null;
  /** 패널이 현재 보여주는 종목. */
  viewTicker: string | null;
  /** 패널 호스트가 렌더할 종목(열림=viewTicker, 닫힘=analyzingTicker). null 이면 미렌더. */
  panelTicker: string | null;
  isOpen: boolean;
  isRunning: boolean;
  showReanalysisPrompt: boolean;
  agents: AgentState[];
  reports: Partial<Record<AgentKey, string>>;
  debate: DebateMessage[];
  debatingSide: "bull" | "bear" | null;
  final: FinalDecision | null;
  sentiment: SentimentReport | null;
  error: string | null;
  resumeFrom: AgentKey | null;
  /** 진행 표시용 — 활성 슬롯의 완료(done) 에이전트 수. */
  doneCount: number;
  /** 진행 중·결과 보유 슬롯 목록(헤더 탭 스트립 + 재열기 스택). */
  tabs: AnalysisTab[];
  /** 동시성 게이트 안내(최대 3개). */
  limitNotice: string | null;
  /** 패널을 ticker 기준으로 연다(name 알면 탭 라벨로 캐시). */
  openFor: (ticker: string, name?: string) => void;
  /** 재열기 — 분석 주인의 라이브 뷰를 연다. */
  open: () => void;
  /** 공급자 선택 → viewTicker 종목을 처음부터 분석. 게이트 통과 시. */
  start: (provider: AIAnalysisProvider) => void;
  /** 탭 전환 — viewTicker 를 해당 종목으로. */
  switchTab: (ticker: string) => void;
  /** 종목별 진행 여부(외부 카드 배지용). */
  isTickerRunning: (ticker: string) => boolean;
  /** 슬롯(탭) 닫기 — 컨트롤러 abort + 맵에서 제거. */
  dismissSlot: (ticker: string) => void;
  chooseAgain: () => void;
  run: () => void;
  resume: (fromAgent: AgentKey) => void;
  stop: () => void;
  close: () => void;
  dismissReanalysisPrompt: () => void;
}

const AIAnalysisContext = createContext<AIAnalysisContextValue | null>(null);

export function useAIAnalysisContext(): AIAnalysisContextValue {
  const ctx = useContext(AIAnalysisContext);
  if (!ctx) throw new Error("useAIAnalysisContext must be used within <AIAnalysisProvider>");
  return ctx;
}

const EMPTY_PROJECTION = {
  provider: "codex" as AIAnalysisProvider,
  agents: INITIAL_AGENT_STATES,
  reports: {} as Partial<Record<AgentKey, string>>,
  debate: [] as DebateMessage[],
  debatingSide: null as "bull" | "bear" | null,
  final: null as FinalDecision | null,
  sentiment: null as SentimentReport | null,
  error: null as string | null,
  resumeFrom: null as AgentKey | null,
  isRunning: false,
  doneCount: 0,
};

export function AIAnalysisProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // 종목별 AbortController + 이벤트 핸들러가 동기 조회할 최신 state 미러 + 탭 라벨 이름 캐시.
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const stateRef = useRef(state);
  const namesRef = useRef<Record<string, string>>({});
  useEffect(() => {
    stateRef.current = state;
  });

  // 언마운트 — 모든 스트림 중단.
  useEffect(() => {
    const controllers = abortControllersRef.current;
    return () => {
      Object.values(controllers).forEach((c) => c.abort());
    };
  }, []);

  // 라우트 이동 시 패널 자동 접기 — 슬롯·스트림은 백그라운드 유지.
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    dispatch({ kind: "collapse" });
  }, [pathname]);

  // limitNotice 자동 클리어(~4s).
  useEffect(() => {
    if (!state.limitNotice) return;
    const id = setTimeout(() => dispatch({ kind: "limitNotice", message: null }), 4000);
    return () => clearTimeout(id);
  }, [state.limitNotice]);

  // ── SSE 이벤트 핸들러(ticker 라우팅 + done 캐시 무효화) ─────────────────────

  const handleStreamEvent = useCallback(
    (ticker: string, event: AIAnalysisEvent) => {
      if (event.type !== "stream" && event.type !== "debate_stream") {
        console.log(
          "[AIAnalysis]", ticker, event.type,
          event.type === "progress" ? `${event.agent} ${event.status}` :
          event.type === "report"   ? `${event.agent} len=${event.content.length}` :
          event.type === "debate"   ? `${event.speaker} R${event.round} len=${event.content.length}` : "",
        );
      }
      dispatch({ kind: "event", ticker, event, now: Date.now() });

      if (event.type === "done") {
        // 분석 완료 → 저장된 결론/목록 캐시 무효화로 /analyze 카드를 자동 갱신.
        //   서버는 final 직후 upsert 를 await 하므로 done 시점엔 Supabase 저장이 끝나 있다.
        queryClient.invalidateQueries({ queryKey: queryKeys.stock.aiDecisions });
        queryClient.invalidateQueries({ queryKey: queryKeys.stock.aiDecision(ticker) });
      }
    },
    [queryClient],
  );

  // ── 스트림 시작 공통(I/O 만 담당, 상태 전이는 호출 전 dispatch) ─────────────

  const startStream = useCallback(
    (
      targetTicker: string,
      provider: AIAnalysisProvider,
      fromAgent?: AgentKey,
      preState?: ResumeState,
    ) => {
      abortControllersRef.current[targetTicker]?.abort();
      const abort = new AbortController();
      abortControllersRef.current[targetTicker] = abort;

      fetchAIAnalysisStream(
        targetTicker,
        provider,
        (event) => handleStreamEvent(targetTicker, event),
        abort.signal,
        fromAgent,
        preState,
      ).catch((err: unknown) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        const msg = (err as { message?: string })?.message ?? "분석 중 오류가 발생했어요.";
        console.error("[AIAnalysis] fetch 오류:", msg);
        dispatch({ kind: "fetchError", ticker: targetTicker, message: msg });
      });
    },
    [handleStreamEvent],
  );

  /** 대상 종목 제외 running 이 상한 이상이면 안내 후 차단. true=차단됨. */
  const blockedByLimit = useCallback((target: string): boolean => {
    if (runningCountExcluding(stateRef.current.slots, target) >= MAX_CONCURRENT_ANALYSES) {
      dispatch({ kind: "limitNotice", message: COPY.limit.atCapacity(MAX_CONCURRENT_ANALYSES) });
      return true;
    }
    return false;
  }, []);

  // ── 공개 API ───────────────────────────────────────────────────────────────

  /** 공급자 선택 → viewTicker 종목 분석 시작(게이트 통과 시). */
  const start = useCallback(
    (nextProvider: AIAnalysisProvider) => {
      const target = stateRef.current.viewTicker;
      if (!target) return;
      if (blockedByLimit(target)) return;
      const name = stateRef.current.slots[target]?.name ?? namesRef.current[target];
      dispatch({ kind: "startSlot", ticker: target, provider: nextProvider, name, now: Date.now() });
      startStream(target, nextProvider);
    },
    [blockedByLimit, startStream],
  );

  /** 직전 공급자로 활성 슬롯 전체 재실행 — 에러 재시도 전용. */
  const run = useCallback(() => {
    const target = stateRef.current.viewTicker;
    const slot = target ? stateRef.current.slots[target] : null;
    if (!target || !slot) return;
    if (blockedByLimit(target)) return;
    dispatch({ kind: "startSlot", ticker: target, provider: slot.provider, name: slot.name, now: Date.now() });
    startStream(target, slot.provider);
  }, [blockedByLimit, startStream]);

  /** fromAgent 부터 활성 슬롯 재개. 이전 산출물은 유지하고 이후만 리셋. */
  const resume = useCallback(
    (fromAgent: AgentKey) => {
      const target = stateRef.current.viewTicker;
      const slot = target ? stateRef.current.slots[target] : null;
      if (!target || !slot) return;
      if (blockedByLimit(target)) return;
      // bear 는 항상 bull 부터 재실행.
      const effectiveFrom: AgentKey = fromAgent === "bear" ? "bull" : fromAgent;
      const fromIndex = AGENT_ORDER.indexOf(effectiveFrom);
      const preState = buildResumeState(slot, fromIndex);
      dispatch({
        kind: "resumePrep",
        ticker: target,
        fromIndex,
        clearSentiment: fromIndex <= AGENT_ORDER.indexOf("social"),
        debateMode:
          fromIndex <= AGENT_ORDER.indexOf("bull")
            ? "all"
            : fromIndex <= AGENT_ORDER.indexOf("bear")
              ? "bearOnly"
              : "keep",
        clearFinal: fromIndex <= AGENT_ORDER.indexOf("portfolio_manager"),
      });
      startStream(target, slot.provider, effectiveFrom, preState);
    },
    [blockedByLimit, startStream],
  );

  /** 패널을 ticker 기준으로 연다 — 자동 실행하지 않는다. */
  const openFor = useCallback((ticker: string, name?: string) => {
    if (name) namesRef.current[ticker] = name;
    const slot = stateRef.current.slots[ticker];
    const allPending = !slot || slot.agents.every((a) => a.status === "pending");
    // 재분석 프롬프트 — 결과가 있고 비실행이며, 마지막 분석이 30분 이상 지났을 때만(신선하면 미노출).
    const lastAnalyzedAt = slot ? slot.finishedAt ?? slot.startedAt : 0;
    const stale =
      lastAnalyzedAt > 0 && Date.now() - lastAnalyzedAt >= REANALYSIS_PROMPT_MIN_AGE_MS;
    dispatch({
      kind: "setView",
      ticker,
      open: true,
      reanalysisPrompt: !!slot && !allPending && !slot.isRunning && stale,
    });
  }, []);

  /** 재열기 — 분석 주인의 라이브 뷰로 연다. */
  const open = useCallback(() => {
    const target =
      deriveAnalyzingTicker(stateRef.current.slots) ?? stateRef.current.viewTicker;
    if (!target) return;
    openFor(target);
  }, [openFor]);

  /** 탭 전환 — 해당 종목 뷰로(게이트 안내는 클리어). */
  const switchTab = useCallback(
    (ticker: string) => {
      openFor(ticker);
      dispatch({ kind: "limitNotice", message: null });
    },
    [openFor],
  );

  /** 결과를 비워 공급자 선택 화면으로 복귀(다른 AI로 재선택). */
  const chooseAgain = useCallback(() => {
    const target = stateRef.current.viewTicker;
    if (!target) return;
    abortControllersRef.current[target]?.abort();
    delete abortControllersRef.current[target];
    dispatch({ kind: "clearSlot", ticker: target });
  }, []);

  /** 활성 슬롯만 중지(running→error) + 그 컨트롤러만 abort. */
  const stop = useCallback(() => {
    const target = stateRef.current.viewTicker;
    if (!target) return;
    dispatch({ kind: "halt", ticker: target });
    abortControllersRef.current[target]?.abort();
  }, []);

  /** 패널 숨기기 — 분석은 백그라운드 유지, 스트림 중단 없음. */
  const close = useCallback(() => {
    dispatch({ kind: "setOpen", open: false });
  }, []);

  const dismissReanalysisPrompt = useCallback(() => {
    dispatch({ kind: "setReanalysisPrompt", show: false });
  }, []);

  /** 슬롯(탭) 닫기 — 컨트롤러 abort + 제거. */
  const dismissSlot = useCallback((ticker: string) => {
    abortControllersRef.current[ticker]?.abort();
    delete abortControllersRef.current[ticker];
    dispatch({ kind: "removeSlot", ticker });
  }, []);

  // ── 파생값(투영·탭·분석주인) ───────────────────────────────────────────────

  const activeSlot = state.viewTicker
    ? state.slots[state.viewTicker] ?? null
    : null;

  const projected = useMemo(() => {
    if (!activeSlot) return EMPTY_PROJECTION;
    return {
      provider: activeSlot.provider,
      agents: activeSlot.agents,
      reports: activeSlot.reports,
      debate: activeSlot.debate,
      debatingSide: activeSlot.debatingSide,
      final: activeSlot.final,
      sentiment: activeSlot.sentiment,
      error: activeSlot.error,
      resumeFrom: activeSlot.resumeFrom,
      isRunning: activeSlot.isRunning,
      doneCount: doneCountOf(activeSlot),
    };
  }, [activeSlot]);

  const tabs = useMemo<AnalysisTab[]>(
    () =>
      Object.values(state.slots)
        .filter(isLiveSlot)
        .sort((a, b) => a.startedAt - b.startedAt)
        .map((s) => ({
          ticker: s.ticker,
          name: s.name,
          isRunning: s.isRunning,
          doneCount: doneCountOf(s),
          agentCount: s.agents.length,
        })),
    [state.slots],
  );

  const runningTickers = useMemo(
    () => Object.values(state.slots).filter((s) => s.isRunning).map((s) => s.ticker),
    [state.slots],
  );

  const analyzingTicker = useMemo(
    () => deriveAnalyzingTicker(state.slots),
    [state.slots],
  );

  const panelTicker = state.isOpen ? state.viewTicker : analyzingTicker;

  const isTickerRunning = useCallback(
    (ticker: string) => runningTickers.includes(ticker),
    [runningTickers],
  );

  const value = useMemo<AIAnalysisContextValue>(
    () => ({
      ...projected,
      analyzingTicker,
      viewTicker: state.viewTicker,
      panelTicker,
      isOpen: state.isOpen,
      showReanalysisPrompt: state.showReanalysisPrompt,
      tabs,
      limitNotice: state.limitNotice,
      openFor,
      open,
      start,
      switchTab,
      isTickerRunning,
      dismissSlot,
      chooseAgain,
      run,
      resume,
      stop,
      close,
      dismissReanalysisPrompt,
    }),
    [
      projected, analyzingTicker, state.viewTicker, panelTicker, state.isOpen,
      state.showReanalysisPrompt, tabs, state.limitNotice,
      openFor, open, start, switchTab, isTickerRunning, dismissSlot,
      chooseAgain, run, resume, stop, close, dismissReanalysisPrompt,
    ],
  );

  return (
    <AIAnalysisContext.Provider value={value}>
      {children}
    </AIAnalysisContext.Provider>
  );
}
