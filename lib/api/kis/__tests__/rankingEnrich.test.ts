/**
 * 실시간 순위 서버 enrich — 매핑·fail-soft·dedup 단위 테스트.
 *
 * 시총 로더(`loadMarketCaps`)와 산업 로더(`loadKisPriceMeta`)를 모킹해 순수 조립 규칙을 고정한다:
 * 값 매핑, 미확보 시 marketCap=null·sector=undefined(fail-soft), 중복 티커는 산업 조회 1회(dedup).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../marketCapEnrich", () => ({ loadMarketCaps: vi.fn() }));
vi.mock("../price", () => ({ loadKisPriceMeta: vi.fn() }));

import { enrichRankingRows } from "../rankingEnrich";
import { loadMarketCaps } from "../marketCapEnrich";
import { loadKisPriceMeta } from "../price";

beforeEach(() => {
  vi.mocked(loadMarketCaps).mockReset();
  vi.mocked(loadKisPriceMeta).mockReset();
});

describe("enrichRankingRows", () => {
  it("빈 입력이면 enrich 로더를 호출하지 않고 빈 배열", async () => {
    const out = await enrichRankingRows([]);
    expect(out).toEqual([]);
    expect(loadMarketCaps).not.toHaveBeenCalled();
    expect(loadKisPriceMeta).not.toHaveBeenCalled();
  });

  it("시총·산업을 행에 매핑(원순서 보존)", async () => {
    vi.mocked(loadMarketCaps).mockResolvedValue(
      new Map([["005930", 500_000_000_000_000]]),
    );
    vi.mocked(loadKisPriceMeta).mockResolvedValue({
      sector: "전기·전자",
      foreignRatio: 50,
      tradeAmount: 5_297_000_000_000,
    });
    const out = await enrichRankingRows([
      { ticker: "005930", price: 70000 },
    ]);
    expect(out[0].marketCap).toBe(500_000_000_000_000);
    expect(out[0].sector).toBe("전기·전자");
    expect(out[0].price).toBe(70000);
  });

  it("행 자체 거래대금이 있으면 유지, 없으면 enrich 거래대금으로 채움", async () => {
    vi.mocked(loadMarketCaps).mockResolvedValue(new Map());
    vi.mocked(loadKisPriceMeta).mockResolvedValue({
      sector: "화학",
      foreignRatio: undefined,
      tradeAmount: 999_000_000_000, // enrich 값
    });
    const out = await enrichRankingRows([
      { ticker: "111111", price: 10, tradingValue: 123_000_000_000 }, // 자체 값
      { ticker: "222222", price: 20 }, // 자체 값 없음 → enrich
    ]);
    expect(out[0].tradingValue).toBe(123_000_000_000); // 자체 우선
    expect(out[1].tradingValue).toBe(999_000_000_000); // enrich 로 채움
  });

  it("미확보 값은 marketCap=null·sector=undefined·tradingValue=null(fail-soft)", async () => {
    vi.mocked(loadMarketCaps).mockResolvedValue(new Map());
    vi.mocked(loadKisPriceMeta).mockResolvedValue(null);
    const out = await enrichRankingRows([{ ticker: "999999", price: 100 }]);
    expect(out[0].marketCap).toBeNull();
    expect(out[0].sector).toBeUndefined();
    expect(out[0].tradingValue).toBeNull();
  });

  it("중복 티커는 산업 조회를 1회만(dedup)", async () => {
    vi.mocked(loadMarketCaps).mockResolvedValue(new Map());
    vi.mocked(loadKisPriceMeta).mockResolvedValue({
      sector: "화학",
      foreignRatio: undefined,
      tradeAmount: undefined,
    });
    await enrichRankingRows([
      { ticker: "111111", price: 10 },
      { ticker: "111111", price: 10 },
      { ticker: "222222", price: 20 },
    ]);
    expect(loadKisPriceMeta).toHaveBeenCalledTimes(2);
  });

  it("시총 로더가 throw 해도 산업만 채우고 무붕괴(never-throw)", async () => {
    vi.mocked(loadMarketCaps).mockRejectedValue(new Error("토스 장애"));
    vi.mocked(loadKisPriceMeta).mockResolvedValue({
      sector: "서비스업",
      foreignRatio: undefined,
      tradeAmount: undefined,
    });
    const out = await enrichRankingRows([{ ticker: "035720", price: 60000 }]);
    expect(out[0].marketCap).toBeNull();
    expect(out[0].sector).toBe("서비스업");
  });
});
