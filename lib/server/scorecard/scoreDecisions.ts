/**
 * 채점 cron 핵심 로직 — pending horizon 을 찾아 KIS 일봉으로 적중/미적중을 확정한다.
 *
 * PRD `signal-scorecard` §3-2. HTTP 라우트(`/api/cron/score-decisions`)와 디스패처가 이 모듈을
 * 호출한다. 외부 의존(일봉 조회·행 조회·갱신·현재시각)은 모두 **주입 가능**하게 두어 fixture
 * 단위 테스트로 적중 판정·결정론·fail-soft 를 검증한다(AC-4/5/6).
 *
 * 핵심 흐름:
 *   1. pending horizon 이 있는 행을 배치 조회.
 *   2. 각 행의 pending horizon 중 경과 영업일이 임계(1/5/21) 이상이면 평가 대상(도래).
 *   3. 대상 ticker 의 일봉을 조회 → 평가일(또는 그 직후 가장 가까운 영업봉) 종가 취득.
 *   4. scoreOutcome 으로 hit/miss/flat 판정 → horizon 갱신. 봉 부재면 skipped.
 *   5. 한 ticker 실패가 다른 ticker 채점을 막지 않는다(fail-soft, cron 200).
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
import type {
  HorizonScoreUpdate,
  HorizonStatus,
  ScorecardHorizon,
  ScorecardRow,
} from "@/lib/types/scorecard/scorecard";
import {
  HIT_THRESHOLD_PCT,
  HORIZONS,
  HORIZON_BUSINESS_DAYS,
  HORIZON_CLOSE_LOOKAHEAD_BARS,
  SCORE_BATCH_LIMIT,
  SCORE_RETRY_BACKOFF_MS,
  SCORE_TICKER_DELAY_MS,
} from "@/lib/server/scorecard/constants";
import { computeReturnPct, scoreOutcome } from "@/lib/server/scorecard/scoring";
import { businessDaysBetween } from "@/lib/utils/businessDays";

/** 채점 cron 의 외부 의존 — 라우트는 실제 구현, 테스트는 fixture 를 주입. */
export interface ScoreDecisionsDeps {
  /** pending horizon 행 배치 조회. */
  getPendingRows: (limit: number) => Promise<ScorecardRow[]>;
  /** ticker 의 일봉 조회(YYYYMMDD ~ YYYYMMDD, 오름차순). */
  fetchDaily: (ticker: string, fromYmd: string, toYmd: string) => Promise<StockDailyCandle[]>;
  /** 한 horizon 평가 결과 갱신. */
  updateHorizon: (
    id: string,
    horizon: ScorecardHorizon,
    update: HorizonScoreUpdate,
  ) => Promise<{ ok: boolean }>;
  /** 현재 시각(테스트 고정용). 기본 new Date(). */
  now?: () => Date;
  /** ticker 간 지연(테스트는 0). */
  delay?: (ms: number) => Promise<void>;
}

export interface ScoreDecisionsResult {
  /** 조회된 pending 후보 행 수. */
  candidates: number;
  /** status 가 확정(hit/miss/flat)된 horizon 수. */
  scored: number;
  /** hit / miss / flat / skipped 세부 카운트. */
  hit: number;
  miss: number;
  flat: number;
  skipped: number;
  /** 아직 도래하지 않아 건드리지 않은 horizon 수. */
  pendingKept: number;
  /** ticker 단위 실패(다음 실행 재시도) 수. */
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

/** "YYYY-MM-DD" 봉 날짜 문자열을 로컬 자정 Date 로. */
function parseDate(ymdDash: string): Date {
  return new Date(`${ymdDash}T00:00:00`);
}

/** 행의 한 horizon 현재 status 읽기. */
function statusOf(row: ScorecardRow, h: ScorecardHorizon): HorizonStatus {
  return h === "d1"
    ? row.d1Status
    : h === "w1"
      ? row.w1Status
      : h === "w2"
        ? row.w2Status
        : row.m1Status;
}

/**
 * 평가일 = entry_date 로부터 임계 영업일 경과 시점. 그 날(또는 직후 가장 가까운 영업봉)의 종가를
 * 캔들에서 찾는다.
 *
 * 반환:
 *   - number  — 평가 종가
 *   - null    — 도래 봉이 캔들에 아직 없음(데이터 갱신 전 — 다음 실행 재시도, pending 유지)
 *   - "skip"  — 평가일 주변 봉이 없는데 데이터도 최신임(상폐·장기 휴장 — skipped)
 *
 * @param today 현재(KST) 자정 Date. 평가일 이후 봉이 없을 때 "미갱신(pending)" vs "상폐(skip)"를
 *              가른다 — 마지막 봉이 today 로부터 LOOKAHEAD 영업일 이상 뒤처져 있으면 상폐로 본다.
 */
export function findHorizonClose(
  candles: StockDailyCandle[],
  evalDateYmdDash: string,
  today: Date,
): number | null | "skip" {
  const target = evalDateYmdDash;
  const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));
  // 평가일 당일 또는 그 이후 첫 봉.
  const onOrAfter = sorted.filter((c) => c.date >= target);

  if (onOrAfter.length === 0) {
    // 평가일 이후 봉이 없음 → 데이터 미갱신(pending) vs 상폐(skip) 구분.
    // 마지막 봉이 today 로부터 LOOKAHEAD 영업일 이상 과거면 데이터가 최신임에도 봉이 없는 것 →
    // 상폐/장기 거래정지로 보고 skip. 그렇지 않으면 곧 채워질 데이터라 pending 유지.
    const last = sorted[sorted.length - 1];
    if (!last) {
      // 캔들이 아예 없음 — 상폐(데이터 0). 단 막 도래한 직후라면 미갱신일 수 있으나
      // 빈 응답은 KIS 측 부재로 보고 skip(빈 캔들 = 채점 불가).
      return "skip";
    }
    const staleBd = businessDaysBetween(parseDate(last.date), today);
    return staleBd > HORIZON_CLOSE_LOOKAHEAD_BARS ? "skip" : null;
  }

  // 평가일 직후 가장 가까운 영업봉. 단 평가일과 너무 벌어지면(연속 휴장 초과) skip.
  const first = onOrAfter[0];
  const gap = businessDaysBetween(parseDate(target), parseDate(first.date));
  if (gap > HORIZON_CLOSE_LOOKAHEAD_BARS) return "skip";
  return first.close;
}

/**
 * 채점 1회 실행.
 *
 * @param deps 외부 의존(주입). 라우트는 실제 store/KIS, 테스트는 fixture.
 * @param batchLimit 처리 행 상한(기본 SCORE_BATCH_LIMIT).
 * @param threshold 적중 임계 T(기본 HIT_THRESHOLD_PCT).
 */
export async function scoreDecisions(
  deps: ScoreDecisionsDeps,
  batchLimit: number = SCORE_BATCH_LIMIT,
  threshold: number = HIT_THRESHOLD_PCT,
): Promise<ScoreDecisionsResult> {
  const now = deps.now ?? (() => new Date());
  const delay = deps.delay ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  const result: ScoreDecisionsResult = {
    candidates: 0,
    scored: 0,
    hit: 0,
    miss: 0,
    flat: 0,
    skipped: 0,
    pendingKept: 0,
    errors: 0,
  };

  const rows = await deps.getPendingRows(batchLimit);
  result.candidates = rows.length;
  if (rows.length === 0) return result;

  // KST 기준 "오늘" — 경과 영업일 계산 기준.
  const todayKst = new Date(now().getTime() + KST_OFFSET_MS);
  const today = new Date(
    Date.UTC(todayKst.getUTCFullYear(), todayKst.getUTCMonth(), todayKst.getUTCDate()),
  );

  for (const row of rows) {
    // 이 행에서 "도래했지만 아직 pending" 인 horizon 수집.
    const entry = parseDate(row.entryDate);
    const elapsed = businessDaysBetween(entry, today);

    const due: ScorecardHorizon[] = [];
    for (const h of HORIZONS) {
      if (statusOf(row, h) !== "pending") continue;
      if (elapsed >= HORIZON_BUSINESS_DAYS[h]) due.push(h);
      else result.pendingKept += 1;
    }
    if (due.length === 0) continue;

    // 평가일 범위를 한 번에 커버하는 일봉을 조회(entry 직후 ~ 가장 먼 horizon + 여유).
    const maxBd = Math.max(...due.map((h) => HORIZON_BUSINESS_DAYS[h]));
    // 영업일 → 달력일 근사: 영업일 × 1.5 + 여유(주말·휴장 흡수), LOOKAHEAD 도 더해 미래 봉 확보.
    const spanCalDays = Math.ceil((maxBd + HORIZON_CLOSE_LOOKAHEAD_BARS) * 1.6) + 7;
    const fromYmd = ymd(entry);
    const toYmd = ymd(new Date(entry.getTime() + spanCalDays * DAY_MS));

    let candles: StockDailyCandle[];
    try {
      candles = await deps.fetchDaily(row.ticker, fromYmd, toYmd);
    } catch {
      // 이 ticker 만 skip(다음 실행 재시도) — 다른 ticker 채점은 계속.
      result.errors += 1;
      await delay(SCORE_TICKER_DELAY_MS);
      continue;
    }

    for (const h of due) {
      // 평가일 = entry 로부터 임계 영업일 후의 달력일(영업일 도달일을 근사 — findHorizonClose 가
      // 평가일 직후 첫 영업봉으로 보정). 임계 영업일을 달력일로 환산해 target 날짜를 만든다.
      const evalDate = addBusinessDays(entry, HORIZON_BUSINESS_DAYS[h]);
      const evalYmdDash = toDash(evalDate);
      const close = findHorizonClose(candles, evalYmdDash, today);

      if (close === null) {
        // 봉 미도래(데이터 갱신 전) — pending 유지, 다음 실행 재시도.
        result.pendingKept += 1;
        continue;
      }

      if (close === "skip") {
        const upd = await deps.updateHorizon(row.id, h, {
          status: "skipped",
          close: null,
          returnPct: null,
          scoredAt: now().toISOString(),
        });
        if (upd.ok) result.skipped += 1;
        else result.errors += 1;
        continue;
      }

      const r = computeReturnPct(row.entryClose, close);
      if (r === null) {
        // entry_close 비정상 → skipped(채점 불가).
        const upd = await deps.updateHorizon(row.id, h, {
          status: "skipped",
          close,
          returnPct: null,
          scoredAt: now().toISOString(),
        });
        if (upd.ok) result.skipped += 1;
        else result.errors += 1;
        continue;
      }

      const outcome = scoreOutcome(row.verdict, r, threshold);
      const upd = await deps.updateHorizon(row.id, h, {
        status: outcome,
        close,
        returnPct: r,
        scoredAt: now().toISOString(),
      });
      if (upd.ok) {
        result.scored += 1;
        result[outcome] += 1;
      } else {
        result.errors += 1;
      }
    }

    await delay(SCORE_TICKER_DELAY_MS);
  }

  return result;
}

/** entry 로부터 n 영업일 뒤의 날짜(주말 제외). 공휴일은 호출부 LOOKAHEAD 보정이 흡수. */
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

/** Date → "YYYY-MM-DD" 로컬. */
function toDash(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export { SCORE_RETRY_BACKOFF_MS };
