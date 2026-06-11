"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X, Sparkles, Check, RefreshCw, Square, ChevronRight,
  TrendingUp, TrendingDown, Info, BadgeCheck, MessageSquare,
  ChevronDown, ChevronUp, AlertCircle, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AGENT_META, AGENT_ORDER, DEBATE_ROUNDS } from "@/lib/types/stock/aiAnalysis";
import type {
  AgentKey, AgentMeta, AgentState, AgentStatus,
  DebateMessage, FinalDecision, FinalVerdict,
} from "@/lib/types/stock/aiAnalysis";
import type { AIAnalysisHook } from "@/hooks/stock/useAIAnalysis";

interface AIAnalysisPanelProps extends AIAnalysisHook {
  ticker: string;
}

// ─── Verdict 헬퍼 ─────────────────────────────────────────────────────────────

const VERDICT_LABEL: Record<FinalVerdict, string> = {
  BUY: "강력 매수", OVERWEIGHT: "비중 확대", HOLD: "보유 유지",
  UNDERWEIGHT: "비중 축소", SELL: "매도·회피",
};
const isBullishVerdict = (v: FinalVerdict) => v === "BUY" || v === "OVERWEIGHT";
const isBearishVerdict = (v: FinalVerdict) => v === "SELL" || v === "UNDERWEIGHT";

// ─── 마크다운 prose 클래스 ────────────────────────────────────────────────────

const PROSE =
  "prose prose-sm prose-slate dark:prose-invert max-w-none " +
  "prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-1.5 " +
  "prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:my-1 " +
  "prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-li:my-0.5 " +
  "prose-strong:text-slate-800 dark:prose-strong:text-slate-100 " +
  "prose-table:text-xs prose-table:w-full " +
  "prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:font-semibold prose-th:px-2 prose-th:py-1.5 prose-th:text-left " +
  "prose-td:px-2 prose-td:py-1.5 prose-td:border-b prose-td:border-slate-200 dark:prose-td:border-slate-700 " +
  "prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:bg-blue-50 dark:prose-code:bg-blue-900/20 prose-code:px-1 prose-code:rounded prose-code:text-[11px] " +
  "prose-hr:border-slate-200 dark:prose-hr:border-slate-700";

// ─── 소형 분석가 카드 (compact, 클릭해 상세 열기) ─────────────────────────────

function AnalystCard({
  meta,
  status,
  content,
  streamingChunk,
  isRunning: globalRunning,
  onExpand,
  onRetry,
}: {
  meta: AgentMeta;
  status: AgentStatus;
  content: string | undefined;
  streamingChunk: string;
  isRunning: boolean;
  onExpand: (title: string, content: string) => void;
  onRetry?: () => void;
}) {
  const isActive = status === "running";
  const isDone = status === "done";
  const isError = status === "error";
  const displayText = isActive ? streamingChunk : (isDone ? content : undefined);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm"
      style={{ minHeight: 180 }}
    >
      {/* 카드 헤더 */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex-none",
        isActive && "bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30",
        isDone && "bg-emerald-50/40 dark:bg-emerald-950/10",
      )}>
        <div className={cn(
          "w-1.5 h-1.5 rounded-full flex-none",
          isActive && "bg-blue-500 animate-pulse",
          isDone && "bg-emerald-500",
          isError && "bg-red-500",
        )} />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex-1 truncate">
          {meta.label}
        </span>
        {isActive && <RefreshCw size={11} className="text-blue-500 animate-spin flex-none" />}
        {isDone && <Check size={12} className="text-emerald-500 flex-none" />}
        {isError && <AlertCircle size={12} className="text-red-500 flex-none" />}
      </div>

      {/* 내용 미리보기 */}
      <div className="flex-1 overflow-hidden px-3 py-2.5">
        {isActive && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            <span className="line-clamp-5 whitespace-pre-wrap">{displayText || "분석 중..."}</span>
            <span className="inline-block w-1 h-[14px] bg-blue-500 animate-pulse ml-0.5 align-middle" />
          </p>
        )}
        {isDone && displayText && (
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-5 whitespace-pre-wrap">
            {displayText}
          </p>
        )}
        {isError && (
          <p className="text-[11px] text-red-500 mt-1">분석 중 오류가 발생했어요.</p>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="flex-none px-3 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div>
          {isError && !globalRunning && onRetry && (
            <button
              onClick={onRetry}
              className="text-[10px] text-red-500 hover:text-red-600 font-medium cursor-pointer flex items-center gap-1"
            >
              <RefreshCw size={10} /> 재시도
            </button>
          )}
        </div>
        {isDone && displayText && (
          <button
            onClick={() => onExpand(meta.label, displayText)}
            className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium cursor-pointer flex items-center gap-1 ml-auto"
          >
            전체 보기 <ChevronRight size={10} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── 토론 메시지 카드 (단일 발화 / 단일 라운드) ──────────────────────────────

function DebateMsgCard({
  msg,
  debatingSide,
  onExpand,
}: {
  msg: DebateMessage;
  debatingSide: "bull" | "bear" | null;
  onExpand: (title: string, content: string) => void;
}) {
  const isBull = msg.speaker === "bull";
  const isStreaming = msg.isStreaming && debatingSide === msg.speaker;

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden shadow-sm",
      isBull
        ? "bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-900/40"
        : "bg-blue-50/40 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/40",
      isStreaming && (isBull ? "border-red-400" : "border-blue-400"),
    )}>
      <div className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 border-b",
        isBull ? "border-red-200 dark:border-red-900/30" : "border-blue-200 dark:border-blue-900/30",
      )}>
        {isStreaming && (
          <span className="relative flex h-2 w-2 flex-none">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isBull ? "bg-red-400" : "bg-blue-400")} />
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", isBull ? "bg-red-500" : "bg-blue-500")} />
          </span>
        )}
        <span className={cn(
          "text-[10px] font-bold",
          isBull ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400",
        )}>
          {msg.round}라운드
        </span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-5 whitespace-pre-wrap">
          {msg.content}
          {isStreaming && <span className={cn("inline-block w-1 h-3 animate-pulse ml-0.5 align-middle", isBull ? "bg-red-500" : "bg-blue-500")} />}
        </p>
      </div>
      {!msg.isStreaming && msg.content && (
        <div className={cn("px-3 py-1.5 border-t", isBull ? "border-red-100 dark:border-red-900/30" : "border-blue-100 dark:border-blue-900/30")}>
          <button
            onClick={() => onExpand(`${isBull ? "강세" : "약세"} 연구원 — ${msg.round}라운드`, msg.content)}
            className={cn(
              "text-[10px] font-medium cursor-pointer flex items-center gap-1",
              isBull ? "text-red-500 hover:text-red-600" : "text-blue-500 hover:text-blue-600",
            )}
          >
            전체 보기 <ChevronRight size={10} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 토론 섹션 (강세 vs 약세, N라운드) ───────────────────────────────────────

function DebateSection({
  debate,
  debatingSide,
  bullAgent,
  bearAgent,
  onExpand,
}: {
  debate: DebateMessage[];
  debatingSide: "bull" | "bear" | null;
  bullAgent: AgentState;
  bearAgent: AgentState;
  onExpand: (title: string, content: string) => void;
}) {
  if (bullAgent.status === "pending") return null;

  const bullMsgs = debate.filter(d => d.speaker === "bull");
  const bearMsgs = debate.filter(d => d.speaker === "bear");
  const currentRound = Math.max(bullMsgs.length, bearMsgs.length, 1);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4">
        {/* 섹션 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">강세 vs 약세 토론</span>
          <span className="ml-auto text-[10px] text-slate-400 font-medium">
            {currentRound}/{DEBATE_ROUNDS} 라운드
          </span>
        </div>

        {/* 컬럼 헤더 */}
        <div className="grid grid-cols-[1fr_28px_1fr] gap-2 mb-3">
          <div className="text-[11px] font-extrabold text-red-600 dark:text-red-400">
            🐂 강세 연구원
          </div>
          <div />
          <div className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 text-right">
            🐻 약세 연구원
          </div>
        </div>

        {/* 라운드별 행 */}
        <div className="space-y-3">
          {Array.from({ length: DEBATE_ROUNDS }, (_, i) => {
            const round = i + 1;
            const bullMsg = bullMsgs.find(m => m.round === round);
            const bearMsg = bearMsgs.find(m => m.round === round);

            // 아직 시작 안 한 라운드 — 진행 중인 경우만 표시
            const isBullThisRound = bullAgent.status === "running" && !bullMsg;
            const isBearThisRound = bearAgent.status === "running" && !bearMsg && !!bullMsg;

            if (!bullMsg && !isBullThisRound && !bearMsg && !isBearThisRound) return null;

            return (
              <div key={round} className="grid grid-cols-[1fr_28px_1fr] gap-2 items-start">
                {/* 강세 셀 */}
                <div>
                  {bullMsg && (
                    <DebateMsgCard msg={bullMsg} debatingSide={debatingSide} onExpand={onExpand} />
                  )}
                  {isBullThisRound && !bullMsg && (
                    <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/10 px-3 py-3">
                      <p className="text-[11px] text-red-400 flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2 flex-none">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                        </span>
                        논거 작성 중...
                      </p>
                    </div>
                  )}
                </div>

                {/* VS 구분선 */}
                <div className="flex flex-col items-center gap-1 pt-2">
                  <span className="text-[9px] font-black text-slate-300 dark:text-slate-600">R{round}</span>
                  <div className="flex-1 w-px bg-slate-200 dark:bg-slate-700 min-h-[20px]" />
                </div>

                {/* 약세 셀 */}
                <div>
                  {bearMsg && (
                    <DebateMsgCard msg={bearMsg} debatingSide={debatingSide} onExpand={onExpand} />
                  )}
                  {isBearThisRound && !bearMsg && (
                    <div className="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/10 px-3 py-3">
                      <p className="text-[11px] text-blue-400 flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2 flex-none">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                        </span>
                        반론 작성 중...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─── 최종 결정 카드 ───────────────────────────────────────────────────────────

function FinalVerdictCard({ data }: { data: FinalDecision }) {
  const bullish = isBullishVerdict(data.verdict);
  const bearish = isBearishVerdict(data.verdict);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className={cn(
        "bg-white dark:bg-slate-900 rounded-2xl border-[2.5px] shadow-lg overflow-hidden relative",
        bullish && "border-red-500",
        bearish && "border-blue-500",
        !bullish && !bearish && "border-slate-300 dark:border-slate-700",
      )}>
        <div className={cn(
          "absolute top-0 right-0 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl",
          bullish && "bg-red-500",
          bearish && "bg-blue-500",
          !bullish && !bearish && "bg-slate-500",
        )}>
          최종 결정
        </div>

        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
              bullish && "bg-red-100 dark:bg-red-900/30",
              bearish && "bg-blue-100 dark:bg-blue-900/30",
              !bullish && !bearish && "bg-slate-100 dark:bg-slate-800",
            )}>
              {bullish && <TrendingUp className="text-red-600 dark:text-red-400" size={24} />}
              {bearish && <TrendingDown className="text-blue-600 dark:text-blue-400" size={24} />}
              {!bullish && !bearish && <TrendingUp className="text-slate-500" size={24} />}
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
                {VERDICT_LABEL[data.verdict]}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <BadgeCheck size={14} className="text-emerald-500" />
                  확신도: {data.confidence === "HIGH" ? "높음" : data.confidence === "MEDIUM" ? "보통" : "낮음"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <TrendingUp size={14} /> {data.time_horizon}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {data.reasoning}
          </p>
        </div>

        <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
          {data.key_strengths.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                <TrendingUp size={14} /> 핵심 강점
              </h4>
              <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-300">
                {data.key_strengths.map((s, i) => (
                  <li key={i} className="flex gap-2"><span className="text-red-500 font-bold shrink-0">↑</span>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {data.key_risks.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                <TrendingDown size={14} /> 핵심 리스크
              </h4>
              <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-300">
                {data.key_risks.map((r, i) => (
                  <li key={i} className="flex gap-2"><span className="text-blue-500 font-bold shrink-0">↓</span>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-5 py-3 bg-slate-100 dark:bg-slate-950 text-[10px] text-slate-400 flex items-start gap-1.5">
          <Info size={12} className="flex-shrink-0 mt-0.5" />
          <p>본 AI 분석 결과는 투자 참고용이며, 최종 투자 결정과 책임은 투자자 본인에게 있습니다.</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 카드 상세 오버레이 (패널 내 전체 컨텐츠 보기) ───────────────────────────

function CardDetailOverlay({
  title,
  content,
  onClose,
}: {
  title: string;
  content: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 260 }}
      className="absolute inset-0 bg-slate-50 dark:bg-slate-950 z-10 flex flex-col"
    >
      <div className="flex-none flex items-center gap-3 px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} /> 돌아가기
        </button>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className={PROSE}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 메인 패널 ────────────────────────────────────────────────────────────────

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
  open: openPanel,
  run,
  resume,
  stop,
  close,
  toggleMinimize,
  dismissReanalysisPrompt,
}: AIAnalysisPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedCard, setExpandedCard] = useState<{ title: string; content: string } | null>(null);

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

  // 새 에이전트 시작 시 자동 스크롤
  useEffect(() => {
    if (!scrollRef.current || isMinimized) return;
    const hasRunning = agents.some((a) => a.status === "running");
    if (hasRunning || final) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [agents, final, debate.length, isMinimized]);

  // 카드 상세 열기
  const handleExpand = (title: string, content: string) => setExpandedCard({ title, content });

  // 에이전트 그룹 (Row 1: 분석가, Row 3: 매니저)
  const analystKeys: AgentKey[] = ["market", "news", "fundamentals"];
  const managerKeys: AgentKey[] = ["research_manager", "risk", "portfolio_manager"];

  return (
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
              "w-full md:w-[calc(100vw-48px)]",
              isMinimized ? "" : "h-full",
            )}
            aria-label="AI 종합분석"
            role="complementary"
          >
            {/* ── 헤더 ──────────────────────────────────────────────────── */}
            <div className="flex-none flex items-center justify-between px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="text-blue-600 dark:text-blue-400" size={18} />
                <h2 className="font-bold text-base text-slate-900 dark:text-white">AI 종합분석</h2>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {ticker}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* 중지 / 재개 버튼 */}
                {isRunning ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    <Square size={11} fill="currentColor" /> 중지
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
                        {AGENT_META.find(m => m.key === resumeFrom)?.label}부터
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={run}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                    >
                      <RefreshCw size={11} /> 처음부터
                    </button>
                  </>
                )}
                {/* 접기/펼치기 */}
                <button
                  type="button"
                  onClick={toggleMinimize}
                  title={isMinimized ? "펼치기" : "접기"}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                >
                  {isMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
                {/* 닫기 */}
                <button
                  type="button"
                  onClick={close}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                  aria-label="닫기"
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
                      const handleClick = isError && !isRunning ? () => resume(meta.key) : undefined;
                      return (
                        <div
                          key={meta.key}
                          onClick={handleClick}
                          title={isError && !isRunning ? `${meta.label}부터 재개` : undefined}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-colors",
                            agentStatus === "pending" && "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500",
                            agentStatus === "running" && "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
                            agentStatus === "done" && "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
                            isError && "bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
                            isError && !isRunning && "cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50",
                          )}
                        >
                          {agentStatus === "done" && <Check size={10} />}
                          {agentStatus === "running" && <RefreshCw size={10} className="animate-spin" />}
                          {agentStatus === "pending" && <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />}
                          {isError && <RefreshCw size={10} />}
                          {meta.label}
                          {isError && !isRunning && <span className="opacity-70">재시도</span>}
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
                            이전 분석 결과가 있습니다. AI로 재분석할까요?
                          </p>
                          <div className="flex gap-2 flex-none">
                            <button
                              type="button"
                              onClick={run}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              재분석하기
                            </button>
                            <button
                              type="button"
                              onClick={dismissReanalysisPrompt}
                              className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-medium cursor-pointer hover:opacity-70"
                            >
                              유지하기
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
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI 에이전트들이 대기 중입니다</h3>
                          <p className="text-xs text-slate-500 mt-1">버튼을 눌러 분석을 시작하세요</p>
                        </div>
                        <button
                          type="button"
                          onClick={run}
                          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
                        >
                          분석 시작하기
                        </button>
                      </div>
                    )}

                    {/* 오류 */}
                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">{error}</p>
                        <button type="button" onClick={run} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                          다시 시도
                        </button>
                      </div>
                    )}

                    {/* ── Row 1: 분석가 3개 카드 ─────────────────────── */}
                    {analystKeys.some(k => agents.find(a => a.key === k)?.status !== "pending") && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {analystKeys.map((key) => {
                          const meta = AGENT_META.find(m => m.key === key)!;
                          const agentState = agents.find(a => a.key === key)!;
                          if (agentState.status === "pending") {
                            return (
                              <div key={key} className="bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800" style={{ minHeight: 180 }} />
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

                    {/* ── Row 3: 매니저 3개 카드 ──────────────────────── */}
                    {managerKeys.some(k => agents.find(a => a.key === k)?.status !== "pending") && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {managerKeys.map((key) => {
                          const meta = AGENT_META.find(m => m.key === key)!;
                          const agentState = agents.find(a => a.key === key)!;
                          if (agentState.status === "pending") {
                            return (
                              <div key={key} className="bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800" style={{ minHeight: 180 }} />
                            );
                          }
                          // portfolio_manager가 완료되고 final이 있으면 Row 4에서 표시 → 이 행은 "결과 확인 ↓" 표시
                          if (key === "portfolio_manager") {
                            if (final) {
                              return (
                                <motion.div
                                  key={key}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 overflow-hidden flex flex-col shadow-sm"
                                  style={{ minHeight: 180 }}
                                >
                                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/10 flex-none">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-none" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex-1">{meta.label}</span>
                                    <Check size={12} className="text-emerald-500 flex-none" />
                                  </div>
                                  <div className="flex-1 flex items-center justify-center p-4">
                                    <div className="text-center">
                                      <div className={cn(
                                        "text-2xl font-extrabold mb-1",
                                        isBullishVerdict(final.verdict) && "text-red-600 dark:text-red-400",
                                        isBearishVerdict(final.verdict) && "text-blue-600 dark:text-blue-400",
                                        !isBullishVerdict(final.verdict) && !isBearishVerdict(final.verdict) && "text-slate-700",
                                      )}>
                                        {VERDICT_LABEL[final.verdict]}
                                      </div>
                                      <p className="text-[10px] text-slate-400">아래에서 전체 결과 확인 ↓</p>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            }
                            // 아직 final 없는 경우 (running or error)
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

                    {/* ── Row 4: 최종 결정 ─────────────────────────────── */}
                    {final && <FinalVerdictCard data={final} />}

                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
