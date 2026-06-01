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
 *
 * 지연 패칭 (api-optimization-roadmap P1): 데이터 훅을 `CompanyOverviewContent` 로 분리해
 * `collapsible` 접힘 시에는 마운트되지 않게 한다 → 모바일 종목상세 진입 시 펼치기 전까지
 * `/api/disclosure/company` 를 호출하지 않는다. 데스크탑(`collapsible=false`)은 즉시 패칭(기존).
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
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import type { CompanyProfile } from "@/lib/api/dart/types";

export interface CompanyOverviewProps {
  ticker: string;
  /** 모바일 — 접기/펼치기 카드로 렌더(기본 접힘). 미지정 시 기존 항상 펼친 카드. */
  collapsible?: boolean;
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

/** 데이터 패칭 + 본문 — 펼침(또는 비접힘) 시에만 마운트되어 `/api/disclosure/company` 를 호출한다. */
function CompanyOverviewContent({ ticker }: { ticker: string }) {
  const { data, isLoading, isError, error } = useQueryDisclosureCompany(ticker);

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
  if (!data) {
    return <p className="text-body-md text-text-muted">{STOCK_DETAIL_NOT_FOUND}</p>;
  }
  return (
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
        <OverviewRow label={COMPANY_LABEL_INDUSTRY} value={data.industry} />
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
  );
}

export function CompanyOverview({ ticker, collapsible = false }: CompanyOverviewProps) {
  if (collapsible) {
    return (
      <CollapsibleCard title={STOCK_DETAIL_COMPANY_OVERVIEW_TITLE}>
        <CompanyOverviewContent ticker={ticker} />
      </CollapsibleCard>
    );
  }

  return (
    <section className="card" aria-label={STOCK_DETAIL_COMPANY_OVERVIEW_TITLE}>
      <header className="mb-md">
        <h2 className="text-h2 text-text-strong">
          {STOCK_DETAIL_COMPANY_OVERVIEW_TITLE}
        </h2>
      </header>
      <CompanyOverviewContent ticker={ticker} />
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
