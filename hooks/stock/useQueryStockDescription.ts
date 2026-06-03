/**
 * 종목 "회사 소개"(자유 텍스트, 외부 출처) 조회 훅 (TanStack Query useQuery).
 *
 * 출처·결정: `docs/research/company-description-sources.md`.
 *
 * - queryKey = `queryKeys.stock.description(ticker)`.
 * - staleTime / gcTime = `queryConfig.stock.description`(1일 / 7일) — 분기보고서 주기 정적 정보.
 * - enabled — ticker 빈 문자열 시 비활성. (CompanyOverviewContent 가 펼침 시에만 마운트 → 지연 패칭.)
 * - retry 0 — BFF(`/api/stock/description`)가 실패 시 빈 배열로 degrade 하므로 재시도 불필요.
 * - refetchOnWindowFocus false — 정적 정보라 focus 마다 갱신 불필요.
 *
 * 응답 가공 불필요 — BFF 가 이미 `CompanyDescription` 화면 친화 스키마 반환.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getStockDescription } from "@/lib/api/stock/description";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { CompanyDescription } from "@/lib/types/stock/description";

export type UseQueryStockDescriptionOptions = {
  /** false 면 쿼리 비활성. 기본 true. */
  enabled?: boolean;
};

export function useQueryStockDescription(
  ticker: string,
  options?: UseQueryStockDescriptionOptions,
): UseQueryResult<CompanyDescription, ApiError> {
  return useQuery<CompanyDescription, ApiError>({
    queryKey: queryKeys.stock.description(ticker),
    queryFn: () => getStockDescription(ticker),
    enabled: (options?.enabled ?? true) && ticker.length > 0,
    staleTime: queryConfig.stock.description.staleTime,
    gcTime: queryConfig.stock.description.gcTime,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
