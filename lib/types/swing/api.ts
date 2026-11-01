/**
 * 스윙 판정 BFF 응답 타입 — `/api/swing/screener`, `/api/swing/judgment/[ticker]` (PRD `swing-judgment` PR-2).
 */

import type { SwingJudgment } from "@/lib/swing/judge";
import type { SwingMarket } from "@/lib/swing/rulebook";
import type { StockWarningItem } from "@/lib/types/stock/warnings";

/** 사전 등록 결정표 결과 — PR-1 은 두 시장 모두 checklist. */
export type SwingReleaseMode = "graded" | "graded_reference_levels" | "checklist";

/** 과거 통계 셀(`lib/swing/stats-v1.json`) — 진입 단위, 10거래일. */
export type SwingStatsCell = {
  n: number;
  days: number;
  /** n < 30 — 화면에 숫자를 보여 주지 않는다. */
  hidden: boolean;
  upRate: number | null;
  upRateCI: { lo: number | null; hi: number | null };
  meanR10: number | null;
  medianR10: number | null;
  meanExcess10: number | null;
  baseUpRate: number | null;
  baseMeanR10: number | null;
  plan: {
    n: number;
    invalidShare: number | null;
    targetFirst: number | null;
    stopFirst: number | null;
    timeExit: number | null;
    meanNet: number | null;
    meanDaysHeld: number | null;
  };
};

export type SwingScreenerFilter = "flow" | "excluded" | "all";

export type SwingScreenerItem = {
  ticker: string;
  name: string;
  market: SwingMarket;
  grade: SwingJudgment["grade"];
  /** 충족 조건 수(수급 3 + 매물대·국면·모멘텀·쌍바닥 = 7 중). */
  metCount: number;
  flowPass: boolean;
  exclusions: string[];
  /** 조건 비트(`lib/server/swing/row.ts` SWING_ITEM_BITS 순서). */
  items: number;
  stage: string | null;
  close: number;
  adv20: number | null;
  planStop: number | null;
  planTarget: number | null;
  planRr: number | null;
};

export type SwingScreenerResponse = {
  /** 목록 기준 거래일. 아직 한 번도 안 돌았으면 null. */
  tradeDate: string | null;
  rulebookVersion: string;
  release: Record<SwingMarket, SwingReleaseMode>;
  filter: SwingScreenerFilter;
  items: SwingScreenerItem[];
  /** 마지막 크론 실행 요약. */
  run: { at: string; ok: boolean; tradeDate: string | null } | null;
};

export type SwingJudgmentResponse = {
  tradeDate: string;
  rulebookVersion: string;
  releaseMode: SwingReleaseMode;
  judgment: SwingJudgment;
  inputHash: string;
  /** 같은 거래일 스크리너 저장 행 — 없으면 null. */
  stored: { inputHash: string; grade: string } | null;
  /** 저장 행과 입력 해시가 같은가(같은 입력 = 같은 판정 확인). 저장 행이 없으면 null. */
  matchesStored: boolean | null;
  stats: { grade: SwingStatsCell | null; universe: SwingStatsCell | null };
  /** 현재 시장경보(토스) — 판정에는 쓰지 않는 라이브 오버레이. */
  liveWarnings: StockWarningItem[];
};
