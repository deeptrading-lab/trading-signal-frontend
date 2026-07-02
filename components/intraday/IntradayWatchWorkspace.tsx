/**
 * IntradayWatchWorkspace — 단타 워치 워크스페이스 (B). intraday-scalping-agent §0 + intraday-paper-watch.
 *
 * 구조(피드백 반영): 최상단 단독 종목 검색(StockSearchPicker) → 추천 후보 카드(수급·거래량, 검색과
 * 분리) → 워치 **표**(IntradayWatchTable, 토스 랭킹 표 스타일 — 행 확장으로 판단/모의 단타 진입).
 * 화면이 열려 있는 동안 useIntradayPaperAutoTick 이 장중 5분 창 단위 자동 판단·가상 체결을 민다.
 * ⚠️ 의사결정 보조 — 자동 수익/집행 주장 없음, 실제 매매는 사람이 직접.
 */

"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQueryFlowTop10 } from "@/hooks/flow/useQueryFlowTop10";
import { useQueryVolumeRank } from "@/hooks/market/useQueryVolumeRank";
import { useQueryWatchlist } from "@/hooks/watchlist/useQueryWatchlist";
import {
  intradaySessionStock,
  useIntradayPaperWatch,
} from "@/hooks/intraday/useIntradayPaperWatch";
import { useIntradayPaperAutoTick } from "@/hooks/intraday/useIntradayPaperAutoTick";
import { IntradayWatchTable } from "@/components/intraday/IntradayWatchTable";
import { StockSearchPicker } from "@/components/ui/StockSearchPicker";
import {
  INTRADAY_PAPER_COPY as P,
  INTRADAY_WATCH_COPY as W,
} from "@/lib/copy/stock/intradayRead";
import type { InvestorFlowRow } from "@/lib/types/flow/top10";

type Watch = { ticker: string; name: string };

/** 추천 칩 1개 데이터 — 수급·거래량 소스 공통 최소 형태. */
type Candidate = { ticker: string; name: string; changePercent: number };

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
  const { data: flow, isLoading: flowLoading } = useQueryFlowTop10("today");
  const { data: volumeRank, isLoading: volumeLoading } = useQueryVolumeRank();

  const watchTickers = watch.map((item) => item.ticker);
  const { data: quotes = [] } = useQueryWatchlist(watchTickers);
  const { sessionByTicker, runningOrphans, runningSessionIds, isCreating, start } =
    useIntradayPaperWatch(watchTickers);
  const { isTicking } = useIntradayPaperAutoTick(runningSessionIds);

  const flowCandidates = dedupCandidates([...(flow?.foreign ?? []), ...(flow?.institution ?? [])]);
  const volumeCandidates = (volumeRank?.rows ?? []).slice(0, MAX_CANDIDATES);
  const watching = new Set(watchTickers);

  const add = (item: Watch) =>
    setWatch((prev) => (prev.some((x) => x.ticker === item.ticker) ? prev : [...prev, item]));
  const remove = (ticker: string) => setWatch((prev) => prev.filter((x) => x.ticker !== ticker));

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

      {/* 종목 검색 — 추천 UI 와 분리해 최상단 단독 배치(피드백). */}
      <StockSearchPicker
        placeholder={W.searchPlaceholder}
        onSelect={(stock) => add({ ticker: stock.ticker, name: stock.name })}
      />

      {/* 추천 후보 — 수급 상위 + 거래량 상위 */}
      <section className="card flex flex-col gap-md" aria-label={W.recommendTitle}>
        <CandidateChips
          title={W.flowTitle}
          hint={W.flowHint}
          isLoading={flowLoading}
          candidates={flowCandidates}
          watching={watching}
          onAdd={add}
        />
        <CandidateChips
          title={W.volumeTitle}
          hint={W.volumeHint}
          isLoading={volumeLoading}
          candidates={volumeCandidates}
          watching={watching}
          onAdd={add}
        />
      </section>

      {/* 진행 중 모의 세션 복원 칩 — 새로고침으로 워치가 비어도 세션은 살아있다 */}
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

      {/* 워치 표 — 공통 안내는 종목마다 반복하지 않고 표 위 한 곳에(피드백). */}
      {watch.length === 0 ? (
        <div className="card-info text-body">{W.empty}</div>
      ) : (
        <>
          <div className="flex flex-col gap-[2px] text-caption text-text-muted">
            {P.noticeLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <IntradayWatchTable
            items={watch}
            quotes={quotes}
            sessionByTicker={sessionByTicker}
            isCreating={isCreating}
            onStart={start}
            onRemove={remove}
          />
        </>
      )}
    </div>
  );
}

/** 추천 후보 칩 행 — 수급/거래량 공통 렌더(이미 워치면 비활성). */
function CandidateChips({
  title,
  hint,
  isLoading,
  candidates,
  watching,
  onAdd,
}: {
  title: string;
  hint: string;
  isLoading: boolean;
  candidates: Candidate[];
  watching: Set<string>;
  onAdd: (item: Watch) => void;
}) {
  return (
    <div className="flex flex-col gap-xs" aria-label={title}>
      <div className="flex items-baseline gap-sm">
        <h2 className="text-body-strong text-text-strong">{title}</h2>
        <span className="text-caption text-text-muted">{hint}</span>
      </div>
      {isLoading ? (
        <div className="text-body-sm text-text-muted">{W.candidatesLoading}</div>
      ) : candidates.length === 0 ? (
        <div className="text-body-sm text-text-muted">{W.candidatesEmpty}</div>
      ) : (
        <div className="flex flex-wrap gap-xs">
          {candidates.map((c) => (
            <button
              key={c.ticker}
              type="button"
              onClick={() => onAdd({ ticker: c.ticker, name: c.name })}
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
                  c.changePercent > 0
                    ? "text-signal-up"
                    : c.changePercent < 0
                      ? "text-signal-down"
                      : "text-text-muted",
                )}
              >
                {c.changePercent >= 0 ? "+" : ""}
                {c.changePercent.toFixed(1)}%
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
