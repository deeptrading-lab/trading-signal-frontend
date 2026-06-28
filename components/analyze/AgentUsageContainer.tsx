/**
 * AgentUsageContainer — 토큰 대시보드의 client 데이터 경계.
 *
 * useQueryAgentUsage 로 Supabase 집계를 가져와 로딩/에러/미설정/빈 분기를 처리하고,
 * provider 탭(Claude/Codex)별로 지표 카드·막대·추세·테이블을 렌더한다.
 * 커스텀훅 의무화(frontend.md §1) — useQuery 직접 import 금지, 도메인 훅만 소비.
 */

"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQueryAgentUsage } from "@/hooks/stock/useQueryAgentUsage";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";
import { CacheCostCards } from "./CacheCostCards";
import { ModelCostBreakdown } from "./ModelCostBreakdown";
import { AgentTokenBarChart } from "./AgentTokenBarChart";
import { StageInputTrendChart } from "./StageInputTrendChart";
import { AgentUsageTable } from "./AgentUsageTable";
import {
  CODEX_UNMEASURED_NOTICE,
  PROVIDER_TAB_CLAUDE,
  PROVIDER_TAB_CODEX,
  USAGE_EMPTY_BODY,
  USAGE_EMPTY_TITLE,
  USAGE_ERROR,
  USAGE_LOADING,
  USAGE_NOT_CONFIGURED_BODY,
  USAGE_NOT_CONFIGURED_TITLE,
  USAGE_REFRESH,
  USAGE_RETRY,
  usageRunCount,
} from "@/lib/copy/analyze/labels";

const TABS: { key: AIAnalysisProvider; label: string }[] = [
  { key: "claude", label: PROVIDER_TAB_CLAUDE },
  { key: "codex", label: PROVIDER_TAB_CODEX },
];

export function AgentUsageContainer() {
  const { data, isLoading, isError, isFetching, refetch } = useQueryAgentUsage();
  // null = 사용자 미선택 → 가장 최근 분석 provider(latestProvider)를 기본 탭으로.
  const [picked, setPicked] = useState<AIAnalysisProvider | null>(null);

  if (isLoading) {
    return (
      <div className="card skeleton min-h-[160px]" aria-busy="true">
        <span className="sr-only">{USAGE_LOADING}</span>
        <div className="skeleton-line skeleton-line-medium" />
        <div className="skeleton-line skeleton-line-narrow" />
        <div className="skeleton-line skeleton-line-medium" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card-critical" role="alert">
        <p className="text-body-strong mb-md">{USAGE_ERROR}</p>
        <button type="button" className="button-secondary" onClick={() => refetch()}>
          {USAGE_RETRY}
        </button>
      </div>
    );
  }

  if (!data.configured) {
    return (
      <div className="card" role="status">
        <h2 className="text-h3 text-text-strong mb-sm">{USAGE_NOT_CONFIGURED_TITLE}</h2>
        <p className="text-body-sm text-text-muted">{USAGE_NOT_CONFIGURED_BODY}</p>
      </div>
    );
  }

  const provider = picked ?? data.latestProvider ?? "claude";
  const rows = data.byProvider[provider] ?? [];
  const wallClockMs = data.runStatsByProvider[provider]?.avgWallClockMs ?? null;

  return (
    <div className="flex flex-col gap-md">
      {/* provider 탭 + run 수 + 새로고침 */}
      <div className="flex items-center justify-between gap-md flex-wrap">
        <div className="flex items-center gap-sm" role="tablist" aria-label="AI 공급자">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={provider === t.key}
              onClick={() => setPicked(t.key)}
              className={cn(
                "cursor-pointer rounded-pill border px-md py-xs text-body-sm-strong transition-colors",
                provider === t.key
                  ? "border-accent-vivid bg-accent-vivid-soft text-accent-vivid"
                  : "border-border-line bg-surface text-text-muted hover:text-text-strong",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-md">
          <span className="text-caption text-text-muted">{usageRunCount(data.runCount)}</span>
          <button
            type="button"
            className="inline-flex items-center gap-xs text-caption text-text-muted hover:text-text-strong"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden="true" />
            {USAGE_REFRESH}
          </button>
        </div>
      </div>

      {provider === "codex" ? (
        <p className="card text-body-sm text-text-muted">{CODEX_UNMEASURED_NOTICE}</p>
      ) : null}

      {rows.length === 0 ? (
        <div className="card" role="status">
          <h2 className="text-h3 text-text-strong mb-sm">{USAGE_EMPTY_TITLE}</h2>
          <p className="text-body-sm text-text-muted">{USAGE_EMPTY_BODY}</p>
        </div>
      ) : (
        <>
          <CacheCostCards rows={rows} wallClockMs={wallClockMs} />
          <ModelCostBreakdown rows={rows} />
          <AgentTokenBarChart rows={rows} />
          <StageInputTrendChart rows={rows} />
          <AgentUsageTable rows={rows} />
        </>
      )}
    </div>
  );
}
