/**
 * 시황 레이어 — 지수 집중도 계산 (순수함수).
 *
 * PRD `market-snapshot` §3.1 (5). "지수 변동의 몇 %가 소수 대형주(삼성·하이닉스)에서 나왔나"를
 * 정량화한다 — 사용자가 가장 원한 시스템 리스크 신호.
 *
 * ## 근사 한계 (반드시 인지)
 *
 * 지수 전체 구성종목 리스트가 없으므로 **시총상위 바스켓(MEGACAP) 한정 상대 집중도**다.
 * 종목 기여도 ≈ (정규화 시총가중치) × (등락률). 분모는 바스켓 내 합이라, 실제 지수 변동분과
 * 정확히 일치하지 않는다. 스냅샷은 이 한계를 `warnings` 로 노출한다.
 */

import type { MegacapMember } from "./baskets";
import type {
  Concentration,
  ConcentrationInterpretation,
  Contributor,
} from "./types";

export type QuoteLite = { changePercent: number };

/** 집중도 해석 임계값(topNContributionPct 기준, 휴리스틱). */
const VERY_NARROW_PCT = 65;
const NARROW_PCT = 40;

/**
 * 시총상위 바스켓 한정 지수 집중도.
 *
 * @param quotesByTicker ticker → 시세(등락률). 누락 종목은 제외(가중치는 잔존 종목으로 재정규화).
 * @param megacap        시총상위 바스켓(ticker/name/weight).
 * @param topN           기여 비중 산출 기준 상위 N(기본 5).
 * @param asOf           바스켓 가중치 기준일(`BASKETS_AS_OF`).
 */
export function computeConcentration(
  quotesByTicker: Map<string, QuoteLite>,
  megacap: readonly MegacapMember[],
  topN: number,
  asOf: string,
): Concentration | null {
  // 시세 확보 종목만.
  const present = megacap
    .map((m) => ({ m, q: quotesByTicker.get(m.ticker) }))
    .filter((x): x is { m: MegacapMember; q: QuoteLite } =>
      x.q != null && Number.isFinite(x.q.changePercent),
    );
  if (present.length === 0) return null;

  const totalWeight = present.reduce((acc, x) => acc + x.m.weight, 0);
  if (totalWeight <= 0) return null;

  const contributors: Contributor[] = present.map(({ m, q }) => {
    const weight = m.weight / totalWeight; // 잔존 종목으로 재정규화(0~1).
    const contribution = weight * q.changePercent;
    return {
      ticker: m.ticker,
      name: m.name,
      changePct: round2(q.changePercent),
      weight: round4(weight),
      contribution: round4(contribution),
    };
  });

  const netTotal = contributors.reduce((acc, c) => acc + c.contribution, 0);
  const direction: Concentration["direction"] =
    netTotal > 0.01 ? "up" : netTotal < -0.01 ? "down" : "mixed";

  // 지배 방향(상승장이면 +, 하락장이면 -) 기준으로 "상위 N 의 기여 비중" 산출.
  const dirSign = netTotal >= 0 ? 1 : -1;
  const dirMagnitude = (c: Contributor) => Math.max(0, dirSign * c.contribution);
  const dirTotal = contributors.reduce((acc, c) => acc + dirMagnitude(c), 0);

  const byDir = [...contributors].sort((a, b) => dirMagnitude(b) - dirMagnitude(a));
  const topNDirSum = byDir.slice(0, topN).reduce((acc, c) => acc + dirMagnitude(c), 0);
  const topNContributionPct =
    dirTotal > 0 ? round1((topNDirSum / dirTotal) * 100) : null;

  const interpretation = classify(topNContributionPct);

  // 출력은 |기여도| 내림차순(가장 큰 동인 먼저).
  contributors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    basis: "kospi_top_mcap",
    topN,
    topNContributionPct,
    direction,
    contributors,
    interpretation,
    asOf,
  };
}

function classify(pct: number | null): ConcentrationInterpretation {
  if (pct == null) return "broad";
  if (pct >= VERY_NARROW_PCT) return "very_narrow";
  if (pct >= NARROW_PCT) return "narrow";
  return "broad";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
