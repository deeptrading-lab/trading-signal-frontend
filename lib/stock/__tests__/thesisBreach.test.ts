/**
 * thesisBreach 회귀 — 무효화(약세 상방)·손절(강세 하방) 돌파 판정과 경계·legacy 방어를 고정한다.
 */

import { describe, it, expect } from "vitest";
import { evaluateThesisBreach, type ThesisBreachInput } from "@/lib/stock/thesisBreach";

/** base 10,000원 기준 판정 팩토리. */
function dec(over: Partial<ThesisBreachInput>): ThesisBreachInput {
  return {
    verdict: "UNDERWEIGHT",
    base_price: 10_000,
    target_pct: -8,
    stop_loss_pct: 6, // 약세 → 상방 무효화 10,600
    ...over,
  };
}

describe("evaluateThesisBreach — 약세(상방 무효화)", () => {
  it("무효화가 돌파되면 invalidation 으로 판정", () => {
    // 10,000 × 1.06 = 10,600(호가단위 반올림). 11,000 이면 돌파.
    const r = evaluateThesisBreach(dec({}), 11_000);
    expect(r?.kind).toBe("invalidation");
    expect(r!.linePrice).toBeGreaterThan(10_000); // 상방
    expect(r!.overshootPct).toBeGreaterThan(0);
  });

  it("라인 아래면 null(배지 없음)", () => {
    expect(evaluateThesisBreach(dec({}), 10_400)).toBeNull();
  });

  it("하방으로 크게 빠져도 무효화는 아님(약세가 맞아가는 중)", () => {
    expect(evaluateThesisBreach(dec({}), 8_000)).toBeNull();
  });
});

describe("evaluateThesisBreach — 강세(하방 손절)", () => {
  const bull = dec({ verdict: "OVERWEIGHT", target_pct: 15, stop_loss_pct: -6 }); // 9,400

  it("손절선을 이탈하면 stop 으로 판정", () => {
    const r = evaluateThesisBreach(bull, 9_000);
    expect(r?.kind).toBe("stop");
    expect(r!.linePrice).toBeLessThan(10_000); // 하방
  });

  it("라인 위면 null", () => {
    expect(evaluateThesisBreach(bull, 9_600)).toBeNull();
  });

  it("상방으로 올라도 손절 아님(강세가 맞아가는 중)", () => {
    expect(evaluateThesisBreach(bull, 12_000)).toBeNull();
  });
});

describe("evaluateThesisBreach — 방어", () => {
  it("legacy(base_price 없음)는 절대가 파생 불가 → null", () => {
    expect(evaluateThesisBreach(dec({ base_price: null }), 11_000)).toBeNull();
    expect(evaluateThesisBreach(dec({ base_price: undefined }), 11_000)).toBeNull();
  });

  it("livePrice 없음·0·NaN 이면 판정 불가 → null", () => {
    expect(evaluateThesisBreach(dec({}), null)).toBeNull();
    expect(evaluateThesisBreach(dec({}), 0)).toBeNull();
    expect(evaluateThesisBreach(dec({}), Number.NaN)).toBeNull();
  });

  it("legacy 약세(stop 음수)는 하방 손절로 해석 — 상방 급등은 배지 없음", () => {
    const legacy = dec({ stop_loss_pct: -8 }); // 구 시맨틱: 약세인데 하방
    expect(evaluateThesisBreach(legacy, 12_000)).toBeNull();
    expect(evaluateThesisBreach(legacy, 9_000)?.kind).toBe("stop");
  });
});
