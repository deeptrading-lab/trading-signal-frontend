/**
 * ChartShell — 차트 카드 셸. 타이틀 + 확대/축소 토글 + 차트타입/봉/간격/기간 컨트롤 + children(차트 본문).
 *
 * 컨트롤 배치(왼쪽 클러스터): [캔들/라인 토글] [분봉/일봉/주봉/월봉] [간격(분봉일 때만)] [기간].
 *   맨 오른쪽: [옵션 ▾] 단독.
 *   - 일/주/월봉: 봉 종류 + [기간](1개월/3개월/6개월/1년 등 범위 days) 두 선택기.
 *   - 분봉: 봉 종류 + [간격](1/3/5/10/15분 timeframe) + [기간](당일/1주/1개월 priorDays) 세 선택기.
 *     분봉도 일/주/월봉처럼 "기간"을 고르되, 추가로 "간격"을 별도 슬롯에서 고른다(과거 회귀:
 *     예전엔 분봉이 기간 슬롯을 간격으로 대체해 개념이 뒤섞였음 — minute-chart-interval-period 로 분리).
 *   봉 종류·간격·기간 세 선택기는 모두 같은 반응형 마크업(`SegmentedSelector`: 모바일 `ChartRangeDropdown` /
 *   데스크탑 버튼 목록)을 재사용 — 옵션 집합·값·핸들러·스타일 variant 만 스왑.
 *
 * 차트 컨트롤 상태는 상위(StockPageLayout)가 소유(controlled). 상수/기본값은 `../stockChartConfig` 단일 소스.
 */

"use client";

import { Maximize2, Minimize2, ChartCandlestick, ChartLine } from "lucide-react";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import { cn } from "@/lib/utils/cn";
import { STOCK_DETAIL_PRICE_CHART_TITLE } from "@/lib/copy/profile/stockDetail";
import { ChartRangeDropdown } from "@/components/profile/ChartRangeDropdown";
import { ChartOptionsDropdown } from "@/components/profile/chart/ChartOptionsDropdown";
import {
  CHART_TYPES,
  INTERVALS,
  MINUTE_PERIODS,
  MINUTE_TIMEFRAMES,
  RANGES,
  type ChartType,
  type MainInterval,
} from "@/components/profile/stockChartConfig";
import type { ChartOptions } from "@/lib/store/chart/chartOptions";

/**
 * 봉 종류·간격·기간 공용 선택기 — 모바일은 `ChartRangeDropdown`(줄바꿈 방지), 데스크탑은 버튼 목록.
 *   variant: `primary`=봉 종류(활성 accent), `secondary`=간격·기간(활성 surface-muted).
 */
function SegmentedSelector<T extends string | number>({
  isMobile,
  options,
  value,
  onChange,
  ariaLabel,
  variant,
}: {
  isMobile: boolean;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  variant: "primary" | "secondary";
}) {
  if (isMobile) {
    return (
      <ChartRangeDropdown options={options} value={value} onChange={onChange} ariaLabel={ariaLabel} />
    );
  }
  return (
    <div className="flex items-center gap-xs" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={cn(
              "px-sm py-[3px] rounded-sm text-caption font-medium transition-colors cursor-pointer",
              active
                ? variant === "primary"
                  ? "bg-accent-vivid text-surface"
                  : "bg-surface-muted text-text-strong"
                : variant === "primary"
                  ? "text-text-muted hover:text-text-strong hover:bg-surface-muted"
                  : "text-text-muted hover:text-text-strong",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ChartShell({
  children,
  expanded,
  onExpand,
  onCollapse,
  interval,
  days,
  timeframe,
  minutePriorDays,
  onIntervalChange,
  onDaysChange,
  onTimeframeChange,
  onMinutePriorDaysChange,
  chartType,
  onChartTypeChange,
  overlays,
  onToggleOverlay,
}: {
  children: React.ReactNode;
  expanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  interval: MainInterval;
  days: number;
  timeframe: number;
  minutePriorDays: number;
  onIntervalChange: (i: MainInterval) => void;
  onDaysChange: (d: number) => void;
  onTimeframeChange: (t: number) => void;
  onMinutePriorDaysChange: (d: number) => void;
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
  overlays: ChartOptions;
  onToggleOverlay: (key: keyof ChartOptions) => void;
}) {
  const { isMobile } = useBreakpoint();
  const hasToggle = onExpand || onCollapse;
  const isMinute = interval === "m";

  // 봉 종류(분봉/일봉/주봉/월봉) 선택기 옵션.
  const intervalOptions = INTERVALS.map((it) => ({ label: it.label, value: it.interval }));
  // 분봉 간격(1/3/5/10/15분) 선택기 옵션 — 분봉일 때만 렌더.
  const timeframeOptions = MINUTE_TIMEFRAMES.map((t) => ({ label: t.label, value: t.timeframe }));

  // 기간 슬롯 — 분봉=MINUTE_PERIODS(priorDays), 그 외=RANGES(days). 마크업 공통.
  //   RANGES 는 ChartPeriod 키라 `interval === "m"` 인라인 분기로 "m" 을 좁혀 인덱싱 안전 보장.
  const periodOptions =
    interval === "m"
      ? MINUTE_PERIODS.map((p) => ({ label: p.label, value: p.priorDays }))
      : RANGES[interval].map((r) => ({ label: r.label, value: r.days }));
  const periodValue = isMinute ? minutePriorDays : days;
  const onPeriodChange = isMinute ? onMinutePriorDaysChange : onDaysChange;

  // 캔들/라인 단일 토글 — 현재 종류를 표시하고, 탭하면 다른 종류로 전환.
  const nextChartType: ChartType = chartType === "candle" ? "line" : "candle";
  const chartTypeLabel = CHART_TYPES.find((ct) => ct.type === chartType)?.label ?? "";
  const ChartTypeIcon = chartType === "candle" ? ChartCandlestick : ChartLine;

  return (
    // 카드리스(stock-detail-reskin) — `.card` 박스 제거, 플랫 섹션. 헤어라인은 상위(StockPageLayout)가 관리.
    <section aria-label={STOCK_DETAIL_PRICE_CHART_TITLE}>
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

      {/* 헤더 행 2: (좌) 캔들/라인 + 봉 종류 + 간격(분봉) + 기간 / (우) 옵션 드롭다운 단독 */}
      <div className="flex items-center justify-between mb-md gap-sm flex-wrap">
        {/* 좌측 클러스터 */}
        <div className="flex items-center gap-sm flex-wrap">
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
          {/* 봉 종류: 분봉/일봉/주봉/월봉 */}
          <SegmentedSelector
            isMobile={isMobile}
            options={intervalOptions}
            value={interval}
            onChange={onIntervalChange}
            ariaLabel="봉 종류 선택"
            variant="primary"
          />
          {/* 간격: 분봉일 때만 — 1/3/5/10/15분 */}
          {isMinute && (
            <SegmentedSelector
              isMobile={isMobile}
              options={timeframeOptions}
              value={timeframe}
              onChange={onTimeframeChange}
              ariaLabel="봉 간격 선택"
              variant="secondary"
            />
          )}
          {/* 기간: 일/주/월봉=범위, 분봉=당일/1주/1개월 */}
          <SegmentedSelector
            isMobile={isMobile}
            options={periodOptions}
            value={periodValue}
            onChange={onPeriodChange}
            ariaLabel="기간 선택"
            variant="secondary"
          />
        </div>
        {/* 우측: 오버레이 옵션(이평선·볼린저·VWAP·매물대·거래량 이평) 드롭다운 — 맨 오른쪽 단독 */}
        <ChartOptionsDropdown options={overlays} onToggle={onToggleOverlay} />
      </div>

      {children}
    </section>
  );
}
