/**
 * Home AI 투자 분석 요약 카드 mock.
 *
 * 시안 `AIAnalysis.tsx` 의 본문 + 3-up 미니카드 의도 정합. 본문 카피는
 * `lib/copy/home/labels.ts` 의 `AI_SUMMARY_DEFAULT` / `AI_BODY_*` 키로 참조.
 * mock 은 데이터 구조 + 카피 키만.
 */

import type { AiAnalysis } from "@/lib/types/home/aiAnalysis";

export const AI_ANALYSIS_MOCK: AiAnalysis = {
  verdict: "BUY_BIAS",
  summaryKey: "AI_SUMMARY_DEFAULT",
  signals: [
    {
      tone: "BULLISH",
      iconName: "TrendingUp",
      labelKey: "AI_SIGNAL_BULLISH",
      bodyKey: "AI_BODY_BULLISH",
    },
    {
      tone: "CAUTION",
      iconName: "AlertTriangle",
      labelKey: "AI_SIGNAL_CAUTION",
      bodyKey: "AI_BODY_CAUTION",
    },
    {
      tone: "SUGGEST",
      iconName: "Lightbulb",
      labelKey: "AI_SIGNAL_SUGGEST",
      bodyKey: "AI_BODY_SUGGEST",
    },
  ],
};
