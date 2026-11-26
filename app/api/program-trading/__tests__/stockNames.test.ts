import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { getTossStockMaster } from "@/lib/api/toss/stockMaster";
import { getLocalPaperRuntime } from "@/lib/server/programTrading/localPaperRuntime";
import { initialState } from "@/lib/server/programTrading/engine";
import type { TradingState } from "@/lib/types/programTrading/programTrading";
import { GET } from "../route";

vi.mock("@/lib/server/programTrading/accountIdentity", () => ({ readProgramAccount: () => "fixture-owner" }));
vi.mock("@/lib/api/toss/client", () => ({ isTossConfigured: () => true }));
vi.mock("@/lib/api/toss/stockMaster", () => ({ getTossStockMaster: vi.fn() }));
vi.mock("@/lib/server/programTrading/localRequest", () => ({ allowsLocalProgram: () => true }));
vi.mock("@/lib/server/programTrading/localPaperRuntime", () => ({ getLocalPaperRuntime: vi.fn() }));

afterEach(() => vi.resetAllMocks());

async function readHoldings(name = "999999") {
  const state = initialState();
  state.positions = [{ ticker: "999999", name, quantity: 1, entry: 1000, mark: 1000 }];
  state.trades = [{ ticker: "999999", name, id: "buy-1", minute: 550, side: "buy", quantity: 1, price: 1000, fee: 0, reason: "volume-rank", net: null }];
  return readState(state);
}

async function readState(state: TradingState) {
  vi.mocked(getLocalPaperRuntime).mockResolvedValue({
    snapshot: async () => ({ ...state, startBlockReason: undefined }),
    run: vi.fn(),
    saveAssets: vi.fn(),
    withIdleForImprovement: vi.fn(),
    download: vi.fn(),
  });
  const response = await GET(new NextRequest("http://127.0.0.1:3000/api/program-trading"));
  expect(response.status).toBe(200);
  return { body: await response.json(), state };
}

it("시드에 없는 보유 종목과 체결에 종목명을 보강하고 원장은 변경하지 않는다", async () => {
  vi.mocked(getTossStockMaster).mockResolvedValue({ symbol: "999999", name: " 새종목 " });
  const { body, state } = await readHoldings();
  expect(body.positions[0].name).toBe("새종목");
  expect(body.trades[0].name).toBe("새종목");
  expect(getTossStockMaster).toHaveBeenCalledExactlyOnceWith("999999");
  expect(state.positions[0].name).toBe("999999");
});

it("미보유 거래량 상위 상승 후보에도 종목명을 표시하고 순위와 수치는 보존한다", async () => {
  const state = initialState();
  state.candidates = { ...state.candidates, status: "ready", rows: [
    { ticker: "999999", name: "999999", price: 1000, changePercent: 2, previousClose: 980, sources: ["volume"], volume: 2000000, rank: 1 },
  ] };
  vi.mocked(getTossStockMaster).mockResolvedValue({ symbol: "999999", name: "새종목" });
  const { body } = await readState(state);
  expect(body.candidates.rows).toEqual([{ ...state.candidates.rows[0], name: "새종목" }]);
  expect(state.candidates.rows[0].name).toBe("999999");
  expect(getTossStockMaster).toHaveBeenCalledExactlyOnceWith("999999");
});

it("후보 종목명 조회 실패 시에도 거래량 상위 상승 목록을 반환한다", async () => {
  const state = initialState();
  state.candidates.rows = [
    { ticker: "999999", name: "999999", price: 1000, changePercent: 2, previousClose: 980, sources: ["volume"] },
  ];
  vi.mocked(getTossStockMaster).mockRejectedValue(new Error("unavailable"));
  const { body } = await readState(state);
  expect(body.candidates.rows).toEqual(state.candidates.rows);
});

it("기존 종목명이 있으면 추가 조회하지 않는다", async () => {
  const { body } = await readHoldings("기존종목");
  expect(body.positions[0].name).toBe("기존종목");
  expect(getTossStockMaster).not.toHaveBeenCalled();
});

it("종목 정보 조회 실패 시에도 보유 상태를 반환한다", async () => {
  vi.mocked(getTossStockMaster).mockRejectedValue(new Error("unavailable"));
  const { body } = await readHoldings();
  expect(body.positions[0]).toMatchObject({ ticker: "999999", quantity: 1, name: "999999" });
});

it("응답 심볼이 다르면 다른 종목명을 표시하지 않는다", async () => {
  vi.mocked(getTossStockMaster).mockResolvedValue({ symbol: "888888", name: "다른종목" });
  const { body } = await readHoldings();
  expect(body.positions[0].name).toBe("999999");
});
