/**
 * `lib/api/disclosure/company.ts` 단위 테스트.
 *
 * PRD `stock-api-integration` (PR-B).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

import { fetchDisclosureCompanyClient } from "../company";
import { httpClient } from "@/lib/api/client";
import type { CompanyProfile } from "@/lib/api/dart/types";

const MOCK_PROFILE: CompanyProfile = {
  ticker: "005930",
  corpName: "삼성전자주식회사",
  ceoName: "한종희, 노태문",
  market: "KOSPI",
  establishedDate: "1969-01-13",
};

describe("fetchDisclosureCompanyClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ticker 를 query 로 넘기고 /disclosure/company 호출", async () => {
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: MOCK_PROFILE,
    });
    const result = await fetchDisclosureCompanyClient("005930");
    expect(httpClient.get).toHaveBeenCalledWith("/disclosure/company", {
      params: { ticker: "005930" },
    });
    expect(result).toEqual(MOCK_PROFILE);
  });
});
