/**
 * 시황 레이어 Phase 2 단위테스트 — `analysis.ts`(파싱·정규화) + `analysisPrompt.ts`(포매팅).
 *
 * PRD `market-analysis` AC-4/5/6. CLI 출력 복원·enum 클램프·스냅샷 텍스트화 회귀 차단.
 */

import { describe, it, expect } from "vitest";
import { parseAnalysisJson, normalizeAnalysisFields } from "../analysis";
import { formatSnapshotForPrompt } from "../analysisPrompt";
import type { MarketSnapshot } from "../types";

function snapshot(overrides: Partial<MarketSnapshot> = {}): MarketSnapshot {
  return {
    asOf: "2026-06-26T01:23:45.000Z",
    session: "open",
    dataSource: "live",
    indices: {
      domestic: [
        {
          code: "0001",
          name: "코스피",
          value: 3100,
          change: 15,
          changePercent: 0.49,
          direction: "up",
          yearHigh: 3150,
          yearLow: 2400,
          pos52w: 0.93,
          pctFrom52wHigh: -1.59,
        },
      ],
      overseas: [
        { code: "SPX", name: "S&P500", value: 5400, change: 10, changePercent: 0.19, direction: "up" },
      ],
    },
    breadth: { advances: 520, declines: 360, unchanged: 90, advanceDeclineRatio: 0.59, breadthPct: 53.6 },
    sectors: [
      {
        key: "semiconductor",
        label: "반도체",
        changePct: 1.8,
        upCount: 8,
        downCount: 3,
        memberCount: 11,
        leaders: [{ ticker: "000660", name: "SK하이닉스", changePct: 3.2 }],
        weightMode: "equal",
      },
    ],
    concentration: {
      basis: "kospi_top_mcap",
      topN: 5,
      topNContributionPct: 71.4,
      direction: "up",
      contributors: [
        { ticker: "005930", name: "삼성전자", changePct: 1.5, weight: 0.42, contribution: 0.63 },
      ],
      interpretation: "very_narrow",
      asOf: "2026-06-26",
    },
    regime: {
      trend: "uptrend",
      aboveMA: { ma20: true, ma60: true, ma120: true },
      maSlope120: "up",
      momentum: { d5: 1.2, d20: 2.4 },
      riskLevel: "elevated",
      rationale: "상승추세",
      bars: 245,
    },
    fearGreed: { domestic: { value: 62, label: "GREED" }, us: null },
    flow: {
      foreignTop: [{ ticker: "000660", name: "SK하이닉스", changePercent: 3.2, netBuyAmount: 152000 }],
      institutionTop: [{ ticker: "005930", name: "삼성전자", changePercent: 1.5, netBuyAmount: 88000 }],
    },
    warnings: ["집중도는 시총상위 바스켓 한정 상대값입니다."],
    ...overrides,
  };
}

const VALID = {
  regimeDiagnosis: { phase: "risk_on_narrow", headline: "강세 집중", rationale: "반도체 의존" },
  leadingSectors: [{ key: "semiconductor", label: "반도체", maturity: "mature", note: "주도" }],
  systemRisk: {
    level: "elevated",
    concentrationRisk: "삼성·하이닉스 의존",
    triggers: ["실적 피크아웃", "환율"],
    contagion: "패시브 이탈",
  },
  outlook: { horizon: "1~2주", base: "등락", bull: "신고가", bear: "조정" },
  stockImplication: "조정장 방어력 확인 필요",
  confidence: "MEDIUM",
};

describe("parseAnalysisJson", () => {
  it("순수 JSON 파싱", () => {
    expect(parseAnalysisJson(JSON.stringify(VALID))?.confidence).toBe("MEDIUM");
  });

  it("코드펜스로 감싼 JSON 복원", () => {
    const raw = "분석 결과입니다:\n```json\n" + JSON.stringify(VALID) + "\n```\n감사합니다.";
    expect(parseAnalysisJson(raw)?.confidence).toBe("MEDIUM");
  });

  it("잡텍스트 사이 중괄호 슬라이스 복원", () => {
    const raw = "여기 결과 " + JSON.stringify(VALID) + " 끝.";
    expect(parseAnalysisJson(raw)).not.toBeNull();
  });

  it("빈/비-JSON 은 null", () => {
    expect(parseAnalysisJson("")).toBeNull();
    expect(parseAnalysisJson("그냥 텍스트")).toBeNull();
  });

  it("배열 최상위는 객체 아님 → null", () => {
    expect(parseAnalysisJson("[1,2,3]")).toBeNull();
  });
});

describe("normalizeAnalysisFields", () => {
  it("유효 객체 — 필드 보존 + 메타 래핑", () => {
    const snap = snapshot();
    const a = normalizeAnalysisFields(VALID as Record<string, unknown>, snap);
    expect(a.regimeDiagnosis.phase).toBe("risk_on_narrow");
    expect(a.leadingSectors[0].maturity).toBe("mature");
    expect(a.systemRisk.level).toBe("elevated");
    expect(a.systemRisk.triggers).toHaveLength(2);
    expect(a.provider).toBe("claude");
    expect(a.snapshotAsOf).toBe(snap.asOf);
    // 스냅샷 warnings 승계.
    expect(a.warnings).toContain(snap.warnings[0]);
  });

  it("이상 enum → 안전 기본 클램프", () => {
    const bad = {
      ...VALID,
      regimeDiagnosis: { phase: "초강세장", headline: "x", rationale: "y" },
      systemRisk: { ...VALID.systemRisk, level: "MAX" },
      confidence: "VERY_HIGH",
      leadingSectors: [{ key: "k", label: "L", maturity: "끝물", note: "n" }],
    };
    const a = normalizeAnalysisFields(bad as Record<string, unknown>, snapshot());
    expect(a.regimeDiagnosis.phase).toBe("neutral");
    expect(a.systemRisk.level).toBe("elevated");
    expect(a.confidence).toBe("MEDIUM");
    expect(a.leadingSectors[0].maturity).toBe("mature");
  });

  it("대소문자 변형 enum 허용", () => {
    const a = normalizeAnalysisFields(
      { ...VALID, confidence: "high", regimeDiagnosis: { phase: "CORRECTION", headline: "", rationale: "" } } as Record<string, unknown>,
      snapshot(),
    );
    expect(a.confidence).toBe("HIGH");
    expect(a.regimeDiagnosis.phase).toBe("correction");
  });

  it("null/누락 — 전부 안전 기본 + degrade warning", () => {
    const a = normalizeAnalysisFields(null, snapshot(), ["CLI 합성 실패"]);
    expect(a.regimeDiagnosis.phase).toBe("neutral");
    expect(a.systemRisk.level).toBe("elevated");
    expect(a.confidence).toBe("MEDIUM");
    expect(a.leadingSectors).toEqual([]);
    expect(a.outlook.horizon).toBe("1~2주");
    expect(a.warnings).toContain("CLI 합성 실패");
  });

  it("triggers 최대 4개로 절단·빈 문자열 제거", () => {
    const a = normalizeAnalysisFields(
      { ...VALID, systemRisk: { ...VALID.systemRisk, triggers: ["a", "", "b", "c", "d", "e"] } } as Record<string, unknown>,
      snapshot(),
    );
    expect(a.systemRisk.triggers).toEqual(["a", "b", "c", "d"]);
  });

  it("key·label 둘 다 없는 섹터는 제거", () => {
    const a = normalizeAnalysisFields(
      { ...VALID, leadingSectors: [{ maturity: "growth", note: "x" }, { key: "bio", maturity: "growth", note: "y" }] } as Record<string, unknown>,
      snapshot(),
    );
    expect(a.leadingSectors).toHaveLength(1);
    expect(a.leadingSectors[0].key).toBe("bio");
  });
});

describe("formatSnapshotForPrompt", () => {
  it("지수·집중도·섹터·국면·수급 포함", () => {
    const text = formatSnapshotForPrompt(snapshot());
    expect(text).toContain("코스피");
    expect(text).toContain("매우 좁음"); // very_narrow 해석
    expect(text).toContain("삼성전자");
    expect(text).toContain("반도체");
    expect(text).toContain("uptrend");
    expect(text).toContain("SK하이닉스"); // 수급/섹터 주도
    expect(text).toContain("데이터 제한·경고");
  });

  it("섹션 null 이어도 안전(빈 표기)", () => {
    const text = formatSnapshotForPrompt(
      snapshot({ concentration: null, regime: null, breadth: null, flow: null, sectors: [] }),
    );
    expect(text).toContain("집중도 데이터 없음");
    expect(text).toContain("국면 데이터 없음");
    expect(text).toContain("시장 폭 데이터 없음");
    expect(text).toContain("수급 데이터 없음");
    expect(text).toContain("섹터 데이터 없음");
  });
});
