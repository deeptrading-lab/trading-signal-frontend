/**
 * 시장 구조 기반 TP/SL 결정 — 매물대(Volume Profile HVN) + 스윙 고저 + MA 손절.
 *
 * ## 동작 (LONG 기준)
 * 1. pastCandles 에서 Volume Profile HVN(매물대) + 스윙 고저 추출.
 * 2. **TP** = 진입가 위 가장 가까운 저항(HVN or 스윙 고점).
 * 3. **SL** = 진입가 아래 가장 가까운 지지(HVN or 스윙 저점).
 *    - MA20 레벨이 그 지지보다 진입가에 더 가까우면 MA20 사용(타이트 손절 우선).
 * 4. RRR = (TP-entry)/(entry-SL) < minRRR 이면 null → 호출부가 ATR 폴백.
 *
 * ## 설계 원칙
 * - pastCandles 는 진입 봉까지만 포함 (룩어헤드 0).
 * - TP와 SL 간 최소 "버퍼" = entry의 0.5% — 진입가에 너무 붙은 레벨 제거.
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
import { calcSMA } from "@/lib/utils/technicalIndicators";
import { calcVolumeProfile, findHVNs } from "./volumeProfile";
import { findSwingHighs, findSwingLows } from "./swingLevels";
import {
  STRUCTURE_LOOKBACK,
  STRUCTURE_BINS,
  STRUCTURE_SWING_WINDOW,
  STRUCTURE_MA_STOP,
  STRUCTURE_MIN_RRR,
} from "@/lib/signal/weights";

export type StructureBarrierOpts = {
  lookbackBars?: number;
  profileBins?: number;
  swingWindow?: number;
  maStopPeriod?: number;
  minRRR?: number;
};

export type StructureBarrierResult = {
  tpPrice: number;
  slPrice: number;
  /** TP 소스 — 디버그·리포트용. */
  tpSource: "hvn" | "swing";
  /** SL 소스. */
  slSource: "hvn" | "swing" | "ma";
};

/** 진입가 기준 최소 버퍼 비율 — 진입가에 너무 가까운 레벨 제외. */
const MIN_BUFFER_RATIO = 0.005; // 0.5%

export function structureBarrierAt(
  pastCandles: StockDailyCandle[],
  entryPrice: number,
  dir: 1 | -1,
  opts?: StructureBarrierOpts,
): StructureBarrierResult | null {
  const lookback = opts?.lookbackBars ?? STRUCTURE_LOOKBACK;
  const bins = opts?.profileBins ?? STRUCTURE_BINS;
  const swingWin = opts?.swingWindow ?? STRUCTURE_SWING_WINDOW;
  const maPeriod = opts?.maStopPeriod ?? STRUCTURE_MA_STOP;
  const minRRR = opts?.minRRR ?? STRUCTURE_MIN_RRR;

  // 룩백 구간 잘라내기 — 과거 데이터만.
  const window = pastCandles.slice(-lookback);
  if (window.length < swingWin * 2 + 1) return null;

  // ── 저항·지지 레벨 수집 ──
  const profile = calcVolumeProfile(window, bins);
  const hvnPrices = findHVNs(profile).map((n) => n.price);
  const swingHighs = findSwingHighs(window, swingWin);
  const swingLows = findSwingLows(window, swingWin);

  const buf = entryPrice * MIN_BUFFER_RATIO;

  if (dir === 1) {
    // LONG: 저항(TP) = 진입가 위, 지지(SL) = 진입가 아래
    const resistances = [
      ...hvnPrices.filter((p) => p > entryPrice + buf).map((p) => ({ p, src: "hvn" as const })),
      ...swingHighs.filter((p) => p > entryPrice + buf).map((p) => ({ p, src: "swing" as const })),
    ];
    const supports = [
      ...hvnPrices.filter((p) => p < entryPrice - buf).map((p) => ({ p, src: "hvn" as const })),
      ...swingLows.filter((p) => p < entryPrice - buf).map((p) => ({ p, src: "swing" as const })),
    ];

    if (resistances.length === 0) return null;

    // 가장 가까운 저항(최솟값)
    const tp = resistances.reduce((a, b) => (a.p < b.p ? a : b));

    // 가장 가까운 지지(최댓값)
    const slCandidate = supports.length > 0
      ? supports.reduce((a, b) => (a.p > b.p ? a : b))
      : null;

    // MA 손절 레벨
    let maLevel: number | null = null;
    if (maPeriod > 0 && window.length >= maPeriod) {
      const ma = calcSMA(window.map((c) => c.close), maPeriod);
      const last = ma[ma.length - 1];
      if (last !== null && last < entryPrice - buf) maLevel = last;
    }

    // SL = 지지 vs MA 중 진입가에 가까운(더 타이트한) 쪽
    let slPrice: number;
    let slSource: StructureBarrierResult["slSource"];
    if (slCandidate && maLevel) {
      if (maLevel > slCandidate.p) {
        slPrice = maLevel; slSource = "ma";
      } else {
        slPrice = slCandidate.p; slSource = slCandidate.src;
      }
    } else if (slCandidate) {
      slPrice = slCandidate.p; slSource = slCandidate.src;
    } else if (maLevel) {
      slPrice = maLevel; slSource = "ma";
    } else {
      return null; // 지지도 MA도 없으면 구조 미발견
    }

    const rrr = (tp.p - entryPrice) / (entryPrice - slPrice);
    if (rrr < minRRR) return null;

    return { tpPrice: tp.p, slPrice, tpSource: tp.src, slSource };

  } else {
    // SHORT: 지지(TP) = 진입가 아래, 저항(SL) = 진입가 위
    const supports = [
      ...hvnPrices.filter((p) => p < entryPrice - buf).map((p) => ({ p, src: "hvn" as const })),
      ...swingLows.filter((p) => p < entryPrice - buf).map((p) => ({ p, src: "swing" as const })),
    ];
    const resistances = [
      ...hvnPrices.filter((p) => p > entryPrice + buf).map((p) => ({ p, src: "hvn" as const })),
      ...swingHighs.filter((p) => p > entryPrice + buf).map((p) => ({ p, src: "swing" as const })),
    ];

    if (supports.length === 0 || resistances.length === 0) return null;

    const tp = supports.reduce((a, b) => (a.p > b.p ? a : b)); // 가장 가까운 지지(최댓값)
    const sl = resistances.reduce((a, b) => (a.p < b.p ? a : b)); // 가장 가까운 저항(최솟값)

    const rrr = (entryPrice - tp.p) / (sl.p - entryPrice);
    if (rrr < minRRR) return null;

    return { tpPrice: tp.p, slPrice: sl.p, tpSource: tp.src, slSource: sl.src };
  }
}
