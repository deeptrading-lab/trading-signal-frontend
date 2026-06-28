/**
 * 시그널 규칙 엔진 공개 진입점 — `evaluateSignal(candles)`.
 *
 * 캔들(오름차순)의 **마지막 봉**에서 4축 평가 → 종합점수 + BUY/HOLD/SELL + 축별 근거 분해.
 * 순수 함수 — 데이터 출처(라이브/스냅샷/목) 무관. 백테스트는 슬라이스를 넘겨 같은 함수 재사용.
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
import type { AxisScore, EvaluateOptions, SignalResult } from "@/lib/types/signal";
import { buildContext } from "./context";
import { evaluateTrend } from "./factors/trend";
import { evaluateMomentum } from "./factors/momentum";
import { evaluateVolume } from "./factors/volume";
import { evaluateVolatility } from "./factors/volatility";
import { aggregateAxis, composite } from "./score";
import { computeRegime } from "./regime";
import { MIN_BARS, SOFT_MIN_BARS } from "./weights";

/**
 * limitedData(90~130봉) 시 numeric confidence(동의도) 상한.
 * 0.6 = "최대 3/4 축이 동의해도 한 단계 낮춰 표기" 수준 — 장기추세(120일선·정배열·레짐)가
 * 미확보된 상태에서 동의도가 높게 표기돼 과신을 유도하는 것을 막는 보조 신호.
 * (verdict 라벨 HIGH 금지는 프롬프트가 1차 제어; 이 캡은 signalSummary 의 "동의도 N%" 를 눌러
 *  LLM 에 데이터 제한을 간접 전달하는 결정적 보조 수단이다.)
 */
const LIMITED_DATA_CONFIDENCE_CAP = 0.6;

/** 캔들 배열 마지막 봉 기준 신호 평가. */
export function evaluateSignal(
  candles: StockDailyCandle[],
  opts?: EvaluateOptions,
): SignalResult {
  const n = candles.length;
  const asOf = n > 0 ? candles[n - 1].date : "";

  // 분봉 프로파일은 warmup 경계를 오버라이드(미지정 시 일봉 기본 90/130 — 무회귀).
  const softMin = opts?.softMinBars ?? SOFT_MIN_BARS;
  const fullMin = opts?.minBars ?? MIN_BARS;

  // 워밍업 부족(< softMin) — 60일선·골든크로스도 흔들려 분석 부적정 → HOLD 안전 폴백.
  if (n < softMin) {
    return { action: "HOLD", score: 50, confidence: 0, axes: [], asOf, warmupOk: false, limitedData: false, bars: n, regime: 0 };
  }

  // softMin <= n < fullMin — 장기추세(베이스 이평·정배열·레짐) 미확보. 분석은 수행하되 limitedData 마킹.
  const limitedData = n < fullMin;

  const ctx = buildContext(candles, opts?.indicators);

  const trendHits = evaluateTrend(ctx);
  const trendAxis = aggregateAxis("trend", trendHits);

  // 모멘텀은 추세 방향을 레짐 게이트로 받는다(역추세 신호 감쇠).
  const momentumHits = evaluateMomentum(ctx, trendAxis.direction);

  const axes: AxisScore[] = [
    trendAxis,
    aggregateAxis("momentum", momentumHits),
    aggregateAxis("volume", evaluateVolume(ctx)),
    // 변동성도 추세를 레짐 게이트로 받는다(역추세 밴드 터치 = 평균회귀 매수 감쇠).
    aggregateAxis("volatility", evaluateVolatility(ctx, trendAxis.direction)),
  ];

  const { action: rawAction, score, confidence: rawConfidence } = composite(axes, opts);

  // limitedData 면 동의도(numeric confidence)에 상한 — 장기추세 미확보 과신 방지(보조 수단).
  // n >= 130(풀 품질)은 절대 건드리지 않는다(회귀 가드, AC-3).
  const confidence = limitedData
    ? Math.min(rawConfidence, LIMITED_DATA_CONFIDENCE_CAP)
    : rawConfidence;

  // 장기추세 레짐 — 항상 산출(투명성). 필터 on(기본)일 때만 역추세 진입 veto.
  // (90~130봉은 SMA120 룩백 미확보로 computeRegime=0 중립 → veto 미적용. 정상 degrade.)
  // 분봉은 자체 SMA120 레짐이 오버나잇 갭에 오염되므로 일봉 레짐을 regimeOverride 로 주입한다.
  const regime = opts?.regimeOverride ?? computeRegime(ctx);
  let action = rawAction;
  if (opts?.regimeFilter !== false) {
    if (regime === -1 && rawAction === "BUY") action = "HOLD";
    else if (regime === 1 && rawAction === "SELL") action = "HOLD";
  }

  return { action, score, confidence, axes, asOf, warmupOk: true, limitedData, bars: n, regime };
}
