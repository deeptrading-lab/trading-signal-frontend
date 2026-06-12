"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Sparkles, Check, RefreshCw, Square,
  ChevronDown, ChevronUp, AlertCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AGENT_META } from "@/lib/types/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { AgentKey } from "@/lib/types/stock/aiAnalysis";
import type { AIAnalysisHook } from "@/hooks/stock/useAIAnalysis";
import { useQueryStockPrice } from "@/hooks/stock/useQueryStockPrice";
import { AnalystCard } from "./ai-analysis/AnalystCard";
import { DebateSection } from "./ai-analysis/DebateSection";
import { PMLoadingCard } from "./ai-analysis/PMLoadingCard";
import { FinalVerdictCard } from "./ai-analysis/FinalVerdictCard";
import { CardDetailOverlay } from "./ai-analysis/CardDetailOverlay";

interface AIAnalysisPanelProps extends AIAnalysisHook {
  ticker: string;
}

export function AIAnalysisPanel({
  ticker,
  isOpen,
  isRunning,
  isMinimized,
  showReanalysisPrompt,
  agents,
  reports,
  debate,
  debatingSide,
  final,
  error,
  resumeFrom,
  open,
  run,
  resume,
  stop,
  close,
  toggleMinimize,
  dismissReanalysisPrompt,
}: AIAnalysisPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedCard, setExpandedCard] = useState<{ title: string; content: string } | null>(null);
  const { data: stockData } = useQueryStockPrice(ticker);
  const displayName = stockData?.name ?? ticker;

  const isAllPending = agents.every((a) => a.status === "pending");
  const hasDebate = debate.length > 0
    || agents.some(a => (a.key === "bull" || a.key === "bear") && a.status !== "pending");

  // 배경 스크롤 잠금 (minimized이면 해제)
  useEffect(() => {
    document.body.style.overflow = (isOpen && !isMinimized) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, isMinimized]);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (expandedCard) setExpandedCard(null);
        else close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close, expandedCard]);

  // 새 에이전트 시작 / 토론 진행 시 자동 스크롤
  useEffect(() => {
    if (!scrollRef.current || isMinimized || final) return;
    const hasRunning = agents.some((a) => a.status === "running");
    if (!hasRunning && debate.length === 0) return;
    const el = scrollRef.current;
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [agents, debate.length, isMinimized, final]);

  // 최종 결론 도착 시 맨 아래로 — DOM 렌더 후 스크롤
  useEffect(() => {
    if (!final || !scrollRef.current || isMinimized) return;
    const el = scrollRef.current;
    const id = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 120);
    return () => clearTimeout(id);
  }, [final, isMinimized]);

  const handleExpand = (title: string, content: string) => setExpandedCard({ title, content });

  const analystKeys: AgentKey[] = ["market", "news", "fundamentals", "social"];

  return (
    <>
      {/* 패널 숨김 상태 — 분석 중이거나 결과 있을 때 우측 탭으로 재열기 */}
      <AnimatePresence>
        {!isOpen && !isAllPending && (
          <motion.button
            key="reopen-tab"
            initial={{ x: 56 }}
            animate={{ x: 0 }}
            exit={{ x: 56 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={open}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[70] flex flex-col items-center gap-2 px-2.5 py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-l-2xl shadow-xl transition-colors cursor-pointer"
            aria-label="AI 분석 패널 열기"
          >
            {isRunning
              ? <Loader2 size={16} className="animate-spin" />
              : <Sparkles size={16} />
            }
            <span className="text-xs font-bold leading-snug text-center">AI<br />분<br />석</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* 스크림 — minimized면 숨김 */}
          {!isMinimized && (
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[65]"
            />
          )}

          {/* 패널 */}
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-0 right-0 z-[70] bg-slate-50 dark:bg-slate-950 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden",
              "w-full",
              isMinimized ? "" : "h-full",
            )}
            aria-label="AI 종합분석"
            role="complementary"
          >
            {/* ── 헤더 ──────────────────────────────────────────────────── */}
            <div className="flex-none flex items-center justify-between px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Sparkles className="text-blue-500 dark:text-blue-400 shrink-0" size={20} />
                <div className="flex flex-col">
                  <h2 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">{displayName}</h2>
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-none mt-0.5">{COPY.panel.title}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* 중지 / 재개 버튼 */}
                {isRunning ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    <Square size={11} fill="currentColor" /> {COPY.panel.stop}
                  </button>
                ) : !isAllPending && (
                  <>
                    {resumeFrom && (
                      <button
                        type="button"
                        onClick={() => resume(resumeFrom)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-md transition-colors cursor-pointer"
                      >
                        <RefreshCw size={11} />
                        {COPY.panel.resumeFrom(AGENT_META.find(m => m.key === resumeFrom)?.label ?? resumeFrom)}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={run}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                    >
                      <RefreshCw size={11} /> {COPY.panel.restartAll}
                    </button>
                  </>
                )}
                {/* 접기/펼치기 */}
                <button
                  type="button"
                  onClick={toggleMinimize}
                  title={isMinimized ? COPY.panel.expand : COPY.panel.minimize}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                >
                  {isMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
                {/* 닫기 */}
                <button
                  type="button"
                  onClick={close}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                  aria-label={COPY.panel.close}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── 접힌 상태면 나머지 숨김 ──────────────────────────────── */}
            {!isMinimized && (
              <>
                {/* ── 에이전트 진행 바 ────────────────────────────────── */}
                <div className="flex-none px-5 py-2.5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {AGENT_META.map((meta) => {
                      const agentStatus = agents.find((a) => a.key === meta.key)?.status ?? "pending";
                      const isError = agentStatus === "error";
                      const isClickable = isError && !isRunning;
                      return (
                        <div
                          key={meta.key}
                          role={isClickable ? "button" : undefined}
                          tabIndex={isClickable ? 0 : undefined}
                          onClick={isClickable ? () => resume(meta.key) : undefined}
                          onKeyDown={isClickable ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              resume(meta.key);
                            }
                          } : undefined}
                          title={isClickable ? COPY.card.resumeTitle(meta.label) : undefined}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-colors",
                            agentStatus === "pending" && "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500",
                            agentStatus === "running" && "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
                            agentStatus === "done" && "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
                            isError && "bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
                            isClickable && "cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50",
                          )}
                        >
                          {agentStatus === "done" && <Check size={10} />}
                          {agentStatus === "running" && <RefreshCw size={10} className="animate-spin" />}
                          {agentStatus === "pending" && <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />}
                          {isError && <RefreshCw size={10} />}
                          {meta.label}
                          {isClickable && <span className="opacity-70">{COPY.card.retry}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── 스크롤 영역 (relative: 카드 상세 오버레이 기준점) ─ */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
                  {/* 카드 상세 오버레이 */}
                  <AnimatePresence>
                    {expandedCard && (
                      <CardDetailOverlay
                        key="detail"
                        title={expandedCard.title}
                        content={expandedCard.content}
                        onClose={() => setExpandedCard(null)}
                      />
                    )}
                  </AnimatePresence>

                  <div className="p-4 space-y-4">
                    {/* 재분석 프롬프트 */}
                    <AnimatePresence>
                      {showReanalysisPrompt && (
                        <motion.div
                          key="reanalysis"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                            {COPY.reanalysis.prompt}
                          </p>
                          <div className="flex gap-2 flex-none">
                            <button
                              type="button"
                              onClick={run}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              {COPY.reanalysis.confirm}
                            </button>
                            <button
                              type="button"
                              onClick={dismissReanalysisPrompt}
                              className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-medium cursor-pointer hover:opacity-70"
                            >
                              {COPY.reanalysis.dismiss}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 시작 전 빈 상태 */}
                    {isAllPending && !error && !isRunning && (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20 opacity-70">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Sparkles className="text-slate-400 w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{COPY.empty.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">{COPY.empty.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={run}
                          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
                        >
                          {COPY.empty.start}
                        </button>
                      </div>
                    )}

                    {/* 오류 */}
                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">{error}</p>
                        <button type="button" onClick={run} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                          {COPY.errorState.retry}
                        </button>
                      </div>
                    )}

                    {/* ── Row 1: 분석가 4개 카드 ─────────────────────── */}
                    {analystKeys.some(k => agents.find(a => a.key === k)?.status !== "pending") && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {analystKeys.map((key) => {
                          const meta = AGENT_META.find(m => m.key === key)!;
                          const agentState = agents.find(a => a.key === key)!;
                          if (agentState.status === "pending") {
                            return (
                              <div key={key} className="bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 min-h-[180px]" />
                            );
                          }
                          return (
                            <AnalystCard
                              key={key}
                              meta={meta}
                              status={agentState.status}
                              content={reports[key]}
                              streamingChunk={agentState.streamingChunk}
                              isRunning={isRunning}
                              onExpand={handleExpand}
                              onRetry={agentState.status === "error" ? () => resume(key) : undefined}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* ── Row 2: 강세 vs 약세 토론 ────────────────────── */}
                    {hasDebate && (
                      <DebateSection
                        debate={debate}
                        debatingSide={debatingSide}
                        bullAgent={agents.find(a => a.key === "bull")!}
                        bearAgent={agents.find(a => a.key === "bear")!}
                        onExpand={handleExpand}
                      />
                    )}

                    {/* ── Row 3+4: 리서치 매니저 + 트레이더 (2-col) ──────── */}
                    {(["research_manager", "trader"] as AgentKey[]).some(
                      k => agents.find(a => a.key === k)?.status !== "pending"
                    ) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(["research_manager", "trader"] as AgentKey[]).map((key) => {
                          const meta = AGENT_META.find(m => m.key === key)!;
                          const agentState = agents.find(a => a.key === key)!;
                          if (agentState.status === "pending") {
                            return <div key={key} className="bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 min-h-[180px]" />;
                          }
                          if (key === "trader") {
                            return (
                              <div key={key} className="relative">
                                <span className="absolute -top-2 right-3 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
                                  🧠 심층 추론
                                </span>
                                <AnalystCard
                                  meta={meta}
                                  status={agentState.status}
                                  content={reports[key]}
                                  streamingChunk={agentState.streamingChunk}
                                  isRunning={isRunning}
                                  onExpand={handleExpand}
                                  onRetry={agentState.status === "error" ? () => resume(key) : undefined}
                                />
                              </div>
                            );
                          }
                          return (
                            <AnalystCard
                              key={key}
                              meta={meta}
                              status={agentState.status}
                              content={reports[key]}
                              streamingChunk={agentState.streamingChunk}
                              isRunning={isRunning}
                              onExpand={handleExpand}
                              onRetry={agentState.status === "error" ? () => resume(key) : undefined}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* ── Row 5: 리스크 3개 병렬 (3-col grid) ───────────────── */}
                    {(["risk_risky", "risk_neutral", "risk_safe"] as AgentKey[]).some(
                      k => agents.find(a => a.key === k)?.status !== "pending"
                    ) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(["risk_risky", "risk_neutral", "risk_safe"] as AgentKey[]).map((key) => {
                          const meta = AGENT_META.find(m => m.key === key)!;
                          const agentState = agents.find(a => a.key === key)!;
                          if (agentState.status === "pending") {
                            return <div key={key} className="bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 min-h-[160px]" />;
                          }
                          return (
                            <AnalystCard
                              key={key}
                              meta={meta}
                              status={agentState.status}
                              content={reports[key]}
                              streamingChunk={agentState.streamingChunk}
                              isRunning={isRunning}
                              onExpand={handleExpand}
                              onRetry={agentState.status === "error" ? () => resume(key) : undefined}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* ── Row 6: 최종 결론 (portfolio_manager 결과) ──────── */}
                    {(() => {
                      const pmAgent = agents.find(a => a.key === "portfolio_manager")!;
                      if (final) return <FinalVerdictCard data={final} />;
                      if (pmAgent.status === "running") {
                        return (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <PMLoadingCard streamingChunk={pmAgent.streamingChunk} />
                          </motion.div>
                        );
                      }
                      if (pmAgent.status === "error") {
                        return (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                              <p className="text-sm font-medium text-red-600 dark:text-red-400">최종 결론 도출 실패</p>
                            </div>
                            {!isRunning && (
                              <button
                                type="button"
                                onClick={() => resume("portfolio_manager")}
                                className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 cursor-pointer hover:opacity-70"
                              >
                                <RefreshCw size={11} /> {COPY.card.retry}
                              </button>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}

                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
