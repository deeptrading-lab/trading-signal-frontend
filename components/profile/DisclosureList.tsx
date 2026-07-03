/**
 * DisclosureList — `/stock/[ticker]` 최근 공시 5건 (DART).
 *
 * PRD `stock-api-integration` (PR-B) §3.5 — `useQueryDisclosureList(ticker, 5)` 호출.
 *
 * 표시:
 *   - 보고서명 (`reportName`)
 *   - 접수일자 (`rceptDate`, YYYY-MM-DD)
 *   - rceptNo 클릭 시 DART 공시 원문 (DART 표준 URL) — 후속 PR 자연 확장.
 *
 * 로딩 / 에러 / 빈 상태 카피 (§3.6).
 *
 * 지연 패칭 (api-optimization-roadmap P1): 데이터 훅을 `DisclosureListContent` 로 분리해
 * `collapsible` 접힘 시에는 컨텐츠가 마운트되지 않게 한다(`CollapsibleCard` 가 `{open && children}`).
 * → 모바일 종목상세 진입 시 접힌 카드는 펼치기 전까지 `/api/disclosure/list` 를 호출하지 않는다.
 * 데스크탑(`collapsible=false`)은 컨텐츠를 항상 렌더 → 기존대로 즉시 패칭.
 */

"use client";

import { useQueryDisclosureList } from "@/hooks/disclosure/useQueryDisclosureList";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import {
  DISCLOSURE_LIST_COL_DATE,
  DISCLOSURE_LIST_COL_REPORT,
  DISCLOSURE_LIST_EMPTY,
  STOCK_DETAIL_DISCLOSURE_LIST_TITLE,
  STOCK_DETAIL_LOADING,
  STOCK_DETAIL_NOT_FOUND,
} from "@/lib/copy/profile/stockDetail";

export interface DisclosureListProps {
  ticker: string;
  count?: number;
  /** 온디맨드(T4) — 카드리스 접힘 행으로 렌더(데스크탑·모바일 공통 기본 접힘). 미지정 시 항상 펼친 카드. */
  collapsible?: boolean;
}

/** 데이터 패칭 + 본문 — 펼침(또는 비접힘) 시에만 마운트되어 `/api/disclosure/list` 를 호출한다. */
function DisclosureListContent({
  ticker,
  count,
}: {
  ticker: string;
  count: number;
}) {
  const { data, isLoading, isError, error } = useQueryDisclosureList(
    ticker,
    count,
  );

  if (isLoading) {
    return (
      <p className="text-body-md text-text-muted" aria-busy="true">
        {STOCK_DETAIL_LOADING}
      </p>
    );
  }
  if (isError) {
    return (
      <div className="card-critical" role="alert">
        <p className="text-body-strong">
          {error?.message ?? STOCK_DETAIL_NOT_FOUND}
        </p>
      </div>
    );
  }
  if (!data || data.length === 0) {
    return <p className="text-body-md text-text-muted">{DISCLOSURE_LIST_EMPTY}</p>;
  }
  return (
    <ul className="flex flex-col">
      {data.map((item, idx) => (
        <li
          key={item.rceptNo}
          className={
            idx === data.length - 1
              ? "flex justify-between items-center py-sm gap-md"
              : "flex justify-between items-center py-sm gap-md border-b border-border-line"
          }
        >
          <div className="flex flex-col gap-xs min-w-0">
            <span className="text-caption text-text-muted">
              {DISCLOSURE_LIST_COL_REPORT}
            </span>
            <span className="text-body-md text-text-strong truncate">
              {item.reportName}
            </span>
          </div>
          <div className="flex flex-col gap-xs items-end flex-shrink-0">
            <span className="text-caption text-text-muted">
              {DISCLOSURE_LIST_COL_DATE}
            </span>
            <span className="text-body-md text-text-strong tabular-nums">
              {item.rceptDate}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DisclosureList({
  ticker,
  count = 5,
  collapsible = false,
}: DisclosureListProps) {
  if (collapsible) {
    return (
      <CollapsibleCard variant="flat" title={STOCK_DETAIL_DISCLOSURE_LIST_TITLE}>
        <DisclosureListContent ticker={ticker} count={count} />
      </CollapsibleCard>
    );
  }

  return (
    <section className="card" aria-label={STOCK_DETAIL_DISCLOSURE_LIST_TITLE}>
      <header className="mb-md">
        <h2 className="text-h2 text-text-strong">
          {STOCK_DETAIL_DISCLOSURE_LIST_TITLE}
        </h2>
      </header>
      <DisclosureListContent ticker={ticker} count={count} />
    </section>
  );
}
