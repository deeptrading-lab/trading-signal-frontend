/**
 * prod 분석 요청 적재 mutation (TanStack Query useMutation).
 *
 * prod 카드에서 "이 종목 분석 요청" 클릭 시 enqueue BFF 를 호출한다. 도메인 훅
 * (`hooks/stock/useProdAnalysisRequest`)만 본 훅을 사용하고, 컴포넌트는 도메인 훅의
 * 추상 인터페이스(submit/reset/isPending 등)만 본다. (frontend.md §2 커스텀훅 의무화)
 */

"use client";

import { useMutation } from "@tanstack/react-query";
import { enqueueAIAnalysis } from "@/lib/api/stock/aiAnalysisQueue";
import type { ApiError } from "@/lib/api/errors";
import type { EnqueueAnalysisResponse } from "@/lib/types/stock/analysisQueue";

export function useMutationEnqueueAIAnalysis() {
  return useMutation<
    EnqueueAnalysisResponse,
    ApiError,
    { ticker: string; force?: boolean }
  >({
    mutationFn: ({ ticker, force }) => enqueueAIAnalysis(ticker, force),
  });
}
