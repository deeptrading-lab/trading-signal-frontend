/**
 * 체결강도 틱룰 파생 — **순수 함수**(PRD `toss-trades` §3-2). side 필드 부재로 Lee-Ready 간이
 * 틱룰로 방향을 추정한다:
 *   - 직전 체결가 대비 **상승틱 = 매수(buy)·하락틱 = 매도(sell)·동일가(zero-tick) = 직전 분류 상속**.
 *   - 첫 체결(직전 없음)은 seed = `neutral`(강도 집계에서 제외). 전부 동일가·seed만이면 `strength = null`.
 *
 * 근사치임을 반환 타입(`TradeStrength.method:"tick-rule"`·`isApproximation:true`)에 명시해 소비처가
 * 정밀 수급으로 오용하지 못하게 잠근다. 후속 단타 LLM 주입 PR 이 이 순수 함수를 그대로 재사용한다.
 *
 * ## 정렬 규약
 *
 * 입력은 순서 무관 — 함수 내부에서 **timestamp 오름차순(과거→현재)으로 방어정렬(stable)** 후 분류한다.
 * 토스 응답은 최신순이라 정렬로 시간순이 되고, 주말 스냅샷(동일 timestamp 다수)은 stable sort 로
 * 입력 순서를 보존한다(크래시·NaN 없음, PRD §9 q2).
 */

import type {
  TapeTrade,
  Trade,
  TradeSide,
  TradeStrength,
} from "@/lib/types/stock/trades";

/** ISO 문자열 → epoch ms. 파싱 불가면 0(동일 취급 → stable 로 원순서 보존). */
function toMs(timestamp: string): number {
  const ms = Date.parse(timestamp);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * timestamp 오름차순(과거→현재) stable 정렬 후 각 체결을 틱룰로 분류한다. 반환은 시간순.
 * (Array.prototype.sort 는 ES2019+ 에서 stable 이 보장돼 동일 timestamp 는 입력 순서 유지.)
 */
function classifyChronological(trades: Trade[]): TapeTrade[] {
  const chronological = [...trades].sort(
    (a, b) => toMs(a.timestamp) - toMs(b.timestamp),
  );

  const out: TapeTrade[] = [];
  let prevPrice: number | null = null;
  let prevSide: TradeSide = "neutral";

  for (const trade of chronological) {
    let side: TradeSide;
    if (prevPrice === null) {
      side = "neutral"; // seed — 직전 없음(강도 집계 제외).
    } else if (trade.price > prevPrice) {
      side = "buy"; // 상승틱.
    } else if (trade.price < prevPrice) {
      side = "sell"; // 하락틱.
    } else {
      side = prevSide; // 동일가(zero-tick) → 직전 분류 상속(seed 뒤 동일가는 neutral 유지).
    }
    out.push({ ...trade, side });
    prevPrice = trade.price;
    prevSide = side;
  }

  return out;
}

/**
 * 테이프 표시용 — 틱룰 분류를 부착한 체결을 **최신순**(맨 위=가장 최근)으로 반환.
 * 시간순 분류(직전가 비교) 후 표시 순서로 뒤집는다.
 */
export function classifyTrades(trades: Trade[]): TapeTrade[] {
  return classifyChronological(trades).reverse();
}

/**
 * 틱룰 체결강도(근사) 집계 — 매수/매도 체결량 합 + 매수 우위 비율.
 * 분모 0(빈 배열·전부 동일가·seed만) → `strength = null`(불명).
 */
export function deriveTradeStrength(trades: Trade[]): TradeStrength {
  let buyVolume = 0;
  let sellVolume = 0;
  let sampleCount = 0;

  for (const trade of classifyChronological(trades)) {
    if (trade.side === "buy") {
      buyVolume += trade.volume;
      sampleCount += 1;
    } else if (trade.side === "sell") {
      sellVolume += trade.volume;
      sampleCount += 1;
    }
    // neutral(seed·상속 불명)은 강도 집계에서 제외.
  }

  const denominator = buyVolume + sellVolume;
  const strength = denominator > 0 ? buyVolume / denominator : null;

  return {
    buyVolume,
    sellVolume,
    strength,
    method: "tick-rule",
    isApproximation: true,
    sampleCount,
  };
}
