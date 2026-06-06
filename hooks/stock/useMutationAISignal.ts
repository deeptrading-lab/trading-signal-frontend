/**
 * useMutationAISignal — AI 최종 판단 트리거.
 *
 * `mutate(ticker)` 호출 → `/api/stock/ai-signal` → AISignalResponse.
 * 로컬 전용(claude-cli), Vercel에서 503 반환 시 error.message에 한글 안내.
 */

"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchAISignal } from "@/lib/api/stock/aiSignal";
import type { AISignalResponse } from "@/lib/types/stock/aiSignal";
import type { ApiError } from "@/lib/api/errors";

export function useMutationAISignal() {
  return useMutation<AISignalResponse, ApiError, string>({
    mutationFn: (ticker: string) => fetchAISignal({ ticker }),
  });
}
