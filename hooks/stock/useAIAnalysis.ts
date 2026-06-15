"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAIAnalysisStream } from "@/lib/api/stock/aiAnalysis";
import { getRecentDecisions, saveDecision } from "@/lib/api/stock/aiDecisionStore";
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

export interface AIAnalysisHook {
  provider: AIAnalysisProvider;
  isOpen: boolean;
  isRunning: boolean;
  showReanalysisPrompt: boolean;
  agents: AgentState[];
  reports: Partial<Record<AgentKey, string>>;
  debate: DebateMessage[];
  debatingSide: "bull" | "bear" | null;
  final: FinalDecision | null;
  /** SNS 분석가 정형 감성 — 파싱 성공 시에만, 아니면 null(배지 미표시). */
  sentiment: SentimentReport | null;
  error: string | null;
  /** 재개 가능한 에이전트 — 실패하거나 중지된 첫 에이전트 */
  resumeFrom: AgentKey | null;
  /** 패널만 연다(자동 실행 X). 결과 없으면 빈 상태에 공급자 선택 화면, 결과 있으면 재분석 프롬프트. */
  open: () => void;
  /** 공급자 선택 화면에서 공급자를 고르면 처음부터 분석 시작. */
  start: (provider: AIAnalysisProvider) => void;
  /** 결과를 비우고 공급자 선택 화면으로 복귀(다른 AI로 재선택). */
  chooseAgain: () => void;
  /** 직전 공급자로 처음부터 재실행 — 에러 재시도 전용. */
  run: () => void;
  /** fromAgent부터 재개 — 이전 완료 결과는 유지 */
  resume: (fromAgent: AgentKey) => void;
  stop: () => void;
  close: () => void;
  dismissReanalysisPrompt: () => void;
}

export function useAIAnalysis(ticker: string): AIAnalysisHook {
  const [provider, setProvider] = useState<AIAnalysisProvider>("codex");
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

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // stale closure 방지용 refs
  const reportsRef = useRef<Partial<Record<AgentKey, string>>>({});
  const debateRef = useRef<DebateMessage[]>([]);
  const agentsRef = useRef<AgentState[]>(INITIAL_AGENT_STATES);
  const isRunningRef = useRef(false);
  const finalRef = useRef<FinalDecision | null>(null);
  const sentimentRef = useRef<SentimentReport | null>(null);
  useEffect(() => { reportsRef.current = reports; }, [reports]);
  useEffect(() => { debateRef.current = debate; }, [debate]);
  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { finalRef.current = final; }, [final]);
  useEffect(() => { sentimentRef.current = sentiment; }, [sentiment]);
  useEffect(() => { providerRef.current = provider; }, [provider]);

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

  // 종목이 바뀌면(같은 페이지에서 다른 ticker 로 라우팅) 진행 중 스트림을 끊고 상태를 초기화한다.
  //   이전 종목의 분석이 새 종목 화면에 남거나, done 이벤트가 잘못된 ticker 로 saveDecision 되는 것을 막는다.
  const prevTickerRef = useRef(ticker);
  useEffect(() => {
    if (prevTickerRef.current === ticker) return;
    prevTickerRef.current = ticker;
    abortRef.current?.abort();
    setIsRunning(false);
    setIsOpen(false);
    resetResults();
  }, [ticker, resetResults]);

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
        if (finalRef.current) {
          saveDecision({
            ticker,
            date: new Date().toISOString(),
            verdict: finalRef.current.verdict,
            confidence: finalRef.current.confidence,
            reasoning: finalRef.current.reasoning,
            target_pct: finalRef.current.target_pct,
            stop_loss_pct: finalRef.current.stop_loss_pct,
            short_term_outlook: finalRef.current.short_term_outlook,
            mid_term_outlook: finalRef.current.mid_term_outlook,
            sentiment_score: sentimentRef.current?.score ?? null,
            sentiment_band: sentimentRef.current?.band ?? null,
          });
        }
        setIsRunning(false);
        break;
    }
  }, [ticker]);

  // ── 스트림 시작 공통 로직 ──────────────────────────────────────────────────

  const startStream = useCallback((
    fromAgent?: AgentKey,
    preState?: ResumeState,
    requestedProvider: AIAnalysisProvider = providerRef.current,
  ) => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setError(null);
    setResumeFrom(null);
    setIsRunning(true);
    setIsOpen(true);
    setShowReanalysisPrompt(false);

    const prevDecisions = getRecentDecisions(ticker);
    fetchAIAnalysisStream(
      ticker,
      requestedProvider,
      handleEvent,
      abort.signal,
      fromAgent,
      preState,
      prevDecisions,
    )
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        const msg = (err as { message?: string })?.message ?? "분석 중 오류가 발생했어요.";
        console.error("[AIAnalysis] fetch 오류:", msg);
        setError(msg);
        setIsRunning(false);
      });
  }, [ticker, handleEvent]);

  // ── 공개 API ───────────────────────────────────────────────────────────────

  /** 직전 공급자로 처음부터 전체 재실행 — 에러 재시도 전용 */
  const run = useCallback(() => {
    resetResults();
    startStream(undefined, undefined, providerRef.current);
  }, [resetResults, startStream]);

  /**
   * 패널 열기 — 자동 실행하지 않는다.
   * - 분석 이력 없으면 빈 상태에 공급자 선택 화면(ProviderChooser)이 렌더된다.
   * - 이력 있으면(진행 중 아님) 패널 열고 재분석 프롬프트 표시.
   */
  const open = useCallback(() => {
    setIsOpen(true);
    const allPending = agentsRef.current.every(a => a.status === "pending");
    if (!allPending && !isRunningRef.current) {
      setShowReanalysisPrompt(true);
    }
  }, []);

  /** 공급자 선택 화면에서 공급자 확정 → 처음부터 분석 시작 */
  const start = useCallback((nextProvider: AIAnalysisProvider) => {
    providerRef.current = nextProvider;
    setProvider(nextProvider);
    resetResults();
    startStream(undefined, undefined, nextProvider);
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

    startStream(effectiveFrom, preState);
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

  return {
    provider,
    isOpen, isRunning, showReanalysisPrompt,
    agents, reports, debate, debatingSide,
    final, sentiment, error, resumeFrom,
    open, start, chooseAgain, run, resume, stop, close, dismissReanalysisPrompt,
  };
}
