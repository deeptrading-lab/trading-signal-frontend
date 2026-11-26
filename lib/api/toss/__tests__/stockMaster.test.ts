import { afterEach, expect, it, vi } from "vitest";
import { tossGet } from "../client";
import { getTossStockMasters, resetTossStockMasterForTest } from "../stockMaster";

vi.mock("../client", () => ({ tossGet: vi.fn(), pickTossArray: (value: { stocks: unknown[] }) => value.stocks }));
afterEach(() => { resetTossStockMasterForTest(); vi.resetAllMocks(); });

it("batches unique cache misses, rejects unexpected symbols and reuses cached classifications", async () => {
  vi.mocked(tossGet).mockResolvedValue({ stocks: [
    { symbol: "005930", securityType: "STOCK" },
    { symbol: "252670", securityType: "ETF" },
    { symbol: "999999", securityType: "STOCK" },
  ] });
  const signal = new AbortController().signal;
  const result = await getTossStockMasters(["005930", "252670", "005930", "000660"], "program-paper", signal);
  expect([...result.keys()]).toEqual(["005930", "252670"]);
  expect(tossGet).toHaveBeenCalledExactlyOnceWith("/api/v1/stocks", { symbols: "005930,252670,000660" }, "program-paper", signal);
  expect(await getTossStockMasters(["005930", "252670"])).toEqual(result);
  expect(tossGet).toHaveBeenCalledTimes(1);
});
