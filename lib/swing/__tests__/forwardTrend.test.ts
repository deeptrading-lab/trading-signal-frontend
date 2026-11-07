import { describe, expect, it } from "vitest";
import { forwardStats, type ForwardRow } from "../forward";
import { marketTrend } from "../marketTrend";

function row(d: string, t: string, close: number, extra: Partial<ForwardRow> = {}): ForwardRow {
  return { trade_date: d, ticker: t, market: "KOSPI", grade: "neutral", met_count: 0, flow_pass: false, exclusions: [], close, ...extra };
}

describe("forwardStats", () => {
  const rows: ForwardRow[] = [
    row("2026-11-02", "A", 100, { exclusions: ["high_volatility"] }),
    row("2026-11-02", "B", 100, { grade: "candidate", met_count: 6, flow_pass: true }),
    row("2026-11-03", "A", 90, { exclusions: ["high_volatility"] }),
    row("2026-11-03", "B", 110),
    row("2026-11-04", "A", 80),
    row("2026-11-04", "B", 121),
  ];

  it("같은 날·같은 시장 평균을 빼고 저장일 순서로 h일 뒤와 비교한다", () => {
    const [h1] = forwardStats(rows, [1]);
    const cell = (g: string) => h1.cells.find((c) => c.group === g)!;
    // 11-02→11-03: A −10%, B +10% (평균 0) / 11-03→11-04: A −11.1%, B +10% (평균 −0.56%)
    expect(cell("candidate").n).toBe(1);
    expect(cell("candidate").meanExcess).toBeCloseTo(0.1, 6);
    expect(cell("highVol").n).toBe(2); // 11-02·11-03 기준 둘 다 고변동
    expect(cell("highVol").winRate).toBe(0);
    expect(cell("all").meanExcess).toBeCloseTo(0, 9);
    expect(h1.firstBase).toBe("2026-11-02");
    expect(h1.lastBase).toBe("2026-11-03");
  });

  it("기간이 모자라면 표본 0, 비정상 수익(±60% 초과)은 뺀다", () => {
    const [h2, h5] = forwardStats([...rows, row("2026-11-02", "C", 100), row("2026-11-04", "C", 300)], [2, 5]);
    expect(h2.cells.find((c) => c.group === "all")!.n).toBe(2); // C 제외
    expect(h5.cells.every((c) => c.n === 0 && c.meanExcess === null)).toBe(true);
    expect(h5.firstBase).toBeNull();
  });
});

describe("marketTrend", () => {
  const bars = (closes: number[]) => closes.map((close, i) => ({ date: `d${String(i).padStart(3, "0")}`, close }));

  it("상승 뒤 급락하면 down, 상태가 시작된 날을 돌려준다", () => {
    const up = Array.from({ length: 100 }, (_, i) => 100 + i);
    const r1 = marketTrend(bars(up))!;
    expect(r1.state).toBe("up");
    const r2 = marketTrend(bars([...up, 150, 140, 130, 120, 110]))!;
    expect(r2.state).toBe("down");
    expect(r2.since > "d099").toBe(true);
  });

  it("봉이 60개 미만이면 null", () => {
    expect(marketTrend(bars(Array.from({ length: 59 }, () => 100)))).toBeNull();
  });
});
