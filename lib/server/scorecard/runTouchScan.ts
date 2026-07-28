/**
 * phase-2 터치 스캔 실행 진입점 — 판정이 내건 목표·무효화 라인이 실제로 닿았는지 매일 기록한다.
 *
 * 채점 cron(`relativeRunScoring`)과 같은 디스패처에서 이어 돌린다. 방향 채점(phase-1)이 horizon
 * 종가만 보는 것과 달리, 이쪽은 **판정 자신의 약속**이 지켜졌는지를 본다.
 *
 * fail-soft 원칙(phase-1 과 동일):
 *  - ticker 단위 격리 — 한 종목 일봉 조회 실패가 다른 종목 스캔을 막지 않는다.
 *  - 실패 시 커서를 전진시키지 않는다 → 다음 실행에서 그 구간을 다시 훑는다(누락 대신 재시도).
 *  - Supabase/KIS 미설정이면 그냥 0건 반환(호출부가 게이트를 담당).
 */

import { fetchDailyChunked } from "@/lib/api/kis/chartChunked";
import { fetchWithTransientRetryOrThrow } from "@/lib/server/bffUtils";
import { getTouchScanRows, updateTouchScan } from "@/lib/server/scorecard/scorecardStore";
import {
  isScanComplete,
  levelsOnlyUpdate,
  scanEndDate,
  scanStartDate,
  scanTouches,
  TOUCH_SCAN_WINDOW_DAYS,
} from "@/lib/server/scorecard/touchScoring";
import { SCORE_RETRY_BACKOFF_MS, SCORE_TICKER_DELAY_MS } from "@/lib/server/scorecard/constants";

/** 한 번에 처리할 행 수 — 종목당 일봉 1회라 채점 배치와 비슷한 규모로 둔다. */
const TOUCH_BATCH_LIMIT = 40;

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface TouchScanResult {
  candidates: number;
  /** 커서가 전진한 행 수. */
  scanned: number;
  /** 이번에 목표/재진입 터치가 새로 기록된 행 수. */
  targetHits: number;
  /** 이번에 무효화/손절 터치가 새로 기록된 행 수. */
  stopHits: number;
  /** 창이 끝나 더 볼 필요가 없던 행 수. */
  completed: number;
  errors: number;
}

function ymd(dash: string): string {
  return dash.replace(/-/g, "");
}

/** 터치 스캔 1회 실행. throw 하지 않는다(내부 격리). */
export async function runTouchScan(now: Date = new Date()): Promise<TouchScanResult> {
  const result: TouchScanResult = {
    candidates: 0,
    scanned: 0,
    targetHits: 0,
    stopHits: 0,
    completed: 0,
    errors: 0,
  };

  const todayDash = new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
  // 창을 넘긴 오래된 원장은 애초에 읽지 않는다(매 실행 전수 조회 방지).
  const entrySince = new Date(now.getTime() - (TOUCH_SCAN_WINDOW_DAYS + 5) * DAY_MS)
    .toISOString()
    .slice(0, 10);

  const rows = await getTouchScanRows(TOUCH_BATCH_LIMIT, entrySince);
  result.candidates = rows.length;
  if (rows.length === 0) return result;

  for (const row of rows) {
    if (isScanComplete(row, todayDash)) {
      result.completed += 1;
      continue;
    }

    const from = scanStartDate(row);
    const to = scanEndDate(row, todayDash);
    if (from > to) {
      // 아직 훑을 새 봉이 없다(당일 진입 등). 커서는 그대로 두되, 레벨은 일봉 없이 산출 가능하므로
      // 지금 채워 둔다 — 진입 직후부터 target_price/stop_price 가 존재하게 한다.
      const levels = levelsOnlyUpdate(row);
      if (levels) {
        const wrote = await updateTouchScan(row.id, levels);
        if (!wrote.ok) result.errors += 1;
      }
      continue;
    }

    try {
      const candles = await fetchWithTransientRetryOrThrow(
        () => fetchDailyChunked(row.ticker, ymd(from), ymd(to)),
        SCORE_RETRY_BACKOFF_MS,
      );
      const update = scanTouches(row, candles, todayDash);
      if (!update) {
        result.completed += 1;
        continue;
      }

      const wrote = await updateTouchScan(row.id, update);
      if (!wrote.ok) {
        result.errors += 1;
      } else {
        result.scanned += 1;
        if (update.targetHitDate) result.targetHits += 1;
        if (update.stopHitDate) result.stopHits += 1;
      }
    } catch {
      // 일봉 조회 실패 — 커서를 전진시키지 않아 다음 실행이 같은 구간을 다시 훑는다.
      result.errors += 1;
    }

    await new Promise((r) => setTimeout(r, SCORE_TICKER_DELAY_MS));
  }

  return result;
}
