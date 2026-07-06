/**
 * stripDecisionTickers 회귀 — 최종 판정 자유서술 필드에서만 티커 코드를 제거하고,
 * verdict(enum)·수치(target/stop/RR/base_price)·time_horizon·model 등은 보존함을 고정한다.
 */

import { describe, it, expect } from "vitest";
import { stripDecisionTickers } from "@/lib/stock/stripDecisionTickers";
import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";

function decision(over: Partial<FinalDecision> = {}): FinalDecision {
  return {
    verdict: "OVERWEIGHT",
    reasoning: "SK텔레콤(017670)은 배당 매력이 크다.",
    key_strengths: ["017670 배당 수익률 상위", "안정적 현금흐름"],
    key_risks: ["017670 성장 정체"],
    confidence: "MEDIUM",
    time_horizon: "중기",
    new_entry_strategy: "017670 분할 매수 유효.",
    holder_strategy: "보유 유지.",
    target_pct: 12,
    stop_loss_pct: -6,
    risk_reward_ratio: 2,
    base_price: 84900,
    model: "claude-sonnet-5",
    short_term_outlook: "017670 단기 박스권.",
    mid_term_outlook: "중기 우상향.",
    limitedData: false,
    bars: 250,
    ...over,
  };
}

describe("stripDecisionTickers", () => {
  it("모든 자유서술 텍스트 필드에서 티커 코드를 제거한다", () => {
    const out = stripDecisionTickers(decision(), "017670");
    expect(out.reasoning).toBe("SK텔레콤은 배당 매력이 크다.");
    expect(out.new_entry_strategy).toBe("분할 매수 유효.");
    expect(out.short_term_outlook).toBe("단기 박스권.");
    expect(out.key_strengths).toEqual(["배당 수익률 상위", "안정적 현금흐름"]);
    expect(out.key_risks).toEqual(["성장 정체"]);
  });

  it("verdict·수치·기간·model 은 보존한다(가격 84900 유지)", () => {
    const out = stripDecisionTickers(decision(), "017670");
    expect(out.verdict).toBe("OVERWEIGHT");
    expect(out.target_pct).toBe(12);
    expect(out.stop_loss_pct).toBe(-6);
    expect(out.base_price).toBe(84900);
    expect(out.time_horizon).toBe("중기");
    expect(out.model).toBe("claude-sonnet-5");
  });

  it("티커가 없으면 원본 객체를 그대로 반환한다", () => {
    const input = decision();
    expect(stripDecisionTickers(input, "")).toBe(input);
    expect(stripDecisionTickers(input, null)).toBe(input);
  });
});
