/**
 * `/api/stock/ai-analysis/providers` — 로컬에 설치된 AI CLI(claude·codex) 가용성 조회.
 *
 * GET → { vercel, providers: { claude, codex }, available: AIAnalysisProvider[] }
 *
 * AI 분석 진입 화면(ProviderChooser)이 어떤 공급자를 노출/선택지로 줄지 결정하는 데 사용한다.
 * AI 분석 자체가 로컬 셸 호출 기반이라 Vercel 에서는 항상 0개로 응답(로컬 전용 안내 표면).
 * 로컬에서 CLI 설치 상태가 바뀔 수 있어 응답은 캐시하지 않는다(no-store).
 */

import { NextResponse } from "next/server";
import { isVercelEnv } from "@/lib/server/env";
import { detectProviders } from "@/lib/server/ai/detectCli";
import type {
  AIAnalysisProvider,
  AIProviderAvailability,
} from "@/lib/types/stock/aiAnalysis";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function GET(): NextResponse<AIProviderAvailability> {
  if (isVercelEnv()) {
    return NextResponse.json(
      { vercel: true, providers: { claude: false, codex: false }, available: [] },
      { headers: NO_STORE },
    );
  }

  const providers = detectProviders();
  const available = (Object.keys(providers) as AIAnalysisProvider[]).filter(
    (key) => providers[key],
  );

  return NextResponse.json(
    { vercel: false, providers, available },
    { headers: NO_STORE },
  );
}
