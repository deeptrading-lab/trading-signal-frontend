/**
 * 과거 통계 조회 — `lib/swing/stats-v1.json`(오프라인 감사 산출, 규칙서 가드 테스트로 버전 고정).
 */

import stats from "@/lib/swing/stats-v1.json";
import type { SwingJudgment } from "@/lib/swing/judge";
import type { SwingMarket } from "@/lib/swing/rulebook";
import type { SwingReleaseMode, SwingStatsCell } from "@/lib/types/swing/api";

type Cell = SwingStatsCell & { kind: string; grade?: string; market: string; year: string };
const CELLS = stats.cells as unknown as Cell[];

export const SWING_RELEASE = stats.release as Record<SwingMarket, SwingReleaseMode>;

const strip = (c: Cell | undefined): SwingStatsCell | null => {
  if (!c) return null;
  const { n, days, hidden, upRate, upRateCI, meanR10, medianR10, meanExcess10, baseUpRate, baseMeanR10, plan } = c;
  return { n, days, hidden, upRate, upRateCI, meanR10, medianR10, meanExcess10, baseUpRate, baseMeanR10, plan };
};

/** 등급 셀 + 같은 시장 유니버스 셀(전 연도). */
export function swingStatsFor(
  grade: SwingJudgment["grade"],
  market: SwingMarket,
): { grade: SwingStatsCell | null; universe: SwingStatsCell | null } {
  return {
    grade: strip(CELLS.find((c) => c.kind === "grade" && c.grade === grade && c.market === market && c.year === "ALL")),
    universe: strip(CELLS.find((c) => c.kind === "universe" && c.market === market && c.year === "ALL")),
  };
}
