/**
 * 스윙 판정 — 규칙서(`rulebook.ts`)를 그대로 적용해 등급·체크리스트·매매 계획을 낸다.
 *
 * PRD `swing-judgment` §3-1. 순수 함수 — 같은 입력이면 같은 출력(시계·난수·IO 없음).
 * 일찍 끝내지 않는다: 제외 종목이어도 계산 가능한 조건은 모두 채워 체크리스트를 온전히 보여 준다.
 */

import { findDoubleBottom, type DoubleBottom } from "./patterns";
import { buildPlan, type SwingPlan } from "./plan";
import {
  computeFeatures,
  windowOf,
  type SwingFeatures,
  type SwingInput,
  type SwingStage,
} from "./features";
import { RULEBOOK, type Rulebook, type SwingMarket } from "./rulebook";

export type SwingGrade = "excluded" | "candidate" | "interest" | "neutral";

export type SwingExclusion =
  | "insufficient_data"
  | "illiquid"
  | "halted"
  | "spac_reit"
  | "high_volatility"
  | "overheated"
  | "dart_event";

/** 조건 하나 — pass=null 은 데이터가 없어 판정 불가. */
export type SwingItem = { pass: boolean | null };

export type SwingItems = {
  /** 개인 순매도. */
  A1: SwingItem;
  /** 외국인 순매수. */
  A2: SwingItem;
  /** 기관 순매수 + 사모 주도 아님. */
  A3: SwingItem;
  /** 연기금 순매수(가점 — 표시·정렬만). */
  Aplus: SwingItem;
  /** 수급 1차 관문 = A1 ∧ A2 ∧ A3. */
  A: SwingItem;
  /** 손절 근거가 구조적이고 손익비 ≥ minRr. */
  B: SwingItem;
  /** 과열·하락추세 아님. */
  C: SwingItem;
  /** 모멘텀 전환(골든크로스 + 적정 RSI). */
  D: SwingItem;
  /** 쌍바닥 + MACD 상승 다이버전스. */
  E: SwingItem;
};

export type SwingJudgment = {
  rulebookVersion: string;
  ticker: string;
  market: SwingMarket;
  asOf: string;
  close: number;
  grade: SwingGrade;
  exclusions: SwingExclusion[];
  stage: SwingStage | null;
  items: SwingItems;
  plan: SwingPlan | null;
  doubleBottom: DoubleBottom | null;
  /** 표시용 수치(macdLine 제외). */
  features: Omit<SwingFeatures, "macdLine">;
};

const item = (pass: boolean | null): SwingItem => ({ pass });
const and = (...xs: SwingItem[]): SwingItem =>
  item(xs.some((x) => x.pass === false) ? false : xs.every((x) => x.pass === true) ? true : null);

export function judgeSwing(input: SwingInput, rb: Rulebook = RULEBOOK): SwingJudgment {
  const f = computeFeatures(input, rb);
  const w = windowOf(input.bars, rb.windowBars);

  // ── 제외 ──
  const exclusions: SwingExclusion[] = [];
  if (f.barCount < rb.windowBars || !f.flowComplete) exclusions.push("insufficient_data");
  if (
    f.close < rb.liquidity.minClose ||
    (f.adv20 !== null && f.adv20 < rb.liquidity.minAdv20Won)
  ) {
    exclusions.push("illiquid");
  }
  if (f.halted) exclusions.push("halted");
  if (rb.excludeNamePatterns.some((p) => new RegExp(p).test(input.name))) exclusions.push("spac_reit");
  if (f.atrPct !== null && f.atrPct >= rb.highVolAtrPct[input.market]) exclusions.push("high_volatility");
  if (f.stage === "overheated") exclusions.push("overheated");
  if (f.dartReports.length > 0) exclusions.push("dart_event");

  // ── A 수급 ──
  const n = rb.flow.days;
  const th = rb.flow.thresholdPerDay * n;
  const fl = f.flow;
  const A1 = item(fl ? fl.person <= -th : null);
  const A2 = item(fl ? fl.foreign >= th : null);
  const A3 = item(
    fl ? fl.institution >= th && fl.privateEquity < rb.flow.peMaxShareOfInstitution * fl.institution : null,
  );
  const Aplus = item(fl ? fl.pension >= rb.flow.pensionBonusPerDay * n : null);
  const A = and(A1, A2, A3);

  // ── C 국면 ──
  const C = item(f.stage === null ? null : f.stage !== "overheated" && f.stage !== "downtrend");

  // ── D 모멘텀 ──
  const crossed = f.macdCrossAgo !== null || f.maCrossAgo !== null;
  const D = item(
    f.rsi === null ? null : crossed && f.rsi >= rb.momentum.rsiMin && f.rsi <= rb.momentum.rsiMax,
  );

  // ── E 쌍바닥 + 다이버전스 ──
  const doubleBottom = findDoubleBottom(w, f.macdLine, rb);
  const E = item(doubleBottom !== null && doubleBottom.divergence);

  // ── B 매물대·계획 ──
  const plan = buildPlan(w, f.atr, doubleBottom, rb);
  const B = item(
    plan === null ? null : plan.stopSource !== "atr" && plan.rr !== null && plan.rr >= rb.plan.minRr,
  );

  const items: SwingItems = { A1, A2, A3, Aplus, A, B, C, D, E };
  const { macdLine: _macd, ...features } = f;
  void _macd;

  return {
    rulebookVersion: rb.version,
    ticker: input.ticker,
    market: input.market,
    asOf: f.asOf,
    close: f.close,
    grade: gradeOf(exclusions, items),
    exclusions,
    stage: f.stage,
    items,
    plan,
    doubleBottom,
    features,
  };
}

/** 등급 — 제외 > 매수 후보(A∧C∧B∧(D∨E)) > 관심(A∧C∧(B∨D∨E)) > 관망. 판정 불가(null) 조건은 미충족으로 본다. */
export function gradeOf(exclusions: SwingExclusion[], it: SwingItems): SwingGrade {
  if (exclusions.length > 0) return "excluded";
  const ok = (x: SwingItem) => x.pass === true;
  if (!ok(it.A) || !ok(it.C)) return "neutral";
  const dOrE = ok(it.D) || ok(it.E);
  if (ok(it.B) && dOrE) return "candidate";
  if (ok(it.B) || dOrE) return "interest";
  return "neutral";
}

/** 같은 등급 안 정렬 — 연기금 순매수 → 손익비 내림차순 → 종목코드 오름차순(안정 정렬 = 결정성). */
export function compareJudgments(a: SwingJudgment, b: SwingJudgment): number {
  const rank: Record<SwingGrade, number> = { candidate: 0, interest: 1, neutral: 2, excluded: 3 };
  if (rank[a.grade] !== rank[b.grade]) return rank[a.grade] - rank[b.grade];
  const pa = a.items.Aplus.pass === true ? 0 : 1;
  const pb = b.items.Aplus.pass === true ? 0 : 1;
  if (pa !== pb) return pa - pb;
  const ra = a.plan?.rr ?? -Infinity;
  const rbv = b.plan?.rr ?? -Infinity;
  if (ra !== rbv) return rbv - ra;
  return a.ticker.localeCompare(b.ticker);
}
