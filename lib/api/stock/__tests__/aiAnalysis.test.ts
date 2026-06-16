import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { fetchAIAnalysisStream, fetchAIAnalysisDecision } from "../aiAnalysis";
import { httpClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  httpClient: { get: vi.fn() },
}));

function createSSEStream(event: unknown): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      controller.close();
    },
  });
}

describe("stock AI analysis API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("이전 결론은 클라이언트 POST body 로 전송하지 않는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: createSSEStream({ type: "done" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const onEvent = vi.fn();
    await fetchAIAnalysisStream("005930", "codex", onEvent, undefined, "bull", {
      bullArgument: "bull-summary",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/stock/ai-analysis", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        ticker: "005930",
        provider: "codex",
        startFrom: "bull",
        state: { bullArgument: "bull-summary" },
      }),
    }));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).not.toContain("prevDecisions");
    expect(onEvent).toHaveBeenCalledWith({ type: "done" });
  });

  it("저장된 AI 결론은 BFF GET 으로 조회한다", async () => {
    const getMock = httpClient.get as ReturnType<typeof vi.fn>;
    getMock.mockResolvedValue({
      data: {
        configured: true,
        decision: null,
      },
    });

    const result = await fetchAIAnalysisDecision("005930");

    expect(getMock).toHaveBeenCalledWith("/stock/ai-analysis/decision", {
      params: { ticker: "005930" },
      signal: undefined,
    });
    expect(result).toEqual({ configured: true, decision: null });
  });
});
