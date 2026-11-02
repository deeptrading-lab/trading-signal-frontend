/**
 * 스윙 판정 → `swing_judgments` 압축 행(순수). 전체 판정 JSON 은 저장하지 않는다 — 목록·전진 검증에
 * 필요한 열만(PRD `swing-judgment` PR-2 설계). 상세는 같은 엔진으로 즉시 계산한다.
 */

import { adverseBits, itemBits, metCount } from "@/lib/swing/itemBits";
import { RULEBOOK } from "@/lib/swing/rulebook";
import type { SwingJudgment } from "@/lib/swing/judge";
import type { SwingFlowAmounts } from "@/lib/types/swing/api";

export type SwingJudgmentRow = {
  trade_date: string;
  ticker: string;
  rulebook_version: string;
  market: "KOSPI" | "KOSDAQ";
  source: "screener" | "on_demand";
  grade: SwingJudgment["grade"];
  met_count: number;
  /** 수급 1차 관문 A 통과 ∧ 제외 없음 — 스크리너 "수급 조건" 목록 필터. */
  flow_pass: boolean;
  exclusions: string[];
  items: number;
  stage: string | null;
  close: number;
  adv20: number | null;
  plan_stop: number | null;
  plan_target: number | null;
  plan_rr: number | null;
  /** 최근 N일 주체별 순매수(억 원, 소수 1자리) — 목록 매트릭스 표시용. 수급 결측이면 null. */
  flow: SwingFlowAmounts | null;
  input_hash: string;
};

const round = (x: number | null | undefined, d: number) =>
  x === null || x === undefined || !Number.isFinite(x) ? null : Number(x.toFixed(d));

/** 수급 강도 S(= N일 순매수 ÷ ADV20) × ADV20 → 억 원. */
export function flowAmounts(j: SwingJudgment): SwingFlowAmounts | null {
  const f = j.features.flow;
  const adv = j.features.adv20;
  if (!f || adv === null) return null;
  const eok = (s: number) => Math.round((s * adv) / 1e7) / 10;
  return { person: eok(f.person), foreign: eok(f.foreign), institution: eok(f.institution), pension: eok(f.pension) };
}

export function toSwingRow(
  j: SwingJudgment,
  source: SwingJudgmentRow["source"],
  inputHash: string,
): SwingJudgmentRow {
  return {
    trade_date: j.asOf,
    ticker: j.ticker,
    rulebook_version: j.rulebookVersion,
    market: j.market,
    source,
    grade: j.grade,
    met_count: metCount(j.items),
    flow_pass: j.items.A.pass === true && j.exclusions.length === 0,
    exclusions: [...j.exclusions],
    // 충족 비트(0~) + 불리한 신호 비트(16~, 표시 전용) — 한 정수에.
    items: itemBits(j.items) | adverseBits(j.features, RULEBOOK),
    stage: j.stage,
    close: j.close,
    adv20: j.features.adv20 === null ? null : Math.round(j.features.adv20),
    plan_stop: j.plan?.stop ?? null,
    plan_target: j.plan?.target ?? null,
    plan_rr: round(j.plan?.rr, 3),
    flow: flowAmounts(j),
    input_hash: inputHash,
  };
}
