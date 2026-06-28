/**
 * analysisConfig 무회귀 테스트.
 *
 * 핵심: override 없는 기본 경로가 현 하드코딩값과 **바이트 동일**해야 한다(캐시·결정 무회귀).
 * - DEFAULT_ANALYSIS_CONFIG 값이 프롬프트의 기존 .slice/라운드 리터럴과 1:1 일치.
 * - config 미주입(undefined) === DEFAULT 주입 → 프롬프트 출력 동일.
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_ANALYSIS_CONFIG,
  resolveAnalysisConfig,
} from "@/lib/server/ai/analysisConfig";
import { AGENT_PROMPTS, type AnalysisState } from "@/lib/prompts/stock/aiAnalysis";

function makeState(overrides: Partial<AnalysisState> = {}): AnalysisState {
  // slice 경계가 보이도록 충분히 긴 문자열로 채운다.
  const long = (ch: string) => ch.repeat(5000);
  return {
    ticker: "005930",
    signalSummary: long("S"),
    priceContext: "price-ctx",
    marketReport: long("M"),
    newsReport: long("N"),
    fundamentalsReport: long("F"),
    socialReport: long("X"),
    bullArgument: long("B"),
    bearArgument: long("R"),
    researchPlan: long("P"),
    traderProposal: long("T"),
    riskRisky: long("a"),
    riskNeutral: long("b"),
    riskSafe: long("c"),
    ...overrides,
  };
}

describe("analysisConfig — 무회귀", () => {
  it("DEFAULT_ANALYSIS_CONFIG 가 현 하드코딩값과 일치", () => {
    expect(DEFAULT_ANALYSIS_CONFIG.debateRounds).toBe(2);
    expect(DEFAULT_ANALYSIS_CONFIG.slices).toEqual({
      traderBull: 1500,
      traderBear: 1500,
      traderMarket: 800,
      riskResearch: 800,
      riskSignal: 500,
      pmBull: 2000,
      pmBear: 2000,
      debateR2Prev: 1500,
    });
  });

  it("resolveAnalysisConfig() (override 없음) = DEFAULT", () => {
    expect(resolveAnalysisConfig()).toEqual(DEFAULT_ANALYSIS_CONFIG);
    expect(resolveAnalysisConfig(undefined)).toEqual(DEFAULT_ANALYSIS_CONFIG);
    expect(resolveAnalysisConfig(null)).toEqual(DEFAULT_ANALYSIS_CONFIG);
  });

  it("부분 override 는 기본값 위에 병합(나머지 불변)", () => {
    const c = resolveAnalysisConfig({ debateRounds: 1 });
    expect(c.debateRounds).toBe(1);
    expect(c.slices).toEqual(DEFAULT_ANALYSIS_CONFIG.slices);

    const c2 = resolveAnalysisConfig({ slices: { traderBull: 500 } });
    expect(c2.slices.traderBull).toBe(500);
    expect(c2.slices.pmBull).toBe(2000); // 나머지 slice 유지
    expect(c2.debateRounds).toBe(2);
  });

  // config 미주입 vs DEFAULT 주입이 프롬프트 바이트 동일해야 한다.
  const slicedAgents = [
    "trader",
    "risk_risky",
    "risk_neutral",
    "risk_safe",
    "portfolio_manager",
  ] as const;
  for (const key of slicedAgents) {
    it(`${key} user 프롬프트: config undefined == DEFAULT (무회귀)`, () => {
      const base = makeState();
      const withUndef = AGENT_PROMPTS[key].user({ ...base, config: undefined });
      const withDefault = AGENT_PROMPTS[key].user({
        ...base,
        config: DEFAULT_ANALYSIS_CONFIG,
      });
      expect(withUndef).toBe(withDefault);
    });
  }

  it("trader slice 경계: 기본 config 에서 bullArgument 정확히 1500자만 포함", () => {
    const out = AGENT_PROMPTS.trader.user(makeState());
    expect(out).toContain("B".repeat(1500));
    expect(out).not.toContain("B".repeat(1501));
  });

  it("PM slice 경계: 기본 config 에서 bullArgument 2000자(트레이더보다 큼)", () => {
    const out = AGENT_PROMPTS.portfolio_manager.user(makeState());
    expect(out).toContain("B".repeat(2000));
    expect(out).not.toContain("B".repeat(2001));
  });

  it("override slice 가 프롬프트에 실제 반영", () => {
    const base = makeState();
    const tight = AGENT_PROMPTS.trader.user({
      ...base,
      config: resolveAnalysisConfig({ slices: { traderBull: 500 } }),
    });
    expect(tight).toContain("B".repeat(500));
    expect(tight).not.toContain("B".repeat(501));
  });
});

describe("debateOrder — 순서 스왑(편향 진단)", () => {
  for (const key of ["research_manager", "trader", "portfolio_manager"] as const) {
    it(`${key}: bull-first(기본)는 강세→약세, bear-first는 약세→강세`, () => {
      const bullFirst = AGENT_PROMPTS[key].user(makeState());
      const bearFirst = AGENT_PROMPTS[key].user(
        makeState({ config: resolveAnalysisConfig({ debateOrder: "bear-first" }) }),
      );
      // 라벨 대괄호로 매칭(RM 헤더 "강세/약세 연구원의 토론" 오매칭 회피).
      // 기본은 강세 라벨이 약세 라벨보다 먼저
      expect(bullFirst.indexOf("[강세 연구원")).toBeLessThan(bullFirst.indexOf("[약세 연구원"));
      // bear-first는 약세가 먼저
      expect(bearFirst.indexOf("[약세 연구원")).toBeLessThan(bearFirst.indexOf("[강세 연구원"));
    });
  }
});
