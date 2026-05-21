/**
 * 결과 영역 컨테이너 — 분석 응답 6블록 매핑 + 4상태(empty/loading/success/error).
 *
 * v4 layout-redesign 위계 (DESIGN.md v4 §Layout R3 결정 — 인지 흐름 우선):
 *   1. ActionCard           (전폭, 최상단)
 *   2. BriefCard            (전폭, Action 의 근거)
 *   3. FeasibilityCard + HorizonsCard  (데스크탑 2-col / 모바일 세로 스택)
 *   4. RiskPlanCard         (전폭, 실행 계획)
 *   5. WarningsCard         (전폭, 최하단 — 빈 배열이면 hidden)
 *
 * v3 의 비대칭 grid (`feasibility + warnings`, `brief + risk_plan`) 폐기.
 * 본 컴포넌트는 자식 컴포넌트 내부 구조는 변경하지 않는다 (PRD §3.5 무회귀, AC-15).
 * grid 분기는 Tailwind 반응형 prefix 로만 — `useBreakpoint` JS 분기 제거 (CSS 1차 도구 원칙).
 */

"use client";

import type { ApiError } from "@/lib/api/errors";
import type { AnalyzeResponse } from "@/lib/types/workbench/analyze";
import { ActionCard } from "@/components/workbench/ActionCard";
import { BriefCard } from "@/components/workbench/BriefCard";
import { EmptyState } from "@/components/workbench/EmptyState";
import { ErrorCard } from "@/components/workbench/ErrorCard";
import { FeasibilityCard } from "@/components/workbench/FeasibilityCard";
import { HorizonsCard } from "@/components/workbench/HorizonsCard";
import { LoadingSkeleton } from "@/components/workbench/LoadingSkeleton";
import { RiskPlanCard } from "@/components/workbench/RiskPlanCard";
import { WarningsCard } from "@/components/workbench/WarningsCard";

type Props = {
  state: "empty" | "loading" | "success" | "error";
  data?: AnalyzeResponse | null;
  error?: ApiError | null;
  onRetry: () => void;
};

export function ResultGroup({ state, data, error, onRetry }: Props) {
  if (state === "empty") {
    return <EmptyState />;
  }
  if (state === "loading") {
    return <LoadingSkeleton />;
  }
  if (state === "error" && error) {
    return <ErrorCard error={error} onRetry={onRetry} />;
  }
  if (state === "success" && data) {
    const analysis = data.analysis;
    const isUnrealistic =
      typeof analysis.feasibility === "string" &&
      analysis.feasibility.toUpperCase() === "UNREALISTIC";
    const currency = analysis.whitelist_entry?.currency;
    const hasWarnings =
      Array.isArray(analysis.warnings) && analysis.warnings.length > 0;

    return (
      <div className="grid gap-md mt-lg">
        {/* 1. ActionCard — 전폭, 최상단. */}
        <ActionCard
          action={analysis.action}
          reason={analysis.ai_summary ?? null}
        />

        {/* 2. BriefCard — 전폭, Action 의 근거. */}
        <BriefCard
          brief={analysis.brief}
          action={analysis.action}
          currency={currency}
        />

        {/* 3. Feasibility + Horizons — 데스크탑 2-col / 모바일 세로 스택. */}
        <div className="grid gap-md grid-cols-1 lg:grid-cols-2">
          <FeasibilityCard
            feasibility={analysis.feasibility}
            annualizedTargetReturnPct={analysis.annualized_target_return_pct}
            targetReturnPct={analysis.input.target_return_pct}
            targetPeriodDays={analysis.input.target_period_days}
          />
          <HorizonsCard horizons={analysis.horizons} />
        </div>

        {/* 4. RiskPlanCard — 전폭, 실행 계획. */}
        <RiskPlanCard
          riskPlan={analysis.risk_plan}
          currency={currency}
          isUnrealistic={isUnrealistic}
        />

        {/* 5. WarningsCard — 전폭, 최하단. 빈 배열이면 컴포넌트 내부에서 hidden. */}
        {hasWarnings ? <WarningsCard warnings={analysis.warnings} /> : null}
      </div>
    );
  }
  return <EmptyState />;
}
