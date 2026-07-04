/**
 * 저장된 AI 결론(FinalDecision) 이 현재가·경과시간 기준으로 "다시 볼 때가 됐는지" 판정하는 순수 헬퍼.
 *
 * /analyze 통합(ai-analysis-redesign PR③) — 저장 분석을 우측 패널 저장모드로 열 때, 분석 시점가(base_price)
 * 대비 라이브 현재가가 목표/손절에 닿았거나 크게 움직였거나 분석이 오래됐으면 상단 앰버 배너로 재분석을 권한다.
 *
 * ## 판정 규칙 (하나라도 참이면 stale) — 우선순위 = 반환 reason 순서
 *   1. **손절가 부근/하회**(stop-near) — live ≤ stopPrice × 1.03. stopPrice = base×(1+stop_loss_pct/100).
 *      stop_loss_pct 는 항상 음수라 stopPrice < base. "3% 이내 접근 또는 이탈"을 잡는다.
 *   2. **목표가 근접**(target-near) — 방향 처리: target_pct>0(강세 목표)=near/above, target_pct<0(약세 재진입)=near/below.
 *      targetPrice = base×(1+target_pct/100). 근접 = |live-target|/target ≤ 3% 또는 방향상 도달. target_pct null/0 이면 건너뜀.
 *   3. **가격 큰 이동**(big-move) — |live-base|/base ≥ 6%.
 *   4. **오래됨**(aged) — updated_at 이 3 영업일(주말 제외) 이상 경과. 공휴일은 businessDaysBetween 임계 마진으로 흡수.
 *
 * ## 방향(direction) 처리
 * - 목표가: **target_pct 의 부호**로 방향을 정한다(verdict 가 아니라). FinalDecision 계약상
 *   BUY/OVERWEIGHT/HOLD=양수 목표, UNDERWEIGHT/REDUCE=음수 재진입, SELL=null 이므로 부호가 곧 방향.
 * - 손절가: stop_loss_pct 가 항상 음수(하방)라 stop-near 는 하방 접근/이탈로만 본다.
 *   ⚠️ SELL/약세 재진입에서도 손절은 하방 기준으로 계산된다(데이터 모델 한계 — stop_loss_pct 부호 고정).
 *   재분석 "권유" 휴리스틱이라 과권유는 저위험이고, 하방 급락은 big-move 로도 잡힌다.
 *
 * base_price(legacy null) 또는 live 가격이 없으면 가격 3규칙은 건너뛰고 aged 만 평가한다.
 * 백엔드/네트워크 무의존 순수 함수 — 단위 테스트로 방향·경계·null 전 케이스 고정(__tests__/decisionStaleness.test.ts).
 */

import { businessDaysBetween } from "@/lib/utils/businessDays";
import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";

/** 재분석 권유 사유(배너 카피 키). 우선순위 = 아래 평가 순서. */
export type StaleReason = "stop-near" | "target-near" | "big-move" | "aged";

/** 목표가 근접 밴드 — |live-target|/target ≤ 3%. */
export const TARGET_NEAR_RATIO = 0.03;
/** 손절가 근접 배수 — live ≤ stopPrice × 1.03(3% 이내 접근 또는 이탈). */
export const STOP_PROXIMITY_MULT = 1.03;
/** 큰 가격 이동 임계 — |live-base|/base ≥ 6%. */
export const BIG_MOVE_RATIO = 0.06;
/** 오래됨 임계 — 3 영업일(주말 제외) 이상 경과. */
export const STALE_BUSINESS_DAYS = 3;

export interface DecisionStalenessInput {
  /** 저장된 결론의 가격 파생 필드 + 판정(전체 FinalDecision 도 그대로 만족). */
  decision: Pick<FinalDecision, "verdict" | "base_price" | "target_pct" | "stop_loss_pct">;
  /** 라이브 현재가(원). null/0/NaN 이면 가격 규칙 건너뜀(aged 만 평가). */
  livePrice: number | null | undefined;
  /** 저장 시각(ISO 문자열). */
  updatedAt: string;
  /** 기준 현재 시각 — 테스트 주입용. 기본 new Date(). */
  now?: Date;
}

export interface DecisionStaleness {
  /** 하나라도 규칙에 걸리면 true. */
  stale: boolean;
  /** 걸린 규칙 중 최우선 사유(배너 카피 키). stale=false 면 null. */
  reason: StaleReason | null;
}

/** 유효 양수 가격이면 그 값, 아니면 null. */
function positivePrice(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

export function evaluateDecisionStaleness(input: DecisionStalenessInput): DecisionStaleness {
  const { decision, updatedAt } = input;
  const now = input.now ?? new Date();
  const base = positivePrice(decision.base_price);
  const live = positivePrice(input.livePrice);

  // ── 가격 3규칙 — base_price·live 둘 다 있어야 계산 가능(legacy/로딩 전이면 건너뜀). ──
  if (base != null && live != null) {
    // 1) 손절가 부근/하회 — 하방 리스크가 가장 급하므로 최우선.
    const stopPrice = base * (1 + decision.stop_loss_pct / 100);
    if (stopPrice > 0 && live <= stopPrice * STOP_PROXIMITY_MULT) {
      return { stale: true, reason: "stop-near" };
    }

    // 2) 목표가 근접 — target_pct 부호로 방향 처리. null/0 이면 건너뜀.
    if (decision.target_pct != null && decision.target_pct !== 0) {
      const targetPrice = base * (1 + decision.target_pct / 100);
      if (targetPrice > 0) {
        const withinBand = Math.abs(live - targetPrice) / targetPrice <= TARGET_NEAR_RATIO;
        const reached = decision.target_pct > 0 ? live >= targetPrice : live <= targetPrice;
        if (withinBand || reached) {
          return { stale: true, reason: "target-near" };
        }
      }
    }

    // 3) 큰 가격 이동 — 방향 무관 절대 이동폭.
    if (Math.abs(live - base) / base >= BIG_MOVE_RATIO) {
      return { stale: true, reason: "big-move" };
    }
  }

  // 4) 오래됨 — 3 영업일 이상 경과(가격과 독립, 항상 평가).
  const updated = new Date(updatedAt);
  if (
    Number.isFinite(updated.getTime()) &&
    businessDaysBetween(updated, now) >= STALE_BUSINESS_DAYS
  ) {
    return { stale: true, reason: "aged" };
  }

  return { stale: false, reason: null };
}
