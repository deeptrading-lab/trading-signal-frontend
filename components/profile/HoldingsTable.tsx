/**
 * HoldingsTable — `/profile` "내 자산" 보유종목 플랫 표 (client component).
 *
 * home-market-redesign PR1 → **profile-reskin**(카드리스 플랫 표 — 홈 랭킹/관심종목 표 정합).
 *   - 카드 셸(`card`)·회색 헤더 스트립·`holdings-table-*` 합성 토큰 폐기 → 흰 바탕 위 헤어라인 표
 *     (홈 `ModelCostBreakdown` 표 언어: thead 하단 헤어라인 + text-muted 라벨, tbody 행 헤어라인 + hover).
 *   - 4열: 종목명 / 평가액 / 수익률 / 비중. 헤더 클릭 정렬(↕, `aria-sort`) — 정렬 상태·동작 무변경.
 *   - **종목명만**(코드 미표시). 로고닷은 자산 종류(주식=asset-stock / 코인=asset-coin) soft 페어로
 *     라이트/다크 AA 대비 확보(홈 rankLogoDot 톤 — soft bg + strong text). `text-surface` 직대비 제거.
 *   - 수익률만 등락색(한국식 signal-up 빨강 / signal-down 파랑). 평가액·비중은 text-strong.
 *   - 비중은 평가액 / 총평가액 으로 산출(자산 분류축 — 등락색 미사용).
 *   - 거래성 컬럼(예수금/주문가능/실현손익/입출금) 0 — 조회·분석 전용 스코프(AC-9).
 *
 * 정렬 상태(useState)가 필요해 client component.
 * 모바일 폴백: 좁은 화면에서 가로 스크롤 허용(`overflow-x-auto`) — 정렬 가능 표 의미 유지. hex/px 직타 0.
 */

"use client";

import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { rankLogoInitial } from "@/lib/utils/rankLogoDot";
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
    <section className="flex flex-col gap-md" aria-label={HOLDINGS_TABLE_TITLE}>
      {/* "내 자산"(h2) 하위 — 위계상 h3. text-body-md font-bold = body-strong(16px/700) 조합
       * (`text-body-strong` 은 유틸 미생성 no-op — tailwind.config adaptFontSize 참조). */}
      <h3 className="text-body-md font-bold text-text-strong">
        {HOLDINGS_TABLE_TITLE}
      </h3>

      {rows.length === 0 ? (
        <p className="py-md text-body-sm text-text-muted">{HOLDINGS_EMPTY}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border-line">
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
    <th
      scope="col"
      aria-sort={ariaSort}
      className={align === "left" ? "pr-md" : "pl-md"}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex w-full items-center gap-xs py-md text-label-sm text-text-muted transition-colors hover:text-text-strong",
          align === "right" ? "justify-end" : "justify-start",
        )}
      >
        <span>{label}</span>
        <SortIcon
          className={cn(
            "h-4 w-4",
            active ? "text-text-strong" : "text-text-muted",
          )}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

function Row({ row }: { row: HoldingRow }) {
  const isStock = row.assetType === "stock";
  // 자산 종류 soft 페어(라이트/다크 AA) — text-surface 직대비 대신 홈 로고닷 톤.
  const dotClass = isStock
    ? "bg-asset-stock-soft text-asset-stock"
    : "bg-asset-coin-soft text-asset-coin";
  const signalClass = row.isUp ? "signal-up-text" : "signal-down-text";

  return (
    <tr className="border-b border-border-line transition-colors last:border-b-0 hover:bg-surface-muted">
      {/* 종목명(코드 미표시) */}
      <td className="py-md pr-md">
        <div className="flex items-center gap-md">
          <span
            className={cn(
              "inline-grid h-8 w-8 shrink-0 place-items-center rounded-sm text-caption font-bold",
              dotClass,
            )}
            aria-hidden="true"
          >
            {rankLogoInitial(row.name)}
          </span>
          <span className="truncate text-body-sm-strong text-text-strong">
            {row.name}
          </span>
        </div>
      </td>
      {/* 평가액 */}
      <td className="py-md pl-md text-right text-body-sm-strong tabular-nums text-text-strong whitespace-nowrap">
        ₩ {formatNumber(row.amountKrw)}
      </td>
      {/* 수익률 (등락색) */}
      <td className="py-md pl-md text-right whitespace-nowrap">
        <span className={cn("text-body-sm-strong", signalClass)}>
          {formatPct(row.changePct, { digits: 1, sign: true })}
        </span>
      </td>
      {/* 비중 */}
      <td className="py-md pl-md text-right text-body-sm-strong tabular-nums text-text-strong whitespace-nowrap">
        {formatNumber(row.weightPct, { digits: 1 })}%
      </td>
    </tr>
  );
}
