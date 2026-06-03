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
  /** 코스피 현재 지수값 (52주 위치 팩터용, 선택). */
  value?: number;
  /** 연중(52주) 최고 지수 (선택). */
  yearHigh?: number;
  /** 연중(52주) 최저 지수 (선택). */
  yearLow?: number;
};

/**
 * 팩터별 가중치 — 가용 팩터만 골라 그 합으로 정규화(누락 팩터는 자연 제외).
 * breadth(시장 폭) 우위 + 모멘텀(당일 강도) + 52주 위치(중기 추세 레벨).
 */
const FACTOR_WEIGHTS = { breadth: 0.5, momentum: 0.3, position: 0.2 } as const;
/** 모멘텀 정규화 기준 — ±이 값(%)을 0/100 양 끝으로 매핑. */
const MOMENTUM_CLAMP_PCT = 3;

function clamp01to100(v: number): number {
  return Math.min(100, Math.max(0, v));
}

/**
 * 국내 멀티팩터 공포·탐욕 — **breadth 50% + 모멘텀 30% + 52주 위치 20%** 가중 합성(0~100).
 * 가용 팩터만 가중평균(누락 시 그 가중치 제외 후 재정규화) → 데이터 부족에도 graceful.
 *
 * - breadth = 상승 / (상승+하락) × 100. 시장 종목 폭(상승+하락=0이면 제외).
 * - momentum = 50 + (코스피 등락률 / ±3%) × 50, clamp. 당일 강도(항상 포함).
 * - position = (현재 - 52주최저) / (52주최고 - 52주최저) × 100. 중기 추세 레벨
 *   (코스피가 연중 고점 근처면 탐욕↑). yearHigh>yearLow 일 때만 포함.
 *
 * ⚠️ 간이 합성(베타) — CNN 의 7지표와 다르며 미국 시장과도 무관. 후속에 변동성(VKOSPI)·
 * 외국인수급 팩터 추가 여지(별도 데이터 필요). 투명성을 위해 가중치를 상수로 노출.
 */
export function computeDomesticFearGreed(
  input: DomesticFearGreedInput,
): FearGreed {
  const factors: Array<{ score: number; weight: number }> = [];

  const total = input.advances + input.declines;
  if (total > 0) {
    factors.push({
      score: (100 * input.advances) / total,
      weight: FACTOR_WEIGHTS.breadth,
    });
  }

  factors.push({
    score: clamp01to100(50 + (input.changePercent / MOMENTUM_CLAMP_PCT) * 50),
    weight: FACTOR_WEIGHTS.momentum,
  });

  if (
    typeof input.value === "number" &&
    typeof input.yearHigh === "number" &&
    typeof input.yearLow === "number" &&
    input.yearHigh > input.yearLow
  ) {
    factors.push({
      score: clamp01to100(
        ((input.value - input.yearLow) / (input.yearHigh - input.yearLow)) * 100,
      ),
      weight: FACTOR_WEIGHTS.position,
    });
  }

  const weightSum = factors.reduce((s, f) => s + f.weight, 0);
  const value =
    weightSum > 0
      ? Math.round(
          factors.reduce((s, f) => s + f.score * f.weight, 0) / weightSum,
        )
      : 50;
  return { value, label: toFearGreedLabel(value) };
}
