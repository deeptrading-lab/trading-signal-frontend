"use client";

import { ArrowDown, ClipboardList, Play, RefreshCw, Square } from "lucide-react";
import Link from "next/link";
import { useProgramTrading } from "@/hooks/programTrading/useProgramTrading";
import { PROGRAM_COPY as C, PROGRAM_MENU_COPY as M, PROGRAM_PAPER_COPY as P, PROGRAM_REVIEW_COPY as R } from "@/lib/copy/programTrading/programTrading";
import { cn } from "@/lib/utils/cn";

const money = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const time = (minute: number) => `${Math.floor(minute / 60).toString().padStart(2, "0")}:${(minute % 60).toString().padStart(2, "0")}`;

export function ProgramTradingPanel() {
  const { state, loading, pending, error, connected, canStart, send } = useProgramTrading();
  const finished = state?.lifecycle?.status === "completed";
  const stopping = state?.lifecycle?.status === "stopping";
  const before = state?.lifecycle?.beforeBalance;
  const after = finished ? state?.lifecycle?.afterBalance : state?.equity;
  const returns = before && after != null ? (after / before - 1) * 100 : null;
  const metrics = [
    [M.initial, before == null ? M.noBalance : money(before)],
    [finished ? M.final : M.current, before == null || after == null ? M.noBalance : money(after)],
    [M.profit, before == null || after == null ? M.noBalance : money(after - before)],
    [M.returns, returns == null ? M.noBalance : `${returns > 0 ? "+" : ""}${returns.toFixed(2)}%`],
  ];

  return <div className="mx-auto flex min-w-0 w-full max-w-main-max-w flex-col gap-xl font-(family-name:--font-pretendard)">
    <header className="flex flex-wrap items-center justify-between gap-md">
      <div>
        <h1 className="text-h1 font-bold text-text-strong">{M.title}</h1>
        <p className="mt-xs text-body-sm text-text-muted">{P.subtitle}</p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-sm">
        <span className="badge-info">{P.mode}</span>
        <Link href="/program-trading/review" className="button-secondary program-trading-action whitespace-nowrap no-underline" prefetch={false}>
          <ClipboardList className="size-4 shrink-0" aria-hidden="true" />
          {R.open}
        </Link>
      </div>
    </header>

    <section className="rounded-lg border border-border-line p-lg" aria-label={P.mode}>
      <p className="text-body-sm font-semibold text-text-strong">{P.hint}</p>
      <h2 className="mt-md text-body-sm font-semibold text-text-strong">{P.candidates} · {state?.candidates.rows.length ?? 0}</h2>
      {state?.candidates.rows.length ? (
        <ul className="mt-sm flex flex-wrap gap-xs">
          {state.candidates.rows.map(row => <li key={row.ticker} className="badge-info max-w-full whitespace-normal break-words">
            {row.name} · {row.sources.map(source => P.candidateSources[source]).join("·")}
          </li>)}
        </ul>
      ) : <p className="mt-xs text-caption text-text-muted">{M.noBalance}</p>}
      <p className="mt-xs break-keep text-caption text-text-muted">{P.limits}</p>
    </section>

    <section aria-label={M.returns} className="space-y-md">
      <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
        {metrics.map(([label, value]) => <div key={label} className="min-w-0 rounded-lg bg-surface-muted p-md sm:p-lg">
          <p className="text-caption text-text-muted">{label}</p>
          <p className="mt-sm break-all text-body-md font-bold tabular-nums text-text-strong sm:text-h2">{value}</p>
        </div>)}
      </div>
      <p className="text-caption text-text-muted">{M.target} {state?.lifecycle?.targetReturnPct ?? 1}% · {M.targetPolicy}</p>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p role="status" className={cn("inline-flex items-center gap-xs text-body-sm font-semibold", connected ? "text-primary" : "text-signal-down")}>
          {loading ? C.loading : !connected ? M.stale : stopping ? M.stopping : finished ? M.finished : state?.killed ? C.killed : state?.running ? (
            <>
              {M.running}
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
            disabled={!state || !connected || pending || stopping || finished || !state.lifecycle}
            onClick={() => send("flatten")}>
            <Square className="h-4 w-4 shrink-0" aria-hidden="true" />{M.stop}
          </button>
        </div>}
      </div>
      {finished && <p className="text-caption text-text-muted">{M.completedHint}</p>}
      {error && <p role="alert" className="rounded-lg bg-surface-muted p-md text-body-sm">{error}</p>}
      {!loading && connected && !canStart && !finished && !stopping && <p className="text-caption text-text-muted">{state?.startBlockReason ?? P.noCandidates}</p>}
    </section>

    <section className="rounded-lg bg-surface-muted p-md" aria-label={P.holdings}>
      <h2 className="text-body-sm font-semibold text-text-strong">{P.holdings}</h2>
      {!state?.positions.length ? <p className="mt-xs text-caption text-text-muted">{P.positionEmpty}</p> :
        <ul className="mt-sm space-y-xs">
          {state.positions.map(position => <li key={position.ticker} className="flex items-center justify-between gap-sm text-body-sm">
            <span>{position.name ?? position.ticker}</span><span className="tabular-nums">{position.quantity}{C.quantity}</span>
          </li>)}
        </ul>}
    </section>

    <section className="space-y-md" aria-label={M.logs}>
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h2 className="text-h2 font-bold text-text-strong">{M.logs}</h2>
        <span className="flex items-center gap-xs text-caption text-text-muted"><ArrowDown className="h-4 w-4 shrink-0" aria-hidden="true" />{M.realtime}</span>
      </div>
      <p className="text-caption text-text-muted">
        {state?.updatedAt ? `${M.logUpdated} · ${new Date(state.updatedAt).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" })}` : M.empty}
      </p>
      {!state?.trades.length ? <p className="rounded-lg bg-surface-muted p-lg text-body-sm text-text-muted">{M.empty}</p> :
        <div className="max-h-96 max-w-full overflow-auto rounded-lg border border-border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          tabIndex={0} role="region" aria-label={M.logs}>
          <table className="w-full whitespace-nowrap text-left text-body-sm">
            <caption className="sr-only">{M.logs}</caption>
            <thead className="sticky top-0 bg-surface-muted"><tr>
              {[P.time, C.ticker, C.quantity, C.price, C.reason, C.net].map(label => <th key={label} scope="col" className="p-md font-medium text-text-muted">{label}</th>)}
            </tr></thead>
            <tbody>{state.trades.slice().reverse().map(trade => <tr key={trade.id} className="border-t border-border-line">
              <td className="p-md tabular-nums">{time(trade.minute)}</td>
              <td className="p-md font-semibold">{trade.name ?? trade.ticker} · {trade.side === "buy" ? C.buy : C.sell}</td>
              <td className="p-md tabular-nums">{trade.quantity}</td>
              <td className="p-md tabular-nums">{money(trade.price)}</td>
              <td className="p-md">{C.reasons[trade.reason]}</td>
              <td className="p-md tabular-nums">{trade.net == null ? M.noBalance : money(trade.net)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      <p className="text-caption text-text-muted">{M.logHint} <a href="/api/program-trading/logs" target="_blank" rel="noreferrer" className="text-link">{M.downloadLogs}</a></p>
    </section>
  </div>;
}
