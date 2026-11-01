/**
 * SwingScreenerContainer — `/swing` 스크리너 목록의 client 데이터 경계(PRD `swing-judgment` PR-3).
 *
 * 탭(수급 조건 충족 · 주의 종목 · 전체) × 시장(전체 · KOSPI · KOSDAQ)은 URL 쿼리가 단일 출처
 * (`swingTab.ts`) — 종목 상세에 갔다 뒤로 와도 보던 탭이 유지된다. useSearchParams 를 쓰므로
 * 호출부(page.tsx)가 Suspense 로 감싼다.
 */

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SegmentedTabs } from "@/components/analyze/SegmentedTabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuerySwingScreener } from "@/hooks/swing/useQuerySwingScreener";
import { cn } from "@/lib/utils/cn";
import type { SwingScreenerFilter, SwingScreenerResponse } from "@/lib/types/swing/api";
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
} from "@/lib/copy/swing/labels";
import { SwingScreenerRow } from "./SwingScreenerRow";
import { swingFilterFromParam, swingMarketFromParam, swingTabHref } from "./swingTab";

const FILTER_OPTIONS = (["flow", "excluded", "all"] as const).map((key) => ({ key, label: SWING_TAB_LABEL[key] }));
type MarketKey = "ALL" | "KOSPI" | "KOSDAQ";
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
  const query = useQuerySwingScreener(filter, market);
  const data = query.data;

  // scroll:false — 탭 전환 시 스크롤 점프 방지(같은 라우트 쿼리만 교체).
  const go = (f: SwingScreenerFilter, m: MarketKey) =>
    router.replace(swingTabHref(pathname, f, m === "ALL" ? null : m), { scroll: false });

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        {data?.tradeDate ? (
          <p className="text-body-sm-strong text-text-strong">{swingBasisLabel(data.tradeDate)}</p>
        ) : null}
        <p className="text-caption text-text-muted">{SWING_PAGE_SUBTITLE}</p>
        {data?.run && !data.run.ok ? <p className="text-caption text-warn">{SWING_RUN_PARTIAL}</p> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-md">
        <SegmentedTabs options={FILTER_OPTIONS} value={filter} onChange={(f) => go(f, market ?? "ALL")} ariaLabel={SWING_TABS_ARIA} />
        <SegmentedTabs options={MARKET_OPTIONS} value={market ?? "ALL"} onChange={(m) => go(filter, m)} ariaLabel={SWING_MARKET_ARIA} />
      </div>

      <ScreenerBody
        filter={filter}
        data={data}
        isLoading={query.isLoading}
        isError={query.isError}
        isStale={query.isPlaceholderData}
        onRetry={() => query.refetch()}
      />

      <p className="text-caption text-text-muted">{SWING_DISCLAIMER}</p>
    </div>
  );
}

function ScreenerBody({
  filter,
  data,
  isLoading,
  isError,
  isStale,
  onRetry,
}: {
  filter: SwingScreenerFilter;
  data: SwingScreenerResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  isStale: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div aria-busy="true" className="flex flex-col gap-lg py-md">
        <span className="sr-only">{SWING_LOADING}</span>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="line" />
        ))}
      </div>
    );
  }
  if (isError || !data) {
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
      <p className="text-caption text-text-muted">{swingCountLabel(data.items.length)}</p>
      <ul aria-label={SWING_TAB_LABEL[filter]}>
        {data.items.map((item) => (
          <SwingScreenerRow key={item.ticker} item={item} />
        ))}
      </ul>
    </div>
  );
}
