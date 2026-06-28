/**
 * 모델별 비용 분해 — provider 한 탭의 분석가 행(AgentUsageRow[])을 모델 패밀리별로 묶어
 * 비용·토큰·비중을 도출하는 순수 파생 로직.
 *
 * "분석 1회 $3 중 opus(트레이더·PM)·sonnet(분석가)·haiku가 각각 얼마"를 모델 단위로 답한다.
 * - 비용은 CLI 청구값(avgCostUsd) 합산 기준 → "분석 1회 평균 비용" 카드(sum avgCostUsd)와 합 일치.
 * - 토큰×단가 재계산은 하지 않는다(한 호출이 내부적으로 여러 모델을 섞어 청구값과 어긋남 → 왜곡 회피).
 * - 추가 측정/스키마 없이 기존 집계 행에서만 파생.
 */

import type { AgentKey } from "@/lib/types/stock/aiAnalysis";
import type { AgentUsageRow } from "@/lib/types/stock/agentUsage";

/** 모델 패밀리별 공개 단가($/1M, 입력/출력) — 참고용. 실제 비용은 CLI 청구값(costUsd) 기준. */
export const MODEL_RATES: Record<string, { input: number; output: number }> = {
  opus: { input: 5, output: 25 },
  sonnet: { input: 3, output: 15 },
  haiku: { input: 1, output: 5 },
};

/** 모델이 측정되지 않은 행을 묶는 버킷 키. */
export const UNMEASURED_FAMILY = "미측정";

/** 모델 id(claude-opus-4-8 등)를 패밀리 키로 정규화. 매칭 없으면 원본 id, null 이면 "미측정". */
export function modelFamily(model: string | null): string {
  if (!model) return UNMEASURED_FAMILY;
  const m = model.toLowerCase();
  if (m.includes("opus")) return "opus";
  if (m.includes("sonnet")) return "sonnet";
  if (m.includes("haiku")) return "haiku";
  return model;
}

/** 모델 패밀리 1개의 비용·토큰 합과 비중. */
export interface ModelCostRow {
  /** 표시용 모델 패밀리 키 (opus/sonnet/haiku/원본 id/"미측정") */
  family: string;
  /** 이 패밀리에 속한 분석가 수 */
  agentCount: number;
  /** 분석가 키 목록 (라벨 조회·툴팁용) */
  agentKeys: AgentKey[];
  /** 입력 토큰 합 = 신규 입력 + 캐시 읽기 */
  totalInput: number;
  totalOutput: number;
  totalCacheCreation: number;
  /** 합산 비용(USD). 측정값이 하나도 없으면 null. */
  totalCost: number | null;
  /** 0~1. 이 패밀리 비용 / 전체 비용. 전체가 0/null 이면 null. */
  costShare: number | null;
}

/**
 * 분석가 행들을 모델 패밀리별로 묶어 비용 desc 정렬한 분해 배열로.
 * 비용 동률(또는 미측정)이면 입력 토큰 desc 보조 정렬.
 */
export function groupByModel(rows: AgentUsageRow[]): ModelCostRow[] {
  const byFamily = new Map<string, AgentUsageRow[]>();
  for (const r of rows) {
    const fam = modelFamily(r.model);
    const list = byFamily.get(fam) ?? [];
    list.push(r);
    byFamily.set(fam, list);
  }

  const groups: ModelCostRow[] = [...byFamily.entries()].map(([family, rs]) => {
    const costs = rs
      .map((r) => r.avgCostUsd)
      .filter((n): n is number => n != null);
    return {
      family,
      agentCount: rs.length,
      agentKeys: rs.map((r) => r.agentKey),
      totalInput: rs.reduce(
        (a, r) => a + (r.avgInputTokens ?? 0) + (r.avgCacheReadTokens ?? 0),
        0,
      ),
      totalOutput: rs.reduce((a, r) => a + (r.avgOutputTokens ?? 0), 0),
      totalCacheCreation: rs.reduce((a, r) => a + (r.avgCacheCreationTokens ?? 0), 0),
      totalCost: costs.length ? costs.reduce((a, b) => a + b, 0) : null,
      costShare: null,
    };
  });

  const grandCost = groups.reduce((a, g) => a + (g.totalCost ?? 0), 0);
  for (const g of groups) {
    g.costShare =
      grandCost > 0 && g.totalCost != null ? g.totalCost / grandCost : null;
  }

  return groups.sort(
    (a, b) => (b.totalCost ?? 0) - (a.totalCost ?? 0) || b.totalInput - a.totalInput,
  );
}
