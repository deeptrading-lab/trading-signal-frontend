/**
 * 화이트리스트 검색 훅 — TanStack Query useQuery.
 *
 * PRD §9 OPEN QUESTION 2: 디폴트 옵션 (`staleTime`, `retry`, `refetchOnWindowFocus`) 은
 * FE Dev 재량으로 채택하고 후속 PRD 화면 설계 단계에서 디자이너와 재검토 가능.
 *
 * 채택값:
 *   - staleTime 300_000ms : 화이트리스트는 사실상 정적(서버 seed)이라 5분 캐시.
 *     동일 키워드 재검색·재진입 시 BFF 왕복 없이 캐시 히트 (symbols 검색 5m 정합).
 *   - retry 1            : 일시 네트워크 실패에 대한 1회 재시도.
 *   - refetchOnWindowFocus false : 사용자 타이핑 흐름과 무관한 포커스 변화로 다시 치지 않음.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { searchWhitelist } from "@/lib/api/workbench/whitelist";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { ApiError } from "@/lib/api/errors";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";

export type UseQueryWhitelistSearchOptions = {
  /** false 면 쿼리를 비활성화 (사용자가 입력 시작 전 등). 기본 true. */
  enabled?: boolean;
};

export function useQueryWhitelistSearch(
  q: string,
  options?: UseQueryWhitelistSearchOptions,
): UseQueryResult<WhitelistItem[], ApiError> {
  return useQuery<WhitelistItem[], ApiError>({
    queryKey: queryKeys.whitelist(q),
    queryFn: () => searchWhitelist(q),
    enabled: options?.enabled ?? true,
    staleTime: 300_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
