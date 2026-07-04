"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Sparkles, RefreshCw, Square, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { isVercelRuntime } from "@/lib/utils/runtimeEnv";
import { AGENT_META } from "@/lib/types/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { AIAnalysisContextValue } from "@/hooks/stock/aiAnalysisProvider";
import { useQueryStockPrice } from "@/hooks/stock/useQueryStockPrice";
import { useQueryAIDecision } from "@/hooks/stock/useQueryAIDecision";
import { useQueryAIProviders } from "@/hooks/stock/useQueryAIProviders";
import { useSignalResult } from "@/hooks/stock/useSignalResult";
import { useConfidenceCalibration } from "@/hooks/scorecard/useConfidenceCalibration";
import { AiPulseMark } from "./ai-analysis/AiPulseMark";
import { VerdictHero } from "./ai-analysis/VerdictHero";
import { PhaseTimeline } from "./ai-analysis/PhaseTimeline";
import { FinalVerdictCard } from "./ai-analysis/FinalVerdictCard";
import { CardDetailOverlay } from "./ai-analysis/CardDetailOverlay";
import { ProviderChooser } from "./ai-analysis/ProviderChooser";
import { SlideToAnalyze } from "./ai-analysis/SlideToAnalyze";
import { ProdAnalysisQueueCard } from "./ai-analysis/ProdAnalysisQueueCard";
import type {
  AIAnalysisDecisionSnapshot,
  AIAnalysisProvider,
} from "@/lib/types/stock/aiAnalysis";

/**
 * prod(Vercel) 판별 — 클라이언트. Vercel 이 `NEXT_PUBLIC_VERCEL_ENV` 를 빌드타임 인라인하므로
 * 서버/클라 값이 동일 → 하이드레이션 불일치 없음(navItems.ts 선례). prod 한정 큐 카드 분기에만 사용.
 */
const IS_PROD = isVercelRuntime();

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
      {/* 안내 박스 — 좌측 안내 텍스트 + 우측 슬라이드 스위치. 탈-카드: 테두리 제거, 옅은 info 배경으로만 묶음. */}
      <div className="rounded-md bg-info-soft px-md py-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-caption font-bold text-info">
              {COPY.previousDecision.title}
              <span className="ml-1.5 font-normal text-text-muted">
                · {COPY.previousDecision.meta(
                  formatUpdatedAt(snapshot.updatedAt),
                  COPY.provider[snapshot.provider],
                )}
              </span>
            </p>
            <p className="mt-0.5 text-caption text-text-muted leading-relaxed">
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
                className="h-11 w-full sm:w-[22rem] animate-pulse rounded-pill bg-surface-muted"
                role="status"
                aria-live="polite"
                aria-label={COPY.chooser.loading}
              />
            ) : (
              // 가용 0개/Vercel/실패 — 슬라이드 전제가 안 됨. 기존 공급자 선택 화면으로 폴백.
              <button
                type="button"
                onClick={onChooseProvider}
                className="button-secondary w-full sm:w-auto"
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
  const [expandedCard, setExpandedCard] = useState<{ title: string; content: string; highlight?: string } | null>(null);
  const [showProviderChooser, setShowProviderChooser] = useState(false);
  const { data: stockData } = useQueryStockPrice(ticker);
  const displayName = stockData?.name ?? ticker;
  // verdict-forward 히어로용 결정론 시그널 — 대기 중 4축 채움 + 완료 시 신호강도. warmup 미충족(HOLD
  // 안전폴백)이면 오해 방지로 null 처리(히어로가 확신도/대기 문구로 폴백). SignalSummary 와 동일 데이터.
  const { result: signalResult } = useSignalResult(ticker);
  const heroSignal = signalResult && signalResult.warmupOk ? signalResult : null;

  const isAllPending = agents.every((a) => a.status === "pending");
  const doneCount = agents.filter((a) => a.status === "done").length;
  // 시작 화면(대기) vs 라이브(히어로+타임라인) 분기. 즉시 오류(활동 전)면 오류 배너만.
  const isIdle = isAllPending && !error && !isRunning;
  const showHeroTimeline =
    isRunning || final != null || agents.some((a) => a.status !== "pending");
  // 재열기 트레이 헤더 배지 — 진행 중(running) 슬롯 수.
  const runningTabCount = tabs.filter((t) => t.isRunning).length;
  const shouldLoadPreviousDecision = isOpen && isAllPending && !isRunning && !error;
  const {
    data: previousDecisionData,
    isLoading: isPreviousDecisionLoading,
  } = useQueryAIDecision(ticker, shouldLoadPreviousDecision);
  const previousDecision = previousDecisionData?.decision ?? null;

  // 분석 중 헤더 상태 — 현재 진행 중인 에이전트 기준 한 줄 메시지.
  // 토론 중에는 running 에이전트(bull로 고정)보다 실제 발언 측(debatingSide)을 우선한다.
  const runningAgent = agents.find((a) => a.status === "running");
  const runningStatusKey = debatingSide ?? runningAgent?.key;
  const runningStatus = runningStatusKey
    ? (COPY.panel.runningStatus[runningStatusKey] ?? COPY.panel.runningFallback)
    : COPY.panel.runningFallback;

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

  // 자동 스크롤 — 진행 중(또는 결과 도착) 페이즈 행을 뷰로. 새 에이전트/페이즈 전환/최종 도착 시
  // PhaseTimeline 이 붙인 data-phase-active 행을 nearest 로 스크롤(칩 캐러셀·바닥 고정 대체).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>('[data-phase-active="true"]');
    if (!target) return;
    const id = requestAnimationFrame(() => {
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [runningAgent?.key, final]);

  const handleExpand = (title: string, content: string, highlight?: string) =>
    setExpandedCard({ title, content, highlight });

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
            {/* 컴팩트 핀(기본) — hover 시 숨김. 클릭/터치 시 분석 패널 열기(키보드 접근 폴백).
                AI 시그니처 — 재열기 핀은 gradient-ai 정체성을 유지(브랜드 강조 지점). */}
            <button
              type="button"
              onClick={() => open()}
              aria-label={COPY.panel.reopenPin(tabs.length)}
              className="gradient-ai-bg flex flex-col items-center gap-1 rounded-l-xl px-sm py-md shadow-overlay transition hover:brightness-110 cursor-pointer group-hover:hidden"
            >
              {runningTabCount > 0
                ? <Loader2 size={16} className="animate-spin" />
                : <Sparkles size={16} />
              }
              <span className="text-caption font-bold leading-tight text-center">
                {COPY.panel.reopenBrand.map((line, i) => (
                  <span key={line}>{i > 0 && <br />}{line}</span>
                ))}
              </span>
              <span className="text-caption font-bold tabular-nums leading-none px-1.5 py-0.5 rounded-pill bg-surface/20">{tabs.length}</span>
            </button>

            {/* 상세 카드(hover) — 헤더 + 종목별 행. 떠있는 면 → surface-elevated + overlay 그림자. */}
            <div
              role="group"
              aria-label={COPY.panel.title}
              className="hidden w-52 max-h-[70vh] overflow-y-auto rounded-l-xl border border-r-0 border-border-line bg-surface-elevated shadow-overlay group-hover:block"
            >
              {/* 트레이 헤더 — 라벨 + 진행 중 개수 배지 */}
              <div className="flex items-center gap-1.5 px-md py-sm border-b border-border-line">
                <Sparkles size={13} className="text-accent-vivid" />
                <span className="text-caption font-bold text-text-muted">{COPY.panel.title}</span>
                {runningTabCount > 0 && (
                  <span className="ml-auto text-caption font-bold tabular-nums px-1.5 py-0.5 rounded-pill bg-accent-vivid-soft text-accent-vivid">
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
                      className="flex w-full items-center gap-sm px-md py-sm text-left transition-colors hover:bg-surface-muted cursor-pointer"
                    >
                      {t.isRunning
                        ? <Loader2 size={14} className="shrink-0 animate-spin text-accent-vivid" />
                        : <Sparkles size={14} className="shrink-0 text-accent-vivid" />
                      }
                      <span className="min-w-0 flex-1 truncate text-body-sm-strong text-text-strong">
                        {t.name ?? t.ticker}
                      </span>
                      {/* 진행수 — 비실행(닫기 ×) 행은 hover 시 페이드아웃해 ×에 자리를 내준다. */}
                      <span
                        className={cn(
                          "shrink-0 text-caption font-bold tabular-nums text-text-muted",
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full text-text-muted opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-surface-muted hover:text-text-strong cursor-pointer"
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
              className="fixed top-[56px] inset-x-0 bottom-0 bg-black/50 backdrop-blur-sm z-[65]"
            />

          {/* 패널 — navbar 아래에서 시작(상단 지수·테마토글 노출 유지) */}
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-[56px] right-0 bottom-0 z-[70] bg-surface-muted shadow-overlay border-t border-l border-border-line flex flex-col overflow-hidden",
              "w-full",
            )}
            aria-label={COPY.panel.title}
            role="complementary"
          >
            {/* ── 헤더 ──────────────────────────────────────────────────── */}
            <div className="flex-none flex items-center justify-between px-lg py-sm bg-surface border-b border-border-line">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* AI 시그니처 — 살아있는 브랜드 맥박 마크(ECG 스윕)를 흰 배지에 담아 헤더 로고와 통일.
                    분석 중 = active(정상 스윕) / 완료·대기 = calm(느리고 옅게). */}
                <span
                  className="inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-pill bg-surface border border-border-line shadow-sm"
                  aria-hidden="true"
                >
                  <AiPulseMark
                    className="h-5 w-5"
                    gradientId="aiPanelPulse"
                    state={isRunning ? "active" : "calm"}
                  />
                </span>
                <h2 className="text-body-strong leading-tight text-text-strong shrink-0">{displayName}</h2>
                {/* 분석에 사용 중인 공급자 표시(읽기 전용) — 공급자 선택은 진입 화면에서만. */}
                {!isAllPending && (
                  <span
                    className={cn(
                      "shrink-0 px-sm py-0.5 rounded-sm text-caption font-bold hidden md:inline-block",
                      provider === "claude"
                        ? "bg-warn-soft text-warn"
                        : "bg-info-soft text-info",
                    )}
                  >
                    {COPY.provider[provider]}
                  </span>
                )}
                {/* 분석 중 — 현재 진행 에이전트 기준 상태 */}
                {isRunning && (
                  <span className="inline-flex items-center gap-1.5 min-w-0 text-caption font-medium text-accent-vivid">
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
                    className="flex items-center gap-1.5 p-1.5 text-critical border border-border-line hover:bg-critical-soft rounded-sm transition-colors cursor-pointer md:px-2.5 md:py-1.5 md:text-caption md:font-medium md:bg-critical-soft md:border-transparent"
                  >
                    <Square size={11} fill="currentColor" /> <span className="hidden md:inline">{COPY.panel.stop}</span>
                  </button>
                ) : !isAllPending && (
                  <>
                    {resumeFrom && (
                      <button
                        type="button"
                        onClick={() => resume(resumeFrom)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-caption font-medium text-accent-vivid bg-accent-vivid-soft hover:brightness-105 rounded-sm transition cursor-pointer"
                      >
                        <RefreshCw size={11} />
                        {COPY.panel.resumeFrom(AGENT_META.find(m => m.key === resumeFrom)?.label ?? resumeFrom)}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={chooseAgain}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-caption font-medium text-text-muted bg-surface-muted hover:bg-border-line rounded-sm transition-colors cursor-pointer"
                    >
                      <RefreshCw size={11} /> {COPY.panel.restartAll}
                    </button>
                  </>
                )}
                {/* 닫기 */}
                <button
                  type="button"
                  onClick={close}
                  className="p-1.5 text-text-muted hover:text-text-strong hover:bg-surface-muted rounded-sm transition-colors cursor-pointer"
                  aria-label={COPY.panel.close}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

                {/* ── 동시 분석 탭 스트립(2건 이상일 때만) ─────────────── */}
                {tabs.length > 1 && (
                  <div className="flex-none flex items-center gap-1.5 px-lg py-sm bg-surface border-b border-border-line overflow-x-auto scrollbar-hide-mobile">
                    {tabs.map((t) => {
                      const activeTab = t.ticker === ticker;
                      return (
                        <button
                          key={t.ticker}
                          type="button"
                          onClick={() => switchTab(t.ticker)}
                          aria-current={activeTab ? "true" : undefined}
                          className={cn(
                            "flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-pill text-caption font-bold transition-colors cursor-pointer border",
                            activeTab
                              ? "bg-accent-vivid text-surface border-accent-vivid"
                              : "bg-surface-muted text-text-muted border-transparent hover:bg-border-line",
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

                {/* ── 스크롤 영역 ─────────────────────────────────────
                    회색 12-칩 스트립 제거 → verdict-forward 히어로 + 4-페이즈 타임라인(아래). */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto">
                  <div className="p-4 space-y-4">
                    {/* 동시 분석 상한 안내(최대 3개) */}
                    {limitNotice && (
                      <div className="card-warn text-body-sm font-medium">
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
                          className="card-info flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <p className="text-body-sm text-info font-medium">
                            {COPY.reanalysis.prompt}
                          </p>
                          <div className="flex gap-sm flex-none">
                            <button
                              type="button"
                              onClick={chooseAgain}
                              className="px-md py-1.5 bg-accent-vivid hover:brightness-110 text-surface text-caption font-bold rounded-sm transition cursor-pointer"
                            >
                              {COPY.reanalysis.confirm}
                            </button>
                            <button
                              type="button"
                              onClick={dismissReanalysisPrompt}
                              className="px-md py-1.5 text-text-muted hover:text-text-strong text-caption font-medium cursor-pointer"
                            >
                              {COPY.reanalysis.dismiss}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isIdle ? (
                      /* 시작 전(대기) — prod 는 비동기 "요청 접수" 큐 카드, 로컬은 공급자 선택/슬라이드(라이브). */
                      isPreviousDecisionLoading ? (
                        <div className="mx-auto w-full max-w-[22rem] px-6 py-16 text-center" role="status" aria-live="polite">
                          <Loader2 className="mx-auto mb-3 w-7 h-7 animate-spin text-text-muted" />
                          <p className="text-body-sm text-text-muted break-keep">{COPY.previousDecision.loading}</p>
                        </div>
                      ) : IS_PROD ? (
                        // prod 한정 — enqueue 비동기 모델(이전 결론 신선도/접수/오프라인/중복).
                        // 실시간 스트림·SlideToAnalyze 없음(로컬 전용 무회귀).
                        <ProdAnalysisQueueCard
                          ticker={ticker}
                          name={stockData?.name ?? null}
                          snapshot={previousDecision}
                          activeJob={previousDecisionData?.active ?? null}
                        />
                      ) : previousDecision && !showProviderChooser ? (
                        <PreviousDecisionIntro
                          snapshot={previousDecision}
                          onAnalyze={start}
                          onChooseProvider={() => setShowProviderChooser(true)}
                        />
                      ) : (
                        <ProviderChooser onSelect={start} />
                      )
                    ) : (
                      /* 라이브(진행·완료·오류) — verdict-forward 히어로 + 4-페이즈 타임라인. */
                      <>
                        {showHeroTimeline && (
                          <VerdictHero
                            final={final}
                            signal={heroSignal}
                            doneCount={doneCount}
                            totalCount={agents.length}
                          />
                        )}

                        {/* 전체 스트림 오류 — 전체 재실행(run). 페이즈별 재개는 타임라인 행 어포던스가 담당. */}
                        {error && (
                          <div className="card-critical">
                            <p className="text-body-sm font-medium text-critical mb-md">{error}</p>
                            <button type="button" onClick={run} className="px-md py-2 bg-accent-vivid text-surface text-caption font-bold rounded-sm hover:brightness-110 transition cursor-pointer">
                              {COPY.errorState.retry}
                            </button>
                          </div>
                        )}

                        {showHeroTimeline && (
                          <PhaseTimeline
                            key={ticker}
                            agents={agents}
                            reports={reports}
                            debate={debate}
                            debatingSide={debatingSide}
                            sentiment={sentiment}
                            final={final}
                            isRunning={isRunning}
                            onExpand={handleExpand}
                            resume={resume}
                          />
                        )}
                      </>
                    )}

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
