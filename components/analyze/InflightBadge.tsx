/**
 * InflightBadge — 진행중 작업 상태 배지(분석 중 / 대기 중). (unified-analysis-jobs)
 *
 * /analyze 의 재분석 중 카드(AIDecisionCard)·첫 분석 플레이스홀더(InflightCard) 공용.
 * 색·톤은 #176 워커 뱃지와 일관(accent-vivid-soft + primary, processing 은 펄스 점). 신규 토큰 0.
 * 점은 aria-hidden, 가시 텍스트가 접근성 이름.
 */

"use client";

import { cn } from "@/lib/utils/cn";
import { INFLIGHT_PENDING, INFLIGHT_PROCESSING } from "@/lib/copy/analyze/labels";

export function InflightBadge({ status }: { status: "pending" | "processing" }) {
  const processing = status === "processing";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-vivid-soft px-sm py-[2px] text-caption text-primary">
      <span
        className={cn("w-1.5 h-1.5 rounded-full bg-current", processing && "animate-pulse")}
        aria-hidden="true"
      />
      {processing ? INFLIGHT_PROCESSING : INFLIGHT_PENDING}
    </span>
  );
}
