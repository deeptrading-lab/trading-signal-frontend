"use client";

import { ClipboardList, Play, RefreshCw, Settings2, Square } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ProgramTradingDiagramModal } from "@/components/programTrading/ProgramTradingDiagramModal";
import { ProgramTradingInfo } from "@/components/programTrading/ProgramTradingInfo";
import { useProgramTrading } from "@/hooks/programTrading/useProgramTrading";
import { PROGRAM_COPY as C, PROGRAM_MENU_COPY as M, PROGRAM_PAPER_COPY as P, PROGRAM_REVIEW_COPY as R } from "@/lib/copy/programTrading/programTrading";
import type { Trade } from "@/lib/types/programTrading/programTrading";
import { cn } from "@/lib/utils/cn";
import { PROGRAM_ASSETS_COPY as A } from "@/lib/copy/programTrading/assets";

const money = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const kstTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const tradeColumns = [P.time, C.ticker, C.quantity, C.price, C.reason, C.net];
const numericTradeColumns = [C.quantity, C.price, C.net] as readonly string[];
const ledgerCell = "px-sm py-sm first:pl-0 last:pr-0 sm:px-md";
const ledgerNumber = "text-right tabular-nums";

function tradeTime(trade: Trade) {
  if (trade.evidence && Number.isFinite(trade.evidence.observedAt)) {
    return kstTime.format(trade.evidence.observedAt);
  }
  const hours = Math.floor(trade.minute / 60).toString().padStart(2, "0");
  return `${hours}:${(trade.minute % 60).toString().padStart(2, "0")}`;
}

export function ProgramTradingPanel() {
  const [diagramOpen, setDiagramOpen] = useState(false);
  const { state, loading, pending, error, connected, canStart, send } = useProgramTrading();
  const positions = state?.positions ?? [];
  const finished = state?.lifecycle?.status === "completed";
  const stopping = state?.lifecycle?.status === "stopping";
  const before = state?.lifecycle?.beforeBalance;
  const after = finished ? state?.lifecycle?.afterBalance : state?.equity;
  const profit = before == null || after == null ? null : after - before;
  const returns = before && profit != null ? (profit / before) * 100 : null;
  const trades = state?.trades ?? [];
  const latestTrade = trades.at(-1);
  const candidates = state?.candidates.rows ?? [];
  const metrics = [
    { label: M.initial, value: before == null ? M.noBalance : money(before) },
    { label: finished ? M.final : M.current, value: before == null || after == null ? M.noBalance : money(after) },
    { label: M.profit, value: profit == null ? M.noBalance : money(profit), direction: profit },
    { label: M.returns, value: returns == null ? M.noBalance : `${returns > 0 ? "+" : ""}${returns.toFixed(2)}%`, direction: returns },
  ];

  return <div className="mx-auto flex w-full min-w-0 max-w-main-max-w flex-col gap-lg font-(family-name:--font-pretendard) sm:gap-xl">
    <header className="flex flex-wrap items-center justify-between gap-x-lg gap-y-sm">
      <div className="relative w-full min-w-0 sm:w-64">
        <h1 className="text-h1 font-bold text-text-strong">{M.title}</h1>
        <div className="flex w-fit min-w-0 items-center">
          <span className="text-body-sm font-medium text-text-muted">{P.mode}</span>
          <ProgramTradingInfo label={P.mode} description={P.hint} />
        </div>
      </div>
      <div className="grid w-full min-w-0 grid-cols-2 gap-sm sm:flex sm:w-auto sm:flex-wrap">
        <button type="button" className="button-secondary program-trading-action" aria-haspopup="dialog" onClick={() => setDiagramOpen(true)}>
          {M.showDiagram}
        </button>
        <Link href="/program-trading/review" className="button-secondary program-trading-action no-underline" prefetch={false}>
          <ClipboardList className="size-4 shrink-0" aria-hidden="true" />
          {R.open}
        </Link>
      </div>
    </header>

    {state?.assetSyncStatus && <div className="flex flex-wrap items-center gap-sm" role={state.assetSyncStatus === "error" ? "alert" : "status"}>
      <p className="text-body-sm text-text-muted">{state.assetSyncStatus === "error" ? A.syncError : state.assetSyncStatus === "saved" ? A.syncSaved : A.syncPending}</p>
      {state.assetSyncStatus === "error" && <button type="button" disabled={pending} className="button-secondary" onClick={() => send("sync-assets")}>{A.retry}</button>}
    </div>}
    <section className="border-t border-border-line pt-sm" aria-labelledby="program-candidates">
      <div className="relative flex flex-wrap items-center justify-between gap-x-sm">
        <div className="flex min-w-0 items-center">
          <h2 id="program-candidates" className="text-h2 font-bold text-text-strong">{P.candidates}</h2>
          <ProgramTradingInfo label={P.candidates} description={P.candidateHint} />
        </div>
        <span className="text-body-sm tabular-nums text-text-muted">{state ? `${candidates.length}${P.candidateUnit}` : M.noBalance}</span>
      </div>
      {candidates.length > 0 && (
        <ul className="mt-xs flex flex-wrap gap-x-lg gap-y-xs text-body-sm text-text-strong">
          {candidates.map(row => (
            <li key={row.ticker} className="min-w-0 wrap-anywhere">
              {row.name}
              {row.sources.some(source => source !== "volume") && (
                <span className="ml-xs text-text-muted">{row.sources.map(source => P.candidateSources[source]).join(" · ")}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>

    <section className="space-y-sm" aria-labelledby="program-results">
      <div className="relative flex flex-wrap items-center justify-between gap-x-sm">
        <div className="flex min-w-0 items-center">
          <h2 id="program-results" className="text-h2 font-bold text-text-strong">{M.results}</h2>
          <ProgramTradingInfo label={M.results} description={`${M.targetPolicy}. ${P.limits}.`} />
        </div>
        <div className="flex items-center gap-sm">
          <p className="text-body-sm text-text-muted">{M.target} <span className="font-semibold tabular-nums text-text-strong">{state?.lifecycle?.targetReturnPct ?? 1}%</span></p>
          <Link href="/program-trading/assets" title={A.title}
            className="inline-flex min-h-hit-area-min shrink-0 items-center gap-xs rounded-md px-xs text-body-sm font-medium text-text-muted no-underline hover:bg-surface-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Settings2 className="size-4" aria-hidden="true" />{A.link}
          </Link>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-px border-y border-border-line bg-border-line lg:grid-cols-4">
        {metrics.map(({ label, value, direction }) => (
          <div key={label} className="min-w-0 bg-surface p-sm sm:p-md">
            <dt className="text-body-sm text-text-muted">{label}</dt>
            <dd className={cn("mt-xs wrap-anywhere text-body-md font-bold tabular-nums text-text-strong sm:text-h2",
              direction != null && direction > 0 && "text-signal-up",
              direction != null && direction < 0 && "text-signal-down",
            )}>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <p role="status" className={cn("inline-flex items-center gap-xs text-body-sm font-semibold", connected ? "text-primary" : "text-signal-down")}>
          {loading ? C.loading : !connected ? M.stale : stopping ? M.stopping : finished ? M.finished : state?.killed ? C.killed : state?.running ? (
            <>
              {positions.length ? M.running : (state.minute < 545 ? P.waitForOpenRanks : M.candidateRetry)}
              <RefreshCw className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
            </>
          ) : M.stopped}
        </p>
        {finished ? (
          <button type="button" className="button-primary program-trading-action w-full sm:w-auto"
            disabled={!connected || pending} onClick={() => send("new-session")}>
            {pending ? M.pending : M.newSession}
          </button>
        ) : <div className="flex w-full gap-sm sm:w-auto">
          <button type="button" className="button-primary program-trading-action min-w-0 flex-1 sm:flex-none"
            disabled={!state || !connected || pending || !canStart || !!state.lastError || state.running || stopping || finished || state.killed}
            onClick={() => send("start")}>
            <Play className="h-4 w-4 shrink-0" aria-hidden="true" />{pending ? M.pending : P.start}
          </button>
          <button type="button" className="button-secondary program-trading-action min-w-0 flex-1 sm:flex-none"
            disabled={!state || pending || stopping || finished || !state.lifecycle}
            onClick={() => send("flatten")}>
            <Square className="h-4 w-4 shrink-0" aria-hidden="true" />{M.stop}
          </button>
        </div>}
      </div>
      {finished && <p className="text-body-sm text-text-muted">{state?.lifecycle?.forcedAt ? M.forcedSettlement : M.completedHint}</p>}
      {error && <p role="alert" className="text-body-sm text-signal-down">{error}</p>}
      {!loading && connected && !canStart && !finished && !stopping && <p className="text-body-sm text-text-muted">{state?.startBlockReason ?? P.noCandidates}</p>}
    </section>

    <section className="space-y-sm border-t border-border-line pt-md" aria-labelledby="program-holdings">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h2 id="program-holdings" className="text-h2 font-bold text-text-strong">{P.holdings}</h2>
        {state && <span className="text-body-sm tabular-nums text-text-muted">{positions.length}{P.positionUnit}</span>}
      </div>
      {positions.length ? (
        <ul className="divide-y divide-border-line">
          {positions.map(position => (
            <li key={position.ticker} className="flex min-w-0 items-center justify-between gap-md py-xs text-body-sm text-text-strong">
              <span className="min-w-0 wrap-anywhere font-semibold">{position.name ?? position.ticker}</span>
              <span className="shrink-0 whitespace-nowrap tabular-nums">
                {position.quantity.toLocaleString("ko-KR")}{P.shareUnit}
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="text-body-sm text-text-muted">{P.positionEmpty}</p>}
    </section>

    <section className="space-y-sm border-t border-border-line pt-sm" aria-labelledby="program-logs">
      <div className="relative flex flex-wrap items-center justify-between gap-x-sm">
        <div className="flex min-w-0 items-center">
          <h2 id="program-logs" className="text-h2 font-bold text-text-strong">{M.logs}</h2>
          <ProgramTradingInfo label={M.logs} description={M.logHint} />
        </div>
        {latestTrade && <p className="text-body-sm tabular-nums text-text-muted">{M.lastTrade} {tradeTime(latestTrade)}</p>}
      </div>
      {!latestTrade ? <p className="text-body-sm text-text-muted">{M.empty}</p> :
        <div className="max-h-96 max-w-full overflow-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          tabIndex={0} role="region" aria-label={M.logs}>
          <table className="w-full whitespace-nowrap text-left text-body-sm">
            <caption className="sr-only">{M.logs}</caption>
            <thead className="sticky top-0 bg-surface"><tr>
              {tradeColumns.map(label => (
                <th key={label} scope="col" className={cn(ledgerCell, "font-medium text-text-muted", numericTradeColumns.includes(label) && "text-right")}>{label}</th>
              ))}
            </tr></thead>
            <tbody>{trades.slice().reverse().map(trade => <tr key={trade.id} className="border-t border-border-line">
              <td className={cn(ledgerCell, "tabular-nums")}>{tradeTime(trade)}</td>
              <td className={ledgerCell}>
                <span className="font-semibold text-text-strong">{trade.name ?? trade.ticker}</span>
                <span className="ml-xs text-text-muted">{trade.side === "buy" ? C.buy : C.sell}</span>
              </td>
              <td className={cn(ledgerCell, ledgerNumber)}>{trade.quantity.toLocaleString("ko-KR")}</td>
              <td className={cn(ledgerCell, ledgerNumber)}>{money(trade.price)}</td>
              <td className={ledgerCell}>{C.reasons[trade.reason]}</td>
              <td className={cn(ledgerCell, ledgerNumber)}>{trade.net == null ? M.noBalance : money(trade.net)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      <a href="/api/program-trading/logs" target="_blank" rel="noreferrer" className="inline-flex min-h-hit-area-min items-center text-body-sm text-link">{M.downloadLogs}</a>
    </section>
    {diagramOpen && <ProgramTradingDiagramModal onClose={() => setDiagramOpen(false)} />}
  </div>;
}
