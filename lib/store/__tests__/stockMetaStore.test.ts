import { describe, it, expect, beforeEach } from "vitest";
import { useStockMetaStore } from "../stockMetaStore";

const reset = () => useStockMetaStore.setState({ quotes: {} });
const get = () => useStockMetaStore.getState();

describe("stockMetaStore", () => {
  beforeEach(reset);

  it("upsertQuotes 로 ticker 별 시세를 병합한다", () => {
    get().upsertQuotes([
      { ticker: "005930", name: "삼성전자", price: 70000, change: 100, changePercent: 0.14, direction: "up", volume: 1000 },
    ]);
    const q = get().quotes["005930"];
    expect(q?.price).toBe(70000);
    expect(q?.name).toBe("삼성전자");
    expect(q?.direction).toBe("up");
    expect(typeof q?.asOf).toBe("number");
  });

  it("이름 없는 갱신은 기존 이름을 보존한다", () => {
    get().upsertQuotes([
      { ticker: "005930", name: "삼성전자", price: 70000, change: 0, changePercent: 0, direction: "flat", volume: 0 },
    ]);
    // 후속 갱신은 이름 미동봉(예: watchlist quote 가 ticker 폴백명일 때 라우터가 생략한 경우)
    get().upsertQuotes([
      { ticker: "005930", price: 71000, change: 1000, changePercent: 1.4, direction: "up", volume: 5 },
    ]);
    const q = get().quotes["005930"];
    expect(q?.price).toBe(71000);
    expect(q?.name).toBe("삼성전자"); // 보존
  });

  it("빈 배열/빈 ticker 는 무시", () => {
    get().upsertQuotes([]);
    expect(Object.keys(get().quotes)).toHaveLength(0);
    get().upsertQuotes([
      { ticker: "", price: 1, change: 0, changePercent: 0, direction: "flat", volume: 0 },
    ]);
    expect(Object.keys(get().quotes)).toHaveLength(0);
  });

  it("여러 ticker 를 한 번에 병합", () => {
    get().upsertQuotes([
      { ticker: "005930", price: 70000, change: 0, changePercent: 0, direction: "flat", volume: 0 },
      { ticker: "000660", price: 180000, change: -500, changePercent: -0.3, direction: "down", volume: 0 },
    ]);
    expect(Object.keys(get().quotes).sort()).toEqual(["000660", "005930"]);
  });
});
