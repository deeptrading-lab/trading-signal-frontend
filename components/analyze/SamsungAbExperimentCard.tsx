/**
 * 삼성전자 기준 A/B 토큰 개선 리포트.
 *
 * 실제 분석 실행은 긴 로컬 작업이므로 UI는 읽기 전용 리포트와 실행 명령을 제공한다.
 * session 을 바꾸면 같은 BFF(`/api/ab-harness/report`)로 다른 실험 배치도 확인할 수 있다.
 */

"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQueryAbHarnessReport } from "@/hooks/stock/useQueryAbHarnessReport";
import type { ConfigDelta, ConfigStats } from "@/lib/types/stock/abHarness";
import {
  AB_BASELINE,
  AB_COL_CONFIG,
  AB_COL_COST,
  AB_COL_INPUT,
  AB_COL_HEALTH,
  AB_COL_MEDIAN_TIME,
  AB_COL_OUTPUT,
  AB_COL_RUNS,
  AB_COL_STATUS,
  AB_COL_TIME,
  AB_COL_WORST_TIME,
  AB_DELTA_DIRECTION,
  AB_DELTA_INPUT,
  AB_DELTA_ORDINAL,
  AB_DELTA_OUTPUT,
  AB_DELTA_TIME,
  AB_DELTA_VERDICT,
  AB_DELTA_WORST_TIME,
  AB_REPORT_EMPTY_BODY,
  AB_REPORT_EMPTY_TITLE,
  AB_REPORT_ERROR,
  AB_REPORT_LOADING,
  AB_REPORT_NOT_CONFIGURED_BODY,
  AB_REPORT_NOT_CONFIGURED_TITLE,
  AB_REPORT_REFRESH,
  AB_SAMSUNG_COMMAND,
  AB_SAMSUNG_COMMAND_HINT,
  AB_SAMSUNG_COMMAND_TITLE,
  AB_SAMSUNG_SESSION,
  AB_SAMSUNG_SESSION_LABEL,
  AB_SAMSUNG_SESSION_PLACEHOLDER,
  AB_SAMSUNG_SUBTITLE,
  AB_SAMSUNG_TITLE,
  AB_SINGLE_TICKER_NOTICE,
  AB_STATUS_INSUFFICIENT,
  AB_STATUS_PASS,
  AB_STATUS_REVIEW,
  AB_VARIANT,
  abRunHealth,
  abRunCount,
} from "@/lib/copy/analyze/labels";
import { fmtCostRounded, fmtDuration, fmtRate, fmtTokens } from "./format";

function totalInput(config: ConfigStats): number | null {
  const fresh = config.perRun.newInputTokens;
  const cache = config.perRun.cacheReadTokens;
  if (fresh == null && cache == null) return null;
  return (fresh ?? 0) + (cache ?? 0);
}

function fmtDeltaPct(value: number | null): string {
  if (value == null) return "—";
  const pct = value * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function pctDelta(base: number | null, other: number | null): number | null {
  if (base == null || other == null || base === 0) return null;
  return (other - base) / base;
}

function fmtOrdinalDistance(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}단계`;
}

function deltaTone(value: number | null, lowerIsBetter = true): string {
  if (value == null || Math.abs(value) < 0.001) return "text-text-muted";
  const improved = lowerIsBetter ? value < 0 : value > 0;
  return improved ? "text-accent-vivid" : "text-critical";
}

function statusLabel(status: ConfigDelta["status"]): string {
  if (status === "PASS") return AB_STATUS_PASS;
  if (status === "REVIEW") return AB_STATUS_REVIEW;
  return AB_STATUS_INSUFFICIENT;
}

function statusClass(status: ConfigDelta["status"]): string {
  if (status === "PASS") return "badge-accent";
  if (status === "REVIEW") return "badge-warn";
  return "badge-info";
}

function ConfigRow({
  config,
  delta,
  isBaseline,
}: {
  config: ConfigStats;
  delta?: ConfigDelta;
  isBaseline?: boolean;
}) {
  return (
    <tr className="border-t border-border-line">
      <td className="py-sm pr-md">
        <div className="flex flex-col gap-2xs">
          <span className="text-body-sm-strong text-text-strong">
            {isBaseline ? AB_BASELINE : AB_VARIANT}
          </span>
          <span className="text-caption text-text-muted">
            {config.configLabel ?? config.configId}
          </span>
        </div>
      </td>
      <td className="py-sm pr-md text-body-sm tabular-nums text-text-muted">
        {abRunCount(config.runCount)}
      </td>
      <td className="py-sm pr-md text-body-sm tabular-nums text-text-strong">
        {fmtCostRounded(config.perRun.costUsd)}
      </td>
      <td className="py-sm pr-md text-body-sm tabular-nums text-text-strong">
        {fmtTokens(totalInput(config))}
      </td>
      <td className="py-sm pr-md text-body-sm tabular-nums text-text-strong">
        {fmtTokens(config.perRun.outputTokens)}
      </td>
      <td className="py-sm pr-md text-body-sm tabular-nums text-text-strong">
        {fmtDuration(config.avgWallClockMs)}
      </td>
      <td className="py-sm pr-md text-body-sm tabular-nums text-text-strong">
        {fmtDuration(config.runHealth.medianWallClockMs)}
      </td>
      <td className="py-sm pr-md text-body-sm tabular-nums text-text-strong">
        {fmtDuration(config.runHealth.worstWallClockMs)}
      </td>
      <td className="py-sm pr-md text-caption text-text-muted">
        {abRunHealth(
          config.runHealth.incompleteRunCount,
          config.runHealth.longAgentCount,
          config.runHealth.unmeasuredAgentCount,
        )}
      </td>
      <td className="py-sm text-body-sm">
        {delta ? (
          <span className={cn("inline-flex", statusClass(delta.status))}>
            {statusLabel(delta.status)}
          </span>
        ) : (
          <span className="badge-info">{AB_BASELINE}</span>
        )}
      </td>
    </tr>
  );
}

function DeltaCard({
  label,
  value,
  lowerIsBetter = true,
  toneValue,
}: {
  label: string;
  value: string;
  lowerIsBetter?: boolean;
  toneValue?: number | null;
}) {
  const numeric = toneValue === undefined
    ? (value === "—" ? null : Number(value.replace("%", "")) / 100)
    : toneValue;
  const tone = numeric == null ? "text-text-strong" : deltaTone(numeric, lowerIsBetter);
  return (
    <div className="rounded-lg border border-border-line bg-surface px-md py-sm">
      <p className="text-caption text-text-muted">{label}</p>
      <p className={cn("mt-2xs text-h3 tabular-nums", tone)}>{value}</p>
    </div>
  );
}

export function SamsungAbExperimentCard() {
  const [session, setSession] = useState(AB_SAMSUNG_SESSION);
  const trimmedSession = session.trim();
  const { data, isLoading, isError, isFetching, refetch } =
    useQueryAbHarnessReport(trimmedSession);

  const baseline = data?.configs[0];
  const deltas = data?.deltas ?? [];
  const primaryDelta = deltas[0];
  const primaryConfig = primaryDelta
    ? data?.configs.find((config) => config.configId === primaryDelta.configId)
    : undefined;
  const worstWallClockDelta = pctDelta(
    baseline?.runHealth.worstWallClockMs ?? null,
    primaryConfig?.runHealth.worstWallClockMs ?? null,
  );
  const deltaByConfig = new Map(deltas.map((d) => [d.configId, d]));

  return (
    <section className="card flex flex-col gap-md">
      <header className="flex flex-col gap-xs">
        <div className="flex items-start justify-between gap-md">
          <div>
            <h2 className="text-h3 text-text-strong">{AB_SAMSUNG_TITLE}</h2>
            <p className="mt-xs text-body-sm text-text-muted">{AB_SAMSUNG_SUBTITLE}</p>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-xs text-caption text-text-muted hover:text-text-strong"
            onClick={() => refetch()}
            disabled={isFetching || !trimmedSession}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden="true" />
            {AB_REPORT_REFRESH}
          </button>
        </div>
      </header>

      <div className="grid gap-md lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
        <div className="flex flex-col gap-sm">
          <label className="text-caption text-text-muted" htmlFor="ab-session">
            {AB_SAMSUNG_SESSION_LABEL}
          </label>
          <input
            id="ab-session"
            className="input"
            value={session}
            placeholder={AB_SAMSUNG_SESSION_PLACEHOLDER}
            onChange={(event) => setSession(event.target.value)}
          />
          <p className="text-caption text-text-muted">{AB_SINGLE_TICKER_NOTICE}</p>
        </div>

        <div className="rounded-lg border border-border-line bg-surface-muted px-md py-sm">
          <p className="text-caption font-semibold text-text-strong">{AB_SAMSUNG_COMMAND_TITLE}</p>
          <code className="mt-xs block whitespace-pre-wrap break-all rounded-md bg-surface px-sm py-xs text-caption text-text-strong">
            {AB_SAMSUNG_COMMAND}
          </code>
          <p className="mt-xs text-caption text-text-muted">{AB_SAMSUNG_COMMAND_HINT}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="skeleton min-h-[120px]" aria-busy="true">
          <span className="sr-only">{AB_REPORT_LOADING}</span>
          <div className="skeleton-line skeleton-line-medium" />
          <div className="skeleton-line skeleton-line-narrow" />
          <div className="skeleton-line skeleton-line-medium" />
        </div>
      ) : isError || !data ? (
        <div className="card-critical" role="alert">
          <p className="text-body-sm-strong">{AB_REPORT_ERROR}</p>
        </div>
      ) : !data.configured ? (
        <div className="rounded-lg border border-border-line bg-surface px-md py-sm" role="status">
          <p className="text-body-sm-strong text-text-strong">{AB_REPORT_NOT_CONFIGURED_TITLE}</p>
          <p className="mt-xs text-body-sm text-text-muted">{AB_REPORT_NOT_CONFIGURED_BODY}</p>
        </div>
      ) : data.configs.length === 0 || !baseline ? (
        <div className="rounded-lg border border-border-line bg-surface px-md py-sm" role="status">
          <p className="text-body-sm-strong text-text-strong">{AB_REPORT_EMPTY_TITLE}</p>
          <p className="mt-xs text-body-sm text-text-muted">{AB_REPORT_EMPTY_BODY}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          <div className="grid gap-sm md:grid-cols-3 xl:grid-cols-6">
            <DeltaCard label={AB_DELTA_INPUT} value={fmtDeltaPct(primaryDelta?.inputDeltaPct ?? null)} />
            <DeltaCard label={AB_DELTA_TIME} value={fmtDeltaPct(primaryDelta?.wallClockDeltaPct ?? null)} />
            <DeltaCard label={AB_DELTA_WORST_TIME} value={fmtDeltaPct(worstWallClockDelta)} />
            <DeltaCard label={AB_DELTA_OUTPUT} value={fmtDeltaPct(primaryDelta?.outputDeltaPct ?? null)} />
            <DeltaCard
              label={AB_DELTA_VERDICT}
              value={fmtRate(primaryDelta?.verdictAgreementRate ?? null)}
              lowerIsBetter={false}
            />
            <DeltaCard
              label={AB_DELTA_DIRECTION}
              value={fmtRate(primaryDelta?.directionAgreementRate ?? null)}
              lowerIsBetter={false}
            />
            <DeltaCard
              label={AB_DELTA_ORDINAL}
              value={fmtOrdinalDistance(primaryDelta?.verdictOrdinalDistance ?? null)}
              toneValue={primaryDelta?.verdictOrdinalDistance ?? null}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse">
              <thead>
                <tr className="text-left text-caption text-text-muted">
                  <th className="pb-xs pr-md font-medium">{AB_COL_CONFIG}</th>
                  <th className="pb-xs pr-md font-medium">{AB_COL_RUNS}</th>
                  <th className="pb-xs pr-md font-medium">{AB_COL_COST}</th>
                  <th className="pb-xs pr-md font-medium">{AB_COL_INPUT}</th>
                  <th className="pb-xs pr-md font-medium">{AB_COL_OUTPUT}</th>
                  <th className="pb-xs pr-md font-medium">{AB_COL_TIME}</th>
                  <th className="pb-xs pr-md font-medium">{AB_COL_MEDIAN_TIME}</th>
                  <th className="pb-xs pr-md font-medium">{AB_COL_WORST_TIME}</th>
                  <th className="pb-xs pr-md font-medium">{AB_COL_HEALTH}</th>
                  <th className="pb-xs font-medium">{AB_COL_STATUS}</th>
                </tr>
              </thead>
              <tbody>
                {data.configs.map((config, index) => (
                  <ConfigRow
                    key={config.configId}
                    config={config}
                    isBaseline={index === 0}
                    delta={deltaByConfig.get(config.configId)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {primaryDelta?.reasons.length ? (
            <div className="rounded-lg border border-border-line bg-surface-muted px-md py-sm">
              <p className="text-caption font-semibold text-text-strong">{statusLabel(primaryDelta.status)}</p>
              <p className="mt-xs text-caption text-text-muted">{primaryDelta.reasons.join(" · ")}</p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
