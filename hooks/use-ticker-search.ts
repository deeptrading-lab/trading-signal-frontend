/**
 * ticker 검색 입력을 250ms debounce 한 뒤 `useWhitelistSearch` 를 호출하는 래퍼.
 *
 * DESIGN.md OPEN QUESTION #1 결정 그대로:
 *   - debounce 250ms
 *   - 결과가 1건일 때도 자동 선택 X (이 훅은 결과 목록만 노출, 선택은 호출 측 책임)
 */

"use client";

import { useEffect, useState } from "react";
import { useWhitelistSearch } from "@/lib/query/use-whitelist-search";
import type { WhitelistItem } from "@/lib/types/whitelist";
import type { ApiError } from "@/lib/api/errors";

const DEBOUNCE_MS = 250;

export type UseTickerSearchResult = {
  /** debounced 쿼리(`useWhitelistSearch` 에 흘러간 값). */
  debouncedQuery: string;
  results: WhitelistItem[];
  isPending: boolean;
  error: ApiError | null;
};

export function useTickerSearch(
  query: string,
  options?: { enabled?: boolean },
): UseTickerSearchResult {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const enabled = options?.enabled ?? true;
  const { data, isFetching, error } = useWhitelistSearch(debouncedQuery, {
    enabled,
  });

  return {
    debouncedQuery,
    results: data ?? [],
    isPending: isFetching,
    error: error ?? null,
  };
}
