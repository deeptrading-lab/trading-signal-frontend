/**
 * 체결 마커(원형 핀) 기하 테스트 — 꼬리 방향·배지 원 위치(intraday chart trade markers).
 */
import { describe, it, expect } from "vitest";
import { tradeMarkerGeometry } from "../IntradayMiniChart";

/** 꼬리 삼각형 3점 파싱 — [tip, left, right]. */
function tail(points: string): number[][] {
  return points.split(" ").map((p) => p.split(",").map(Number));
}

describe("tradeMarkerGeometry (원형 핀)", () => {
  it("매수(BUY) — 꼬리·원이 가격 아래(cy 보다 큰 y), 꼬리 꼭짓점이 가격쪽 위", () => {
    const g = tradeMarkerGeometry(100, 50, "BUY");
    const [tip, left, right] = tail(g.tailPoints);
    expect(tip[0]).toBe(100); // 꼭짓점 x = cx
    expect(tip[1]).toBeGreaterThan(50); // 가격 아래
    expect(tip[1]).toBeLessThan(left[1]); // 꼭짓점이 밑변보다 위(가격쪽)
    expect(left[0]).toBeLessThan(right[0]); // 밑변 좌<우
    expect(g.circleX).toBe(100);
    expect(g.circleY).toBeGreaterThan(left[1]); // 원 중심은 꼬리 밑변보다 더 아래(바깥)
    expect(g.radius).toBeGreaterThan(0);
  });

  it("매도(SELL) — 꼬리·원이 가격 위(cy 보다 작은 y), 꼬리 꼭짓점이 가격쪽 아래", () => {
    const g = tradeMarkerGeometry(100, 50, "SELL");
    const [tip, left, right] = tail(g.tailPoints);
    expect(tip[0]).toBe(100);
    expect(tip[1]).toBeLessThan(50); // 가격 위
    expect(tip[1]).toBeGreaterThan(left[1]); // 꼭짓점이 밑변보다 아래(가격쪽)
    expect(left[0]).toBeLessThan(right[0]);
    expect(g.circleY).toBeLessThan(left[1]); // 원 중심은 꼬리 밑변보다 더 위(바깥)
  });

  it("매수/매도 원 중심이 가격 포인트 기준 상하 대칭", () => {
    const buy = tradeMarkerGeometry(100, 50, "BUY");
    const sell = tradeMarkerGeometry(100, 50, "SELL");
    expect(buy.circleY - 50).toBeCloseTo(50 - sell.circleY, 10);
  });
});
