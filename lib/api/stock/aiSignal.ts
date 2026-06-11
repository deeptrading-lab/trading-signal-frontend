/**
 * AI 최종 판단 클라이언트 — `/api/stock/ai-signal` SSE 스트림 소비.
 *
 * 서버가 단계별 { message } 이벤트를 먼저 보내고 최종 { result } 또는 { error } 이벤트를 전송한다.
 * onProgress 콜백으로 각 단계 메시지를 받아 UI에 반영한다.
 */

import type { AISignalRequest, AISignalResponse } from "@/lib/types/stock/aiSignal";

export async function fetchAISignalStream(
  req: AISignalRequest,
  onProgress: (message: string) => void,
): Promise<AISignalResponse> {
  const res = await fetch("/api/stock/ai-signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal: AbortSignal.timeout(130_000),
  });

  // 스트림 시작 전 에러(Vercel guard, 400 등)
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
        const data = JSON.parse(line.slice(6)) as Record<string, unknown>;

        if (typeof data.message === "string") {
          onProgress(data.message);
        }
        if (data.result) {
          return data.result as AISignalResponse;
        }
        if (typeof data.error === "string") {
          throw new Error(data.error);
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  throw new Error("AI 응답이 완료되지 않았어요.");
}
