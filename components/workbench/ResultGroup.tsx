/**
 * 결과 영역 컨테이너 — 분석 응답 6블록 매핑 + 4상태(empty/loading/success/error).
 *
 * DESIGN.md 결정한 카드 순서 (위→아래):
 *   1. action (`card-elevated`)
 *   2. warnings (있을 때만)
 *   3. feasibility (UNREALISTIC 면 강조)
 *   4. brief
 *   5. risk_plan
 *   6. horizons
 */

import type { ApiError } from "@/lib/api/errors";
import type { AnalyzeResponse } from "@/lib/types/workbench";
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
    return (
      <div className="resultGroup">
        <ActionCard
          action={analysis.action}
          reason={analysis.ai_summary ?? null}
        />
        <WarningsCard warnings={analysis.warnings} />
        <FeasibilityCard
          feasibility={analysis.feasibility}
          annualizedTargetReturnPct={analysis.annualized_target_return_pct}
          targetReturnPct={analysis.input.target_return_pct}
          targetPeriodDays={analysis.input.target_period_days}
        />
        <BriefCard
          brief={analysis.brief}
          action={analysis.action}
          currency={currency}
        />
        <RiskPlanCard
          riskPlan={analysis.risk_plan}
          currency={currency}
          isUnrealistic={isUnrealistic}
        />
        <HorizonsCard horizons={analysis.horizons} />
      </div>
    );
  }
  return <EmptyState />;
}
