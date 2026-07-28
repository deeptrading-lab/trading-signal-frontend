/**
 * PM 최종 결론(FinalDecision)의 enum 필드(`confidence`·`time_horizon`) 관대 정규화.
 *
 * ## 배경 — 조용한 폴백이 신호 차원을 통째로 죽인 사건
 *
 * route handler 는 원래 `["HIGH","MEDIUM","LOW"].includes(raw) ? raw : "MEDIUM"` 처럼 **정확 일치**만
 * 통과시키고 나머지는 말없이 기본값으로 떨어뜨렸다. 그 결과 저장된 결정 50건이
 * **confidence 100% MEDIUM · time_horizon 100% 중기** — 같은 응답의 `verdict` 는 정상 분산
 * (UNDERWEIGHT/OVERWEIGHT/REDUCE/HOLD)되는데 두 필드만 폴백 기본값에 고정됐다.
 * verdict 는 폴백 없이 **검증 실패 처리**라 살아남았고, 두 필드만 삼켜진 것이다.
 *
 * 원인: PM 프롬프트의 한글 표기 원칙이 "JSON 의 **verdict 필드 값만** 영문 enum" 이라고 읽혀
 * 모델이 confidence 를 한글("중간"·"높음")이나 소문자("medium")로 낼 여지가 컸다. 같은 코드베이스의
 * SNS 감성 경로는 소문자 규약(`low|medium|high`)이라 혼선도 있었다.
 *
 * ## 방침
 * 1. **관대하게 받는다** — 대소문자·공백·한글 동의어·소문자 규약을 모두 흡수한다.
 * 2. **조용히 넘어가지 않는다** — 해석 불가 값은 기본값으로 떨어뜨리되 `onFallback` 으로 알린다
 *    (호출부가 warn 로그를 남겨 다음 스키마 불일치가 즉시 드러나게 — #347 지수 필드명 회귀와 같은 교훈).
 *
 * 순수 함수(로깅·IO 없음) — 단위 테스트로 매핑·폴백을 고정한다.
 */

import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";

type Confidence = FinalDecision["confidence"];
type TimeHorizon = FinalDecision["time_horizon"];

/** 해석 불가로 기본값을 쓸 때 호출부에 알리는 콜백(필드명·원본값). */
export type EnumFallbackReporter = (field: string, raw: unknown) => void;

/** confidence 동의어 → 정규값. 키는 소문자·공백제거 후 비교한다. */
const CONFIDENCE_ALIASES: Record<string, Confidence> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
  // 한글(프롬프트가 한국어 서술을 강제해 모델이 한글로 낼 수 있음).
  높음: "HIGH",
  높다: "HIGH",
  상: "HIGH",
  중간: "MEDIUM",
  보통: "MEDIUM",
  중: "MEDIUM",
  낮음: "LOW",
  낮다: "LOW",
  하: "LOW",
};

/** time_horizon 동의어 → 정규값(한글 enum 이 정규형). */
const HORIZON_ALIASES: Record<string, TimeHorizon> = {
  단기: "단기",
  중기: "중기",
  장기: "장기",
  short: "단기",
  "short-term": "단기",
  short_term: "단기",
  mid: "중기",
  medium: "중기",
  "mid-term": "중기",
  mid_term: "중기",
  long: "장기",
  "long-term": "장기",
  long_term: "장기",
};

/** 비교용 정규화 — 문자열이 아니면 null, 아니면 trim + 소문자. */
function normalizeKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

/**
 * confidence 정규화. 해석 불가/누락이면 "MEDIUM" + onFallback 통지.
 * (누락 자체도 통지한다 — 모델이 필드를 빼먹는 것도 관측 대상.)
 */
export function normalizeConfidence(
  raw: unknown,
  onFallback?: EnumFallbackReporter,
): Confidence {
  const key = normalizeKey(raw);
  const hit = key ? CONFIDENCE_ALIASES[key] : undefined;
  if (hit) return hit;
  onFallback?.("confidence", raw);
  return "MEDIUM";
}

/** time_horizon 정규화. 해석 불가/누락이면 "중기" + onFallback 통지. */
export function normalizeTimeHorizon(
  raw: unknown,
  onFallback?: EnumFallbackReporter,
): TimeHorizon {
  const key = normalizeKey(raw);
  const hit = key ? HORIZON_ALIASES[key] : undefined;
  if (hit) return hit;
  onFallback?.("time_horizon", raw);
  return "중기";
}
