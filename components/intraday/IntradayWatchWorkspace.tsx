/**
 * IntradayWatchWorkspace — 단타 워치 워크스페이스 (B). intraday-scalping-agent §0 + intraday-paper-watch.
 *
 * 수급 상위 후보(flow/top10)·종목 검색에서 종목을 골라 워치 목록에 추가 → 각 종목의 장중 단타
 * 판단(참고)을 on-demand 로 보고, 카드 하단 "AI 모의 단타"로 cli-agent 모의투자 세션을 시작한다.
 * 화면이 열려 있는 동안 useIntradayPaperAutoTick 이 장중 5분 창 단위 자동 판단·가상 체결을 민다.
 * ⚠️ 의사결정 보조 — 자동 수익/집행 주장 없음, 실제 매매는 사람이 직접.
 */

"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQueryFlowTop10 } from "@/hooks/flow/useQueryFlowTop10";
import { useQueryStockSearch } from "@/hooks/stock/useQueryStockSearch";
import {
  intradaySessionStock,
  useIntradayPaperWatch,
} from "@/hooks/intraday/useIntradayPaperWatch";
import { useIntradayPaperAutoTick } from "@/hooks/intraday/useIntradayPaperAutoTick";
import { IntradayReadSection } from "@/components/stock/IntradayReadSection";
import { IntradayPaperControls } from "@/components/intraday/IntradayPaperControls";
import {
  INTRADAY_PAPER_COPY as P,
  INTRADAY_WATCH_COPY as W,
} from "@/lib/copy/stock/intradayRead";
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
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const { data: flow, isLoading } = useQueryFlowTop10("today");
  const { data: searchResults = [], isPending: isSearching } = useQueryStockSearch(
    debouncedKeyword,
    { enabled: debouncedKeyword.length > 0 },
  );

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 180);
    return () => window.clearTimeout(id);
  }, [keyword]);

  const watchTickers = watch.map((item) => item.ticker);
  const { sessionByTicker, runningOrphans, runningSessionIds, isCreating, start } =
    useIntradayPaperWatch(watchTickers);
  const { isTicking } = useIntradayPaperAutoTick(runningSessionIds);

  const candidates = dedupCandidates([...(flow?.foreign ?? []), ...(flow?.institution ?? [])]);
  const watching = new Set(watchTickers);

  const add = (item: Watch) =>
    setWatch((prev) => (prev.some((x) => x.ticker === item.ticker) ? prev : [...prev, item]));
  const remove = (ticker: string) => setWatch((prev) => prev.filter((x) => x.ticker !== ticker));
  const addFromSearch = (item: Watch) => {
    add(item);
    setKeyword("");
    setDebouncedKeyword("");
  };

  return (
    <div className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg">
      <header className="flex items-center gap-sm">
        <Zap className="h-2xl w-2xl text-accent-vivid" aria-hidden="true" />
        <div className="flex flex-col">
          <h1 className="text-h1 text-text-strong">{W.title}</h1>
          <p className="text-caption text-text-muted">{W.subtitle}</p>
        </div>
        {isTicking ? <span className="ml-auto badge-info">{P.autoTicking}</span> : null}
      </header>

      {/* 수급 상위 후보 + 종목 검색 */}
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
                onClick={() => add({ ticker: c.ticker, name: c.name })}
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

        {/* 종목 검색 — 수급 후보 밖 종목도 워치에 추가 */}
        <label className="relative flex flex-col gap-xs">
          <span className="sr-only">{W.searchPlaceholder}</span>
          <input
            className="h-input-h w-full rounded-md border border-border-line bg-surface-base px-md text-body-sm text-text-strong"
            value={keyword}
            placeholder={W.searchPlaceholder}
            onChange={(event) => setKeyword(event.target.value)}
          />
          {debouncedKeyword.length > 0 ? (
            <div className="dropdown-panel absolute left-0 right-0 top-full z-20 mt-xs flex max-h-[260px] flex-col gap-[2px] overflow-y-auto">
              {isSearching && searchResults.length === 0 ? (
                <p className="px-md py-dropdown-item-py text-body-sm text-text-muted">{W.searching}</p>
              ) : searchResults.length === 0 ? (
                <p className="px-md py-dropdown-item-py text-body-sm text-text-muted">{W.searchEmpty}</p>
              ) : (
                searchResults.map((stockItem) => (
                  <button
                    key={stockItem.ticker}
                    type="button"
                    className="search-result-item w-full text-left"
                    onClick={() => addFromSearch({ ticker: stockItem.ticker, name: stockItem.name })}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-body-sm-strong text-text-strong">{stockItem.name}</span>
                      <span className="search-result-item-meta">
                        {stockItem.ticker} · {stockItem.market}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </label>
      </section>

      {/* 진행 중 모의 세션 복원 칩 — 새로고침으로 워치가 비어도 세션은 서버에 살아있다 */}
      {runningOrphans.length > 0 ? (
        <section className="card flex flex-col gap-xs" aria-label={W.runningTitle}>
          <div className="flex items-baseline gap-sm">
            <h2 className="text-h2 text-text-strong">{W.runningTitle}</h2>
            <span className="text-caption text-text-muted">{W.runningHint}</span>
          </div>
          <div className="flex flex-wrap gap-xs">
            {runningOrphans.map((session) => {
              const sessionStock = intradaySessionStock(session);
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => add({ ticker: sessionStock.ticker, name: sessionStock.name })}
                  className="text-caption px-sm py-xs rounded-pill border border-border-line transition-colors cursor-pointer hover:bg-surface-muted"
                >
                  <span className="text-text-strong">{sessionStock.name}</span>{" "}
                  <span
                    className={cn(
                      "tabular-nums",
                      session.returnPct >= 0 ? "text-signal-up" : "text-signal-down",
                    )}
                  >
                    {session.returnPct >= 0 ? "+" : ""}
                    {session.returnPct.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* 워치 목록 */}
      {watch.length === 0 ? (
        <div className="card-info text-body">{W.empty}</div>
      ) : (
        <div className="flex flex-col gap-md">
          {watch.map((item) => (
            <IntradayReadSection
              key={item.ticker}
              ticker={item.ticker}
              heading={`${item.name} ${item.ticker}`}
              onRemove={() => remove(item.ticker)}
            >
              <IntradayPaperControls
                stock={{ ticker: item.ticker, name: item.name }}
                session={sessionByTicker.get(item.ticker) ?? null}
                isCreating={isCreating}
                onStart={start}
              />
            </IntradayReadSection>
          ))}
        </div>
      )}

      <p className="text-caption text-text-muted">{W.disclaimer}</p>
    </div>
  );
}
