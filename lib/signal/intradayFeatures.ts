/**
 * 단타 캔들 미시구조 피처 — 결정론 추출 → AI 판단 컨텍스트 주입용. intraday-paper-watch.
 *
 * 판단가(LLM)가 지표를 재계산하지 않도록, 단타에서 실제로 보는 미시 신호를 룰로 뽑아
 * 한국어 블록으로 포맷한다(해석·매매 판단은 LLM 몫 — 자동 엣지 주장 아님):
 *   ① 마감봉 꼬리 — 아래꼬리=저가 매수 흡수, 위꼬리=고가 매도 우위(+거래량 배율)
 *   ② 스윙 구조 — 직전 저점/고점, 저점 붕괴(LL)·전고 돌파(HH), 상승/하락 구조
 *   ③ 피보나치 되돌림 — 룩백 스윙 고저 기준 0.236~0.786 레벨과 현재가 위치
 *   ④ 단기 박스 — 최근 몇 봉 변동폭 수축(다지기) 여부
 */

import type { StockMinuteCandle } from "@/lib/api/kis/types";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface CandleWickRead {
  /** 봉 시각(HH:mm). */
  time: string;
  direction: "양봉" | "음봉" | "보합";
  /** 몸통/위꼬리/아래꼬리 — 봉 전체 range 대비 %(0~100). */
  bodyPct: number;
  upperWickPct: number;
  lowerWickPct: number;
  /** 거래량 / 직전 20봉 평균(배). 데이터 부족 시 null. */
  volumeRatio: number | null;
}

export interface SwingStructure {
  /** 마지막 확정 스윙 저점/고점(원). 미확보 시 null. */
  lastSwingLow: number | null;
  lastSwingHigh: number | null;
  /** 그 직전 스윙 저점/고점 — HL/LL, HH/LH 판정 기준. */
  prevSwingLow: number | null;
  prevSwingHigh: number | null;
  /** 현재(최근 봉)가 마지막 확정 저점 아래로 내려갔는가 — 바닥 붕괴. */
  lowBroken: boolean;
  /** 현재(최근 봉)가 마지막 확정 고점 위로 올라갔는가 — 전고 돌파. */
  highBroken: boolean;
  /** 스윙 시퀀스 요약 — 상승 구조(HH·HL) / 하락 구조(LL·LH) / 혼조. */
  sequence: "상승 구조" | "하락 구조" | "혼조";
}

export interface FibLevel {
  ratio: number;
  price: number;
}

export interface FibContext {
  /** 룩백 창 스윙 저가/고가(원). */
  swingLow: number;
  swingHigh: number;
  levels: FibLevel[];
  /** 현재가가 걸쳐 있는 구간 라벨(예: "0.382~0.5"). 스윙 밖이면 "고점 위"/"저점 아래". */
  zone: string;
}

export interface BoxState {
  /** 관찰 봉 수. */
  bars: number;
  /** 관찰 구간 변동폭(고저)/현재가 %. */
  rangePct: number;
  /** 변동폭 수축(다지기) 판정 — rangePct ≤ 0.5%. */
  contracting: boolean;
}

export interface IntradayFeatureRead {
  /** 최근 마감봉(최신이 마지막) 최대 3개 — 진행 중 미확정 봉은 제외. */
  lastBars: CandleWickRead[];
  swing: SwingStructure;
  fib: FibContext | null;
  box: BoxState | null;
}

// ─── 추출 ─────────────────────────────────────────────────────────────────────

const FIB_RATIOS = [0.236, 0.382, 0.5, 0.618, 0.786] as const;
/** 스윙 확정 좌우 이웃 수(프랙탈 k) — 양옆 k봉보다 높/낮아야 스윙으로 인정. */
const SWING_K = 2;
/** 박스(다지기) 판정 변동폭 임계(%). */
const BOX_RANGE_PCT = 0.5;

function hhmm(date: string): string {
  return date.slice(-5);
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function readWick(c: StockMinuteCandle, volumeMa: number | null): CandleWickRead {
  const range = c.high - c.low;
  const body = Math.abs(c.close - c.open);
  const upper = c.high - Math.max(c.open, c.close);
  const lower = Math.min(c.open, c.close) - c.low;
  const pct = (v: number) => (range > 0 ? round1((v / range) * 100) : 0);
  return {
    time: hhmm(c.date),
    direction: c.close > c.open ? "양봉" : c.close < c.open ? "음봉" : "보합",
    bodyPct: pct(body),
    upperWickPct: pct(upper),
    lowerWickPct: pct(lower),
    volumeRatio:
      volumeMa != null && volumeMa > 0 ? Math.round((c.volume / volumeMa) * 10) / 10 : null,
  };
}

/** 프랙탈 스윙 포인트 — index i 가 양옆 k 봉보다 극값이면 확정. (마지막 k 봉은 미확정) */
function swingPoints(candles: StockMinuteCandle[], k: number): { lows: number[]; highs: number[] } {
  const lows: number[] = [];
  const highs: number[] = [];
  for (let i = k; i < candles.length - k; i++) {
    let isLow = true;
    let isHigh = true;
    for (let j = 1; j <= k; j++) {
      if (candles[i].low > candles[i - j].low || candles[i].low > candles[i + j].low) isLow = false;
      if (candles[i].high < candles[i - j].high || candles[i].high < candles[i + j].high) isHigh = false;
    }
    if (isLow) lows.push(candles[i].low);
    if (isHigh) highs.push(candles[i].high);
  }
  return { lows, highs };
}

function readSwing(candles: StockMinuteCandle[]): SwingStructure {
  const { lows, highs } = swingPoints(candles, SWING_K);
  const lastSwingLow = lows.at(-1) ?? null;
  const prevSwingLow = lows.at(-2) ?? null;
  const lastSwingHigh = highs.at(-1) ?? null;
  const prevSwingHigh = highs.at(-2) ?? null;
  const last = candles.at(-1)!;

  const hl = lastSwingLow != null && prevSwingLow != null ? lastSwingLow > prevSwingLow : null;
  const hh = lastSwingHigh != null && prevSwingHigh != null ? lastSwingHigh > prevSwingHigh : null;
  const sequence: SwingStructure["sequence"] =
    hl === true && hh === true ? "상승 구조" : hl === false && hh === false ? "하락 구조" : "혼조";

  return {
    lastSwingLow,
    lastSwingHigh,
    prevSwingLow,
    prevSwingHigh,
    lowBroken: lastSwingLow != null && last.low < lastSwingLow,
    highBroken: lastSwingHigh != null && last.high > lastSwingHigh,
    sequence,
  };
}

function readFib(candles: StockMinuteCandle[], close: number): FibContext | null {
  const high = Math.max(...candles.map((c) => c.high));
  const low = Math.min(...candles.map((c) => c.low));
  if (!(high > low)) return null;

  // 상승 스윙 되돌림 관점(고점에서 아래로 내려오는 레벨) — 단타 눌림목 매수의 표준 뷰.
  const levels = FIB_RATIOS.map((ratio) => ({
    ratio,
    price: Math.round(high - (high - low) * ratio),
  }));

  let zone: string;
  if (close > high) zone = "고점 위(돌파)";
  else if (close < low) zone = "저점 아래(이탈)";
  else {
    const position = (high - close) / (high - low); // 0=고점, 1=저점.
    const upperIdx = FIB_RATIOS.findIndex((r) => position <= r);
    if (upperIdx === -1) zone = "0.786~저점";
    else if (upperIdx === 0) zone = "고점~0.236";
    else zone = `${FIB_RATIOS[upperIdx - 1]}~${FIB_RATIOS[upperIdx]}`;
  }

  return { swingLow: low, swingHigh: high, levels, zone };
}

function readBox(candles: StockMinuteCandle[], close: number, timeframe: number): BoxState | null {
  // "3~5분 가격 변동 안 큰 상태" — 타임프레임에 맞춰 약 5분어치 봉(최소 3봉)을 본다.
  const bars = Math.max(3, Math.ceil(5 / Math.max(1, timeframe)));
  if (candles.length < bars || close <= 0) return null;
  const window = candles.slice(-bars);
  const high = Math.max(...window.map((c) => c.high));
  const low = Math.min(...window.map((c) => c.low));
  const rangePct = Math.round(((high - low) / close) * 1000) / 10;
  return { bars, rangePct, contracting: rangePct <= BOX_RANGE_PCT };
}

/**
 * 분봉 → 미시구조 피처. 봉이 부족하면(스윙 확정 불가) null.
 * @param candles 오름차순 분봉. 마지막 봉은 진행 중일 수 있어 꼬리 읽기는 직전 마감봉들 기준.
 * @param lookback 스윙/피보나치 룩백 봉 수(프로파일 structureLookback 권장).
 */
export function extractIntradayFeatures(
  candles: StockMinuteCandle[],
  timeframe: number,
  lookback: number,
): IntradayFeatureRead | null {
  if (candles.length < SWING_K * 2 + 3) return null;
  const window = candles.slice(-Math.max(lookback, SWING_K * 2 + 3));
  const close = window.at(-1)!.close;

  // 마감봉 꼬리 — 마지막 봉은 진행 중(미확정)일 수 있어 제외하고 직전 3개.
  const closed = window.slice(0, -1);
  const lastBars: CandleWickRead[] = [];
  for (let i = Math.max(0, closed.length - 3); i < closed.length; i++) {
    const prior = closed.slice(Math.max(0, i - 20), i);
    const volumeMa =
      prior.length >= 5 ? prior.reduce((s, c) => s + c.volume, 0) / prior.length : null;
    lastBars.push(readWick(closed[i], volumeMa));
  }

  return {
    lastBars,
    swing: readSwing(window),
    fib: readFib(window, close),
    box: readBox(window, close, timeframe),
  };
}

// ─── 프롬프트 포맷 ────────────────────────────────────────────────────────────

const won = (v: number | null): string =>
  v == null ? "—" : `${Math.round(v).toLocaleString("ko-KR")}원`;

function wickNote(bar: CandleWickRead): string {
  const parts: string[] = [];
  if (bar.lowerWickPct >= 40) parts.push("긴 아래꼬리(저가 매수 흡수)");
  else if (bar.upperWickPct >= 40) parts.push("긴 위꼬리(고가 매도 우위)");
  if (bar.volumeRatio != null && bar.volumeRatio >= 1.5) parts.push(`거래량 ×${bar.volumeRatio}`);
  return parts.length ? ` — ${parts.join(" · ")}` : "";
}

/** 피처 → 프롬프트 주입용 한국어 블록. null 이면 빈 문자열(무주입). */
export function formatIntradayFeatures(features: IntradayFeatureRead | null): string {
  if (!features) return "";
  const { lastBars, swing, fib, box } = features;

  const barLines = lastBars
    .map(
      (b) =>
        `  ${b.time} ${b.direction} | 몸통 ${b.bodyPct}% · 위꼬리 ${b.upperWickPct}% · 아래꼬리 ${b.lowerWickPct}%${
          b.volumeRatio != null ? ` | 거래량 ×${b.volumeRatio}` : ""
        }${wickNote(b)}`,
    )
    .join("\n");

  const swingLine =
    `직전 확정 저점 ${won(swing.lastSwingLow)}(그 전 ${won(swing.prevSwingLow)}) · ` +
    `직전 확정 고점 ${won(swing.lastSwingHigh)}(그 전 ${won(swing.prevSwingHigh)}) | ` +
    `${swing.sequence}` +
    `${swing.lowBroken ? " | ⚠️ 직전 저점 붕괴(바닥 이탈)" : ""}` +
    `${swing.highBroken ? " | 전고 돌파 진행" : ""}`;

  const fibLine = fib
    ? `스윙 ${won(fib.swingLow)}→${won(fib.swingHigh)} 기준 ` +
      fib.levels.map((l) => `${l.ratio}=${won(l.price)}`).join(" · ") +
      ` | 현재가 위치: ${fib.zone} 구간`
    : "산출 불가(스윙 미확보)";

  const boxLine = box
    ? `최근 ${box.bars}봉 변동폭 ${box.rangePct}%${box.contracting ? " — 수축(단기 다지기)" : ""}`
    : "—";

  return [
    "",
    "[캔들 흐름 — 최근 마감봉]",
    barLines || "  (마감봉 부족)",
    `[스윙 구조] ${swingLine}`,
    `[피보나치 되돌림] ${fibLine}`,
    `[단기 박스] ${boxLine}`,
  ].join("\n");
}
