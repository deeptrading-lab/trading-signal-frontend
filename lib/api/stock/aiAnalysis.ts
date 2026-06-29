/**
 * AI 멀티에이전트 분석 SSE 스트림 소비 함수.
 *
 * POST /api/stock/ai-analysis
 * Body: { ticker, provider, startFrom?, state? }
 *
 * startFrom을 지정하면 해당 에이전트부터 재개한다.
 * state에는 이전 실행에서 완료된 에이전트의 결과를 채워 넣는다.
 */

import { httpClient } from "@/lib/api/client";
import type {
  AgentKey,
  AIAnalysisEvent,
  AIAnalysisDecisionSnapshot,
  AIAnalysisProvider,
  AIProviderAvailability,
  ResumeState,
} from "@/lib/types/stock/aiAnalysis";

/**
 * 로컬에 설치된 AI CLI 가용성 조회.
 * SSE 스트림과 달리 단순 GET 이라 공용 axios 인스턴스(`httpClient`, baseURL `/api`)를 사용한다.
 */
export async function fetchAIProviderAvailability(
  signal?: AbortSignal,
): Promise<AIProviderAvailability> {
  const res = await httpClient.get<AIProviderAvailability>(
    "/stock/ai-analysis/providers",
    { signal },
  );
  return res.data;
}

export async function fetchAIAnalysisDecision(
  ticker: string,
  signal?: AbortSignal,
): Promise<{
  configured: boolean;
  decision: AIAnalysisDecisionSnapshot | null;
  /** 이 종목이 분석 큐에서 진행 중이면(pending/processing) 표시. 없으면 null. */
  active: { status: "pending" | "processing" } | null;
}> {
  const res = await httpClient.get<{
    configured: boolean;
    decision: AIAnalysisDecisionSnapshot | null;
    active: { status: "pending" | "processing" } | null;
  }>("/stock/ai-analysis/decision", {
    params: { ticker },
    signal,
  });
  return res.data;
}

export async function fetchAIAnalysisStream(
  ticker: string,
  provider: AIAnalysisProvider,
  onEvent: (event: AIAnalysisEvent) => void,
  signal?: AbortSignal,
  startFrom?: AgentKey,
  preState?: ResumeState,
): Promise<void> {
  const res = await fetch("/api/stock/ai-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker, provider, startFrom, state: preState }),
    signal,
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(json.error ?? "AI 분석에 실패했어요.");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("AI 응답 스트림이 없어요.");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as AIAnalysisEvent;
          onEvent(event);
          if (event.type === "done" || event.type === "error") return;
        } catch {
          // 파싱 실패 라인 무시
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}
