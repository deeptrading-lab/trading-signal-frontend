/**
 * IntradayWatchWorkspace — 단타 워치 워크스페이스 (B). intraday-scalping-agent §0 + intraday-paper-watch.
 *
 * 구조(피드백 반영): 최상단 단독 종목 검색(StockSearchPicker) → 추천 후보 카드(수급·거래량, 검색과
 * 분리) → 워치 **표**(IntradayWatchTable, 토스 랭킹 표 스타일 — 행 확장으로 판단/모의 단타 진입).
 * 화면이 열려 있는 동안 useIntradayPaperAutoTick 이 장중 5분 창 단위 자동 판단·가상 체결을 민다.
 * ⚠️ 의사결정 보조 — 자동 수익/집행 주장 없음, 실제 매매는 사람이 직접.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQueryFlowTop10 } from "@/hooks/flow/useQueryFlowTop10";
import { useQueryVolumeRank } from "@/hooks/market/useQueryVolumeRank";
import { useQueryWatchlist } from "@/hooks/watchlist/useQueryWatchlist";
import { useIntradayPaperWatch } from "@/hooks/intraday/useIntradayPaperWatch";
import { useIntradayPaperRefresh } from "@/hooks/intraday/useIntradayPaperRefresh";
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

/** 워치 로컬 목록 localStorage 키 — 페이지 이동/새로고침에도 직접 추가한 종목 유지. */
const WATCH_STORAGE_KEY = "finsight:intraday-watch";

function loadStoredWatch(): Watch[] {
  try {
    const raw = window.localStorage.getItem(WATCH_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is Watch =>
          !!x && typeof (x as Watch).ticker === "string" && typeof (x as Watch).name === "string",
      )
      .slice(0, 20);
  } catch {
    return [];
  }
}

export function IntradayWatchWorkspace() {
  const [watch, setWatch] = useState<Watch[]>([]);
  // SSR 불일치 방지 — 마운트 후 localStorage 복원, 복원 전에는 저장하지 않는다.
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    setWatch(loadStoredWatch());
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify(watch));
    } catch {
      /* 저장 실패는 무시(용량 등) */
    }
  }, [watch, storageReady]);

  const { data: flow, isLoading: flowLoading } = useQueryFlowTop10("today");
  const { data: volumeRank, isLoading: volumeLoading } = useQueryVolumeRank();
  const { sessionByTicker, activeStocks, runningSessionIds, isCreating, start } =
    useIntradayPaperWatch();
  // 틱은 서버 스케줄러가 전담 — 여기선 화면 데이터만 30초 주기로 따라온다.
  useIntradayPaperRefresh(runningSessionIds);
  const autoActive = runningSessionIds.length > 0;

  // 표 행 = 로컬 워치 ∪ 활성 세션 종목(자동 상주 — 페이지를 벗어나도 표가 유지된다, 피드백).
  const rows = useMemo(() => {
    const map = new Map<string, Watch>();
    for (const item of watch) map.set(item.ticker, item);
    for (const stock of activeStocks) {
      if (!map.has(stock.ticker)) map.set(stock.ticker, { ticker: stock.ticker, name: stock.name });
    }
    return [...map.values()];
  }, [watch, activeStocks]);

  const rowTickers = rows.map((item) => item.ticker);
  const { data: quotes = [] } = useQueryWatchlist(rowTickers);

  const flowCandidates = dedupCandidates([...(flow?.foreign ?? []), ...(flow?.institution ?? [])]);
  const volumeCandidates = (volumeRank?.rows ?? []).slice(0, MAX_CANDIDATES);
  const watching = new Set(rowTickers);

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
        {autoActive ? <span className="ml-auto badge-info">{P.autoTicking}</span> : null}
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

      {/* 워치 표 — 활성 세션 종목은 자동 상주(로컬 워치 초기화와 무관). 공통 안내는 표 위 한 곳에. */}
      {rows.length === 0 ? (
        <div className="card-info text-body">{W.empty}</div>
      ) : (
        <>
          <div className="flex flex-col gap-[2px] text-caption text-text-muted">
            {P.noticeLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <IntradayWatchTable
            items={rows}
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
