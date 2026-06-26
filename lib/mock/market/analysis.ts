/**
 * 시황 레이어 Phase 2 — `MarketAnalysis` mock (비-prod degrade).
 *
 * PRD `market-analysis` §4 AC-7. KIS/CLI 미설정·비-prod 에서 `/api/market/analysis` 가 200 으로
 * 스키마를 만족하는 mock 을 반환해 로컬 개발·소비자 회귀 0 을 보장한다.
 */

import type { MarketAnalysis } from "@/lib/market/analysisTypes";
import type { MarketSnapshot } from "@/lib/market/types";

export function getMockMarketAnalysis(snapshot?: MarketSnapshot): MarketAnalysis {
  const now = new Date().toISOString();
  return {
    asOf: now,
    snapshotAsOf: snapshot?.asOf ?? now,
    provider: "claude",
    regimeDiagnosis: {
      phase: "risk_on_narrow",
      headline: "지수는 강세지만 반도체 소수 대형주 의존(강세 집중)",
      rationale:
        "KOSPI 가 52주 고점권이나 상승 기여가 삼성전자·SK하이닉스에 집중돼 시장 폭은 제한적입니다. 겉은 강세, 내부는 좁은 국면입니다. (mock 데이터)",
    },
    leadingSectors: [
      { key: "semiconductor", label: "반도체", maturity: "mature", note: "지수 상승을 주도하나 신규 모멘텀은 둔화 조짐. (mock)" },
    ],
    systemRisk: {
      level: "elevated",
      concentrationRisk:
        "지수 상승의 다수가 반도체 2종목에서 나와, 이들이 꺾이면 지수가 빠르게 약해질 수 있습니다. (mock)",
      triggers: ["반도체 실적 피크아웃", "원/달러 환율 급등", "미국 금리 재상승"],
      contagion:
        "주도주가 꺾이면 패시브 자금 이탈로 무관한 종목까지 동반 하락할 수 있습니다. (mock)",
    },
    outlook: {
      horizon: "1~2주",
      base: "고점권 등락 지속, 주도주 흐름에 연동. (mock)",
      bull: "반도체 추가 강세 시 지수 신고가. (mock)",
      bear: "주도주 차익실현 시 빠른 조정. (mock)",
    },
    stockImplication:
      "개별 종목은 주도섹터 연동성과 조정장 방어력(밸류·수급)을 함께 봐야 합니다. (mock)",
    confidence: "MEDIUM",
    warnings: ["mock 데이터(비-prod) — 실제 시장과 무관"],
  };
}