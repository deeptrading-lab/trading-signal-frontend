/**
 * AiAnalysisCard — AI 투자 분석 요약 카드 (그라데이션 hero + 3-up 미니카드).
 *
 * PR6 (finsight-redesign) 신규.
 *
 * 시안 `AIAnalysis.tsx` 정합:
 *   - 헤더 = BrainCircuit 아이콘 + "AI 투자 분석 요약" 타이틀 + "매수 우위" 배지.
 *   - 본문 = 종합 요약 1단락 (mock summaryKey → 카피 매핑).
 *   - 3-up 미니카드 = 강세 신호 (TrendingUp, signal-up) / 주의 구간 (AlertTriangle, warn) /
 *     AI 제안 (Lightbulb, accent-vivid).
 *
 * v8 토큰 cascade:
 *   - 카드 셸 = `card-ai` 합성 토큰 (gradient-ai-soft 배경 + gradient-ai-from 텍스트 + xl 라운드).
 *   - 헤더 아이콘 박스 = `gradient-ai-bg` 합성 토큰 (gradient-ai-from → gradient-ai-to + surface text).
 *   - 미니카드 = `bg-surface/60` 반투명 — 그라데이션 위 자연 cascade.
 *
 * 정적 컴포넌트 — server 측 props-only 렌더. mock 의 `tone` enum 분기로 아이콘·색 결정.
 */

import { BrainCircuit, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type {
  AiAnalysis,
  AiSignalCard,
  AiSignalTone,
} from "@/lib/types/home/aiAnalysis";
import {
  AI_ANALYSIS_TITLE,
  AI_BODY_BULLISH,
  AI_BODY_CAUTION,
  AI_BODY_SUGGEST,
  AI_SIGNAL_BULLISH,
  AI_SIGNAL_CAUTION,
  AI_SIGNAL_SUGGEST,
  AI_SUMMARY_DEFAULT,
  AI_VERDICT_BUY_BIAS,
  AI_VERDICT_HOLD,
  AI_VERDICT_SELL_BIAS,
} from "@/lib/copy/home/labels";

// mock 의 카피 키 → 실제 한글 카피 매핑.
// `lib/copy/home/labels.ts` 의 상수 ID 와 1:1 정합.
const LABEL_BY_KEY = {
  AI_SIGNAL_BULLISH,
  AI_SIGNAL_CAUTION,
  AI_SIGNAL_SUGGEST,
  AI_BODY_BULLISH,
  AI_BODY_CAUTION,
  AI_BODY_SUGGEST,
  AI_SUMMARY_DEFAULT,
} as const;

const VERDICT_LABEL = {
  BUY_BIAS: AI_VERDICT_BUY_BIAS,
  HOLD: AI_VERDICT_HOLD,
  SELL_BIAS: AI_VERDICT_SELL_BIAS,
} as const;

const ICON_BY_NAME = {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} as const;

// 미니카드 tone 별 색 cascade — v8 토큰만.
const TONE_TEXT_CLASS: Record<AiSignalTone, string> = {
  BULLISH: "text-signal-up",
  CAUTION: "text-warn",
  SUGGEST: "text-accent-vivid",
};

export interface AiAnalysisCardProps {
  analysis: AiAnalysis;
}

export function AiAnalysisCard({ analysis }: AiAnalysisCardProps) {
  return (
    <section
      className="card-ai"
      aria-label={AI_ANALYSIS_TITLE}
    >
      <header className="flex items-center gap-sm mb-md">
        <span
          className="gradient-ai-bg inline-flex items-center justify-center h-2xl w-2xl rounded-sm"
          aria-hidden="true"
        >
          <BrainCircuit className="h-xl w-xl" />
        </span>
        <h2 className="text-h2 text-gradient-ai-from">{AI_ANALYSIS_TITLE}</h2>
        <span className="ml-auto badge-accent">
          {VERDICT_LABEL[analysis.verdict]}
        </span>
      </header>

      <div className="flex flex-col gap-md">
        <p className="text-body-md leading-relaxed text-gradient-ai-from">
          {LABEL_BY_KEY[analysis.summaryKey]}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-sm pt-xs">
          {analysis.signals.map((signal) => (
            <SignalMiniCard key={signal.tone} signal={signal} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SignalMiniCard({ signal }: { signal: AiSignalCard }) {
  const Icon = ICON_BY_NAME[signal.iconName];
  return (
    <article className="bg-surface/60 rounded-lg p-md flex flex-col gap-xs">
      <div
        className={cn(
          "inline-flex items-center gap-xs text-body-sm-strong",
          TONE_TEXT_CLASS[signal.tone],
        )}
      >
        <Icon className="h-md w-md" aria-hidden="true" />
        {LABEL_BY_KEY[signal.labelKey]}
      </div>
      <p className="text-caption text-text-muted leading-snug">
        {LABEL_BY_KEY[signal.bodyKey]}
      </p>
    </article>
  );
}
