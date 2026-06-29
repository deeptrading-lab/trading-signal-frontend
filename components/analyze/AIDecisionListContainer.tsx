/**
 * AIDecisionListContainer — 분석 결과 카드 목록의 client 데이터 경계.
 *
 * useQueryAIDecisions 로 저장된 결론 목록(최신순)을 가져와 로딩/에러/미설정/빈 분기를 처리한다.
 * 종목명은 useQueryStockNames 로 한 번에 해석해(카드·시트와 캐시 공유) 검색·표시에 모두 쓴다.
 * 검색은 로드된 목록을 클라이언트에서 ticker·종목명으로 필터링한다(소량 목록, 네트워크 호출 없음).
 * 커스텀훅 의무화(frontend.md §1) — useQuery 직접 import 금지, 도메인 훅만 소비.
 */

"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { RefreshCw } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils/cn";
import { SearchInput } from "@/components/ui/SearchInput";
import { useQueryAIDecisions } from "@/hooks/stock/useQueryAIDecisions";
import { useQueryStockNames } from "@/hooks/stock/useQueryStockNames";
import { AIDecisionCard } from "./AIDecisionCard";
import { InflightCard } from "./InflightCard";
import { AIDecisionDetailSheet } from "./AIDecisionDetailSheet";
import type { AIDecisionListItem } from "@/lib/types/stock/aiAnalysisDecisions";
import {
  RESULTS_EMPTY_BODY,
  RESULTS_EMPTY_TITLE,
  RESULTS_ERROR,
  RESULTS_LOADING,
  RESULTS_NOT_CONFIGURED_BODY,
  RESULTS_NOT_CONFIGURED_TITLE,
  RESULTS_SEARCH_EMPTY_BODY,
  RESULTS_SEARCH_EMPTY_TITLE,
  RESULTS_SEARCH_PLACEHOLDER,
  resultsCount,
  USAGE_REFRESH,
  USAGE_RETRY,
} from "@/lib/copy/analyze/labels";

interface AIDecisionListContainerProps {
  /** 탭 줄 우측 툴바(종목 수·새로고침)를 렌더할 슬롯. 마운트 후 채워지므로 null 가능. */
  toolbarSlot: HTMLElement | null;
}

export function AIDecisionListContainer({ toolbarSlot }: AIDecisionListContainerProps) {
  const { data, isLoading, isError, isFetching, refetch } = useQueryAIDecisions();
  const [selected, setSelected] = useState<AIDecisionListItem | null>(null);
  const [query, setQuery] = useState("");

  // 종목명은 한 곳에서 해석 — 카드/시트 표시 + 검색 매칭에 공용. (hooks 순서 고정 위해 early return 위에서 호출)
  const items = useMemo(() => data?.items ?? [], [data]);
  // 완료 결과 없이 진행중인 종목(첫 분석) — 플레이스홀더 카드(unified-analysis-jobs).
  const inflight = useMemo(() => data?.inflight ?? [], [data]);
  const tickers = useMemo(
    () => [
      ...new Set([
        ...items.map((it) => it.ticker),
        ...inflight.map((it) => it.ticker),
      ]),
    ],
    [items, inflight],
  );
  const names = useQueryStockNames(tickers);
  const nameOf = (ticker: string): string => names[ticker] ?? ticker;
  const matchesQuery = (ticker: string, q: string): boolean =>
    ticker.toLowerCase().includes(q) || nameOf(ticker).toLowerCase().includes(q);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => matchesQuery(it.ticker, q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, names, query]);

  const filteredInflight = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inflight;
    return inflight.filter((it) => matchesQuery(it.ticker, q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inflight, names, query]);

  if (isLoading) {
    return (
      <div className="card skeleton min-h-[160px]" aria-busy="true">
        <span className="sr-only">{RESULTS_LOADING}</span>
        <div className="skeleton-line skeleton-line-medium" />
        <div className="skeleton-line skeleton-line-narrow" />
        <div className="skeleton-line skeleton-line-medium" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card-critical" role="alert">
        <p className="text-body-strong mb-md">{RESULTS_ERROR}</p>
        <button type="button" className="button-secondary" onClick={() => refetch()}>
          {USAGE_RETRY}
        </button>
      </div>
    );
  }

  if (!data.configured) {
    return (
      <div className="card" role="status">
        <h2 className="text-h3 text-text-strong mb-sm">{RESULTS_NOT_CONFIGURED_TITLE}</h2>
        <p className="text-body-sm text-text-muted">{RESULTS_NOT_CONFIGURED_BODY}</p>
      </div>
    );
  }

  if (items.length === 0 && inflight.length === 0) {
    return (
      <div className="card" role="status">
        <h2 className="text-h3 text-text-strong mb-sm">{RESULTS_EMPTY_TITLE}</h2>
        <p className="text-body-sm text-text-muted">{RESULTS_EMPTY_BODY}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      {/* 개수 + 새로고침 — 탭 줄 우측 슬롯으로 portal(검색 필터 반영 개수 유지). 모바일은 아이콘만. */}
      {toolbarSlot &&
        createPortal(
          <>
            <span className="text-caption text-text-muted">{resultsCount(filtered.length + filteredInflight.length)}</span>
            <button
              type="button"
              aria-label={USAGE_REFRESH}
              className="inline-flex items-center gap-xs text-caption text-text-muted hover:text-text-strong"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden="true" />
              <span className="hidden sm:inline">{USAGE_REFRESH}</span>
            </button>
          </>,
          toolbarSlot,
        )}

      {/* 검색 */}
      <SearchInput
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={RESULTS_SEARCH_PLACEHOLDER}
        aria-label={RESULTS_SEARCH_PLACEHOLDER}
      />

      {filtered.length === 0 && filteredInflight.length === 0 ? (
        <div className="card" role="status">
          <h2 className="text-h3 text-text-strong mb-sm">{RESULTS_SEARCH_EMPTY_TITLE}</h2>
          <p className="text-body-sm text-text-muted">{RESULTS_SEARCH_EMPTY_BODY}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {/* 진행중(첫 분석) 플레이스홀더 — 최신순, 결과 카드 위에. 완료되면 다음 폴링에 결과 카드로 대체. */}
          {filteredInflight.map((item) => (
            <InflightCard
              key={`inflight-${item.ticker}`}
              item={item}
              name={nameOf(item.ticker)}
            />
          ))}
          {filtered.map((item) => (
            <AIDecisionCard
              key={item.ticker}
              item={item}
              name={nameOf(item.ticker)}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <AIDecisionDetailSheet
            item={selected}
            name={nameOf(selected.ticker)}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
