"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { SentimentBand, SentimentReport } from "@/lib/types/stock/aiAnalysis";

/**
 * SNS 분석가 카드 전용 구조화 감성 배지.
 * 위계: 밴드 pill(1차) → 점수/10(보조, 회색) → 신뢰도(약, 회색). 과신 방지를 위해
 * 점수에는 밴드 색을 입히지 않고, 신뢰도 'low'면 칩 톤을 약화한다(opacity).
 * 7단계 밴드를 5색 톤(빨강 강/빨강/slate/파랑/파랑 강)으로 묶고 세분은 라벨이 담당.
 * 색은 한국 시장 관례(긍정=빨강 / 부정=파랑 / 중립=slate) — 기존 AI 카드 팔레트 재사용.
 */

// 밴드 → soft 배경 + 텍스트 색(라벨이 색 결정의 단일 진실원천).
const BAND_TONE: Record<SentimentBand, string> = {
  VERY_POSITIVE:     "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  POSITIVE:          "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400",
  SLIGHTLY_POSITIVE: "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400",
  NEUTRAL:           "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
  SLIGHTLY_NEGATIVE: "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400",
  NEGATIVE:          "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400",
  VERY_NEGATIVE:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

interface SentimentBadgeProps {
  report: SentimentReport;
}

export function SentimentBadge({ report }: SentimentBadgeProps) {
  const { band, score, confidence } = report;
  const isLow = confidence === "low";
  const bandLabel = COPY.sentiment.bandLabel[band];
  const confLabel = COPY.sentiment.confidenceLabel[confidence];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-x-1.5 gap-y-1 max-w-full"
      title={COPY.sentiment.caption}
    >
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap",
          BAND_TONE[band],
          isLow && "opacity-70",
        )}
      >
        {bandLabel}
      </span>
      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {score}
        {COPY.sentiment.scoreSuffix}
      </span>
      <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
        {COPY.sentiment.separator} {COPY.sentiment.confidencePrefix} {confLabel}
      </span>
      {isLow && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
          {COPY.sentiment.separator} {COPY.sentiment.lowNote}
        </span>
      )}
    </motion.div>
  );
}
