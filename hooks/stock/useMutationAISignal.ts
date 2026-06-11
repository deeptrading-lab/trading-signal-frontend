/**
 * useMutationAISignal — AI 최종 판단 트리거.
 *
 * `mutate(ticker)` 호출 → `/api/stock/ai-signal` SSE 스트림 → AISignalResponse.
 * `progressMsg` 로 현재 처리 단계 메시지를 노출한다.
 */

"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { fetchAISignalStream } from "@/lib/api/stock/aiSignal";
import type { AISignalResponse } from "@/lib/types/stock/aiSignal";

export function useMutationAISignal() {
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  const mutation = useMutation<AISignalResponse, Error, string>({
    mutationFn: (ticker: string) => fetchAISignalStream({ ticker }, setProgressMsg),
    onSettled: () => setProgressMsg(null),
  });

  return { ...mutation, progressMsg };
}
