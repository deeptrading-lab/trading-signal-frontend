/**
 * StockInvestorTrend — 종목 상세 "수급 (개인·외국인·기관)" 섹션(표면 B).
 *
 * PRD `investor-flow` §4.B / DESIGN.md §Layout(표면 B) · §Components(수급 표).
 *
 * 데이터: `useQueryStockInvestors(ticker)`(도메인 훅) 소비. 응답은 화면 친화 `StockInvestorTrend`.
 * 구조(상→하):
 *   ① 섹션 제목 "수급 (개인·외국인·기관)" + "최근 N일" 라벨(누적 오인 방지, AC-9)
 *   ② 주체별 최근 N일 순매수 합계 3칸(개인/외국인/기관, 부호색)
 *   ③ 일자별 표(최근 N일; 모바일 가로 스크롤, min-w-[520px])
 *
 * collapsible 패턴 의무(CompanyOverview/DisclosureList #79 정합): 데이터 훅을 `*Content` 로
 * 분리해 접힘 시 미마운트(쿼리 미실행). 색은 부호로 결정 — 순매수 빨강(signal-up)/순매도 파랑(signal-down).
 */

"use client";

import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { useQueryStockInvestors } from "@/hooks/stock/useQueryStockInvestors";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatNetBuyAmount, formatNetBuyQty } from "@/lib/utils/formatNetBuy";
import type { StockInvestorDay } from "@/lib/types/stock/investors";
import {
  STOCK_INVESTORS_COL_CLOSE,
  STOCK_INVESTORS_COL_DATE,
  STOCK_INVESTORS_COL_FOREIGN,
  STOCK_INVESTORS_COL_ORG,
  STOCK_INVESTORS_COL_PERSON,
  STOCK_INVESTORS_EMPTY,
  STOCK_INVESTORS_ERROR,
  STOCK_INVESTORS_FOREIGN_LABEL,
  STOCK_INVESTORS_LOADING,
  STOCK_INVESTORS_ORG_LABEL,
  STOCK_INVESTORS_PERSON_LABEL,
  STOCK_INVESTORS_TITLE,
  recentDaysLabel,
} from "@/lib/copy/stock/investors";

/** 화면 노출 일수 절단(과밀 방지, DESIGN R4). API 가 더 주면 보관만. */
const VISIBLE_DAYS = 15;

/** 순매수 부호 → 금액 텍스트 색 토큰. */
function amountClass(value: number): string {
  if (value > 0) return "netbuy-amount-up";
  if (value < 0) return "netbuy-amount-down";
  return "text-text-muted text-table-cell-numeric tabular-nums";
}

/** 종가 전일대비 부호("1"/"2" 상승, "4"/"5" 하락) → 색. */
function closeClass(sign: string): string {
  if (sign === "1" || sign === "2") return "text-signal-up";
  if (sign === "4" || sign === "5") return "text-signal-down";
  return "text-text-muted";
}

/** 합계 칸(부호색 + 수량 보조). */
function SummaryCell({
  label,
  amount,
  qty,
}: {
  label: string;
  amount: number;
  qty: number;
}) {
  return (
    <div className="flow-summary-cell flex flex-col gap-xs">
      <span className="flow-summary-label">{label}</span>
      <span className={cn("text-body-strong", amountClass(amount))}>
        {formatNetBuyAmount(amount)}
      </span>
      <span className="netbuy-qty">{formatNetBuyQty(qty)}</span>
    </div>
  );
}

/** 표 안 주체 셀 — 금액(주) + 수량(보조). */
function FlowAmountCell({ amount, qty }: { amount: number; qty: number }) {
  return (
    <td className="flow-table-row text-right">
      <div className="flex flex-col items-end">
        <span className={amountClass(amount)}>{formatNetBuyAmount(amount)}</span>
        <span className="netbuy-qty">{formatNetBuyQty(qty)}</span>
      </div>
    </td>
  );
}

function sumBy(
  days: StockInvestorDay[],
  pick: (d: StockInvestorDay) => number,
): number {
  return days.reduce((acc, d) => acc + (Number.isFinite(pick(d)) ? pick(d) : 0), 0);
}

function StockInvestorTrendContent({ ticker }: { ticker: string }) {
  const { data, isLoading, isError } = useQueryStockInvestors(ticker);

  if (isLoading) {
    return (
      <p className="text-body-sm text-text-muted" aria-busy="true">
        {STOCK_INVESTORS_LOADING}
      </p>
    );
  }
  if (isError) {
    return (
      <div className="card-critical" role="alert">
        <p className="text-body-sm">{STOCK_INVESTORS_ERROR}</p>
      </div>
    );
  }
  if (!data || data.days.length === 0) {
    return <p className="text-body-sm text-text-muted">{STOCK_INVESTORS_EMPTY}</p>;
  }

  const days = data.days.slice(0, VISIBLE_DAYS);

  const personAmt = sumBy(days, (d) => d.personNetBuyAmount);
  const personQty = sumBy(days, (d) => d.personNetBuyQty);
  const foreignAmt = sumBy(days, (d) => d.foreignNetBuyAmount);
  const foreignQty = sumBy(days, (d) => d.foreignNetBuyQty);
  const orgAmt = sumBy(days, (d) => d.orgNetBuyAmount);
  const orgQty = sumBy(days, (d) => d.orgNetBuyQty);

  return (
    <div className="flex flex-col gap-md">
      <p className="text-caption text-text-muted">{recentDaysLabel(days.length)}</p>

      {/* 주체별 합계 요약 3칸 */}
      <div className="grid grid-cols-3 gap-md">
        <SummaryCell
          label={STOCK_INVESTORS_PERSON_LABEL}
          amount={personAmt}
          qty={personQty}
        />
        <SummaryCell
          label={STOCK_INVESTORS_FOREIGN_LABEL}
          amount={foreignAmt}
          qty={foreignQty}
        />
        <SummaryCell
          label={STOCK_INVESTORS_ORG_LABEL}
          amount={orgAmt}
          qty={orgQty}
        />
      </div>

      {/* 일자별 표 — 모바일 가로 스크롤(컬럼 압축 금지) */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <th className="flow-table-header text-left">
                {STOCK_INVESTORS_COL_DATE}
              </th>
              <th className="flow-table-header text-right">
                {STOCK_INVESTORS_COL_CLOSE}
              </th>
              <th className="flow-table-header text-right">
                {STOCK_INVESTORS_COL_PERSON}
              </th>
              <th className="flow-table-header text-right">
                {STOCK_INVESTORS_COL_FOREIGN}
              </th>
              <th className="flow-table-header text-right">
                {STOCK_INVESTORS_COL_ORG}
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr
                key={d.date}
                className="border-b border-border-line last:border-b-0"
              >
                <td className="flow-date-cell whitespace-nowrap">{d.date}</td>
                <td
                  className={cn(
                    "flow-table-row text-right whitespace-nowrap",
                    closeClass(d.changeSign),
                  )}
                >
                  {formatNumber(d.close)}
                </td>
                <FlowAmountCell
                  amount={d.personNetBuyAmount}
                  qty={d.personNetBuyQty}
                />
                <FlowAmountCell
                  amount={d.foreignNetBuyAmount}
                  qty={d.foreignNetBuyQty}
                />
                <FlowAmountCell amount={d.orgNetBuyAmount} qty={d.orgNetBuyQty} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface StockInvestorTrendProps {
  ticker: string;
  /** 접기/펼치기 카드로 렌더(접힘 시 미마운트=쿼리 미실행). 미지정 시 항상 펼친 카드. */
  collapsible?: boolean;
}

export function StockInvestorTrend({
  ticker,
  collapsible = false,
}: StockInvestorTrendProps) {
  if (collapsible) {
    return (
      <CollapsibleCard title={STOCK_INVESTORS_TITLE}>
        <StockInvestorTrendContent ticker={ticker} />
      </CollapsibleCard>
    );
  }

  return (
    <section className="card" aria-label={STOCK_INVESTORS_TITLE}>
      <header className="mb-md">
        <h2 className="text-h2 text-text-strong">{STOCK_INVESTORS_TITLE}</h2>
      </header>
      <StockInvestorTrendContent ticker={ticker} />
    </section>
  );
}
