/**
 * 시장/베타 보정 채점 cron 핵심 로직(v2) — pending·미보정 horizon 을 찾아 종목·지수 일봉으로
 * 절대/초과/베타보정 수익률을 측정하고 주 지표(기본 excess)로 hit/miss/flat 을 확정한다.
 *
 * PRD `scorecard-relative-scoring`. phase-1 `scoreDecisions.ts` 의 비파괴 확장판.
 * 외부 의존(종목 일봉·지수 일봉·벤치마크 해석·행 조회·갱신·now)은 모두 **주입 가능**하게 두어
 * fixture 단위 테스트로 측정·결정론·fail-soft·backfill 멱등을 검증한다.
 *
 * 핵심 흐름:
 *   1. pending **또는 미보정(상대 측정값 비어있는 채점완료)** horizon 이 있는 행 배치 조회.
 *   2. 행마다 종목 일봉 1회 + 벤치마크 지수 일봉 1회 조회(entry 직전 베타 윈도우 ~ 가장 먼 horizon).
 *   3. due horizon 별: entry/horizon 종가(종목·지수) → abs/bench/excess, 베타·alpha, regime 측정.
 *   4. 주 지표(mode)로 hit/miss/flat 산출. 주 지표 측정 불가(지수 부재)면 pending 유지(보류).
 *   5. 이미 status 가 확정된 horizon 도 상대 측정값이 비어 있으면 **재계산해 채움(backfill·멱등)** —
 *      status 도 주 지표 기준으로 갱신(절대→상대 일관). 같은 입력엔 같은 결과.
 *   6. 한 ticker 실패가 다른 ticker 채점을 막지 않는다(fail-soft).
 *
 * fail-soft 최우선: 지수 조회 실패는 throw(폴백 없음) → ticker 단위 catch 가 그 행을 건드리지 않고
 * pending/현상 유지. 절대 잘못된 0/skip 으로 채점 오염 금지.
 */

import type { StockDailyCandle, IndexDailyClose } from "@/lib/api/kis/types";
import type {
  HorizonScoreUpdate,
  HorizonStatus,
  ScorecardHorizon,
  ScorecardRow,
  ScoringMetricMode,
} from "@/lib/types/scorecard/scorecard";
import {
  HIT_THRESHOLD_PCT,
  HORIZONS,
  HORIZON_BUSINESS_DAYS,
  HORIZON_CLOSE_LOOKAHEAD_BARS,
  REGIME_THRESHOLD_PCT,
  SCORE_BATCH_LIMIT,
  SCORE_TICKER_DELAY_MS,
  SCORING_METRIC_MODE,
  BETA_WINDOW_BUSINESS_DAYS,
  BETA_MIN_PAIRS,
} from "@/lib/server/scorecard/constants";
import { computeReturnPct } from "@/lib/server/scorecard/scoring";
import { dailyReturns, estimateBeta, measureRelative } from "@/lib/server/scorecard/relativeScoring";
import { findHorizonClose } from "@/lib/server/scorecard/scoreDecisions";
import { businessDaysBetween } from "@/lib/utils/businessDays";

/** v2 채점 cron 의 외부 의존 — 라우트는 실제 구현, 테스트는 fixture 주입. */
export interface RelativeScoreDeps {
  /** pending 또는 미보정(상대값 비어있는 채점완료) horizon 행 배치 조회. */
  getRows: (limit: number) => Promise<ScorecardRow[]>;
  /** 종목 일봉 조회(YYYYMMDD~YYYYMMDD, 오름차순). */
  fetchStockDaily: (ticker: string, fromYmd: string, toYmd: string) => Promise<StockDailyCandle[]>;
  /** 벤치마크 지수 일봉 조회(YYYYMMDD~YYYYMMDD, 오름차순). */
  fetchIndexDaily: (code: string, fromYmd: string, toYmd: string) => Promise<IndexDailyClose[]>;
  /** 종목 → 벤치마크 지수 코드("0001"/"1001"). 미해석이면 폴백 코드 반환(호출부 보장). */
  resolveBench: (ticker: string) => string;
  /** 한 horizon 평가 결과 갱신. */
  updateHorizon: (
    id: string,
    horizon: ScorecardHorizon,
    update: HorizonScoreUpdate,
  ) => Promise<{ ok: boolean }>;
  now?: () => Date;
  delay?: (ms: number) => Promise<void>;
}

export interface RelativeScoreResult {
  candidates: number;
  /** status 가 (재)확정된 horizon 수(신규 + backfill 갱신). */
  scored: number;
  hit: number;
  miss: number;
  flat: number;
  skipped: number;
  /** backfill(이미 채점됐으나 상대값을 채운) horizon 수(scored 의 부분집합). */
  backfilled: number;
  pendingKept: number;
  errors: number;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function parseDate(ymdDash: string): Date {
  return new Date(`${ymdDash}T00:00:00`);
}

function statusOf(row: ScorecardRow, h: ScorecardHorizon): HorizonStatus {
  return h === "d1"
    ? row.d1Status
    : h === "w1"
      ? row.w1Status
      : h === "w2"
        ? row.w2Status
        : row.m1Status;
}

/** 해당 horizon 의 벤치 수익률이 이미 행에 기록돼 있는지(backfill 필요 판별). */
function benchReturnOf(row: ScorecardRow, h: ScorecardHorizon): number | null {
  return h === "d1"
    ? row.d1BenchReturnPct
    : h === "w1"
      ? row.w1BenchReturnPct
      : h === "w2"
        ? row.w2BenchReturnPct
        : row.m1BenchReturnPct;
}

/**
 * 한 horizon 이 이번 패스에서 처리 대상인지 — (a) pending 이고 평가 도래, 또는
 * (b) 이미 확정(hit/miss/flat)됐지만 상대 측정값(bench)이 비어 있어 backfill 필요.
 * skipped 는 backfill 대상 아님(봉 부재로 영구 확정).
 */
function needsProcessing(
  row: ScorecardRow,
  h: ScorecardHorizon,
  elapsedBd: number,
): { process: boolean; backfill: boolean } {
  const status = statusOf(row, h);
  if (status === "pending") {
    return { process: elapsedBd >= HORIZON_BUSINESS_DAYS[h], backfill: false };
  }
  if (status === "hit" || status === "miss" || status === "flat") {
    // 채점됐는데 상대값이 비어있으면 backfill.
    return { process: benchReturnOf(row, h) === null, backfill: true };
  }
  return { process: false, backfill: false }; // skipped 등.
}

/** entry 로부터 n 영업일 뒤 날짜(주말 제외). 공휴일은 LOOKAHEAD 보정이 흡수. */
function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
}

function toDash(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 지수 종가 → `findHorizonClose` 호환을 위해 StockDailyCandle 형태로 어댑트(종가만 의미).
 * findHorizonClose 는 `date`/`close` 만 보므로 나머지 필드는 종가로 채운다.
 */
function indexToCandles(idx: IndexDailyClose[]): StockDailyCandle[] {
  return idx.map((c) => ({
    date: c.date,
    open: c.close,
    high: c.close,
    low: c.close,
    close: c.close,
    volume: 0,
  }));
}

/** entry **직전**(entry 날짜 미포함) 윈도우의 종가 배열을 시간순으로. 베타 회귀 표본. */
function priorCloses(
  candlesAsc: { date: string; close: number }[],
  entryDateDash: string,
  windowBd: number,
): number[] {
  // entry 이전 봉만(오름차순) → 마지막 windowBd+1 개(수익률 windowBd 개 확보).
  const prior = candlesAsc.filter((c) => c.date < entryDateDash);
  const take = windowBd + 1;
  return prior.slice(Math.max(0, prior.length - take)).map((c) => c.close);
}

/**
 * v2 채점 1회 실행.
 *
 * @param deps 외부 의존(주입).
 * @param opts batchLimit / threshold / regimeThreshold / mode / betaWindow / betaMinPairs(테스트 조정).
 */
export async function relativeScoreDecisions(
  deps: RelativeScoreDeps,
  opts: {
    batchLimit?: number;
    threshold?: number;
    regimeThreshold?: number;
    mode?: ScoringMetricMode;
    betaWindowBd?: number;
    betaMinPairs?: number;
  } = {},
): Promise<RelativeScoreResult> {
  const batchLimit = opts.batchLimit ?? SCORE_BATCH_LIMIT;
  const threshold = opts.threshold ?? HIT_THRESHOLD_PCT;
  const regimeThreshold = opts.regimeThreshold ?? REGIME_THRESHOLD_PCT;
  const mode = opts.mode ?? SCORING_METRIC_MODE;
  const betaWindowBd = opts.betaWindowBd ?? BETA_WINDOW_BUSINESS_DAYS;
  const betaMinPairs = opts.betaMinPairs ?? BETA_MIN_PAIRS;

  const now = deps.now ?? (() => new Date());
  const delay = deps.delay ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  const result: RelativeScoreResult = {
    candidates: 0,
    scored: 0,
    hit: 0,
    miss: 0,
    flat: 0,
    skipped: 0,
    backfilled: 0,
    pendingKept: 0,
    errors: 0,
  };

  const rows = await deps.getRows(batchLimit);
  result.candidates = rows.length;
  if (rows.length === 0) return result;

  const todayKst = new Date(now().getTime() + KST_OFFSET_MS);
  const today = new Date(
    Date.UTC(todayKst.getUTCFullYear(), todayKst.getUTCMonth(), todayKst.getUTCDate()),
  );

  for (const row of rows) {
    const entry = parseDate(row.entryDate);
    const elapsed = businessDaysBetween(entry, today);

    // 처리 대상 horizon 수집(pending 도래 + backfill).
    const tasks: Array<{ h: ScorecardHorizon; backfill: boolean }> = [];
    for (const h of HORIZONS) {
      const { process, backfill } = needsProcessing(row, h, elapsed);
      if (process) tasks.push({ h, backfill });
      else if (statusOf(row, h) === "pending") result.pendingKept += 1;
    }
    if (tasks.length === 0) continue;

    // 조회 범위: entry 직전 베타 윈도우 ~ 가장 먼 horizon + LOOKAHEAD 여유.
    const maxBd = Math.max(...tasks.map((t) => HORIZON_BUSINESS_DAYS[t.h]));
    const futureCalDays = Math.ceil((maxBd + HORIZON_CLOSE_LOOKAHEAD_BARS) * 1.6) + 7;
    const pastCalDays = Math.ceil((betaWindowBd + 5) * 1.6) + 7;
    const fromYmd = ymd(new Date(entry.getTime() - pastCalDays * DAY_MS));
    const toYmd = ymd(new Date(entry.getTime() + futureCalDays * DAY_MS));

    const benchKey = deps.resolveBench(row.ticker);

    let stockCandles: StockDailyCandle[];
    let indexCloses: IndexDailyClose[];
    try {
      // 둘 다 throw 전파(폴백 없음) — 하나라도 실패면 이 ticker 보류, 다음 실행 재시도.
      stockCandles = await deps.fetchStockDaily(row.ticker, fromYmd, toYmd);
      indexCloses = await deps.fetchIndexDaily(benchKey, fromYmd, toYmd);
    } catch {
      result.errors += 1;
      await delay(SCORE_TICKER_DELAY_MS);
      continue;
    }

    const stockAsc = [...stockCandles].sort((a, b) => a.date.localeCompare(b.date));
    const indexAsc = [...indexCloses].sort((a, b) => a.date.localeCompare(b.date));
    const indexCandles = indexToCandles(indexAsc);

    // 베타 추정(행 1회) — entry 직전 윈도우의 종목·지수 일간수익률 회귀. 표본 부족·정렬 불일치 방어.
    const stockPrior = priorCloses(stockAsc, row.entryDate, betaWindowBd);
    const indexPrior = priorCloses(indexAsc, row.entryDate, betaWindowBd);
    const pairLen = Math.min(stockPrior.length, indexPrior.length);
    const beta =
      pairLen >= betaMinPairs + 1
        ? estimateBeta(
            dailyReturns(stockPrior.slice(stockPrior.length - pairLen)),
            dailyReturns(indexPrior.slice(indexPrior.length - pairLen)),
            betaMinPairs,
          )
        : null;

    // entry 지수 종가 — entry 날짜 당일 또는 직후 첫 봉(휴장 흡수). 종목 entry_close 는 row 보존값 사용.
    const entryIndexClose = findHorizonClose(indexCandles, row.entryDate, today);

    for (const { h, backfill } of tasks) {
      const evalDate = addBusinessDays(entry, HORIZON_BUSINESS_DAYS[h]);
      const evalYmdDash = toDash(evalDate);

      // 종목 horizon 종가.
      const stockClose = findHorizonClose(stockCandles, evalYmdDash, today);
      if (stockClose === null) {
        // 봉 미도래 — pending 유지(신규만 카운트; backfill 은 현상 유지).
        if (!backfill) result.pendingKept += 1;
        continue;
      }

      if (stockClose === "skip") {
        // 봉 부재(상폐) — skipped 확정(상대 측정 불가).
        const upd = await deps.updateHorizon(row.id, h, {
          status: "skipped",
          close: null,
          returnPct: null,
          scoredAt: now().toISOString(),
          benchReturnPct: null,
          excessReturnPct: null,
          beta,
          alphaResidualPct: null,
          regime: null,
          benchKey,
        });
        if (upd.ok) result.skipped += 1;
        else result.errors += 1;
        continue;
      }

      const absReturnPct = computeReturnPct(row.entryClose, stockClose);
      if (absReturnPct === null) {
        const upd = await deps.updateHorizon(row.id, h, {
          status: "skipped",
          close: stockClose,
          returnPct: null,
          scoredAt: now().toISOString(),
          benchReturnPct: null,
          excessReturnPct: null,
          beta,
          alphaResidualPct: null,
          regime: null,
          benchKey,
        });
        if (upd.ok) result.skipped += 1;
        else result.errors += 1;
        continue;
      }

      // 벤치마크 horizon 종가 — entry/horizon 지수 종가로 bench 수익률 산출.
      const idxClose = findHorizonClose(indexCandles, evalYmdDash, today);
      const benchReturnPct =
        typeof entryIndexClose === "number" && typeof idxClose === "number"
          ? computeReturnPct(entryIndexClose, idxClose)
          : null;
      // 지수 종가가 "skip"(상폐 불가) 거나 entry 지수 부재면 bench=null → 주 지표 측정 불가.

      const m = measureRelative({
        verdict: row.verdict,
        absReturnPct,
        benchReturnPct,
        beta,
        mode,
        threshold,
        regimeThreshold,
      });

      if (m.status === null) {
        // 주 지표(기본 excess) 측정 불가(지수 부재) → 보류. pending 은 유지(다음 실행 재시도),
        // backfill(이미 확정) 행은 손대지 않음(abs status·기존 값 보존 — 오확정 방지).
        if (!backfill) {
          // pending 인데 종목 종가는 나왔으나 지수가 아직이면 다음 실행 재시도.
          result.pendingKept += 1;
        }
        continue;
      }

      const upd = await deps.updateHorizon(row.id, h, {
        status: m.status,
        close: stockClose,
        returnPct: absReturnPct,
        scoredAt: now().toISOString(),
        benchReturnPct: m.benchReturnPct,
        excessReturnPct: m.excessReturnPct,
        beta: m.beta,
        alphaResidualPct: m.alphaResidualPct,
        regime: m.regime,
        benchKey,
      });
      if (upd.ok) {
        result.scored += 1;
        result[m.status] += 1;
        if (backfill) result.backfilled += 1;
      } else {
        result.errors += 1;
      }
    }

    await delay(SCORE_TICKER_DELAY_MS);
  }

  return result;
}
