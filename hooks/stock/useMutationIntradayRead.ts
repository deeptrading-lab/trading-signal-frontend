/**
 * 장중 단타 판단(참고) on-demand 생성 훅 (TanStack Query useMutation).
 *
 * 사람이 버튼을 눌렀을 때만 호출(자동 폴링 X). 응답은 캐시 무효화 불필요(단발성 판단).
 * 로컬 CLI 기반이라 ~수십 초 소요 — UI 는 isPending 으로 로딩 표시.
 */

"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { fetchIntradayRead } from "@/lib/api/stock/intradayRead";
import type { ApiError } from "@/lib/api/errors";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";
import type { IntradayReadResponse } from "@/lib/types/intraday/intradayDecision";

export type IntradayReadInput = { ticker: string; provider: AIAnalysisProvider };

export function useMutationIntradayRead(): UseMutationResult<
  IntradayReadResponse,
  ApiError,
  IntradayReadInput
> {
  return useMutation<IntradayReadResponse, ApiError, IntradayReadInput>({
    mutationFn: ({ ticker, provider }) => fetchIntradayRead(ticker, provider),
    // 실패는 IntradayReadSection 의 인라인 섹션으로 처리 — 전역 토스트 opt-out(중복 방지).
    meta: { skipGlobalErrorToast: true },
  });
}
