/**
 * 시황 레이어 Phase 3 — 종목분석 주입용 시황 컨텍스트 블록(순수) + 주입 게이트.
 *
 * PRD `market-context-injection`. Phase 2 가 저장한 최신 `MarketAnalysis`(국면 해석)를
 * 종목분석 일부 에이전트(market·news·portfolio_manager) 프롬프트에 끼울 한국어 텍스트로
 * 포매팅한다. 주입 원천은 `getLatestMarketAnalysis()`(?mode=latest 저장본) — CLI 0콜이라
 * 종목분석 latency 에 합성을 더하지 않는다.
 *
 * - `buildMarketContextBlock` — 순수함수. null/빈 입력 → "" (주입 skip → 무회귀).
 * - `isMarketContextPromptEnabled` — env `AI_MARKET_CONTEXT_ENABLED` 게이트(기본 OFF, 서버 전용).
 */

import type {
  MarketAnalysis,
  MarketAnalysisConfidence,
  MarketPhase,
  SectorMaturity,
  SystemRiskLevel,
} from "@/lib/market/analysisTypes";
import type { MarketDataSource } from "@/lib/market/types";

/** 국면 enum → 한글 라벨(소수 주도주 의존·동반하락 뉘앙스를 라벨에 박는다). */
const PHASE_LABEL: Record<MarketPhase, string> = {
  risk_on_broad: "강세 확산(다수 섹터 동반 상승)",
  risk_on_narrow: "강세 집중(소수 주도주 의존 — 겉은 강세, 속은 취약)",
  late_cycle: "고점 경계(주도섹터 과열·확산 둔화)",
  correction: "조정(주도섹터 꺾임·동반 하락 진행)",
  risk_off: "약세(추세적 하락)",
  bottoming: "바닥 확인(낙폭 둔화·반등 시도)",
  neutral: "중립/혼조(방향 불명확)",
};

/** 섹터 성숙도 enum → 한글 라벨. */
const MATURITY_LABEL: Record<SectorMaturity, string> = {
  emerging: "초기",
  growth: "성장",
  mature: "성숙",
  overheated: "과열",
  declining: "쇠퇴",
};

/** 시스템 리스크 레벨 enum → 한글 라벨. */
const RISK_LABEL: Record<SystemRiskLevel, string> = {
  low: "낮음",
  elevated: "높아짐",
  high: "높음",
};

/** 시황 분석 신뢰도 enum → 한글 라벨. */
const CONFIDENCE_LABEL: Record<MarketAnalysisConfidence, string> = {
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

/**
 * 저장된 시황 분석(`MarketAnalysis`)을 종목분석 프롬프트에 끼울 한국어 블록으로 포매팅한다.
 *
 * - `null`/`undefined` → `""` (호출부에서 아무것도 덧붙이지 않음 → 무회귀).
 * - enum 은 한글 라벨로 매핑하고, 누락 필드는 방어적으로 생략한다(저장본이 구버전·부분일 수 있음).
 * - 사용자 3대 질문(반도체 집중 의존·동반하락·조정장 생존)에 대응하는
 *   `systemRisk.concentrationRisk`·`triggers`·`contagion`·`stockImplication` 을 1급으로 노출.
 * - 머리에 생성 시각(`asOf`)을 노출해 모델이 신선도를 인지하게 한다(자동 신선도 게이트는 Phase 4).
 * - `opts.dataSource` 가 mock/partial 이면 "참고용·데이터 제한" 주의를 덧붙인다.
 *
 * 반환 블록은 선행 `\n\n` 로 앞 프롬프트 본문과 분리된다.
 */
export function buildMarketContextBlock(
  analysis: MarketAnalysis | null | undefined,
  opts?: { dataSource?: MarketDataSource },
): string {
  if (!analysis) return "";

  const ds = opts?.dataSource ?? "live";
  const dsNote =
    ds === "mock"
      ? "⚠️ 이 시황은 mock(비-prod) 데이터라 참고용으로만 보세요."
      : ds === "partial"
        ? "⚠️ 일부 시장 데이터가 누락된 제한적 시황입니다(참고 가중치를 낮추세요)."
        : "";

  const out: string[] = [];
  out.push("[시황 — 시장 전체 국면 (참고 컨텍스트)]");
  if (typeof analysis.asOf === "string" && analysis.asOf) out.push(`생성: ${analysis.asOf}`);
  if (dsNote) out.push(dsNote);
  out.push(
    "아래는 개별 종목이 아니라 **시장 전체**의 국면·시스템 리스크 진단입니다. 이 종목 고유 분석을 1차 근거로 삼되, " +
      '"지금 같은 시장에서 이 종목이 조정장을 버틸 수 있는가"를 판단할 때 맥락으로 참고하세요.',
  );

  const rd = analysis.regimeDiagnosis;
  if (rd) {
    out.push(
      `· 국면: ${PHASE_LABEL[rd.phase] ?? rd.phase}${rd.headline ? ` — ${rd.headline}` : ""}`,
    );
    if (rd.rationale) out.push(`  근거: ${rd.rationale}`);
  }

  if (Array.isArray(analysis.leadingSectors) && analysis.leadingSectors.length > 0) {
    const sectors = analysis.leadingSectors
      .map(
        (s) =>
          `${s.label}(${MATURITY_LABEL[s.maturity] ?? s.maturity})${s.note ? ` — ${s.note}` : ""}`,
      )
      .join("; ");
    out.push(`· 주도섹터·성숙도: ${sectors}`);
  }

  const sr = analysis.systemRisk;
  if (sr) {
    out.push(`· 시스템 리스크: ${RISK_LABEL[sr.level] ?? sr.level}`);
    if (sr.concentrationRisk) out.push(`  집중도 위험: ${sr.concentrationRisk}`);
    if (Array.isArray(sr.triggers) && sr.triggers.length > 0) {
      out.push(`  동반하락 트리거: ${sr.triggers.join(" · ")}`);
    }
    if (sr.contagion) out.push(`  전이 양상: ${sr.contagion}`);
  }

  const ol = analysis.outlook;
  if (ol) {
    out.push(
      `· 전망(${ol.horizon || "단기"}): 기본=${ol.base || "-"} / 상방=${ol.bull || "-"} / 하방=${ol.bear || "-"}`,
    );
  }

  if (analysis.stockImplication) {
    out.push(`· 종목 함의(조정장 생존 관점): ${analysis.stockImplication}`);
  }

  if (analysis.confidence) {
    out.push(`· 시황 분석 신뢰도: ${CONFIDENCE_LABEL[analysis.confidence] ?? analysis.confidence}`);
  }

  return `\n\n${out.join("\n")}`;
}

/**
 * 종목분석 프롬프트에 시황 컨텍스트를 주입할지 여부 — **기본 OFF**.
 *
 * PRD `market-context-injection` §2. 운영자가 시황 저장본을 충분히 신뢰(신선·정확)한 뒤에만 켠다.
 * - OFF(기본): 종목분석 라우트가 시황 조회·주입을 아예 하지 않음 → 완전 무회귀.
 * - ON: `getLatestMarketAnalysis()` 저장본을 market·news·PM 프롬프트에 덧붙인다(fail-soft).
 *
 * env `AI_MARKET_CONTEXT_ENABLED` = "1"·"true"·"on"(대소문자 무시) 이면 ON, 그 외/미설정은 OFF.
 * 서버 전용(`NEXT_PUBLIC_` 금지) — 프롬프트는 route handler 안에서만 조립된다.
 */
export function isMarketContextPromptEnabled(): boolean {
  const raw = process.env.AI_MARKET_CONTEXT_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}
