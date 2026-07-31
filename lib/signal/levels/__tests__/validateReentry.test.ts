/**
 * 재진입가 앵커 검증 회귀.
 *
 * 배경: 프롬프트 규칙(#375)만으로는 강제가 안 돼, 매물대 공백의 위험한 가격이 재진입가로 나올 수
 * 있었다(실측 두산에너빌리티 -13% = 55,400원). 이 숫자는 차트 오버레이·터치 채점을 구동하므로
 * 서버가 무효화한다. 여기서 고정하는 것은 **어떤 경우에 무효화하고 어떤 경우엔 손대지 않는가**.
 */

import { describe, it, expect } from "vitest";
import { checkReentryAnchor, checkStopNoiseBand } from "@/lib/signal/levels/validateReentry";
import type { PriceLevels, VolumeZone } from "@/lib/signal/levels/priceLevels";

function zone(price: number, side: VolumeZone["side"], weightPct = 8): VolumeZone {
  return { price, weightPct, distPct: 0, side };
}

/** 현재가 100,000 기준: 아래 지지 90,000 / 도달 99,000 / 위 저항 115,000. 구간폭 4,000(±2,000). */
function levels(overrides: Partial<PriceLevels> = {}): PriceLevels {
  return {
    ma: { ma5: null, ma20: null, ma60: null, ma120: null },
    bollinger: null,
    fib: null,
    zones: [zone(90_000, "below"), zone(99_000, "at"), zone(115_000, "above")],
    binWidth: 4_000,
    nearestSupport: zone(90_000, "below"),
    nearestResistance: zone(115_000, "above"),
    typicalMove: { d5: 4, d10: 6, d21: 10 },
    ...overrides,
  };
}

describe("checkReentryAnchor — 무효화하는 경우", () => {
  it("재진입가가 매물대 공백이면 앵커 실패", () => {
    // -25% → 75,000원. 가장 가까운 지지 90,000 과 15,000원 차이(허용 ±2,000) → 공백.
    const r = checkReentryAnchor("REDUCE", -25, 100_000, levels());
    expect(r.checked).toBe(true);
    expect(r.anchored).toBe(false);
    expect(r.reentryPrice).toBe(75_000);
    expect(r.reason).toContain("매물대 공백");
  });

  it("현재가 아래 매물대가 하나도 없으면 앵커 실패", () => {
    const onlyAbove = levels({ zones: [zone(115_000, "above")], nearestSupport: null });
    const r = checkReentryAnchor("UNDERWEIGHT", -10, 100_000, onlyAbove);
    expect(r.anchored).toBe(false);
    expect(r.reason).toContain("공백");
  });
});

describe("checkReentryAnchor — 손대지 않는 경우", () => {
  it("재진입가가 매물대 구간 안이면 통과", () => {
    // -10% → 90,000원 = 지지 매물대 정중앙.
    const r = checkReentryAnchor("REDUCE", -10, 100_000, levels());
    expect(r.anchored).toBe(true);
    expect(r.matchedZonePrice).toBe(90_000);
    expect(r.reason).toBeNull();
  });

  it("허용 오차(구간폭 절반) 경계 안이면 통과", () => {
    // -91.5% 아님 — -8.5% → 91,500원. 90,000 과 1,500원 차이 ≤ 2,000 → 통과.
    expect(checkReentryAnchor("REDUCE", -8.5, 100_000, levels()).anchored).toBe(true);
    // -7.5% → 92,500원. 2,500원 차이 > 2,000 → 실패.
    expect(checkReentryAnchor("REDUCE", -7.5, 100_000, levels()).anchored).toBe(false);
  });

  it("강세 판정은 검증 대상이 아니다(위쪽 공백은 모순이 아님)", () => {
    for (const v of ["BUY", "OVERWEIGHT", "HOLD"] as const) {
      const r = checkReentryAnchor(v, 30, 100_000, levels());
      expect(r.checked).toBe(false);
      expect(r.anchored).toBe(true);
    }
  });

  it("SELL 은 target_pct 가 애초에 null 규약 — 검증 안 함", () => {
    expect(checkReentryAnchor("SELL", null, 100_000, levels()).checked).toBe(false);
  });

  it("target_pct 가 이미 null 이면 검증 안 함", () => {
    expect(checkReentryAnchor("REDUCE", null, 100_000, levels()).checked).toBe(false);
  });

  it("양수 target_pct(규약 위반)는 검증 대상 밖 — 부호 처리는 별도 관심사", () => {
    expect(checkReentryAnchor("REDUCE", 10, 100_000, levels()).checked).toBe(false);
  });
});

describe("checkReentryAnchor — 근거가 없으면 통과(fail-soft)", () => {
  it("레벨 자체가 없으면 검증 보류", () => {
    expect(checkReentryAnchor("REDUCE", -25, 100_000, null).checked).toBe(false);
  });

  it("매물대가 비었으면 검증 보류(비중 3% 이상 구간이 없는 종목)", () => {
    const empty = levels({ zones: [], binWidth: null, nearestSupport: null, nearestResistance: null });
    expect(checkReentryAnchor("REDUCE", -25, 100_000, empty).checked).toBe(false);
  });

  it("base_price 가 없으면 검증 보류", () => {
    expect(checkReentryAnchor("REDUCE", -25, null, levels()).checked).toBe(false);
  });
});

describe("checkReentryAnchor — 허용 오차가 변동성에 스케일한다", () => {
  it("구간폭이 넓으면(고변동주) 같은 거리도 앵커로 인정", () => {
    const wide = levels({ binWidth: 40_000 }); // ±20,000
    // 75,000원은 90,000 과 15,000 차이 → 좁은 구간폭에선 실패했지만 넓으면 통과.
    expect(checkReentryAnchor("REDUCE", -25, 100_000, wide).anchored).toBe(true);
    expect(checkReentryAnchor("REDUCE", -25, 100_000, levels()).anchored).toBe(false);
  });
});

describe("checkStopNoiseBand — 무효화 라인이 노이즈 안인지(관측 전용)", () => {
  // 통상 변동폭: 단기(1주) 4% / 중기(2주) 6% / 장기(1개월) 10%.
  it("통상 변동폭보다 좁으면 경고", () => {
    expect(checkStopNoiseBand(5, "중기", levels())).toContain("노이즈로 발동할 수 있음");
    expect(checkStopNoiseBand(-5, "중기", levels())).toContain("노이즈"); // 부호 무관(폭만 본다)
  });

  it("통상 변동폭 이상이면 경고 없음", () => {
    expect(checkStopNoiseBand(6, "중기", levels())).toBeNull();
    expect(checkStopNoiseBand(12, "중기", levels())).toBeNull();
  });

  it("판단 기간에 맞는 변동폭을 고른다", () => {
    // 5% 는 단기(4%) 기준으론 넉넉하지만 장기(10%) 기준으론 노이즈.
    expect(checkStopNoiseBand(5, "단기", levels())).toBeNull();
    expect(checkStopNoiseBand(5, "장기", levels())).toContain("노이즈");
  });

  it("근거가 없으면 판정하지 않는다", () => {
    expect(checkStopNoiseBand(5, "중기", null)).toBeNull();
    const noMove = levels({ typicalMove: { d5: null, d10: null, d21: null } });
    expect(checkStopNoiseBand(5, "중기", noMove)).toBeNull();
  });
});

describe("typicalMove — 기간별 통상 변동폭", () => {
  it("변동이 큰 종목일수록 값이 크다", async () => {
    const { computePriceLevels } = await import("@/lib/signal/levels/priceLevels");
    const dateAt = (i: number) =>
      new Date(Date.UTC(2025, 0, 1) + i * 86_400_000).toISOString().slice(0, 10);
    const mk = (amp: number) =>
      Array.from({ length: 300 }, (_, i) => {
        const c = 100 * (1 + amp * Math.sin(i / 3));
        return { date: dateAt(i), open: c, high: c * 1.01, low: c * 0.99, close: c, volume: 1000 };
      });
    const calm = computePriceLevels(mk(0.01), 100).typicalMove.d10!;
    const wild = computePriceLevels(mk(0.15), 100).typicalMove.d10!;
    expect(wild).toBeGreaterThan(calm);
  });

  it("봉이 부족하면 null(추정 금지)", async () => {
    const { computePriceLevels } = await import("@/lib/signal/levels/priceLevels");
    const few = Array.from({ length: 20 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      open: 100, high: 101, low: 99, close: 100, volume: 1000,
    }));
    expect(computePriceLevels(few, 100).typicalMove.d21).toBeNull();
  });
});
