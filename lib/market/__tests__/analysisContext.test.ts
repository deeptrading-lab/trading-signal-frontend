/**
 * 시황 레이어 Phase 3 단위테스트 — `analysisContext.ts`(포매팅·게이트) + 프롬프트 주입 연결.
 *
 * PRD `market-context-injection` AC-1/2/3/5. 무회귀(null→"")·enum 한글 매핑·데이터 제한 표기·
 * 주입 대상(market/news/PM 포함, 비대상 제외) 회귀 차단.
 */

import { describe, expect, it } from "vitest";
import {
  buildMarketContextBlock,
  isMarketAnalysisFresh,
  MARKET_CONTEXT_MAX_AGE_HOURS,
} from "../analysisContext";
import type { MarketAnalysis } from "../analysisTypes";
import { AGENT_PROMPTS } from "@/lib/prompts/stock/aiAnalysis";
import type { AnalysisState } from "@/lib/prompts/stock/aiAnalysis";

function analysis(overrides: Partial<MarketAnalysis> = {}): MarketAnalysis {
  return {
    asOf: "2026-06-26T01:23:45.000Z",
    snapshotAsOf: "2026-06-26T01:20:00.000Z",
    provider: "claude",
    regimeDiagnosis: {
      phase: "risk_on_narrow",
      headline: "반도체 2종목이 끌어올린 강세집중 국면",
      rationale: "지수는 강세이나 시장폭이 좁고 집중도가 매우 높다.",
    },
    leadingSectors: [
      { key: "semiconductor", label: "반도체", maturity: "overheated", note: "단기 급등·되돌림 위험." },
    ],
    systemRisk: {
      level: "high",
      concentrationRisk: "코스피 상승분의 70.7%가 삼성전자·SK하이닉스 등 5종목에 집중.",
      triggers: ["반도체 실적 피크아웃", "원/달러 환율 급등", "미국 금리 재상승"],
      contagion: "삼성·하이닉스 동시 음봉 → 패시브 추종 매도 → 무관한 바이오·소비재 동반하락.",
    },
    outlook: {
      horizon: "1~2주",
      base: "고점 부근 등락",
      bull: "외국인 순매수 지속 시 추가 상승",
      bear: "반도체 차익실현 시 지수 동반 조정",
    },
    stockImplication: "조정장에서 버티려면 주도섹터 비의존·수급 안정·낙폭과대 회피가 관건.",
    confidence: "MEDIUM",
    warnings: [],
    ...overrides,
  };
}

function baseState(overrides: Partial<AnalysisState> = {}): AnalysisState {
  return {
    ticker: "005930",
    signalSummary: "시그널",
    priceContext: "가격 컨텍스트",
    marketReport: "기술 리포트",
    newsReport: "뉴스 리포트",
    fundamentalsReport: "펀더 리포트",
    socialReport: "심리 리포트",
    bullArgument: "강세 논거",
    bearArgument: "약세 논거",
    researchPlan: "투자 계획",
    traderProposal: "트레이더 제안",
    riskRisky: "공격적 평가",
    riskNeutral: "중립적 평가",
    riskSafe: "보수적 평가",
    ...overrides,
  };
}

describe("buildMarketContextBlock", () => {
  it("null/undefined → 빈 문자열(무회귀)", () => {
    expect(buildMarketContextBlock(null)).toBe("");
    expect(buildMarketContextBlock(undefined)).toBe("");
  });

  it("정상 분석 → 핵심 필드(국면·집중도·트리거·전이·함의)를 한글 라벨로 포함", () => {
    const block = buildMarketContextBlock(analysis());
    // 선행 분리 줄바꿈
    expect(block.startsWith("\n\n")).toBe(true);
    // 국면 enum → 한글 라벨
    expect(block).toContain("강세 집중(소수 주도주 의존 — 겉은 강세, 속은 취약)");
    expect(block).toContain("반도체 2종목이 끌어올린 강세집중 국면");
    // 주도섹터 성숙도 한글
    expect(block).toContain("반도체(과열)");
    // 시스템 리스크 한글 라벨 + 핵심 서술
    expect(block).toContain("시스템 리스크: 높음");
    expect(block).toContain("코스피 상승분의 70.7%");
    expect(block).toContain("반도체 실적 피크아웃 · 원/달러 환율 급등 · 미국 금리 재상승");
    expect(block).toContain("패시브 추종 매도");
    // 종목 함의 + 신뢰도
    expect(block).toContain("종목 함의(조정장 생존 관점)");
    expect(block).toContain("시황 분석 신뢰도: 보통");
    // 생성 시각 노출
    expect(block).toContain("생성: 2026-06-26T01:23:45.000Z");
    // mock/partial 주의가 없어야 함(live)
    expect(block).not.toContain("⚠️");
  });

  it("dataSource mock → 참고용 주의 문구 포함", () => {
    const block = buildMarketContextBlock(analysis(), { dataSource: "mock" });
    expect(block).toContain("mock(비-prod) 데이터라 참고용");
  });

  it("dataSource partial → 데이터 제한 주의 문구 포함", () => {
    const block = buildMarketContextBlock(analysis(), { dataSource: "partial" });
    expect(block).toContain("일부 시장 데이터가 누락된 제한적 시황");
  });

  it("알 수 없는 enum 값은 원문 유지(방어적)", () => {
    const block = buildMarketContextBlock(
      analysis({
        regimeDiagnosis: { phase: "weird_phase" as never, headline: "h", rationale: "r" },
      }),
    );
    expect(block).toContain("국면: weird_phase — h");
  });
});

describe("isMarketAnalysisFresh", () => {
  const now = new Date("2026-06-27T05:00:00.000Z");

  it("한계 이내(방금·1시간 전) → fresh", () => {
    expect(isMarketAnalysisFresh("2026-06-27T05:00:00.000Z", now)).toBe(true);
    expect(isMarketAnalysisFresh("2026-06-27T04:00:00.000Z", now)).toBe(true);
  });

  it("한계 직전(24h 미만) → fresh, 한계 초과(25h) → stale", () => {
    // 23h59m 전
    expect(isMarketAnalysisFresh("2026-06-26T05:01:00.000Z", now)).toBe(true);
    // 25h 전
    expect(isMarketAnalysisFresh("2026-06-26T04:00:00.000Z", now)).toBe(false);
  });

  it("며칠 전 저장본 → stale(주입 skip)", () => {
    expect(isMarketAnalysisFresh("2026-06-24T05:00:00.000Z", now)).toBe(false);
  });

  it("미래 타임스탬프(시계 오차) → fresh 취급", () => {
    expect(isMarketAnalysisFresh("2026-06-27T06:00:00.000Z", now)).toBe(true);
  });

  it("asOf 누락/파싱 불가 → stale(보수적)", () => {
    expect(isMarketAnalysisFresh(undefined, now)).toBe(false);
    expect(isMarketAnalysisFresh(null, now)).toBe(false);
    expect(isMarketAnalysisFresh("", now)).toBe(false);
    expect(isMarketAnalysisFresh("not-a-date", now)).toBe(false);
  });

  it("maxAgeHours 인자로 조정 가능", () => {
    // 기본 24h 상수 노출
    expect(MARKET_CONTEXT_MAX_AGE_HOURS).toBe(24);
    // 2h 한계로 좁히면 3h 전은 stale
    expect(isMarketAnalysisFresh("2026-06-27T02:00:00.000Z", now, 2)).toBe(false);
    expect(isMarketAnalysisFresh("2026-06-27T04:00:00.000Z", now, 2)).toBe(true);
  });
});

describe("프롬프트 주입 연결(AC-3)", () => {
  const block = buildMarketContextBlock(analysis());

  it("marketContext 미설정 시 대상 프롬프트가 무변경", () => {
    const without = baseState();
    const withCtx = baseState({ marketContext: block });
    for (const key of ["market", "news", "portfolio_manager"] as const) {
      const a = AGENT_PROMPTS[key].user(without);
      const b = AGENT_PROMPTS[key].user(withCtx);
      expect(a).not.toContain("시황 — 시장 전체 국면");
      expect(b).toContain("시황 — 시장 전체 국면");
      // 미설정본은 시황 블록만큼 짧다(나머지 무변경)
      expect(b).toBe(a + block);
    }
  });

  it("비대상 에이전트(bull·bear·fundamentals·social·trader·risk_*)에는 주입 안 됨", () => {
    const withCtx = baseState({ marketContext: block });
    for (const key of [
      "bull",
      "bear",
      "fundamentals",
      "social",
      "research_manager",
      "trader",
      "risk_risky",
      "risk_neutral",
      "risk_safe",
    ] as const) {
      expect(AGENT_PROMPTS[key].user(withCtx)).not.toContain("시황 — 시장 전체 국면");
    }
  });
});
