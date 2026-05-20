/**
 * 결과 영역 컨테이너 — 분석 응답 6블록 매핑 + 4상태(empty/loading/success/error).
 *
 * 카드 순서 (DESIGN.md):
 *   모바일 / 태블릿 (`< lg`) — 한 컬럼 세로 스택 (PR #11 무회귀):
 *     1. action
 *     2. warnings (있을 때만)
 *     3. feasibility
 *     4. brief
 *     5. risk_plan
 *     6. horizons
 *   데스크탑 (`>= lg`) — 비대칭 2 컬럼 grid (DESIGN.md v2 §Desktop 레이아웃 가이드):
 *     행 1: action 전폭
 *     행 2: feasibility + warnings (warnings 빈 배열이면 feasibility 풀폭)
 *     행 3: brief + risk_plan
 *     행 4: horizons 전폭
 *
 * 모바일·데스크탑 DOM 순서가 다르므로(warnings 위치) `useBreakpoint` 로 JS 분기 — 본 PRD 의
 * sanity check 활용처 1건 (PRD §3.4 / §9 RESOLVED 후보 (c) "warnings 모바일 위치 ↔ 데스크탑 위치").
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
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";

type Props = {
  state: "empty" | "loading" | "success" | "error";
  data?: AnalyzeResponse | null;
  error?: ApiError | null;
  onRetry: () => void;
};

export function ResultGroup({ state, data, error, onRetry }: Props) {
  const { isDesktop } = useBreakpoint();

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

    const actionCard = (
      <ActionCard
        action={analysis.action}
        reason={analysis.ai_summary ?? null}
      />
    );
    const warningsCard = <WarningsCard warnings={analysis.warnings} />;
    const feasibilityCard = (
      <FeasibilityCard
        feasibility={analysis.feasibility}
        annualizedTargetReturnPct={analysis.annualized_target_return_pct}
        targetReturnPct={analysis.input.target_return_pct}
        targetPeriodDays={analysis.input.target_period_days}
      />
    );
    const briefCard = (
      <BriefCard
        brief={analysis.brief}
        action={analysis.action}
        currency={currency}
      />
    );
    const riskPlanCard = (
      <RiskPlanCard
        riskPlan={analysis.risk_plan}
        currency={currency}
        isUnrealistic={isUnrealistic}
      />
    );
    const horizonsCard = <HorizonsCard horizons={analysis.horizons} />;

    if (isDesktop) {
      // 데스크탑 (>= lg) — 비대칭 2 컬럼 grid (DESIGN.md v2).
      return (
        <div className="grid gap-md mt-lg grid-cols-2 gap-x-lg">
          <div className="col-span-2">{actionCard}</div>
          {hasWarnings ? (
            <>
              {feasibilityCard}
              {warningsCard}
            </>
          ) : (
            <div className="col-span-2">{feasibilityCard}</div>
          )}
          {briefCard}
          {riskPlanCard}
          <div className="col-span-2">{horizonsCard}</div>
        </div>
      );
    }

    // 모바일 / 태블릿 (< lg) — 한 컬럼 세로 스택 (PR #11 무회귀, AC-4).
    return (
      <div className="grid gap-md mt-lg">
        {actionCard}
        {warningsCard}
        {feasibilityCard}
        {briefCard}
        {riskPlanCard}
        {horizonsCard}
      </div>
    );
  }
  return <EmptyState />;
}
