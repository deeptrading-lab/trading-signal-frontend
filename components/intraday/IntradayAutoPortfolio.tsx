"use client";

import { useMemo, useState } from "react";
import { Sparkles, Square } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { IntradayCompletePortfolioDialog } from "@/components/intraday/IntradayCompletePortfolioDialog";
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
import { buildIntradayPortfolioStockStatuses } from "@/lib/intraday/portfolioStatus";
import { isApiError } from "@/lib/api/errors";
import type { CompletePaperTradingPortfolioResponse } from "@/lib/types/paperTrading/paperTrading";

type Props = {
  candidates: IntradayPortfolioCandidate[];
  portfolioSessions: PaperTradingSession[];
  portfolioDetails: PaperTradingSessionDetail[];
  portfolioDetailsLoading: boolean;
  isCompleting: boolean;
  unavailableTickers: ReadonlySet<string>;
  candidatesLoading: boolean;
  onStart: (plan: IntradayPortfolioPlan) => Promise<PaperTradingSessionDetail[]>;
  onComplete: (portfolioId: string) => Promise<CompletePaperTradingPortfolioResponse>;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return C.startError;
}

function kstTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function IntradayAutoPortfolio({
  candidates,
  portfolioSessions,
  portfolioDetails,
  portfolioDetailsLoading,
  isCompleting,
  unavailableTickers,
  candidatesLoading,
  onStart,
  onComplete,
}: Props) {
  const [cash, setCash] = useState(formatKrwInput("10000000"));
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const portfolio = portfolioSessions;
  const stockStatuses = useMemo(
    () => buildIntradayPortfolioStockStatuses(portfolio, portfolioDetails),
    [portfolio, portfolioDetails],
  );
  const availableCandidates = useMemo(
    () => candidates.filter((candidate) => !unavailableTickers.has(candidate.ticker)),
    [candidates, unavailableTickers],
  );
  const totalInitial = portfolio.reduce((sum, session) => sum + session.initialCash, 0);
  const totalValue = portfolio.reduce((sum, session) => sum + session.portfolioValue, 0);
  const returnPct = totalInitial > 0 ? ((totalValue - totalInitial) / totalInitial) * 100 : 0;
  const runningCount = portfolio.filter((session) => session.status === "running").length;
  const activeCount = portfolio.filter((session) => session.status !== "completed").length;
  const isPortfolioActive = activeCount > 0;
  const portfolioId = portfolio.find((session) => session.portfolioId)?.portfolioId;
  const startDisabled =
    isStarting || candidatesLoading || availableCandidates.length < 2 || isPortfolioActive;

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

  const complete = async () => {
    if (!portfolioId) return;
    setCompleteError(null);
    try {
      await onComplete(portfolioId);
      setConfirmingComplete(false);
    } catch (cause) {
      setCompleteError(isApiError(cause) ? cause.message : C.completeError);
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
              disabled={isPortfolioActive}
              aria-label={C.cashAria}
              className="h-12 min-w-0 flex-1 bg-transparent text-right text-h2 font-bold tabular-nums text-text-strong outline-none"
            />
            <span className="ml-xs text-body-sm text-text-muted">원</span>
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={startDisabled}
            className={cn(
              "h-12 shrink-0 rounded-lg px-xl text-body-md font-bold transition-colors",
              startDisabled
                ? "cursor-not-allowed bg-surface-muted text-text-muted"
                : "cursor-pointer bg-accent-vivid text-surface hover:opacity-90",
            )}
          >
            {isStarting ? C.starting : isPortfolioActive ? C.running : C.start}
          </button>
        </div>

        <p className="text-caption text-text-muted">
          {C.rule}
        </p>
        {isPortfolioActive ? (
          <p className="text-caption text-accent-vivid">{C.startDisabled}</p>
        ) : null}
        {error ? <p role="alert" className="text-body-sm text-signal-down">{error}</p> : null}
      </div>

      {portfolio.length > 0 ? (
        <div className="border-t border-border-line bg-surface-muted px-lg py-md md:px-xl">
          <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
            <div className="flex items-center gap-sm">
              <Badge variant={isPortfolioActive ? "info" : "accent"}>
                {isPortfolioActive ? C.running : C.completed}
              </Badge>
              {isPortfolioActive ? (
                <span className="text-caption text-text-muted">{C.runningDescription}</span>
              ) : null}
            </div>
            {isPortfolioActive && portfolioId ? (
              <button
                type="button"
                onClick={() => setConfirmingComplete(true)}
                disabled={isCompleting}
                className="inline-flex items-center gap-xs rounded-pill border border-critical px-md py-xs text-caption font-bold text-critical transition-colors hover:bg-critical-soft cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Square className="size-3" aria-hidden />
                {isCompleting ? C.completing : C.complete}
              </button>
            ) : null}
          </div>
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
          {portfolioDetailsLoading ? (
            <p className="mt-md text-caption text-text-muted">{C.loadingTrades}</p>
          ) : (
            <div className="mt-md divide-y divide-border-line border-t border-border-line">
              {stockStatuses.map(({ session, position, latestOrder }) => {
                const name = session.stocks[0]?.name ?? session.tickers[0];
                const pnlPct = position?.unrealizedPnlPct ?? session.returnPct;
                return (
                  <div
                    key={session.id}
                    className="grid gap-xs py-sm text-body-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-center sm:gap-md"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-text-strong">{name}</p>
                      <p className="text-caption text-text-muted">
                        배정 {session.portfolioAllocationPct?.toFixed(1) ?? "—"}%
                      </p>
                    </div>
                    <div className="min-w-0 text-caption tabular-nums">
                      <p className="text-text-strong">
                        {position
                          ? C.holding(position.quantity, formatMoney(position.avgEntryPrice))
                          : C.noPosition}
                      </p>
                      <p className="truncate text-text-muted">
                        {latestOrder
                          ? latestOrder.side === "BUY"
                            ? C.latestBuy(latestOrder.quantity, formatMoney(latestOrder.price))
                            : `${C.latestSell(latestOrder.quantity, formatMoney(latestOrder.price))}${
                                latestOrder.realizedPnl == null
                                  ? ""
                                  : ` · ${C.realized(
                                      `${latestOrder.realizedPnl >= 0 ? "+" : ""}${formatMoney(latestOrder.realizedPnl)}`,
                                    )}`
                              }`
                          : C.waiting}
                        {latestOrder ? ` · ${kstTime(latestOrder.at)}` : ""}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-right font-bold tabular-nums",
                        pnlPct > 0
                          ? "text-signal-up"
                          : pnlPct < 0
                            ? "text-signal-down"
                            : "text-text-muted",
                      )}
                    >
                      {pnlPct >= 0 ? "+" : ""}
                      {pnlPct.toFixed(2)}%
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          {completeError ? (
            <p role="alert" className="mt-sm text-body-sm text-critical">{completeError}</p>
          ) : null}
        </div>
      ) : null}
      {confirmingComplete ? (
        <IntradayCompletePortfolioDialog
          busy={isCompleting}
          onConfirm={complete}
          onCancel={() => setConfirmingComplete(false)}
        />
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
