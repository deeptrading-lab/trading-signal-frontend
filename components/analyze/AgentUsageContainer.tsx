/**
 * AgentUsageContainer — 토큰 대시보드의 client 데이터 경계.
 *
 * useQueryAgentUsage 로 Supabase 집계를 가져와 로딩/에러/미설정/빈 분기를 처리하고,
 * provider 탭(Claude/Codex)별로 지표 카드·막대·추세·테이블을 렌더한다.
 * 커스텀훅 의무화(frontend.md §1) — useQuery 직접 import 금지, 도메인 훅만 소비.
 */

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQueryAgentUsage } from "@/hooks/stock/useQueryAgentUsage";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";
import { CacheCostCards } from "./CacheCostCards";
import { ModelCostBreakdown } from "./ModelCostBreakdown";
import { AgentUsageTable } from "./AgentUsageTable";
import { SamsungAbExperimentCard } from "./SamsungAbExperimentCard";

// recharts 차트 3종은 recharts(≈109kB gzip)를 끌어오므로 next/dynamic 으로 지연 로드 —
// Usage 탭에 데이터가 있을 때만(아래 조건부 렌더) 청크 로드(perf WS-4). 차트 래퍼(section.card)와
// 높이를 맞춘 스켈레톤으로 레이아웃 시프트 최소화.
function ChartSkeleton({ heightClass }: { heightClass: string }) {
  return (
    <section className="card" aria-hidden="true">
      <div className="mb-md h-4 w-40 animate-pulse rounded bg-surface-muted" />
      <div className={cn("w-full animate-pulse rounded-lg bg-surface-muted", heightClass)} />
    </section>
  );
}
const RunTrendChart = dynamic(
  () => import("./RunTrendChart").then((m) => m.RunTrendChart),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-[280px]" /> },
);
const AgentTokenBarChart = dynamic(
  () => import("./AgentTokenBarChart").then((m) => m.AgentTokenBarChart),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-[320px]" /> },
);
const StageInputTrendChart = dynamic(
  () => import("./StageInputTrendChart").then((m) => m.StageInputTrendChart),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-[300px]" /> },
);
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
  const runSeries = data.runSeriesByProvider?.[provider] ?? [];

  return (
    <div className="flex flex-col gap-md">
      <SamsungAbExperimentCard />

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
          <RunTrendChart key={provider} series={runSeries} />
          <AgentTokenBarChart rows={rows} />
          <StageInputTrendChart rows={rows} />
          <AgentUsageTable rows={rows} />
        </>
      )}
    </div>
  );
}
