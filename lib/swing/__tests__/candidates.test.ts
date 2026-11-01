import { describe, it, expect } from "vitest";
import { computeCandidateSeries, type CreditTuple, type FlowxTuple, type Opinion, type ProgramTuple } from "../candidates";

/** 2025-01-01 부터 하루씩(영업일 구분 없음). */
const dates = (n: number) =>
  Array.from({ length: n }, (_, i) => new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10));

const flowxRow = (d: string, o: Partial<{ tv: number; it: number; sc: number; oc: number }> = {}): FlowxTuple => [
  d, o.tv ?? 10_000_000_000, 0, 0, 0, 0, 0, o.sc ?? 0, o.it ?? 0, 0, 0, 0, o.oc ?? 0, 0, 0, 0,
];
const op = (d: string, broker: string, target: number): Opinion => ({
  d, opn: "BUY", opnCode: "2", prevOpn: "BUY", prevCode: "2", broker, target, prevClose: 0,
});

describe("computeCandidateSeries", () => {
  const D = dates(40);
  const closes = D.map(() => 10_000);

  it("F1~F3 — 최근 5일 순매수(백만원)×1e6 ÷ ADV20(원), 20일 창 결측이면 null", () => {
    const flowx = D.map((d, i) => flowxRow(d, i >= 35 ? { it: 200, sc: -100, oc: 50 } : {}));
    const s = computeCandidateSeries(D, closes, flowx, [], [], []);
    expect(s.F1[39]).toBeCloseTo((5 * 200 * 1e6) / 1e10, 12); // 0.1
    expect(s.F2[39]).toBeCloseTo(-0.05, 12);
    expect(s.F3[39]).toBeCloseTo(0.025, 12);
    expect(s.F1[18]).toBeNull(); // 20일 창 미충족
    const gap = flowx.filter((_, i) => i !== 30);
    expect(computeCandidateSeries(D, closes, gap, [], [], []).F1[39]).toBeNull();
  });

  it("F4·F5 — 결제일 ≤ t 인 행만 쓴다(거래일보다 2일 늦은 결제)", () => {
    // 거래일 D[k] 의 결제일 = D[k+2]. 잔고 = 1000 + 10k, 잔고율 = k/10.
    const credit: CreditTuple[] = D.slice(0, 38).map((d, k) => [d, Number(D[k + 2].replaceAll("-", "")), 1000 + 10 * k, k / 10, 0, 0, 0, 0]);
    const s = computeCandidateSeries(D, closes, [], credit, [], []);
    // t = D[30] 에는 결제일 ≤ D[30] 인 마지막 행 = 거래일 D[28].
    expect(s.F4[30]).toBeCloseTo(2.8, 12);
    expect(s.F5[30]).toBeCloseTo((1000 + 280) / (1000 + 80) - 1, 12);
    expect(s.F4[1]).toBeNull(); // 결제된 행 없음
  });

  it("F6 — 5일 프로그램 순매수 ÷ (매수+매도)", () => {
    const program: ProgramTuple[] = D.map((d) => [d, 10, 0, 60, 50]);
    const s = computeCandidateSeries(D, closes, [], [], program, []);
    expect(s.F6[39]).toBeCloseTo(50 / 550, 12);
    expect(computeCandidateSeries(D, closes, [], [], program.filter((_, i) => i !== 37), []).F6[39]).toBeNull();
  });

  it("F7 — 120일 안 증권사별 최신 목표가 평균 ÷ 종가 − 1, 발표일 ≤ t", () => {
    const ops = [op(D[5], "A증권", 11_000), op(D[10], "B증권", 13_000), op(D[20], "A증권", 12_000), op(D[39], "C증권", 30_000)];
    const s = computeCandidateSeries(D, closes, [], [], [], ops);
    expect(s.F7[4]).toBeNull(); // 아직 없음
    expect(s.F7[25]).toBeCloseTo((12_000 + 13_000) / 2 / 10_000 - 1, 12);
    expect(s.F7[38]).toBeCloseTo(0.25, 12); // D[39] 의견은 아직 미반영
  });

  it("F8 — 20거래일 안 목표가 상향 − 하향(같은 증권사 직전 대비), 커버리지 없으면 null", () => {
    const ops = [op(D[2], "A증권", 10_000), op(D[25], "A증권", 12_000), op(D[30], "B증권", 9_000), op(D[33], "B증권", 8_000)];
    const s = computeCandidateSeries(D, closes, [], [], [], ops);
    expect(s.F8[35]).toBe(0); // A 상향 +1, B 하향 −1
    expect(s.F8[28]).toBe(1);
    expect(computeCandidateSeries(D, closes, [], [], [], []).F8[35]).toBeNull();
  });
});
