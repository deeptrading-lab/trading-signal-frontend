export type IntradayPortfolioCandidate = {
  ticker: string;
  name: string;
  price: number;
  flowRank?: number;
  volumeRank?: number;
};

export type IntradayPortfolioAllocation = IntradayPortfolioCandidate & {
  score: number;
  allocationPct: number;
  amount: number;
  reasons: string[];
};

export type IntradayPortfolioPlan = {
  totalAmount: number;
  cashBuffer: number;
  investedAmount: number;
  allocations: IntradayPortfolioAllocation[];
};

export const INTRADAY_PORTFOLIO_MIN_AMOUNT = 1_000_000;
const CASH_BUFFER_PCT = 10;

function targetCount(amount: number, candidateCount: number): number {
  const desired = amount >= 30_000_000 ? 5 : amount >= 10_000_000 ? 4 : 3;
  return Math.min(desired, candidateCount);
}

function candidateScore(candidate: IntradayPortfolioCandidate): number {
  const flowScore = candidate.flowRank === undefined ? 0 : 12 - Math.min(candidate.flowRank, 10);
  const volumeScore =
    candidate.volumeRank === undefined ? 0 : 12 - Math.min(candidate.volumeRank, 10);
  const overlapBonus =
    candidate.flowRank !== undefined && candidate.volumeRank !== undefined ? 5 : 0;
  return flowScore * 1.15 + volumeScore + overlapBonus;
}

function roundToTenThousand(value: number): number {
  return Math.floor(value / 10_000) * 10_000;
}

/**
 * 수급·거래량 순위를 합산해 3~5종목을 고르고, 현금 10%를 남긴 뒤 점수 비례로 원화를 배분한다.
 * 동일 점수는 ticker 순으로 고정해 같은 입력이면 항상 같은 계획이 나온다.
 */
export function buildIntradayPortfolioPlan(
  totalAmount: number,
  candidates: IntradayPortfolioCandidate[],
): IntradayPortfolioPlan {
  if (!Number.isFinite(totalAmount) || totalAmount < INTRADAY_PORTFOLIO_MIN_AMOUNT) {
    throw new Error("자동 포트폴리오는 100만원부터 시작할 수 있어요.");
  }

  const unique = new Map<string, IntradayPortfolioCandidate>();
  for (const candidate of candidates) {
    if (!candidate.ticker || !candidate.name || candidate.price <= 0) continue;
    const previous = unique.get(candidate.ticker);
    unique.set(candidate.ticker, {
      ...(previous ?? candidate),
      ...candidate,
      flowRank: candidate.flowRank ?? previous?.flowRank,
      volumeRank: candidate.volumeRank ?? previous?.volumeRank,
    });
  }

  const ranked = [...unique.values()]
    .map((candidate) => ({ candidate, score: candidateScore(candidate) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.ticker.localeCompare(b.candidate.ticker));
  const selected = ranked.slice(0, targetCount(totalAmount, ranked.length));
  if (selected.length < 2) {
    throw new Error("수급·거래량 후보가 충분하지 않아요. 잠시 후 다시 시도해 주세요.");
  }

  const cashBuffer = roundToTenThousand((totalAmount * CASH_BUFFER_PCT) / 100);
  const scoreSum = selected.reduce((sum, item) => sum + item.score, 0);
  const amounts = selected.map((item) =>
    roundToTenThousand((totalAmount * item.score) / scoreSum),
  );
  const remainder = totalAmount - amounts.reduce((sum, amount) => sum + amount, 0);
  amounts[0] += remainder;

  const allocations = selected.map(({ candidate, score }, index) => {
    const reasons: string[] = [];
    if (candidate.flowRank !== undefined) reasons.push(`수급 ${candidate.flowRank}위`);
    if (candidate.volumeRank !== undefined) reasons.push(`거래량 ${candidate.volumeRank}위`);
    return {
      ...candidate,
      score,
      amount: amounts[index],
      allocationPct: Number(((amounts[index] / totalAmount) * 100).toFixed(1)),
      reasons,
    };
  });

  return {
    totalAmount,
    cashBuffer,
    // 각 종목 세션이 동일한 10% cashBufferPct를 적용하므로 합산 실제 투자 가능액도 총액의 90%다.
    investedAmount: totalAmount - cashBuffer,
    allocations,
  };
}
