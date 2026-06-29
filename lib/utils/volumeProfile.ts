/**
 * volumeProfile — 매물대(가격대별 거래량, Volume-by-Price) 집계 헬퍼.
 *
 * 보이는 차트 구간의 봉들을 가격대 버킷으로 나눠, 각 봉의 거래량을 그 봉이 걸친
 * [low, high] 범위의 버킷들에 균등 분배한다(고전적 근사). 결과는 가격축에 정렬되는
 * 가로 히스토그램(VolumeProfileLayer)에서 소비한다.
 *
 * 순수 함수 — recharts/React 의존 없음. 입력은 index-정렬된 보이는 봉(candleSeries +
 * volSeries 를 zip 한 것). "보이는 구간 전체 누적" 정책이라 확대/축소(days)로 구간이
 * 바뀌면 입력이 달라져 자동 재계산된다.
 */

/** 가격대 버킷 한 칸. */
export interface VolumeBin {
  /** 버킷 하단 가격 경계 */
  low: number;
  /** 버킷 상단 가격 경계 */
  high: number;
  /** 버킷 중앙 가격 */
  mid: number;
  /** 이 가격대에 누적된 거래량(분배 합) */
  volume: number;
}

export interface VolumeProfile {
  bins: VolumeBin[];
  /** 최대 거래량(가로 막대 길이 정규화 기준) */
  maxVolume: number;
  /** 최대 거래량 버킷 index — POC(Point of Control). 없으면 -1 */
  pocIndex: number;
}

const EMPTY: VolumeProfile = { bins: [], maxVolume: 0, pocIndex: -1 };

const clamp = (n: number, min: number, max: number) =>
  n < min ? min : n > max ? max : n;

/** 기본 가격대 버킷 수 — 가격축 240px 기준 한 칸 ~10px 로 가독. */
export const DEFAULT_VP_BIN_COUNT = 24;

export function computeVolumeProfile(
  candles: { low: number; high: number; volume: number }[],
  binCount: number = DEFAULT_VP_BIN_COUNT,
): VolumeProfile {
  if (candles.length === 0 || binCount < 1) return EMPTY;

  let priceMin = Infinity;
  let priceMax = -Infinity;
  for (const c of candles) {
    if (c.low < priceMin) priceMin = c.low;
    if (c.high > priceMax) priceMax = c.high;
  }
  if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax)) return EMPTY;

  // 가격 폭이 0(평탄)이면 단일 버킷에 전체 거래량.
  if (priceMax <= priceMin) {
    const total = candles.reduce((s, c) => s + Math.max(0, c.volume || 0), 0);
    if (total <= 0) return EMPTY;
    return {
      bins: [{ low: priceMin, high: priceMax, mid: priceMin, volume: total }],
      maxVolume: total,
      pocIndex: 0,
    };
  }

  const bucket = (priceMax - priceMin) / binCount;
  const vols = new Array<number>(binCount).fill(0);

  for (const c of candles) {
    const v = Math.max(0, c.volume || 0);
    if (v <= 0) continue;
    // 이 봉이 걸친 버킷 범위. high === priceMax 면 floor 가 binCount 가 되므로 클램프.
    const loIdx = clamp(Math.floor((c.low - priceMin) / bucket), 0, binCount - 1);
    const hiIdx = clamp(Math.floor((c.high - priceMin) / bucket), 0, binCount - 1);
    const spanned = hiIdx - loIdx + 1;
    const share = v / spanned;
    for (let i = loIdx; i <= hiIdx; i++) vols[i] += share;
  }

  let maxVolume = 0;
  let pocIndex = 0;
  const bins: VolumeBin[] = vols.map((volume, i) => {
    if (volume > maxVolume) {
      maxVolume = volume;
      pocIndex = i;
    }
    const low = priceMin + bucket * i;
    const high = low + bucket;
    return { low, high, mid: low + bucket / 2, volume };
  });

  if (maxVolume <= 0) return EMPTY;
  return { bins, maxVolume, pocIndex };
}
