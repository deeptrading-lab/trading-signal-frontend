/**
 * `lib/api/toss/orderbook.ts` 단위 테스트 — 호가 정규화 + never-throw 로더.
 *
 * PRD `toss-orderbook` AC-0·1·3·4·5·6·9 회귀 차단:
 *   - 문자열 price/volume 파싱, 정렬 보장, 스프레드/총잔량, 빈 배열 → 빈 호가
 *   - 키 미설정 = 빈 호가 + 토스 무호출, 실패 = 빈 호가 + 실패 캐시, 성공 캐시 single-flight
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchOrderbook,
  normalizeOrderbook,
  resetOrderbookForTest,
} from "../orderbook";
import { isTossConfigured, tossGet } from "../client";

vi.mock("../client", () => ({
  isTossConfigured: vi.fn(),
  tossGet: vi.fn(),
}));

const mockConfigured = vi.mocked(isTossConfigured);
const mockTossGet = vi.mocked(tossGet);

beforeEach(() => {
  vi.clearAllMocks();
  resetOrderbookForTest();
  mockConfigured.mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("normalizeOrderbook", () => {
  it("문자열 price/volume 을 파싱하고 정렬·총잔량·스프레드를 계산한다 (AC-0·3·4)", () => {
    const ob = normalizeOrderbook({
      timestamp: "2026-07-04T13:00:00+09:00",
      currency: "KRW",
      // asks 오름차순(최우선 최저), bids 내림차순(최우선 최고) — 일부러 뒤섞어 정렬 검증.
      asks: [
        { price: "100200", volume: "10" },
        { price: "100100", volume: "5" },
      ],
      bids: [
        { price: "100000", volume: "7" },
        { price: "99900", volume: "3" },
      ],
    });

    expect(ob.isEmpty).toBe(false);
    expect(ob.asks.map((l) => l.price)).toEqual([100100, 100200]); // 오름차순
    expect(ob.bids.map((l) => l.price)).toEqual([100000, 99900]); // 내림차순
    expect(ob.totalAskQty).toBe(15);
    expect(ob.totalBidQty).toBe(10);
    // 스프레드 = 최우선 매도(100100) − 최우선 매수(100000) = 100.
    expect(ob.spread).toBe(100);
    expect(ob.spreadPct).toBeCloseTo((100 / 100050) * 100, 5);
    expect(ob.updatedAt).toBe("2026-07-04T13:00:00+09:00");
  });

  it("빈 배열 응답은 빈 호가(장 마감/미지원)로 수렴한다 (AC-5)", () => {
    const ob = normalizeOrderbook({ asks: [], bids: [] });
    expect(ob.isEmpty).toBe(true);
    expect(ob.spread).toBeNull();
    expect(ob.spreadPct).toBeNull();
  });

  it("잔량 0·가격 결측 단계를 방어하고 NaN 을 만들지 않는다", () => {
    const ob = normalizeOrderbook({
      asks: [
        { price: "100100", volume: "0" }, // 잔량 0 단계 유지(가격만)
        { price: undefined, volume: "9" }, // 가격 결측 → 제외
        { price: "0", volume: "9" }, // 0 가격 → 제외
      ],
      bids: [{ price: "100000", volume: "abc" }], // 잘못된 잔량 → 0
    });
    expect(ob.asks).toEqual([{ price: 100100, qty: 0 }]);
    expect(ob.bids).toEqual([{ price: 100000, qty: 0 }]);
    expect(ob.totalAskQty).toBe(0);
    expect(Number.isNaN(ob.totalBidQty)).toBe(false);
  });

  it("한쪽 존만 있으면 스프레드는 null", () => {
    const ob = normalizeOrderbook({ asks: [{ price: "100", volume: "1" }], bids: [] });
    expect(ob.isEmpty).toBe(false);
    expect(ob.spread).toBeNull();
  });
});

describe("fetchOrderbook", () => {
  it("토스 키 미설정이면 빈 호가 — 토스 호출 자체가 없다 (AC-1)", async () => {
    mockConfigured.mockReturnValue(false);
    const ob = await fetchOrderbook("005930");
    expect(ob.isEmpty).toBe(true);
    expect(mockTossGet).not.toHaveBeenCalled();
  });

  it("symbol 을 쿼리 파라미터로 전달하고 정규화 결과를 반환한다", async () => {
    mockTossGet.mockResolvedValue({
      timestamp: "2026-07-04T13:00:00+09:00",
      asks: [{ price: "101", volume: "2" }],
      bids: [{ price: "100", volume: "3" }],
    });
    const ob = await fetchOrderbook("005930");
    expect(mockTossGet).toHaveBeenCalledWith("/api/v1/orderbook", { symbol: "005930" });
    expect(ob.spread).toBe(1);
  });

  it("조회 실패는 빈 호가로 수렴하고 throw 하지 않는다 (AC-6)", async () => {
    mockTossGet.mockRejectedValue(new Error("404"));
    await expect(fetchOrderbook("005930")).resolves.toMatchObject({ isEmpty: true });
  });

  it("성공 캐시 + single-flight — 3s 내 동시 요청은 토스 1콜 (AC-9)", async () => {
    mockTossGet.mockResolvedValue({ asks: [{ price: "101", volume: "1" }], bids: [] });
    const [a, b] = await Promise.all([fetchOrderbook("005930"), fetchOrderbook("005930")]);
    expect(a).toBe(b); // 동일 promise 결과
    expect(mockTossGet).toHaveBeenCalledTimes(1);
    // 캐시 히트 — 추가 호출 없음.
    await fetchOrderbook("005930");
    expect(mockTossGet).toHaveBeenCalledTimes(1);
  });
});
