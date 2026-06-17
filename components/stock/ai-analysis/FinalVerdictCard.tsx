"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Info, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { FinalDecision, FinalVerdict } from "@/lib/types/stock/aiAnalysis";

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
/** 신규 진입(롱) 자체가 없는 등급 — 손익비 "진입 없음" 표기용 */
const isNoEntryVerdict = (v: FinalVerdict) => v === "UNDERWEIGHT" || v === "REDUCE" || v === "SELL";

export function FinalVerdictCard({ data }: { data: FinalDecision }) {
  const bullish = isBullishVerdict(data.verdict);
  const bearish = isBearishVerdict(data.verdict);
  const accentColor = bullish ? "red" : bearish ? "blue" : "slate";

  const statCx = (color: "emerald" | "red" | "slate" | "blue") => cn(
    "flex flex-col items-center justify-center rounded-xl p-3 gap-0.5",
    color === "emerald" && "bg-emerald-50 dark:bg-emerald-950/20",
    color === "red"     && "bg-red-50 dark:bg-red-950/20",
    color === "slate"   && "bg-slate-100 dark:bg-slate-800/60",
    color === "blue"    && "bg-blue-50 dark:bg-blue-950/20",
  );

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
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
              bullish && "bg-red-100 dark:bg-red-900/30",
              bearish && "bg-blue-100 dark:bg-blue-900/30",
              !bullish && !bearish && "bg-slate-100 dark:bg-slate-800",
            )}>
              {bullish && <TrendingUp className="text-red-600 dark:text-red-400" size={24} />}
              {bearish && <TrendingDown className="text-blue-600 dark:text-blue-400" size={24} />}
              {!bullish && !bearish && <TrendingUp className="text-slate-500" size={24} />}
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
                {VERDICT_LABEL[data.verdict]}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1" title={COPY.verdict.confidenceBasis}>
                  <BadgeCheck size={14} className="text-emerald-500" />
                  {COPY.verdict.confidence(data.confidence)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <TrendingUp size={14} /> {COPY.verdict.horizon(data.time_horizon)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                {COPY.verdict.confidenceBasis}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <InlineBold text={data.reasoning} />
          </p>
        </div>

        <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <h4 className={cn(
            "text-xs font-bold flex items-center gap-1.5",
            accentColor === "red"   && "text-red-600 dark:text-red-400",
            accentColor === "blue"  && "text-blue-600 dark:text-blue-400",
            accentColor === "slate" && "text-slate-600 dark:text-slate-400",
          )}>
            {COPY.verdict.executionGuide}
          </h4>

          {/* 신규 진입자 / 기존 보유자 가이드 분리 */}
          {data.new_entry_strategy && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2.5">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">{COPY.verdict.newEntryLabel}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <InlineBold text={data.new_entry_strategy} />
              </p>
            </div>
          )}
          {data.holder_strategy && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2.5">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">{COPY.verdict.holderLabel}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <InlineBold text={data.holder_strategy} />
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className={statCx(data.target_pct !== null && data.target_pct < 0 ? "blue" : "emerald")}>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {data.target_pct !== null && data.target_pct < 0
                  ? COPY.verdict.reentryLabel
                  : COPY.verdict.targetLabel}
                {!!data.target_pct && (
                  <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-normal">{COPY.verdict.targetHint}</span>
                )}
              </span>
              <span className={cn(
                "text-base font-extrabold",
                !data.target_pct && "text-slate-400",
                !!data.target_pct && data.target_pct > 0 && "text-emerald-600 dark:text-emerald-400",
                !!data.target_pct && data.target_pct < 0 && "text-blue-600 dark:text-blue-400",
              )}>
                {!data.target_pct
                  ? "—"
                  : data.target_pct > 0
                    ? `+${data.target_pct}%`
                    : `${data.target_pct}%`}
              </span>
            </div>
            <div className={statCx("red")}>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{COPY.verdict.stopLossLabel}</span>
              <span className="text-base font-extrabold text-red-600 dark:text-red-400">
                {data.stop_loss_pct}%
              </span>
            </div>
            <div className={statCx("slate")}>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{COPY.verdict.rrLabel}</span>
              {data.risk_reward_ratio !== null ? (
                <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  {data.risk_reward_ratio} : 1
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 leading-tight">
                  {isNoEntryVerdict(data.verdict)
                    ? "진입 없음"
                    : "—"}
                </span>
              )}
            </div>
          </div>
        </div>

        {(data.short_term_outlook || data.mid_term_outlook) && (
          <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
            {data.short_term_outlook && (
              <div className="p-4 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{COPY.verdict.shortTermLabel}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"><InlineBold text={data.short_term_outlook} /></p>
              </div>
            )}
            {data.mid_term_outlook && (
              <div className="p-4 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{COPY.verdict.midTermLabel}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"><InlineBold text={data.mid_term_outlook} /></p>
              </div>
            )}
          </div>
        )}

        <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
          {data.key_strengths.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                <TrendingUp size={14} /> {COPY.verdict.strengths}
              </h4>
              <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-300">
                {data.key_strengths.map((s, i) => (
                  <li key={i} className="flex gap-2"><span className="text-red-500 font-bold shrink-0">↑</span><span><InlineBold text={s} /></span></li>
                ))}
              </ul>
            </div>
          )}
          {data.key_risks.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                <TrendingDown size={14} /> {COPY.verdict.risks}
              </h4>
              <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-300">
                {data.key_risks.map((r, i) => (
                  <li key={i} className="flex gap-2"><span className="text-blue-500 font-bold shrink-0">↓</span><span><InlineBold text={r} /></span></li>
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
