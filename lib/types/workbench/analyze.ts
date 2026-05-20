/**
 * BE `POST /api/workbench/analyze` 요청/응답 타입.
 *
 * 실제 BE 응답 구조는 `{ analysis: AnalyzeAnalysis }` 단일 envelope 이며,
 * 이 안에 PRD §1 이 말한 6블록(brief / feasibility / horizons / risk_plan / action / warnings) 이 들어 있다.
 * 후속 PRD 가 화면에서 import 하기 편하도록 각 블록을 named type 으로 노출한다.
 *
 * BE 가 새 필드를 추가해도 화면이 깨지지 않도록 핵심 외 필드는 옵셔널로 둔다.
 */

import type { WhitelistItem } from "@/lib/types/workbench/whitelist";

/* -------------------------------------------------------------------------- */
/* 요청                                                                       */
/* -------------------------------------------------------------------------- */

export type AnalyzeRequest = {
  ticker: string;
  capital_amount: number;
  target_return_pct: number;
  target_period_days: number;
  /** BE 기본값 2.0. 입력 사전 차단은 0 < x <= 5. */
  max_loss_pct?: number;
  /** 본 PRD 는 타입에만 흘려두고, UI 노출 정책은 후속 PRD. */
  offline?: boolean;
};

/* -------------------------------------------------------------------------- */
/* 6블록 — brief                                                              */
/* -------------------------------------------------------------------------- */

export type BriefDataQuality = {
  price?: string;
  technicals?: string;
  news?: string;
  events?: string;
  source?: string;
};

export type BriefComponentScores = {
  trend?: number;
  momentum?: number;
  volume?: number;
  volatility_risk?: number;
  news_event?: number;
  market_regime?: number;
};

export type Brief = {
  ticker: string;
  asset_type: string;
  action: string;
  confidence: string;
  score: number;
  timeframe: string;
  reference_price: number;
  entry_condition: string;
  invalidation: string;
  upside_reference_pct: number | null;
  downside_reference_pct: number | null;
  risk_reward: number | null;
  reasons: string[];
  risks: string[];
  data_quality: BriefDataQuality;
  component_scores: BriefComponentScores;
  generated_at: string;
  disclaimer: string;
};

/* -------------------------------------------------------------------------- */
/* 6블록 — feasibility                                                        */
/* -------------------------------------------------------------------------- */

/**
 * BE 가 문자열 enum (`REALISTIC` / `UNREALISTIC` / `STRETCH` 등) 으로 돌려준다.
 * 라벨 매핑은 후속 PRD 화면에서 수행한다.
 */
export type Feasibility = string;

/* -------------------------------------------------------------------------- */
/* 6블록 — horizons                                                           */
/* -------------------------------------------------------------------------- */

export type HorizonDirection = "BULLISH" | "BEARISH" | "NEUTRAL" | string;

export type Horizon = {
  label: string;
  start_date: string;
  end_date: string;
  start_price: number;
  end_price: number;
  high: number;
  low: number;
  return_pct: number;
  max_drawdown_pct: number;
  volume_change_pct: number;
  direction: HorizonDirection;
};

export type Horizons = Horizon[];

/* -------------------------------------------------------------------------- */
/* 6블록 — risk_plan                                                          */
/* -------------------------------------------------------------------------- */

export type RiskPlan = {
  suggested_buy_amount: number;
  suggested_share_qty: number;
  entry_price: number;
  take_profit_price_for_day: number;
  stop_loss_price_for_day: number;
  invalidation_condition: string;
  expected_loss_if_stopped: number;
  expected_gain_if_take_profit: number;
  risk_reward_ratio: number;
};

/* -------------------------------------------------------------------------- */
/* 6블록 — action                                                             */
/* -------------------------------------------------------------------------- */

/**
 * BE 가 최상위 권고 액션을 문자열 enum 으로 돌려준다.
 * 예: `BUY` / `AVOID` / `HOLD` / `REDUCE_RISK`. 라벨 매핑은 후속 PRD.
 */
export type Action = string;

/* -------------------------------------------------------------------------- */
/* 6블록 — warnings                                                           */
/* -------------------------------------------------------------------------- */

/**
 * BE 가 string[] 으로 돌려준다. 향후 객체 구조로 확장될 수 있어 union 으로 둔다.
 */
export type Warning = string | { message: string; level?: string };

export type Warnings = Warning[];

/* -------------------------------------------------------------------------- */
/* 응답 envelope                                                              */
/* -------------------------------------------------------------------------- */

export type AnalyzeInputEcho = {
  ticker: string;
  capital_amount: number;
  target_return_pct: number;
  target_period_days: number;
  risk_preference?: string;
  max_loss_pct: number;
};

export type AnalyzeAnalysis = {
  input: AnalyzeInputEcho;
  whitelist_entry: WhitelistItem;
  brief: Brief;
  feasibility: Feasibility;
  annualized_target_return_pct: number;
  horizons: Horizons;
  risk_plan: RiskPlan;
  position: unknown | null;
  action: Action;
  ai_summary: string | null;
  warnings: Warnings;
};

export type AnalyzeResponse = {
  analysis: AnalyzeAnalysis;
};
