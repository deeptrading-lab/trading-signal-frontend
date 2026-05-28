/**
 * `/api/disclosure/company` 클라이언트 — DART 기업개황 BFF 호출.
 *
 * PRD `stock-api-integration` (PR-B) §3.3.2 — DART 직접 호출 금지. axios 인스턴스 (`@/lib/api/client`)
 * 의 baseURL = same-origin `/api`. 본 모듈은 hooks/disclosure/useQueryDisclosureCompany 안에서만 호출.
 *
 * BFF 응답은 이미 `CompanyProfile` 클라이언트 친화 스키마.
 */

import { httpClient } from "@/lib/api/client";
import type { CompanyProfile } from "@/lib/api/dart/types";

export async function fetchDisclosureCompanyClient(
  ticker: string,
): Promise<CompanyProfile> {
  const response = await httpClient.get<CompanyProfile>("/disclosure/company", {
    params: { ticker },
  });
  return response.data;
}
