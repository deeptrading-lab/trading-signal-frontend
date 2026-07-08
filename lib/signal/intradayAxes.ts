/**
 * 단타 graded 축 — 이진 임계 대신 연속값으로 volume/volatility 축을 채운다
 * (PRD intraday-decision-overhaul PR-1b).
 *
 * 전수 감사(2,199틱): volume(급증≥1.5배)·volatility(밴드터치) 축이 이벤트 부재 시 만성 중립
 * (direction 0)이라 동의도가 2/4=50% 에 박제 → LLM 이 "신뢰 부족"으로 읽어 전량 HOLD.
 * 리서치(RVOL z-score·VWAP σ-밴드) 기반 대체:
 *   - volume    : 직전 룩백 log-거래량 z-score — 참여 강도를 0~3 가중으로 연속화.
 *   - volatility: 당일 VWAP σ-거리 — 당일 매수/매도 우위 위치를 0~2 가중으로 연속화
 *     (평균회귀 밴드터치는 과거 백테스트에서 역예측이라 추세확인형 지표로 교체).
 *
 * 산출은 RuleHit[] → `aggregateAxis` 재사용 — attribution·트리거·프롬프트 축별 라인 일관성.
 * 레거시 `VOLUME_SURGE_UP/DOWN` 키는 기존 임계(1.5배) 충족 시 그대로 방출 — 트리거 모드
 * 백테스트(`STRONG_*_TRIGGERS`)·attribution 호환 유지.
 *
 * ⚠️ 일봉 경로 무접촉 — `evaluateIntradaySignal` 만 이 축을 `EvaluateOptions.axisOverrides` 로
 *    주입한다. 산출 불가(룩백 미달·무거래·σ=0)면 null 반환 → 해당 축은 레거시 이진 룰 유지.
 * ⚠️ 마지막 봉은 진행 중(미확정)일 수 있다 — 기존 volume 팩터도 같은 봉을 보므로 의미 동일.
 */

import type { StockMinuteCandle } from "@/lib/api/kis/types";
import type { AxisKey, AxisScore, RuleHit } from "@/lib/types/signal";
import { aggregateAxis } from "./score";
import { AXIS_WEIGHTS, VOLUME_SURGE_MULT } from "./weights";

/** z-score 룩백(직전 마감봉 수) — 5분봉 기준 반나절가량. 짧으면 개장 급증에 과민, 길면 둔감. */
const VOLUME_Z_LOOKBACK = 40;
/** z 가중 상한 — AXIS_SCALE.volume(3)에 정렬(z=3 → 축 점수 0/100 포화). */
const VOLUME_Z_CAP = 3;
/** VWAP σ-거리 가중 상한 — AXIS_SCALE.volatility(2)에 정렬(±2σ → 축 점수 0/100 포화). */
const VWAP_SIGMA_CAP = 2;
/** VWAP σ 산출 최소 당일 봉수 — 미만이면 null(개장 직후 σ 불안정). */
const VWAP_MIN_BARS = 6;

/**
 * 마지막 봉 log-거래량 z-score 축(0~100 graded).
 * 평균 이하 참여(z≤0)는 확인 신호 없음 — VOLUME_DRY 정보 hit(축 중립 유지, 기존 의미 동일).
 * 룩백 미달·분산 0(균질 거래량)이면 null — 레거시 이진 축 유지.
 */
export function gradedVolumeAxis(candles: StockMinuteCandle[]): AxisScore | null {
  const n = candles.length;
  if (n < VOLUME_Z_LOOKBACK + 1) return null;
  const last = candles[n - 1];
  const window = candles.slice(n - 1 - VOLUME_Z_LOOKBACK, n - 1); // 직전 룩백(마지막 봉 제외)

  const logs = window.map((c) => Math.log1p(c.volume));
  const mean = logs.reduce((s, v) => s + v, 0) / logs.length;
  const variance = logs.reduce((s, v) => s + (v - mean) ** 2, 0) / logs.length;
  const std = Math.sqrt(variance);
  // 엡실론 가드 — 균질 거래량은 부동소수점 잔차로 std 가 0 이 아닌 극소값이 될 수 있다
  // (z 가 폭주해 가짜 포화 신호를 만든다) → 판정 불가로 취급.
  if (!(std > 1e-9)) return null;

  const z = (Math.log1p(last.volume) - mean) / std;
  const avgVolume = window.reduce((s, c) => s + c.volume, 0) / window.length;
  const ratio = avgVolume > 0 ? last.volume / avgVolume : 0;
  const up = last.close >= last.open;
  const detail = `거래량 z ${z.toFixed(1)} (${ratio.toFixed(1)}배)`;

  const hits: RuleHit[] = [];
  if (z <= 0) {
    hits.push({ key: "VOLUME_DRY", axis: "volume", direction: 0, weight: 0, detail });
  } else {
    // 평균 초과 참여 — 캔들 방향을 z 크기만큼 확인. 레거시 임계 충족 시 기존 키 유지(트리거 호환).
    const key =
      ratio >= VOLUME_SURGE_MULT
        ? up
          ? "VOLUME_SURGE_UP"
          : "VOLUME_SURGE_DOWN"
        : up
          ? "VOLUME_Z_UP"
          : "VOLUME_Z_DOWN";
    hits.push({
      key,
      axis: "volume",
      direction: up ? 1 : -1,
      weight: Math.min(z, VOLUME_Z_CAP),
      detail,
    });
  }
  return aggregateAxis("volume", hits);
}

/**
 * 당일 VWAP ± σ(거래량가중 표준편차) 기준 현재가 위치 축(0~100 graded).
 * VWAP 위 = 당일 매수 우위(+), 아래 = 매도 우위(−) — 추세확인형(평균회귀 아님).
 * 당일 봉 부족·무거래·σ=0 이면 null — 레거시 이진 축 유지.
 */
export function gradedVwapAxis(candles: StockMinuteCandle[]): AxisScore | null {
  const n = candles.length;
  if (n === 0) return null;
  const lastDate = candles[n - 1].date.slice(0, 10);
  const today = candles.filter((c) => c.date.startsWith(lastDate));
  if (today.length < VWAP_MIN_BARS) return null;

  let pv = 0;
  let vol = 0;
  for (const c of today) {
    pv += ((c.high + c.low + c.close) / 3) * c.volume;
    vol += c.volume;
  }
  if (vol <= 0) return null;
  const vwap = pv / vol;

  // 거래량 가중 분산(표준 VWAP 밴드 σ) — 0(완전 평탄)이면 판정 불가.
  let varSum = 0;
  for (const c of today) {
    const tp = (c.high + c.low + c.close) / 3;
    varSum += c.volume * (tp - vwap) ** 2;
  }
  const sigma = Math.sqrt(varSum / vol);
  if (!(sigma > 0)) return null;

  const close = candles[n - 1].close;
  const dist = (close - vwap) / sigma;
  const hits: RuleHit[] = [
    {
      key: dist >= 0 ? "VWAP_ABOVE" : "VWAP_BELOW",
      axis: "volatility",
      direction: dist > 0 ? 1 : dist < 0 ? -1 : 0,
      weight: Math.min(Math.abs(dist), VWAP_SIGMA_CAP),
      detail: `VWAP 이격 ${dist >= 0 ? "+" : ""}${dist.toFixed(1)}σ`,
    },
  ];
  return aggregateAxis("volatility", hits);
}

/**
 * graded 동의도 — "종합 방향에 동의하는 축 비율" 대신 **축 기울기 크기의 가중평균**(0~1).
 * 이진 축 2개가 만성 중립(direction 0)이라 동의도가 0.5 에 박제되던 문제의 대체 지표.
 * limitedData 상한(0.6)은 호출측(evaluateIntradaySignal)이 엔진과 동일하게 재적용한다.
 */
export function gradedConfidence(
  axes: AxisScore[],
  weights: Record<AxisKey, number> = AXIS_WEIGHTS,
): number {
  if (axes.length === 0) return 0;
  const totalW = axes.reduce((s, a) => s + weights[a.axis], 0) || 1;
  return axes.reduce((s, a) => s + (Math.abs(a.score - 50) / 50) * weights[a.axis], 0) / totalW;
}
