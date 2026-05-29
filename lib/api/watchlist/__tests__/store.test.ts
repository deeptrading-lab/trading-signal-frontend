/**
 * `lib/api/watchlist/store.ts` 단위 테스트.
 *
 * PRD `watchlist-real-data` §3.5 / AC-6 — 저장소 격리 모듈(유일한 localStorage 접근점).
 * node 환경이라 localStorage 를 stub 으로 주입해 read/write/seed-flag 라운드트립을 검증한다.
 *
 * UI 점검(2026-05-30) #2 — 엔트리 모델(`{ ticker, name? }`) 전환 + 구버전(`string[]`) 마이그레이션.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  readEntries,
  writeEntries,
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
    expect(readEntries()).toEqual([]);
    expect(hasSeeded()).toBe(false);
  });

  it("write 후 read 라운드트립 보존(순서·name 유지)", () => {
    writeEntries([
      { ticker: "005930", name: "삼성전자" },
      { ticker: "000660", name: "SK하이닉스" },
      { ticker: "035420" },
    ]);
    expect(readEntries()).toEqual([
      { ticker: "005930", name: "삼성전자" },
      { ticker: "000660", name: "SK하이닉스" },
      { ticker: "035420" },
    ]);
  });

  it("구버전 string[] 저장값을 { ticker } 로 마이그레이션", () => {
    window.localStorage.setItem(
      "watchlist:tickers",
      JSON.stringify(["005930", "000660"]),
    );
    expect(readEntries()).toEqual([
      { ticker: "005930" },
      { ticker: "000660" },
    ]);
  });

  it("markSeeded 후 hasSeeded true — 0개여도 재시드 구분 가능", () => {
    expect(hasSeeded()).toBe(false);
    markSeeded();
    expect(hasSeeded()).toBe(true);
    writeEntries([]);
    expect(readEntries()).toEqual([]);
    expect(hasSeeded()).toBe(true);
  });

  it("잘못된 값(깨진 JSON / ticker 없는 객체 / name 비문자열)은 graceful 처리", () => {
    window.localStorage.setItem("watchlist:tickers", "{not json");
    expect(readEntries()).toEqual([]);
    window.localStorage.setItem(
      "watchlist:tickers",
      JSON.stringify([
        "005930",
        { ticker: "000660", name: 42 },
        { name: "이름만" },
        null,
        { ticker: "035420", name: "NAVER" },
      ]),
    );
    expect(readEntries()).toEqual([
      { ticker: "005930" },
      { ticker: "000660" },
      { ticker: "035420", name: "NAVER" },
    ]);
  });

  it("window 미정의(SSR) 시 read 빈 배열 / write no-op", () => {
    vi.stubGlobal("window", undefined);
    expect(readEntries()).toEqual([]);
    expect(() => writeEntries([{ ticker: "005930" }])).not.toThrow();
    expect(hasSeeded()).toBe(false);
  });
});
