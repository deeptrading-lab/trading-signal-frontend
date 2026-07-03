/**
 * InflightCard — 완료 결과가 아직 없는 진행중 종목(첫 분석) 플레이스홀더 행. (unified-analysis-jobs)
 *
 * analyze-reskin — AIDecisionCard 와 동일하게 카드 → 플랫 목록 행(`ListRow`)으로 낮춘다.
 *   verdict 가 없으므로 클릭·상세 없이 "분석 중/대기 중"만 알린다(role=status, 비클릭). 결과가 저장되면
 *   다음 폴링에서 이 자리가 결과 행으로 바뀐다. 색은 상태 토큰(처리=accent / 대기=warn) — 다크 자동 대응.
 */

"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ListRow } from "@/components/ui/ListRow";
import { InflightBadge } from "./InflightBadge";
import {
  INFLIGHT_PLACEHOLDER_HINT,
  INFLIGHT_SOURCE_BOT,
} from "@/lib/copy/analyze/labels";
import type { AIInflightItem } from "@/lib/types/stock/aiAnalysisDecisions";

interface InflightCardProps {
  item: AIInflightItem;
  /** 컨테이너가 해석한 종목명(없으면 ticker). */
  name: string;
}

export function InflightCard({ item, name }: InflightCardProps) {
  const processing = item.status === "processing";
  return (
    <ListRow
      role="listitem"
      aria-busy={processing}
      className="grid grid-cols-[auto_1fr] items-center gap-md"
    >
      <span
        className={cn(
          "inline-grid h-8 w-8 shrink-0 place-items-center rounded-full",
          processing ? "bg-accent-vivid-soft text-primary" : "bg-warn-soft text-warn",
        )}
        aria-hidden="true"
      >
        <Loader2 className={cn("h-4 w-4", processing && "animate-spin")} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-sm">
          <span className="truncate text-body-sm-strong text-text-strong">{name}</span>
          <InflightBadge status={item.status} />
          {item.source === "bot" && (
            <span className="shrink-0 text-caption text-text-muted">{INFLIGHT_SOURCE_BOT}</span>
          )}
        </div>
        <p className="mt-xs text-caption text-text-muted">{INFLIGHT_PLACEHOLDER_HINT}</p>
      </div>
    </ListRow>
  );
}
