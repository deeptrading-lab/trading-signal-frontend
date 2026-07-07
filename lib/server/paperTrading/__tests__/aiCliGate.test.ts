import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";

const mocks = vi.hoisted(() => ({
  detectProviders: vi.fn<() => Record<AIAnalysisProvider, boolean>>(),
  isVercelEnv: vi.fn<() => boolean>(),
}));

vi.mock("@/lib/server/ai/detectCli", () => ({
  detectProviders: mocks.detectProviders,
}));

vi.mock("@/lib/server/env", () => ({
  isVercelEnv: mocks.isVercelEnv,
}));

import {
  getPaperTradingAiCliGate,
  PAPER_TRADING_AI_CLI_REQUIRED_MESSAGE,
  PAPER_TRADING_AI_CLI_VERCEL_MESSAGE,
} from "@/lib/server/paperTrading/aiCliGate";

describe("getPaperTradingAiCliGate", () => {
  beforeEach(() => {
    mocks.detectProviders.mockReset();
    mocks.isVercelEnv.mockReset();
    mocks.isVercelEnv.mockReturnValue(false);
  });

  it("Codex 또는 Claude CLI가 하나라도 있으면 통과한다", () => {
    mocks.detectProviders.mockReturnValue({ claude: false, codex: true });

    expect(getPaperTradingAiCliGate()).toEqual({
      ok: true,
      available: ["codex"],
      provider: "codex",
    });
  });

  it("Codex와 Claude가 모두 있으면 단타 모의투자는 Codex를 우선 사용한다", () => {
    mocks.detectProviders.mockReturnValue({ claude: true, codex: true });

    expect(getPaperTradingAiCliGate()).toEqual({
      ok: true,
      available: ["claude", "codex"],
      provider: "codex",
    });
  });

  it("AI CLI가 없으면 모의투자 진행을 차단한다", () => {
    mocks.detectProviders.mockReturnValue({ claude: false, codex: false });

    expect(getPaperTradingAiCliGate()).toEqual({
      ok: false,
      status: 422,
      message: PAPER_TRADING_AI_CLI_REQUIRED_MESSAGE,
    });
  });

  it("Vercel 환경에서는 로컬 CLI 기반 진행을 차단한다", () => {
    mocks.isVercelEnv.mockReturnValue(true);

    expect(getPaperTradingAiCliGate()).toEqual({
      ok: false,
      status: 503,
      message: PAPER_TRADING_AI_CLI_VERCEL_MESSAGE,
    });
  });
});
