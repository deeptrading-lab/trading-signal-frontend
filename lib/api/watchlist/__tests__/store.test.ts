/**
 * `lib/api/watchlist/store.ts` 단위 테스트.
 *
 * PRD `watchlist-real-data` §3.5 / AC-6 — 저장소 격리 모듈(유일한 localStorage 접근점).
 * node 환경이라 localStorage 를 stub 으로 주입해 read/write/seed-flag 라운드트립을 검증한다.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  readTickers,
  writeTickers,
  hasSeeded,
  markSeeded,
} from "@/lib/api/watchlist/store";

function makeLocalStorageStub() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
}

describe("watchlist store", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: makeLocalStorageStub() });
  });

  it("초기엔 빈 배열 + 시드 미적용", () => {
    expect(readTickers()).toEqual([]);
    expect(hasSeeded()).toBe(false);
  });

  it("write 후 read 라운드트립 보존(순서 유지)", () => {
    writeTickers(["005930", "000660", "035420"]);
    expect(readTickers()).toEqual(["005930", "000660", "035420"]);
  });

  it("markSeeded 후 hasSeeded true — 0개여도 재시드 구분 가능", () => {
    expect(hasSeeded()).toBe(false);
    markSeeded();
    expect(hasSeeded()).toBe(true);
    writeTickers([]);
    expect(readTickers()).toEqual([]);
    expect(hasSeeded()).toBe(true);
  });

  it("문자열 아닌 값 / 깨진 JSON 은 graceful — 빈 배열", () => {
    window.localStorage.setItem("watchlist:tickers", "{not json");
    expect(readTickers()).toEqual([]);
    window.localStorage.setItem(
      "watchlist:tickers",
      JSON.stringify(["005930", 42, null]),
    );
    expect(readTickers()).toEqual(["005930"]);
  });

  it("window 미정의(SSR) 시 read 빈 배열 / write no-op", () => {
    vi.stubGlobal("window", undefined);
    expect(readTickers()).toEqual([]);
    expect(() => writeTickers(["005930"])).not.toThrow();
    expect(hasSeeded()).toBe(false);
  });
});
