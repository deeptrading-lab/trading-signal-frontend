/**
 * 매매 계획(진입 기준·손절·목표·손익비)과 그 계획의 사후 결과 — 오프라인 백테스트와 라이브가
 * 같은 정의를 쓴다(PRD `swing-judgment` §3-1 매매 계획). 순수 함수.
 *
 * 매물대는 `computePriceLevels`(250봉·24구간, 봉 고저 구간 균등 분배) — 차트 오버레이·기존 AI 입력과
 * 같은 계산이라 사용자가 차트에서 보는 매물대와 판정이 쓰는 매물대가 어긋나지 않는다. 다만 비중
 * 3% 컷은 지지가 바로 다음 구간(중앙 −2.9%)이 돼 손절 근거가 못 되므로 6% 이상 "두꺼운" 것만 쓴다.
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
import { computePriceLevels } from "@/lib/signal/levels/priceLevels";
import { roundToKrxTick } from "@/lib/utils/krxTick";
import type { DoubleBottom } from "./patterns";
import type { Rulebook } from "./rulebook";

export type SwingPlan = {
  /** 기준가 = t 종가. 실제 진입은 t+1 시가(손절 < 시가 < 목표일 때만). */
  entryRef: number;
  stop: number;
  stopSource: "zone" | "doubleBottom" | "atr";
  target: number;
  targetSource: "zone" | "cap";
  /** (목표 − 기준가) ÷ (기준가 − 손절). 손절폭이 0 이하면 null. */
  rr: number | null;
  /** 손절 근거 지지선(쌍바닥 저점 또는 매물대 하단). 없으면 null. 표시용. */
  support: number | null;
  /** 목표 근거 저항(위쪽 첫 두꺼운 매물대 하단). 없으면 null. 표시용. */
  resistance: number | null;
  /** 2주(10거래일) 통상 변동폭 %(절대값 중앙값). 표시·목표 상한용. */
  typicalMove10Pct: number | null;
};

/**
 * 계획 수립. atr 이 없으면 null.
 * - 손절: 지지(쌍바닥이면 저점) − buffer·ATR. 지지 없음·maxStopAtr 초과 → 기준가 − fallback·ATR.
 *   손절폭이 minStopAtr 미만이면 그만큼 넓힌다.
 * - 목표: 기준가 × (1 + minTargetGapPct%) 위의 첫 두꺼운 매물대 하단, 상한 = 기준가 × (1 + mult × 통상 10일 변동폭).
 */
export function buildPlan(
  w: StockDailyCandle[],
  atr: number | null,
  db: DoubleBottom | null,
  rb: Rulebook,
): SwingPlan | null {
  const cfg = rb.plan;
  const close = w[w.length - 1].close;
  if (atr === null || atr <= 0 || close <= 0) return null;

  const levels = computePriceLevels(w, close);
  const half = (levels.binWidth ?? 0) / 2;
  const edges = levels.zones
    .filter((z) => z.weightPct >= cfg.zoneMinWeightPct)
    .map((z) => z.price - half);

  // 지지 — 쌍바닥 우선, 아니면 기준가 아래 가장 가까운 두꺼운 매물대 하단.
  let support: number | null = null;
  let source: SwingPlan["stopSource"] = "atr";
  if (db) {
    support = Math.min(db.l1, db.l2);
    source = "doubleBottom";
  } else {
    const below = edges.filter((e) => e < close);
    if (below.length > 0) {
      support = Math.max(...below);
      source = "zone";
    }
  }

  let stop = support !== null ? support - cfg.stopBufferAtr * atr : close - cfg.fallbackStopAtr * atr;
  if (support === null || close - stop > cfg.maxStopAtr * atr) {
    stop = close - cfg.fallbackStopAtr * atr;
    source = "atr";
  }
  if (close - stop < cfg.minStopAtr * atr) stop = close - cfg.minStopAtr * atr;

  const d10 = levels.typicalMove.d10;
  const cap = d10 !== null ? close * (1 + (cfg.targetCapTypicalMult * d10) / 100) : close + cfg.maxStopAtr * atr;
  const above = edges.filter((e) => e > close * (1 + cfg.minTargetGapPct / 100));
  const resistance = above.length > 0 ? Math.min(...above) : null;
  const zoneTarget = resistance !== null && resistance <= cap;
  const target = zoneTarget ? resistance! : cap;

  const stopR = roundToKrxTick(stop);
  const targetR = roundToKrxTick(target);
  const risk = close - stopR;
  return {
    entryRef: close,
    stop: stopR,
    stopSource: source,
    target: targetR,
    targetSource: zoneTarget ? "zone" : "cap",
    rr: risk > 0 ? (targetR - close) / risk : null,
    support,
    resistance,
    typicalMove10Pct: d10,
  };
}

export type PlanOutcome =
  | { status: "invalid"; reason: "gap_below_stop" | "gap_above_target" }
  | {
      status: "entered";
      entry: number;
      exit: number;
      exitReason: "stop" | "target" | "time";
      daysHeld: number;
      /** 비용 차감 순수익률(소수, 0.01 = 1%). */
      netReturn: number;
    };

/**
 * 계획의 사후 결과 — `next` = t+1 부터의 봉(오름차순). horizon 봉이 없으면 null(미완).
 *
 * - 진입 = next[0] 시가. 시가가 손절 이하/목표 이상이면 진입하지 않는다(invalid).
 * - 둘째 날부터 시가가 손절 이하면 시가에 손절, 목표 이상이면 시가에 익절(갭 체결 — 유리하게 가정 안 함).
 * - 한 봉에서 손절·목표가 모두 닿으면 손절로 친다(보수적).
 * - 끝까지 안 닿으면 next[horizon−1] 종가에 청산.
 */
export function simulatePlan(
  next: StockDailyCandle[],
  plan: Pick<SwingPlan, "stop" | "target">,
  horizon: number,
  costPct: number,
): PlanOutcome | null {
  if (next.length < horizon) return null;
  const entry = next[0].open;
  if (entry <= plan.stop) return { status: "invalid", reason: "gap_below_stop" };
  if (entry >= plan.target) return { status: "invalid", reason: "gap_above_target" };

  const done = (exit: number, exitReason: "stop" | "target" | "time", j: number): PlanOutcome => ({
    status: "entered",
    entry,
    exit,
    exitReason,
    daysHeld: j + 1,
    netReturn: exit / entry - 1 - costPct / 100,
  });

  for (let j = 0; j < horizon; j++) {
    const b = next[j];
    if (j > 0) {
      if (b.open <= plan.stop) return done(b.open, "stop", j);
      if (b.open >= plan.target) return done(b.open, "target", j);
    }
    if (b.low <= plan.stop) return done(plan.stop, "stop", j);
    if (b.high >= plan.target) return done(plan.target, "target", j);
  }
  return done(next[horizon - 1].close, "time", horizon - 1);
}
