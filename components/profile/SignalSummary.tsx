/**
 * SignalSummary — 종목 상세 "기술적 시그널" 컴팩트 인라인 요약(T4 "항시").
 *
 * stock-detail-reskin — 기존 카드형 SignalCard 를 노스스타 `.sig`(플랫 1행)로 리스킨:
 *   판정(ACTION) + 종합점수 + 4축 미니바 + 레짐·동의도 메타 + 면책. **카드 박스 없음** —
 *   섹션 헤어라인은 상위(StockPageLayout)가 관리한다.
 *
 * 데이터·상태는 `useSignalResult(ticker)` 그대로 보존:
 *   로딩 / 에러(또는 무결과) / warmup 미충족(산출 차단) / limitedData(장기추세 제한 경고).
 *
 * ⚠️ 투자 권유 아님 — 기술적 참고 정보(SIGNAL_DISCLAIMER).
 */

"use client";

import { cn } from "@/lib/utils/cn";
import { SignalSummarySkeleton } from "@/components/profile/SignalSummarySkeleton";
import { useSignalResult } from "@/hooks/stock/useSignalResult";
import {
  AXIS_LABEL,
  ACTION_LABEL,
  REGIME_LABEL,
  SIGNAL_DISCLAIMER,
  SIGNAL_SUMMARY_TITLE,
  SIGNAL_SUMMARY_ERROR,
  SIGNAL_SUMMARY_INSUFFICIENT,
  SIGNAL_SUMMARY_LIMITED,
  SIGNAL_SUMMARY_SCORE_SUFFIX,
  SIGNAL_SUMMARY_CONFIDENCE_LABEL,
  SIGNAL_SUMMARY_REGIME_LABEL,
} from "@/lib/copy/signal/labels";
import type { AxisScore, SignalAction } from "@/lib/types/signal";

export interface SignalSummaryProps {
  ticker: string;
}

/** 판정 → 텍스트 색(한국식: 매수=빨강 / 매도=파랑 / 중립=muted). */
const ACTION_TEXT_CLASS: Record<SignalAction, string> = {
  BUY: "text-signal-up",
  SELL: "text-signal-down",
  HOLD: "text-text-muted",
};

/** 레짐(장기추세) → 텍스트 색. */
const REGIME_TEXT_CLASS: Record<string, string> = {
  "1": "text-signal-up",
  "-1": "text-signal-down",
  "0": "text-text-muted",
};

/** 축 점수(0~100, 50=중립) → 미니바 채움색·텍스트 톤. */
function axisTone(score: number): { text: string; fill: string } {
  if (score > 52) return { text: "text-signal-up", fill: "bg-signal-up" };
  if (score < 48) return { text: "text-signal-down", fill: "bg-signal-down" };
  return { text: "text-text-muted", fill: "bg-text-muted" };
}

/** 상태 공통 래퍼 — 카드리스 `<section>`(제목은 aria-label). 헤어라인은 상위가 관리. */
function SummaryShell({ children }: { children: React.ReactNode }) {
  return <section aria-label={SIGNAL_SUMMARY_TITLE}>{children}</section>;
}

/** 축 1개 미니바 — 라벨 + 점수 + 0~100 채움 트랙. */
function AxisMini({ axis }: { axis: AxisScore }) {
  const tone = axisTone(axis.score);
  return (
    <div className="min-w-0">
      <div className="mb-xs flex items-center justify-between gap-xs">
        <span className="truncate text-caption text-text-muted">
          {AXIS_LABEL[axis.axis]}
        </span>
        <span className={cn("text-caption font-bold tabular-nums", tone.text)}>
          {axis.score.toFixed(0)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-pill bg-surface-muted">
        <div
          className={cn("h-full rounded-pill", tone.fill)}
          style={{ width: `${Math.max(0, Math.min(100, axis.score))}%` }}
        />
      </div>
    </div>
  );
}

export function SignalSummary({ ticker }: SignalSummaryProps) {
  const { result, isLoading, isError } = useSignalResult(ticker);

  if (isLoading) {
    return <SignalSummarySkeleton />;
  }

  if (isError || !result) {
    return (
      <SummaryShell>
        <p className="text-body-sm text-text-muted">{SIGNAL_SUMMARY_ERROR}</p>
      </SummaryShell>
    );
  }

  if (!result.warmupOk) {
    return (
      <SummaryShell>
        <p className="text-body-sm text-text-muted">
          {SIGNAL_SUMMARY_INSUFFICIENT}
        </p>
      </SummaryShell>
    );
  }

  const regimeKey = String(result.regime);

  return (
    <SummaryShell>
      {/* 판정 + 종합점수 | 4축 미니바 — 모바일 세로 스택, 데스크탑 한 줄 */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:gap-lg">
        <div className="flex shrink-0 items-baseline gap-sm sm:border-r sm:border-border-line sm:pr-lg">
          <span
            className={cn("text-button font-bold", ACTION_TEXT_CLASS[result.action])}
          >
            {ACTION_LABEL[result.action]}
          </span>
          <span className="text-h1 tabular-nums text-text-strong">
            {result.score.toFixed(0)}
          </span>
          <span className="text-caption text-text-muted">
            {SIGNAL_SUMMARY_SCORE_SUFFIX}
          </span>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-x-lg gap-y-md sm:grid-cols-4">
          {result.axes.map((axis) => (
            <AxisMini key={axis.axis} axis={axis} />
          ))}
        </div>
      </div>

      {/* 메타: 장기추세 · 동의도 (· 제한 데이터 경고) */}
      <div className="mt-md flex flex-wrap items-center gap-x-md gap-y-xs text-caption text-text-muted">
        <span className="inline-flex items-center gap-xs">
          {SIGNAL_SUMMARY_REGIME_LABEL}
          <span className={cn("font-bold", REGIME_TEXT_CLASS[regimeKey])}>
            {REGIME_LABEL[regimeKey] ?? REGIME_LABEL["0"]}
          </span>
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-xs">
          {SIGNAL_SUMMARY_CONFIDENCE_LABEL}
          <span className="font-bold tabular-nums text-text-strong">
            {Math.round(result.confidence * 100)}%
          </span>
        </span>
        {result.limitedData && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-warn">{SIGNAL_SUMMARY_LIMITED}</span>
          </>
        )}
      </div>

      {/* 면책 — 법적 필수 */}
      <p className="mt-sm text-caption leading-relaxed text-text-muted">
        {SIGNAL_DISCLAIMER}
      </p>
    </SummaryShell>
  );
}
