/**
 * 일봉 가격 레벨 컨텍스트 — AI 종합분석 프롬프트에 **실제 가격**을 주입하기 위한 순수 계산.
 *
 * ## 왜 필요한가
 * 종합분석이 받던 기술 데이터는 축 점수와 지표 **값**(%B, ADX)뿐이라, "볼린저 하단을 터치했다"는
 * 사실은 알아도 **그 하단이 얼마인지는 몰랐다**. 그 결과 모델이 레벨을 추정해 서술하는 일이 생겼다
 * (실측: 삼성전자 분석이 "233,000원(20일선)"이라 했으나 실제 20일선은 276,350원 — 18% 오차).
 *
 * ## 매물대(volume profile)를 위/아래로 나누는 이유
 * 사용자 관점의 핵심은 "현재가가 어느 매물대 사이에 있는가"다.
 *  - 현재가 **아래**에 두꺼운 매물대가 있으면 → 그 구간까지 **추가 하락 여지**(지지가 아직 멀다).
 *  - 현재가가 매물대에 **근접·진입**했으면 → 과거 매수 평단이 몰린 자리라 **지지 후보**.
 *  - 현재가 **위**의 매물대는 반등 시 **저항**(돌파매매의 트리거 라인).
 * 이 배치를 숫자로 주면 모델이 "더 빠질 자리가 남았는지"를 근거 있게 말할 수 있다.
 *
 * 순수 함수(IO 없음) — 값 계산만 하고, 문구 조립은 호출부가 한다.
 */

import { computeVolumeProfile } from "@/lib/utils/volumeProfile";
import type { StockDailyCandle } from "@/lib/api/kis/types";

/** 매물대 1구간 — 현재가 기준 위/아래와 거리까지 포함. */
export interface VolumeZone {
  /** 구간 중앙가(원). */
  price: number;
  /** 전체 거래량 대비 비중 %(두꺼울수록 의미 있는 매물대). */
  weightPct: number;
  /** 현재가 대비 % (양수=현재가보다 위=저항, 음수=아래=지지 후보). */
  distPct: number;
  /** 현재가 기준 위치. */
  side: "above" | "below" | "at";
}

export interface PriceLevels {
  /** 이동평균 실제 가격(봉 부족 시 null). */
  ma: { ma5: number | null; ma20: number | null; ma60: number | null; ma120: number | null };
  /** 볼린저(20,2) 상/중/하단 **가격**. */
  bollinger: { upper: number; mid: number; lower: number } | null;
  /** 직전 주요 파동(저→고)과 되돌림 레벨. 하락 되돌림이 어디까지 왔는지 판단용. */
  fib: {
    waveLow: number;
    waveHigh: number;
    waveLowDate: string;
    waveHighDate: string;
    /** 되돌림 레벨 가격 — 0.382 / 0.5 / 0.618 / 0.786. */
    levels: { ratio: number; price: number }[];
    /** 현재가가 되돌린 비율(0=고점, 1=저점). 파동 밖이면 범위를 벗어난 값. */
    retracedRatio: number;
  } | null;
  /** 매물대 — 비중 큰 순. 현재가 위/아래가 섞여 있다. */
  zones: VolumeZone[];
  /** 현재가 바로 아래의 가장 가까운 두꺼운 매물대(= 다음 지지 후보). 없으면 null. */
  nearestSupport: VolumeZone | null;
  /** 현재가 바로 위의 가장 가까운 두꺼운 매물대(= 반등 시 저항·돌파 트리거). 없으면 null. */
  nearestResistance: VolumeZone | null;
}

/** 매물대로 인정할 최소 비중 %(노이즈 컷). */
const MIN_ZONE_WEIGHT_PCT = 3;
/** 현재가와 이 % 이내면 "도달(at)"로 본다. */
const AT_ZONE_PCT = 1.5;
/** 매물대 산출에 쓸 최근 봉 수(약 1년). */
const VP_LOOKBACK = 250;
const VP_BINS = 24;

function mean(xs: number[]): number {
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

function maOf(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  return Math.round(mean(closes.slice(-period)));
}

function bollingerOf(closes: number[], period = 20, k = 2) {
  if (closes.length < period) return null;
  const w = closes.slice(-period);
  const m = mean(w);
  const sd = Math.sqrt(mean(w.map((v) => (v - m) ** 2)));
  return { upper: Math.round(m + k * sd), mid: Math.round(m), lower: Math.round(m - k * sd) };
}

/**
 * 직전 주요 파동 — 최근 1년 최저점 이후의 최고점을 파동으로 본다(상승 파동 기준 되돌림).
 * 최저가 최근이면(=아직 파동 미형성) null.
 */
function fibOf(candles: StockDailyCandle[], current: number) {
  const yr = candles.slice(-252);
  if (yr.length < 60) return null;

  let loIdx = 0;
  yr.forEach((c, i) => {
    if (c.low < yr[loIdx].low) loIdx = i;
  });
  const after = yr.slice(loIdx);
  if (after.length < 10) return null; // 저점이 너무 최근 — 되돌림 논의 불가.

  let hiIdx = 0;
  after.forEach((c, i) => {
    if (c.high > after[hiIdx].high) hiIdx = i;
  });
  const waveLow = yr[loIdx].low;
  const waveHigh = after[hiIdx].high;
  if (!(waveHigh > waveLow)) return null;

  const span = waveHigh - waveLow;
  return {
    waveLow,
    waveHigh,
    waveLowDate: yr[loIdx].date,
    waveHighDate: after[hiIdx].date,
    levels: [0.382, 0.5, 0.618, 0.786].map((r) => ({
      ratio: r,
      price: Math.round(waveHigh - span * r),
    })),
    retracedRatio: (waveHigh - current) / span,
  };
}

/** 매물대 — 최근 1년 일봉의 거래량 가격 분포에서 비중 있는 구간만. */
function zonesOf(candles: StockDailyCandle[], current: number): VolumeZone[] {
  const window = candles.slice(-VP_LOOKBACK);
  if (window.length < 40) return [];
  const vp = computeVolumeProfile(window, VP_BINS);
  const total = vp.bins.reduce((s, b) => s + b.volume, 0);
  if (total <= 0) return [];

  return vp.bins
    .map((b) => {
      const distPct = ((current - b.mid) / b.mid) * 100;
      // distPct 부호: 현재가가 구간보다 위면 양수. 사용자 관점은 "구간이 현재가 위/아래"이므로 반전해 표기.
      const side: VolumeZone["side"] =
        Math.abs(distPct) <= AT_ZONE_PCT ? "at" : distPct > 0 ? "below" : "above";
      return {
        price: Math.round(b.mid),
        weightPct: (b.volume / total) * 100,
        distPct: -distPct, // 구간 기준: 현재가 대비 구간이 얼마나 위(+)/아래(-)인지
        side,
      };
    })
    .filter((z) => z.weightPct >= MIN_ZONE_WEIGHT_PCT)
    .sort((a, b) => b.weightPct - a.weightPct);
}

/** 일봉 → 가격 레벨 컨텍스트. 봉이 부족하면 가능한 항목만 채운다. */
export function computePriceLevels(
  candles: StockDailyCandle[],
  currentPrice: number,
): PriceLevels {
  const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));
  const closes = sorted.map((c) => c.close);
  const cur = currentPrice > 0 ? currentPrice : (closes[closes.length - 1] ?? 0);

  const zones = cur > 0 ? zonesOf(sorted, cur) : [];
  // 지지/저항 후보 — 현재가 아래/위 중 **가장 가까운** 것(두께는 이미 필터됨).
  const below = zones.filter((z) => z.side === "below").sort((a, b) => b.price - a.price);
  const above = zones.filter((z) => z.side === "above").sort((a, b) => a.price - b.price);

  return {
    ma: {
      ma5: maOf(closes, 5),
      ma20: maOf(closes, 20),
      ma60: maOf(closes, 60),
      ma120: maOf(closes, 120),
    },
    bollinger: bollingerOf(closes),
    fib: cur > 0 ? fibOf(sorted, cur) : null,
    zones,
    nearestSupport: below[0] ?? null,
    nearestResistance: above[0] ?? null,
  };
}
