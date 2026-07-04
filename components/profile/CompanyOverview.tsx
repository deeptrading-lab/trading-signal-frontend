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
  STOCK_DETAIL_DESCRIPTION_SOURCE_PREFIX,
  STOCK_DETAIL_LOADING,
  STOCK_DETAIL_NOT_FOUND,
} from "@/lib/copy/profile/stockDetail";
import { useQueryDisclosureCompany } from "@/hooks/disclosure/useQueryDisclosureCompany";
import { useQueryStockDescription } from "@/hooks/stock/useQueryStockDescription";
import { useQueryStockPrice } from "@/hooks/stock/useQueryStockPrice";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import type { CompanyProfile } from "@/lib/api/dart/types";

export interface CompanyOverviewProps {
  ticker: string;
  /** 온디맨드(T4) — 카드리스 접힘 행으로 렌더(데스크탑·모바일 공통 기본 접힘). 미지정 시 항상 펼친 카드. */
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

/**
 * 업종 값에서 사람이 읽을 수 있는 이름만 추출.
 *   - "264 - 컴퓨터 및 주변장치 제조업" → "컴퓨터 및 주변장치 제조업" (코드 접두 제거)
 *   - "2612" (순수 코드·이름 없음) → undefined (버림)
 *   - "전기·전자" (이름) → 그대로
 */
function readableIndustry(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  // "코드 - 이름" 형태면 이름 부분만.
  const name = t.match(/^\d[\d.]*\s*[-–—]\s*(.+)$/)?.[1]?.trim() ?? t;
  // 한글/영문이 없는 순수 코드면 버림(예 "2612").
  return /[가-힣A-Za-z]/.test(name) ? name : undefined;
}

/**
 * 업종 라벨 합성 — 큰 업종(KRX 섹터, price.sector "전기·전자") · 상세 업종(company.industry)을
 * " · " 로 병기하되, **순수 숫자 코드(예 "2612")는 버리고 읽을 수 있는 이름만** 남긴다.
 * (사용자 피드백 I-1: 헤더 업종칩 제거 후 기업개황에 DART induty_code 가 코드로만 노출되던 문제.)
 * 둘 중 하나만 있으면 그것만, 동일 문자열이면 중복 제거. 둘 다 없으면 undefined → OverviewRow "-".
 */
function composeIndustry(
  sector: string | undefined,
  industry: string | undefined,
): string | undefined {
  const parts = [readableIndustry(sector), readableIndustry(industry)].filter(
    (p): p is string => Boolean(p),
  );
  const unique = [...new Set(parts)];
  return unique.length > 0 ? unique.join(" · ") : undefined;
}

/** 데이터 패칭 + 본문 — 펼침(또는 비접힘) 시에만 마운트되어 `/api/disclosure/company` 를 호출한다. */
function CompanyOverviewContent({ ticker }: { ticker: string }) {
  const { data, isLoading, isError, error } = useQueryDisclosureCompany(ticker);
  // 큰 업종(섹터)은 이미 화면(StockHeader)이 패칭한 price 쿼리에서 재사용 — 캐시 공유라 추가 KIS 콜 0.
  const { data: price } = useQueryStockPrice(ticker);

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
      <CompanyDescriptionBlock ticker={ticker} />
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
          value={composeIndustry(price?.sector, data.industry)}
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
  );
}

export function CompanyOverview({ ticker, collapsible = false }: CompanyOverviewProps) {
  if (collapsible) {
    return (
      <CollapsibleCard variant="flat" title={STOCK_DETAIL_COMPANY_OVERVIEW_TITLE}>
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

/**
 * 회사 소개(자유 텍스트) 블록 — 기업개황 필드 그리드 위에 한 문단으로 노출.
 *
 * 비핵심 정보 — 로딩/에러/빈 문장이면 **아무것도 렌더하지 않는다**(블록 자체 숨김).
 * 외부 출처(wisereport) 차단/실패 시 BFF 가 빈 배열로 degrade → 자연스럽게 사라진다.
 * 데이터 훅은 펼침 시 마운트되는 `CompanyOverviewContent` 내부라 별도 지연 처리 불필요.
 */
function CompanyDescriptionBlock({ ticker }: { ticker: string }) {
  const { data } = useQueryStockDescription(ticker);
  const sentences = data?.sentences ?? [];
  if (sentences.length === 0) return null;
  return (
    <div className="mb-lg">
      <p className="text-body-md text-text-strong leading-relaxed">
        {sentences.join(" ")}
      </p>
      {data?.source ? (
        <p className="text-caption text-text-muted mt-xs">
          {STOCK_DETAIL_DESCRIPTION_SOURCE_PREFIX}: {data.source}
        </p>
      ) : null}
    </div>
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
