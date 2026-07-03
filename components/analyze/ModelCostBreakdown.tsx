/**
 * 모델별 비용 분해 — "분석 1회 $N 중 opus·sonnet·haiku가 각각 얼마"를 모델 단위로 보여준다.
 * 비용은 CLI 청구값 합산 기준이라 위 "분석 1회 평균 비용" 카드와 합이 일치한다.
 * 막대(비용 비중) + 표로, 관리자가 "어디에 돈이 가나"를 한눈에 본다.
 */

"use client";

import type { AgentUsageRow } from "@/lib/types/stock/agentUsage";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Section } from "@/components/ui/Section";
import { agentLabel, fmtCostRounded, fmtRate, fmtTokens } from "./format";
import { groupByModel } from "./modelBreakdown";
import {
  MODEL_COL_AGENTS,
  MODEL_COL_COST,
  MODEL_COL_INPUT,
  MODEL_COL_MODEL,
  MODEL_COL_OUTPUT,
  MODEL_COL_SHARE,
  MODEL_COST_HINT,
  MODEL_COST_TITLE,
} from "@/lib/copy/analyze/labels";

export function ModelCostBreakdown({ rows }: { rows: AgentUsageRow[] }) {
  const groups = groupByModel(rows);
  if (groups.length === 0) return null;

  return (
    <Section
      aria-label={MODEL_COST_TITLE}
      title={
        <span className="inline-flex items-center gap-xs">
          {MODEL_COST_TITLE}
          <InfoTooltip label={MODEL_COST_HINT} />
        </span>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border-line">
              <th scope="col" className="py-md pr-md text-label-sm text-text-muted">
                {MODEL_COL_MODEL}
              </th>
              <Th>{MODEL_COL_AGENTS}</Th>
              <Th>{MODEL_COL_INPUT}</Th>
              <Th>{MODEL_COL_OUTPUT}</Th>
              <Th>{MODEL_COL_COST}</Th>
              <th
                scope="col"
                className="py-md pl-md text-right text-label-sm text-text-muted min-w-[8rem]"
              >
                {MODEL_COL_SHARE}
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.family} className="border-b border-border-line hover:bg-surface-muted">
                <td className="py-md pr-md text-body-sm-strong text-text-strong whitespace-nowrap tabular-nums">
                  {g.family}
                </td>
                <td
                  className="py-md pl-md text-right text-body-sm text-text-strong tabular-nums"
                  title={g.agentKeys.map(agentLabel).join(", ")}
                >
                  {g.agentCount}
                </td>
                <Num value={fmtTokens(g.totalInput)} />
                <Num value={fmtTokens(g.totalOutput)} />
                <Num value={fmtCostRounded(g.totalCost)} strong />
                <td className="py-md pl-md min-w-[8rem]">
                  <ShareBar share={g.costShare} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/** 비용 비중 막대 + 백분율. share=null(미측정)이면 "—"만. */
function ShareBar({ share }: { share: number | null }) {
  if (share == null) {
    return <span className="block text-right text-body-sm text-text-muted">—</span>;
  }
  const pct = Math.max(0, Math.min(1, share)) * 100;
  return (
    <div className="flex items-center gap-sm">
      <div className="h-[6px] flex-1 overflow-hidden rounded-pill bg-accent-vivid-soft">
        <div className="h-full rounded-pill bg-accent-vivid" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-body-sm text-text-strong tabular-nums">
        {fmtRate(share)}
      </span>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="py-md pl-md text-right text-label-sm text-text-muted whitespace-nowrap">
      {children}
    </th>
  );
}

function Num({ value, strong }: { value: string; strong?: boolean }) {
  return (
    <td
      className={
        strong
          ? "py-md pl-md text-right text-body-sm-strong text-text-strong tabular-nums whitespace-nowrap"
          : "py-md pl-md text-right text-body-sm text-text-strong tabular-nums whitespace-nowrap"
      }
    >
      {value}
    </td>
  );
}
