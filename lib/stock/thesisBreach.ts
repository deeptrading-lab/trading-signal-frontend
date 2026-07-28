/**
 * 저장된 AI 판정의 **테제 무효화 여부** 판정 — 현재가가 무효화/손절 라인을 넘었는지.
 *
 * ## 배경
 * `stop_loss_pct` 는 "테제 무효화 라인"이다(부호가 방향 — 강세=하방 손절 음수, 약세=상방 무효화 양수).
 * 사후검증(2026-07-28) 결과 약세 판정 3건에서 무효화가 실제 발동했고 그중 2건은 발동 후 주가가
 * 7~8% 더 올라 **"이 약세 판정은 틀렸다"를 일주일 앞서 경고**했다(HMM·SK). 그런데 이 신호를
 * 표면화하는 곳이 저장 결정 상세뷰뿐이라, 목록에서는 어떤 판정이 깨졌는지 알 수 없었다.
 *
 * `decisionStaleness` 는 "재분석 권유" 휴리스틱(근접 3% 밴드 포함)인 반면, 이 모듈은 **실제 돌파**만
 * 좁게 본다 — 목록 배지는 오탐이 잦으면 무의미해지므로 라인을 넘은 경우로 한정한다.
 *
 * 순수 함수(IO 없음) — 레벨 파생은 `deriveAiVerdictLevels` 를 재사용해 차트 오버레이와 같은 기준을 쓴다.
 */

import { deriveAiVerdictLevels } from "@/lib/utils/aiVerdictLevels";
import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";

/** 깨진 라인의 종류 — invalidation=약세 판정의 상방 무효화 / stop=강세 판정의 하방 손절. */
export type ThesisBreachKind = "invalidation" | "stop";

export interface ThesisBreach {
  kind: ThesisBreachKind;
  /** 넘어선 라인의 절대가(원). */
  linePrice: number;
  /** 라인 대비 현재가 초과폭 %(항상 양수 — 무효화는 위로, 손절은 아래로 얼마나 벗어났는지). */
  overshootPct: number;
}

/** 판정 레벨 파생에 필요한 최소 필드(목록 projection 도 이 정도만 실어 나르면 된다). */
export type ThesisBreachInput = Pick<
  FinalDecision,
  "verdict" | "base_price" | "target_pct" | "stop_loss_pct"
>;

/**
 * 현재가가 무효화/손절 라인을 넘었는지 판정. 넘지 않았거나 판정 불가면 null.
 *
 * @param decision 저장된 판정(verdict·base_price·target_pct·stop_loss_pct).
 * @param livePrice 라이브 현재가(원). null/0/NaN 이면 판정 불가.
 */
export function evaluateThesisBreach(
  decision: ThesisBreachInput,
  livePrice: number | null | undefined,
): ThesisBreach | null {
  if (typeof livePrice !== "number" || !Number.isFinite(livePrice) || livePrice <= 0) return null;

  // ⚠️ legacy 약세(#350 이전: 약세 verdict 인데 stop 이 하방 음수)는 배지를 내지 않는다.
  // 그 행에서 주가가 stop 아래로 가는 건 약세 판정이 **맞아가는** 것인데, 부호만 보면 role=stop 으로
  // 잡혀 "손절 이탈 — 판단 근거가 깨졌어요"라는 정반대 경고가 붙는다. 시맨틱이 모호한 구간이므로
  // 잘못된 경고 대신 침묵을 택한다.
  const bearish =
    decision.verdict === "UNDERWEIGHT" ||
    decision.verdict === "REDUCE" ||
    decision.verdict === "SELL";
  if (bearish && decision.stop_loss_pct < 0) return null;

  // base_price 없는 legacy 판정은 절대가 파생 불가 → 배지 없음(차트 오버레이와 동일 정책).
  const levels = deriveAiVerdictLevels(decision);
  if (!levels) return null;

  const { role, price } = levels.stop;
  if (!Number.isFinite(price) || price <= 0) return null;

  // 부호가 방향: invalidation=상방(현재가가 위로 돌파) / stop=하방(현재가가 아래로 이탈).
  const breached = role === "invalidation" ? livePrice >= price : livePrice <= price;
  if (!breached) return null;

  const overshootPct = Math.abs((livePrice - price) / price) * 100;
  return {
    kind: role === "invalidation" ? "invalidation" : "stop",
    linePrice: price,
    overshootPct,
  };
}
