/**
 * 종목 AI 노트 요청 훅 — 응답(새 pending 또는 재사용 노트)을 조회 캐시에 바로 넣어 폴링을 시작시킨다.
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestSwingNote } from "@/lib/api/swing/note";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { ApiError } from "@/lib/api/errors";
import type { SwingNoteResponse } from "@/lib/types/swing/api";

export function useMutationSwingNote(ticker: string) {
  const queryClient = useQueryClient();
  return useMutation<SwingNoteResponse, ApiError>({
    mutationFn: () => requestSwingNote(ticker),
    // 실패는 섹션 인라인 문구로 — 전역 토스트 opt-out(중복 방지).
    meta: { skipGlobalErrorToast: true },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.swing.note(ticker), data);
    },
  });
}
