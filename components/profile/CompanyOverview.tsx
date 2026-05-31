/**
 * CompanyOverview — `/stock/[ticker]` 기업개황 (DART).
 *
 * PRD `stock-api-integration` (PR-B) §3.5 — `useQueryDisclosureCompany(ticker)` 호출.
 *
 * 표시 항목 (DART `CompanyProfile`):
 *   - 대표자 (`ceoName`)
 *   - 시장구분 (`market`)
 *   - 설립일 (`establishedDate`)
 *   - 업종 (`industry`)
 *   - 홈페이지 (`homepage`)
 *   - 주소 (`address`)
 *
 * 로딩 / 에러 / 빈 상태 카피 (§3.6).
 *
 * 'use client' — `useQueryDisclosureCompany` 호출 (TanStack Query).
 */

"use client";

import {
  COMPANY_LABEL_ADDRESS,
  COMPANY_LABEL_CEO,
  COMPANY_LABEL_ESTABLISHED,
  COMPANY_LABEL_HOMEPAGE,
  COMPANY_LABEL_INDUSTRY,
  COMPANY_LABEL_MARKET,
  MARKET_LABEL_KONEX,
  MARKET_LABEL_KOSDAQ,
  MARKET_LABEL_KOSPI,
  MARKET_LABEL_OTHER,
  STOCK_DETAIL_COMPANY_OVERVIEW_TITLE,
  STOCK_DETAIL_LOADING,
  STOCK_DETAIL_NOT_FOUND,
} from "@/lib/copy/profile/stockDetail";
import { useQueryDisclosureCompany } from "@/hooks/disclosure/useQueryDisclosureCompany";
import type { CompanyProfile } from "@/lib/api/dart/types";

export interface CompanyOverviewProps {
  ticker: string;
}

function marketLabel(market: CompanyProfile["market"]): string {
  switch (market) {
    case "KOSPI":
      return MARKET_LABEL_KOSPI;
    case "KOSDAQ":
      return MARKET_LABEL_KOSDAQ;
    case "KONEX":
      return MARKET_LABEL_KONEX;
    default:
      return MARKET_LABEL_OTHER;
  }
}

export function CompanyOverview({ ticker }: CompanyOverviewProps) {
  const { data, isLoading, isError, error } = useQueryDisclosureCompany(ticker);

  return (
    <section className="card" aria-label={STOCK_DETAIL_COMPANY_OVERVIEW_TITLE}>
      <header className="mb-md">
        <h2 className="text-h2 text-text-strong">
          {STOCK_DETAIL_COMPANY_OVERVIEW_TITLE}
        </h2>
      </header>

      {isLoading ? (
        <p className="text-body-md text-text-muted" aria-busy="true">
          {STOCK_DETAIL_LOADING}
        </p>
      ) : isError ? (
        <div className="card-critical" role="alert">
          <p className="text-body-strong">
            {error?.message ?? STOCK_DETAIL_NOT_FOUND}
          </p>
        </div>
      ) : !data ? (
        <p className="text-body-md text-text-muted">{STOCK_DETAIL_NOT_FOUND}</p>
      ) : (
        <>
          <h3 className="text-h2 text-text-strong mb-md">{data.corpName}</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <OverviewRow label={COMPANY_LABEL_CEO} value={data.ceoName} />
            <OverviewRow
              label={COMPANY_LABEL_MARKET}
              value={marketLabel(data.market)}
            />
            <OverviewRow
              label={COMPANY_LABEL_ESTABLISHED}
              value={data.establishedDate}
            />
            <OverviewRow
              label={COMPANY_LABEL_INDUSTRY}
              value={data.industry}
            />
            <OverviewRow
              label={COMPANY_LABEL_HOMEPAGE}
              value={
                data.homepage ? (
                  <a
                    href={data.homepage}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-accent-vivid hover:underline break-all"
                  >
                    {data.homepage}
                  </a>
                ) : undefined
              }
            />
            <OverviewRow label={COMPANY_LABEL_ADDRESS} value={data.address} />
          </dl>
        </>
      )}
    </section>
  );
}

function OverviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="text-body-md text-text-strong">{value ?? "-"}</dd>
    </div>
  );
}
