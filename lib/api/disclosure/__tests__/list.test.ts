/**
 * `lib/api/disclosure/list.ts` 단위 테스트.
 *
 * PRD `stock-api-integration` (PR-B).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

import { fetchDisclosureListClient } from "../list";
import { httpClient } from "@/lib/api/client";
import type { DisclosureItem } from "@/lib/api/dart/types";

const ITEM: DisclosureItem = {
  rceptNo: "20260520000001",
  corpName: "삼성전자",
  reportName: "주요사항보고서(자기주식취득결정)",
  filerName: "삼성전자",
  rceptDate: "2026-05-20",
};

describe("fetchDisclosureListClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("count 기본값 5", async () => {
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [ITEM],
    });
    await fetchDisclosureListClient("005930");
    expect(httpClient.get).toHaveBeenCalledWith("/disclosure/list", {
      params: { ticker: "005930", count: 5 },
    });
  });

  it("count 명시 시 그대로", async () => {
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [ITEM],
    });
    const result = await fetchDisclosureListClient("005930", 10);
    expect(httpClient.get).toHaveBeenCalledWith("/disclosure/list", {
      params: { ticker: "005930", count: 10 },
    });
    expect(result).toEqual([ITEM]);
  });
});
