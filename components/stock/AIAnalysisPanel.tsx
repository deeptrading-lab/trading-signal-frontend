"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Sparkles, Check, RefreshCw, Square,
  AlertCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AGENT_META } from "@/lib/types/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { AgentKey } from "@/lib/types/stock/aiAnalysis";
import type { AIAnalysisContextValue } from "@/hooks/stock/aiAnalysisProvider";
import { useQueryStockPrice } from "@/hooks/stock/useQueryStockPrice";
import { useQueryAIDecision } from "@/hooks/stock/useQueryAIDecision";
import { useQueryAIProviders } from "@/hooks/stock/useQueryAIProviders";
import { useConfidenceCalibration } from "@/hooks/scorecard/useConfidenceCalibration";
import { AnalystCard } from "./ai-analysis/AnalystCard";
import { DebateSection } from "./ai-analysis/DebateSection";
import { PMLoadingCard } from "./ai-analysis/PMLoadingCard";
import { FinalVerdictCard } from "./ai-analysis/FinalVerdictCard";
import { CardDetailOverlay } from "./ai-analysis/CardDetailOverlay";
import { ProviderChooser } from "./ai-analysis/ProviderChooser";
import { SlideToAnalyze } from "./ai-analysis/SlideToAnalyze";
import type {
  AIAnalysisDecisionSnapshot,
  AIAnalysisProvider,
} from "@/lib/types/stock/aiAnalysis";

interface AIAnalysisPanelProps extends AIAnalysisContextValue {
  ticker: string;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function PreviousDecisionIntro({
  snapshot,
  onAnalyze,
  onChooseProvider,
}: {
  snapshot: AIAnalysisDecisionSnapshot;
  onAnalyze: (provider: AIAnalysisProvider) => void;
  onChooseProvider: () => void;
}) {
  // 가용 provider 로 슬라이드 스위치를 그릴지 결정. 0개·조회 중·Vercel·실패는 슬라이드 대신 폴백.
  const { data: providerData, isLoading: isProvidersLoading } = useQueryAIProviders();
  const available = providerData?.available ?? [];
  const canSlide =
    !isProvidersLoading && !providerData?.vercel && available.length >= 1;
  // 보정된 신뢰도(scorecard-feedback (가)) — 이전 결론 카드에도 곁들인다(표시 전용·무회귀).
  const { getCalibration, minSampleN } = useConfidenceCalibration();

  return (
    // 라이브 분석 뷰(풀 width)와 동일하게 패널 폭을 꽉 채운다 — 데스크탑에서 좌우 여백 제거.
    // 배치: 안내 박스 → 슬라이드 스위치 → 이전 결론 카드.
    <div className="w-full space-y-3">
      {/* 안내 박스 — 좌측 안내 텍스트 + 우측 슬라이드 스위치(한 박스 안에). */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/20 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
              {COPY.previousDecision.title}
              <span className="ml-1.5 font-normal text-blue-600/70 dark:text-blue-300/70">
                · {COPY.previousDecision.meta(
                  formatUpdatedAt(snapshot.updatedAt),
                  COPY.provider[snapshot.provider],
                )}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-blue-600/70 dark:text-blue-300/70 leading-relaxed">
              {COPY.previousDecision.pmOnly}
            </p>
          </div>

          {/* 우측 슬라이드 스위치 — 드래그/클릭/키보드 동일하게 onAnalyze(provider) 실행(시안 A). */}
          <div className="w-full shrink-0 sm:w-auto">
            {canSlide ? (
              <SlideToAnalyze
                available={available}
                defaultProvider={snapshot.provider}
                onStart={onAnalyze}
              />
            ) : isProvidersLoading ? (
              // 조회 중 — 활성 스위치 대신 스켈레톤(스펙 §S5).
              <div
                className="h-11 w-full sm:w-[22rem] animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"
                role="status"
                aria-live="polite"
                aria-label={COPY.chooser.loading}
              />
            ) : (
              // 가용 0개/Vercel/실패 — 슬라이드 전제가 안 됨. 기존 공급자 선택 화면으로 폴백.
              <button
                type="button"
                onClick={onChooseProvider}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold transition-colors cursor-pointer"
              >
                {COPY.previousDecision.chooseProvider}
              </button>
            )}
          </div>
        </div>
      </div>

      <FinalVerdictCard
        data={snapshot.decision}
        calibration={getCalibration(snapshot.decision.confidence)}
        calibrationMinSampleN={minSampleN}
      />
    </div>
  );
}

export function AIAnalysisPanel({
  ticker,
  provider,
  isOpen,
  isRunning,
  showReanalysisPrompt,
  agents,
  reports,
  debate,
  debatingSide,
  final,
  sentiment,
  error,
  resumeFrom,
  tabs,
  limitNotice,
  open,
  start,
  switchTab,
  dismissSlot,
  chooseAgain,
  run,
  resume,
  stop,
  close,
  dismissReanalysisPrompt,
}: AIAnalysisPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const [expandedCard, setExpandedCard] = useState<{ title: string; content: string; highlight?: string } | null>(null);
  const [showProviderChooser, setShowProviderChooser] = useState(false);
  const { data: stockData } = useQueryStockPrice(ticker);
  const displayName = stockData?.name ?? ticker;
  // 보정된 신뢰도(scorecard-feedback (가)) — 라이브 최종 결론 카드에 곁들인다(표시 전용·무회귀).
  const { getCalibration, minSampleN } = useConfidenceCalibration();

  const isAllPending = agents.every((a) => a.status === "pending");
  // 재열기 트레이 헤더 배지 — 진행 중(running) 슬롯 수.
  const runningTabCount = tabs.filter((t) => t.isRunning).length;
  const shouldLoadPreviousDecision = isOpen && isAllPending && !isRunning && !error;
  const {
    data: previousDecisionData,
    isLoading: isPreviousDecisionLoading,
  } = useQueryAIDecision(ticker, shouldLoadPreviousDecision);
  const previousDecision = previousDecisionData?.decision ?? null;
  const hasDebate = debate.length > 0
    || agents.some(a => (a.key === "bull" || a.key === "bear") && a.status !== "pending");

  // 분석 중 헤더 상태 — 현재 진행 중인 에이전트 기준 한 줄 메시지.
  // 토론 중에는 running 에이전트(bull로 고정)보다 실제 발언 측(debatingSide)을 우선한다.
  const runningAgent = agents.find((a) => a.status === "running");
  const runningStatusKey = debatingSide ?? runningAgent?.key;
  const runningStatus = runningStatusKey
    ? (COPY.panel.runningStatus[runningStatusKey] ?? COPY.panel.runningFallback)
    : COPY.panel.runningFallback;

  // 진행 중인 분석가 칩을 칩 캐러셀 맨 왼쪽으로 자동 스크롤(모바일 한 줄 스크롤 대응).
  useEffect(() => {
    const container = chipsRef.current;
    if (!container) return;
    const chip = container.querySelector<HTMLElement>('[data-running="true"]');
    if (!chip) return;
    const cRect = container.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    container.scrollTo({ left: container.scrollLeft + (chipRect.left - cRect.left) - 16, behavior: "smooth" });
  }, [runningAgent?.key, isOpen]);

  // 배경 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isAllPending) setShowProviderChooser(false);
  }, [isOpen, isAllPending]);

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
    if (!scrollRef.current || final) return;
    const hasRunning = agents.some((a) => a.status === "running");
    if (!hasRunning && debate.length === 0) return;
    const el = scrollRef.current;
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [agents, debate.length, final]);

  // 최종 결론 도착 시 맨 아래로 — DOM 렌더 후 스크롤
  useEffect(() => {
    if (!final || !scrollRef.current) return;
    const el = scrollRef.current;
    const id = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 120);
    return () => clearTimeout(id);
  }, [final]);

  const handleExpand = (title: string, content: string, highlight?: string) =>
    setExpandedCard({ title, content, highlight });

  const analystKeys: AgentKey[] = ["market", "news", "fundamentals", "social"];

  return (
    <>
      {/* 패널 숨김 상태 — 우측 재열기 트레이. 기본은 컴팩트 핀(아이콘+개수), hover 시 종목별 상세 카드.
          동시 최대 3건. 상세 행: 좌=종목명 / 우=진행수(또는 hover 닫기 ×). 행 클릭 → 해당 분석 열기. */}
      <AnimatePresence>
        {!isOpen && tabs.length > 0 && (
          <motion.div
            key="reopen-tray"
            initial={{ x: 64 }}
            animate={{ x: 0 }}
            exit={{ x: 64 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="group fixed right-0 top-1/2 -translate-y-1/2 z-[70]"
          >
            {/* 컴팩트 핀(기본) — hover 시 숨김. 클릭/터치 시 분석 패널 열기(키보드 접근 폴백). */}
            <button
              type="button"
              onClick={() => open()}
              aria-label={`AI 분석 ${tabs.length}건 열기`}
              className="flex flex-col items-center gap-1 rounded-l-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-2.5 py-3 text-white shadow-xl transition-colors cursor-pointer group-hover:hidden"
            >
              {runningTabCount > 0
                ? <Loader2 size={16} className="animate-spin" />
                : <Sparkles size={16} />
              }
              <span className="text-[10px] font-bold leading-tight text-center">AI<br />종합<br />분석</span>
              <span className="text-[10px] font-bold tabular-nums leading-none px-1.5 py-0.5 rounded-full bg-white/20">{tabs.length}</span>
            </button>

            {/* 상세 카드(hover) — 헤더 + 종목별 행. */}
            <div
              role="group"
              aria-label={COPY.panel.title}
              className="hidden w-52 max-h-[70vh] overflow-y-auto rounded-l-2xl border border-r-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl group-hover:block"
            >
              {/* 트레이 헤더 — 라벨 + 진행 중 개수 배지 */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <Sparkles size={13} className="text-blue-500 dark:text-blue-400" />
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{COPY.panel.title}</span>
                {runningTabCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {runningTabCount}
                  </span>
                )}
              </div>

              {/* 행 목록 */}
              <div className="py-1">
                {tabs.map((t) => (
                  <div key={t.ticker} className="group/row relative">
                    <button
                      type="button"
                      onClick={() => switchTab(t.ticker)}
                      aria-label={COPY.panel.reopen(t.name ?? t.ticker)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {t.isRunning
                        ? <Loader2 size={14} className="shrink-0 animate-spin text-blue-500 dark:text-blue-400" />
                        : <Sparkles size={14} className="shrink-0 text-blue-400 dark:text-blue-500" />
                      }
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">
                        {t.name ?? t.ticker}
                      </span>
                      {/* 진행수 — 비실행(닫기 ×) 행은 hover 시 페이드아웃해 ×에 자리를 내준다. */}
                      <span
                        className={cn(
                          "shrink-0 text-[11px] font-bold tabular-nums text-slate-400 dark:text-slate-500",
                          !t.isRunning && "transition-opacity group-hover/row:opacity-0",
                        )}
                      >
                        {t.doneCount}/{t.agentCount}
                      </span>
                    </button>
                    {/* 닫기 × — 비실행(완료/에러) 슬롯만. 진행수 자리에 hover 시 노출. */}
                    {!t.isRunning && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); dismissSlot(t.ticker); }}
                        aria-label={COPY.panel.dismissTab(t.name ?? t.ticker)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* 스크림 — 상단 navbar(지수·테마토글)는 가리지 않도록 navbar 높이 아래에서 시작 */}
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed top-[56px] inset-x-0 bottom-0 bg-slate-900/60 backdrop-blur-sm z-[65]"
            />

          {/* 패널 — navbar 아래에서 시작(상단 지수·테마토글 노출 유지) */}
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-[56px] right-0 bottom-0 z-[70] bg-slate-50 dark:bg-slate-950 shadow-2xl border-t border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden",
              "w-full",
            )}
            aria-label={COPY.panel.title}
            role="complementary"
          >
            {/* ── 헤더 ──────────────────────────────────────────────────── */}
            <div className="flex-none flex items-center justify-between px-5 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles className="text-blue-500 dark:text-blue-400 shrink-0" size={18} />
                <h2 className="font-bold text-base leading-tight text-slate-900 dark:text-white shrink-0">{displayName}</h2>
                {/* 분석에 사용 중인 공급자 표시(읽기 전용) — 공급자 선택은 진입 화면에서만. */}
                {!isAllPending && (
                  <span
                    className={cn(
                      "shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold hidden md:inline-block",
                      provider === "claude"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                    )}
                  >
                    {COPY.provider[provider]}
                  </span>
                )}
                {/* 분석 중 — 현재 진행 에이전트 기준 상태 */}
                {isRunning && (
                  <span className="inline-flex items-center gap-1.5 min-w-0 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    <Loader2 size={12} className="animate-spin shrink-0" />
                    <span className="truncate">{runningStatus}…</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* 중지 / 재개 버튼 */}
                {isRunning ? (
                  <button
                    type="button"
                    onClick={stop}
                    aria-label={COPY.panel.stop}
                    className="flex items-center gap-1.5 p-1.5 text-red-500 border border-slate-200 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:border-slate-700 dark:hover:text-red-300 dark:hover:bg-red-900/30 rounded-md transition-colors cursor-pointer md:px-2.5 md:py-1.5 md:text-[11px] md:font-medium md:text-red-600 md:bg-red-50 md:hover:bg-red-100 md:dark:text-red-400 md:dark:bg-red-900/30 md:dark:hover:bg-red-900/50"
                  >
                    <Square size={11} fill="currentColor" /> <span className="hidden md:inline">{COPY.panel.stop}</span>
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
                      onClick={chooseAgain}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                    >
                      <RefreshCw size={11} /> {COPY.panel.restartAll}
                    </button>
                  </>
                )}
                {/* 닫기 */}
                <button
                  type="button"
                  onClick={close}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                  aria-label={COPY.panel.close}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

                {/* ── 동시 분석 탭 스트립(2건 이상일 때만) ─────────────── */}
                {tabs.length > 1 && (
                  <div className="flex-none flex items-center gap-1.5 px-5 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide-mobile">
                    {tabs.map((t) => {
                      const activeTab = t.ticker === ticker;
                      return (
                        <button
                          key={t.ticker}
                          type="button"
                          onClick={() => switchTab(t.ticker)}
                          aria-current={activeTab ? "true" : undefined}
                          className={cn(
                            "flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer border",
                            activeTab
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
                          )}
                        >
                          {t.isRunning
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Sparkles size={11} />
                          }
                          <span className="max-w-[7rem] truncate">{t.name ?? t.ticker}</span>
                          {t.isRunning && (
                            <span className="tabular-nums opacity-80">{t.doneCount}/{t.agentCount}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ── 에이전트 진행 바 ────────────────────────────────── */}
                <div className="flex-none px-5 py-2.5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <div
                    ref={chipsRef}
                    className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide-mobile -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap md:overflow-x-visible"
                  >
                    {AGENT_META.map((meta) => {
                      const agentStatus = agents.find((a) => a.key === meta.key)?.status ?? "pending";
                      const isError = agentStatus === "error";
                      const isClickable = isError && !isRunning;
                      return (
                        <div
                          key={meta.key}
                          data-running={agentStatus === "running" ? "true" : undefined}
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
                            "flex items-center gap-1 shrink-0 px-2 py-1 rounded-full text-[10px] font-bold transition-colors",
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

                {/* ── 스크롤 영역 ───────────────────────────────────── */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto">
                  <div className="p-4 space-y-4">
                    {/* 동시 분석 상한 안내(최대 3개) */}
                    {limitNotice && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                        {limitNotice}
                      </div>
                    )}

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
                              onClick={chooseAgain}
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

                    {/* 시작 전 — 공급자 선택 화면(로컬 CLI 가용성 기반) */}
                    {isAllPending && !error && !isRunning && (
                      isPreviousDecisionLoading ? (
                        <div className="mx-auto w-full max-w-[22rem] px-6 py-16 text-center" role="status" aria-live="polite">
                          <Loader2 className="mx-auto mb-3 w-7 h-7 animate-spin text-slate-400" />
                          <p className="text-sm text-slate-400 break-keep">{COPY.previousDecision.loading}</p>
                        </div>
                      ) : previousDecision && !showProviderChooser ? (
                        <PreviousDecisionIntro
                          snapshot={previousDecision}
                          onAnalyze={start}
                          onChooseProvider={() => setShowProviderChooser(true)}
                        />
                      ) : (
                        <ProviderChooser onSelect={start} />
                      )
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
                              <div key={key} className="bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 min-h-[120px]" />
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
                              failReason={agentState.failReason}
                              sentiment={key === "social" ? sentiment : undefined}
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
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {(["research_manager", "trader"] as AgentKey[]).map((key) => {
                          const meta = AGENT_META.find(m => m.key === key)!;
                          const agentState = agents.find(a => a.key === key)!;
                          if (agentState.status === "pending") {
                            return <div key={key} className="bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 min-h-[120px]" />;
                          }
                          if (key === "trader") {
                            return (
                              <div key={key} className="relative">
                                <span className="absolute -top-3.5 right-3 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
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
                                  failReason={agentState.failReason}
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
                              failReason={agentState.failReason}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* ── Row 5: 리스크 3개 병렬 ─────────────────────────────
                        모바일: 가로 스냅 캐러셀(다음 카드 peek) — 3개 스트림을 모두 살려둠.
                        md+: 3-col grid. */}
                    {(["risk_risky", "risk_neutral", "risk_safe"] as AgentKey[]).some(
                      k => agents.find(a => a.key === k)?.status !== "pending"
                    ) && (
                      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide-mobile md:grid md:grid-cols-3 md:overflow-visible">
                        {(["risk_risky", "risk_neutral", "risk_safe"] as AgentKey[]).map((key) => {
                          const meta = AGENT_META.find(m => m.key === key)!;
                          const agentState = agents.find(a => a.key === key)!;
                          return (
                            <div key={key} className="snap-start shrink-0 w-[78%] sm:w-[46%] md:w-auto">
                              {agentState.status === "pending" ? (
                                <div className="bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 min-h-[120px] h-full" />
                              ) : (
                                <AnalystCard
                                  meta={meta}
                                  status={agentState.status}
                                  content={reports[key]}
                                  streamingChunk={agentState.streamingChunk}
                                  isRunning={isRunning}
                                  onExpand={handleExpand}
                                  onRetry={agentState.status === "error" ? () => resume(key) : undefined}
                                  failReason={agentState.failReason}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ── Row 6: 최종 결론 (portfolio_manager 결과) ──────── */}
                    {(() => {
                      const pmAgent = agents.find(a => a.key === "portfolio_manager")!;
                      if (final)
                        return (
                          <FinalVerdictCard
                            data={final}
                            calibration={getCalibration(final.confidence)}
                            calibrationMinSampleN={minSampleN}
                          />
                        );
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

                {/* 카드 상세 오버레이 — 스크롤 컨테이너 밖에서 패널 전체를 덮어
                    배경 스크롤 위치와 무관하게 항상 풀하이트로 표시(자체 내부 스크롤). */}
                <AnimatePresence>
                  {expandedCard && (
                    <CardDetailOverlay
                      key="detail"
                      title={expandedCard.title}
                      content={expandedCard.content}
                      highlight={expandedCard.highlight}
                      onClose={() => setExpandedCard(null)}
                    />
                  )}
                </AnimatePresence>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
