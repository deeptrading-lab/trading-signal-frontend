/**
 * Volume Profile(볼륨 프로파일) — 매물대(거래량 집중 가격대) 계산.
 *
 * 각 봉의 typical price((H+L+C)/3)를 가격 구간(bin)으로 매핑해 거래량을 누적한다.
 * 분포에서 로컬 피크(High Volume Node = HVN) = 매물대 → 강한 지지·저항 구간.
 *
 * 입력은 **과거 봉만** (룩어헤드 0 — 백테스트 룩어헤드 차단 책임은 호출부).
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";

export type PriceNode = {
  /** 구간 중심 가격. */
  price: number;
  /** 해당 구간 총 거래량. */
  volume: number;
  /** 전체 거래량 대비 비율 (0~1). */
  pct: number;
};

/**
 * 캔들 배열 → 가격 구간별 거래량 분포.
 *
 * @param bins 가격 구간 수. 구간폭 = (고가범위) / bins.
 */
export function calcVolumeProfile(
  candles: StockDailyCandle[],
  bins = 40,
): PriceNode[] {
  if (candles.length === 0 || bins <= 0) return [];

  const lows = candles.map((c) => c.low);
  const highs = candles.map((c) => c.high);
  const minP = Math.min(...lows);
  const maxP = Math.max(...highs);
  const range = maxP - minP;
  if (range === 0) return [{ price: minP, volume: candles.reduce((s, c) => s + c.volume, 0), pct: 1 }];

  const binWidth = range / bins;
  const profile = new Float64Array(bins);

  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const bin = Math.min(Math.floor((typicalPrice - minP) / binWidth), bins - 1);
    profile[bin] += c.volume;
  }

  const totalVol = Array.from(profile).reduce((s, v) => s + v, 0);
  return Array.from(profile, (vol, i) => ({
    price: minP + (i + 0.5) * binWidth,
    volume: vol,
    pct: totalVol > 0 ? vol / totalVol : 0,
  }));
}

/**
 * Volume Profile에서 HVN(High Volume Node) 피크 추출 = 매물대.
 *
 * 조건: ① 양옆 bin보다 거래량이 많은 로컬 최댓값 ② 전체 거래량 대비 minPct 이상.
 * minPct를 낮추면 더 많은 매물대 검출, 높이면 주요 매물대만.
 */
export function findHVNs(profile: PriceNode[], minPct = 0.02): PriceNode[] {
  const hvns: PriceNode[] = [];
  for (let i = 1; i < profile.length - 1; i++) {
    if (
      profile[i].volume > profile[i - 1].volume &&
      profile[i].volume > profile[i + 1].volume &&
      profile[i].pct >= minPct
    ) {
      hvns.push(profile[i]);
    }
  }
  return hvns;
}
