/**
 * AIDecisionCard — 저장된 한 종목의 AI 분석 결론 요약 카드.
 *
 * 방향 아이콘(강세 빨강 / 약세 파랑 / 중립 회색)·종목명·판정 라벨과, 확신도·유효기간·토큰을
 * 보조 chip 으로 보여준다. 종목명은 분석 파이프라인에 없어 useQueryStockPrice(ticker)로 채운다.
 * 카드 클릭 → 상세 시트(onSelect). 호버 시 블러 오버레이 + "전체 보기" 문구로 클릭 가능을 알린다.
 * 색 규칙(강세=빨강/약세=파랑)은 FinalVerdictCard·SentimentBadge 팔레트와 동일(한국 시장 관례).
 */

"use client";

import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, Minus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/formatRelativeTime";
import { fmtCost, fmtTokens } from "./format";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import {
  VERDICT_LABEL,
  isBullishVerdict,
  isBearishVerdict,
} from "@/components/stock/ai-analysis/FinalVerdictCard";
import type { FinalVerdict } from "@/lib/types/stock/aiAnalysis";
import type { AIDecisionListItem } from "@/lib/types/stock/aiAnalysisDecisions";
import { AIDecisionCardMenu } from "./AIDecisionCardMenu";
import {
  CARD_OVERLAY_VIEW,
  CARD_TOKENS_LABEL,
  CARD_TOKENS_NONE,
  MEASURE_BADGE_UNMEASURED,
} from "@/lib/copy/analyze/labels";

type Tone = "bull" | "bear" | "neutral";

function toneOf(verdict: FinalVerdict): Tone {
  if (isBullishVerdict(verdict)) return "bull";
  if (isBearishVerdict(verdict)) return "bear";
  return "neutral";
}

const ICON_WRAP: Record<Tone, string> = {
  bull: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  bear: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  neutral: "bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400",
};

const VERDICT_TEXT: Record<Tone, string> = {
  bull: "text-red-600 dark:text-red-400",
  bear: "text-blue-600 dark:text-blue-400",
  neutral: "text-slate-500 dark:text-slate-400",
};

/** 좌측 강조 바 — 카드에 방향성을 한 눈에. */
const ACCENT_BAR: Record<Tone, string> = {
  bull: "bg-red-400 dark:bg-red-500",
  bear: "bg-blue-400 dark:bg-blue-500",
  neutral: "bg-slate-300 dark:bg-slate-600",
};

/** 확신도·유효기간·토큰 등 보조 정보 chip. */
function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-pill bg-surface-muted px-sm py-[2px] text-caption text-text-muted">
      {children}
    </span>
  );
}

/** 토큰 chip 문구 — "총 토큰 12,345 · $0.1234" / "측정 안 됨" / "토큰 기록 없음". */
function tokenChipLabel(item: AIDecisionListItem): string {
  const { tokens } = item;
  if (!tokens) return CARD_TOKENS_NONE;
  if (!tokens.measured) return MEASURE_BADGE_UNMEASURED;
  const total = (tokens.totalInputTokens ?? 0) + (tokens.totalOutputTokens ?? 0);
  const cost = tokens.totalCostUsd !== null ? ` · ${fmtCost(tokens.totalCostUsd)}` : "";
  return `${CARD_TOKENS_LABEL} ${fmtTokens(total)}${cost}`;
}

interface AIDecisionCardProps {
  item: AIDecisionListItem;
  /** 컨테이너가 해석한 종목명(없으면 ticker). */
  name: string;
  onSelect: (item: AIDecisionListItem) => void;
}

export function AIDecisionCard({ item, name, onSelect }: AIDecisionCardProps) {
  const verdict = item.decision.verdict;
  const tone = toneOf(verdict);
  const open = () => onSelect(item);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${name} AI 분석 결론 전체 보기`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        "group card relative overflow-hidden flex flex-col gap-md",
        "cursor-pointer transition-shadow duration-150 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-vivid",
      )}
    >
      {/* 좌측 방향 강조 바 — .card 의 좌측 패딩 거터 안에 위치(본문과 겹치지 않음) */}
      <span
        aria-hidden="true"
        className={cn("absolute left-0 top-0 bottom-0 w-1", ACCENT_BAR[tone])}
      />

      {/* 호버 오버레이 — 블러 + 종목명 + "AI 분석 전체보기". 클릭은 카드로 통과(pointer-events-none) */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-xs bg-surface/90 backdrop-blur-sm opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="max-w-full truncate px-md text-h2 text-text-strong">{name}</span>
        <span className="inline-flex items-center gap-xs text-body-strong text-accent-vivid">
          {CARD_OVERLAY_VIEW}
          <ArrowRight size={16} aria-hidden="true" />
        </span>
      </div>

      {/* 상단: 아이콘 + 종목명/판정 + 케밥 메뉴(우상단) */}
      <div className="flex items-center gap-md">
        <span
          className={cn(
            "flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full",
            ICON_WRAP[tone],
          )}
        >
          {tone === "bull" ? (
            <TrendingUp size={20} aria-hidden="true" />
          ) : tone === "bear" ? (
            <TrendingDown size={20} aria-hidden="true" />
          ) : (
            <Minus size={20} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-body-strong text-text-strong truncate">{name}</div>
          <div className={cn("text-body-sm-strong", VERDICT_TEXT[tone])}>
            {VERDICT_LABEL[verdict]}
          </div>
        </div>
        <div className="flex-shrink-0 self-start">
          <AIDecisionCardMenu item={item} name={name} />
        </div>
      </div>

      {/* 보조: 확신도 · 유효기간 · 토큰 + 분석시각(오른쪽 끝으로 내림) */}
      <div className="flex flex-wrap items-center gap-xs">
        <MetaChip>{COPY.verdict.confidence(item.decision.confidence)}</MetaChip>
        <MetaChip>{COPY.verdict.horizon(item.decision.time_horizon)}</MetaChip>
        <MetaChip>{tokenChipLabel(item)}</MetaChip>
        <span className="ml-auto text-caption text-text-muted">
          {formatRelativeTime(item.updatedAt)}
        </span>
      </div>
    </div>
  );
}
