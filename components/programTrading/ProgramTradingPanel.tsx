"use client";

import { useState, type FormEvent } from "react";
import { ArrowDown, ChevronDown, GitBranch, Play, Square } from "lucide-react";
import { ProgramTradingDiagramModal } from "@/components/programTrading/ProgramTradingDiagramModal";
import { useProgramTrading } from "@/hooks/programTrading/useProgramTrading";
import { PROGRAM_COPY as C, PROGRAM_MENU_COPY as M, PROGRAM_LIVE_COPY as L } from "@/lib/copy/programTrading/programTrading";
import type { AccountInput } from "@/lib/types/programTrading/programTrading";
import { cn } from "@/lib/utils/cn";

const money = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const time = (minute: number) => `${Math.floor(minute / 60).toString().padStart(2, "0")}:${(minute % 60).toString().padStart(2, "0")}`;

export function ProgramTradingPanel() {
  const { state: s, loading, pending, error, connected, canStart, send, account, accountLoading, accountPending, accountError, connectAccount } = useProgramTrading();
  const [diagramOpen, setDiagramOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const mode = s?.executionMode ?? account?.executionMode ?? "replay";
  const isLive = mode !== "replay";
  const orders = s?.live?.orders ?? [];
  const openOrders = orders.filter(order => ["intent", "open", "partial", "unknown", "cancelling"].includes(order.status));
  const recoveryRequired = !!s?.live?.recoveryRequired;
  const unknown = orders.some(order => order.status === "unknown" || order.status === "intent");
  const balanceUnconfirmed = isLive && (recoveryRequired || !!s?.live?.depositWithdrawalDetected || (!!s?.lifecycle?.startedAt && !s.live?.balanceFresh));
  const accountReady = !isLive || (!!account?.connected && account.environment === mode);
  const finished = s?.lifecycle?.status === "completed" && !balanceUnconfirmed && !unknown;
  const stopping = s?.lifecycle?.status === "stopping" || (s?.lifecycle?.status === "completed" && !finished);
  const beforeBalance = s?.lifecycle?.startedAt ? s.lifecycle.beforeBalance : null;
  const afterBalance = finished ? s?.lifecycle?.afterBalance : s?.equity;
  const returns = balanceUnconfirmed || unknown ? null : finished ? s?.lifecycle?.returnPct ?? null : beforeBalance && s ? (s.equity / beforeBalance - 1) * 100 : null;
  const metrics = [
    [M.initial, beforeBalance === null ? M.noBalance : money(beforeBalance)],
    [finished ? M.final : M.current, beforeBalance === null || afterBalance == null ? M.noBalance : money(afterBalance)],
    [M.profit, beforeBalance === null || afterBalance == null || balanceUnconfirmed || unknown ? M.noBalance : money(afterBalance - beforeBalance)],
    [M.returns, returns === null ? M.noBalance : `${returns > 0 ? "+" : ""}${returns.toFixed(2)}%`],
  ];
  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input: AccountInput = {
      accountNumber: String(data.get("accountNumber") ?? "").trim(),
      accountProductCode: String(data.get("accountProductCode") ?? "").trim(),
      environment: data.get("environment") === "prod" ? "prod" : "vts",
      appKey: String(data.get("appKey") ?? "").trim() || undefined,
      appSecret: String(data.get("appSecret") ?? "").trim() || undefined,
    };
    setFormError(null);
    try {
      await connectAccount(input);
      for (const name of ["appKey", "appSecret"]) {
        const field = form.elements.namedItem(name);
        if (field instanceof HTMLInputElement) field.value = "";
      }
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : M.errors);
    }
  }
  return <div className="mx-auto flex min-w-0 w-full max-w-main-max-w flex-col gap-xl">
    <header className="flex flex-wrap items-start justify-between gap-md">
      <div><h1 className="text-h1 font-bold text-text-strong">{M.title}</h1><p className="mt-xs text-body-sm text-text-muted">{M.subtitle}</p></div>
      <div className="flex flex-wrap items-center gap-sm">
        <span className={cn("badge-info", mode === "prod" && "bg-warn-soft text-warn")}>{L.modes[mode]}</span>
        <button type="button" className="button-secondary program-trading-action" aria-haspopup="dialog" aria-expanded={diagramOpen} onClick={() => setDiagramOpen(true)}><GitBranch className="h-4 w-4 shrink-0" aria-hidden="true" />{M.showDiagram}</button>
      </div>
    </header>

    <section className="rounded-lg border border-border-line p-lg" aria-label={M.accountTitle}>
      <details className="group" open={!account?.connected}>
        <summary className="flex min-h-hit-area-min cursor-pointer list-none flex-wrap items-center justify-between gap-sm text-body-md font-semibold text-text-strong [&::-webkit-details-marker]:hidden">
          <span>{M.accountTitle}</span><span className="flex min-w-0 items-center gap-sm text-body-sm font-normal text-text-muted"><span className="break-words">{accountLoading ? M.accountPending : account?.connected ? `${M.accountConnected} · ${account.maskedAccount}` : M.accountUnconnected}</span><ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" /></span>
        </summary>
        <p className="mt-sm text-body-sm text-text-muted">{M.accountHint}</p>
        {account?.connected && <p className="mt-sm text-caption text-text-muted">{M.linkedEquity} {account.totalEquity == null ? M.noBalance : money(account.totalEquity)} · {M.linkedCash} {account.cash == null ? M.noBalance : money(account.cash)}{account.checkedAt ? ` · ${M.checkedAt} ${new Date(account.checkedAt).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" })}` : ""}</p>}
        <form onSubmit={handleConnect} className="mt-md grid grid-cols-1 gap-md sm:grid-cols-2">
          <label className="input-label min-w-0">{M.accountNumber}<input name="accountNumber" autoComplete="off" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} required className="input program-trading-field mt-xs" /></label>
          <label className="input-label min-w-0">{M.accountProductCode}<input name="accountProductCode" autoComplete="off" inputMode="numeric" pattern="[0-9]{2}" maxLength={2} defaultValue="01" required className="input program-trading-field mt-xs" /></label>
          <label className="input-label min-w-0">{M.appKey}<input name="appKey" type="password" autoComplete="off" className="input program-trading-field mt-xs" /></label>
          <label className="input-label min-w-0">{M.appSecret}<input name="appSecret" type="password" autoComplete="off" className="input program-trading-field mt-xs" /></label>
          <label className="input-label min-w-0">{M.environment}<span className="relative mt-xs block"><select name="environment" key={account?.environment} defaultValue={account?.environment ?? "vts"} className="input program-trading-field appearance-none pr-input-pr-suffix"><option value="vts">{M.paper}</option><option value="prod">{M.live}</option></select><ChevronDown className="pointer-events-none absolute right-input-px top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" /></span></label>
          <button type="submit" className="button-secondary program-trading-action w-full self-end" disabled={accountPending || !!s?.running || stopping || !!s?.positions.length || openOrders.length > 0 || recoveryRequired}>{accountPending ? M.connecting : M.connect}</button>
        </form>
        <p className="mt-sm text-caption text-text-muted">{M.accountLocal} {M.accountKeysHint}</p>
      </details>
      {(formError || accountError) && <p role="alert" className="mt-sm text-body-sm text-critical">{formError || accountError}</p>}
      <p className="mt-sm text-body-sm font-semibold text-text-strong">{L.hints[mode]}</p>
      <p className="mt-sm text-caption text-text-muted">{L.limits}{isLive ? ` · ${L.maxOrder} ${s?.live?.maxOrderKrw ? money(s.live.maxOrderKrw) : L.orderLimitPending}` : ""}</p>
      {isLive && <p className="mt-xs text-caption text-text-muted">{L.orderMethods}</p>}
      {isLive && <p className="mt-xs text-caption text-text-muted">{s?.live?.accountMasked ?? account?.maskedAccount ?? M.accountUnconnected} · {L.modes[mode]}</p>}
    </section>

    <section aria-label={M.returns} className="space-y-md">
      <div className="grid grid-cols-2 gap-md lg:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="min-w-0 rounded-lg bg-surface-muted p-md sm:p-lg"><p className="text-caption text-text-muted">{label}</p><p className="mt-sm break-all text-body-md font-bold tabular-nums text-text-strong sm:text-h2">{value}</p></div>)}</div>
      <p className="text-caption text-text-muted">{isLive ? L.actualBalance : M.balanceHint}</p>
      {isLive && <p className="text-caption text-text-muted">{L.accountMovements}</p>}
      <p className="text-caption text-text-muted">{M.target} {s?.lifecycle?.targetReturnPct ?? 1}% · {M.targetPolicy}</p>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p role="status" className={cn("text-body-sm font-semibold", connected ? "text-primary" : "text-signal-down")}>{loading ? C.loading : !connected ? M.stale : unknown ? L.unknown : stopping ? L.stopping : balanceUnconfirmed ? L.staleBalance : s?.lastError ? L.fault : finished ? M.finished : s?.killed ? C.killed : s?.running ? M.running : M.stopped}</p>
        <div className="flex w-full gap-sm sm:w-auto">
          <button type="button" className="button-primary program-trading-action min-w-0 flex-1 sm:flex-none" disabled={!s || !connected || pending || !canStart || !!s.lastError || !accountReady || unknown || balanceUnconfirmed || (isLive && !s.live?.maxOrderKrw) || s.running || stopping || finished || s.killed || s.minute >= 920} onClick={() => send("start")}><Play className="h-4 w-4 shrink-0" aria-hidden="true" />{pending ? M.pending : L.starts[mode]}</button>
          <button type="button" className="button-secondary program-trading-action min-w-0 flex-1 sm:flex-none" disabled={!s || !connected || pending || (!s.positions.length && !s.running && !stopping && !openOrders.length)} onClick={() => send("flatten")}><Square className="h-4 w-4 shrink-0" aria-hidden="true" />{M.stop}</button>
        </div>
      </div>
      {unknown && <p role="alert" className="text-body-sm text-warn">{L.unknownHint}</p>}
      {s?.live?.depositWithdrawalDetected && <p role="alert" className="text-body-sm text-warn">{L.movementDetected}</p>}
      {!accountReady && <p className="text-body-sm text-text-muted">{account?.connected ? L.modeMismatch : L.connectFirst}</p>}
      {openOrders.length > 0 && <p className="text-caption text-text-muted">{L.pendingOrders} {openOrders.length}</p>}
      {finished && <p className="text-caption text-text-muted">{M.completedHint}</p>}
      {error && <p role="alert" className="rounded-lg bg-surface-muted p-md text-body-sm">{error}</p>}
      {!loading && connected && !canStart && !finished && !stopping && <p className="text-caption text-text-muted">{s?.live?.startBlockReason ?? C.noCandidates}</p>}
    </section>

    <section className="space-y-md" aria-label={M.logs}>
      <div className="flex flex-wrap items-center justify-between gap-sm"><h2 className="text-h2 font-bold text-text-strong">{M.logs}</h2><span className="flex items-center gap-xs text-caption text-text-muted"><ArrowDown className="h-4 w-4 shrink-0" aria-hidden="true" />{M.realtime}</span></div>
      <p className="text-caption text-text-muted">{s?.updatedAt ? `${M.logUpdated} · ${new Date(s.updatedAt).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" })}` : M.empty}</p>
      {s?.live?.lastReconciledAt && <p className="text-caption text-text-muted">{L.reconciledAt} · {new Date(s.live.lastReconciledAt).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" })}</p>}
      {isLive && <div className="space-y-sm"><h3 className="text-body-sm font-semibold text-text-strong">{L.orderLogs}</h3>{!orders.length ? <p className="text-body-sm text-text-muted">{L.noOrders}</p> : <div className="max-h-96 max-w-full overflow-auto rounded-lg border border-border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" tabIndex={0} role="region" aria-label={L.orderLogs}><table className="w-full whitespace-nowrap text-left text-body-sm"><caption className="sr-only">{L.orderLogs}</caption><thead className="sticky top-0 bg-surface-muted"><tr>{[L.orderTime, C.ticker, L.orderStatus, L.orderQuantity, L.executionPrice, L.orderId].map(label => <th key={label} scope="col" className="p-md font-medium text-text-muted">{label}</th>)}</tr></thead><tbody>{orders.slice().reverse().map(order => <tr key={order.clientId} className="border-t border-border-line"><td className="p-md tabular-nums">{new Date(order.createdAt).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" })}</td><td className="p-md font-semibold">{order.ticker} · {order.side === "buy" ? C.buy : C.sell}</td><td className="p-md">{L.statuses[order.status]}</td><td className="p-md tabular-nums">{order.quantity} / {order.filledQuantity}</td><td className="p-md tabular-nums">{order.filledQuantity > 0 ? money(order.filledAmount / order.filledQuantity) : M.noBalance}</td><td className="p-md">{order.id ?? M.noBalance}</td></tr>)}</tbody></table></div>}</div>}
      {isLive && <div className="rounded-lg bg-surface-muted p-md"><h3 className="text-body-sm font-semibold text-text-strong">{L.holdings}</h3>{!s?.positions.length ? <p className="mt-xs text-caption text-text-muted">{L.positionEmpty}</p> : <ul className="mt-sm space-y-xs">{s.positions.map(position => <li key={position.ticker} className="flex items-center justify-between gap-sm text-body-sm"><span>{position.ticker}</span><span className="tabular-nums">{position.quantity}{C.quantity}</span></li>)}</ul>}</div>}
      {isLive && <h3 className="text-body-sm font-semibold text-text-strong">{L.fills}</h3>}
      {!s?.trades.length ? <p className="rounded-lg bg-surface-muted p-lg text-body-sm text-text-muted">{M.empty}</p> : <div className="max-h-96 max-w-full overflow-auto rounded-lg border border-border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" tabIndex={0} role="region" aria-label={M.logs}><table className="w-full whitespace-nowrap text-left text-body-sm"><caption className="sr-only">{M.logs}</caption><thead className="sticky top-0 bg-surface-muted"><tr>{[isLive ? L.fillTime : C.time, C.ticker, C.quantity, C.price, C.reason, C.net].map(label => <th key={label} scope="col" className="p-md font-medium text-text-muted">{label}</th>)}</tr></thead><tbody>{s.trades.slice().reverse().map(trade => <tr key={trade.id} className="border-t border-border-line"><td className="p-md tabular-nums">{time(trade.minute)}</td><td className="p-md font-semibold">{trade.ticker} · {trade.side === "buy" ? C.buy : C.sell}</td><td className="p-md tabular-nums">{trade.quantity}</td><td className="p-md tabular-nums">{money(trade.price)}</td><td className="p-md">{C.reasons[trade.reason]}</td><td className="p-md tabular-nums">{trade.net === null ? M.noBalance : money(trade.net)}</td></tr>)}</tbody></table></div>}
      {isLive && <p className="text-caption text-text-muted">{L.estimatedFees}</p>}
      <p className="text-caption text-text-muted">{M.logHint} <a href="/api/program-trading/logs" target="_blank" rel="noreferrer" className="text-link">{M.downloadLogs}</a></p>
    </section>
    {diagramOpen && <ProgramTradingDiagramModal onClose={() => setDiagramOpen(false)} />}
  </div>;
}
