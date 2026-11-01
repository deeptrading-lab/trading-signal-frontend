/**
 * 종목 AI 노트(뉴스·공시 정리) 조회 훅 — 처리 중(pending·processing)이면 10초마다 다시 읽는다.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchSwingNote } from "@/lib/api/swing/note";
import type { SwingNoteResponse } from "@/lib/types/swing/api";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export function isSwingNoteActive(data: SwingNoteResponse | undefined): boolean {
  const s = data?.note?.status;
  return s === "pending" || s === "processing";
}

export function useQuerySwingNote(ticker: string): UseQueryResult<SwingNoteResponse, ApiError> {
  return useQuery<SwingNoteResponse, ApiError>({
    queryKey: queryKeys.swing.note(ticker),
    queryFn: () => fetchSwingNote(ticker),
    staleTime: queryConfig.swing.note.staleTime,
    gcTime: queryConfig.swing.note.gcTime,
    refetchInterval: (query) => (isSwingNoteActive(query.state.data) ? queryConfig.swing.note.pollMs : false),
    retry: (count, error) => error.status !== 404 && count < 1,
    refetchOnWindowFocus: false,
  });
}
