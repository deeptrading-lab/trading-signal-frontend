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
import { cn } from "@/lib/utils/cn";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQueryAIDecisions } from "@/hooks/stock/useQueryAIDecisions";
import { useQueryStockNames } from "@/hooks/stock/useQueryStockNames";
import { useAIAnalysisContext } from "@/hooks/stock/aiAnalysisProvider";
import { AIDecisionCard } from "./AIDecisionCard";
import { InflightCard } from "./InflightCard";
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
  // 카드 클릭 → 우측 AI 패널 저장모드(openFor). 중앙 상세 팝업은 폐지 — 저장 결론은 이제 패널이
  // verdict-forward 로 렌더하고, 케밥/재분석과 진입점이 하나로 통합된다(ai-analysis-redesign PR③).
  const { openFor } = useAIAnalysisContext();
  const [query, setQuery] = useState("");

  // 종목명은 한 곳에서 해석 — 카드/시트 표시 + 검색 매칭에 공용. (hooks 순서 고정 위해 early return 위에서 호출)
  const items = useMemo(() => data?.items ?? [], [data]);
  // 완료 결과 없이 진행중인 종목(첫 분석) — 플레이스홀더 카드(unified-analysis-jobs).
  const inflight = useMemo(() => data?.inflight ?? [], [data]);
  // DB 에 저장된 종목명(decision-stock-name) — 완료/진행중 카드가 들고 온 name. 깜빡임 없이 즉시 표시.
  const dbNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) if (it.name) m.set(it.ticker, it.name);
    for (const it of inflight) if (it.name && !m.has(it.ticker)) m.set(it.ticker, it.name);
    return m;
  }, [items, inflight]);
  // KIS 종목명 해석은 DB name 이 없는 ticker 만(폴백) — 이미 이름이 있으면 KIS 호출을 건너뛴다(호출 수 감소).
  const tickers = useMemo(
    () =>
      [
        ...new Set([
          ...items.map((it) => it.ticker),
          ...inflight.map((it) => it.ticker),
        ]),
      ].filter((t) => !dbNames.has(t)),
    [items, inflight, dbNames],
  );
  const names = useQueryStockNames(tickers);
  // 우선순위: DB 종목명 → KIS 폴백 → ticker.
  const nameOf = (ticker: string): string =>
    dbNames.get(ticker) ?? names[ticker] ?? ticker;
  const matchesQuery = (ticker: string, q: string): boolean =>
    ticker.toLowerCase().includes(q) || nameOf(ticker).toLowerCase().includes(q);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? items.filter((it) => matchesQuery(it.ticker, q)) : items;
    // 재분석 중(reanalysis)인 종목을 상단으로 — 진행 상태가 오래된(updated_at) 카드에 묻히지 않게.
    // Array.sort 는 안정 정렬이라 나머지는 BFF 순서(updated_at desc, 최신순) 그대로 유지된다.
    return [...base].sort(
      (a, b) => (b.reanalysis ? 1 : 0) - (a.reanalysis ? 1 : 0),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, names, dbNames, query]);

  const filteredInflight = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inflight;
    return inflight.filter((it) => matchesQuery(it.ticker, q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inflight, names, dbNames, query]);

  if (isLoading) {
    return <ResultsSkeleton />;
  }

  if (isError || !data) {
    // 카드리스 플랫 알림(홈 랭킹·관심종목 에러 정합) — 박스 없이 헤어라인/여백만.
    return (
      <div className="flex flex-col items-start gap-md py-md" role="alert">
        <p className="text-body-sm text-text-muted">{RESULTS_ERROR}</p>
        <button type="button" className="button-secondary" onClick={() => refetch()}>
          {USAGE_RETRY}
        </button>
      </div>
    );
  }

  if (!data.configured) {
    return (
      <StatusBlock title={RESULTS_NOT_CONFIGURED_TITLE} body={RESULTS_NOT_CONFIGURED_BODY} />
    );
  }

  if (items.length === 0 && inflight.length === 0) {
    return <StatusBlock title={RESULTS_EMPTY_TITLE} body={RESULTS_EMPTY_BODY} />;
  }

  return (
    <div className="flex flex-col gap-md">
      {/* 개수 + 새로고침 — 탭 줄 우측 슬롯으로 portal(검색 필터 반영 개수 유지). 모바일은 아이콘만. */}
      {toolbarSlot &&
        createPortal(
          <>
            <span className="text-caption text-text-muted">{resultsCount(filtered.length + filteredInflight.length)}</span>
            {/* 새로고침 — 모바일은 셸 공통 pull-to-refresh 로 대체하고 숨긴다. PC(md+)만 버튼 유지. */}
            <button
              type="button"
              aria-label={USAGE_REFRESH}
              className="hidden md:inline-flex items-center gap-xs text-caption text-text-muted hover:text-text-strong"
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
        <StatusBlock title={RESULTS_SEARCH_EMPTY_TITLE} body={RESULTS_SEARCH_EMPTY_BODY} />
      ) : (
        // 카드 그리드 → 카드리스 플랫 목록(헤어라인 행). 진행중 행이 위, 완료 결과가 아래(최신순).
        <div role="list">
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
              onSelect={(it) => openFor(it.ticker, nameOf(it.ticker))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 미설정·빈·검색없음 — 카드 박스 없이 흰 바탕 + 여백만(관심종목 빈 상태 정합). */
function StatusBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-xs py-2xl text-center" role="status">
      <p className="text-body-strong text-text-strong">{title}</p>
      <p className="text-body-sm text-text-muted">{body}</p>
    </div>
  );
}

/** 로딩 — 플랫 스켈레톤 행(홈 RankSkeleton 정합: 박스 없이 헤어라인 + Skeleton 원자). */
function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label={RESULTS_LOADING}>
      <span className="sr-only">{RESULTS_LOADING}</span>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-md border-b border-border-line py-md last:border-b-0"
          aria-hidden="true"
        >
          <Skeleton variant="line" className="mb-0 h-8 w-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-xs">
            <Skeleton variant="line" className="mb-0 h-4 w-1/3" />
            <Skeleton variant="line" className="mb-0 h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
