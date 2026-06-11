"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAIAnalysisStream } from "@/lib/api/stock/aiAnalysis";
import {
  AGENT_ORDER,
  INITIAL_AGENT_STATES,
  type AIAnalysisEvent,
  type AgentKey,
  type AgentState,
  type DebateMessage,
  type FinalDecision,
  type ResumeState,
} from "@/lib/types/stock/aiAnalysis";

export interface AIAnalysisHook {
  isOpen: boolean;
  isRunning: boolean;
  isMinimized: boolean;
  showReanalysisPrompt: boolean;
  agents: AgentState[];
  reports: Partial<Record<AgentKey, string>>;
  debate: DebateMessage[];
  debatingSide: "bull" | "bear" | null;
  final: FinalDecision | null;
  error: string | null;
  /** 재개 가능한 에이전트 — 실패하거나 중지된 첫 에이전트 */
  resumeFrom: AgentKey | null;
  /** 처음 열기 또는 기존 결과 패널 재열기. 결과 없으면 자동 분석 시작. */
  open: () => void;
  run: () => void;
  /** fromAgent부터 재개 — 이전 완료 결과는 유지 */
  resume: (fromAgent: AgentKey) => void;
  stop: () => void;
  close: () => void;
  toggleMinimize: () => void;
  dismissReanalysisPrompt: () => void;
}

export function useAIAnalysis(ticker: string): AIAnalysisHook {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showReanalysisPrompt, setShowReanalysisPrompt] = useState(false);
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENT_STATES);
  const [reports, setReports] = useState<Partial<Record<AgentKey, string>>>({});
  const [debate, setDebate] = useState<DebateMessage[]>([]);
  const [debatingSide, setDebatingSide] = useState<"bull" | "bear" | null>(null);
  const [final, setFinal] = useState<FinalDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeFrom, setResumeFrom] = useState<AgentKey | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // stale closure 방지용 refs
  const reportsRef = useRef<Partial<Record<AgentKey, string>>>({});
  const debateRef = useRef<DebateMessage[]>([]);
  const agentsRef = useRef<AgentState[]>(INITIAL_AGENT_STATES);
  const isRunningRef = useRef(false);
  useEffect(() => { reportsRef.current = reports; }, [reports]);
  useEffect(() => { debateRef.current = debate; }, [debate]);
  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

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
          // 토론 에이전트(bear 포함) 에러는 bull부터 재개
          const resumeKey: AgentKey = event.agent === "bear" ? "bull" : event.agent;
          setResumeFrom((prev) => prev ?? resumeKey);
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

      case "final":
        setFinal(event.data);
        break;

      case "error":
        setError(event.message);
        setIsRunning(false);
        break;

      case "done":
        setIsRunning(false);
        break;
    }
  }, []);

  // ── 스트림 시작 공통 로직 ──────────────────────────────────────────────────

  const startStream = useCallback((
    fromAgent?: AgentKey,
    preState?: ResumeState,
  ) => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setError(null);
    setResumeFrom(null);
    setIsRunning(true);
    setIsOpen(true);
    setIsMinimized(false);
    setShowReanalysisPrompt(false);

    fetchAIAnalysisStream(ticker, handleEvent, abort.signal, fromAgent, preState)
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        const msg = (err as { message?: string })?.message ?? "분석 중 오류가 발생했어요.";
        console.error("[AIAnalysis] fetch 오류:", msg);
        setError(msg);
        setIsRunning(false);
      });
  }, [ticker, handleEvent]);

  // ── 공개 API ───────────────────────────────────────────────────────────────

  /** 처음부터 전체 재실행 */
  const run = useCallback(() => {
    setAgents(INITIAL_AGENT_STATES);
    setReports({});
    setDebate([]);
    setDebatingSide(null);
    setFinal(null);
    setShowReanalysisPrompt(false);
    startStream();
  }, [startStream]);

  /**
   * 패널 열기.
   * - 분석 이력 없으면 자동 시작
   * - 이력 있으면 패널 열고 재분석 프롬프트 표시
   */
  const open = useCallback(() => {
    const allPending = agentsRef.current.every(a => a.status === "pending");
    if (allPending) {
      run();
    } else {
      setIsOpen(true);
      setIsMinimized(false);
      // 분석 진행 중에는 재분석 배너 표시 안 함
      if (!isRunningRef.current) {
        setShowReanalysisPrompt(true);
      }
    }
  }, [run]);

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
      bullArgument:       fromIndex > AGENT_ORDER.indexOf("bull")             ? (accBull || undefined)             : undefined,
      bearArgument:       fromIndex > AGENT_ORDER.indexOf("bear")             ? (accBear || undefined)             : undefined,
      researchPlan:       fromIndex > AGENT_ORDER.indexOf("research_manager") ? currentReports["research_manager"] : undefined,
      riskAssessment:     fromIndex > AGENT_ORDER.indexOf("risk")             ? currentReports["risk"]             : undefined,
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

  const stop = useCallback(() => {
    setAgents((prev) => {
      const running = prev.find((a) => a.status === "running");
      if (running) {
        // 토론 에이전트는 bull부터 재개
        const resumeKey: AgentKey = running.key === "bear" ? "bull" : running.key;
        setResumeFrom((rf) => rf ?? resumeKey);
        // 중지된 에이전트를 error로 전환 (스피너 제거 + 재시도 버튼 표시)
        return prev.map((a) =>
          a.key === running.key ? { ...a, status: "error", streamingChunk: "" } : a,
        );
      }
      return prev;
    });
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  const close = useCallback(() => {
    abortRef.current?.abort();
    setIsOpen(false);
    setIsRunning(false);
    setIsMinimized(false);
    setShowReanalysisPrompt(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((m) => !m);
  }, []);

  const dismissReanalysisPrompt = useCallback(() => {
    setShowReanalysisPrompt(false);
  }, []);

  return {
    isOpen, isRunning, isMinimized, showReanalysisPrompt,
    agents, reports, debate, debatingSide,
    final, error, resumeFrom,
    open, run, resume, stop, close, toggleMinimize, dismissReanalysisPrompt,
  };
}
