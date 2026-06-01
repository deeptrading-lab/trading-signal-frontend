/**
 * StockInvestorTrend — 종목 상세 "수급 (개인·외국인·기관)" 섹션(표면 B).
 *
 * PRD `investor-flow` §4.B / DESIGN.md §Layout(표면 B) · §Components(수급 표).
 *
 * 데이터: `useQueryStockInvestors(ticker)`(도메인 훅) 소비. 응답은 화면 친화 `StockInvestorTrend`.
 * 구조(상→하):
 *   ① 섹션 제목 "수급 (개인·외국인·기관)" + "최근 N일" 라벨(누적 오인 방지, AC-9)
 *   ② 주체별 최근 N일 순매수 합계 3칸(개인/외국인/기관, 부호색) — **항상 노출**
 *   ③ 일자별 표(최근 N일; 모바일 가로 스크롤, min-w-[520px]) — **토글**(`tableDefaultOpen`)
 *
 * 합계 요약은 진입 즉시 보이고(쿼리 항상 실행) 일자별 표만 펼침/접힘한다 — 모바일 기본 접힘,
 * 데스크탑 기본 펼침(`tableDefaultOpen`). 색은 부호로 결정 — 순매수 빨강(signal-up)/순매도 파랑(signal-down).
 */

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
  STOCK_INVESTORS_RETRY,
  STOCK_INVESTORS_TABLE_HIDE,
  STOCK_INVESTORS_TABLE_SHOW,
  STOCK_INVESTORS_TITLE,
  recentDaysLabel,
} from "@/lib/copy/stock/investors";

/** 화면 노출 일수 절단(과밀 방지, DESIGN R4). API 가 더 주면 보관만. */
const VISIBLE_DAYS = 15;

/** 순매수 부호 → 금액 텍스트 색 토큰(전부 합성 클래스 — cn 사이즈 override 시 색 보존). */
function amountClass(value: number): string {
  if (value > 0) return "netbuy-amount-up";
  if (value < 0) return "netbuy-amount-down";
  return "netbuy-amount-flat";
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
      {/* 금액 = 카드 hero. netbuy-amount-* 합성 클래스(색) + text-body-strong(16px) — 색 보존 + 사이즈 상향. */}
      <span className={cn(amountClass(amount), "text-body-strong")}>
        {formatNetBuyAmount(amount)}
      </span>
      <span className="netbuy-qty">{formatNetBuyQty(qty)}</span>
    </div>
  );
}

/** 표 안 주체 셀 — 금액 + 수량(보조). 컬럼 폭 여유(min-w) + 줄바꿈 방지(nowrap). */
function FlowAmountCell({ amount, qty }: { amount: number; qty: number }) {
  return (
    <td className="flow-table-row text-right min-w-[5.5rem]">
      <div className="flex flex-col items-end">
        <span
          className={cn(
            amountClass(amount),
            "text-body-sm-strong whitespace-nowrap",
          )}
        >
          {formatNetBuyAmount(amount)}
        </span>
        <span className="netbuy-qty whitespace-nowrap">
          {formatNetBuyQty(qty)}
        </span>
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

function StockInvestorTrendContent({
  ticker,
  tableDefaultOpen,
}: {
  ticker: string;
  tableDefaultOpen: boolean;
}) {
  const { data, isLoading, isError, refetch } = useQueryStockInvestors(ticker);
  const [tableOpen, setTableOpen] = useState(tableDefaultOpen);

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
        <p className="text-body-sm mb-md">{STOCK_INVESTORS_ERROR}</p>
        <button
          type="button"
          className="button-secondary"
          onClick={() => refetch()}
        >
          {STOCK_INVESTORS_RETRY}
        </button>
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

      {/* 일자별 표 토글 — 합계 3칸은 항상 노출, 표만 펼침(모바일 기본 접힘) */}
      <button
        type="button"
        className="self-start flex items-center gap-xs h-button-sm-h px-sm rounded-sm text-button-sm text-primary hover:bg-accent-soft"
        aria-expanded={tableOpen}
        onClick={() => setTableOpen((v) => !v)}
      >
        {tableOpen ? STOCK_INVESTORS_TABLE_HIDE : STOCK_INVESTORS_TABLE_SHOW}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", tableOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {/* 일자별 표 — 컬럼 순서: 일자·개인·외국인·기관·종가. 수급(3주체)이 핵심이라 일자 다음에
       *   바로 오게 하고 종가는 맨 뒤(차트에 이미 있어 부차적). 모바일에선 종가만 가로 스크롤로 밀려난다.
       *   일자는 년도 제거(`05-28`)로 폭 절약. */}
      {tableOpen && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] border-collapse">
          <thead>
            <tr>
              <th className="flow-table-header text-left">
                {STOCK_INVESTORS_COL_DATE}
              </th>
              <th className="flow-table-header text-center">
                {STOCK_INVESTORS_COL_PERSON}
              </th>
              <th className="flow-table-header text-center">
                {STOCK_INVESTORS_COL_FOREIGN}
              </th>
              <th className="flow-table-header text-center">
                {STOCK_INVESTORS_COL_ORG}
              </th>
              <th className="flow-table-header text-center">
                {STOCK_INVESTORS_COL_CLOSE}
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr
                key={d.date}
                className="border-b border-border-line last:border-b-0"
              >
                <td className="flow-date-cell whitespace-nowrap">
                  {d.date.slice(5)}
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
                <td
                  className={cn(
                    "flow-table-row text-right whitespace-nowrap",
                    closeClass(d.changeSign),
                  )}
                >
                  {formatNumber(d.close)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

export interface StockInvestorTrendProps {
  ticker: string;
  /**
   * 일자별 표 기본 펼침 — 데스크탑 true / 모바일 false 권장. 합계 요약 3칸은 항상 노출되고
   * 표만 토글한다(쿼리는 합계 표시를 위해 항상 실행).
   */
  tableDefaultOpen?: boolean;
}

export function StockInvestorTrend({
  ticker,
  tableDefaultOpen = true,
}: StockInvestorTrendProps) {
  return (
    <section className="card" aria-label={STOCK_INVESTORS_TITLE}>
      <header className="mb-md">
        <h2 className="text-h2 text-text-strong">{STOCK_INVESTORS_TITLE}</h2>
      </header>
      <StockInvestorTrendContent
        ticker={ticker}
        tableDefaultOpen={tableDefaultOpen}
      />
    </section>
  );
}
