/**
 * 스윙 판정 → `swing_judgments` 압축 행(순수). 전체 판정 JSON 은 저장하지 않는다 — 목록·전진 검증에
 * 필요한 열만(PRD `swing-judgment` PR-2 설계). 상세는 같은 엔진으로 즉시 계산한다.
 */

import { hasItemBit, itemBits, metCount, SWING_ITEM_BITS, SWING_MET_ITEMS } from "@/lib/swing/itemBits";
import type { SwingJudgment } from "@/lib/swing/judge";

// 비트·충족 수 헬퍼는 화면과 공유하려고 lib/swing/itemBits.ts 로 옮겼다(재노출 — 기존 import 경로 유지).
export { hasItemBit, itemBits, metCount, SWING_ITEM_BITS, SWING_MET_ITEMS };

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
  input_hash: string;
};

const round = (x: number | null | undefined, d: number) =>
  x === null || x === undefined || !Number.isFinite(x) ? null : Number(x.toFixed(d));

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
    items: itemBits(j.items),
    stage: j.stage,
    close: j.close,
    adv20: j.features.adv20 === null ? null : Math.round(j.features.adv20),
    plan_stop: j.plan?.stop ?? null,
    plan_target: j.plan?.target ?? null,
    plan_rr: round(j.plan?.rr, 3),
    input_hash: inputHash,
  };
}
