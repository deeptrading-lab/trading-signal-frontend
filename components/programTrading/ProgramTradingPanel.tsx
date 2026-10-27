"use client";
import { useProgramTrading } from "@/hooks/programTrading/useProgramTrading";
import { PROGRAM_COPY as C } from "@/lib/copy/programTrading/programTrading";
import { cn } from "@/lib/utils/cn";
const money=(v:number)=>`${Math.round(v).toLocaleString("ko-KR")}원`;
const time=(m:number)=>`${Math.floor(m/60).toString().padStart(2,"0")}:${(m%60).toString().padStart(2,"0")}`;
export function ProgramTradingPanel() {
 const {state:s,loading,pending,error,connected,canStart,send}=useProgramTrading();
 return <section className="card flex flex-col gap-md" aria-label={C.title}>
  <div className="flex flex-wrap items-start justify-between gap-sm"><div><p className="text-caption text-primary font-bold">{C.mock}</p><h2 className="text-h2 font-bold text-text-strong">{C.title}</h2><p className="text-body-sm text-text-muted">{C.subtitle}</p></div><span className="badge-info">{C.account}</span></div>
  <p role="status" className={cn("text-body-sm font-semibold",connected?"text-primary":"text-signal-down")}>{loading?C.loading:!connected?C.disconnected:s?.lastError?C.fault:s?.killed?C.killed:s&&s.minute>=920?C.ended:s?.running?C.running:C.paused}{s?` · ${C.time} ${time(s.minute)}`:""}</p>
  {error&&<p role="alert" className="rounded-lg bg-surface-muted p-md text-body-sm">{error} {s&&C.unavailable}</p>}
  {s&&<div className="grid grid-cols-2 gap-md lg:grid-cols-4">{[[C.equity,money(s.equity)],[C.cash,money(s.cash)],[C.realized,money(s.realized)],[C.positions,`${s.positions.length} / 2`]].map(([label,value])=><div key={label} className="rounded-lg bg-surface-muted p-md"><p className="text-caption text-text-muted">{label}</p><p className="text-body-md font-bold tabular-nums text-text-strong">{value}</p></div>)}</div>}
  <section className="rounded-lg border border-border-line p-md" aria-label={C.candidatesTitle}>
    <h3 className="text-body-md font-bold text-text-strong">{C.candidatesTitle} · {canStart?s?.candidates.rows.length:0}</h3>
    <p className="mt-xs text-body-sm text-text-muted">{C.candidatesHint}</p>
    {!canStart?<p role="status" className="mt-sm text-body-sm text-text-muted">{loading?C.candidateLoading:C.noCandidates}</p>:<ul className="mt-sm max-h-48 overflow-y-auto divide-y divide-border-line">{s?.candidates.rows.map(row=><li key={row.ticker} className="flex flex-wrap items-center justify-between gap-sm py-sm text-body-sm"><span className="font-semibold">{row.name} <span className="text-caption text-text-muted">{row.ticker}</span></span><span className="text-caption text-text-muted">{row.sources.map(source=>C.candidateSources[source]).join(" · ")}</span></li>)}</ul>}
    {s?.candidates.checkedAt&&<p className="mt-sm text-caption text-text-muted">{C.candidateTime} · {new Date(s.candidates.checkedAt).toLocaleTimeString("ko-KR",{timeZone:"Asia/Seoul"})}</p>}
    <p className="mt-xs text-caption text-text-muted">{C.candidateNote}</p>
  </section>
  <div className="flex flex-wrap gap-sm"><button className="button-primary min-h-hit-area-min" disabled={!s||!connected||pending||!canStart||!!s.lastError||s.running||s.killed||s.minute>=920} onClick={()=>send("start")}>{C.start}</button><button className="button-secondary min-h-hit-area-min" disabled={!s||!connected||pending||!s.running} onClick={()=>send("pause")}>{C.pause}</button><button className="button-secondary min-h-hit-area-min text-signal-down" disabled={!s||!connected||pending||(!s.positions.length&&!s.running)} onClick={()=>{if(window.confirm(C.confirmation))send("flatten");}}>{C.flatten}</button></div>
  <p className="text-caption text-text-muted">{C.replay}</p>
  {s?.positions.map(p=><div key={p.ticker} className="flex flex-wrap justify-between gap-sm border-b border-border-line py-sm text-body-sm"><span>{s.quotes.find(q=>q.ticker===p.ticker)?.name??p.ticker} · {p.quantity}{C.quantity}</span><span>{money(p.entry)} → {money(p.mark)}</span></div>)}
  <details className="rounded-lg border border-border-line p-md"><summary className="cursor-pointer font-semibold text-body-sm">{C.rules}</summary><div className="mt-sm space-y-sm text-body-sm text-text-muted"><p>{C.ruleText}</p><p>{C.exitText}</p><p>{C.costs}</p><p>{C.execution}</p></div></details>
  <div><h3 className="text-body-md font-bold text-text-strong">{C.trades}</h3>{!s?.trades.length?<p className="mt-sm text-body-sm text-text-muted">{C.empty}</p>:<div className="overflow-x-auto"><table className="w-full text-left text-body-sm whitespace-nowrap"><caption className="sr-only">{C.trades}</caption><thead><tr>{[C.time,C.ticker,C.quantity,C.price,C.reason,C.net].map(h=><th key={h} scope="col" className="p-sm text-text-muted font-medium">{h}</th>)}</tr></thead><tbody>{s.trades.slice(-12).reverse().map(t=><tr key={t.id} className="border-t border-border-line"><td className="p-sm">{time(t.minute)}</td><td className="p-sm">{t.ticker} · {t.side==="buy"?C.buy:C.sell}</td><td className="p-sm">{t.quantity}</td><td className="p-sm tabular-nums">{money(t.price)}</td><td className="p-sm">{C.reasons[t.reason]}</td><td className="p-sm tabular-nums">{t.net===null?"—":money(t.net)}</td></tr>)}</tbody></table></div>}</div>
  <aside className="rounded-lg bg-surface-muted p-md"><h3 className="text-body-sm font-semibold">{C.review}</h3><p className="mt-xs text-caption text-text-muted">{C.reviewText}</p></aside>
 </section>;
}
