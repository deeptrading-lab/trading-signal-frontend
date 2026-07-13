/**
 * 오토파일럿 결정론 스크리너 — "지금 단타하기 좋은 종목" 랭킹. intraday-autopilot.
 *
 * 2단 구조(호출 비용 절약 + 근거 분리):
 *   1차 — KIS 랭킹 4콜(거래대금·등락률·외국인/기관 수급) union → 하드필터(경보·가격·유동성·등락률)
 *          → 랭킹 필드만으로 점수(모멘텀·유동성·수급, percentile 정규화).
 *   2차 — 1차 상위 shortlist 만 당일 5분봉을 걷어 변동성 품질 점수(ATR%·거래량 z·VWAP 위치·구조).
 *
 * 종목 선정은 **전부 결정론**(PR-4 conviction 역상관 교훈 — LLM 은 기존 judge 역할만).
 * LLM 재랭킹은 `AutopilotScreenerDeps.rerank` 훅만 남겨둔다(이번 스코프 미구현).
 *
 * KIS 랭킹 TR 은 실전(prod) 전용 — 미충족 시 `unavailable` 로 반환하고 **mock 폴백은 쓰지 않는다**
 * (가짜 후보로 실제 세션을 만들면 안 된다). 호출은 전부 순차 + 150ms delay(EGW00201 관례 방어).
 */

import { fetchFluctuation } from "@/lib/api/kis/fluctuation";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis/client";
import { fetchForeignInstitutionTotal } from "@/lib/api/kis/investor-flow";
import { fetchTodayMinuteCandles } from "@/lib/api/kis/minuteChartChunked";
import { fetchVolumeRank } from "@/lib/api/kis/volume-rank";
import { fetchActiveWarningsBatch } from "@/lib/api/toss/warnings";
import { delay, fetchWithTransientRetry } from "@/lib/server/bffUtils";
import { createLogger } from "@/lib/server/logTag";
import { isRegularStock } from "@/lib/server/rankingFilter";
import { volumeZAt } from "@/lib/signal/intradayAxes";
import { extractIntradayFeatures } from "@/lib/signal/intradayFeatures";
import {
  AUTOPILOT_ATR_PCT_BEST,
  AUTOPILOT_ATR_PCT_MAX,
  AUTOPILOT_ATR_PCT_MIN,
  AUTOPILOT_HARD_EXCLUDE_WARNINGS,
  AUTOPILOT_MAX_CHANGE_PCT,
  AUTOPILOT_MAX_PRICE_KRW,
  AUTOPILOT_MIN_CHANGE_PCT,
  AUTOPILOT_MIN_PRICE_KRW,
  AUTOPILOT_MIN_TRADING_VALUE_KRW,
  AUTOPILOT_SHORTLIST_SIZE,
} from "@/lib/server/paperTrading/autopilot/constants";
import type { StockMinuteCandle } from "@/lib/api/kis/types";
import type { StockWarningItem } from "@/lib/types/stock/warnings";
import type {
  AutopilotCandidate,
  AutopilotCandidateSource,
} from "@/lib/types/paperTrading/autopilot";

const log = createLogger("autopilot-screen");

/** 랭킹 소스 간 순차 호출 간격 — flow/top10 라우트의 SUBJECT_DELAY_MS 관례. */
const SOURCE_DELAY_MS = 150;
const RETRY_BACKOFF_MS = 250;
/** shortlist 분봉 timeframe(5분) — 2차 점수 지표(ATR·z·VWAP)의 기준 봉. */
const STAGE2_TIMEFRAME = 5;
/** shortlist 분봉 수집 상한(5분봉 120개 ≈ 당일 전체) — 당일 지표만 필요해 warmup 없음. */
const STAGE2_MAX_BARS = 120;
/** ATR 계산 봉 수(마감봉 기준 12개 = 1시간). */
const ATR_BARS = 12;

// ─── 결과 타입 ────────────────────────────────────────────────────────────────

export type AutopilotScreenerResult =
  | { status: "unavailable"; reason: string }
  | {
      status: "ok";
      /** 하드필터 통과 전 종목(1차 점수 내림차순) — 교체 판정의 순위 기준. */
      stage1Ranking: AutopilotCandidate[];
      /** 2차 점수까지 산출된 fill 후보(최종 점수 내림차순). */
      fillRanking: AutopilotCandidate[];
      /** 랭킹 union 크기(하드필터 전). */
      universeSize: number;
      /** 하드필터 탈락 후보(rejectedBy 포함, 관측용). */
      rejected: AutopilotCandidate[];
    };

/** IO 의존성 주입 슬롯 — 단위테스트·후속 LLM 재랭킹 훅. */
export type AutopilotScreenerDeps = {
  fetchVolumeRank?: typeof fetchVolumeRank;
  fetchFluctuation?: typeof fetchFluctuation;
  fetchForeignInstitutionTotal?: typeof fetchForeignInstitutionTotal;
  fetchWarningsBatch?: typeof fetchActiveWarningsBatch;
  fetchMinuteCandles?: typeof fetchTodayMinuteCandles;
  /** (후속 훅, 미구현) shortlist LLM 재랭킹 — 결정론 랭킹 위에 선택 적용. */
  rerank?: (top: AutopilotCandidate[]) => Promise<AutopilotCandidate[]>;
  /** KIS 게이트 오버라이드(테스트) — 기본 isKisConfigured() && prod. */
  kisReady?: boolean;
};

// ─── 순수 헬퍼(단위테스트 대상) ───────────────────────────────────────────────

function clip(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 정렬된 값 배열에서 v 의 percentile rank(0~1). 빈 배열이면 0.5(중립). */
function percentileRank(sortedValues: number[], value: number): number {
  if (sortedValues.length === 0) return 0.5;
  let below = 0;
  for (const v of sortedValues) {
    if (v <= value) below += 1;
    else break;
  }
  return below / sortedValues.length;
}

/** 삼각 프로파일 — min 이하 0, best 에서 1, max 이상 0(사이 선형). */
export function triangularScore(value: number, min: number, best: number, max: number): number {
  if (!Number.isFinite(value) || value <= min || value >= max) return 0;
  if (value === best) return 1;
  return value < best ? (value - min) / (best - min) : (max - value) / (max - best);
}

/**
 * 하드필터 — 탈락 사유를 rejectedBy 로 남긴다(관측용).
 * 경보는 `AUTOPILOT_HARD_EXCLUDE_WARNINGS` 만 제외, 단기과열(OVERHEATED)은 overheated 마커만
 * 찍어 1차 점수에서 감점한다(단타 후보 상당수가 과열 — 제외하면 후보 고갈).
 */
export function applyHardFilters(
  candidates: AutopilotCandidate[],
  warningsByTicker: Record<string, StockWarningItem[]>,
): { passed: AutopilotCandidate[]; rejected: AutopilotCandidate[] } {
  const passed: AutopilotCandidate[] = [];
  const rejected: AutopilotCandidate[] = [];
  for (const candidate of candidates) {
    const warnings = warningsByTicker[candidate.ticker] ?? [];
    const hardWarning = warnings.find((w) =>
      AUTOPILOT_HARD_EXCLUDE_WARNINGS.includes(w.warningType),
    );
    let rejectedBy: string | undefined;
    if (hardWarning) rejectedBy = `시장경보(${hardWarning.warningType})`;
    else if (candidate.price < AUTOPILOT_MIN_PRICE_KRW) rejectedBy = "가격 하한";
    else if (candidate.price > AUTOPILOT_MAX_PRICE_KRW) rejectedBy = "가격 상한";
    else if (
      candidate.tradingValue !== undefined &&
      candidate.tradingValue < AUTOPILOT_MIN_TRADING_VALUE_KRW
    )
      rejectedBy = "거래대금 하한";
    else if (candidate.changePercent < AUTOPILOT_MIN_CHANGE_PCT) rejectedBy = "등락률 하한";
    else if (candidate.changePercent > AUTOPILOT_MAX_CHANGE_PCT) rejectedBy = "등락률 상한";

    if (rejectedBy) {
      rejected.push({ ...candidate, rejectedBy });
    } else {
      const overheated = warnings.some((w) => w.warningType === "OVERHEATED");
      passed.push(overheated ? { ...candidate, overheated } : candidate);
    }
  }
  return { passed, rejected };
}

/**
 * 1차 점수(0~1) — 랭킹 필드만 사용, 유니버스 내 percentile 정규화(KIS 단위 편차에 강건).
 *   0.45×모멘텀(등락률 0~15% clip) + 0.35×유동성(거래대금 pct, 미상 0.5 중립)
 *   + 0.20×수급(순매수 pct, flow 밖 0) + 0.05×(추가 소스 수) − 0.15×단기과열.
 */
export function scoreStage1(
  candidate: AutopilotCandidate,
  context: { tradingValuesSorted: number[]; netBuySorted: number[] },
): number {
  const momentum = clip(candidate.changePercent, 0, 15) / 15;
  const liquidity =
    candidate.tradingValue === undefined
      ? 0.5
      : percentileRank(context.tradingValuesSorted, candidate.tradingValue);
  const flow =
    candidate.netBuyAmount === undefined
      ? 0
      : percentileRank(context.netBuySorted, candidate.netBuyAmount);
  const multiSourceBonus = 0.05 * (candidate.sources.length - 1);
  const overheatedPenalty = candidate.overheated ? 0.15 : 0;
  return clip(
    0.45 * momentum + 0.35 * liquidity + 0.2 * flow + multiSourceBonus - overheatedPenalty,
    0,
    1,
  );
}

/** 2차 점수의 결정론 피처 — 당일 5분봉에서 추출. */
export type AutopilotStage2Features = {
  /** 최근 마감봉 ATR% (TR 평균/현재가×100). 봉 부족 시 null. */
  atrPct: number | null;
  /** 마지막 마감봉 log-거래량 z-score(gradedVolumeAxis 산식 공유). */
  volumeZ: number | null;
  /** 당일 VWAP 이격%(+ = 위). null = 미산출. */
  vwapGapPct: number | null;
  aboveVwap: boolean;
  orBreakout: boolean;
  vwapReclaim: boolean;
  volumeZSurge: boolean;
  /** 스윙 시퀀스가 상승 구조(HH·HL)인가. */
  swingUptrend: boolean;
  /** 당일 체결대금 합(원) — 유동성 재검증(1차에서 거래대금 미상이던 후보). */
  todayTradingValueKrw: number;
};

/** 마감봉 기준 ATR%(True Range 평균 / 마지막 종가 ×100). 봉 부족 시 null. */
export function computeAtrPct(candles: StockMinuteCandle[], bars: number = ATR_BARS): number | null {
  // 마지막 봉은 진행 중(미확정)일 수 있어 제외(intradayFeatures 꼬리 읽기 규칙 동일).
  const closed = candles.slice(0, -1);
  if (closed.length < Math.max(3, Math.min(bars, 5)) + 1) return null;
  const window = closed.slice(-bars);
  const trs: number[] = [];
  for (let i = 0; i < window.length; i++) {
    const cur = window[i];
    const prevClose = i === 0 ? closed.at(-bars - 1)?.close : window[i - 1].close;
    const tr =
      prevClose === undefined
        ? cur.high - cur.low
        : Math.max(cur.high - cur.low, Math.abs(cur.high - prevClose), Math.abs(cur.low - prevClose));
    trs.push(tr);
  }
  const lastClose = closed.at(-1)!.close;
  if (!(lastClose > 0) || trs.length === 0) return null;
  return (trs.reduce((s, v) => s + v, 0) / trs.length / lastClose) * 100;
}

/** 당일 5분봉 → 2차 피처. 봉이 너무 적으면 null(개장 직후·데이터 실패 — 다음 스윕 재도전). */
export function extractStage2Features(
  candles: StockMinuteCandle[],
): AutopilotStage2Features | null {
  if (candles.length < 6) return null;
  const features = extractIntradayFeatures(candles, STAGE2_TIMEFRAME, 60);
  const lastClosedIdx = candles.length - 2;
  const close = candles.at(-1)!.close;
  const vwap = features?.vwap ?? null;
  return {
    atrPct: computeAtrPct(candles),
    volumeZ: lastClosedIdx >= 0 ? volumeZAt(candles, lastClosedIdx) : null,
    vwapGapPct: vwap ? vwap.gapPct : null,
    aboveVwap: vwap ? close > vwap.price : false,
    orBreakout: features?.openingRange?.position === "상단 돌파",
    vwapReclaim: features?.vwapReclaim ?? false,
    volumeZSurge: features?.volumeZSurge ?? false,
    swingUptrend: features?.swing.sequence === "상승 구조",
    todayTradingValueKrw: candles.reduce((s, c) => s + c.close * c.volume, 0),
  };
}

/**
 * 2차 점수(0~1) — 변동성 품질.
 *   0.30×ATR 삼각(죽은 변동성·통제 불능 양쪽 감점) + 0.25×거래량 z(0~3 clip)
 *   + 0.25×VWAP 위치(위 & 이격 0~1.5% 최적, 3%+ 추격 위험) + 0.20×구조(상승구조·OR돌파·셋업).
 */
export function scoreStage2(features: AutopilotStage2Features): number {
  const atr =
    features.atrPct === null
      ? 0
      : triangularScore(
          features.atrPct,
          AUTOPILOT_ATR_PCT_MIN,
          AUTOPILOT_ATR_PCT_BEST,
          AUTOPILOT_ATR_PCT_MAX,
        );
  const volz = features.volumeZ === null ? 0.3 : clip(features.volumeZ, 0, 3) / 3;
  let vwapScore = 0.3; // VWAP 아래 = 약세 기본값.
  if (features.aboveVwap && features.vwapGapPct !== null) {
    const gap = features.vwapGapPct;
    if (gap <= 1.5) vwapScore = 1;
    else if (gap >= 3) vwapScore = 0.2;
    else vwapScore = 1 - ((gap - 1.5) / 1.5) * 0.8; // 1.5~3% 선형 하강.
  }
  const structure =
    0.5 * (features.swingUptrend ? 1 : 0) +
    0.25 * (features.orBreakout ? 1 : 0) +
    0.25 * (features.vwapReclaim || features.volumeZSurge ? 1 : 0);
  return clip(0.3 * atr + 0.25 * volz + 0.25 * vwapScore + 0.2 * structure, 0, 1);
}

// ─── 유니버스 조립 ────────────────────────────────────────────────────────────

type UniverseRow = {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  source: AutopilotCandidateSource;
  tradingValue?: number;
  netBuyAmount?: number;
};

/** 소스별 행 → 티커 union(필드 병합·소스 태깅). 순수 함수(테스트 대상). */
export function buildUniverse(rows: UniverseRow[]): AutopilotCandidate[] {
  const byTicker = new Map<string, AutopilotCandidate>();
  for (const row of rows) {
    if (!row.ticker) continue;
    const existing = byTicker.get(row.ticker);
    if (!existing) {
      byTicker.set(row.ticker, {
        ticker: row.ticker,
        name: row.name,
        sources: [row.source],
        price: row.price,
        changePercent: row.changePercent,
        tradingValue: row.tradingValue,
        netBuyAmount: row.netBuyAmount,
        score1: 0,
      });
      continue;
    }
    if (!existing.sources.includes(row.source)) existing.sources.push(row.source);
    if (existing.tradingValue === undefined && row.tradingValue !== undefined)
      existing.tradingValue = row.tradingValue;
    if (existing.netBuyAmount === undefined && row.netBuyAmount !== undefined)
      existing.netBuyAmount = row.netBuyAmount;
  }
  return Array.from(byTicker.values()).filter((c) => isRegularStock(c));
}

// ─── 메인 오케스트레이션 ──────────────────────────────────────────────────────

/**
 * 스크리너 실행 — KIS 4콜(순차+delay) → union → 하드필터 → 1차 점수 → shortlist 분봉 → 2차 점수.
 *
 * @param options.excludeTickers 후보에서 아예 제외할 티커(쿨다운·타 세션 진행 중 등).
 *   ⚠️ 내 슬롯 티커는 여기 넣지 말 것 — 교체 판정이 stage1Ranking 순위를 보므로 유니버스에
 *   남아 있어야 한다(fill 중복 배제는 rotation 이 담당).
 */
export async function runAutopilotScreener(
  options: {
    excludeTickers?: ReadonlySet<string>;
    deps?: AutopilotScreenerDeps;
  } = {},
): Promise<AutopilotScreenerResult> {
  const deps = options.deps ?? {};
  const kisReady = deps.kisReady ?? (isKisConfigured() && resolveKisEnv() === "prod");
  if (!kisReady) {
    return { status: "unavailable", reason: "KIS 실전(prod) 미설정 — 랭킹 조회 불가" };
  }

  const volumeRank = deps.fetchVolumeRank ?? fetchVolumeRank;
  const fluctuation = deps.fetchFluctuation ?? fetchFluctuation;
  const flowTotal = deps.fetchForeignInstitutionTotal ?? fetchForeignInstitutionTotal;
  const warningsBatch = deps.fetchWarningsBatch ?? fetchActiveWarningsBatch;
  const minuteCandles = deps.fetchMinuteCandles ?? fetchTodayMinuteCandles;

  // 랭킹 4콜 — 순차 + delay(EGW00201 방어), 소스별 transient 1회 재시도 + 빈 배열 폴백(부분 성공).
  const volumeRows = await fetchWithTransientRetry(() => volumeRank("value"), [], RETRY_BACKOFF_MS);
  await delay(SOURCE_DELAY_MS);
  const fluctuationRows = await fetchWithTransientRetry(
    () => fluctuation("up"),
    [],
    RETRY_BACKOFF_MS,
  );
  await delay(SOURCE_DELAY_MS);
  const frgnRows = await fetchWithTransientRetry(() => flowTotal("frgn"), [], RETRY_BACKOFF_MS);
  await delay(SOURCE_DELAY_MS);
  const orgnRows = await fetchWithTransientRetry(() => flowTotal("orgn"), [], RETRY_BACKOFF_MS);

  const universe = buildUniverse([
    ...volumeRows.map((r) => ({
      ticker: r.ticker,
      name: r.name,
      price: r.price,
      changePercent: r.changePercent,
      tradingValue: r.tradingValue ?? undefined,
      source: "volume" as const,
    })),
    ...fluctuationRows.map((r) => ({
      ticker: r.ticker,
      name: r.name,
      price: r.price,
      changePercent: r.changePercent,
      source: "fluctuation" as const,
    })),
    ...frgnRows.map((r) => ({
      ticker: r.ticker,
      name: r.name,
      price: r.price,
      changePercent: r.changePercent,
      netBuyAmount: r.netBuyAmount,
      source: "flow-frgn" as const,
    })),
    ...orgnRows.map((r) => ({
      ticker: r.ticker,
      name: r.name,
      price: r.price,
      changePercent: r.changePercent,
      netBuyAmount: r.netBuyAmount,
      source: "flow-orgn" as const,
    })),
  ]).filter((c) => !options.excludeTickers?.has(c.ticker));

  if (universe.length === 0) {
    return { status: "unavailable", reason: "랭킹 전 소스 실패 또는 후보 전량 제외" };
  }

  // 경보 배치(토스, never-throw) — 미설정이면 빈 맵 = 경보 필터만 생략(fail-soft).
  const warningsByTicker = await warningsBatch(universe.map((c) => c.ticker));

  const { passed, rejected } = applyHardFilters(universe, warningsByTicker);
  const tradingValuesSorted = passed
    .map((c) => c.tradingValue)
    .filter((v): v is number => v !== undefined)
    .sort((a, b) => a - b);
  const netBuySorted = passed
    .map((c) => c.netBuyAmount)
    .filter((v): v is number => v !== undefined)
    .sort((a, b) => a - b);
  const stage1Ranking = passed
    .map((c) => ({ ...c, score1: scoreStage1(c, { tradingValuesSorted, netBuySorted }) }))
    .sort((a, b) => b.score1 - a.score1);

  // 2차 — shortlist 분봉 순차 수집(실패 종목은 이번 스윕 fill 후보에서 제외, 다음 스윕 재도전).
  const shortlist = stage1Ranking.slice(0, AUTOPILOT_SHORTLIST_SIZE);
  const fillRanking: AutopilotCandidate[] = [];
  for (const candidate of shortlist) {
    try {
      const candles = await minuteCandles(candidate.ticker, STAGE2_TIMEFRAME, STAGE2_MAX_BARS);
      const features = extractStage2Features(candles);
      if (!features) continue;
      // 1차에서 거래대금 미상이던 후보의 유동성 재검증(당일 체결대금 근사).
      if (
        candidate.tradingValue === undefined &&
        features.todayTradingValueKrw < AUTOPILOT_MIN_TRADING_VALUE_KRW
      ) {
        rejected.push({ ...candidate, rejectedBy: "거래대금 하한(2차 재검증)" });
        continue;
      }
      const score2 = scoreStage2(features);
      fillRanking.push({
        ...candidate,
        score2,
        finalScore: 0.4 * candidate.score1 + 0.6 * score2,
      });
    } catch (error) {
      log.warn(`shortlist 분봉 실패 ticker=${candidate.ticker} — 이번 스윕 제외`, error);
    }
    await delay(SOURCE_DELAY_MS);
  }
  fillRanking.sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));

  return {
    status: "ok",
    stage1Ranking,
    fillRanking,
    universeSize: universe.length,
    rejected,
  };
}
