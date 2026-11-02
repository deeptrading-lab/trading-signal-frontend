/**
 * SwingScreenerContainer — `/swing` 스크리너 목록의 client 데이터 경계(PRD `swing-judgment` PR-3).
 *
 * 탭(수급 조건 충족 · 주의 종목 · 전체) × 시장(전체 · KOSPI · KOSDAQ)은 URL 쿼리가 단일 출처
 * (`swingTab.ts`) — 종목 상세에 갔다 뒤로 와도 보던 탭이 유지된다. useSearchParams 를 쓰므로
 * 호출부(page.tsx)가 Suspense 로 감싼다.
 */

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuerySwingScreener } from "@/hooks/swing/useQuerySwingScreener";
import type { SwingMarket } from "@/lib/swing/rulebook";
import { cn } from "@/lib/utils/cn";
import type { SwingScreenerFilter, SwingScreenerResponse, SwingScreenerSort } from "@/lib/types/swing/api";
import {
  SWING_DISCLAIMER,
  SWING_EMPTY,
  SWING_FLOW_HINT,
  SWING_LOADING,
  SWING_MARKET_ALL,
  SWING_MARKET_ARIA,
  SWING_NOT_RUN,
  SWING_PAGE_SUBTITLE,
  SWING_RETRY,
  SWING_RUN_PARTIAL,
  SWING_STATE_ERROR,
  SWING_TAB_LABEL,
  SWING_TABS_ARIA,
  swingBasisLabel,
  swingCountLabel,
  SWING_SORT_ARIA,
  SWING_SORT_LABEL,
  swingSummaryLabel,
  SWING_SUMMARY_VOLATILE,
} from "@/lib/copy/swing/labels";
import { SwingScreenerTable } from "./SwingScreenerTable";
import { swingFilterFromParam, swingMarketFromParam, swingSortFromParam, swingTabHref } from "./swingTab";

const SORT_OPTIONS = (["adv", "met"] as const).map((key) => ({ key, label: SWING_SORT_LABEL[key] }));

const FILTER_OPTIONS = (["flow", "excluded", "all"] as const).map((key) => ({ key, label: SWING_TAB_LABEL[key] }));
type MarketKey = "ALL" | SwingMarket;
const MARKET_OPTIONS: ReadonlyArray<{ key: MarketKey; label: string }> = [
  { key: "ALL", label: SWING_MARKET_ALL },
  { key: "KOSPI", label: "KOSPI" },
  { key: "KOSDAQ", label: "KOSDAQ" },
];

export function SwingScreenerContainer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = swingFilterFromParam(searchParams.get("tab"));
  const market = swingMarketFromParam(searchParams.get("market"));
  const sort = swingSortFromParam(searchParams.get("sort"));
  const query = useQuerySwingScreener(filter, market, sort);
  const data = query.data;

  // scroll:false — 탭 전환 시 스크롤 점프 방지(같은 라우트 쿼리만 교체).
  const go = (f: SwingScreenerFilter, m: MarketKey, s: SwingScreenerSort = sort) =>
    router.replace(swingTabHref(pathname, f, m === "ALL" ? null : m, s), { scroll: false });

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        {data?.tradeDate ? (
          <p className="text-body-sm-strong text-text-strong">{swingBasisLabel(data.tradeDate)}</p>
        ) : null}
        {data?.counts ? (
          <p className="text-body-sm text-text-strong">
            {swingSummaryLabel(data.counts)}
            {data.counts.all > 0 && data.counts.excluded / data.counts.all >= 0.6 ? (
              <span className="text-text-muted"> — {SWING_SUMMARY_VOLATILE}</span>
            ) : null}
          </p>
        ) : null}
        <p className="text-caption text-text-muted">{SWING_PAGE_SUBTITLE}</p>
        {/* 보이는 거래일의 집계가 끝까지(ok) 돌았다는 마커가 없으면 목록이 일부일 수 있다(집계 중·실패). */}
        {data?.tradeDate && (!data.run?.ok || data.run.tradeDate !== data.tradeDate) ? (
          <p className="text-caption text-warn">{SWING_RUN_PARTIAL}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-md">
        <SegmentedTabs options={FILTER_OPTIONS} value={filter} onChange={(f) => go(f, market ?? "ALL")} ariaLabel={SWING_TABS_ARIA} />
        <SegmentedTabs options={MARKET_OPTIONS} value={market ?? "ALL"} onChange={(m) => go(filter, m)} ariaLabel={SWING_MARKET_ARIA} />
      </div>

      <ScreenerBody
        filter={filter}
        sort={sort}
        onSort={(s) => go(filter, market ?? "ALL", s)}
        data={data}
        isLoading={query.isLoading}
        isStale={query.isPlaceholderData}
        onRetry={() => query.refetch()}
      />

      <p className="text-caption text-text-muted">{SWING_DISCLAIMER}</p>
    </div>
  );
}

function ScreenerBody({
  filter,
  sort,
  onSort,
  data,
  isLoading,
  isStale,
  onRetry,
}: {
  filter: SwingScreenerFilter;
  sort: SwingScreenerSort;
  onSort: (s: SwingScreenerSort) => void;
  data: SwingScreenerResponse | undefined;
  isLoading: boolean;
  isStale: boolean;
  onRetry: () => void;
}) {
  // 탭 전환 중 이전 탭이 빈 목록이면(placeholder) 새 탭의 "없어요" 문구가 잘못 보이므로 스켈레톤.
  if (isLoading || (isStale && data?.items.length === 0)) {
    return (
      <div aria-busy="true" className="flex flex-col gap-lg py-md">
        <span className="sr-only">{SWING_LOADING}</span>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="line" />
        ))}
      </div>
    );
  }
  // 백그라운드 재요청이 실패해도 이미 받은 목록이 있으면 그대로 보여 준다.
  if (!data) {
    return (
      <div className="flex flex-col items-start gap-md py-md" role="alert">
        <p className="text-body-sm text-text-muted">{SWING_STATE_ERROR}</p>
        <button type="button" className="button-secondary" onClick={onRetry}>
          {SWING_RETRY}
        </button>
      </div>
    );
  }
  if (data.tradeDate === null) {
    return <p className="py-md text-body-sm text-text-muted">{SWING_NOT_RUN}</p>;
  }
  if (data.items.length === 0) {
    return (
      <div className="flex flex-col gap-xs py-md">
        <p className="text-body-sm text-text-muted">{SWING_EMPTY[filter]}</p>
        {filter === "flow" ? <p className="text-caption text-text-muted">{SWING_FLOW_HINT}</p> : null}
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col gap-xs transition-opacity", isStale && "opacity-60")} aria-busy={isStale}>
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <p className="text-caption text-text-muted">{swingCountLabel(data.items.length)}</p>
        <SegmentedTabs options={SORT_OPTIONS} value={sort} onChange={onSort} ariaLabel={SWING_SORT_ARIA} />
      </div>
      <SwingScreenerTable items={data.items} showReasons={filter !== "flow"} />
    </div>
  );
}
