/**
 * 분석가별 토큰 상세 — 헤더 클릭 정렬 테이블.
 * 기본 정렬 = 총 입력 desc (절감 대상 랭킹). usage 누락 행은 "측정 안 됨" 배지.
 */

"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Section } from "@/components/ui/Section";
import type { AgentUsageRow } from "@/lib/types/stock/agentUsage";
import { agentLabel, fmtCost, fmtDuration, fmtModel, fmtRate, fmtTokens } from "./format";
import {
  COL_AGENT,
  COL_AVG_COST,
  COL_AVG_INPUT,
  COL_AVG_OUTPUT,
  COL_CACHE_HIT,
  COL_CACHE_READ,
  COL_DURATION,
  COL_FRESH,
  COL_MODEL,
  COL_SAMPLES,
  COL_STAGE,
  MEASURE_BADGE_UNMEASURED,
  STAGE_LABEL,
  TABLE_TITLE,
} from "@/lib/copy/analyze/labels";

type SortKey =
  | "agent" | "stage" | "model" | "input" | "fresh" | "cache"
  | "hit" | "output" | "cost" | "duration" | "samples";
type SortDir = "asc" | "desc";

interface DisplayRow extends AgentUsageRow {
  totalInput: number | null;
  measuredOk: boolean;
}

function totalInputOf(r: AgentUsageRow): number | null {
  if (r.avgInputTokens == null && r.avgCacheReadTokens == null) return null;
  return (r.avgInputTokens ?? 0) + (r.avgCacheReadTokens ?? 0);
}

const NUM_FALLBACK = -1;

export function AgentUsageTable({ rows }: { rows: AgentUsageRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("input");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const display = useMemo<DisplayRow[]>(() => {
    const enriched: DisplayRow[] = rows.map((r) => ({
      ...r,
      totalInput: totalInputOf(r),
      measuredOk: r.measuredCount > 0,
    }));
    const accessor: Record<SortKey, (r: DisplayRow) => number | string> = {
      agent: (r) => agentLabel(r.agentKey),
      stage: (r) => r.orderIndex,
      model: (r) => r.model ?? "",
      input: (r) => r.totalInput ?? NUM_FALLBACK,
      fresh: (r) => r.avgInputTokens ?? NUM_FALLBACK,
      cache: (r) => r.avgCacheReadTokens ?? NUM_FALLBACK,
      hit: (r) => r.cacheHitRate ?? NUM_FALLBACK,
      output: (r) => r.avgOutputTokens ?? NUM_FALLBACK,
      cost: (r) => r.avgCostUsd ?? NUM_FALLBACK,
      duration: (r) => r.avgDurationMs ?? NUM_FALLBACK,
      samples: (r) => r.sampleCount,
    };
    const get = accessor[sortKey];
    return [...enriched].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      let cmp: number;
      if (typeof va === "string" && typeof vb === "string") {
        cmp = va.localeCompare(vb, "ko");
      } else {
        cmp = (va as number) - (vb as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "agent" || key === "stage" || key === "model" ? "asc" : "desc");
    }
  }

  function ariaSort(key: SortKey): "ascending" | "descending" | "none" {
    if (key !== sortKey) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  }

  const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "agent", label: COL_AGENT, align: "left" },
    { key: "stage", label: COL_STAGE, align: "left" },
    { key: "model", label: COL_MODEL, align: "left" },
    { key: "input", label: COL_AVG_INPUT, align: "right" },
    { key: "fresh", label: COL_FRESH, align: "right" },
    { key: "cache", label: COL_CACHE_READ, align: "right" },
    { key: "hit", label: COL_CACHE_HIT, align: "right" },
    { key: "output", label: COL_AVG_OUTPUT, align: "right" },
    { key: "cost", label: COL_AVG_COST, align: "right" },
    { key: "duration", label: COL_DURATION, align: "right" },
    { key: "samples", label: COL_SAMPLES, align: "right" },
  ];

  return (
    <Section aria-label={TABLE_TITLE} title={TABLE_TITLE}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border-line">
              {COLUMNS.map((c) => (
                <HeaderCell
                  key={c.key}
                  label={c.label}
                  active={sortKey === c.key}
                  dir={sortDir}
                  align={c.align}
                  ariaSort={ariaSort(c.key)}
                  onClick={() => toggleSort(c.key)}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((r) => (
              <tr
                key={r.agentKey}
                className="border-b border-border-line hover:bg-surface-muted"
              >
                <td className="py-md pr-md text-body-sm-strong text-text-strong whitespace-nowrap">
                  {agentLabel(r.agentKey)}
                </td>
                <td className="py-md pr-md text-caption text-text-muted whitespace-nowrap">
                  {STAGE_LABEL[r.stage]}
                </td>
                <td className="py-md pr-md text-caption text-text-muted whitespace-nowrap tabular-nums">
                  {fmtModel(r.model)}
                </td>
                {r.measuredOk ? (
                  <>
                    <Num value={fmtTokens(r.totalInput)} strong />
                    <Num value={fmtTokens(r.avgInputTokens)} />
                    <Num value={fmtTokens(r.avgCacheReadTokens)} />
                    <Num value={fmtRate(r.cacheHitRate)} />
                    <Num value={fmtTokens(r.avgOutputTokens)} />
                    <Num value={fmtCost(r.avgCostUsd)} />
                  </>
                ) : (
                  <td className="py-md pr-md text-right" colSpan={6}>
                    <span className="badge-coming-soon">{MEASURE_BADGE_UNMEASURED}</span>
                  </td>
                )}
                <Num value={fmtDuration(r.avgDurationMs)} />
                <td className="py-md pl-md text-right text-caption text-text-muted tabular-nums">
                  {r.measuredCount}/{r.sampleCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Num({ value, strong }: { value: string; strong?: boolean }) {
  return (
    <td
      className={cn(
        "py-md pl-md text-right tabular-nums whitespace-nowrap",
        strong ? "text-body-sm-strong text-text-strong" : "text-body-sm text-text-strong",
      )}
    >
      {value}
    </td>
  );
}

function HeaderCell({
  label,
  active,
  dir,
  align,
  ariaSort,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  align: "left" | "right";
  ariaSort: "ascending" | "descending" | "none";
  onClick: () => void;
}) {
  const SortIcon = !active ? ChevronsUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={ariaSort} className="whitespace-nowrap">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex w-full items-center gap-xs py-md text-label-sm text-text-muted hover:text-text-strong",
          align === "right" ? "justify-end pl-md" : "justify-start pr-md",
        )}
      >
        <span>{label}</span>
        <SortIcon
          className={cn("h-4 w-4", active ? "text-text-strong" : "text-text-muted")}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}
