/**
 * 기업개황 조회 훅 — TanStack Query useQuery.
 *
 * PRD `stock-api-integration` (PR-B) §3.4.
 *
 * - queryKey = `queryKeys.disclosure.company(ticker)` (PR-A 정착).
 * - staleTime / gcTime = `queryConfig.disclosure.company` (1d / 7d). 기업개황은 거의 변하지 않음.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchDisclosureCompanyClient } from "@/lib/api/disclosure/company";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { CompanyProfile } from "@/lib/api/dart/types";

export type UseQueryDisclosureCompanyOptions = {
  enabled?: boolean;
};

export function useQueryDisclosureCompany(
  ticker: string,
  options?: UseQueryDisclosureCompanyOptions,
): UseQueryResult<CompanyProfile, ApiError> {
  return useQuery<CompanyProfile, ApiError>({
    queryKey: queryKeys.disclosure.company(ticker),
    queryFn: () => fetchDisclosureCompanyClient(ticker),
    enabled: (options?.enabled ?? true) && ticker.length > 0,
    staleTime: queryConfig.disclosure.company.staleTime,
    gcTime: queryConfig.disclosure.company.gcTime,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
