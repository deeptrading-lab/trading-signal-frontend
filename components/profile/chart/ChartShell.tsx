/**
 * ChartShell — 차트 카드 셸. 타이틀 + 확대/축소 토글 + 차트타입/봉/기간 컨트롤 + children(차트 본문).
 *
 * 차트 컨트롤 상태는 상위(StockPageLayout)가 소유(controlled). 상수/기본값은
 * `../stockChartConfig` 단일 소스.
 */

"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import type { ChartPeriod } from "@/hooks/stock/useQueryStockChart";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import { cn } from "@/lib/utils/cn";
import { STOCK_DETAIL_PRICE_CHART_TITLE } from "@/lib/copy/profile/stockDetail";
import { ChartRangeDropdown } from "@/components/profile/ChartRangeDropdown";
import {
  CHART_TYPES,
  CHART_VOLUME_PROFILE_LABEL,
  PERIODS,
  RANGES,
  type ChartType,
} from "@/components/profile/stockChartConfig";

export function ChartShell({
  children,
  expanded,
  onExpand,
  onCollapse,
  period,
  days,
  onPeriodChange,
  onDaysChange,
  chartType,
  onChartTypeChange,
  showVolumeProfile,
  onToggleVolumeProfile,
}: {
  children: React.ReactNode;
  expanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  period: ChartPeriod;
  days: number;
  onPeriodChange: (p: ChartPeriod) => void;
  onDaysChange: (d: number) => void;
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
  showVolumeProfile: boolean;
  onToggleVolumeProfile: () => void;
}) {
  const { isMobile } = useBreakpoint();
  const hasToggle = onExpand || onCollapse;
  const ranges = RANGES[period];

  return (
    <section className="card" aria-label={STOCK_DETAIL_PRICE_CHART_TITLE}>
      {/* 헤더 행 1: 타이틀 + 확대/축소 버튼 */}
      <header className="flex justify-between items-center mb-sm">
        <h2 className="text-h2 text-text-strong">{STOCK_DETAIL_PRICE_CHART_TITLE}</h2>
        {hasToggle && (
          <button
            type="button"
            className="button-icon"
            aria-label={expanded ? "차트 축소" : "차트 확대"}
            onClick={expanded ? onCollapse : onExpand}
          >
            {expanded
              ? <Minimize2 className="h-4 w-4" aria-hidden="true" />
              : <Maximize2 className="h-4 w-4" aria-hidden="true" />
            }
          </button>
        )}
      </header>

      {/* 헤더 행 2: 차트타입 + 봉 선택 / 기간 선택 */}
      <div className="flex items-center justify-between mb-md gap-sm flex-wrap">
        {/* 좌측: 라인/캔들 토글 + 봉 종류 */}
        <div className="flex items-center gap-sm">
          <div className="flex items-center rounded-sm overflow-hidden border border-border-line">
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.type}
                type="button"
                onClick={() => onChartTypeChange(ct.type)}
                className={cn(
                  "px-sm py-[3px] text-caption font-medium transition-colors cursor-pointer",
                  chartType === ct.type
                    ? "bg-accent-vivid text-surface"
                    : "text-text-muted hover:text-text-strong hover:bg-surface-muted",
                )}
              >
                {ct.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-xs">
            {PERIODS.map((p) => (
              <button
                key={p.period}
                type="button"
                onClick={() => onPeriodChange(p.period)}
                className={cn(
                  "px-sm py-[3px] rounded-sm text-caption font-medium transition-colors cursor-pointer",
                  period === p.period
                    ? "bg-accent-vivid text-surface"
                    : "text-text-muted hover:text-text-strong hover:bg-surface-muted",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* 매물대(가격대별 거래량) 오버레이 토글 — 가격축에 가로 히스토그램. 기본 off. */}
          <button
            type="button"
            onClick={onToggleVolumeProfile}
            aria-pressed={showVolumeProfile}
            className={cn(
              "px-sm py-[3px] rounded-sm text-caption font-medium transition-colors cursor-pointer border",
              showVolumeProfile
                ? "bg-accent-vivid text-surface border-accent-vivid"
                : "text-text-muted border-border-line hover:text-text-strong hover:bg-surface-muted",
            )}
          >
            {CHART_VOLUME_PROFILE_LABEL}
          </button>
        </div>
        {/* 우측: 기간 범위 — 모바일은 드롭다운(줄바꿈 방지), 데스크탑은 버튼 목록 */}
        {isMobile ? (
          <ChartRangeDropdown ranges={ranges} value={days} onChange={onDaysChange} />
        ) : (
          <div className="flex items-center gap-xs">
            {ranges.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => onDaysChange(r.days)}
                className={cn(
                  "px-sm py-[3px] rounded-sm text-caption font-medium transition-colors cursor-pointer",
                  days === r.days
                    ? "bg-surface-muted text-text-strong"
                    : "text-text-muted hover:text-text-strong",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {children}
    </section>
  );
}
