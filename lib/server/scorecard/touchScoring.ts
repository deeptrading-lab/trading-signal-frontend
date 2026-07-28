/**
 * phase-2 채점 — 판정이 스스로 내건 **목표·무효화 라인의 터치**를 일봉으로 기록하는 순수 로직.
 *
 * ## 왜 필요한가
 * phase-1 채점은 horizon(d1/w1/w2/m1) **종가 방향**만 본다. 정작 판정이 내건 검증 가능한 약속
 * (목표가·무효화 라인)은 저장만 하고 채점에 쓰지 않았다. #350 으로 약세 콜의 target(하방 재진입)과
 * stop(상방 무효화)이 **반대 방향 밴드**가 되면서 비로소 "무엇이 먼저 닿았나"가 판별력을 갖는다
 * (구 시맨틱은 둘 다 하방이라 39건 중 19건이 같은 날 동시 터치).
 *
 * 사후검증(2026-07-28)에서 무효화 라인은 3건 발동·2건이 일주일 앞선 조기경보로 작동했다. 이를 매일
 * 기록하면 /analyze 무효화 배지의 **"현재 상태만 본다"는 한계**도 풀린다 — 돌파 후 되돌아온 판정도
 * "그날 깨졌다"가 영구 기록으로 남는다.
 *
 * ## 방향 규칙 (부호가 곧 방향 — thesisBreach·차트 오버레이와 동일 기준)
 * - target_pct ≥ 0 (강세 목표, 상방) → **고가** ≥ target_price 면 터치
 * - target_pct < 0 (약세 재진입, 하방) → **저가** ≤ target_price 면 터치
 * - stop_loss_pct > 0 (약세 무효화, 상방) → **고가** ≥ stop_price 면 터치
 * - stop_loss_pct < 0 (강세 손절, 하방) → **저가** ≤ stop_price 면 터치
 *
 * ## 멱등·증분
 * `touch_scanned_through` 커서 이후 봉만 훑고, 이미 기록된 터치일은 덮어쓰지 않는다(최초 터치 보존).
 * 같은 입력에 같은 결과.
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
import { roundToKrxTick } from "@/lib/utils/krxTick";

/** 터치 스캔에 필요한 판정 1건. */
export interface TouchScanRow {
  id: string;
  ticker: string;
  entryDate: string;
  /** % 기준가 — 결정시점 라이브가(base_price 상당). 없으면 레벨 산출 불가 → 스킵. */
  livePrice: number | null;
  targetPct: number | null;
  stopLossPct: number | null;
  /** 이미 산출된 절대 레벨(있으면 재계산하지 않는다 — 삽입 시점 해석 동결). */
  targetPrice: number | null;
  stopPrice: number | null;
  targetHitDate: string | null;
  stopHitDate: string | null;
  touchScannedThrough: string | null;
}

/**
 * 한 행에 대해 기록할 변경분. 바뀐 것이 없는 필드는 넣지 않는다(부분 갱신).
 * `touchScannedThrough` 는 **훑을 봉이 있었을 때만** 전진한다 — 당일 진입처럼 새 봉이 없으면
 * 레벨만 기록하고 커서는 그대로 둬서 다음 실행이 그 구간을 다시 본다.
 */
export interface TouchScanUpdate {
  targetPrice?: number | null;
  stopPrice?: number | null;
  targetHitDate?: string | null;
  stopHitDate?: string | null;
  touchScannedThrough?: string;
}

/**
 * 절대 레벨만 채우는 갱신분 — 일봉 없이도 산출 가능하므로 진입 직후부터 값이 존재하게 한다.
 * 이미 있거나 산출 불가면 null(갱신 없음).
 */
export function levelsOnlyUpdate(row: TouchScanRow): TouchScanUpdate | null {
  const update: TouchScanUpdate = {};
  if (row.targetPrice === null) {
    const v = deriveLevel(row.livePrice, row.targetPct);
    if (v !== null) update.targetPrice = v;
  }
  if (row.stopPrice === null) {
    const v = deriveLevel(row.livePrice, row.stopLossPct);
    if (v !== null) update.stopPrice = v;
  }
  return Object.keys(update).length > 0 ? update : null;
}

/**
 * 터치를 추적할 기간(캘린더일). m1(21영업일 ≒ 30일) + 여유. 이 기간이 지나면 더 훑지 않는다
 * — 판정의 유효 구간을 넘어선 터치는 그 판정의 성패로 보기 어렵다.
 */
export const TOUCH_SCAN_WINDOW_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(dash: string): Date {
  return new Date(`${dash}T00:00:00Z`);
}

function toDash(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 절대 레벨 산출 — 기준가 × (1 + pct/100), 호가단위 반올림(UI·차트와 동일). */
export function deriveLevel(livePrice: number | null, pct: number | null): number | null {
  if (typeof livePrice !== "number" || !Number.isFinite(livePrice) || livePrice <= 0) return null;
  if (typeof pct !== "number" || !Number.isFinite(pct)) return null;
  const raw = livePrice * (1 + pct / 100);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return roundToKrxTick(raw);
}

/**
 * 이 판정의 추적 창 종료일(오늘로 클램프하지 않은 절대 종료일).
 * 커서를 여기까지 밀면 이후 어떤 날에도 `isScanComplete` 가 참이라 **영구 완료**된다.
 */
export function scanWindowEnd(row: TouchScanRow): string {
  return toDash(new Date(toDate(row.entryDate).getTime() + TOUCH_SCAN_WINDOW_DAYS * DAY_MS));
}

/**
 * 훑을 가치가 있는 행인지 — 레벨이 하나라도 있거나 산출 가능해야 한다.
 * 둘 다 불가(예: backfill 출신 `live_price` null 행)면 일봉을 받아봐야 볼 것이 없으므로
 * **조회 전에** 걸러 KIS 콜을 아낀다.
 */
export function hasScannableLevels(row: TouchScanRow): boolean {
  const t = row.targetPrice ?? deriveLevel(row.livePrice, row.targetPct);
  const s = row.stopPrice ?? deriveLevel(row.livePrice, row.stopLossPct);
  return t !== null || s !== null;
}

/** 이 행을 더 훑을 필요가 있는지 — 창이 끝났고 커서가 그 끝에 도달했으면 완료. */
export function isScanComplete(row: TouchScanRow, todayDash: string): boolean {
  const end = scanEndDate(row, todayDash);
  return row.touchScannedThrough !== null && row.touchScannedThrough >= end;
}

/** 이번 스캔이 커버할 마지막 날짜 — 오늘과 창 종료일 중 이른 쪽. */
export function scanEndDate(row: TouchScanRow, todayDash: string): string {
  const windowEnd = toDash(new Date(toDate(row.entryDate).getTime() + TOUCH_SCAN_WINDOW_DAYS * DAY_MS));
  return windowEnd < todayDash ? windowEnd : todayDash;
}

/** 증분 스캔 시작일 — 커서 다음 날(없으면 entry 다음 날). entry 당일 봉은 제외한다. */
export function scanStartDate(row: TouchScanRow): string {
  const anchor = row.touchScannedThrough ?? row.entryDate;
  return toDash(new Date(toDate(anchor).getTime() + DAY_MS));
}

/**
 * 한 행의 터치를 스캔해 갱신분을 만든다. 갱신할 것이 없으면 null.
 *
 * @param row 판정 1건(이미 기록된 터치일은 보존).
 * @param candles 스캔 구간 일봉(오름차순 권장, 내부에서 날짜로 필터).
 * @param todayDash 오늘(KST) YYYY-MM-DD.
 */
export function scanTouches(
  row: TouchScanRow,
  candles: StockDailyCandle[],
  todayDash: string,
): TouchScanUpdate | null {
  if (isScanComplete(row, todayDash)) return null;

  // 레벨은 있으면 그대로(동결), 없으면 이번에 산출해 채운다.
  const targetPrice = row.targetPrice ?? deriveLevel(row.livePrice, row.targetPct);
  const stopPrice = row.stopPrice ?? deriveLevel(row.livePrice, row.stopLossPct);

  // 두 레벨 모두 산출 불가(live_price 없는 backfill 행 등)면 볼 것이 없다. 커서를 창 끝까지
  // 밀어 **완료 처리**한다 — 그러지 않으면 창이 닫힐 때까지 매 실행 일봉 1콜을 헛되이 태운다.
  if (targetPrice === null && stopPrice === null) {
    // 창 끝까지 밀어 **영구 완료** — 오늘로만 밀면 내일 다시 후보로 잡혀 매일 헛돈다.
    return { touchScannedThrough: scanWindowEnd(row) };
  }

  const end = scanEndDate(row, todayDash);
  const start = scanStartDate(row);

  let targetHit = row.targetHitDate;
  let stopHit = row.stopHitDate;

  // 방향은 pct 부호가 결정한다(thesisBreach·차트 오버레이와 동일 기준).
  const targetUp = (row.targetPct ?? 0) >= 0;
  const stopUp = (row.stopLossPct ?? 0) > 0;

  const inRange = candles
    .filter((c) => c.date >= start && c.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const c of inRange) {
    if (targetHit === null && targetPrice !== null) {
      if (targetUp ? c.high >= targetPrice : c.low <= targetPrice) targetHit = c.date;
    }
    if (stopHit === null && stopPrice !== null) {
      if (stopUp ? c.high >= stopPrice : c.low <= stopPrice) stopHit = c.date;
    }
    if (targetHit !== null && stopHit !== null) break; // 둘 다 최초 터치 확정 — 더 볼 필요 없음.
  }

  const update: TouchScanUpdate = { touchScannedThrough: end };
  if (row.targetPrice === null && targetPrice !== null) update.targetPrice = targetPrice;
  if (row.stopPrice === null && stopPrice !== null) update.stopPrice = stopPrice;
  if (row.targetHitDate === null && targetHit !== null) update.targetHitDate = targetHit;
  if (row.stopHitDate === null && stopHit !== null) update.stopHitDate = stopHit;
  return update;
}

/**
 * #350 이전 **legacy 약세 시맨틱**인지 — 약세 판정인데 stop 이 하방(음수)인 행.
 *
 * 그 시절엔 target(재진입)과 stop 이 **둘 다 하방**이라 두 라인이 사실상 같은 사건을 가리켰고,
 * 감사에서 39건 중 19건(49%)이 같은 날 동시 터치로 잡혔다. 이런 행의 터치 선후는 판정의 성패가
 * 아니라 구조적 노이즈다.
 *
 * ⚠️ **집계·리포트는 이 행들을 반드시 걸러야 한다.** 무필터로 `touchOrderOf` 를 쓰면 #350 이 없앤
 * 노이즈가 그대로 되살아난다. (참고: `lib/stock/thesisBreach` 는 같은 이유로 이런 행에 대해
 * 배지를 내지 않는다 — 표시 계층은 침묵, 원장은 기록 후 집계에서 필터가 정책.)
 */
export function isLegacyBearishSemantics(
  verdict: string | null | undefined,
  stopLossPct: number | null | undefined,
): boolean {
  const bearish = verdict === "UNDERWEIGHT" || verdict === "REDUCE" || verdict === "SELL";
  return bearish && typeof stopLossPct === "number" && stopLossPct < 0;
}

/**
 * 무엇이 먼저 닿았는지 — 리포트·집계용 파생(원장에 중복 저장하지 않는다).
 *
 * ⚠️ 집계 전에 `isLegacyBearishSemantics` 로 legacy 약세 행을 걸러라. 그 행은 두 라인이 같은 방향이라
 * `same_day`·`stop_first` 가 구조적으로 쏟아진다(판정 성패와 무관).
 */
export type TouchOrder = "target_first" | "stop_first" | "same_day" | "target_only" | "stop_only" | "none";

export function touchOrderOf(targetHit: string | null, stopHit: string | null): TouchOrder {
  if (targetHit && stopHit) {
    if (targetHit === stopHit) return "same_day";
    return targetHit < stopHit ? "target_first" : "stop_first";
  }
  if (targetHit) return "target_only";
  if (stopHit) return "stop_only";
  return "none";
}
