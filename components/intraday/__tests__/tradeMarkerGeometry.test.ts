/**
 * 체결 마커 기하 테스트 — 매수/매도 화살표 방향·B/S 라벨 위치(intraday chart trade markers).
 */
import { describe, it, expect } from "vitest";
import { tradeMarkerGeometry } from "../IntradayMiniChart";

describe("tradeMarkerGeometry", () => {
  it("매수(BUY) — 삼각형·라벨이 가격 아래(cy 보다 큰 y), 꼭짓점이 가격쪽 위", () => {
    const g = tradeMarkerGeometry(100, 50, "BUY");
    // 꼭짓점(tip) = 첫 좌표쌍, 밑변 두 점 = 나머지. 매수는 전부 cy(50) 아래(y 증가).
    const [tip, left, right] = g.points.split(" ").map((p) => p.split(",").map(Number));
    expect(tip[0]).toBe(100); // 꼭짓점 x = cx
    expect(tip[1]).toBeGreaterThan(50); // 가격 아래
    expect(tip[1]).toBeLessThan(left[1]); // 꼭짓점이 밑변보다 위(가격쪽)
    expect(left[0]).toBeLessThan(right[0]); // 밑변 좌<우
    expect(g.labelY).toBeGreaterThan(left[1]); // 라벨은 삼각형 밖(더 아래)
    expect(g.labelX).toBe(100);
  });

  it("매도(SELL) — 삼각형·라벨이 가격 위(cy 보다 작은 y), 꼭짓점이 가격쪽 아래", () => {
    const g = tradeMarkerGeometry(100, 50, "SELL");
    const [tip, left, right] = g.points.split(" ").map((p) => p.split(",").map(Number));
    expect(tip[0]).toBe(100);
    expect(tip[1]).toBeLessThan(50); // 가격 위
    expect(tip[1]).toBeGreaterThan(left[1]); // 꼭짓점이 밑변보다 아래(가격쪽)
    expect(left[0]).toBeLessThan(right[0]);
    expect(g.labelY).toBeLessThan(left[1]); // 라벨은 삼각형 밖(더 위)
  });

  it("매수/매도가 가격 포인트 기준 상하 대칭", () => {
    const buy = tradeMarkerGeometry(100, 50, "BUY");
    const sell = tradeMarkerGeometry(100, 50, "SELL");
    expect(buy.labelY - 50).toBeCloseTo(50 - sell.labelY, 10);
  });
});
