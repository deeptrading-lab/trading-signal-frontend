/**
 * InflightBadge — 진행중 작업 상태 배지(분석 중 / 대기 중). (unified-analysis-jobs)
 *
 * /analyze 의 재분석 중 카드(AIDecisionCard)·첫 분석 플레이스홀더(InflightCard) 공용.
 * 두 상태를 **색으로 뚜렷이** 구분한다(펄스만으론 눈에 안 띔):
 *   - 분석 중(processing) = 파랑(accent-vivid-soft + primary) + **펄스** 점(실행 중).
 *   - 대기 중(pending)    = 앰버(amber, 대기/보류 관례) + **정적** 점.
 * 점 색은 bg-current 라 글자색을 따라가 자동으로 파랑/앰버로 갈린다. 점은 aria-hidden.
 */

"use client";

import { cn } from "@/lib/utils/cn";
import { INFLIGHT_PENDING, INFLIGHT_PROCESSING } from "@/lib/copy/analyze/labels";

export function InflightBadge({ status }: { status: "pending" | "processing" }) {
  const processing = status === "processing";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-sm py-[2px] text-caption",
        processing
          ? "bg-accent-vivid-soft text-primary"
          : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      )}
    >
      <span
        className={cn("w-1.5 h-1.5 rounded-full bg-current", processing && "animate-pulse")}
        aria-hidden="true"
      />
      {processing ? INFLIGHT_PROCESSING : INFLIGHT_PENDING}
    </span>
  );
}
