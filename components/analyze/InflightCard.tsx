/**
 * InflightCard — 완료 결과가 아직 없는 진행중 종목(첫 분석) 플레이스홀더 카드. (unified-analysis-jobs)
 *
 * AIDecisionCard(완료 결과)와 분리 — verdict 가 없으므로 클릭·상세 없이 "분석 중/대기 중"만 알린다.
 * 결과가 저장되면 다음 폴링에서 이 자리가 결과 카드로 바뀐다. 색·아이콘은 기존 토큰·합성 클래스 재사용.
 */

"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
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
    <div
      className="card relative overflow-hidden flex flex-col gap-md"
      role="status"
      aria-busy={processing}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-1 bg-accent-vivid-soft"
      />
      <div className="flex items-center gap-md">
        <span className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent-vivid-soft text-primary">
          <Loader2 className={cn("w-5 h-5", processing && "animate-spin")} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-body-strong text-text-strong truncate">{name}</div>
          <div className="mt-[2px] flex items-center gap-xs">
            <InflightBadge status={item.status} />
            {item.source === "bot" && (
              <span className="text-caption text-text-muted">{INFLIGHT_SOURCE_BOT}</span>
            )}
          </div>
        </div>
      </div>
      <p className="text-caption text-text-muted">{INFLIGHT_PLACEHOLDER_HINT}</p>
    </div>
  );
}
