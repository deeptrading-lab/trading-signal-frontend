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

export interface DayContext {
  /** 당일 시가·고가·저가(진행 중 포함). */
  open: number;
  dayHigh: number;
  dayLow: number;
  /** 전일 고/저/종 — warmup 미확보 시 null. */
  prevHigh: number | null;
  prevLow: number | null;
  prevClose: number | null;
  /** 갭%(당일 시가 vs 전일 종가). 전일 없으면 null. */
  gapPct: number | null;
  /** 현재가가 당일 고가/저가 0.1% 이내(신고가·신저가권) 여부. */
  nearDayHigh: boolean;
  nearDayLow: boolean;
}

export interface OpeningRangeRead {
  high: number;
  low: number;
  /** 아직 09:30 이전(레인지 형성 중). */
  forming: boolean;
  position: "상단 돌파" | "레인지 내" | "하단 이탈";
}

export interface MomentumRead {
  /** RSI14(최근 봉). 봉 부족 시 null. */
  rsi: number | null;
  /** 스윙 저점/고점 기반 RSI 다이버전스 — null 이면 없음. */
  divergence: "강세 다이버전스" | "약세 다이버전스" | null;
  /** 마감봉 기준 연속 양봉(+n)/음봉(−n). 0 = 보합/전환. */
  streak: number;
}

export interface IntradayFeatureRead {
  /** 최근 마감봉(최신이 마지막) 최대 3개 — 진행 중 미확정 봉은 제외. */
  lastBars: CandleWickRead[];
  swing: SwingStructure;
  fib: FibContext | null;
  box: BoxState | null;
  /** 당일 시가·고저·전일 레벨·갭 — 전일 warmup 없으면 부분 null. */
  day: DayContext | null;
  /** 당일 VWAP(원)·현재가 이격%. 당일 봉 없으면 null. */
  vwap: { price: number; gapPct: number } | null;
  /** 오프닝 레인지(09:00~09:30). 당일 초반 데이터 없으면 null. */
  openingRange: OpeningRangeRead | null;
  momentum: MomentumRead;
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

/** 프랙탈 스윙 포인트(인덱스 포함) — index i 가 양옆 k 봉보다 극값이면 확정. (마지막 k 봉은 미확정) */
function swingPoints(
  candles: StockMinuteCandle[],
  k: number,
): { lows: Array<{ index: number; price: number }>; highs: Array<{ index: number; price: number }> } {
  const lows: Array<{ index: number; price: number }> = [];
  const highs: Array<{ index: number; price: number }> = [];
  for (let i = k; i < candles.length - k; i++) {
    let isLow = true;
    let isHigh = true;
    for (let j = 1; j <= k; j++) {
      if (candles[i].low > candles[i - j].low || candles[i].low > candles[i + j].low) isLow = false;
      if (candles[i].high < candles[i - j].high || candles[i].high < candles[i + j].high) isHigh = false;
    }
    if (isLow) lows.push({ index: i, price: candles[i].low });
    if (isHigh) highs.push({ index: i, price: candles[i].high });
  }
  return { lows, highs };
}

function readSwing(candles: StockMinuteCandle[]): SwingStructure {
  const { lows, highs } = swingPoints(candles, SWING_K);
  const lastSwingLow = lows.at(-1)?.price ?? null;
  const prevSwingLow = lows.at(-2)?.price ?? null;
  const lastSwingHigh = highs.at(-1)?.price ?? null;
  const prevSwingHigh = highs.at(-2)?.price ?? null;
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

/** 마지막 봉 날짜 기준 당일/전일 분봉 분리 — 전일 미확보면 prev 빈 배열. */
function splitByDay(candles: StockMinuteCandle[]): {
  today: StockMinuteCandle[];
  prev: StockMinuteCandle[];
} {
  const lastDate = candles.at(-1)!.date.slice(0, 10);
  const today = candles.filter((c) => c.date.startsWith(lastDate));
  const rest = candles.filter((c) => !c.date.startsWith(lastDate));
  const prevDate = rest.at(-1)?.date.slice(0, 10);
  const prev = prevDate ? rest.filter((c) => c.date.startsWith(prevDate)) : [];
  return { today, prev };
}

/** 당일 시가·고저 + 전일 고저종 + 갭% + 신고저권. */
function readDay(
  today: StockMinuteCandle[],
  prev: StockMinuteCandle[],
  close: number,
): DayContext | null {
  if (today.length === 0) return null;
  const open = today[0].open;
  const dayHigh = Math.max(...today.map((c) => c.high));
  const dayLow = Math.min(...today.map((c) => c.low));
  const prevHigh = prev.length ? Math.max(...prev.map((c) => c.high)) : null;
  const prevLow = prev.length ? Math.min(...prev.map((c) => c.low)) : null;
  const prevClose = prev.at(-1)?.close ?? null;
  const near = (level: number) => Math.abs(close - level) / Math.max(close, 1) <= 0.001;
  return {
    open,
    dayHigh,
    dayLow,
    prevHigh,
    prevLow,
    prevClose,
    gapPct:
      prevClose != null && prevClose > 0
        ? Math.round(((open - prevClose) / prevClose) * 1000) / 10
        : null,
    nearDayHigh: near(dayHigh) || close >= dayHigh,
    nearDayLow: near(dayLow) || close <= dayLow,
  };
}

/** 당일 VWAP — Σ(대표가×거래량)/Σ거래량, 대표가 = (고+저+종)/3. */
function readVwap(today: StockMinuteCandle[], close: number): { price: number; gapPct: number } | null {
  let pv = 0;
  let vol = 0;
  for (const c of today) {
    pv += ((c.high + c.low + c.close) / 3) * c.volume;
    vol += c.volume;
  }
  if (vol <= 0) return null;
  const price = Math.round(pv / vol);
  return { price, gapPct: Math.round(((close - price) / price) * 1000) / 10 };
}

/** 오프닝 레인지(정규장 첫 30분, ~09:30) 고저와 현재가 위치. */
function readOpeningRange(today: StockMinuteCandle[], close: number): OpeningRangeRead | null {
  const orBars = today.filter((c) => c.date.slice(-5) < "09:30");
  if (orBars.length === 0) return null;
  const high = Math.max(...orBars.map((c) => c.high));
  const low = Math.min(...orBars.map((c) => c.low));
  const forming = (today.at(-1)?.date.slice(-5) ?? "") < "09:30";
  const position: OpeningRangeRead["position"] =
    close > high ? "상단 돌파" : close < low ? "하단 이탈" : "레인지 내";
  return { high, low, forming, position };
}

/** Wilder RSI 시리즈(기간 14) — 인덱스 정렬, 워밍업 구간은 null. */
function rsiSeries(closes: number[], period = 14): Array<number | null> {
  const out: Array<number | null> = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  const rsiAt = () => (avgLoss === 0 ? 100 : Math.round(100 - 100 / (1 + avgGain / avgLoss)));
  out[period] = rsiAt();
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, d)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period;
    out[i] = rsiAt();
  }
  return out;
}

/** RSI + 스윙 다이버전스 + 연속봉. */
function readMomentum(window: StockMinuteCandle[]): MomentumRead {
  const closes = window.map((c) => c.close);
  const rsi = rsiSeries(closes);
  const { lows, highs } = swingPoints(window, SWING_K);

  let divergence: MomentumRead["divergence"] = null;
  const l1 = lows.at(-2);
  const l2 = lows.at(-1);
  if (l1 && l2 && rsi[l1.index] != null && rsi[l2.index] != null) {
    // 가격 저점은 낮아지는데 RSI 저점은 높아짐 → 매도 압력 소진(강세) 단서.
    if (l2.price < l1.price && rsi[l2.index]! > rsi[l1.index]!) divergence = "강세 다이버전스";
  }
  const h1 = highs.at(-2);
  const h2 = highs.at(-1);
  if (!divergence && h1 && h2 && rsi[h1.index] != null && rsi[h2.index] != null) {
    if (h2.price > h1.price && rsi[h2.index]! < rsi[h1.index]!) divergence = "약세 다이버전스";
  }

  // 연속봉 — 진행 중 마지막 봉 제외, 마감봉 기준.
  const closed = window.slice(0, -1);
  let streak = 0;
  for (let i = closed.length - 1; i >= 0; i--) {
    const dir = Math.sign(closed[i].close - closed[i].open);
    if (dir === 0) break;
    if (streak === 0) streak = dir;
    else if (Math.sign(streak) === dir) streak += dir;
    else break;
  }

  return { rsi: rsi.at(-1) ?? null, divergence, streak };
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

  // 당일 레벨(시가·고저·VWAP·오프닝 레인지)은 룩백 창이 아니라 **전체 배열**에서 계산 —
  // 오후엔 룩백 창이 당일 시가를 지나칠 수 있다(1분봉 130창 ≈ 2시간).
  const { today, prev } = splitByDay(candles);

  return {
    lastBars,
    swing: readSwing(window),
    fib: readFib(window, close),
    box: readBox(window, close, timeframe),
    day: readDay(today, prev, close),
    vwap: readVwap(today, close),
    openingRange: readOpeningRange(today, close),
    momentum: readMomentum(window),
  };
}

// ─── 프롬프트 포맷 ────────────────────────────────────────────────────────────

const won = (v: number | null): string =>
  v == null ? "—" : `${Math.round(v).toLocaleString("ko-KR")}원`;

function wickNote(bar: CandleWickRead): string {
  // 거래량 배율은 본문에 이미 표기 — 여기선 꼬리 해석만 덧붙인다.
  if (bar.lowerWickPct >= 40) return " — 긴 아래꼬리(저가 매수 흡수)";
  if (bar.upperWickPct >= 40) return " — 긴 위꼬리(고가 매도 우위)";
  return "";
}

/** 피처 → 프롬프트 주입용 한국어 블록. null 이면 빈 문자열(무주입). */
export function formatIntradayFeatures(features: IntradayFeatureRead | null): string {
  if (!features) return "";
  const { lastBars, swing, fib, box, day, vwap, openingRange, momentum } = features;

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

  const dayLine = day
    ? `시가 ${won(day.open)}${day.gapPct != null ? ` (갭 ${day.gapPct >= 0 ? "+" : ""}${day.gapPct}%)` : ""} | ` +
      `당일 고 ${won(day.dayHigh)} · 저 ${won(day.dayLow)}` +
      `${day.nearDayHigh ? " — 당일 신고가권" : day.nearDayLow ? " — 당일 신저가권" : ""} | ` +
      `전일 고 ${won(day.prevHigh)} · 저 ${won(day.prevLow)} · 종 ${won(day.prevClose)}`
    : "—";

  const vwapLine = vwap
    ? `${won(vwap.price)} · 현재가 이격 ${vwap.gapPct >= 0 ? "+" : ""}${vwap.gapPct}% ` +
      `(VWAP ${vwap.gapPct >= 0 ? "위 — 당일 매수 우위" : "아래 — 당일 매도 우위"})`
    : "—";

  const orLine = openingRange
    ? `고 ${won(openingRange.high)} · 저 ${won(openingRange.low)} — ${
        openingRange.forming ? "형성 중" : openingRange.position
      }`
    : "—";

  const momentumLine =
    `RSI14 ${momentum.rsi ?? "—"}` +
    `${momentum.streak !== 0 ? ` · 연속 ${momentum.streak > 0 ? "양봉" : "음봉"} ${Math.abs(momentum.streak)}개` : ""}` +
    `${momentum.divergence ? ` · ⚡ ${momentum.divergence}` : ""}`;

  return [
    "",
    "[캔들 흐름 — 최근 마감봉]",
    barLines || "  (마감봉 부족)",
    `[당일 컨텍스트] ${dayLine}`,
    `[VWAP] ${vwapLine}`,
    `[오프닝 레인지 ~09:30] ${orLine}`,
    `[스윙 구조] ${swingLine}`,
    `[피보나치 되돌림] ${fibLine}`,
    `[모멘텀] ${momentumLine}`,
    `[단기 박스] ${boxLine}`,
  ].join("\n");
}
