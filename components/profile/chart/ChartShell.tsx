/**
 * ChartShell — 차트 카드 셸. 타이틀 + 확대/축소 토글 + 차트타입/봉/기간 컨트롤 + children(차트 본문).
 *
 * 차트 컨트롤 상태는 상위(StockPageLayout)가 소유(controlled). 상수/기본값은
 * `../stockChartConfig` 단일 소스.
 */

"use client";

import { Maximize2, Minimize2, ChartCandlestick, ChartLine } from "lucide-react";
import type { ChartPeriod } from "@/hooks/stock/useQueryStockChart";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import { cn } from "@/lib/utils/cn";
import { STOCK_DETAIL_PRICE_CHART_TITLE } from "@/lib/copy/profile/stockDetail";
import { ChartRangeDropdown } from "@/components/profile/ChartRangeDropdown";
import { ChartOptionsDropdown } from "@/components/profile/chart/ChartOptionsDropdown";
import {
  CHART_TYPES,
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
  showBollinger,
  onToggleBollinger,
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
  showBollinger: boolean;
  onToggleBollinger: () => void;
}) {
  const { isMobile } = useBreakpoint();
  const hasToggle = onExpand || onCollapse;
  const ranges = RANGES[period];

  // 캔들/라인 단일 토글 — 현재 종류를 표시하고, 탭하면 다른 종류로 전환.
  const nextChartType: ChartType = chartType === "candle" ? "line" : "candle";
  const chartTypeLabel = CHART_TYPES.find((ct) => ct.type === chartType)?.label ?? "";
  const ChartTypeIcon = chartType === "candle" ? ChartCandlestick : ChartLine;

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
        {/* 좌측: 캔들/라인 토글 + 봉 종류 */}
        <div className="flex items-center gap-sm">
          {/* 캔들/라인 단일 토글 — 현재 종류 표시, 탭하면 전환 */}
          <button
            type="button"
            onClick={() => onChartTypeChange(nextChartType)}
            aria-label={`차트 종류: ${chartTypeLabel} (탭하여 전환)`}
            className="flex items-center gap-xs px-sm py-[3px] rounded-sm text-caption font-medium transition-colors cursor-pointer border border-border-line text-text-muted hover:text-text-strong hover:bg-surface-muted"
          >
            <ChartTypeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {chartTypeLabel}
          </button>
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
          {/* 오버레이 옵션(매물대·볼린저밴드) — 개별 버튼 대신 드롭다운 체크박스로 묶음(모바일 툴바 절약). */}
          <ChartOptionsDropdown
            options={{ volumeProfile: showVolumeProfile, bollinger: showBollinger }}
            onToggle={(key) =>
              key === "volumeProfile" ? onToggleVolumeProfile() : onToggleBollinger()
            }
          />
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
