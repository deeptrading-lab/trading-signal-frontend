"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { SentimentBand, SentimentReport } from "@/lib/types/stock/aiAnalysis";

/**
 * SNS 분석가 카드 전용 구조화 감성 배지.
 * 위계: 밴드 pill(1차) → 점수/10(보조, 회색) → 신뢰도(약, 회색). 과신 방지를 위해
 * 점수에는 밴드 색을 입히지 않고, 신뢰도 'low'면 칩 톤을 약화한다(opacity).
 * 7단계 밴드를 3색 톤(긍정=signal-up / 중립=muted / 부정=signal-down)으로 묶고 세분은 라벨이 담당.
 * 색은 한국 시장 관례(긍정=빨강 / 부정=파랑 / 중립=회색) — signal-up/down soft 토큰(다크 자동 대응).
 */

// 밴드 → soft 배경 + 텍스트 색(라벨이 색 결정의 단일 진실원천). hex/dark: 직타 0 — 토큰만.
const BAND_TONE: Record<SentimentBand, string> = {
  VERY_POSITIVE:     "bg-signal-up-soft text-signal-up",
  POSITIVE:          "bg-signal-up-soft text-signal-up",
  SLIGHTLY_POSITIVE: "bg-signal-up-soft text-signal-up",
  NEUTRAL:           "bg-surface-muted text-text-muted",
  SLIGHTLY_NEGATIVE: "bg-signal-down-soft text-signal-down",
  NEGATIVE:          "bg-signal-down-soft text-signal-down",
  VERY_NEGATIVE:     "bg-signal-down-soft text-signal-down",
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
          "inline-flex items-center rounded-pill px-sm py-0.5 text-caption font-bold whitespace-nowrap",
          BAND_TONE[band],
          isLow && "opacity-70",
        )}
      >
        {bandLabel}
      </span>
      <span className="text-caption font-bold text-text-muted whitespace-nowrap">
        {score}
        {COPY.sentiment.scoreSuffix}
      </span>
      <span className="text-caption text-text-muted whitespace-nowrap">
        {COPY.sentiment.separator} {COPY.sentiment.confidencePrefix} {confLabel}
      </span>
      {isLow && (
        <span className="text-caption text-text-muted whitespace-nowrap">
          {COPY.sentiment.separator} {COPY.sentiment.lowNote}
        </span>
      )}
    </motion.div>
  );
}
