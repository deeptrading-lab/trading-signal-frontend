/**
 * ChartShell — 차트 카드 셸. 타이틀 + 확대/축소 토글 + 차트타입/봉/기간(간격) 컨트롤 + children(차트 본문).
 *
 * 컨트롤 배치(왼쪽 클러스터): [캔들/라인 토글] [분봉/일봉/주봉/월봉] [기간 또는 분봉 간격 선택].
 *   맨 오른쪽: [옵션 ▾] 단독. 기간 슬롯은 봉 단위에 따라 성격이 바뀐다 —
 *     · 일/주/월봉: 1개월/3개월/6개월/1년 등 범위(days) 선택
 *     · 분봉: 1분/3분/5분/15분 간격(timeframe) 선택 (당일 한 세션이라 범위 무의미)
 *   봉 종류 선택기와 기간/간격 선택기 **모두** 같은 반응형 마크업(모바일 `ChartRangeDropdown` / 데스크탑
 *   버튼 목록)을 재사용 — 봉 종류·기간·분봉 간격에 따라 옵션 집합만 스왑(사용자 요청: 인터벌도 기간처럼 드롭다운).
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
  MINUTE_TIMEFRAMES,
  RANGES,
  type ChartType,
  type MainInterval,
} from "@/components/profile/stockChartConfig";

export function ChartShell({
  children,
  expanded,
  onExpand,
  onCollapse,
  interval,
  days,
  timeframe,
  onIntervalChange,
  onDaysChange,
  onTimeframeChange,
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
  interval: MainInterval;
  days: number;
  timeframe: number;
  onIntervalChange: (i: MainInterval) => void;
  onDaysChange: (d: number) => void;
  onTimeframeChange: (t: number) => void;
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
  showVolumeProfile: boolean;
  onToggleVolumeProfile: () => void;
  showBollinger: boolean;
  onToggleBollinger: () => void;
}) {
  const { isMobile } = useBreakpoint();
  const hasToggle = onExpand || onCollapse;
  const isMinute = interval === "m";

  // 기간 슬롯 — 봉 단위에 따라 옵션·값·핸들러를 스왑(분봉=간격, 그 외=기간). 마크업은 공통.
  //   RANGES 는 ChartPeriod 키라 `interval === "m"` 인라인 분기로 "m" 을 좁혀 인덱싱 안전 보장.
  const selectorOptions: { label: string; value: number }[] =
    interval === "m"
      ? MINUTE_TIMEFRAMES.map((t) => ({ label: t.label, value: t.timeframe }))
      : RANGES[interval].map((r) => ({ label: r.label, value: r.days }));
  const selectorValue = isMinute ? timeframe : days;
  const onSelectorChange = isMinute ? onTimeframeChange : onDaysChange;
  const selectorAria = isMinute ? "봉 간격 선택" : "기간 선택";

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

      {/* 헤더 행 2: (좌) 캔들/라인 + 봉 종류 + 기간·간격 / (우) 옵션 드롭다운 단독 */}
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
          {/* 봉 종류: 분봉/일봉/주봉/월봉 — 기간 선택기와 동일 패턴(모바일 드롭다운/데스크탑 버튼) */}
          {isMobile ? (
            <ChartRangeDropdown
              options={INTERVALS.map((it) => ({ label: it.label, value: it.interval }))}
              value={interval}
              onChange={onIntervalChange}
              ariaLabel="봉 종류 선택"
            />
          ) : (
            <div className="flex items-center gap-xs">
              {INTERVALS.map((it) => (
                <button
                  key={it.interval}
                  type="button"
                  onClick={() => onIntervalChange(it.interval)}
                  className={cn(
                    "px-sm py-[3px] rounded-sm text-caption font-medium transition-colors cursor-pointer",
                    interval === it.interval
                      ? "bg-accent-vivid text-surface"
                      : "text-text-muted hover:text-text-strong hover:bg-surface-muted",
                  )}
                >
                  {it.label}
                </button>
              ))}
            </div>
          )}
          {/* 기간(또는 분봉 간격) — 모바일은 드롭다운(줄바꿈 방지), 데스크탑은 버튼 목록 */}
          {isMobile ? (
            <ChartRangeDropdown
              options={selectorOptions}
              value={selectorValue}
              onChange={onSelectorChange}
              ariaLabel={selectorAria}
            />
          ) : (
            <div className="flex items-center gap-xs">
              {selectorOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => onSelectorChange(o.value)}
                  className={cn(
                    "px-sm py-[3px] rounded-sm text-caption font-medium transition-colors cursor-pointer",
                    selectorValue === o.value
                      ? "bg-surface-muted text-text-strong"
                      : "text-text-muted hover:text-text-strong",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* 우측: 오버레이 옵션(매물대·볼린저밴드) 드롭다운 — 맨 오른쪽 단독 */}
        <ChartOptionsDropdown
          options={{ volumeProfile: showVolumeProfile, bollinger: showBollinger }}
          onToggle={(key) =>
            key === "volumeProfile" ? onToggleVolumeProfile() : onToggleBollinger()
          }
        />
      </div>

      {children}
    </section>
  );
}
