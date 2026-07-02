/**
 * `lib/api/toss/minute.ts` — 종가 동시호가 병합 단위 테스트.
 *
 * 토스는 KRX 종가 동시호가를 15:31 봉에 기록한다(E2E 실측). 리뷰 지적 회귀 차단:
 *   1. 15:31 봉 단독 → 15:30 으로 리라벨 (KIS 파리티)
 *   2. 15:30 실체결 봉 + 15:31 동시호가 봉 공존 → **병합**(거래량 합산·close=동시호가 체결가),
 *      dedupe 로 한쪽 거래량이 비결정적으로 소실되면 안 됨
 *   3. 다른 봉은 통과, 날짜가 다른 15:30/15:31 은 병합되지 않음
 */

import { describe, it, expect } from "vitest";
import { mergeClosingAuctionBars } from "../minute";
import type { StockMinuteCandle } from "@/lib/api/kis/types";

function bar(date: string, close: number, volume: number): StockMinuteCandle {
  return { date, open: close, high: close + 1, low: close - 1, close, volume };
}

describe("mergeClosingAuctionBars", () => {
  it("15:31 봉 단독이면 15:30 으로 리라벨한다", () => {
    const input = [bar("2026-07-02T15:20", 286000, 230089), bar("2026-07-02T15:31", 286000, 3702849)];
    const out = mergeClosingAuctionBars(input);
    expect(out.map((c) => c.date)).toEqual(["2026-07-02T15:20", "2026-07-02T15:30"]);
    expect(out[1].volume).toBe(3702849);
  });

  it("15:30 실체결 봉이 있으면 병합 — 거래량 합산, close=동시호가 체결가", () => {
    const input = [
      bar("2026-07-02T15:30", 285500, 1000),
      bar("2026-07-02T15:31", 286000, 3702849),
    ];
    const out = mergeClosingAuctionBars(input);
    expect(out).toHaveLength(1);
    expect(out[0].date).toBe("2026-07-02T15:30");
    expect(out[0].volume).toBe(3703849); // 합산 — 어느 쪽도 소실되지 않음
    expect(out[0].close).toBe(286000); // 동시호가 체결가 = 공식 종가
    expect(out[0].high).toBe(286001);
    expect(out[0].low).toBe(285499);
  });

  it("날짜가 다르면 병합하지 않고, 일반 봉은 그대로 통과한다", () => {
    const input = [
      bar("2026-07-01T15:30", 300000, 500),
      bar("2026-07-02T09:00", 285000, 100),
      bar("2026-07-02T15:31", 286000, 200),
    ];
    const out = mergeClosingAuctionBars(input);
    expect(out.map((c) => c.date)).toEqual([
      "2026-07-01T15:30",
      "2026-07-02T09:00",
      "2026-07-02T15:30",
    ]);
  });
});
