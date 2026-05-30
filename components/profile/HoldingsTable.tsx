/**
 * HoldingsTable — `/profile` "내 자산" 보유종목 전체 테이블.
 *
 * home-market-redesign PR1 — `/dashboard` 의 HoldingsTop3(요약) → **전체 테이블**(PRD AC-2).
 *   - 4열: 종목명 / 평가액 / 수익률 / 비중. 헤더 클릭 정렬(↕, `aria-sort`).
 *   - 수익률 컬럼만 등락색(signal-up/down). 평가액·비중은 text-strong.
 *   - 비중은 평가액 / 총평가액 으로 산출(자산 분류축 — 등락색 미사용).
 *   - 거래성 컬럼(예수금/주문가능/실현손익/입출금) 0 — 조회·분석 전용 스코프(AC-9).
 *
 * 정렬 상태(useState)가 필요해 client component.
 * 모바일 폴백(R6): 좁은 화면에서 가로 스크롤 허용(`overflow-x-auto`) — 정렬 가능 테이블 의미 유지.
 *
 * 토큰: `card` 셸 + `holdings-table-*` 합성 토큰(app/components.css). hex/px 직타 0.
 */

"use client";

import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import type { Holding } from "@/lib/types/profile/holdings";
import {
  HOLDINGS_TABLE_TITLE,
  HOLDINGS_COL_NAME,
  HOLDINGS_COL_AMOUNT,
  HOLDINGS_COL_CHANGE,
  HOLDINGS_COL_WEIGHT,
  HOLDINGS_EMPTY,
} from "@/lib/copy/profile/labels";

export interface HoldingsTableProps {
  holdings: Holding[];
}

type SortKey = "name" | "amount" | "change" | "weight";
type SortDir = "asc" | "desc";

interface HoldingRow extends Holding {
  /** 비중(백분율) — amountKrw / 총평가액. */
  weightPct: number;
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("amount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo<HoldingRow[]>(() => {
    const total = holdings.reduce((sum, h) => sum + h.amountKrw, 0);
    const withWeight: HoldingRow[] = holdings.map((h) => ({
      ...h,
      weightPct: total > 0 ? (h.amountKrw / total) * 100 : 0,
    }));
    const sorted = [...withWeight].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name, "ko");
          break;
        case "amount":
          cmp = a.amountKrw - b.amountKrw;
          break;
        case "change":
          cmp = a.changePct - b.changePct;
          break;
        case "weight":
          cmp = a.weightPct - b.weightPct;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [holdings, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function ariaSort(key: SortKey): "ascending" | "descending" | "none" {
    if (key !== sortKey) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  }

  return (
    <section className="card" aria-label={HOLDINGS_TABLE_TITLE}>
      <h2 className="mb-lg text-h2 text-text-strong">{HOLDINGS_TABLE_TITLE}</h2>

      {rows.length === 0 ? (
        <p className="text-body-sm text-text-muted">{HOLDINGS_EMPTY}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="holdings-table-header border-b border-border-line">
                <HeaderCell
                  label={HOLDINGS_COL_NAME}
                  active={sortKey === "name"}
                  dir={sortDir}
                  align="left"
                  ariaSort={ariaSort("name")}
                  onClick={() => toggleSort("name")}
                />
                <HeaderCell
                  label={HOLDINGS_COL_AMOUNT}
                  active={sortKey === "amount"}
                  dir={sortDir}
                  align="right"
                  ariaSort={ariaSort("amount")}
                  onClick={() => toggleSort("amount")}
                />
                <HeaderCell
                  label={HOLDINGS_COL_CHANGE}
                  active={sortKey === "change"}
                  dir={sortDir}
                  align="right"
                  ariaSort={ariaSort("change")}
                  onClick={() => toggleSort("change")}
                />
                <HeaderCell
                  label={HOLDINGS_COL_WEIGHT}
                  active={sortKey === "weight"}
                  dir={sortDir}
                  align="right"
                  ariaSort={ariaSort("weight")}
                  onClick={() => toggleSort("weight")}
                />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Row key={row.symbol} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function HeaderCell({
  label,
  active,
  dir,
  align,
  ariaSort,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  align: "left" | "right";
  ariaSort: "ascending" | "descending" | "none";
  onClick: () => void;
}) {
  const SortIcon = !active ? ChevronsUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={ariaSort} className="holdings-table-header">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex w-full items-center gap-xs py-md text-label-sm text-text-muted hover:text-text-strong",
          align === "right" ? "justify-end" : "justify-start",
        )}
      >
        <span>{label}</span>
        <SortIcon
          className={cn("h-4 w-4", active ? "text-text-strong" : "text-text-muted")}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

function Row({ row }: { row: HoldingRow }) {
  const isStock = row.assetType === "stock";
  const iconBgClass = isStock ? "bg-asset-stock" : "bg-asset-coin";
  const signalClass = row.isUp ? "signal-up-text" : "signal-down-text";

  return (
    <tr className="holdings-table-row holdings-table-row-hover border-b border-border-line">
      {/* 종목명 */}
      <td className="holdings-table-cell">
        <div className="flex items-center gap-md">
          <span
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-body-sm-strong text-surface",
              iconBgClass,
            )}
            aria-hidden="true"
          >
            {row.name.charAt(0)}
          </span>
          <span className="flex flex-col">
            <span className="text-body-sm-strong text-text-strong">
              {row.name}
            </span>
            <span className="text-caption text-text-muted">{row.symbol}</span>
          </span>
        </div>
      </td>
      {/* 평가액 */}
      <td className="holdings-table-cell-numeric text-right text-text-strong">
        ₩ {formatNumber(row.amountKrw)}
      </td>
      {/* 수익률 (등락색) */}
      <td className="holdings-table-cell text-right">
        <span className={signalClass}>
          {formatPct(row.changePct, { digits: 1, sign: true })}
        </span>
      </td>
      {/* 비중 */}
      <td className="holdings-table-cell-numeric text-right text-text-strong">
        {formatNumber(row.weightPct, { digits: 1 })}%
      </td>
    </tr>
  );
}
