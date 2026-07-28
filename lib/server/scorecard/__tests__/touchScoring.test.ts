/**
 * touchScoring 회귀 — 방향(부호) 규칙·증분 커서·멱등·창 종료를 고정한다.
 *
 * 핵심 성질: 약세 콜의 target(하방 재진입)과 stop(상방 무효화)이 **반대 방향**이라
 * 각각 저가/고가로 판정돼야 한다(#350). 구 시맨틱처럼 둘 다 하방이면 판별력이 없다.
 */

import { describe, it, expect } from "vitest";
import {
  scanTouches,
  deriveLevel,
  isScanComplete,
  levelsOnlyUpdate,
  scanStartDate,
  scanEndDate,
  touchOrderOf,
  type TouchScanRow,
} from "@/lib/server/scorecard/touchScoring";
import type { StockDailyCandle } from "@/lib/api/kis/types";

const TODAY = "2026-07-28";

function row(over: Partial<TouchScanRow> = {}): TouchScanRow {
  return {
    id: "row-1",
    ticker: "005930",
    entryDate: "2026-07-13",
    livePrice: 10_000,
    targetPct: -8, // 약세 재진입(하방) 9,200
    stopLossPct: 6, // 약세 무효화(상방) 10,600
    targetPrice: null,
    stopPrice: null,
    targetHitDate: null,
    stopHitDate: null,
    touchScannedThrough: null,
    ...over,
  };
}

function candle(date: string, low: number, high: number): StockDailyCandle {
  return { date, open: (low + high) / 2, high, low, close: (low + high) / 2, volume: 1 };
}

describe("deriveLevel", () => {
  it("기준가 × (1+pct/100), 호가단위 반올림", () => {
    expect(deriveLevel(10_000, -8)).toBe(9_200);
    expect(deriveLevel(10_000, 6)).toBe(10_600);
  });

  it("기준가·pct 없거나 비정상이면 null(잘못된 레벨로 오채점 금지)", () => {
    expect(deriveLevel(null, 6)).toBeNull();
    expect(deriveLevel(0, 6)).toBeNull();
    expect(deriveLevel(10_000, null)).toBeNull();
    expect(deriveLevel(10_000, Number.NaN)).toBeNull();
  });
});

describe("scanTouches — 방향 규칙(약세: target 하방 / stop 상방)", () => {
  it("재진입(하방)은 저가로, 무효화(상방)는 고가로 판정", () => {
    const u = scanTouches(
      row(),
      [
        candle("2026-07-14", 9_900, 10_100), // 아무것도 안 닿음
        candle("2026-07-15", 9_100, 10_000), // 저가 9,100 ≤ 9,200 → 재진입 터치
        candle("2026-07-16", 10_200, 10_700), // 고가 10,700 ≥ 10,600 → 무효화 터치
      ],
      TODAY,
    )!;
    expect(u.targetHitDate).toBe("2026-07-15");
    expect(u.stopHitDate).toBe("2026-07-16");
    expect(u.targetPrice).toBe(9_200);
    expect(u.stopPrice).toBe(10_600);
  });

  it("강세(target 상방·stop 하방)도 부호대로 갈린다", () => {
    const u = scanTouches(
      row({ targetPct: 15, stopLossPct: -6 }), // 11,500 / 9,400
      [
        candle("2026-07-14", 9_300, 9_500), // 저가 9,300 ≤ 9,400 → 손절 터치
        candle("2026-07-15", 11_400, 11_600), // 고가 11,600 ≥ 11,500 → 목표 터치
      ],
      TODAY,
    )!;
    expect(u.stopHitDate).toBe("2026-07-14");
    expect(u.targetHitDate).toBe("2026-07-15");
  });

  it("최초 터치만 기록한다(이후 재터치는 무시)", () => {
    const u = scanTouches(
      row(),
      [candle("2026-07-14", 9_000, 9_100), candle("2026-07-15", 9_000, 9_100)],
      TODAY,
    )!;
    expect(u.targetHitDate).toBe("2026-07-14");
  });
});

describe("scanTouches — 증분·멱등", () => {
  it("커서 이후 봉만 훑는다(이미 기록된 터치일은 보존)", () => {
    const u = scanTouches(
      row({ touchScannedThrough: "2026-07-20", targetHitDate: "2026-07-15", targetPrice: 9_200, stopPrice: 10_600 }),
      [
        candle("2026-07-16", 8_000, 8_100), // 커서 이전 — 무시돼야 함
        candle("2026-07-21", 10_700, 10_800), // 커서 이후 — 무효화 터치
      ],
      TODAY,
    )!;
    expect(u.targetHitDate).toBeUndefined(); // 이미 있던 값 유지(갱신분에 없음)
    expect(u.stopHitDate).toBe("2026-07-21");
    expect(u.touchScannedThrough).toBe(TODAY);
  });

  it("entry 당일 봉은 제외(진입가 자체가 라인에 닿아 보이는 오판정 방지)", () => {
    expect(scanStartDate(row())).toBe("2026-07-14");
    const u = scanTouches(row(), [candle("2026-07-13", 9_000, 10_900)], TODAY)!;
    expect(u.targetHitDate).toBeUndefined();
    expect(u.stopHitDate).toBeUndefined();
  });

  it("창(45일)이 끝나고 커서가 도달했으면 더 스캔하지 않는다", () => {
    const done = row({ entryDate: "2026-01-01", touchScannedThrough: "2026-02-15" });
    expect(isScanComplete(done, TODAY)).toBe(true);
    expect(scanTouches(done, [candle("2026-07-20", 1, 99_999)], TODAY)).toBeNull();
  });

  it("스캔 종료일은 오늘과 창 종료일 중 이른 쪽", () => {
    expect(scanEndDate(row({ entryDate: "2026-07-27" }), TODAY)).toBe(TODAY); // 창이 아직 안 끝남
    expect(scanEndDate(row({ entryDate: "2026-01-01" }), TODAY)).toBe("2026-02-15"); // 창 종료
  });
});

describe("touchOrderOf", () => {
  it("선후·단독·동시·미터치를 구분", () => {
    expect(touchOrderOf("2026-07-15", "2026-07-16")).toBe("target_first");
    expect(touchOrderOf("2026-07-17", "2026-07-16")).toBe("stop_first");
    expect(touchOrderOf("2026-07-16", "2026-07-16")).toBe("same_day");
    expect(touchOrderOf("2026-07-16", null)).toBe("target_only");
    expect(touchOrderOf(null, "2026-07-16")).toBe("stop_only");
    expect(touchOrderOf(null, null)).toBe("none");
  });
});

describe("levelsOnlyUpdate — 봉 없이도 레벨은 채운다(당일 진입)", () => {
  it("비어 있는 레벨만 산출해 반환", () => {
    const u = levelsOnlyUpdate(row())!;
    expect(u.targetPrice).toBe(9_200);
    expect(u.stopPrice).toBe(10_600);
    expect(u.touchScannedThrough).toBeUndefined(); // 커서는 전진시키지 않는다
  });

  it("이미 있으면 건드리지 않고, 둘 다 있으면 null(갱신 없음)", () => {
    const u = levelsOnlyUpdate(row({ targetPrice: 1, stopPrice: null }))!;
    expect(u.targetPrice).toBeUndefined();
    expect(u.stopPrice).toBe(10_600);
    expect(levelsOnlyUpdate(row({ targetPrice: 1, stopPrice: 2 }))).toBeNull();
  });

  it("기준가 없으면 산출 불가 → null", () => {
    expect(levelsOnlyUpdate(row({ livePrice: null }))).toBeNull();
  });
});
