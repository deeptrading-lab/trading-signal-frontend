/**
 * 공포·탐욕 지수 공통 유틸 — 값→라벨 매핑 + 국내 멀티팩터 산출.
 *
 * 두 출처를 모두 다룬다(PRD `fear-greed-overhaul`):
 *   - 국내(코스피): 아래 `computeDomesticFearGreed` 가 **breadth + 모멘텀** 가중 합성(자체 산출).
 *   - 미국(CNN): 실값을 BFF 가 프록시(별도) — 라벨 매핑만 본 파일 공유.
 *
 * 라벨 구간(0~100): 0–24 극공포 / 25–44 공포 / 45–55 중립 / 56–75 탐욕 / 76–100 극탐욕.
 */

import type { FearGreed, FearGreedLabel } from "@/lib/types/dashboard/fearGreed";

/** 0~100 값 → 5구간 라벨. */
export function toFearGreedLabel(value: number): FearGreedLabel {
  if (value <= 24) return "EXTREME_FEAR";
  if (value <= 44) return "FEAR";
  if (value <= 55) return "NEUTRAL";
  if (value <= 75) return "GREED";
  return "EXTREME_GREED";
}

/** 국내 합성 입력 — 홈이 이미 패칭한 코스피 지수 쿼리에서 추출(추가 콜 0). */
export type DomesticFearGreedInput = {
  /** 상승 종목 수. */
  advances: number;
  /** 하락 종목 수. */
  declines: number;
  /** 코스피 당일 등락률(%, 부호 포함). */
  changePercent: number;
};

/** breadth(상승종목 비율) 가중치 — 시장 폭이 심리의 1차 신호. */
const BREADTH_WEIGHT = 0.6;
/** 모멘텀(당일 등락률) 가중치. */
const MOMENTUM_WEIGHT = 0.4;
/** 모멘텀 정규화 기준 — ±이 값(%)을 0/100 양 끝으로 매핑. */
const MOMENTUM_CLAMP_PCT = 3;

function clamp01to100(v: number): number {
  return Math.min(100, Math.max(0, v));
}

/**
 * 국내 멀티팩터 공포·탐욕 — **breadth 60% + 모멘텀 40%** 가중 합성(0~100).
 *
 * - breadth = 상승 / (상승+하락) × 100. 시장 종목 폭.
 * - momentum = 50 + (코스피 등락률 / ±3%) × 50, clamp. 당일 강도.
 * - 데이터 부족(상승+하락=0) 시 모멘텀만으로, 그것도 없으면 중립 50.
 *
 * ⚠️ 간이 합성(베타) — CNN 의 7지표와 다르며 미국 시장과도 무관. 후속에 변동성·외국인수급
 * 팩터 추가 여지(가중치 상수만 조정). 투명성을 위해 가중치를 상수로 노출.
 */
export function computeDomesticFearGreed(
  input: DomesticFearGreedInput,
): FearGreed {
  const total = input.advances + input.declines;
  const hasBreadth = total > 0;
  const breadth = hasBreadth ? (100 * input.advances) / total : 50;
  const momentum = clamp01to100(
    50 + (input.changePercent / MOMENTUM_CLAMP_PCT) * 50,
  );
  const value = hasBreadth
    ? Math.round(breadth * BREADTH_WEIGHT + momentum * MOMENTUM_WEIGHT)
    : Math.round(momentum);
  return { value, label: toFearGreedLabel(value) };
}
