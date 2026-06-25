"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePaperTradingSession } from "@/hooks/paperTrading/usePaperTradingSession";
import { cn } from "@/lib/utils/cn";
import {
  ACTION_LABEL,
  PAPER_TRADING_COMPLETE,
  PAPER_TRADING_DECISION_TITLE,
  PAPER_TRADING_DETAIL_TITLE,
  PAPER_TRADING_EQUITY_TITLE,
  PAPER_TRADING_ERROR,
  PAPER_TRADING_METRIC_CASH,
  PAPER_TRADING_METRIC_INITIAL,
  PAPER_TRADING_METRIC_PROGRESS,
  PAPER_TRADING_METRIC_RETURN,
  PAPER_TRADING_METRIC_TARGET,
  PAPER_TRADING_METRIC_VALUE,
  PAPER_TRADING_NO_DECISION,
  PAPER_TRADING_NO_POSITION,
  PAPER_TRADING_PAUSE,
  PAPER_TRADING_POSITIONS_TITLE,
  PAPER_TRADING_REAL_ACTION_NOTICE,
  PAPER_TRADING_REFRESH,
  PAPER_TRADING_RESUME,
  PAPER_TRADING_RETRY,
  PAPER_TRADING_RUN_TICK,
  PAPER_TRADING_RUNNING_TICK,
  PAPER_TRADING_TABLE_ALLOC,
  PAPER_TRADING_TABLE_AVG,
  PAPER_TRADING_TABLE_PNL,
  PAPER_TRADING_TABLE_PRICE,
  PAPER_TRADING_TABLE_QUANTITY,
  PAPER_TRADING_TABLE_TICKER,
  PAPER_TRADING_TABLE_VALUE,
  PAPER_TRADING_TIMELINE_TITLE,
  STATUS_LABEL,
} from "@/lib/copy/paperTrading/labels";
import type {
  PaperTradingDecision,
  PaperTradingEquityPoint,
} from "@/lib/types/paperTrading/paperTrading";

export interface PaperTradingDetailContainerProps {
  sessionId: string;
}

export function PaperTradingDetailContainer({ sessionId }: PaperTradingDetailContainerProps) {
  const {
    detail,
    isLoading,
    isError,
    isFetching,
    isRunningTick,
    isPatching,
    runTick,
    setStatus,
    refetch,
  } = usePaperTradingSession(sessionId);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-main-max-w">
        <div className="card skeleton min-h-[260px]" aria-busy="true" />
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="mx-auto w-full max-w-main-max-w">
        <div className="card-critical" role="alert">
          <p className="text-body-strong">{PAPER_TRADING_ERROR}</p>
          <button type="button" className="button-secondary mt-md" onClick={() => refetch()}>
            {PAPER_TRADING_RETRY}
          </button>
        </div>
      </div>
    );
  }

  const { session, positions, ticks, equityCurve, latestDecision } = detail;
  const canRun = session.status === "running";

  return (
    <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <header className="flex flex-col gap-xs">
          <Link
            href="/dashboard/paper-trading"
            className="inline-flex items-center gap-xs text-body-sm text-text-muted hover:text-text-strong"
          >
            <ArrowLeft className="size-4" aria-hidden />
            목록으로
          </Link>
          <div className="flex flex-wrap items-center gap-sm">
            <h1 className="text-h1 text-text-strong">{session.name || PAPER_TRADING_DETAIL_TITLE}</h1>
            <span className="badge-info">{STATUS_LABEL[session.status]}</span>
          </div>
          <p className="text-body-sm text-text-muted">{PAPER_TRADING_REAL_ACTION_NOTICE}</p>
        </header>

        <div className="flex flex-wrap gap-sm">
          <button
            type="button"
            className="button-secondary inline-flex items-center gap-xs"
            onClick={() => refetch()}
          >
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} aria-hidden />
            {PAPER_TRADING_REFRESH}
          </button>
          <button
            type="button"
            className="button-secondary inline-flex items-center gap-xs"
            onClick={() => setStatus(canRun ? "paused" : "running")}
            disabled={isPatching || session.status === "completed"}
          >
            {canRun ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            {canRun ? PAPER_TRADING_PAUSE : PAPER_TRADING_RESUME}
          </button>
          <button
            type="button"
            className="button-secondary inline-flex items-center gap-xs"
            onClick={() => setStatus("completed")}
            disabled={isPatching || session.status === "completed"}
          >
            <CheckCircle2 className="size-4" aria-hidden />
            {PAPER_TRADING_COMPLETE}
          </button>
        </div>
      </div>

      <section className="grid gap-md md:grid-cols-5" aria-label="모의투자 요약">
        <MetricCard label={PAPER_TRADING_METRIC_INITIAL} value={formatNumber(session.initialCash)} />
        <MetricCard label={PAPER_TRADING_METRIC_VALUE} value={formatNumber(session.portfolioValue)} />
        <MetricCard
          label={PAPER_TRADING_METRIC_RETURN}
          value={formatPct(session.returnPct)}
          tone={session.returnPct >= 0 ? "up" : "down"}
        />
        <MetricCard label={PAPER_TRADING_METRIC_TARGET} value={formatPct(session.targetReturnPct, false)} />
        <MetricCard
          label={PAPER_TRADING_METRIC_PROGRESS}
          value={formatPct(computeTargetProgress(session.returnPct, session.targetReturnPct), false)}
          tone={session.returnPct >= session.targetReturnPct ? "up" : undefined}
        />
        <MetricCard label={PAPER_TRADING_METRIC_CASH} value={formatNumber(session.cash)} />
      </section>

      <div className="grid gap-md lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="card min-h-[320px]">
          <div className="mb-md flex items-center justify-between gap-md">
            <h2 className="text-h2 text-text-strong">{PAPER_TRADING_EQUITY_TITLE}</h2>
            <button
              type="button"
              className="button-primary inline-flex items-center gap-xs"
              onClick={() => runTick()}
              disabled={!canRun || isRunningTick}
            >
              <RotateCcw className={cn("size-4", isRunningTick && "animate-spin")} aria-hidden />
              {isRunningTick ? PAPER_TRADING_RUNNING_TICK : PAPER_TRADING_RUN_TICK}
            </button>
          </div>
          <EquityCurveChart points={equityCurve} />
        </section>

        <section className="card">
          <h2 className="text-h2 text-text-strong">{PAPER_TRADING_DECISION_TITLE}</h2>
          <DecisionPanel decision={latestDecision} />
        </section>
      </div>

      <section className="card">
        <h2 className="text-h2 text-text-strong">{PAPER_TRADING_POSITIONS_TITLE}</h2>
        {positions.length === 0 ? (
          <p className="mt-md text-body-sm text-text-muted">{PAPER_TRADING_NO_POSITION}</p>
        ) : (
          <div className="mt-md overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-body-sm">
              <thead className="text-caption text-text-muted">
                <tr>
                  <th className="py-sm pr-md">{PAPER_TRADING_TABLE_TICKER}</th>
                  <th className="py-sm pr-md">{PAPER_TRADING_TABLE_QUANTITY}</th>
                  <th className="py-sm pr-md">{PAPER_TRADING_TABLE_AVG}</th>
                  <th className="py-sm pr-md">{PAPER_TRADING_TABLE_PRICE}</th>
                  <th className="py-sm pr-md">{PAPER_TRADING_TABLE_VALUE}</th>
                  <th className="py-sm pr-md">{PAPER_TRADING_TABLE_PNL}</th>
                  <th className="py-sm">{PAPER_TRADING_TABLE_ALLOC}</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.ticker} className="border-t border-border-line">
                    <td className="py-sm pr-md">
                      <span className="flex min-w-0 flex-col">
                        <span className="text-text-strong">{position.name ?? position.ticker}</span>
                        <span className="font-mono text-caption text-text-muted">
                          {position.ticker}
                        </span>
                      </span>
                    </td>
                    <td className="py-sm pr-md">{formatNumber(position.quantity)}</td>
                    <td className="py-sm pr-md">{formatNumber(position.avgEntryPrice)}</td>
                    <td className="py-sm pr-md">{formatNumber(position.lastPrice)}</td>
                    <td className="py-sm pr-md">{formatNumber(position.marketValue)}</td>
                    <td className={cn("py-sm pr-md", position.unrealizedPnlPct >= 0 ? "text-signal-up" : "text-signal-down")}>
                      {formatPct(position.unrealizedPnlPct)}
                    </td>
                    <td className="py-sm">{formatPct(position.allocationPct, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="text-h2 text-text-strong">{PAPER_TRADING_TIMELINE_TITLE}</h2>
        <div className="mt-md flex flex-col gap-sm">
          {ticks.map((tick) => (
            <article key={tick.id} className="rounded-md border border-border-line bg-surface-base p-md">
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <div>
                  <p className="text-body-strong text-text-strong">
                    #{tick.tickIndex + 1} {ACTION_LABEL[tick.decision.action]}
                  </p>
                  <p className="text-caption text-text-muted">{formatDate(tick.tickWindowStart)}</p>
                </div>
                <span className={cn("text-body-strong", tick.returnPctAfter >= 0 ? "text-signal-up" : "text-signal-down")}>
                  {formatPct(tick.returnPctAfter)}
                </span>
              </div>
              <p className="mt-sm text-body-sm text-text-muted">{tick.rationale}</p>
              {tick.guardAdjustments.length > 0 ? (
                <p className="mt-xs text-caption text-text-muted">
                  {tick.guardAdjustments.join(" ")}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="card">
      <p className="text-caption text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-xs text-h2 text-text-strong",
          tone === "up" && "text-signal-up",
          tone === "down" && "text-signal-down",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EquityCurveChart({ points }: { points: PaperTradingEquityPoint[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <XAxis dataKey="tickIndex" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={48} />
          <Tooltip
            formatter={(value) => [formatNumber(Number(value)), "평가금액"]}
            labelFormatter={(label) => (Number(label) < 0 ? "시작" : `tick ${Number(label) + 1}`)}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-accent-vivid)"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DecisionPanel({ decision }: { decision: PaperTradingDecision | null }) {
  if (!decision) {
    return <p className="mt-md text-body-sm text-text-muted">{PAPER_TRADING_NO_DECISION}</p>;
  }
  return (
    <div className="mt-md flex flex-col gap-sm">
      <div className="flex items-center justify-between gap-sm">
        <span className="badge-accent">{ACTION_LABEL[decision.action]}</span>
        <span className="text-caption text-text-muted">목표 비중 {formatPct(decision.targetAllocationPct, false)}</span>
      </div>
      <p className="text-body-sm text-text-strong">{decision.rationale}</p>
      {(decision.targetAllocations ?? []).length > 0 ? (
        <div className="rounded-md bg-surface-muted p-sm">
          <p className="text-caption text-text-muted">종목별 목표 비중</p>
          <div className="mt-xs flex flex-col gap-xs">
            {(decision.targetAllocations ?? []).map((allocation) => (
              <div
                key={allocation.ticker}
                className="flex items-center justify-between gap-sm text-caption"
              >
                <span className="min-w-0 truncate text-text-strong">
                  {allocation.name}
                  <span className="ml-xs font-mono text-text-muted">{allocation.ticker}</span>
                </span>
                <span className="text-text-strong">
                  {formatPct(allocation.targetAllocationPct, false)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <ul className="flex flex-col gap-xs text-caption text-text-muted">
        {decision.riskNotes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function formatPct(value: number, sign = true): string {
  const prefix = sign && value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function computeTargetProgress(returnPct: number, targetReturnPct: number): number {
  if (targetReturnPct <= 0) return 0;
  return Math.max(0, (returnPct / targetReturnPct) * 100);
}
