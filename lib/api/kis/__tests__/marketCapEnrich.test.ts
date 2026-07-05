/**
 * 시가총액 배치 enrich 공용 로더 — 매핑·fail-soft·게이트 단위 테스트.
 *
 * 라이브(토스 마스터) 없이 규칙을 고정한다: 토스 미설정 → 빈 맵, 설정 시 `shares × price`,
 * 조회 실패·null·비정상 값은 맵에서 생략(호출측 null 처리). 절대 throw 하지 않는다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/api/toss/stockMaster", () => ({ getTossStockMaster: vi.fn() }));
vi.mock("@/lib/api/toss/client", () => ({ isTossConfigured: vi.fn() }));

import { loadMarketCaps } from "../marketCapEnrich";
import { getTossStockMaster } from "@/lib/api/toss/stockMaster";
import { isTossConfigured } from "@/lib/api/toss/client";

beforeEach(() => {
  vi.mocked(isTossConfigured).mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(isTossConfigured).mockReset();
  vi.mocked(getTossStockMaster).mockReset();
});

describe("loadMarketCaps", () => {
  it("토스 미설정이면 실호출 없이 빈 맵", async () => {
    vi.mocked(isTossConfigured).mockReturnValue(false);
    const out = await loadMarketCaps([{ ticker: "005930", price: 100 }]);
    expect(out.size).toBe(0);
    expect(getTossStockMaster).not.toHaveBeenCalled();
  });

  it("빈 입력이면 빈 맵", async () => {
    const out = await loadMarketCaps([]);
    expect(out.size).toBe(0);
  });

  it("shares × price 로 시총 산출", async () => {
    vi.mocked(getTossStockMaster).mockResolvedValue({
      sharesOutstanding: 1_000,
    } as never);
    const out = await loadMarketCaps([{ ticker: "005930", price: 250 }]);
    expect(out.get("005930")).toBe(250_000);
  });

  it("조회 실패·null·shares 0 은 맵에서 생략(fail-soft, throw 없음)", async () => {
    vi.mocked(getTossStockMaster).mockImplementation(async (t: string) => {
      if (t === "000001") throw new Error("토스 레이트");
      if (t === "000002") return null;
      if (t === "000003") return { sharesOutstanding: 0 } as never;
      return { sharesOutstanding: 10 } as never;
    });
    const out = await loadMarketCaps([
      { ticker: "000001", price: 100 },
      { ticker: "000002", price: 100 },
      { ticker: "000003", price: 100 },
      { ticker: "000004", price: 100 },
    ]);
    expect(out.has("000001")).toBe(false);
    expect(out.has("000002")).toBe(false);
    expect(out.has("000003")).toBe(false);
    expect(out.get("000004")).toBe(1_000);
  });

  it("동시성 캡을 넘는 입력도 전부 처리(배치 순회)", async () => {
    vi.mocked(getTossStockMaster).mockResolvedValue({
      sharesOutstanding: 2,
    } as never);
    const items = Array.from({ length: 14 }, (_, i) => ({
      ticker: String(i).padStart(6, "0"),
      price: 5,
    }));
    const out = await loadMarketCaps(items);
    expect(out.size).toBe(14);
    expect(getTossStockMaster).toHaveBeenCalledTimes(14);
  });
});
