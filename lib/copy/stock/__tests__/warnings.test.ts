/**
 * `lib/copy/stock/warnings.ts` — 라벨·심각도·칩 뷰모델 단위 테스트.
 *
 * PRD `stock-warnings` AC-3·4·5 회귀 차단: 심각도 매핑, VI 라벨 중복 제거,
 * unknown warningType 폴백(칩 누락·throw 없음).
 */

import { describe, it, expect } from "vitest";
import {
  warningLabel,
  warningSeverity,
  toWarningChips,
  WARNING_FALLBACK_LABEL,
} from "../warnings";

describe("warningLabel / warningSeverity", () => {
  it("전 enum 을 한글 라벨·심각도로 매핑한다 (AC-3·4)", () => {
    expect(warningLabel("LIQUIDATION_TRADING")).toBe("정리매매");
    expect(warningSeverity("LIQUIDATION_TRADING")).toBe("critical");
    expect(warningLabel("INVESTMENT_RISK")).toBe("투자위험");
    expect(warningSeverity("INVESTMENT_RISK")).toBe("critical");
    expect(warningLabel("INVESTMENT_WARNING")).toBe("투자경고");
    expect(warningSeverity("INVESTMENT_WARNING")).toBe("warn");
    expect(warningLabel("OVERHEATED")).toBe("단기과열");
    expect(warningSeverity("OVERHEATED")).toBe("warn");
    expect(warningLabel("VI_STATIC")).toBe("VI 발동");
    expect(warningSeverity("VI_DYNAMIC")).toBe("info");
  });

  it("unknown warningType 은 폴백 라벨 + info — throw 없음 (AC-5)", () => {
    expect(warningLabel("FUTURE_NEW_CODE")).toBe(WARNING_FALLBACK_LABEL);
    expect(warningSeverity("FUTURE_NEW_CODE")).toBe("info");
  });
});

describe("toWarningChips", () => {
  it("VI 계열 3종은 같은 라벨이라 칩 1개로 접힌다", () => {
    const chips = toWarningChips([
      { warningType: "VI_STATIC" },
      { warningType: "VI_DYNAMIC" },
      { warningType: "VI_STATIC_AND_DYNAMIC" },
    ]);
    expect(chips).toEqual([{ label: "VI 발동", severity: "info" }]);
  });

  it("심각도 순(critical → warn → info)으로 정렬한다", () => {
    const chips = toWarningChips([
      { warningType: "VI_STATIC" },
      { warningType: "OVERHEATED" },
      { warningType: "LIQUIDATION_TRADING" },
    ]);
    expect(chips.map((c) => c.label)).toEqual(["정리매매", "단기과열", "VI 발동"]);
  });

  it("빈 배열이면 칩 없음(헤더 레이아웃 무변화 경로)", () => {
    expect(toWarningChips([])).toEqual([]);
  });

  it("unknown code 도 폴백 라벨 칩으로 노출된다 (AC-5)", () => {
    expect(toWarningChips([{ warningType: "NEW_ALERT" }])).toEqual([
      { label: WARNING_FALLBACK_LABEL, severity: "info" },
    ]);
  });
});
