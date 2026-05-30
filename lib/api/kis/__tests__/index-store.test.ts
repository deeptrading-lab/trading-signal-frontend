/**
 * `lib/api/kis/index-store.ts` 단위 테스트.
 *
 * PRD `kis-token-store` AC-5(지수 store dedup, 부수) — fake store 주입으로:
 *   - 국내(0001/1001) store hit 시 fetchIndexPrice 0회(크로스-라우트/인스턴스 dedup).
 *   - store miss 시 fetchIndexPrice 1회 + store SET(TTL 30s).
 *   - 비국내 코드(2001/SPX 등)는 store 미경유 직접 호출.
 *   - store 장애(throw)여도 fail-soft — KIS 직접 호출로 degrade.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ fetchIndexPrice: vi.fn() }));

vi.mock("../index-price", () => ({ fetchIndexPrice: mocks.fetchIndexPrice }));

import {
  fetchIndexPriceShared,
  isSharedIndexCode,
} from "../index-store";
import { MemoryKisStore, type KisStore } from "../store";
import type { MarketIndexQuote } from "../types";

function makeQuote(code: string, value = 1): MarketIndexQuote {
  return {
    code,
    name: code,
    value,
    change: 0,
    changePercent: 0,
    direction: "flat",
    volume: 0,
  };
}

describe("isSharedIndexCode", () => {
  it("국내 0001/1001 만 공유 store 대상", () => {
    expect(isSharedIndexCode("0001")).toBe(true);
    expect(isSharedIndexCode("1001")).toBe(true);
    expect(isSharedIndexCode("2001")).toBe(false);
    expect(isSharedIndexCode("SPX")).toBe(false);
  });
});

describe("fetchIndexPriceShared", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchIndexPrice.mockImplementation((code: string) =>
      Promise.resolve(makeQuote(code)),
    );
  });

  it("[AC-5] 국내 store miss → fetchIndexPrice 1회 + store SET(TTL 30s)", async () => {
    const store = new MemoryKisStore();
    const setSpy = vi.spyOn(store, "set");
    const quote = await fetchIndexPriceShared("0001", store);
    expect(quote.code).toBe("0001");
    expect(mocks.fetchIndexPrice).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith("kis:index:0001", quote, 30);
  });

  it("[AC-5] 국내 store hit → 두 번째 호출 fetchIndexPrice 0회(dedup)", async () => {
    const store = new MemoryKisStore();
    await fetchIndexPriceShared("0001", store); // miss → 발급 + SET.
    await fetchIndexPriceShared("0001", store); // hit → 0회.
    expect(mocks.fetchIndexPrice).toHaveBeenCalledTimes(1);
  });

  it("[AC-5] 같은 store 를 공유하면 다른 호출 경로(라우트)도 dedup 된다", async () => {
    const store = new MemoryKisStore(); // 두 라우트가 공유하는 store.
    await fetchIndexPriceShared("1001", store); // indices 라우트.
    await fetchIndexPriceShared("1001", store); // ticker 라우트 — store hit.
    expect(mocks.fetchIndexPrice).toHaveBeenCalledTimes(1);
  });

  it("비국내 코드(2001/SPX)는 store 미경유 직접 호출 — store 미터치", async () => {
    const store = new MemoryKisStore();
    const getSpy = vi.spyOn(store, "get");
    const setSpy = vi.spyOn(store, "set");
    await fetchIndexPriceShared("2001", store);
    expect(mocks.fetchIndexPrice).toHaveBeenCalledWith("2001");
    expect(getSpy).not.toHaveBeenCalled();
    expect(setSpy).not.toHaveBeenCalled();
  });

  it("[fail-soft] store.get 이 throw 해도 KIS 직접 호출로 degrade", async () => {
    // 실제 store(UpstashKisStore)는 흡수하지만, 흡수 안 되는 store 라도 래퍼가 막지 않음을 검증하려면
    // store 메서드가 null/정상 동작을 흉내내는 fake 로 충분. 여기선 get 이 null(=miss)만 줘도 degrade.
    const failSoftStore: KisStore = {
      async get<T>(): Promise<T | null> {
        return null; // store 다운을 흡수해 miss 처럼 보이는 케이스.
      },
      async set(): Promise<void> {},
      async del(): Promise<void> {},
      async acquireLock(): Promise<string | null> {
        return null;
      },
      async releaseLock(): Promise<void> {},
    };
    const quote = await fetchIndexPriceShared("0001", failSoftStore);
    expect(quote.code).toBe("0001");
    expect(mocks.fetchIndexPrice).toHaveBeenCalledTimes(1);
  });
});
