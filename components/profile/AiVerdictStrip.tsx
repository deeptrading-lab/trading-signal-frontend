/**
 * AiVerdictStrip — 종목 상세 차트 위 "AI 판정" 스트립. ai-verdict-chart-overlay.
 *
 * 저장된 AI 종합분석 결론이 있을 때만 차트 위에 뜬다. 판정 배지 + 신뢰도·기간 + 오버레이 토글을
 * 한 곳에 모으고, 토글 ON 이면 정확한 가격 레벨(목표/재진입·손절)을 **레전드 한 줄**로 보여준다
 * (차트 안엔 존·선만 그리고 숫자는 여기서 — y축 태그 겹침 회피, 모바일에서 줄바꿈).
 */

"use client";

import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/formatMoney";
import {
  VERDICT_LABEL,
  isBullishVerdict,
  isBearishVerdict,
} from "@/components/stock/ai-analysis/verdictLabels";
import type { AiVerdictLevels, AiLevelRole } from "@/lib/utils/aiVerdictLevels";
import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";

const ROLE_LABEL: Record<AiLevelRole, string> = { target: "목표", reentry: "재진입", stop: "손절" };
const ROLE_DOT: Record<AiLevelRole, string> = {
  target: "bg-signal-up",
  reentry: "bg-chart-signal", // 앰버 — 회색(안 보임)에서 변경, 차트 레벨 색과 일치
  stop: "bg-signal-down",
};
const CONFIDENCE_LABEL: Record<FinalDecision["confidence"], string> = {
  HIGH: "높음",
  MEDIUM: "중",
  LOW: "낮음",
};

function fmtPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

/** 전략 텍스트의 마크다운 `**볼드**` 만 굵게 렌더(무거운 마크다운 렌더러 없이 인라인 강조). */
function renderInlineBold(text: string): ReactNode[] {
  return text.split("**").map((seg, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-bold text-text-strong">
        {seg}
      </strong>
    ) : (
      <span key={i}>{seg}</span>
    ),
  );
}

export interface AiVerdictStripProps {
  levels: AiVerdictLevels;
  decision: FinalDecision;
  show: boolean;
  onToggle: (next: boolean) => void;
}

export function AiVerdictStrip({ levels, decision, show, onToggle }: AiVerdictStripProps) {
  const verdictColor = isBullishVerdict(decision.verdict)
    ? "text-signal-up"
    : isBearishVerdict(decision.verdict)
      ? "text-signal-down"
      : "text-text-strong";

  const rows = useMemo(() => {
    const r: { role: AiLevelRole; price: number; pct: number }[] = [];
    if (levels.target) r.push({ role: levels.target.role, price: levels.target.price, pct: levels.target.pct });
    r.push({ role: "stop", price: levels.stop.price, pct: levels.stop.pct });
    return r;
  }, [levels]);

  return (
    <div className="mb-md flex flex-col gap-sm rounded-md bg-surface-muted px-md py-sm">
      {/* 1행 — 판정 배지 + 신뢰도·기간 + 오버레이 토글 */}
      <div className="flex flex-wrap items-center gap-x-md gap-y-xs text-caption">
        <span className={cn("font-bold", verdictColor)}>AI · {VERDICT_LABEL[decision.verdict]}</span>
        <span className="text-text-muted">
          신뢰도 {CONFIDENCE_LABEL[decision.confidence]} · {decision.time_horizon}
        </span>
        {/* 실제 스위치(트랙+노브) — 켜짐/꺼짐이 시각적으로 명확. 라벨은 고정. */}
        <button
          type="button"
          role="switch"
          aria-checked={show}
          aria-label="차트에 판정 레벨 표시"
          onClick={() => onToggle(!show)}
          className="ml-auto inline-flex cursor-pointer items-center gap-sm text-caption font-medium text-text-strong"
        >
          <span>차트에 표시</span>
          <span
            className={cn(
              "relative inline-flex h-4 w-7 items-center rounded-pill transition-colors",
              show ? "bg-accent-vivid" : "bg-border-line",
            )}
          >
            <span
              className={cn(
                "inline-block h-3 w-3 rounded-pill bg-surface shadow-sm transition-transform",
                show ? "translate-x-[14px]" : "translate-x-[2px]",
              )}
            />
          </span>
        </button>
      </div>

      {/* 2행 — 레벨 레전드(정확한 가격) + 손익비. 토글 ON 일 때만. 값이 핵심이라 한 단계 키움. */}
      {show ? (
        <div className="flex flex-wrap items-center gap-x-md gap-y-xs text-body-sm tabular-nums">
          {rows.map((row) => (
            <span key={row.role} className="inline-flex items-center gap-xs">
              <span className={cn("h-2.5 w-2.5 rounded-pill", ROLE_DOT[row.role])} aria-hidden="true" />
              <span className="text-text-muted">{ROLE_LABEL[row.role]}</span>
              <span className="font-bold text-text-strong">{formatMoney(row.price)}</span>
              <span className="text-text-muted">({fmtPct(row.pct)})</span>
            </span>
          ))}
          {decision.risk_reward_ratio != null ? (
            <span className="text-text-muted">손익비 {decision.risk_reward_ratio.toFixed(1)} : 1</span>
          ) : null}
          <span className="text-text-muted">· 분석 시점 {formatMoney(levels.basePrice)}</span>
        </div>
      ) : null}

      {/* 3행 — 신규 진입 / 보유자 전략(레벨의 맥락). 토글 ON 일 때만. */}
      {show && (decision.new_entry_strategy || decision.holder_strategy) ? (
        <div className="flex flex-col gap-0.5 text-caption text-text-muted">
          {decision.new_entry_strategy ? (
            <p>
              <span className="font-medium text-text-strong">신규 진입</span> ·{" "}
              {renderInlineBold(decision.new_entry_strategy)}
            </p>
          ) : null}
          {decision.holder_strategy ? (
            <p>
              <span className="font-medium text-text-strong">보유 중</span> ·{" "}
              {renderInlineBold(decision.holder_strategy)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
