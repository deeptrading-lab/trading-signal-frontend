/**
 * ScorecardContainer — 적중률 표의 client 데이터 경계.
 *
 * PRD `signal-scorecard` §3-3-B / AC-8.
 * useQueryScorecardSummary 로 집계를 가져와 로딩/에러/미설정/빈 분기를 처리하고,
 * 차원(verdict/confidence/horizon/signalScore)·평가시점(d1/w1/m1/all) 필터로 표를 좁힌다.
 * 필터는 로드된 집계를 클라이언트에서 거른다(소량, 네트워크 호출 없음).
 *
 * scorecard-reskin(카드리스/화이트포워드) — 로딩/에러/미설정/빈 상태의 카드 박스(`.card`·
 * `.card-critical`)를 걷어내고 흰 바탕 위 헤어라인 스켈레톤·플랫 알림·중앙 StatusBlock 으로,
 * 표는 카드 래퍼 없이 직접 렌더한다. 새로고침은 subtle 텍스트 버튼(홈 대시보드 정합).
 * 데이터·필터 로직은 무변경(표현만 교체).
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
    // 카드리스 플랫 스켈레톤 — 박스 없이 헤어라인 행(홈 표 로딩 정합).
    return (
      <div aria-busy="true" aria-label={STATE_LOADING}>
        <span className="sr-only">{STATE_LOADING}</span>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-md border-b border-border-line py-md last:border-b-0"
            aria-hidden="true"
          >
            <div className="h-4 w-1/4 animate-pulse rounded-sm bg-surface-muted" />
            <div className="h-4 w-1/6 animate-pulse rounded-sm bg-surface-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    // 카드리스 플랫 알림 — 박스 없이 여백만(홈 랭킹·결과 목록 에러 정합).
    return (
      <div className="flex flex-col items-start gap-md py-md" role="alert">
        <p className="text-body-sm text-text-muted">{STATE_ERROR}</p>
        <button type="button" className="button-secondary" onClick={() => refetch()}>
          {STATE_RETRY}
        </button>
      </div>
    );
  }

  if (!data.configured) {
    return <StatusBlock title={NOT_CONFIGURED_TITLE} body={NOT_CONFIGURED_BODY} />;
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
          className="ml-auto inline-flex items-center gap-xs text-caption text-text-muted hover:text-text-strong"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden="true" />
          {STATE_REFRESH}
        </button>
      </div>

      <p className="text-caption text-text-muted">
        {summaryHeadline(data.scoredCount, data.totalRows)} · {HIT_RATE_NOTE}
      </p>
      <p className="text-caption text-text-muted">{METRIC_NOTE_EXCESS}</p>

      {isEmpty || filtered.length === 0 ? (
        <StatusBlock title={EMPTY_TITLE} body={EMPTY_BODY} />
      ) : (
        <ScorecardTable cells={filtered} />
      )}
    </div>
  );
}

/** 미설정·빈 — 카드 박스 없이 흰 바탕 + 여백만(홈 결과 목록 StatusBlock 정합).
 *  제목은 `text-body-md font-bold`(= body-strong 조합) — 새 `text-body-strong` 미도입. */
function StatusBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-xs py-2xl text-center" role="status">
      <p className="text-body-md font-bold text-text-strong">{title}</p>
      <p className="text-body-sm text-text-muted">{body}</p>
    </div>
  );
}
