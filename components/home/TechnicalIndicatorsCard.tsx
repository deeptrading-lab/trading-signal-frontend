/**
 * TechnicalIndicatorsCard — 기술적 지표 카드 (RSI / MACD / 볼린저 밴드).
 *
 * PR6 (finsight-redesign) 신규.
 *
 * 시안 `AnalysisDashboard.tsx` L122~L145 정합:
 *   - RSI: 라벨 + 시그널 텍스트 + 0~100 그라데이션 게이지 (blue→amber→red).
 *   - MACD / 볼린저: 라벨 + 시그널 텍스트만 (게이지 없음).
 *
 * v8 토큰 cascade:
 *   - 카드 셸 = `card` 합성 토큰.
 *   - signal 별 색 — BUY/OVERBOUGHT/SELL(상승 위주) = `signal-up`,
 *     WATCH = `warn`, NEUTRAL = `text-muted`.
 *   - RSI 게이지 = `bg-gradient-to-r from-signal-down via-warn to-signal-up` (한국식 색).
 *
 * 정적 컴포넌트 — props-only 렌더.
 */

import { cn } from "@/lib/utils/cn";
import type {
  IndicatorLabelKey,
  IndicatorSignal,
  IndicatorSignalKey,
  TechnicalIndicator,
} from "@/lib/types/home/technicalIndicators";
import {
  INDICATOR_LABEL_BOLLINGER,
  INDICATOR_LABEL_MACD,
  INDICATOR_LABEL_RSI,
  INDICATOR_SIGNAL_BOLLINGER_UPPER,
  INDICATOR_SIGNAL_BUY,
  INDICATOR_SIGNAL_OVERBOUGHT,
  TECHNICAL_INDICATORS_TITLE,
} from "@/lib/copy/home/labels";

const LABEL_BY_KEY: Record<IndicatorLabelKey, string> = {
  INDICATOR_LABEL_RSI,
  INDICATOR_LABEL_MACD,
  INDICATOR_LABEL_BOLLINGER,
};

const DISPLAY_BY_KEY: Record<IndicatorSignalKey, string> = {
  INDICATOR_SIGNAL_OVERBOUGHT,
  INDICATOR_SIGNAL_BUY,
  INDICATOR_SIGNAL_BOLLINGER_UPPER,
};

// signal enum → 색 (Tailwind 토큰 클래스).
const SIGNAL_TEXT_CLASS: Record<IndicatorSignal, string> = {
  BUY: "text-signal-up",
  OVERBOUGHT: "text-signal-up",
  SELL: "text-signal-down",
  OVERSOLD: "text-signal-down",
  WATCH: "text-warn",
  NEUTRAL: "text-text-muted",
};

export interface TechnicalIndicatorsCardProps {
  indicators: TechnicalIndicator[];
}

export function TechnicalIndicatorsCard({
  indicators,
}: TechnicalIndicatorsCardProps) {
  return (
    <section className="card" aria-label={TECHNICAL_INDICATORS_TITLE}>
      <h2 className="text-h2 text-text-strong mb-md">
        {TECHNICAL_INDICATORS_TITLE}
      </h2>
      <div className="flex flex-col gap-md">
        {indicators.map((indicator) => (
          <IndicatorRow key={indicator.kind} indicator={indicator} />
        ))}
      </div>
    </section>
  );
}

function IndicatorRow({ indicator }: { indicator: TechnicalIndicator }) {
  const isRsi = indicator.kind === "RSI" && typeof indicator.value === "number";

  return (
    <div className="flex flex-col gap-xs">
      <div className="flex justify-between items-center">
        <span className="text-body-sm text-text-muted">
          {LABEL_BY_KEY[indicator.labelKey]}
        </span>
        <span
          className={cn(
            "text-body-sm-strong",
            SIGNAL_TEXT_CLASS[indicator.signal],
          )}
        >
          {DISPLAY_BY_KEY[indicator.displayKey]}
        </span>
      </div>
      {isRsi ? <RsiGauge value={indicator.value as number} /> : null}
    </div>
  );
}

function RsiGauge({ value }: { value: number }) {
  // 0~100 → CSS width%. v8 토큰 — signal-down → warn → signal-up 한국식 그라데이션.
  // 동적 width 는 inline style 의 동적 계산이므로 hex/px 직타 제외 규칙 예외.
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="w-full h-[6px] bg-surface-muted rounded-pill overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div
        className="h-full rounded-pill bg-gradient-to-r from-signal-down via-warn to-signal-up"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
