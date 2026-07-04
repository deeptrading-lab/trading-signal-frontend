"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { roundToKrxTick } from "@/lib/utils/krxTick";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { AXIS_LABEL, ACTION_LABEL } from "@/lib/copy/signal/labels";
import { VERDICT_LABEL, isBullishVerdict, isBearishVerdict } from "./FinalVerdictCard";
import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";
import type { AxisKey, RuleDirection, SignalAction } from "@/lib/types/signal";

/**
 * verdict-forward 히어로(T4 항시-글랜스) — 라이브 패널 상단에 늘 보이는 판정 요약.
 *
 *   - 스트리밍/대기(`final` 없음): "판정 대기 중" + 가격 기반 결정론 시그널(점수·4축)을 채워
 *     12분 대기 동안 빈 화면을 막는다(최종 AI 판정은 완료 후 표시).
 *   - 완료(`final` 있음): 판정 라벨(VERDICT_LABEL) + 신호강도(또는 확신도) + 목표/손절/손익비 +
 *     예상 기간(구체 텍스트). **SNS 감정 칩은 여기 두지 않는다**(분석가 페이즈 소관).
 *
 * 전체 판정 상세(근거·전략·전망·강점/리스크)는 최종 판정 페이즈의 `FinalVerdictCard` 가 담당한다.
 * `signal` 은 프레젠테이션 prop 으로만 받는다 — 라이브는 `useSignalResult`, 저장모드(PR③)는 스냅샷 시그널을
 * 넘겨 이 컴포넌트를 그대로 재사용할 수 있다.
 */

/** 히어로가 그리는 결정론 시그널 최소 형태 — SignalResult·DecisionSignal 양쪽이 구조적으로 만족. */
export interface HeroSignal {
  score: number;
  action: SignalAction;
  axes: readonly { axis: AxisKey; score: number }[];
  regime: RuleDirection;
  confidence: number;
}

interface VerdictHeroProps {
  final: FinalDecision | null;
  /** 결정론 시그널(있으면). 대기 중 4축 채움 + 완료 시 신호강도. null 이면 확신도/대기 문구로 폴백. */
  signal: HeroSignal | null;
  /** 전체 완료 에이전트 수 — 대기 진행 카운터("N/12 에이전트"). */
  doneCount: number;
  totalCount: number;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

/** 축 점수(0~100, 50=중립) → 미니바 색 토큰. SignalSummary 와 동일 규칙(카드리스 컴팩트 버전). */
function axisTone(score: number): { text: string; fill: string } {
  if (score > 52) return { text: "text-signal-up", fill: "bg-signal-up" };
  if (score < 48) return { text: "text-signal-down", fill: "bg-signal-down" };
  return { text: "text-text-muted", fill: "bg-text-muted" };
}

function AxisMini({ axis, score }: { axis: AxisKey; score: number }) {
  const tone = axisTone(score);
  return (
    <div className="min-w-0">
      <div className="mb-xs flex items-center justify-between gap-xs">
        <span className="truncate text-caption text-text-muted">{AXIS_LABEL[axis]}</span>
        <span className={cn("text-caption font-bold tabular-nums", tone.text)}>
          {score.toFixed(0)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-pill bg-surface-muted">
        {/* 채움 폭은 점수(0~100) 동적 계산 — 인라인 style 허용 범위(토큰 hex/px 직타 아님). */}
        <div className={cn("h-full rounded-pill", tone.fill)} style={{ width: `${clampPct(score)}%` }} />
      </div>
    </div>
  );
}

function StatCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-sm bg-surface px-md py-sm">
      <span className="text-caption font-medium text-text-muted whitespace-nowrap">{label}</span>
      {children}
    </div>
  );
}

/** %값 → basePrice 있으면 "절대가격(±N%)", 없으면 "±N%". FinalVerdictCard 표기 규칙 정합. */
function pctValue(pct: number, basePrice: number | null, colorClass: string): ReactNode {
  const pctStr = `${pct > 0 ? "+" : ""}${pct}%`;
  if (basePrice == null) {
    return <span className={cn("text-mono-numeric tabular-nums", colorClass)}>{pctStr}</span>;
  }
  const price = roundToKrxTick(basePrice * (1 + pct / 100));
  return (
    <span className="flex items-baseline gap-1 whitespace-nowrap">
      <span className={cn("text-mono-numeric tabular-nums", colorClass)}>
        {price.toLocaleString("ko-KR")}
      </span>
      <span className="text-caption font-medium text-text-muted">({pctStr})</span>
    </span>
  );
}

/** 대기/스트리밍 히어로 — 결정론 시그널로 채운 "판정 대기 중". */
function PendingHero({
  signal,
  doneCount,
  totalCount,
}: {
  signal: HeroSignal | null;
  doneCount: number;
  totalCount: number;
}) {
  return (
    <div className="rounded-xl border border-border-line bg-surface p-lg shadow-card">
      <div className="flex items-start justify-between gap-md">
        <div className="min-w-0">
          <div className="flex items-center gap-sm">
            <span className="relative flex h-2 w-2 flex-none text-accent-vivid">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
            <h3 className="text-h2 font-extrabold leading-tight text-text-strong">
              {COPY.hero.pendingTitle}
            </h3>
          </div>
          <p className="mt-1 text-caption text-text-muted">
            {COPY.hero.pendingCaption} · {COPY.hero.progress(doneCount, totalCount)}
          </p>
        </div>
        {signal && (
          <div className="flex flex-col items-center justify-center rounded-md bg-surface-muted px-md py-xs shrink-0">
            <span className="text-display font-extrabold leading-none tabular-nums text-text-strong">
              {Math.round(signal.score)}
            </span>
            <span className="mt-0.5 text-caption font-medium text-text-muted whitespace-nowrap">
              {ACTION_LABEL[signal.action]}
            </span>
          </div>
        )}
      </div>

      {signal ? (
        <div className="mt-md space-y-md">
          <div className="grid grid-cols-2 gap-x-lg gap-y-sm sm:grid-cols-4">
            {signal.axes.map((a) => (
              <AxisMini key={a.axis} axis={a.axis} score={a.score} />
            ))}
          </div>
          <p className="text-caption leading-relaxed text-text-muted">{COPY.hero.signalNote}</p>
        </div>
      ) : (
        <p className="mt-md text-caption text-text-muted">{COPY.hero.signalUnavailable}</p>
      )}
    </div>
  );
}

/** 완료 히어로 — 판정 글랜스(라벨 + 신호강도/확신도 + 목표/손절/손익비 + 예상 기간). */
function DoneHero({ final, signal }: { final: FinalDecision; signal: HeroSignal | null }) {
  const bullish = isBullishVerdict(final.verdict);
  const bearish = isBearishVerdict(final.verdict);
  const basePrice =
    typeof final.base_price === "number" && final.base_price > 0 ? final.base_price : null;
  const hasRR = final.risk_reward_ratio !== null;
  const targetIsReentry = final.target_pct !== null && final.target_pct < 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border-line bg-surface shadow-card">
      <div className="p-lg">
        <div className="flex items-center gap-md">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
              bullish && "bg-signal-up-soft",
              bearish && "bg-signal-down-soft",
              !bullish && !bearish && "bg-surface-muted",
            )}
          >
            {bullish && <TrendingUp className="text-signal-up" size={22} />}
            {bearish && <TrendingDown className="text-signal-down" size={22} />}
            {!bullish && !bearish && <Minus className="text-text-muted" size={22} />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-h1 font-extrabold leading-tight text-text-strong">
              {VERDICT_LABEL[final.verdict]}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-sm gap-y-xs text-caption text-text-muted">
              <span className="inline-flex items-center gap-1">
                <Clock size={13} />
                {COPY.verdict.horizonLabel} {COPY.verdict.horizonConcrete[final.time_horizon]}
              </span>
            </div>
          </div>
          {/* 신호강도(시그널 있으면) 또는 확신도 — 근거는 title. */}
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-md px-md py-xs shrink-0 min-w-16",
              bullish && "bg-signal-up-soft",
              bearish && "bg-signal-down-soft",
              !bullish && !bearish && "bg-surface-muted",
            )}
            title={signal ? COPY.verdict.signalStrengthBasis : COPY.verdict.confidenceBasis}
          >
            <span
              className={cn(
                "font-extrabold leading-none tabular-nums",
                signal ? "text-display" : "text-h2",
                bullish && "text-signal-up",
                bearish && "text-signal-down",
                !bullish && !bearish && "text-text-strong",
              )}
            >
              {signal ? Math.round(signal.score) : COPY.verdict.confidenceValue(final.confidence)}
            </span>
            <span className="mt-0.5 text-caption font-medium text-text-muted whitespace-nowrap">
              {signal ? COPY.verdict.signalStrengthShort : COPY.verdict.confidenceShort}
            </span>
          </div>
        </div>
      </div>

      {/* 목표/손절/손익비 — gap-px + border-line 배경으로 셀 사이 헤어라인. */}
      <div
        className={cn(
          "grid grid-cols-1 gap-px border-t border-border-line bg-border-line",
          hasRR ? "sm:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        <StatCell label={targetIsReentry ? COPY.verdict.reentryLabel : COPY.verdict.targetLabel}>
          {!final.target_pct ? (
            <span className="text-mono-numeric tabular-nums text-text-muted">—</span>
          ) : (
            pctValue(
              final.target_pct,
              basePrice,
              final.target_pct > 0 ? "text-signal-up" : "text-signal-down",
            )
          )}
        </StatCell>
        <StatCell label={COPY.verdict.stopLossLabel}>
          {pctValue(final.stop_loss_pct, basePrice, "text-signal-down")}
        </StatCell>
        {hasRR && (
          <StatCell label={COPY.verdict.rrLabel}>
            <span className="text-mono-numeric tabular-nums text-text-strong">
              {final.risk_reward_ratio} : 1
            </span>
          </StatCell>
        )}
      </div>
    </div>
  );
}

export function VerdictHero({ final, signal, doneCount, totalCount }: VerdictHeroProps) {
  return (
    <motion.section
      aria-label={COPY.panel.title}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {final ? (
        <DoneHero final={final} signal={signal} />
      ) : (
        <PendingHero signal={signal} doneCount={doneCount} totalCount={totalCount} />
      )}
    </motion.section>
  );
}
