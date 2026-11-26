"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useProgramAssets } from "@/hooks/programTrading/useProgramAssets";
import { PROGRAM_ASSETS_COPY as C } from "@/lib/copy/programTrading/assets";

const updatedTime = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });

export function ProgramTradingAssets() {
  const { assets, value, loading, pending, error, saved, reload, change, save } = useProgramAssets();
  return <div className="mx-auto w-full min-w-0 max-w-main-max-w space-y-lg sm:space-y-xl">
    <header className="space-y-sm">
      <Link href="/program-trading" className="inline-flex min-h-hit-area-min items-center gap-xs text-body-sm text-link no-underline hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />{C.back}
      </Link>
      <h1 className="text-h1 font-bold text-text-strong">{C.title}</h1>
      <p className="text-body-sm text-text-muted">{C.description}</p>
    </header>
    <div className="grid min-w-0 gap-lg border-t border-border-line pt-lg lg:grid-cols-2 lg:gap-xl">
      <section className="min-w-0 space-y-md" aria-labelledby="program-assets-heading">
        <h2 id="program-assets-heading" className="text-h2 font-bold text-text-strong">{C.next}</h2>
        {loading && <p role="status" className="text-body-sm text-text-muted">{C.loading}</p>}
        {assets && <div className="space-y-md">
          <p className="wrap-anywhere text-h1 font-bold tabular-nums text-text-strong">
            {assets.amount.toLocaleString("ko-KR")}<span className="ml-xs text-body-md font-medium">{C.won}</span>
          </p>
          <dl className="space-y-xs text-body-sm">
            <div className="flex flex-wrap items-baseline gap-x-md gap-y-xs">
              <dt className="text-text-muted">{C.sourceLabel}</dt><dd className="text-text-strong">{C.sources[assets.source]}</dd>
            </div>
            {assets.updatedAt && <div className="flex flex-wrap items-baseline gap-x-md gap-y-xs">
              <dt className="text-text-muted">{C.updated}</dt>
              <dd className="text-text-strong"><time dateTime={assets.updatedAt}>{updatedTime.format(new Date(assets.updatedAt))}</time></dd>
            </div>}
          </dl>
        </div>}
        <p className="text-body-sm leading-relaxed break-keep text-text-muted">{C.hint}</p>
        <p className="text-caption leading-relaxed break-keep text-text-muted">{C.browserHint}</p>
      </section>
      <section className="min-w-0 space-y-md border-t border-border-line pt-lg lg:border-t-0 lg:pt-0" aria-labelledby="program-assets-edit">
        <h2 id="program-assets-edit" className="text-h2 font-bold text-text-strong">{C.edit}</h2>
        <form className="space-y-sm" onSubmit={event => { event.preventDefault(); save(); }}>
          <div className="grid min-w-0 gap-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0 space-y-xs">
              <label htmlFor="program-asset-amount" className="block text-body-sm font-medium text-text-strong">{C.label}</label>
              <div className="relative">
                <input id="program-asset-amount" type="text" inputMode="numeric" autoComplete="off" value={value}
                  onChange={event => change(event.target.value)} disabled={loading || pending || !assets}
                  aria-describedby="program-asset-help" aria-invalid={!!error}
                  className="input h-hit-area-min w-full min-w-0 pr-input-pr-suffix-lg text-right tabular-nums" />
                <span className="pointer-events-none absolute inset-y-0 right-input-px inline-flex items-center text-body-sm text-text-muted" aria-hidden="true">{C.won}</span>
              </div>
            </div>
            <button type="submit" disabled={loading || pending || !assets}
              className="button-primary inline-flex h-hit-area-min items-center justify-center gap-xs whitespace-nowrap">
              <Check className="size-4" aria-hidden="true" />{pending ? C.saving : C.save}
            </button>
          </div>
          <p id="program-asset-help" className="text-caption leading-relaxed text-text-muted">{C.locked}</p>
        </form>
        {error && <div className="space-y-xs"><p role="alert" className="text-body-sm text-critical">{error}</p>{!assets && <button type="button" onClick={reload} className="button-secondary">{C.retry}</button>}</div>}
        {saved && <p role="status" className="text-body-sm text-text-strong">{C.saved}</p>}
      </section>
    </div>
  </div>;
}
