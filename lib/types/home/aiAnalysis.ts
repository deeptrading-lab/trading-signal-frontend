/**
 * Home AI 투자 분석 요약 카드 데이터.
 *
 * 시안 `AIAnalysis.tsx` 의 본문 텍스트 + 3-up 미니카드 (강세 / 주의 / 제안) 정합.
 * 자체 enum (`tone`) 으로 색·아이콘 분기.
 */

export type AiSignalTone = "BULLISH" | "CAUTION" | "SUGGEST";

export type AiSignalBodyKey =
  | "AI_BODY_BULLISH"
  | "AI_BODY_CAUTION"
  | "AI_BODY_SUGGEST";

export type AiSignalLabelKey =
  | "AI_SIGNAL_BULLISH"
  | "AI_SIGNAL_CAUTION"
  | "AI_SIGNAL_SUGGEST";

export type AiSignalCard = {
  tone: AiSignalTone;
  /** lucide-react 아이콘 이름 — 컴포넌트 단 매핑. */
  iconName: "TrendingUp" | "AlertTriangle" | "Lightbulb";
  /** 카드 헤더 카피 키 — `lib/copy/home/labels.ts` 의 ID. */
  labelKey: AiSignalLabelKey;
  /** 본문 카피 키 — `lib/copy/home/labels.ts` 의 ID. mock 은 카피 직접 보유 0. */
  bodyKey: AiSignalBodyKey;
};

export type AiAnalysis = {
  /** 종합 신호 — 매수 우위 / 관망 / 매도 우위. */
  verdict: "BUY_BIAS" | "HOLD" | "SELL_BIAS";
  /** 분석 요약 본문 카피 키 — `lib/copy/home/labels.ts` 의 ID. */
  summaryKey: "AI_SUMMARY_DEFAULT";
  /** 3-up 미니카드 — 강세 / 주의 / 제안. */
  signals: AiSignalCard[];
};
