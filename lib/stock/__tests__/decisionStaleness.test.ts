/**
 * decisionStaleness 회귀 — 강세/약세/null-target/손절이탈/큰이동/오래됨/legacy(base null)·가격없음 전 케이스와
 * 방향 처리(target_pct 부호)·경계값·우선순위(stop > target > big-move > aged)를 고정한다.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateDecisionStaleness,
  type DecisionStalenessInput,
} from "@/lib/stock/decisionStaleness";
import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";

/** 최소 decision — 테스트가 관심 있는 4필드만. */
function decision(
  over: Partial<Pick<FinalDecision, "verdict" | "base_price" | "target_pct" | "stop_loss_pct">>,
): DecisionStalenessInput["decision"] {
  return {
    verdict: "OVERWEIGHT",
    base_price: 10_000,
    target_pct: 20,
    stop_loss_pct: -8,
    ...over,
  };
}

// 고정 기준 시각 + "방금 저장"(같은 날) → aged 는 발화하지 않아 가격 규칙을 격리한다.
const NOW = new Date("2026-07-16T09:00:00");
const FRESH = "2026-07-16T08:00:00";

function evalStale(over: Partial<DecisionStalenessInput> = {}) {
  return evaluateDecisionStaleness({
    decision: decision({}),
    livePrice: 10_000,
    updatedAt: FRESH,
    now: NOW,
    ...over,
  });
}

describe("evaluateDecisionStaleness — 강세(양수 목표) 방향", () => {
  it("목표가 근접(±3% 밴드 안) → target-near", () => {
    // base 10000, +20% → target 12000. live 11700 = |−300|/12000 = 2.5% ≤ 3%.
    const r = evalStale({ decision: decision({ target_pct: 20 }), livePrice: 11_700 });
    expect(r).toEqual({ stale: true, reason: "target-near" });
  });

  it("목표가 상회(도달) → target-near", () => {
    const r = evalStale({ decision: decision({ target_pct: 20 }), livePrice: 12_500 });
    expect(r).toEqual({ stale: true, reason: "target-near" });
  });

  it("목표 한참 아래·손절 위·소폭 이동·신선 → not stale", () => {
    // live 10300 = +3% (목표 12000 과 14% 거리, 손절 9200 위, 큰이동 6% 미만).
    const r = evalStale({ decision: decision({ target_pct: 20 }), livePrice: 10_300 });
    expect(r).toEqual({ stale: false, reason: null });
  });
});

describe("evaluateDecisionStaleness — stop_loss_pct 0 방어(정규화가 0 을 통과)", () => {
  it("stop_loss_pct 0 이면 손절-근접 규칙 미발화(base +1% 여도 not stale)", () => {
    // 가드(`<0`) 없으면 stopPrice=base → live<=base*1.03 상시 오탐. 0 은 건너뛰어야 한다.
    const r = evalStale({
      decision: decision({ target_pct: 20, stop_loss_pct: 0 }),
      livePrice: 10_100, // base +1% — 목표 한참 아래·큰이동 미만·신선
    });
    expect(r).toEqual({ stale: false, reason: null });
  });
});

describe("evaluateDecisionStaleness — 약세 재진입(음수 목표) 방향", () => {
  it("재진입 구간 근접(±3% 밴드) → target-near", () => {
    // base 10000, −15% → 재진입 8500. live 8600 = 1.18% ≤ 3%.
    const r = evalStale({
      decision: decision({ verdict: "UNDERWEIGHT", target_pct: -15, stop_loss_pct: -25 }),
      livePrice: 8_600,
    });
    expect(r).toEqual({ stale: true, reason: "target-near" });
  });

  it("재진입 구간 하회(도달, live ≤ target) → target-near", () => {
    const r = evalStale({
      decision: decision({ verdict: "UNDERWEIGHT", target_pct: -15, stop_loss_pct: -30 }),
      livePrice: 8_300,
    });
    expect(r).toEqual({ stale: true, reason: "target-near" });
  });

  it("가격이 재진입 반대(상방)로 소폭·신선 → not stale (방향 처리로 오탐 없음)", () => {
    // live 9800 = 재진입 8500 위(도달 아님), base 대비 −2%(큰이동 미만), 손절 아래 아님.
    const r = evalStale({
      decision: decision({ verdict: "UNDERWEIGHT", target_pct: -15, stop_loss_pct: -25 }),
      livePrice: 9_800,
    });
    expect(r).toEqual({ stale: false, reason: null });
  });
});

describe("evaluateDecisionStaleness — 손절 규칙", () => {
  it("손절가 × 1.03 경계(정확히) → stop-near", () => {
    // base 10000, −8% → stop 9200. 경계 9200×1.03 = 9476. live=9476 → ≤ 경계.
    const r = evalStale({ decision: decision({ stop_loss_pct: -8 }), livePrice: 9_476 });
    expect(r).toEqual({ stale: true, reason: "stop-near" });
  });

  it("손절 경계 바로 위 → 손절 아님(다른 규칙도 미발화면 not stale)", () => {
    // live 9500 > 9476, base 대비 −5%(큰이동 미만), 목표 12000 과 멀음.
    const r = evalStale({ decision: decision({ target_pct: 20, stop_loss_pct: -8 }), livePrice: 9_500 });
    expect(r).toEqual({ stale: false, reason: null });
  });

  it("우선순위 — 급락(손절 이탈 + 큰이동 동시)이면 stop-near(big-move 보다 우선)", () => {
    // live 7000: 손절 9476 이하(참) & |−3000|/10000 = 30% ≥ 6%(참). 손절이 이긴다.
    const r = evalStale({ decision: decision({ target_pct: 20, stop_loss_pct: -8 }), livePrice: 7_000 });
    expect(r).toEqual({ stale: true, reason: "stop-near" });
  });
});

describe("evaluateDecisionStaleness — 무효화 규칙(약세 상방, stop_loss_pct 양수)", () => {
  it("무효화 × 0.97 경계(정확히) → invalidation-near", () => {
    // base 10000, +6% → 무효화 10600. 경계 10600×0.97 = 10282. live=10282 → ≥ 경계.
    const r = evalStale({
      decision: decision({ verdict: "UNDERWEIGHT", target_pct: -10, stop_loss_pct: 6 }),
      livePrice: 10_282,
    });
    expect(r).toEqual({ stale: true, reason: "invalidation-near" });
  });

  it("무효화 경계 바로 아래 → 무효화 아님(다른 규칙도 미발화면 not stale)", () => {
    // live 10200 < 10282, base 대비 +2%(큰이동 미만), 재진입 9000 멀음.
    const r = evalStale({
      decision: decision({ verdict: "UNDERWEIGHT", target_pct: -10, stop_loss_pct: 6 }),
      livePrice: 10_200,
    });
    expect(r).toEqual({ stale: false, reason: null });
  });

  it("우선순위 — 급등(무효화 돌파 + 큰이동 동시)이면 invalidation-near", () => {
    // live 11000: 무효화 10282 이상(참) & +10% ≥ 6%(참). 무효화가 이긴다.
    const r = evalStale({
      decision: decision({ verdict: "REDUCE", target_pct: -10, stop_loss_pct: 6 }),
      livePrice: 11_000,
    });
    expect(r).toEqual({ stale: true, reason: "invalidation-near" });
  });

  it("legacy 약세(stop 음수)에서 상방 급등은 무효화 아님 → big-move (하위호환)", () => {
    // 이전 시맨틱 저장 행: stop -8(하방). +7% 상승은 무효화 규칙 대상 아니고 big-move 로만 잡힘.
    const r = evalStale({
      decision: decision({ verdict: "UNDERWEIGHT", target_pct: -10, stop_loss_pct: -8 }),
      livePrice: 10_700,
    });
    expect(r).toEqual({ stale: true, reason: "big-move" });
  });
});

describe("evaluateDecisionStaleness — 큰 가격 이동", () => {
  it("목표·손절 안 닿았지만 6% 이상 이동 → big-move", () => {
    // base 10000, target +30%→13000(멀다), stop −8%→9200(경계9476). live 10700 = +7%.
    const r = evalStale({
      decision: decision({ target_pct: 30, stop_loss_pct: -8 }),
      livePrice: 10_700,
    });
    expect(r).toEqual({ stale: true, reason: "big-move" });
  });

  it("정확히 6% 이동 → big-move (경계 포함)", () => {
    const r = evalStale({ decision: decision({ target_pct: 30, stop_loss_pct: -20 }), livePrice: 10_600 });
    expect(r).toEqual({ stale: true, reason: "big-move" });
  });
});

describe("evaluateDecisionStaleness — null 목표(SELL) · legacy · 가격 없음", () => {
  it("target_pct null(SELL) 이면 목표 규칙 건너뜀 — 소폭이면 not stale(크래시 없음)", () => {
    const r = evalStale({
      decision: decision({ verdict: "SELL", target_pct: null, stop_loss_pct: -10 }),
      livePrice: 9_800, // −2%, 손절 9000 경계 9270 위, 큰이동 미만.
    });
    expect(r).toEqual({ stale: false, reason: null });
  });

  it("base_price null(legacy) — 가격 3규칙 건너뛰고 신선하면 not stale", () => {
    const r = evalStale({
      decision: decision({ base_price: null, target_pct: 20 }),
      livePrice: 50_000, // 큰 값이어도 base 없어 이동 계산 불가.
    });
    expect(r).toEqual({ stale: false, reason: null });
  });

  it("livePrice null(로딩 전) — 가격 3규칙 건너뛰고 신선하면 not stale", () => {
    const r = evalStale({ livePrice: null });
    expect(r).toEqual({ stale: false, reason: null });
  });

  it("livePrice 0/NaN 방어 — 가격 규칙 건너뜀", () => {
    expect(evalStale({ livePrice: 0 })).toEqual({ stale: false, reason: null });
    expect(evalStale({ livePrice: Number.NaN })).toEqual({ stale: false, reason: null });
  });
});

describe("evaluateDecisionStaleness — 오래됨(3 영업일)", () => {
  it("가격 신선해도 2주 경과면 aged", () => {
    const r = evalStale({
      updatedAt: "2026-07-02T09:00:00", // NOW(2026-07-16)와 2주 간격 → 영업일 ≥ 3.
      livePrice: 10_100, // 가격 규칙 미발화(+1%).
    });
    expect(r).toEqual({ stale: true, reason: "aged" });
  });

  it("가격 규칙이 aged 보다 우선 — 오래됐고 목표도 근접하면 target-near", () => {
    const r = evalStale({
      decision: decision({ target_pct: 20 }),
      updatedAt: "2026-07-02T09:00:00",
      livePrice: 11_800, // 목표 12000 근접.
    });
    expect(r).toEqual({ stale: true, reason: "target-near" });
  });

  it("base·live 없이도 aged 는 평가된다(legacy 오래된 결론)", () => {
    const r = evalStale({
      decision: decision({ base_price: null }),
      livePrice: null,
      updatedAt: "2026-07-02T09:00:00",
    });
    expect(r).toEqual({ stale: true, reason: "aged" });
  });

  it("경계 — 3 영업일 미만(주말만 낀 이틀)이면 not stale", () => {
    // 금(2026-07-10) 저장 → 월(2026-07-13) 기준: 영업일 1(월)만 → aged 아님.
    const r = evaluateDecisionStaleness({
      decision: decision({}),
      livePrice: 10_000,
      updatedAt: "2026-07-10T09:00:00",
      now: new Date("2026-07-13T09:00:00"),
    });
    expect(r).toEqual({ stale: false, reason: null });
  });

  it("잘못된 updatedAt 문자열이면 aged 미발화(방어)", () => {
    const r = evalStale({ updatedAt: "not-a-date", livePrice: 10_050 });
    expect(r).toEqual({ stale: false, reason: null });
  });
});
