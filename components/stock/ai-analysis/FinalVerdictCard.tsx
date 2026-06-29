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
              m[1][0] === "+"
                ? "text-red-600 dark:text-red-400"
                : "text-blue-600 dark:text-blue-400",
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
          className="mx-0.5 font-normal text-slate-400 dark:text-slate-500"
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
          <strong key={i} className="font-bold text-slate-900 dark:text-slate-100">
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

  const statCx = (color: "emerald" | "red" | "slate" | "blue") => cn(
    "flex items-center justify-between gap-1.5 rounded-xl px-3 py-2.5",
    color === "emerald" && "bg-emerald-50 dark:bg-emerald-950/20",
    color === "red"     && "bg-red-50 dark:bg-red-950/20",
    color === "slate"   && "bg-slate-100 dark:bg-slate-800/60",
    color === "blue"    && "bg-blue-50 dark:bg-blue-950/20",
  );

  // target_pct·stop_loss_pct(%) 기준가. legacy(이 필드 추가 이전) 결정은 없음 → % 만 표기.
  const basePrice =
    typeof data.base_price === "number" && data.base_price > 0 ? data.base_price : null;

  // 한 줄 통계값: basePrice 있으면 "절대가격(±N%)", 없으면 "±N%".
  const renderPctStat = (pct: number, colorClass: string) => {
    const pctStr = `${pct > 0 ? "+" : ""}${pct}%`;
    if (basePrice == null) {
      return <span className={cn("text-lg font-extrabold tabular-nums", colorClass)}>{pctStr}</span>;
    }
    const price = roundToKrxTick(basePrice * (1 + pct / 100));
    return (
      <span className="flex items-baseline gap-1 whitespace-nowrap">
        <span className={cn("text-lg font-extrabold tabular-nums", colorClass)}>
          {price.toLocaleString("ko-KR")}
        </span>
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">({pctStr})</span>
      </span>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className={cn(
        "bg-white dark:bg-slate-900 rounded-2xl border-[2.5px] shadow-lg overflow-hidden relative",
        bullish && "border-red-500",
        bearish && "border-blue-500",
        !bullish && !bearish && "border-slate-300 dark:border-slate-700",
      )}>
        <div className={cn(
          "absolute top-0 right-0 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl",
          bullish && "bg-red-500",
          bearish && "bg-blue-500",
          !bullish && !bearish && "bg-slate-500",
        )}>
          {COPY.verdict.badge}
        </div>

        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="mt-1.5 flex items-center gap-3">
            <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0",
              bullish && "bg-red-100 dark:bg-red-900/30",
              bearish && "bg-blue-100 dark:bg-blue-900/30",
              !bullish && !bearish && "bg-slate-100 dark:bg-slate-800",
            )}>
              {bullish && <TrendingUp className="text-red-600 dark:text-red-400" size={22} />}
              {bearish && <TrendingDown className="text-blue-600 dark:text-blue-400" size={22} />}
              {/* 중립 — 카드(AIDecisionCard)와 동일하게 Minus(평행선). 상승 화살표는 오해 소지. */}
              {!bullish && !bearish && <Minus className="text-slate-500" size={22} />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {VERDICT_LABEL[data.verdict]}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <TrendingUp size={13} /> {COPY.verdict.horizon(data.time_horizon)}
                </span>
                {calibration && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                      calibration.sufficient
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
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
                "flex flex-col items-center justify-center rounded-xl px-3.5 py-1.5 flex-shrink-0 min-w-[64px]",
                bullish && "bg-red-100 dark:bg-red-900/30",
                bearish && "bg-blue-100 dark:bg-blue-900/30",
                !bullish && !bearish && "bg-slate-100 dark:bg-slate-800",
              )}
              title={signal ? COPY.verdict.signalStrengthBasis : COPY.verdict.confidenceBasis}
            >
              <span className={cn(
                "font-extrabold leading-none tabular-nums",
                signal ? "text-[26px]" : "text-lg",
                bullish && "text-red-600 dark:text-red-400",
                bearish && "text-blue-600 dark:text-blue-400",
                !bullish && !bearish && "text-slate-700 dark:text-slate-200",
              )}>
                {signal
                  ? Math.round(signal.score)
                  : data.confidence === "HIGH" ? "높음" : data.confidence === "MEDIUM" ? "보통" : "낮음"}
              </span>
              <span className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {signal ? "신호 강도" : "확신도"}
              </span>
            </div>
          </div>
          {data.limitedData && (
            <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <AlertTriangle size={14} className="mt-px flex-shrink-0" />
              <span>{COPY.verdict.limitedData(data.bars)}</span>
            </div>
          )}
          <p className="mt-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <InlineBold text={data.reasoning} />
          </p>
        </div>

        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
          <h4 className={cn(
            "text-[13px] font-bold flex items-center gap-1.5",
            accentColor === "red"   && "text-red-600 dark:text-red-400",
            accentColor === "blue"  && "text-blue-600 dark:text-blue-400",
            accentColor === "slate" && "text-slate-600 dark:text-slate-400",
          )}>
            {COPY.verdict.executionGuide}
          </h4>

          {/* 신규 진입자 / 기존 보유자 가이드 분리 */}
          {data.new_entry_strategy && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2">
              <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 mb-0.5">{COPY.verdict.newEntryLabel}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <InlineBold text={data.new_entry_strategy} />
              </p>
            </div>
          )}
          {data.holder_strategy && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2">
              <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 mb-0.5">{COPY.verdict.holderLabel}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <InlineBold text={data.holder_strategy} />
              </p>
            </div>
          )}

          {/* 손익비는 값이 있을 때만 노출 — 없으면(진입 없음 등) 칸을 빼고 2열로. */}
          <div
            className={cn(
              "grid grid-cols-1 gap-2",
              data.risk_reward_ratio !== null
                ? "sm:grid-cols-3"
                : "sm:grid-cols-2",
            )}
          >
            <div className={statCx(data.target_pct !== null && data.target_pct < 0 ? "blue" : "emerald")}>
              <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap">
                {data.target_pct !== null && data.target_pct < 0
                  ? COPY.verdict.reentryLabel
                  : COPY.verdict.targetLabel}
              </span>
              {!data.target_pct ? (
                <span className="text-lg font-extrabold text-slate-400 tabular-nums">—</span>
              ) : (
                renderPctStat(
                  data.target_pct,
                  data.target_pct > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-blue-600 dark:text-blue-400",
                )
              )}
            </div>
            <div className={statCx("red")}>
              <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap">{COPY.verdict.stopLossLabel}</span>
              {renderPctStat(data.stop_loss_pct, "text-red-600 dark:text-red-400")}
            </div>
            {data.risk_reward_ratio !== null && (
              <div className={statCx("slate")}>
                <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap">{COPY.verdict.rrLabel}</span>
                <span className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
                  {data.risk_reward_ratio} : 1
                </span>
              </div>
            )}
          </div>
        </div>

        {(data.short_term_outlook || data.mid_term_outlook) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
            {data.short_term_outlook && (
              <div className="px-4 py-3 space-y-1">
                <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{COPY.verdict.shortTermLabel}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"><InlineBold text={data.short_term_outlook} /></p>
              </div>
            )}
            {data.mid_term_outlook && (
              <div className="px-4 py-3 space-y-1">
                <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{COPY.verdict.midTermLabel}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"><InlineBold text={data.mid_term_outlook} /></p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {data.key_strengths.length > 0 && (
            <div className="p-5">
              <h4 className="text-[13px] font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                <TrendingUp size={14} /> {COPY.verdict.strengths}
              </h4>
              <ul className="text-sm space-y-1.5 text-slate-600 dark:text-slate-300">
                {data.key_strengths.map((s, i) => (
                  <li key={i} className="flex gap-2"><span className="text-red-500 font-bold shrink-0">↑</span><span className="min-w-0 leading-relaxed"><InlineBold text={s} /></span></li>
                ))}
              </ul>
            </div>
          )}
          {data.key_risks.length > 0 && (
            <div className="p-5">
              <h4 className="text-[13px] font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                <TrendingDown size={14} /> {COPY.verdict.risks}
              </h4>
              <ul className="text-sm space-y-1.5 text-slate-600 dark:text-slate-300">
                {data.key_risks.map((r, i) => (
                  <li key={i} className="flex gap-2"><span className="text-blue-500 font-bold shrink-0">↓</span><span className="min-w-0 leading-relaxed"><InlineBold text={r} /></span></li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-5 py-3 bg-slate-100 dark:bg-slate-950 text-[10px] text-slate-400 flex items-start gap-1.5">
          <Info size={12} className="flex-shrink-0 mt-0.5" />
          <p>{COPY.verdict.disclaimer}</p>
        </div>
      </div>
    </motion.div>
  );
}
