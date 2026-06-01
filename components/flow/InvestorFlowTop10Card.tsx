/**
 * InvestorFlowTop10Card — 홈 "외국인·기관 순매수 Top10" 카드(표면 A).
 *
 * PRD `investor-flow` §4.A / DESIGN.md §Layout(표면 A) · §Components(랭킹 행).
 *
 * 데이터: `useQueryFlowTop10()`(도메인 훅) 소비. 응답은 이미 화면 친화 `InvestorFlowTop10`.
 * 레이아웃:
 *   - 데스크탑(≥lg): 카드 1개 안에 `lg:grid-cols-2` — 좌 외국인 / 우 기관 병치, 각 Top10.
 *   - 모바일(<md): 세로 스택(외국인 → 기관). 각 주체 Top5 절단 + "더보기"로 Top10 확장(R3).
 * 행: [순위 배지] [종목명+코드] [순매수 거래대금(억원)+수량(주)] [등락률]. 클릭 → /stock/[ticker].
 *   prefetch(hover/click) 는 `usePrefetchStockDetail` 재사용(WatchlistRow 패턴).
 * 상태: loading(스켈레톤) / empty(장전·주말 안내) / error(재시도 안내).
 *
 * 색은 부호로 결정(DESIGN.md 절대 원칙): 순매수 양수=빨강(signal-up), 음수=파랑(signal-down).
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrefetchStockDetail } from "@/hooks/stock/usePrefetchStockDetail";
import { useQueryFlowTop10 } from "@/hooks/flow/useQueryFlowTop10";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { formatNetBuyAmount, formatNetBuyQty } from "@/lib/utils/formatNetBuy";
import type { InvestorFlowRow } from "@/lib/types/flow/top10";
import {
  FLOW_TOP10_ASOF_PREFIX,
  FLOW_TOP10_EMPTY,
  FLOW_TOP10_ERROR,
  FLOW_TOP10_FOREIGN_LABEL,
  FLOW_TOP10_INSTITUTION_LABEL,
  FLOW_TOP10_LOADING,
  FLOW_TOP10_RETRY,
  FLOW_TOP10_SHOW_LESS,
  FLOW_TOP10_SHOW_MORE,
  FLOW_TOP10_TITLE,
  FLOW_TOP10_TODAY_LABEL,
} from "@/lib/copy/flow/labels";

const MOBILE_TRUNCATE = 5;

/** asOf(ISO) → "기준 14:30" 형태. 파싱 실패 시 미표기. */
function asOfLabel(asOf?: string): string | null {
  if (!asOf) return null;
  const d = new Date(asOf);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${FLOW_TOP10_ASOF_PREFIX} ${hh}:${mm}`;
}

/** 순매수 부호 → 금액 텍스트 색 토큰. */
function amountClass(value: number): string {
  if (value > 0) return "netbuy-amount-up";
  if (value < 0) return "netbuy-amount-down";
  return "text-text-muted text-mono-numeric tabular-nums";
}

/** 등락 방향 → 등락률 색 토큰. */
function changeClass(direction: InvestorFlowRow["direction"]): string {
  if (direction === "up") return "signal-up-text";
  if (direction === "down") return "signal-down-text";
  return "text-text-muted text-mono-numeric tabular-nums";
}

function FlowRow({ row, rank }: { row: InvestorFlowRow; rank: number }) {
  const router = useRouter();
  const { prefetch, onIntent, cancelIntent } = usePrefetchStockDetail();

  const go = () => {
    prefetch(row.ticker);
    router.push(`/stock/${row.ticker}`);
  };

  return (
    <div
      role="row"
      tabIndex={0}
      aria-label={`${row.name} 상세 보기`}
      className="rank-row rank-row-hover grid grid-cols-[auto_1fr_auto] items-center gap-md cursor-pointer rounded-sm transition-colors"
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
      onMouseEnter={() => onIntent(row.ticker)}
      onMouseLeave={cancelIntent}
      onFocus={() => onIntent(row.ticker)}
      onBlur={cancelIntent}
    >
      {/* 순위 배지 — 1~3위 강조 */}
      <span
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-sm text-label-sm tabular-nums",
          rank <= 3
            ? "bg-accent-soft text-primary"
            : "bg-surface-muted text-text-muted",
        )}
      >
        {rank}
      </span>

      {/* 종목명 + 코드 + 현재가 */}
      <div className="min-w-0">
        <div className="text-body-sm-strong text-text-strong truncate">
          {row.name}
        </div>
        <div className="flex items-center gap-sm text-caption text-text-muted">
          <span>{row.ticker}</span>
          <span className="tabular-nums">{formatNumber(row.price)}</span>
        </div>
      </div>

      {/* 순매수 거래대금 + 수량 + 등락률 (우정렬) */}
      <div className="flex flex-col items-end gap-xs">
        <span className={amountClass(row.netBuyAmount)}>
          {formatNetBuyAmount(row.netBuyAmount)}
        </span>
        <div className="flex items-center gap-sm">
          <span className="netbuy-qty">{formatNetBuyQty(row.netBuyQty)}</span>
          <span className={cn("text-caption", changeClass(row.direction))}>
            {formatPct(row.changePercent, { sign: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

function FlowColumn({
  label,
  rows,
  asOf,
  className,
}: {
  label: string;
  rows: InvestorFlowRow[];
  asOf?: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = asOfLabel(asOf);
  const truncated = rows.length > MOBILE_TRUNCATE;
  // 모바일에서만 절단(<md). 데스크탑은 항상 Top10 — Tailwind 로 잘린 행을 md 이상에서 노출한다.

  return (
    <section className={cn("flex flex-col gap-sm", className)} aria-label={label}>
      <header className="flex items-baseline justify-between gap-sm">
        <h3 className="text-body-sm-strong text-text-strong">{label}</h3>
        <span className="text-caption text-text-muted">
          {FLOW_TOP10_TODAY_LABEL}
          {meta ? ` · ${meta}` : ""}
        </span>
      </header>

      <div role="list" className="flex flex-col">
        {rows.map((row, idx) => {
          const beyondTruncate = idx >= MOBILE_TRUNCATE;
          return (
            <div
              key={row.ticker}
              className={cn(
                // 모바일: 더보기 접힘 상태면 Top5 초과 행 숨김. md 이상은 항상 노출.
                beyondTruncate && !expanded && "hidden md:block",
              )}
            >
              <FlowRow row={row} rank={idx + 1} />
            </div>
          );
        })}
      </div>

      {/* 더보기 토글 — 모바일 전용(md 이상 숨김), 절단된 경우만 */}
      {truncated && (
        <button
          type="button"
          className="md:hidden self-start h-button-sm-h px-sm rounded-sm text-button-sm text-primary hover:bg-accent-soft"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? FLOW_TOP10_SHOW_LESS : FLOW_TOP10_SHOW_MORE}
        </button>
      )}
    </section>
  );
}

function SkeletonColumn() {
  return (
    <div className="flex flex-col gap-sm" aria-hidden="true">
      <div className="h-4 w-16 bg-surface-muted rounded-sm" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-table-row-h bg-surface-muted rounded-sm animate-pulse"
        />
      ))}
    </div>
  );
}

export function InvestorFlowTop10Card() {
  const { data, isLoading, isError, refetch } = useQueryFlowTop10();

  const hasRows =
    !!data && (data.foreign.length > 0 || data.institution.length > 0);

  return (
    <section className="card flex flex-col gap-md" aria-label={FLOW_TOP10_TITLE}>
      <header className="flex items-center justify-between gap-sm">
        <h2 className="text-h2 text-text-strong">{FLOW_TOP10_TITLE}</h2>
      </header>

      {isLoading ? (
        <>
          <p className="sr-only" aria-busy="true">
            {FLOW_TOP10_LOADING}
          </p>
          <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
            <SkeletonColumn />
            <SkeletonColumn />
          </div>
        </>
      ) : isError ? (
        <div className="card-critical" role="alert">
          <p className="text-body-sm mb-md">{FLOW_TOP10_ERROR}</p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => refetch()}
          >
            {FLOW_TOP10_RETRY}
          </button>
        </div>
      ) : !hasRows ? (
        <p className="text-body-sm text-text-muted">{FLOW_TOP10_EMPTY}</p>
      ) : (
        <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
          <FlowColumn
            label={FLOW_TOP10_FOREIGN_LABEL}
            rows={data.foreign}
            asOf={data.asOf}
          />
          <FlowColumn
            label={FLOW_TOP10_INSTITUTION_LABEL}
            rows={data.institution}
            asOf={data.asOf}
            className="lg:border-l lg:border-border-line lg:pl-lg"
          />
        </div>
      )}
    </section>
  );
}
