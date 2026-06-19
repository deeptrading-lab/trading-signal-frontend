/**
 * 적중 판정 순수 로직 — verdict · 결정시점 대비 수익률 r% · 임계 T → hit/miss/flat.
 *
 * PRD `signal-scorecard` §3-2-A / §9 D3. 부수효과 없는 순수 함수만 둔다(단위 테스트 대상).
 * 채점 cron 은 KIS 일봉으로 종가를 취득해 `returnPct` 를 계산한 뒤 본 모듈로 판정만 위임한다.
 *
 * 분류(3분류 — D3):
 *   - hit  — 신호 방향이 맞음.
 *   - miss — 신호 방향이 틀림.
 *   - flat — 방향 판단 밴드(±T) 안에 머묾(적중률 분모 제외).
 *
 * 방향군(§3-2-A 표):
 *   | verdict 군          | hit                 | miss                |
 *   | BUY · OVERWEIGHT    | r ≥ +T              | r ≤ −T              |
 *   | SELL · REDUCE       | r ≤ −T              | r ≥ +T              |
 *   | HOLD                | |r| ≤ T (밴드 안)   | |r| > T             |
 *   | UNDERWEIGHT         | r ≤ 0               | r > +T              |
 *
 * 경계(부등호 포함) 규칙:
 *   - 강세/약세군은 ±T **경계 포함**(r=+T 는 BUY hit, r=−T 는 BUY miss). 그 사이는 flat.
 *   - HOLD 는 |r| ≤ T 가 hit(경계 포함), 초과는 miss(HOLD 엔 flat 없음 — 밴드 자체가 적중 정의).
 *   - UNDERWEIGHT 는 r ≤ 0 hit, r > +T miss, 0 < r ≤ T 는 flat(약한 약세라 소폭 상승은 미결).
 */

import type { FinalVerdict } from "@/lib/types/stock/aiAnalysis";
import { HIT_THRESHOLD_PCT } from "@/lib/server/scorecard/constants";

/** 적중 판정 결과 — flat 은 적중률 분모에서 제외(D3). */
export type ScoreVerdict = "hit" | "miss" | "flat";

/**
 * 결정시점 대비 수익률(%) 계산. entry ≤ 0 이면 null(분모 보호).
 * r% = (horizonClose − entryClose) / entryClose × 100.
 */
export function computeReturnPct(entryClose: number, horizonClose: number): number | null {
  if (!Number.isFinite(entryClose) || !Number.isFinite(horizonClose) || entryClose <= 0) {
    return null;
  }
  return ((horizonClose - entryClose) / entryClose) * 100;
}

/**
 * verdict 와 수익률 r% 로 hit/miss/flat 판정.
 *
 * @param verdict   FinalVerdict(6단계)
 * @param returnPct 결정시점 대비 horizon 수익률(%)
 * @param threshold 적중 임계 T(%, 기본 HIT_THRESHOLD_PCT)
 */
export function scoreOutcome(
  verdict: FinalVerdict,
  returnPct: number,
  threshold: number = HIT_THRESHOLD_PCT,
): ScoreVerdict {
  const T = Math.abs(threshold);
  const r = returnPct;

  switch (verdict) {
    // 강세군 — 상승 기대. 경계(±T) 포함.
    case "BUY":
    case "OVERWEIGHT":
      if (r >= T) return "hit";
      if (r <= -T) return "miss";
      return "flat";

    // 약세군 — 하락 기대. 부호 반대.
    case "SELL":
    case "REDUCE":
      if (r <= -T) return "hit";
      if (r >= T) return "miss";
      return "flat";

    // 중립 — 밴드(±T) 안에 머물면 적중. HOLD 엔 flat 없음(밴드가 곧 적중 정의).
    case "HOLD":
      return Math.abs(r) <= T ? "hit" : "miss";

    // 약한 약세(주의) — 하락·보합(r≤0)이면 적중, 임계 초과 상승(r>+T)이면 미적중, 그 사이는 flat.
    case "UNDERWEIGHT":
      if (r <= 0) return "hit";
      if (r > T) return "miss";
      return "flat";
  }
}
