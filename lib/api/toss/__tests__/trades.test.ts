/**
 * `lib/api/toss/tradeStrength.ts` + `lib/api/toss/trades.ts` 단위 테스트 —
 * 틱룰 파생(근사) + 체결 정규화 + never-throw 로더.
 *
 * PRD `toss-trades` AC-0·3·4·5·8·11 회귀 차단:
 *   - 상승/하락/동일틱 상속·혼합·빈배열·단일체결·전부동일가 경계 고정(strength=null)
 *   - 문자열 price/volume 파싱·timestamp 방어정렬·최신순 테이프
 *   - 키 미설정 = 빈 배열 + 토스 무호출, 실패 = 빈 배열 + 실패 캐시, 성공 캐시 single-flight
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  classifyTrades,
  deriveTradeStrength,
} from "../tradeStrength";
import {
  fetchTrades,
  normalizeTrades,
  resetTradesForTest,
} from "../trades";
import { isTossConfigured, tossGet } from "../client";
import type { Trade } from "@/lib/types/stock/trades";

vi.mock("../client", () => ({
  isTossConfigured: vi.fn(),
  tossGet: vi.fn(),
}));

const mockConfigured = vi.mocked(isTossConfigured);
const mockTossGet = vi.mocked(tossGet);

/** 시간순(과거→현재) 체결 배열 헬퍼 — timestamp 를 1초 간격으로 부여. */
function chrono(prices: number[], volume = 10): Trade[] {
  return prices.map((price, i) => ({
    price,
    volume,
    timestamp: `2026-07-03T09:00:0${i}+09:00`,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  resetTradesForTest();
  mockConfigured.mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("deriveTradeStrength", () => {
  it("상승만 있는 체결은 전부 매수 — strength = 1 (AC-3)", () => {
    const s = deriveTradeStrength(chrono([100, 101, 102, 103]));
    // 첫 체결은 seed(neutral, 제외), 이후 3틱 상승 = 매수.
    expect(s.buyVolume).toBe(30);
    expect(s.sellVolume).toBe(0);
    expect(s.strength).toBe(1);
    expect(s.sampleCount).toBe(3);
    expect(s.method).toBe("tick-rule");
    expect(s.isApproximation).toBe(true);
  });

  it("하락만 있는 체결은 전부 매도 — strength = 0 (AC-3)", () => {
    const s = deriveTradeStrength(chrono([103, 102, 101, 100]));
    expect(s.buyVolume).toBe(0);
    expect(s.sellVolume).toBe(30);
    expect(s.strength).toBe(0);
    expect(s.sampleCount).toBe(3);
  });

  it("동일가(zero-tick)는 직전 분류를 상속한다 (AC-4)", () => {
    // 100(seed) → 101(매수) → 101(상속=매수) → 100(매도) → 100(상속=매도).
    const s = deriveTradeStrength(chrono([100, 101, 101, 100, 100]));
    expect(s.buyVolume).toBe(20); // 101, 101
    expect(s.sellVolume).toBe(20); // 100, 100
    expect(s.strength).toBe(0.5);
    expect(s.sampleCount).toBe(4);
  });

  it("혼합 체결의 강도는 buyVol/(buyVol+sellVol) (AC-5)", () => {
    // 100(seed) → 101(매수,10) → 102(매수,10) → 101(매도,10).
    const s = deriveTradeStrength(chrono([100, 101, 102, 101]));
    expect(s.buyVolume).toBe(20);
    expect(s.sellVolume).toBe(10);
    expect(s.strength).toBeCloseTo(20 / 30, 5);
  });

  it("빈 배열은 strength = null, 볼륨 0 (AC-5)", () => {
    const s = deriveTradeStrength([]);
    expect(s.strength).toBeNull();
    expect(s.buyVolume).toBe(0);
    expect(s.sellVolume).toBe(0);
    expect(s.sampleCount).toBe(0);
  });

  it("단일 체결은 seed(neutral)만 있어 strength = null", () => {
    const s = deriveTradeStrength(chrono([100]));
    expect(s.strength).toBeNull();
    expect(s.sampleCount).toBe(0);
  });

  it("전부 동일가 스트림은 분류 불가 — strength = null (불명)", () => {
    const s = deriveTradeStrength(chrono([100, 100, 100]));
    expect(s.strength).toBeNull();
    expect(s.buyVolume).toBe(0);
    expect(s.sellVolume).toBe(0);
  });

  it("입력이 최신순이어도 timestamp 로 시간순 정렬 후 분류한다 (AC-4 방어정렬)", () => {
    // 최신순(내림차순 timestamp) 입력 — 정렬 없이 그대로 보면 하락으로 오분류될 수 있다.
    const newestFirst = [...chrono([100, 101, 102])].reverse();
    const s = deriveTradeStrength(newestFirst);
    // 시간순 정렬 후 100→101→102 = 상승 2틱 = 매수.
    expect(s.buyVolume).toBe(20);
    expect(s.sellVolume).toBe(0);
    expect(s.strength).toBe(1);
  });
});

describe("classifyTrades", () => {
  it("테이프는 최신순(맨 위=가장 최근) + side 부착", () => {
    const tape = classifyTrades(chrono([100, 101, 100]));
    // 시간순 분류: 100(neutral) 101(buy) 100(sell) → 최신순 뒤집기.
    expect(tape.map((t) => t.price)).toEqual([100, 101, 100]);
    expect(tape.map((t) => t.side)).toEqual(["sell", "buy", "neutral"]);
  });

  it("동일가는 상속 side, seed 첫(시간순) 체결은 neutral", () => {
    const tape = classifyTrades(chrono([100, 100, 101, 101]));
    // 시간순 side: neutral, neutral(상속), buy, buy(상속) → 최신순.
    expect(tape.map((t) => t.side)).toEqual(["buy", "buy", "neutral", "neutral"]);
  });
});

describe("normalizeTrades", () => {
  it("문자열 price/volume 을 파싱하고 순서를 보존한다 (AC-0)", () => {
    const trades = normalizeTrades([
      { price: "288500", volume: "12", timestamp: "2026-07-03T14:59:59+09:00" },
      { price: "288400", volume: "3", timestamp: "2026-07-03T14:59:58+09:00" },
    ]);
    expect(trades).toEqual([
      { price: 288500, volume: 12, timestamp: "2026-07-03T14:59:59+09:00" },
      { price: 288400, volume: 3, timestamp: "2026-07-03T14:59:58+09:00" },
    ]);
  });

  it("가격 0/음수·잘못된 볼륨·timestamp 결측을 방어한다 (NaN 없음)", () => {
    const trades = normalizeTrades([
      { price: "0", volume: "5", timestamp: "2026-07-03T14:00:00+09:00" }, // 0 가격 제외
      { price: "100", volume: "abc", timestamp: "2026-07-03T14:00:01+09:00" }, // 볼륨 NaN 제외
      { price: "100", volume: "-1", timestamp: "2026-07-03T14:00:02+09:00" }, // 음수 볼륨 제외
      { price: "100", volume: "5", timestamp: undefined }, // timestamp 결측 제외
      { price: "100", volume: "0", timestamp: "2026-07-03T14:00:03+09:00" }, // 볼륨 0 은 유지
    ]);
    expect(trades).toEqual([
      { price: 100, volume: 0, timestamp: "2026-07-03T14:00:03+09:00" },
    ]);
  });

  it("배열이 아닌 입력은 빈 배열", () => {
    expect(normalizeTrades(null)).toEqual([]);
    expect(normalizeTrades(undefined)).toEqual([]);
  });
});

describe("fetchTrades", () => {
  it("토스 키 미설정이면 빈 배열 — 토스 호출 자체가 없다 (AC-8)", async () => {
    mockConfigured.mockReturnValue(false);
    const trades = await fetchTrades("005930");
    expect(trades).toEqual([]);
    expect(mockTossGet).not.toHaveBeenCalled();
  });

  it("symbol·count 를 쿼리 파라미터로 전달하고 정규화 결과를 반환한다", async () => {
    mockTossGet.mockResolvedValue([
      { price: "101", volume: "2", timestamp: "2026-07-03T14:00:01+09:00" },
    ]);
    const trades = await fetchTrades("005930", 30);
    expect(mockTossGet).toHaveBeenCalledWith("/api/v1/trades", {
      symbol: "005930",
      count: 30,
    });
    expect(trades).toHaveLength(1);
    expect(trades[0].price).toBe(101);
  });

  it("조회 실패는 빈 배열로 수렴하고 throw 하지 않는다 (fail-soft)", async () => {
    mockTossGet.mockRejectedValue(new Error("404"));
    await expect(fetchTrades("005930")).resolves.toEqual([]);
  });

  it("성공 캐시 + single-flight — 3s 내 동시 요청은 토스 1콜 (AC-11)", async () => {
    mockTossGet.mockResolvedValue([
      { price: "101", volume: "1", timestamp: "2026-07-03T14:00:01+09:00" },
    ]);
    const [a, b] = await Promise.all([
      fetchTrades("005930"),
      fetchTrades("005930"),
    ]);
    expect(a).toBe(b); // 동일 promise 결과
    expect(mockTossGet).toHaveBeenCalledTimes(1);
    // 캐시 히트 — 추가 호출 없음.
    await fetchTrades("005930");
    expect(mockTossGet).toHaveBeenCalledTimes(1);
  });
});
