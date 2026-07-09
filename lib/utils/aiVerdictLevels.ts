/**
 * PM 최종 결론(FinalDecision) → 종목 차트 오버레이용 절대 가격 레벨 파생.
 *
 * VerdictHero 의 흰박스(목표/손절)와 같은 semantics(`base × (1 + pct/100)` + 호가단위 반올림)를
 * 차트가 재사용하도록 순수 함수로 분리. base_price 없는 legacy 판정은 null(그리지 않음 — 사용자 결정).
 */

import { roundToKrxTick } from "@/lib/utils/krxTick";
import type { FinalDecision, FinalVerdict } from "@/lib/types/stock/aiAnalysis";

/** 차트에 그릴 가격 레벨 1개의 역할. target=익절 목표(위) / reentry=재진입 구간(아래) / stop=손절(아래). */
export type AiLevelRole = "target" | "reentry" | "stop";

export interface AiVerdictLevel {
  role: AiLevelRole;
  /** 절대가(원, 호가단위 반올림). */
  price: number;
  /** 분석 시점가(base_price) 대비 %(저장값 그대로). */
  pct: number;
}

export interface AiVerdictLevels {
  verdict: FinalVerdict;
  /** 분석 시점가(원) — 모든 레벨의 기준. */
  basePrice: number;
  /**
   * 익절 목표(양수 target_pct → 현재가 위, role=target) 또는 재진입 구간(음수 → 아래, role=reentry).
   * SELL 등 target_pct=null 이면 null.
   */
  target: AiVerdictLevel | null;
  /** 손절가 — 항상 존재(stop_loss_pct 는 음수 → base 아래). */
  stop: AiVerdictLevel;
}

/**
 * PM 최종 결론 → 차트 오버레이용 절대 가격 레벨. base_price 없는 legacy 판정은 null.
 * target_pct: 양수=익절 목표(위) / 음수=재진입 구간(아래) / null(SELL)=목표 없음.
 */
export function deriveAiVerdictLevels(
  decision: Pick<FinalDecision, "verdict" | "base_price" | "target_pct" | "stop_loss_pct">,
): AiVerdictLevels | null {
  const base = decision.base_price;
  if (typeof base !== "number" || !Number.isFinite(base) || base <= 0) return null;

  const stop: AiVerdictLevel = {
    role: "stop",
    price: roundToKrxTick(base * (1 + decision.stop_loss_pct / 100)),
    pct: decision.stop_loss_pct,
  };

  let target: AiVerdictLevel | null = null;
  if (decision.target_pct !== null && Number.isFinite(decision.target_pct)) {
    target = {
      role: decision.target_pct >= 0 ? "target" : "reentry",
      price: roundToKrxTick(base * (1 + decision.target_pct / 100)),
      pct: decision.target_pct,
    };
  }

  return { verdict: decision.verdict, basePrice: base, target, stop };
}
