"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Minus, Info, BadgeCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { roundToKrxTick } from "@/lib/utils/krxTick";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import {
  CALIBRATION_BASIS,
  CALIBRATION_INSUFFICIENT,
  calibrationHitRateText,
  calibrationInsufficientBasis,
} from "@/lib/copy/scorecard/labels";
import type { DecisionSignal, FinalDecision, FinalVerdict } from "@/lib/types/stock/aiAnalysis";
import type { ConfidenceCalibration } from "@/lib/types/scorecard/scorecard";

// 부호 숫자(+12.3%, -14.7 …) 또는 범위 구분자(~)를 토큰화.
// "-14.7~-18.6%" 처럼 굵은 본문 안에서 ~ 와 - 가 붙어 구분이 어려운 문제를 풀기 위해,
// 부호 숫자는 KR 등락 색(+빨강/−파랑)으로, ~ 는 비굵게·연하게·좌우 여백으로 분리한다.
const INLINE_TOKEN = /([+-]\d[\d,]*(?:\.\d+)?%?)|([~∼〜])/g;

/** 한 텍스트 런(굵기 동일 구간)을 부호 숫자 색·범위 구분자 분리까지 적용해 노드 배열로. */
function renderRun(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_TOKEN.lastIndex = 0;
  while ((m = INLINE_TOKEN.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      // 앞 글자가 숫자면(예: 2024-2025) 부호가 아니라 범위/뺄셈 → 색 입히지 않음.
      const prev = text[m.index - 1];
      const isSign = !prev || !/[\d.]/.test(prev);
      nodes.push(
        isSign ? (
          <span
            key={`${keyBase}-n${m.index}`}
            className={cn(
              // KR 관례: +상승=signal-up(빨강) / −하락=signal-down(파랑). 토큰 자동 다크.
              m[1][0] === "+" ? "text-signal-up" : "text-signal-down",
            )}
          >
            {m[1]}
          </span>
        ) : (
          m[1]
        ),
      );
    } else {
      nodes.push(
        <span
          key={`${keyBase}-t${m.index}`}
          className="mx-0.5 font-normal text-text-muted"
        >
          {m[2]}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** **bold** 마크다운 + 부호 숫자 색/범위 구분자 분리를 처리하는 경량 인라인 렌더러. */
function InlineBold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-text-strong">
            {renderRun(part, `b${i}`)}
          </strong>
        ) : (
          <span key={i}>{renderRun(part, `p${i}`)}</span>
        ),
      )}
    </>
  );
}

// 행동형 라벨 — 기관 비중 용어 대신 개인 투자자 행동 중심(강세→약세 6단계).
// 분석 결과 카드(components/analyze/AIDecisionCard)도 동일 라벨/방향 판정을 재사용한다.
export const VERDICT_LABEL: Record<FinalVerdict, string> = {
  BUY: "적극 매수", OVERWEIGHT: "분할 매수", HOLD: "중립",
  UNDERWEIGHT: "신규 진입 주의", REDUCE: "분할 매도", SELL: "매도 / 회피",
};
export const isBullishVerdict = (v: FinalVerdict) => v === "BUY" || v === "OVERWEIGHT";
export const isBearishVerdict = (v: FinalVerdict) => v === "SELL" || v === "REDUCE" || v === "UNDERWEIGHT";

export function FinalVerdictCard({
  data,
  signal,
  calibration,
  calibrationMinSampleN,
}: {
  data: FinalDecision;
  /** 분석 시점 결정론 시그널 — 있으면 LLM 확신도 대신 "신호 강도" 표시. 라이브 패널은 미전달(폴백). */
  signal?: DecisionSignal | null;
  /**
   * 이 판정 confidence 버킷의 실측 보정값(scorecard-feedback (가), 표시 전용·판정 불변).
   * null/undefined 면 보정 줄을 그리지 않는다(데이터 게이팅 — 미설정·표본 없음 시 완전 무회귀).
   */
  calibration?: ConfidenceCalibration | null;
  /** 표본 부족 안내 문구에 노출할 게이트 기준 표본수. */
  calibrationMinSampleN?: number;
}) {
  const bullish = isBullishVerdict(data.verdict);
  const bearish = isBearishVerdict(data.verdict);
  const accentColor = bullish ? "red" : bearish ? "blue" : "slate";

  // KR 가격 위치 모델(위=빨강 상승, 아래=파랑 하락): 목표(상방)=signal-up / 손절·재진입(하방)=signal-down / 손익비=muted.
  const statCx = (color: "emerald" | "red" | "slate" | "blue") => cn(
    "flex items-center justify-between gap-sm rounded-md px-md py-sm",
    color === "emerald" && "bg-signal-up-soft",
    color === "red"     && "bg-signal-down-soft",
    color === "slate"   && "bg-surface-muted",
    color === "blue"    && "bg-signal-down-soft",
  );

  // target_pct·stop_loss_pct(%) 기준가. legacy(이 필드 추가 이전) 결정은 없음 → % 만 표기.
  const basePrice =
    typeof data.base_price === "number" && data.base_price > 0 ? data.base_price : null;

  // 한 줄 통계값: basePrice 있으면 "절대가격(±N%)", 없으면 "±N%".
  const renderPctStat = (pct: number, colorClass: string) => {
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
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* 탈-카드지만 결론은 payoff — 굵은 색 테두리·강한 그림자를 걷고 헤어라인 + 옅은 elevation 카드로 낮춘다.
          방향 정체성은 아이콘·라벨·배지 색으로만 전달(좌측 강조바·2.5px 컬러보더 제거). */}
      <div className="bg-surface rounded-xl border border-border-line shadow-card overflow-hidden relative">
        <div className={cn(
          "absolute top-0 right-0 text-surface text-caption font-bold px-md py-1 rounded-bl-lg",
          bullish && "bg-signal-up",
          bearish && "bg-signal-down",
          !bullish && !bearish && "bg-text-muted",
        )}>
          {COPY.verdict.badge}
        </div>

        <div className="p-lg border-b border-border-line">
          <div className="mt-1.5 flex items-center gap-md">
            <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0",
              bullish && "bg-signal-up-soft",
              bearish && "bg-signal-down-soft",
              !bullish && !bearish && "bg-surface-muted",
            )}>
              {bullish && <TrendingUp className="text-signal-up" size={22} />}
              {bearish && <TrendingDown className="text-signal-down" size={22} />}
              {/* 중립 — 카드(AIDecisionCard)와 동일하게 Minus(평행선). 상승 화살표는 오해 소지. */}
              {!bullish && !bearish && <Minus className="text-text-muted" size={22} />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-h1 font-extrabold text-text-strong leading-tight">
                {VERDICT_LABEL[data.verdict]}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-sm gap-y-xs text-caption text-text-muted">
                <span className="flex items-center gap-1">
                  <TrendingUp size={13} /> {COPY.verdict.horizon(data.time_horizon)}
                </span>
                {calibration && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm px-sm py-0.5 text-caption font-medium",
                      calibration.sufficient
                        ? "bg-accent-vivid-soft text-accent-vivid"
                        : "bg-surface-muted text-text-muted",
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
              </div>
            </div>
            {/* 핵심 지표 — 신호 강도(또는 확신도)를 헤더 우측에 강조 박스로. 근거는 tooltip. */}
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-md px-md py-xs flex-shrink-0 min-w-16",
                bullish && "bg-signal-up-soft",
                bearish && "bg-signal-down-soft",
                !bullish && !bearish && "bg-surface-muted",
              )}
              title={signal ? COPY.verdict.signalStrengthBasis : COPY.verdict.confidenceBasis}
            >
              <span className={cn(
                "font-extrabold leading-none tabular-nums",
                signal ? "text-display" : "text-h2",
                bullish && "text-signal-up",
                bearish && "text-signal-down",
                !bullish && !bearish && "text-text-strong",
              )}>
                {signal
                  ? Math.round(signal.score)
                  : COPY.verdict.confidenceValue(data.confidence)}
              </span>
              <span className="mt-0.5 text-caption font-medium text-text-muted whitespace-nowrap">
                {signal ? COPY.verdict.signalStrengthShort : COPY.verdict.confidenceShort}
              </span>
            </div>
          </div>
          {data.limitedData && (
            <div className="mt-md flex items-start gap-1.5 rounded-md bg-warn-soft px-md py-sm text-caption font-medium text-warn">
              <AlertTriangle size={14} className="mt-px flex-shrink-0" />
              <span>{COPY.verdict.limitedData(data.bars)}</span>
            </div>
          )}
          <p className="mt-lg text-body-sm text-text-strong leading-relaxed">
            <InlineBold text={data.reasoning} />
          </p>
        </div>

        <div className="px-lg py-md border-b border-border-line space-y-md">
          <h4 className={cn(
            "text-label-sm flex items-center gap-1.5",
            accentColor === "red"   && "text-signal-up",
            accentColor === "blue"  && "text-signal-down",
            accentColor === "slate" && "text-text-muted",
          )}>
            {COPY.verdict.executionGuide}
          </h4>

          {/* 신규 진입자 / 기존 보유자 가이드 분리 */}
          {data.new_entry_strategy && (
            <div className="bg-surface-muted rounded-md px-md py-sm">
              <p className="text-label-sm text-text-strong mb-0.5">{COPY.verdict.newEntryLabel}</p>
              <p className="text-body-sm text-text-strong leading-relaxed">
                <InlineBold text={data.new_entry_strategy} />
              </p>
            </div>
          )}
          {data.holder_strategy && (
            <div className="bg-surface-muted rounded-md px-md py-sm">
              <p className="text-label-sm text-text-strong mb-0.5">{COPY.verdict.holderLabel}</p>
              <p className="text-body-sm text-text-strong leading-relaxed">
                <InlineBold text={data.holder_strategy} />
              </p>
            </div>
          )}

          {/* 손익비는 값이 있을 때만 노출 — 없으면(진입 없음 등) 칸을 빼고 2열로. */}
          <div
            className={cn(
              "grid grid-cols-1 gap-sm",
              data.risk_reward_ratio !== null
                ? "sm:grid-cols-3"
                : "sm:grid-cols-2",
            )}
          >
            <div className={statCx(data.target_pct !== null && data.target_pct < 0 ? "blue" : "emerald")}>
              <span className="text-body-sm-strong text-text-strong whitespace-nowrap">
                {data.target_pct !== null && data.target_pct < 0
                  ? COPY.verdict.reentryLabel
                  : COPY.verdict.targetLabel}
              </span>
              {!data.target_pct ? (
                <span className="text-mono-numeric text-text-muted tabular-nums">—</span>
              ) : (
                renderPctStat(
                  data.target_pct,
                  data.target_pct > 0 ? "text-signal-up" : "text-signal-down",
                )
              )}
            </div>
            <div className={statCx("red")}>
              <span className="text-body-sm-strong text-text-strong whitespace-nowrap">{COPY.verdict.stopLossLabel}</span>
              {renderPctStat(data.stop_loss_pct, "text-signal-down")}
            </div>
            {data.risk_reward_ratio !== null && (
              <div className={statCx("slate")}>
                <span className="text-body-sm-strong text-text-strong whitespace-nowrap">{COPY.verdict.rrLabel}</span>
                <span className="text-mono-numeric text-text-strong tabular-nums">
                  {data.risk_reward_ratio} : 1
                </span>
              </div>
            )}
          </div>
        </div>

        {(data.short_term_outlook || data.mid_term_outlook) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border-line border-b border-border-line">
            {data.short_term_outlook && (
              <div className="px-md py-md space-y-1">
                <p className="text-label-sm text-text-strong">{COPY.verdict.shortTermLabel}</p>
                <p className="text-caption text-text-muted leading-relaxed"><InlineBold text={data.short_term_outlook} /></p>
              </div>
            )}
            {data.mid_term_outlook && (
              <div className="px-md py-md space-y-1">
                <p className="text-label-sm text-text-strong">{COPY.verdict.midTermLabel}</p>
                <p className="text-caption text-text-muted leading-relaxed"><InlineBold text={data.mid_term_outlook} /></p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border-line bg-surface-muted">
          {data.key_strengths.length > 0 && (
            <div className="p-lg">
              <h4 className="text-label-sm text-signal-up mb-sm flex items-center gap-1">
                <TrendingUp size={14} /> {COPY.verdict.strengths}
              </h4>
              <ul className="text-body-sm space-y-sm text-text-strong">
                {data.key_strengths.map((s, i) => (
                  <li key={i} className="flex gap-sm"><span className="text-signal-up font-bold shrink-0">↑</span><span className="min-w-0 leading-relaxed"><InlineBold text={s} /></span></li>
                ))}
              </ul>
            </div>
          )}
          {data.key_risks.length > 0 && (
            <div className="p-lg">
              <h4 className="text-label-sm text-signal-down mb-sm flex items-center gap-1">
                <TrendingDown size={14} /> {COPY.verdict.risks}
              </h4>
              <ul className="text-body-sm space-y-sm text-text-strong">
                {data.key_risks.map((r, i) => (
                  <li key={i} className="flex gap-sm"><span className="text-signal-down font-bold shrink-0">↓</span><span className="min-w-0 leading-relaxed"><InlineBold text={r} /></span></li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-lg py-md bg-surface-muted text-caption text-text-muted flex items-start gap-1.5">
          <Info size={12} className="flex-shrink-0 mt-0.5" />
          <p>{COPY.verdict.disclaimer}</p>
        </div>
      </div>
    </motion.div>
  );
}
