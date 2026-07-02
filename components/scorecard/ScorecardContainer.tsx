/**
 * ScorecardContainer — 적중률 표의 client 데이터 경계.
 *
 * PRD `signal-scorecard` §3-3-B / AC-8.
 * useQueryScorecardSummary 로 집계를 가져와 로딩/에러/미설정/빈 분기를 처리하고,
 * 차원(verdict/confidence/horizon/signalScore)·평가시점(d1/w1/m1/all) 필터로 표를 좁힌다.
 * 필터는 로드된 집계를 클라이언트에서 거른다(소량, 네트워크 호출 없음).
 *
 * 컨벤션(frontend.md) — useQuery 직접 import 금지(도메인 훅만), 색·px 직타 금지(토큰+cn), 한글 카피.
 */

"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQueryScorecardSummary } from "@/hooks/scorecard/useQueryScorecardSummary";
import { ScorecardTable } from "./ScorecardTable";
import type {
  ScorecardDimension,
  ScorecardHorizon,
} from "@/lib/types/scorecard/scorecard";
import {
  DIMENSION_LABEL,
  DIMENSION_LABEL_REGIME,
  EMPTY_BODY,
  EMPTY_TITLE,
  FILTER_DIMENSION_LABEL,
  FILTER_HORIZON_LABEL,
  HIT_RATE_NOTE,
  HORIZON_LABEL,
  METRIC_NOTE_EXCESS,
  NOT_CONFIGURED_BODY,
  NOT_CONFIGURED_TITLE,
  STATE_ERROR,
  STATE_LOADING,
  STATE_REFRESH,
  STATE_RETRY,
  summaryHeadline,
} from "@/lib/copy/scorecard/labels";

type HorizonFilter = ScorecardHorizon | "all";

const DIMENSIONS: ScorecardDimension[] = [
  "verdict",
  "confidence",
  "horizon",
  "signalScore",
  "regime",
];

/** 차원 → 라벨(기존 DIMENSION_LABEL + regime 보강). */
const dimensionLabel = (d: ScorecardDimension): string =>
  d === "regime" ? DIMENSION_LABEL_REGIME : DIMENSION_LABEL[d];
const HORIZON_FILTERS: HorizonFilter[] = ["all", "d1", "w1", "w2", "m1"];

export function ScorecardContainer() {
  const { data, isLoading, isError, isFetching, refetch } = useQueryScorecardSummary();
  const [dimension, setDimension] = useState<ScorecardDimension>("verdict");
  const [horizon, setHorizon] = useState<HorizonFilter>("all");

  const cells = useMemo(() => data?.cells ?? [], [data]);

  const filtered = useMemo(() => {
    return cells
      .filter((c) => c.dimension === dimension)
      .filter((c) => {
        // horizon 차원은 셀 자체가 horizon 별이라 필터 무관(전부 노출). 그 외는 평가시점 필터 적용.
        if (dimension === "horizon") return true;
        if (horizon === "all") return true;
        return c.horizon === horizon;
      })
      .sort((a, b) => {
        // 표본 큰 순 → 적중률 높은 순.
        if (b.total !== a.total) return b.total - a.total;
        return (b.hitRate ?? -1) - (a.hitRate ?? -1);
      });
  }, [cells, dimension, horizon]);

  if (isLoading) {
    return (
      <div className="card skeleton min-h-[200px]" aria-busy="true">
        <span className="sr-only">{STATE_LOADING}</span>
        <div className="skeleton-line skeleton-line-medium" />
        <div className="skeleton-line skeleton-line-narrow" />
        <div className="skeleton-line skeleton-line-medium" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card-critical" role="alert">
        <p className="text-body-strong mb-md">{STATE_ERROR}</p>
        <button type="button" className="button-secondary" onClick={() => refetch()}>
          {STATE_RETRY}
        </button>
      </div>
    );
  }

  if (!data.configured) {
    return (
      <div className="card" role="status">
        <h2 className="text-h2 text-text-strong mb-sm">{NOT_CONFIGURED_TITLE}</h2>
        <p className="text-body-sm text-text-muted">{NOT_CONFIGURED_BODY}</p>
      </div>
    );
  }

  const isEmpty = data.scoredCount === 0;

  return (
    <div className="flex flex-col gap-md">
      {/* 필터 + 새로고침 줄 */}
      <div className="flex flex-wrap items-end gap-md">
        <label className="flex flex-col gap-xs text-body-sm text-text-muted">
          <span>{FILTER_DIMENSION_LABEL}</span>
          <select
            className="h-input-h rounded-md border border-border-line bg-surface-muted px-md text-text-strong"
            value={dimension}
            onChange={(e) => setDimension(e.target.value as ScorecardDimension)}
          >
            {DIMENSIONS.map((d) => (
              <option key={d} value={d}>
                {dimensionLabel(d)}
              </option>
            ))}
          </select>
        </label>

        <label
          className={cn(
            "flex flex-col gap-xs text-body-sm text-text-muted",
            dimension === "horizon" && "opacity-50",
          )}
        >
          <span>{FILTER_HORIZON_LABEL}</span>
          <select
            className="h-input-h rounded-md border border-border-line bg-surface-muted px-md text-text-strong disabled:cursor-not-allowed"
            value={horizon}
            disabled={dimension === "horizon"}
            onChange={(e) => setHorizon(e.target.value as HorizonFilter)}
          >
            {HORIZON_FILTERS.map((h) => (
              <option key={h} value={h}>
                {HORIZON_LABEL[h]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="button-secondary ml-auto inline-flex items-center gap-xs"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("size-4", isFetching && "animate-spin")} aria-hidden />
          {STATE_REFRESH}
        </button>
      </div>

      <p className="text-caption text-text-muted">
        {summaryHeadline(data.scoredCount, data.totalRows)} · {HIT_RATE_NOTE}
      </p>
      <p className="text-caption text-text-muted">{METRIC_NOTE_EXCESS}</p>

      {isEmpty || filtered.length === 0 ? (
        <div className="card" role="status">
          <h2 className="text-h2 text-text-strong mb-sm">{EMPTY_TITLE}</h2>
          <p className="text-body-sm text-text-muted">{EMPTY_BODY}</p>
        </div>
      ) : (
        <div className="card">
          <ScorecardTable cells={filtered} />
        </div>
      )}
    </div>
  );
}
