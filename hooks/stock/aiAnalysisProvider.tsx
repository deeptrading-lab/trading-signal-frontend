"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query/queryKeys";
import { fetchAIAnalysisStream } from "@/lib/api/stock/aiAnalysis";
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
 * 두 종류의 ticker 를 구분한다:
 *   - analyzingTicker: 실제 분석이 도는(또는 마지막으로 돈) 종목. 백그라운드 스트림의 주인.
 *   - viewTicker:      패널이 현재 보여주는 종목. analyzingTicker 와 같으면 라이브 상태,
 *                      다르면 그 종목의 idle 진입(공급자 선택/이전 결론)을 보여준다.
 *
 * 동시 분석은 1건 — 다른 종목 분석을 새로 시작하면(start) 진행 중이던 스트림은 중단된다.
 */

export interface AIAnalysisContextValue {
  provider: AIAnalysisProvider;
  /** 분석이 도는(또는 마지막으로 돈) 종목. 없으면 null. */
  analyzingTicker: string | null;
  /** 패널이 현재 보여주는 종목. */
  viewTicker: string | null;
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
  /** 진행 표시용 — 완료(done)된 에이전트 수. */
  doneCount: number;
  /** 패널을 ticker 기준으로 연다. analyzingTicker 와 다르면 그 종목 idle 진입을 보여준다. */
  openFor: (ticker: string) => void;
  /** 재열기 탭 — 현재 분석 중인 종목의 라이브 뷰를 연다. */
  open: () => void;
  /** 공급자 선택 → viewTicker 종목을 처음부터 분석. 다른 종목 진행 중이면 중단 후 시작. */
  start: (provider: AIAnalysisProvider) => void;
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

export function AIAnalysisProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<AIAnalysisProvider>("codex");
  const [analyzingTicker, setAnalyzingTicker] = useState<string | null>(null);
  const [viewTicker, setViewTicker] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showReanalysisPrompt, setShowReanalysisPrompt] = useState(false);
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENT_STATES);
  const [reports, setReports] = useState<Partial<Record<AgentKey, string>>>({});
  const [debate, setDebate] = useState<DebateMessage[]>([]);
  const [debatingSide, setDebatingSide] = useState<"bull" | "bear" | null>(null);
  const [final, setFinal] = useState<FinalDecision | null>(null);
  const [sentiment, setSentiment] = useState<SentimentReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeFrom, setResumeFrom] = useState<AgentKey | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const providerRef = useRef<AIAnalysisProvider>("codex");
  const analyzingTickerRef = useRef<string | null>(null);
  const viewTickerRef = useRef<string | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // 라우트 이동 시 패널 자동 접기 — 분석 스트림은 백그라운드에서 계속(중단 없음).
  //   navbar 클릭 등으로 경로가 바뀌면 오버레이가 새 페이지를 덮은 채 남지 않도록 닫는다.
  //   재열기 탭(우측)은 그대로 노출되어 언제든 다시 펼칠 수 있다.
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    setIsOpen(false);
    setShowReanalysisPrompt(false);
  }, [pathname]);

  // stale closure 방지용 refs
  const reportsRef = useRef<Partial<Record<AgentKey, string>>>({});
  const debateRef = useRef<DebateMessage[]>([]);
  const agentsRef = useRef<AgentState[]>(INITIAL_AGENT_STATES);
  const isRunningRef = useRef(false);
  useEffect(() => { reportsRef.current = reports; }, [reports]);
  useEffect(() => { debateRef.current = debate; }, [debate]);
  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { providerRef.current = provider; }, [provider]);
  useEffect(() => { analyzingTickerRef.current = analyzingTicker; }, [analyzingTicker]);
  useEffect(() => { viewTickerRef.current = viewTicker; }, [viewTicker]);

  const resetResults = useCallback(() => {
    setAgents(INITIAL_AGENT_STATES);
    setReports({});
    setDebate([]);
    setDebatingSide(null);
    setFinal(null);
    setSentiment(null);
    setError(null);
    setResumeFrom(null);
    setShowReanalysisPrompt(false);
  }, []);

  // ── 공통 이벤트 핸들러 ─────────────────────────────────────────────────────

  const handleEvent = useCallback((event: AIAnalysisEvent) => {
    if (event.type !== "stream" && event.type !== "debate_stream") {
      console.log("[AIAnalysis] event:", event.type,
        event.type === "progress" ? `${event.agent} ${event.status}` :
        event.type === "report"   ? `${event.agent} len=${event.content.length}` :
        event.type === "debate"   ? `${event.speaker} R${event.round} len=${event.content.length}` : "");
    }

    switch (event.type) {
      case "progress":
        setAgents((prev) =>
          prev.map((a) =>
            a.key === event.agent
              ? { ...a, status: event.status, streamingChunk: event.status === "done" ? "" : a.streamingChunk }
              : a,
          ),
        );
        if (event.status === "error") {
          setResumeFrom((prev) => prev ?? getResumeKey(event.agent));
        }
        break;

      case "stream":
        setAgents((prev) =>
          prev.map((a) =>
            a.key === event.agent
              ? { ...a, streamingChunk: a.streamingChunk + event.chunk }
              : a,
          ),
        );
        break;

      case "report":
        setReports((prev) => ({ ...prev, [event.agent]: event.content }));
        setAgents((prev) =>
          prev.map((a) =>
            a.key === event.agent ? { ...a, streamingChunk: "" } : a,
          ),
        );
        break;

      case "debate_stream":
        setDebatingSide(event.speaker);
        setDebate((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.speaker === event.speaker && last.round === event.round && last.isStreaming) {
            return [...prev.slice(0, -1), { ...last, content: last.content + event.chunk }];
          }
          return [...prev, { speaker: event.speaker, content: event.chunk, isStreaming: true, round: event.round }];
        });
        break;

      case "debate":
        setDebatingSide(null);
        setDebate((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.speaker === event.speaker && last.round === event.round && last.isStreaming) {
            return [...prev.slice(0, -1), { speaker: event.speaker, content: event.content, isStreaming: false, round: event.round }];
          }
          return [...prev, { speaker: event.speaker, content: event.content, isStreaming: false, round: event.round }];
        });
        break;

      case "sentiment":
        setSentiment(event.report);
        break;

      case "final":
        setFinal(event.data);
        break;

      case "error":
        setError(event.message);
        setIsRunning(false);
        break;

      case "done":
        setIsRunning(false);
        // 분석 완료 → 저장된 결론/목록 캐시 무효화로 /analyze 카드를 자동 갱신.
        //   서버는 final 직후 upsert 를 await 하므로 done 시점엔 Supabase 저장이 끝나 있다.
        queryClient.invalidateQueries({ queryKey: queryKeys.stock.aiDecisions });
        if (analyzingTickerRef.current) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.stock.aiDecision(analyzingTickerRef.current),
          });
        }
        break;
    }
  }, [queryClient]);

  // ── 스트림 시작 공통 로직 ──────────────────────────────────────────────────

  const startStream = useCallback((
    targetTicker: string,
    fromAgent?: AgentKey,
    preState?: ResumeState,
    requestedProvider: AIAnalysisProvider = providerRef.current,
  ) => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    // 분석·뷰 모두 대상 종목으로 고정(다른 종목 진행 중이었다면 위 abort 로 중단됨).
    setAnalyzingTicker(targetTicker);
    analyzingTickerRef.current = targetTicker;
    setViewTicker(targetTicker);
    viewTickerRef.current = targetTicker;

    setError(null);
    setResumeFrom(null);
    setIsRunning(true);
    setIsOpen(true);
    setShowReanalysisPrompt(false);

    fetchAIAnalysisStream(
      targetTicker,
      requestedProvider,
      handleEvent,
      abort.signal,
      fromAgent,
      preState,
    )
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        const msg = (err as { message?: string })?.message ?? "분석 중 오류가 발생했어요.";
        console.error("[AIAnalysis] fetch 오류:", msg);
        setError(msg);
        setIsRunning(false);
      });
  }, [handleEvent]);

  // ── 공개 API ───────────────────────────────────────────────────────────────

  /** 직전 공급자로 viewTicker(=analyzingTicker) 를 처음부터 전체 재실행 — 에러 재시도 전용 */
  const run = useCallback(() => {
    const target = analyzingTickerRef.current;
    if (!target) return;
    resetResults();
    startStream(target, undefined, undefined, providerRef.current);
  }, [resetResults, startStream]);

  /**
   * 패널을 ticker 기준으로 연다 — 자동 실행하지 않는다.
   * - ticker 가 분석 중인 종목과 같으면: 라이브 상태를 보여주고, 결과만 있고 진행 중이 아니면 재분석 프롬프트.
   * - 다르면: 그 종목의 idle 진입(공급자 선택/이전 결론). 백그라운드 분석은 건드리지 않는다.
   */
  const openFor = useCallback((ticker: string) => {
    setViewTicker(ticker);
    viewTickerRef.current = ticker;
    setIsOpen(true);
    if (ticker === analyzingTickerRef.current) {
      const allPending = agentsRef.current.every(a => a.status === "pending");
      if (!allPending && !isRunningRef.current) setShowReanalysisPrompt(true);
    } else {
      setShowReanalysisPrompt(false);
    }
  }, []);

  /** 재열기 탭 — 현재 분석 중인 종목의 라이브 뷰로 연다. */
  const open = useCallback(() => {
    const target = analyzingTickerRef.current ?? viewTickerRef.current;
    if (!target) return;
    openFor(target);
  }, [openFor]);

  /** 공급자 선택 화면에서 공급자 확정 → viewTicker 종목을 처음부터 분석 시작 */
  const start = useCallback((nextProvider: AIAnalysisProvider) => {
    const target = viewTickerRef.current;
    if (!target) return;
    providerRef.current = nextProvider;
    setProvider(nextProvider);
    resetResults();
    startStream(target, undefined, undefined, nextProvider);
  }, [resetResults, startStream]);

  /** 결과를 비워 공급자 선택 화면으로 복귀(다른 AI로 재선택) */
  const chooseAgain = useCallback(() => {
    resetResults();
  }, [resetResults]);

  /**
   * fromAgent부터 재개.
   * fromAgent 이전 에이전트의 결과는 유지하고, 이후만 리셋 후 재실행.
   * 토론(bull/bear)은 항상 bull부터 재실행.
   */
  const resume = useCallback((fromAgent: AgentKey) => {
    const target = analyzingTickerRef.current;
    if (!target) return;
    // bear는 항상 bull부터 재실행
    const effectiveFrom: AgentKey = fromAgent === "bear" ? "bull" : fromAgent;
    const fromIndex = AGENT_ORDER.indexOf(effectiveFrom);

    const currentReports = reportsRef.current;
    const currentDebate = debateRef.current;

    // 완료된 토론 메시지를 라운드별로 누적
    const bullMsgs = currentDebate.filter(d => d.speaker === "bull" && !d.isStreaming);
    const bearMsgs = currentDebate.filter(d => d.speaker === "bear" && !d.isStreaming);
    const accBull = bullMsgs.map(m => m.content).join("\n\n---\n\n");
    const accBear = bearMsgs.map(m => m.content).join("\n\n---\n\n");

    const preState: ResumeState = {
      marketReport:       fromIndex > AGENT_ORDER.indexOf("market")           ? currentReports["market"]           : undefined,
      newsReport:         fromIndex > AGENT_ORDER.indexOf("news")             ? currentReports["news"]             : undefined,
      fundamentalsReport: fromIndex > AGENT_ORDER.indexOf("fundamentals")     ? currentReports["fundamentals"]     : undefined,
      socialReport:       fromIndex > AGENT_ORDER.indexOf("social")           ? currentReports["social"]           : undefined,
      bullArgument:       fromIndex > AGENT_ORDER.indexOf("bull")             ? (accBull || undefined)             : undefined,
      bearArgument:       fromIndex > AGENT_ORDER.indexOf("bear")             ? (accBear || undefined)             : undefined,
      researchPlan:       fromIndex > AGENT_ORDER.indexOf("research_manager") ? currentReports["research_manager"] : undefined,
      traderProposal:     fromIndex > AGENT_ORDER.indexOf("trader")           ? currentReports["trader"]           : undefined,
      riskRisky:          fromIndex > AGENT_ORDER.indexOf("risk_risky")       ? currentReports["risk_risky"]       : undefined,
      riskNeutral:        fromIndex > AGENT_ORDER.indexOf("risk_neutral")     ? currentReports["risk_neutral"]     : undefined,
      riskSafe:           fromIndex > AGENT_ORDER.indexOf("risk_safe")        ? currentReports["risk_safe"]        : undefined,
    };

    // fromAgent 이후 UI 상태 리셋
    setAgents((prev) =>
      prev.map((a) =>
        AGENT_ORDER.indexOf(a.key) >= fromIndex
          ? { ...a, status: "pending", streamingChunk: "" }
          : a,
      ),
    );
    setReports((prev) => {
      const next = { ...prev };
      for (let i = fromIndex; i < AGENT_ORDER.length; i++) {
        delete next[AGENT_ORDER[i]];
      }
      return next;
    });
    // social 이전(포함)에서 재개하면 감성도 다시 산출되므로 초기화.
    if (fromIndex <= AGENT_ORDER.indexOf("social")) {
      setSentiment(null);
    }
    if (fromIndex <= AGENT_ORDER.indexOf("bull")) {
      setDebate([]);
    } else if (fromIndex <= AGENT_ORDER.indexOf("bear")) {
      setDebate((prev) => prev.filter((d) => d.speaker !== "bear"));
    }
    if (fromIndex <= AGENT_ORDER.indexOf("portfolio_manager")) {
      setFinal(null);
    }

    startStream(target, effectiveFrom, preState);
  }, [startStream]);

  // running 에이전트 → error 전환 + 스트리밍 토론 메시지 정리 (stop·close 공용)
  const haltRunning = useCallback(() => {
    setAgents((prev) => {
      const runningList = prev.filter((a) => a.status === "running");
      if (runningList.length === 0) return prev;
      const first = runningList[0];
      setResumeFrom((rf) => rf ?? getResumeKey(first.key));
      const runningKeys = new Set(runningList.map((a) => a.key));
      return prev.map((a) =>
        runningKeys.has(a.key) ? { ...a, status: "error", streamingChunk: "" } : a,
      );
    });
    setDebate((prev) => prev.map((d) => d.isStreaming ? { ...d, isStreaming: false } : d));
    setDebatingSide(null);
  }, []);

  const stop = useCallback(() => {
    haltRunning();
    abortRef.current?.abort();
    setIsRunning(false);
  }, [haltRunning]);

  // 패널 숨기기 — 분석은 백그라운드에서 계속, 스트림 중단 없음
  const close = useCallback(() => {
    setIsOpen(false);
    setShowReanalysisPrompt(false);
  }, []);

  const dismissReanalysisPrompt = useCallback(() => {
    setShowReanalysisPrompt(false);
  }, []);

  const doneCount = agents.filter((a) => a.status === "done").length;

  const value: AIAnalysisContextValue = {
    provider,
    analyzingTicker, viewTicker,
    isOpen, isRunning, showReanalysisPrompt,
    agents, reports, debate, debatingSide,
    final, sentiment, error, resumeFrom, doneCount,
    openFor, open, start, chooseAgain, run, resume, stop, close, dismissReanalysisPrompt,
  };

  return (
    <AIAnalysisContext.Provider value={value}>
      {children}
    </AIAnalysisContext.Provider>
  );
}
