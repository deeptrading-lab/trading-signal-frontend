/**
 * 로컬 AI CLI(claude·codex) 가용성 조회 훅 (TanStack Query useQuery).
 *
 * AI 분석 진입 화면(ProviderChooser)이 어떤 공급자를 선택지로 줄지 결정하는 데 사용한다.
 *
 * - queryKey = `queryKeys.stock.aiProviders` (종목 무관 단일 키).
 * - enabled — 패널이 열렸을 때만 호출(닫힌 동안 불필요한 fs 조회 방지).
 * - staleTime 짧게(30s) — 로컬에서 CLI 설치 상태가 바뀔 수 있음.
 * - refetchOnWindowFocus false / retry 0 — 가벼운 로컬 조회라 재시도·focus 갱신 불필요.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchAIProviderAvailability } from "@/lib/api/stock/aiAnalysis";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { ApiError } from "@/lib/api/errors";
import type { AIProviderAvailability } from "@/lib/types/stock/aiAnalysis";

export function useQueryAIProviders(
  enabled = true,
): UseQueryResult<AIProviderAvailability, ApiError> {
  return useQuery<AIProviderAvailability, ApiError>({
    queryKey: queryKeys.stock.aiProviders,
    queryFn: ({ signal }) => fetchAIProviderAvailability(signal),
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
