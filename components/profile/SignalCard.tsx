/**
 * SignalCard — 종목 상세 기술적 시그널 카드.
 *
 * 데이터: useSignalResult(ticker) — 일봉 200봉 → evaluateSignal → SignalResult.
 * 표시:
 *   - 메인 배지: BUY / HOLD / SELL + 종합점수
 *   - 4축 게이지 (추세·모멘텀·거래량·변동성) + 각 축 주요 근거 규칙
 *   - 레짐(장기추세 방향) · 동의도(confidence)
 *   - 면책 문구
 *
 * ⚠️ 투자 권유 아님 — 기술적 참고 정보.
 */

"use client";

import { cn } from "@/lib/utils/cn";
import { useSignalResult } from "@/hooks/stock/useSignalResult";
import { useMutationAISignal } from "@/hooks/stock/useMutationAISignal";
import {
  AXIS_LABEL,
  ACTION_LABEL,
  SIGNAL_DISCLAIMER,
  ruleLabel,
} from "@/lib/copy/signal/labels";
import type { AxisScore, SignalAction } from "@/lib/types/signal";
import type { AISignalVerdict } from "@/lib/types/stock/aiSignal";

export interface SignalCardProps {
  ticker: string;
}

// ──────────────────────────── 배지 스타일 ────────────────────────────

const ACTION_BADGE: Record<SignalAction, string> = {
  BUY: "badge-signal-up",
  SELL: "badge-signal-down",
  HOLD: "badge-info",
};

const REGIME_LABEL: Record<string, string> = {
  "1": "장기 강세",
  "-1": "장기 약세",
  "0": "중립",
};

const REGIME_CLS: Record<string, string> = {
  "1": "text-signal-up",
  "-1": "text-signal-down",
  "0": "text-text-muted",
};

const AI_VERDICT_BADGE: Record<AISignalVerdict, string> = {
  BUY: "badge-signal-up",
  SELL: "badge-signal-down",
  HOLD: "badge-info",
  WATCH: "badge-warn",
};

const AI_VERDICT_LABEL: Record<AISignalVerdict, string> = {
  BUY: "AI: 매수 우위",
  SELL: "AI: 매도 우위",
  HOLD: "AI: 중립",
  WATCH: "AI: 관망",
};

// ──────────────────────────── 축 게이지 ────────────────────────────

function AxisBar({ axis }: { axis: AxisScore }) {
  const pct = axis.score; // 0~100, 50=중립
  const bullish = pct > 52;
  const bearish = pct < 48;

  // 상위 2개 규칙만 표시(weight 내림차순)
  const topHits = [...axis.hits]
    .filter((h) => h.direction !== 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2);

  return (
    <div className="flex flex-col gap-xs">
      <div className="flex items-center justify-between">
        <span className="text-caption text-text-muted">{AXIS_LABEL[axis.axis]}</span>
        <span
          className={cn(
            "text-caption font-medium",
            bullish && "text-signal-up",
            bearish && "text-signal-down",
            !bullish && !bearish && "text-text-muted",
          )}
        >
          {pct.toFixed(0)}
        </span>
      </div>
      {/* 게이지 바 */}
      <div className="relative h-[4px] rounded-full bg-surface-muted overflow-hidden">
        {/* 중심선 */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-border-line" />
        {/* 채움 — 50 기준 좌우 */}
        {pct >= 50 ? (
          <div
            className="absolute inset-y-0 left-1/2 rounded-full bg-signal-up"
            style={{ width: `${(pct - 50) * 2}%` }}
          />
        ) : (
          <div
            className="absolute inset-y-0 right-1/2 rounded-full bg-signal-down"
            style={{ width: `${(50 - pct) * 2}%` }}
          />
        )}
      </div>
      {/* 발화된 규칙 */}
      {topHits.length > 0 && (
        <div className="flex flex-wrap gap-xs">
          {topHits.map((h) => (
            <span
              key={h.key}
              className={cn(
                "text-caption px-xs py-[1px] rounded",
                h.direction === 1
                  ? "bg-signal-up-soft text-signal-up"
                  : "bg-signal-down-soft text-signal-down",
              )}
            >
              {h.detail ? `${ruleLabel(h.key)} · ${h.detail}` : ruleLabel(h.key)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────── 메인 카드 ────────────────────────────

export function SignalCard({ ticker }: SignalCardProps) {
  const { result, isLoading, isError } = useSignalResult(ticker);
  const aiMutation = useMutationAISignal();

  if (isLoading) {
    return (
      <section className="card flex flex-col gap-md" aria-label="기술적 시그널">
        <h2 className="text-h2 text-text-strong">기술적 시그널</h2>
        <div className="text-body text-text-muted">분석 중…</div>
      </section>
    );
  }

  if (isError || !result) {
    return (
      <section className="card flex flex-col gap-md" aria-label="기술적 시그널">
        <h2 className="text-h2 text-text-strong">기술적 시그널</h2>
        <div className="text-body text-text-muted">시그널을 불러올 수 없어요.</div>
      </section>
    );
  }

  if (!result.warmupOk) {
    return (
      <section className="card flex flex-col gap-md" aria-label="기술적 시그널">
        <h2 className="text-h2 text-text-strong">기술적 시그널</h2>
        <div className="text-body text-text-muted">
          데이터가 부족해 시그널을 산출할 수 없어요. (최소 130봉 필요)
        </div>
      </section>
    );
  }

  const regimeKey = String(result.regime);

  return (
    <section className="card flex flex-col gap-lg" aria-label="기술적 시그널">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-h2 text-text-strong">기술적 시그널</h2>
        <span className="text-caption text-text-muted">{result.asOf} 기준</span>
      </div>

      {/* 메인 배지 + 점수 */}
      <div className="flex items-center gap-md">
        <span className={ACTION_BADGE[result.action]}>{ACTION_LABEL[result.action]}</span>
        <div className="flex flex-col">
          <span className="text-label text-text-muted">종합점수</span>
          <span className="text-h1 font-bold text-text-strong">
            {result.score.toFixed(0)}
            <span className="text-caption text-text-muted font-normal"> / 100</span>
          </span>
        </div>
        <div className="flex flex-col ml-auto text-right">
          <span className="text-label text-text-muted">동의도</span>
          <span className="text-body font-medium text-text-strong">
            {Math.round(result.confidence * 100)}%
          </span>
        </div>
      </div>

      {/* 레짐 */}
      <div className="flex items-center gap-xs text-caption">
        <span className="text-text-muted">장기추세</span>
        <span className={cn("font-medium", REGIME_CLS[regimeKey])}>
          {REGIME_LABEL[regimeKey] ?? "중립"}
        </span>
      </div>

      {/* 4축 게이지 */}
      <div className="flex flex-col gap-md">
        {result.axes.map((axis) => (
          <AxisBar key={axis.axis} axis={axis} />
        ))}
      </div>

      {/* AI 최종 판단 섹션 */}
      <div className="border-t border-border-line pt-md flex flex-col gap-md">
        {/* 버튼 — pending·성공 시 숨김 */}
        {!aiMutation.isPending && !aiMutation.isSuccess && (
          <button
            type="button"
            className="button-primary self-start"
            onClick={() => aiMutation.mutate(ticker)}
          >
            AI로 최종 판단
          </button>
        )}

        {/* 로딩 */}
        {aiMutation.isPending && (
          <p className="text-body text-text-muted">
            Claude가 웹 리서치 후 분석 중입니다… (최대 60초)
          </p>
        )}

        {/* 에러 */}
        {aiMutation.isError && (
          <div className="flex flex-col gap-xs">
            <p className="text-body text-critical">
              {(aiMutation.error as { message?: string })?.message ?? "AI 분석에 실패했어요."}
            </p>
            <button
              type="button"
              className="button-primary self-start"
              onClick={() => aiMutation.mutate(ticker)}
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 성공 — AI 판단 결과 */}
        {aiMutation.isSuccess && aiMutation.data && (() => {
          const ai = aiMutation.data;
          return (
            <div className="flex flex-col gap-md">
              <div className="flex items-center gap-md">
                <span className={AI_VERDICT_BADGE[ai.verdict]}>{AI_VERDICT_LABEL[ai.verdict]}</span>
              </div>
              <p className="text-body text-text-strong leading-relaxed">{ai.reasoning}</p>
              {ai.key_catalysts.length > 0 && (
                <div className="flex flex-col gap-xs">
                  <span className="text-label text-text-muted">최근 이슈·촉매</span>
                  <ul className="flex flex-col gap-xs">
                    {ai.key_catalysts.map((c, i) => (
                      <li key={i} className="text-caption text-text-strong flex gap-xs">
                        <span className="text-signal-up shrink-0">↑</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ai.risk_factors.length > 0 && (
                <div className="flex flex-col gap-xs">
                  <span className="text-label text-text-muted">리스크</span>
                  <ul className="flex flex-col gap-xs">
                    {ai.risk_factors.map((r, i) => (
                      <li key={i} className="text-caption text-text-strong flex gap-xs">
                        <span className="text-signal-down shrink-0">↓</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-caption text-text-muted">{ai.confidence_note}</p>
              <p className="text-caption text-text-muted leading-relaxed">{ai.disclaimer}</p>
            </div>
          );
        })()}
      </div>

      {/* 면책 */}
      <p className="text-caption text-text-muted leading-relaxed border-t border-border-line pt-md">
        {SIGNAL_DISCLAIMER}
      </p>
    </section>
  );
}
