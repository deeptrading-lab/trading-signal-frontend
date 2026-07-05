/**
 * prod 분석 요청 적재 mutation (TanStack Query useMutation).
 *
 * prod 카드에서 "이 종목 분석 요청" 클릭 시 enqueue BFF 를 호출한다. 도메인 훅
 * (`hooks/stock/useProdAnalysisRequest`)만 본 훅을 사용하고, 컴포넌트는 도메인 훅의
 * 추상 인터페이스(submit/reset/isPending 등)만 본다. (frontend.md §2 커스텀훅 의무화)
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueAIAnalysis } from "@/lib/api/stock/aiAnalysisQueue";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { ApiError } from "@/lib/api/errors";
import type { EnqueueAnalysisResponse } from "@/lib/types/stock/analysisQueue";

export function useMutationEnqueueAIAnalysis() {
  const queryClient = useQueryClient();
  return useMutation<
    EnqueueAnalysisResponse,
    ApiError,
    { ticker: string; force?: boolean; name?: string | null }
  >({
    mutationFn: ({ ticker, force, name }) => enqueueAIAnalysis(ticker, force, name),
    // 실패는 aria-live 배너로 표면화 — 전역 토스트 opt-out(중복 방지).
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      // 접수 직후 워커 상태 뱃지를 즉시 갱신(다음 폴링까지 안 기다림). 뱃지 미마운트면 무해.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stock.workerStatus,
      });
    },
  });
}
