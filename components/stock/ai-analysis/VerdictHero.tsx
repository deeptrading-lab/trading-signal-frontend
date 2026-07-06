"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { BadgeCheck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { roundToKrxTick } from "@/lib/utils/krxTick";
import { formatNumber } from "@/lib/utils/formatMoney";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { AXIS_LABEL, ACTION_LABEL } from "@/lib/copy/signal/labels";
import {
  CALIBRATION_BASIS,
  CALIBRATION_INSUFFICIENT,
  calibrationHitRateText,
  calibrationInsufficientBasis,
} from "@/lib/copy/scorecard/labels";
import { VERDICT_LABEL, isBullishVerdict, isBearishVerdict } from "./verdictLabels";
import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";
import type { ConfidenceCalibration } from "@/lib/types/scorecard/scorecard";
import type { AxisKey, RuleDirection, SignalAction } from "@/lib/types/signal";

/**
 * verdict-forward 히어로(T4 항시-글랜스) — 판정 요약(노스스타 `.verdict` 히어로).
 *
 *   - 스트리밍/대기(`final` 없음): "판정 대기 중" + 가격 기반 결정론 시그널(점수·4축)을 채워
 *     12분 대기 동안 빈 화면을 막는다(최종 AI 판정은 완료 후 표시).
 *   - 완료(`final` 있음): 노스스타 `.verdict.buy` 처럼 좌측 4px 방향 바 + 방향-soft 배경 위에
 *     `.v-row1`(판정 라벨 + enum + 신뢰도 칩 + [saved]이전분석 태그 + 우측 신호강도) ·
 *     `.v-lvls`(목표/손절/손익비 흰 박스 3개) · `.v-meta`(기간 · 현재가/시점가 · [live]상세 힌트).
 *
 * 전체 판정 상세(근거·전략·전망·강점/리스크)는 `VerdictDetails` 가 히어로 아래에서 담당한다(글랜스↔상세 분리).
 * `signal` 은 프레젠테이션 prop — 라이브는 `useSignalResult`, 저장모드는 스냅샷 시그널을 그대로 넘겨 재사용.
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
  /** "live"(v-meta 현재가·상세 힌트) / "saved"(분석 시점가). 기본 live. */
  mode?: "live" | "saved";
  /** 라이브 현재가(원) — live 모드 v-meta "현재가". saved 모드는 final.base_price 를 쓴다. */
  livePrice?: number | null;
  /** saved 모드에서 이전(과거) 분석 태그를 노출할지 — 재분석 권유(stale) 시 true. */
  stale?: boolean;
  /** 보정 신뢰도(scorecard-feedback) — v-meta 실측 적중률 배지. null 이면 미표시. */
  calibration?: ConfidenceCalibration | null;
  /** 표본 부족 안내 문구에 노출할 게이트 기준 표본수. */
  calibrationMinSampleN?: number;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

/**
 * 대기 게이지 한 축 — 노스스타 `.sig .axis`. 라벨(muted) + 값(muted bold) + 진행바.
 * 대기 상태의 결정론 시그널은 '방향'이 아닌 '강도' 프리뷰라 노스스타처럼 바를 accent 그라데이션으로
 * 통일하고(방향 색 분기 없음), 실제 방향·매수/매도 색은 완료 후 `DoneHero` 가 담당한다.
 */
function AxisMini({ axis, score }: { axis: AxisKey; score: number }) {
  return (
    <div className="min-w-0">
      {/* `.a-lab` — 라벨 + 값. */}
      <div className="mb-xs flex items-center justify-between gap-xs">
        <span className="truncate text-caption text-text-muted">{AXIS_LABEL[axis]}</span>
        <span className="text-caption font-bold tabular-nums text-text-muted">
          {score.toFixed(0)}
        </span>
      </div>
      {/* `.bar`(h5 surface) + `>i`(그라데이션 #9db8e6→accent 근사 = accent-vivid/40→accent-vivid). */}
      <div className="h-1.5 overflow-hidden rounded-pill bg-surface-muted">
        {/* 채움 폭은 점수(0~100) 동적 계산 — 인라인 style 허용 범위(토큰 hex/px 직타 아님). */}
        <div
          className="h-full rounded-pill bg-gradient-to-r from-accent-vivid/40 to-accent-vivid"
          style={{ width: `${clampPct(score)}%` }}
        />
      </div>
    </div>
  );
}

/** %값 → basePrice 있으면 "절대가격 +N%", 없으면 "±N%". FinalVerdict 표기 규칙 정합. */
function lvlValue(pct: number, basePrice: number | null, colorClass: string): ReactNode {
  const pctStr = `${pct > 0 ? "+" : ""}${pct}%`;
  if (basePrice == null) {
    return (
      <span className={cn("text-mono-numeric font-extrabold tabular-nums", colorClass)}>{pctStr}</span>
    );
  }
  const price = roundToKrxTick(basePrice * (1 + pct / 100));
  return (
    <span className="flex items-baseline gap-1 whitespace-nowrap">
      <span className={cn("text-mono-numeric font-extrabold tabular-nums", colorClass)}>
        {price.toLocaleString("ko-KR")}
      </span>
      <span className="text-caption font-medium text-text-muted">{pctStr}</span>
    </span>
  );
}

/** v-lvls 한 칸 — 라벨(위) + 값(아래) 반투명 흰 박스. */
function LvlBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    // 노스스타 `.v-lvls .lvl{background:rgba(255,255,255,.6)}` — 히어로 그라데이션이 비치는 반투명 흰 박스.
    <div className="rounded-sm border border-border-line bg-surface/60 px-md py-sm">
      <div className="text-caption text-text-muted">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
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
    // 노스스타 `.verdict.pending` — 완료 히어로와 같은 verdict 패밀리(rounded-md·border·좌측 바, 그림자 없음).
    <div className="relative overflow-hidden rounded-md border border-border-line bg-surface-muted p-lg">
      {/* `.verdict.pending::before` — 옅은 좌측 4px 바(대기: border 톤). */}
      <div className="absolute inset-y-0 left-0 w-1 bg-border-line" aria-hidden="true" />
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

/** 완료 히어로 — 노스스타 `.verdict.buy` 글랜스(라벨·신호강도·목표/손절/손익비·기간·현재가). */
function DoneHero({
  final,
  signal,
  mode,
  livePrice,
  stale,
  calibration,
  calibrationMinSampleN,
}: {
  final: FinalDecision;
  signal: HeroSignal | null;
  mode: "live" | "saved";
  livePrice: number | null;
  stale: boolean;
  calibration: ConfidenceCalibration | null;
  calibrationMinSampleN?: number;
}) {
  const bullish = isBullishVerdict(final.verdict);
  const bearish = isBearishVerdict(final.verdict);
  const isSaved = mode === "saved";

  // 방향 색 토큰 — 좌측 4px 바(absolute 스트립)·배경 그라데이션·테두리·강조 텍스트.
  // 노스스타 `.verdict.buy{background:linear-gradient(180deg,#fff6f7,#fffdfd)}` → 방향-soft → surface 세로 그라데이션.
  const dirBar = bullish ? "bg-signal-up" : bearish ? "bg-signal-down" : "bg-text-muted";
  const dirGradient = bullish
    ? "bg-gradient-to-b from-signal-up-soft to-surface"
    : bearish
      ? "bg-gradient-to-b from-signal-down-soft to-surface"
      : "bg-gradient-to-b from-surface-muted to-surface";
  const dirBorder = bullish
    ? "border-signal-up-soft"
    : bearish
      ? "border-signal-down-soft"
      : "border-border-line";
  const dirText = bullish ? "text-signal-up" : bearish ? "text-signal-down" : "text-text-strong";

  const basePrice =
    typeof final.base_price === "number" && final.base_price > 0 ? final.base_price : null;
  const hasRR = final.risk_reward_ratio !== null;
  const targetIsReentry = final.target_pct !== null && final.target_pct < 0;
  // v-meta 가격 — live=현재가(prop) / saved=분석 시점가(base_price).
  const metaPrice = isSaved ? basePrice : livePrice;
  const metaPriceLabel = isSaved ? COPY.hero.metaBasePrice : COPY.hero.metaLivePrice;

  return (
    <div className={cn("relative overflow-hidden rounded-md border p-lg", dirGradient, dirBorder)}>
      {/* 노스스타 `.verdict::before` — 좌측 4px 방향 바(absolute 스트립). overflow-hidden 로 클립돼
          border-l-4 처럼 라운드 코너에서 휘지 않고 직선으로 떨어진다. */}
      <div className={cn("absolute inset-y-0 left-0 w-1", dirBar)} aria-hidden="true" />
      {/* .v-row1 — 판정 라벨 + enum + 신뢰도 칩 + [saved]이전분석 + 우측 신호강도. */}
      <div className="flex flex-wrap items-center gap-x-sm gap-y-xs">
        <span className="flex items-baseline gap-1.5">
          <span className={cn("text-h1 font-extrabold leading-none", dirText)}>
            {VERDICT_LABEL[final.verdict]}
          </span>
          {/* 노스스타 `.badge small{opacity:.72}` — 판정색을 옅게(muted 회색 아님). */}
          <span className={cn("text-caption font-bold opacity-70", dirText)}>{final.verdict}</span>
        </span>

        {/* 신뢰도 칩(모델 confidence) — 신호강도가 우측 박스를 차지할 때만(중복 회피). 흰 pill 로 tint 위 대비. */}
        {signal && (
          <span className={cn("rounded-pill bg-surface px-sm py-0.5 text-caption font-bold", dirText)}>
            {COPY.verdict.confidenceShort} {COPY.verdict.confidenceValue(final.confidence)}
          </span>
        )}

        {/* 저장모드 stale — 이전(과거) 분석 태그. */}
        {isSaved && stale && (
          <span className="rounded-pill bg-surface px-sm py-0.5 text-caption font-bold text-text-muted">
            {COPY.hero.previousTag}
          </span>
        )}

        {/* 우측 신호강도(시그널 있으면) 또는 확신도 값 — 근거는 title. */}
        <div
          className="ml-auto flex flex-none flex-col items-end text-right"
          title={signal ? COPY.verdict.signalStrengthBasis : COPY.verdict.confidenceBasis}
        >
          <span className={cn("text-h1 font-extrabold leading-none tabular-nums", dirText)}>
            {signal ? Math.round(signal.score) : COPY.verdict.confidenceValue(final.confidence)}
          </span>
          <span className="mt-0.5 text-caption font-medium text-text-muted whitespace-nowrap">
            {signal ? COPY.verdict.signalStrengthShort : COPY.verdict.confidenceShort}
          </span>
        </div>
      </div>

      {/* .v-lvls — 목표/손절/손익비 흰 박스 3개(손익비 없으면 2개). */}
      <div className={cn("mt-md grid gap-2", hasRR ? "grid-cols-3" : "grid-cols-2")}>
        <LvlBox label={targetIsReentry ? COPY.verdict.reentryLabel : COPY.verdict.targetLabel}>
          {!final.target_pct ? (
            <span className="text-mono-numeric tabular-nums text-text-muted">—</span>
          ) : (
            lvlValue(
              final.target_pct,
              basePrice,
              final.target_pct > 0 ? "text-signal-up" : "text-signal-down",
            )
          )}
        </LvlBox>
        <LvlBox label={COPY.verdict.stopLossLabel}>
          {lvlValue(final.stop_loss_pct, basePrice, "text-signal-down")}
        </LvlBox>
        {hasRR && (
          <LvlBox label={COPY.verdict.rrLabel}>
            <span className="text-mono-numeric font-extrabold tabular-nums text-text-strong">
              {final.risk_reward_ratio} : 1
            </span>
          </LvlBox>
        )}
      </div>

      {/* .v-meta — 기간 · 현재가/시점가 · [보정 신뢰도] · [live]상세 힌트. */}
      <div className="mt-md flex flex-wrap items-center gap-x-md gap-y-xs text-caption text-text-muted">
        <span>
          {COPY.hero.metaPeriod}{" "}
          <b className="font-bold text-text-strong">
            {COPY.verdict.horizonConcrete[final.time_horizon]}
          </b>
        </span>
        {metaPrice != null && (
          <span>
            {metaPriceLabel}{" "}
            <b className="font-bold tabular-nums text-text-strong">{formatNumber(metaPrice)}</b>
          </span>
        )}
        {calibration && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-pill px-sm py-0.5 text-caption font-medium",
              calibration.sufficient
                ? "bg-accent-vivid-soft text-accent-vivid"
                : "bg-surface text-text-muted",
            )}
            title={
              calibration.sufficient
                ? CALIBRATION_BASIS
                : calibrationInsufficientBasis(calibrationMinSampleN ?? calibration.sample)
            }
          >
            <BadgeCheck size={12} className="flex-shrink-0" />
            {calibration.sufficient
              ? calibrationHitRateText(calibration.hitRate, calibration.sample)
              : CALIBRATION_INSUFFICIENT}
          </span>
        )}
        {!isSaved && (
          <span className="inline-flex items-center gap-0.5">
            {COPY.hero.detailHint}
            <ChevronDown size={13} className="flex-shrink-0" />
          </span>
        )}
      </div>
    </div>
  );
}

export function VerdictHero({
  final,
  signal,
  doneCount,
  totalCount,
  mode = "live",
  livePrice = null,
  stale = false,
  calibration = null,
  calibrationMinSampleN,
}: VerdictHeroProps) {
  return (
    <motion.section
      aria-label={COPY.panel.title}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {final ? (
        <DoneHero
          final={final}
          signal={signal}
          mode={mode}
          livePrice={livePrice}
          stale={stale}
          calibration={calibration}
          calibrationMinSampleN={calibrationMinSampleN}
        />
      ) : (
        <PendingHero signal={signal} doneCount={doneCount} totalCount={totalCount} />
      )}
    </motion.section>
  );
}
