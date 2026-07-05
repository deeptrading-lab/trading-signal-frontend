/**
 * `deriveRankingView` 단위 — 실시간 순위 가용성 뷰 파생(PRD §3-1 / DESIGN R5·R6·R7).
 *
 * available 탭만 노출, 활성 탭 소실 시 자동 이동, 전탭 실패 → maintenance, 로딩 우선.
 */

import { describe, it, expect } from "vitest";
import { deriveRankingView } from "@/lib/market/rankingView";
import type { Availability } from "@/lib/market/availability";

type Tab = "volume" | "turnover" | "surge" | "plunge";
const ORDER: readonly Tab[] = ["volume", "turnover", "surge", "plunge"];

const map = (
  volume: Availability,
  turnover: Availability,
  surge: Availability,
  plunge: Availability,
): Record<Tab, Availability> => ({ volume, turnover, surge, plunge });

describe("deriveRankingView", () => {
  it("전탭 available → 4탭 노출·활성 탭 유지·list", () => {
    const v = deriveRankingView(
      ORDER,
      map("available", "available", "available", "available"),
      "surge",
    );
    expect(v.availableTabs).toEqual(["volume", "turnover", "surge", "plunge"]);
    expect(v.effectiveTab).toBe("surge");
    expect(v.view).toBe("list");
  });

  it("활성 탭이 unavailable 로 소실 → 첫 available 로 자동 이동", () => {
    const v = deriveRankingView(
      ORDER,
      map("available", "available", "unavailable", "unavailable"),
      "surge",
    );
    expect(v.availableTabs).toEqual(["volume", "turnover"]);
    expect(v.effectiveTab).toBe("volume");
    expect(v.view).toBe("list");
  });

  it("available 1개만 남아도 list(컴포넌트가 정적 라벨로 강등)", () => {
    const v = deriveRankingView(
      ORDER,
      map("unavailable", "available", "unavailable", "unavailable"),
      "volume",
    );
    expect(v.availableTabs).toEqual(["turnover"]);
    expect(v.effectiveTab).toBe("turnover");
    expect(v.view).toBe("list");
  });

  it("전탭 settled + available 0 → maintenance", () => {
    const v = deriveRankingView(
      ORDER,
      map("unavailable", "unavailable", "unavailable", "unavailable"),
      "volume",
    );
    expect(v.availableTabs).toEqual([]);
    expect(v.effectiveTab).toBeUndefined();
    expect(v.allSettled).toBe(true);
    expect(v.view).toBe("maintenance");
  });

  it("아무 탭도 settled 전 → loading(점검 오판 방지)", () => {
    const v = deriveRankingView(
      ORDER,
      map("loading", "loading", "loading", "loading"),
      "volume",
    );
    expect(v.settledCount).toBe(0);
    expect(v.view).toBe("loading");
  });

  it("available 0 이지만 일부 아직 로딩 → loading 유지(성급한 점검 안내 금지)", () => {
    const v = deriveRankingView(
      ORDER,
      map("unavailable", "unavailable", "loading", "unavailable"),
      "volume",
    );
    expect(v.availableTabs).toEqual([]);
    expect(v.allSettled).toBe(false);
    expect(v.view).toBe("loading");
  });

  it("일부 available·일부 로딩 → list(available 즉시 노출)", () => {
    const v = deriveRankingView(
      ORDER,
      map("available", "loading", "unavailable", "loading"),
      "volume",
    );
    expect(v.availableTabs).toEqual(["volume"]);
    expect(v.effectiveTab).toBe("volume");
    expect(v.view).toBe("list");
  });
});
