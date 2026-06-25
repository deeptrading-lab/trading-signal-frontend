import { detectProviders } from "@/lib/server/ai/detectCli";
import { isVercelEnv } from "@/lib/server/env";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";

export const PAPER_TRADING_AI_CLI_REQUIRED_MESSAGE =
  "AI 모의투자는 Codex 또는 Claude CLI가 설치된 로컬 환경에서만 진행할 수 있어요. AI CLI가 없으면 세션 생성과 재판단을 실행하지 않습니다.";

export const PAPER_TRADING_AI_CLI_VERCEL_MESSAGE =
  "AI 모의투자는 로컬 AI CLI 실행이 필요해 Vercel 환경에서는 진행할 수 없어요.";

export type PaperTradingAiCliGate =
  | { ok: true; available: AIAnalysisProvider[] }
  | { ok: false; status: 422 | 503; message: string };

export function getPaperTradingAiCliGate(): PaperTradingAiCliGate {
  if (isVercelEnv()) {
    return {
      ok: false,
      status: 503,
      message: PAPER_TRADING_AI_CLI_VERCEL_MESSAGE,
    };
  }

  const providers = detectProviders();
  const available = (Object.keys(providers) as AIAnalysisProvider[]).filter(
    (provider) => providers[provider],
  );

  if (available.length === 0) {
    return {
      ok: false,
      status: 422,
      message: PAPER_TRADING_AI_CLI_REQUIRED_MESSAGE,
    };
  }

  return { ok: true, available };
}
