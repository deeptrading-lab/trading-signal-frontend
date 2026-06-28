/**
 * IntradayWatchWorkspace — 단타 워치 워크스페이스 (B). intraday-scalping-agent §0.
 *
 * 수급 상위 후보(flow/top10)에서 종목을 골라 워치 목록에 추가 → 각 종목의 장중 단타 판단(참고)을
 * on-demand 로 본다. A 의 read 백엔드·IntradayReadSection·IntradayReadCard 를 그대로 재사용.
 * ⚠️ 의사결정 보조 — 자동 수익/집행 주장 없음, 매매는 사람이 직접.
 */

"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQueryFlowTop10 } from "@/hooks/flow/useQueryFlowTop10";
import { IntradayReadSection } from "@/components/stock/IntradayReadSection";
import { INTRADAY_WATCH_COPY as W } from "@/lib/copy/stock/intradayRead";
import type { InvestorFlowRow } from "@/lib/types/flow/top10";

type Watch = { ticker: string; name: string };

const MAX_CANDIDATES = 14;

function dedupCandidates(rows: InvestorFlowRow[]): InvestorFlowRow[] {
  const seen = new Set<string>();
  const out: InvestorFlowRow[] = [];
  for (const r of rows) {
    if (seen.has(r.ticker)) continue;
    seen.add(r.ticker);
    out.push(r);
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}

export function IntradayWatchWorkspace() {
  const [watch, setWatch] = useState<Watch[]>([]);
  const { data: flow, isLoading } = useQueryFlowTop10("today");

  const candidates = dedupCandidates([...(flow?.foreign ?? []), ...(flow?.institution ?? [])]);
  const watching = new Set(watch.map((w) => w.ticker));

  const add = (c: InvestorFlowRow) =>
    setWatch((w) => (w.some((x) => x.ticker === c.ticker) ? w : [...w, { ticker: c.ticker, name: c.name }]));
  const remove = (ticker: string) => setWatch((w) => w.filter((x) => x.ticker !== ticker));

  return (
    <div className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg">
      <header className="flex items-center gap-sm">
        <Zap className="h-2xl w-2xl text-accent-vivid" aria-hidden="true" />
        <div className="flex flex-col">
          <h1 className="text-h1 text-text-strong">{W.title}</h1>
          <p className="text-caption text-text-muted">{W.subtitle}</p>
        </div>
      </header>

      {/* 수급 상위 후보 */}
      <section className="card flex flex-col gap-sm" aria-label={W.candidatesTitle}>
        <div className="flex items-baseline gap-sm">
          <h2 className="text-h2 text-text-strong">{W.candidatesTitle}</h2>
          <span className="text-caption text-text-muted">{W.candidatesHint}</span>
        </div>
        {isLoading ? (
          <div className="text-body text-text-muted">{W.candidatesLoading}</div>
        ) : candidates.length === 0 ? (
          <div className="text-body text-text-muted">{W.candidatesEmpty}</div>
        ) : (
          <div className="flex flex-wrap gap-xs">
            {candidates.map((c) => (
              <button
                key={c.ticker}
                type="button"
                onClick={() => add(c)}
                disabled={watching.has(c.ticker)}
                className={cn(
                  "text-caption px-sm py-xs rounded-pill border border-border-line transition-colors cursor-pointer",
                  "hover:bg-surface-muted disabled:opacity-40 disabled:cursor-default",
                )}
              >
                <span className="text-text-strong">{c.name}</span>{" "}
                <span
                  className={cn(
                    "tabular-nums",
                    c.changePercent > 0 ? "text-signal-up" : c.changePercent < 0 ? "text-signal-down" : "text-text-muted",
                  )}
                >
                  {c.changePercent >= 0 ? "+" : ""}
                  {c.changePercent.toFixed(1)}%
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 워치 목록 */}
      {watch.length === 0 ? (
        <div className="card-info text-body">{W.empty}</div>
      ) : (
        <div className="flex flex-col gap-md">
          {watch.map((w) => (
            <IntradayReadSection
              key={w.ticker}
              ticker={w.ticker}
              heading={`${w.name} ${w.ticker}`}
              onRemove={() => remove(w.ticker)}
            />
          ))}
        </div>
      )}

      <p className="text-caption text-text-muted">{W.disclaimer}</p>
    </div>
  );
}
