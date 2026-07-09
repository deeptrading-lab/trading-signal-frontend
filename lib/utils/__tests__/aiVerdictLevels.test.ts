import { describe, expect, it } from "vitest";
import { deriveAiVerdictLevels } from "@/lib/utils/aiVerdictLevels";
import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";

function decision(over: Partial<FinalDecision>): FinalDecision {
  return {
    verdict: "BUY",
    reasoning: "",
    key_strengths: [],
    key_risks: [],
    confidence: "MEDIUM",
    time_horizon: "중기",
    new_entry_strategy: "",
    holder_strategy: "",
    target_pct: 8,
    stop_loss_pct: -5,
    risk_reward_ratio: 1.6,
    base_price: 50_000,
    short_term_outlook: "",
    mid_term_outlook: "",
    limitedData: false,
    bars: 200,
    ...over,
  };
}

describe("deriveAiVerdictLevels", () => {
  it("매수 계열(target_pct 양수)=목표 위·손절 아래, role=target", () => {
    const lv = deriveAiVerdictLevels(decision({ verdict: "BUY", target_pct: 8, stop_loss_pct: -5 }));
    expect(lv).not.toBeNull();
    expect(lv!.target?.role).toBe("target");
    expect(lv!.target!.price).toBeGreaterThan(lv!.basePrice); // 위
    expect(lv!.stop.price).toBeLessThan(lv!.basePrice); // 아래
    expect(lv!.stop.role).toBe("stop");
  });

  it("신규 진입 주의(target_pct 음수)=재진입 아래, role=reentry", () => {
    const lv = deriveAiVerdictLevels(
      decision({ verdict: "UNDERWEIGHT", target_pct: -4, stop_loss_pct: -8 }),
    );
    expect(lv!.target?.role).toBe("reentry");
    expect(lv!.target!.price).toBeLessThan(lv!.basePrice); // 재진입은 현재 아래
    expect(lv!.stop.price).toBeLessThan(lv!.target!.price); // 손절이 재진입보다 더 아래
  });

  it("SELL(target_pct null)=target 없음, 손절만", () => {
    const lv = deriveAiVerdictLevels(decision({ verdict: "SELL", target_pct: null, stop_loss_pct: -6 }));
    expect(lv!.target).toBeNull();
    expect(lv!.stop.price).toBeLessThan(lv!.basePrice);
  });

  it("base_price 없는 legacy 판정=null(그리지 않음)", () => {
    expect(deriveAiVerdictLevels(decision({ base_price: null }))).toBeNull();
    expect(deriveAiVerdictLevels(decision({ base_price: undefined }))).toBeNull();
    expect(deriveAiVerdictLevels(decision({ base_price: 0 }))).toBeNull();
  });

  it("호가단위로 반올림된 절대가", () => {
    // 50,000 × 1.08 = 54,000 (5만~10만 구간 tick=100 → 정확히 떨어짐)
    const lv = deriveAiVerdictLevels(decision({ base_price: 50_000, target_pct: 8 }));
    expect(lv!.target!.price % 100).toBe(0);
  });
});
