"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, Rocket, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { usePaperTradingSessions } from "@/hooks/paperTrading/usePaperTradingSessions";
import { StockSearchPicker } from "@/components/ui/StockSearchPicker";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import {
  PAPER_TRADING_CREATE_BUTTON,
  PAPER_TRADING_CREATE_TITLE,
  PAPER_TRADING_CREATING,
  PAPER_TRADING_EMPTY_BODY,
  PAPER_TRADING_EMPTY_TITLE,
  PAPER_TRADING_ERROR,
  PAPER_TRADING_FIELD_CASH,
  PAPER_TRADING_FIELD_NAME,
  PAPER_TRADING_FIELD_PROVIDER,
  PAPER_TRADING_FIELD_RISK,
  PAPER_TRADING_FIELD_STOCK_SEARCH,
  PAPER_TRADING_FIELD_TARGET_RETURN,
  PAPER_TRADING_MOCK_NOTICE,
  PAPER_TRADING_PAGE_SUBTITLE,
  PAPER_TRADING_PAGE_TITLE,
  PAPER_TRADING_PROVIDER_DISABLED,
  PAPER_TRADING_PROVIDER_MOCK,
  PAPER_TRADING_LIVE_PRICE_NOTICE,
  PAPER_TRADING_REFRESH,
  PAPER_TRADING_RETRY,
  PAPER_TRADING_RISK_AGGRESSIVE,
  PAPER_TRADING_RISK_BALANCED,
  PAPER_TRADING_RISK_CONSERVATIVE,
  PAPER_TRADING_REMOVE_STOCK,
  PAPER_TRADING_SELECTED_STOCKS,
  PAPER_TRADING_STOCK_SEARCH_PLACEHOLDER,
  STATUS_LABEL,
} from "@/lib/copy/paperTrading/labels";
import type {
  PaperTradingRiskMode,
  PaperTradingSelectedStock,
} from "@/lib/types/paperTrading/paperTrading";

const RISK_OPTIONS: Array<{ value: PaperTradingRiskMode; label: string }> = [
  { value: "conservative", label: PAPER_TRADING_RISK_CONSERVATIVE },
  { value: "balanced", label: PAPER_TRADING_RISK_BALANCED },
  { value: "aggressive", label: PAPER_TRADING_RISK_AGGRESSIVE },
];

export function PaperTradingListContainer() {
  const router = useRouter();
  const { sessions, isLoading, isError, isCreating, create, refetch } =
    usePaperTradingSessions();
  const [name, setName] = useState("AI 모의투자");
  const [selectedStocks, setSelectedStocks] = useState<PaperTradingSelectedStock[]>([
    { ticker: "005930", name: "삼성전자", market: "KOSPI" },
  ]);
  const [initialCash, setInitialCash] = useState("10000000");
  const [targetReturnPct, setTargetReturnPct] = useState("5");
  const [riskMode, setRiskMode] = useState<PaperTradingRiskMode>("balanced");
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    try {
      const detail = await create({
        name,
        tickers: selectedStocks.map((stock) => stock.ticker),
        stocks: selectedStocks,
        initialCash: Number(initialCash),
        targetReturnPct: Number(targetReturnPct),
        riskMode,
        decisionProvider: "mock",
      });
      router.push(`/dashboard/paper-trading/${detail.session.id}`);
    } catch (error) {
      setCreateError(
        isApiError(error)
          ? error.message
          : "모의투자 세션을 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }

  function addStock(stock: PaperTradingSelectedStock) {
    setSelectedStocks((prev) => {
      if (prev.some((item) => item.ticker === stock.ticker)) return prev;
      return [...prev, stock].slice(0, 5);
    });
  }

  function removeStock(ticker: string) {
    setSelectedStocks((prev) => prev.filter((stock) => stock.ticker !== ticker));
  }

  return (
    <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg">
      <header className="flex flex-col gap-xs">
        <h1 className="text-h1 text-text-strong">{PAPER_TRADING_PAGE_TITLE}</h1>
        <p className="text-body-sm text-text-muted">{PAPER_TRADING_PAGE_SUBTITLE}</p>
      </header>

      <div className="grid gap-md lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form className="card flex flex-col gap-md" onSubmit={handleSubmit}>
          <div>
            <h2 className="text-h2 text-text-strong">{PAPER_TRADING_CREATE_TITLE}</h2>
            <p className="mt-xs text-caption text-text-muted">{PAPER_TRADING_MOCK_NOTICE}</p>
            <p className="mt-xs text-caption text-text-muted">{PAPER_TRADING_LIVE_PRICE_NOTICE}</p>
          </div>

          <label className="flex flex-col gap-xs text-body-sm text-text-muted">
            <span>{PAPER_TRADING_FIELD_NAME}</span>
            <input
              className="h-input-h rounded-md border border-border-line bg-surface-base px-md text-text-strong"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <div className="flex flex-col gap-sm">
            <div className="flex flex-col gap-xs text-body-sm text-text-muted">
              <span>{PAPER_TRADING_FIELD_STOCK_SEARCH}</span>
              {/* 공용 종목 검색 피커(components/ui/StockSearchPicker) — 단타워치와 동일 UI. */}
              <StockSearchPicker
                placeholder={PAPER_TRADING_STOCK_SEARCH_PLACEHOLDER}
                onSelect={(stock) =>
                  addStock({ ticker: stock.ticker, name: stock.name, market: stock.market })
                }
              />
            </div>
            <div className="rounded-md bg-surface-muted p-sm">
              <p className="text-caption text-text-muted">{PAPER_TRADING_SELECTED_STOCKS}</p>
              <div className="mt-xs flex flex-wrap gap-xs">
                {selectedStocks.map((stock) => (
                  <span
                    key={stock.ticker}
                    className="inline-flex items-center gap-xs rounded-full bg-surface-base px-sm py-xs text-caption text-text-strong"
                  >
                    {stock.name}
                    <span className="font-mono text-text-muted">{stock.ticker}</span>
                    <button
                      type="button"
                      className="text-text-muted hover:text-text-strong"
                      aria-label={`${stock.name} ${PAPER_TRADING_REMOVE_STOCK}`}
                      onClick={() => removeStock(stock.ticker)}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-sm md:grid-cols-2">
            <label className="flex flex-col gap-xs text-body-sm text-text-muted">
              <span>{PAPER_TRADING_FIELD_CASH}</span>
              <input
                className="h-input-h rounded-md border border-border-line bg-surface-base px-md text-text-strong"
                inputMode="decimal"
                value={initialCash}
                onChange={(event) => setInitialCash(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-xs text-body-sm text-text-muted">
              <span>{PAPER_TRADING_FIELD_TARGET_RETURN}</span>
              <input
                className="h-input-h rounded-md border border-border-line bg-surface-base px-md text-text-strong"
                inputMode="decimal"
                value={targetReturnPct}
                onChange={(event) => setTargetReturnPct(event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-sm md:grid-cols-2">
            <label className="flex flex-col gap-xs text-body-sm text-text-muted">
              <span>{PAPER_TRADING_FIELD_RISK}</span>
              <select
                className="h-input-h rounded-md border border-border-line bg-surface-base px-md text-text-strong"
                value={riskMode}
                onChange={(event) => setRiskMode(event.target.value as PaperTradingRiskMode)}
              >
                {RISK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-xs text-body-sm text-text-muted">
              <span>{PAPER_TRADING_FIELD_PROVIDER}</span>
              <select
                className="h-input-h rounded-md border border-border-line bg-surface-base px-md text-text-strong"
                value="mock"
                disabled
              >
                <option value="mock">{PAPER_TRADING_PROVIDER_MOCK}</option>
                <option value="existing-ai">{PAPER_TRADING_PROVIDER_DISABLED}</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="button-primary inline-flex items-center justify-center gap-xs"
            disabled={isCreating}
          >
            <Rocket className="size-4" aria-hidden />
            {isCreating ? PAPER_TRADING_CREATING : PAPER_TRADING_CREATE_BUTTON}
          </button>
          {createError ? (
            <div className="card-critical" role="alert">
              <p className="text-body-sm">{createError}</p>
            </div>
          ) : null}
        </form>

        <section className="card flex flex-col gap-md" aria-label="모의투자 세션 목록">
          <div className="flex items-center justify-between gap-md">
            <h2 className="text-h2 text-text-strong">세션 목록</h2>
            <button
              type="button"
              className="button-secondary inline-flex items-center gap-xs"
              onClick={() => refetch()}
            >
              <RefreshCw className={cn("size-4", isLoading && "animate-spin")} aria-hidden />
              {PAPER_TRADING_REFRESH}
            </button>
          </div>

          {isError ? (
            <div className="card-critical" role="alert">
              <p className="text-body-sm">{PAPER_TRADING_ERROR}</p>
              <button type="button" className="button-secondary mt-sm" onClick={() => refetch()}>
                {PAPER_TRADING_RETRY}
              </button>
            </div>
          ) : null}

          {!isLoading && sessions.length === 0 ? (
            <div className="rounded-md bg-surface-muted p-md" role="status">
              <p className="text-body-strong text-text-strong">{PAPER_TRADING_EMPTY_TITLE}</p>
              <p className="mt-xs text-body-sm text-text-muted">{PAPER_TRADING_EMPTY_BODY}</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-sm">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/dashboard/paper-trading/${session.id}`}
                className="rounded-md border border-border-line bg-surface-base p-md transition-colors hover:bg-surface-muted"
              >
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <div>
                    <p className="text-body-strong text-text-strong">{session.name}</p>
                    <p className="text-caption text-text-muted">
                      {getSessionStockNames(session)}
                    </p>
                  </div>
                  <span className="badge-info">{STATUS_LABEL[session.status]}</span>
                </div>
                <div className="mt-sm grid grid-cols-3 gap-sm text-caption text-text-muted">
                  <span>평가 {formatNumber(session.portfolioValue)}</span>
                  <span>수익률 {formatPct(session.returnPct)}</span>
                  <span>목표 {formatPct(session.targetReturnPct, false)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
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

function getSessionStockNames(session: {
  stocks?: PaperTradingSelectedStock[];
  tickers: string[];
}): string {
  if (session.stocks && session.stocks.length > 0) {
    return session.stocks.map((stock) => stock.name).join(", ");
  }
  return session.tickers.join(", ");
}
