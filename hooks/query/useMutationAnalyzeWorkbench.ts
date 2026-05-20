/**
 * Workbench 분석 mutation 훅 — TanStack Query useMutation.
 *
 * 후속 PRD 화면에서 폼 제출 시 `mutate(payload)` 로 호출한다.
 * 에러는 `lib/api/client.ts` 의 인터셉터가 `ApiError` 로 매핑한 뒤 throw 한다.
 */

"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { analyzeWorkbench } from "@/lib/api/workbench/analyze";
import type { ApiError } from "@/lib/api/errors";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
} from "@/lib/types/workbench/analyze";

export function useMutationAnalyzeWorkbench(): UseMutationResult<
  AnalyzeResponse,
  ApiError,
  AnalyzeRequest
> {
  return useMutation<AnalyzeResponse, ApiError, AnalyzeRequest>({
    mutationFn: (payload) => analyzeWorkbench(payload),
  });
}
