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
  /** 모바일 — 접기/펼치기 카드로 렌더(기본 접힘). 미지정 시 기존 항상 펼친 카드. */
  collapsible?: boolean;
}

export function DisclosureList({
  ticker,
  count = 5,
  collapsible = false,
}: DisclosureListProps) {
  const { data, isLoading, isError, error } = useQueryDisclosureList(
    ticker,
    count,
  );

  const body = isLoading ? (
    <p className="text-body-md text-text-muted" aria-busy="true">
      {STOCK_DETAIL_LOADING}
    </p>
  ) : isError ? (
    <div className="card-critical" role="alert">
      <p className="text-body-strong">
        {error?.message ?? STOCK_DETAIL_NOT_FOUND}
      </p>
    </div>
  ) : !data || data.length === 0 ? (
    <p className="text-body-md text-text-muted">{DISCLOSURE_LIST_EMPTY}</p>
  ) : (
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

  if (collapsible) {
    return (
      <CollapsibleCard title={STOCK_DETAIL_DISCLOSURE_LIST_TITLE}>
        {body}
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
      {body}
    </section>
  );
}
