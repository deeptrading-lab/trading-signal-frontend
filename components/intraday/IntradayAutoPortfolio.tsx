"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatKrwInput, formatMoney } from "@/lib/utils/formatMoney";
import {
  buildIntradayPortfolioPlan,
  type IntradayPortfolioCandidate,
  type IntradayPortfolioPlan,
} from "@/lib/intraday/portfolioPlan";
import type {
  PaperTradingSession,
  PaperTradingSessionDetail,
} from "@/lib/types/paperTrading/paperTrading";
import { INTRADAY_AUTO_PORTFOLIO_COPY as C } from "@/lib/copy/intraday/autoPortfolio";

type Props = {
  candidates: IntradayPortfolioCandidate[];
  sessions: PaperTradingSession[];
  unavailableTickers: ReadonlySet<string>;
  candidatesLoading: boolean;
  onStart: (plan: IntradayPortfolioPlan) => Promise<PaperTradingSessionDetail[]>;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return C.startError;
}

function latestPortfolio(sessions: PaperTradingSession[]): PaperTradingSession[] {
  const grouped = new Map<string, PaperTradingSession[]>();
  for (const session of sessions) {
    if (!session.portfolioId) continue;
    grouped.set(session.portfolioId, [...(grouped.get(session.portfolioId) ?? []), session]);
  }
  return [...grouped.values()].sort((a, b) =>
    (b[0]?.createdAt ?? "").localeCompare(a[0]?.createdAt ?? ""),
  )[0] ?? [];
}

export function IntradayAutoPortfolio({
  candidates,
  sessions,
  unavailableTickers,
  candidatesLoading,
  onStart,
}: Props) {
  const [cash, setCash] = useState(formatKrwInput("10000000"));
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const portfolio = useMemo(() => latestPortfolio(sessions), [sessions]);
  const availableCandidates = useMemo(
    () => candidates.filter((candidate) => !unavailableTickers.has(candidate.ticker)),
    [candidates, unavailableTickers],
  );
  const totalInitial = portfolio.reduce((sum, session) => sum + session.initialCash, 0);
  const totalValue = portfolio.reduce((sum, session) => sum + session.portfolioValue, 0);
  const returnPct = totalInitial > 0 ? ((totalValue - totalInitial) / totalInitial) * 100 : 0;
  const runningCount = portfolio.filter((session) => session.status === "running").length;

  const submit = async () => {
    setError(null);
    try {
      const amount = Number(cash.replace(/[^0-9]/g, ""));
      const plan = buildIntradayPortfolioPlan(amount, availableCandidates);
      setIsStarting(true);
      await onStart(plan);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border-line bg-surface-base" aria-labelledby="auto-portfolio-title">
      <div className="flex flex-col gap-lg p-lg md:p-xl">
        <div className="flex items-start gap-md">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-vivid">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="auto-portfolio-title" className="text-h2 font-bold text-text-strong">
              {C.title}
            </h2>
            <p className="mt-xs text-body-sm text-text-muted">
              {C.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-sm sm:flex-row">
          <label className="flex min-w-0 flex-1 items-center rounded-lg border border-border-line bg-surface-base px-md focus-within:border-accent-vivid">
            <span className="shrink-0 text-body-sm font-medium text-text-muted">{C.cashLabel}</span>
            <input
              value={cash}
              onChange={(event) => setCash(formatKrwInput(event.target.value))}
              inputMode="numeric"
              aria-label={C.cashAria}
              className="h-12 min-w-0 flex-1 bg-transparent text-right text-h2 font-bold tabular-nums text-text-strong outline-none"
            />
            <span className="ml-xs text-body-sm text-text-muted">원</span>
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={isStarting || candidatesLoading || availableCandidates.length < 2}
            className={cn(
              "h-12 shrink-0 rounded-lg px-xl text-body-md font-bold transition-colors",
              isStarting || candidatesLoading || availableCandidates.length < 2
                ? "cursor-not-allowed bg-surface-muted text-text-muted"
                : "cursor-pointer bg-accent-vivid text-surface hover:opacity-90",
            )}
          >
            {isStarting ? C.starting : C.start}
          </button>
        </div>

        <p className="text-caption text-text-muted">
          {C.rule}
        </p>
        {error ? <p role="alert" className="text-body-sm text-signal-down">{error}</p> : null}
      </div>

      {portfolio.length > 0 ? (
        <div className="border-t border-border-line bg-surface-muted px-lg py-md md:px-xl">
          <div className="grid grid-cols-2 gap-md md:grid-cols-4">
            <PortfolioMetric label={C.metrics.stocks} value={`${portfolio.length}개`} sub={C.metrics.running(runningCount)} />
            <PortfolioMetric label={C.metrics.initial} value={`${formatMoney(totalInitial)}원`} />
            <PortfolioMetric label={C.metrics.value} value={`${formatMoney(totalValue)}원`} />
            <PortfolioMetric
              label={C.metrics.return}
              value={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`}
              tone={returnPct > 0 ? "up" : returnPct < 0 ? "down" : "neutral"}
            />
          </div>
          <div className="mt-md flex flex-wrap gap-xs">
            {portfolio.map((session) => (
              <span key={session.id} className="rounded-pill bg-surface-base px-sm py-xs text-caption text-text-muted">
                {session.stocks[0]?.name ?? session.tickers[0]} {session.portfolioAllocationPct?.toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PortfolioMetric({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down" | "neutral";
}) {
  return (
    <div className="min-w-0">
      <p className="text-caption text-text-muted">{label}</p>
      <p className={cn("mt-xs truncate text-body-md font-bold tabular-nums", tone === "up" ? "text-signal-up" : tone === "down" ? "text-signal-down" : "text-text-strong")}>{value}</p>
      {sub ? <p className="mt-2xs text-caption text-text-muted">{sub}</p> : null}
    </div>
  );
}
