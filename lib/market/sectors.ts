/**
 * 시황 레이어 — 테마 바스켓 성과 계산 (순수함수).
 *
 * PRD `market-snapshot` §3.1 (4). 일괄 시세(`fetchIntstockMultprice`)로 받은 종목별 등락률을
 * 테마 바스켓 단위로 동일가중 집계한다. KIS 가 세분 섹터 지수를 안 주는 것의 대용물.
 */

import type { ThemeBasket } from "./baskets";
import type { SectorPerf, SectorLeader } from "./types";

/** 등락률만 필요한 시세 라이트 뷰(`WatchlistQuote` 호환). */
export type QuoteLite = { changePercent: number };

/** leaders 로 노출할 상위 종목 수. */
const LEADERS_TOP_N = 3;

/**
 * 테마 바스켓별 당일 성과 — 시세 확보 종목의 동일가중 평균.
 *
 * @param quotesByTicker ticker → 시세(등락률). 누락 종목은 집계에서 제외(부분 성공 허용).
 * @param baskets        테마 바스켓 정의.
 * @param nameByTicker   ticker → 표시명(multprice 응답은 종목명을 안 주므로 외부 주입).
 * @returns 시세를 1종목 이상 확보한 바스켓만. changePct 내림차순 정렬.
 */
export function computeSectorPerf(
  quotesByTicker: Map<string, QuoteLite>,
  baskets: readonly ThemeBasket[],
  nameByTicker: Map<string, string>,
): SectorPerf[] {
  const result: SectorPerf[] = [];

  for (const basket of baskets) {
    const present: Array<{ ticker: string; name: string; changePct: number }> = [];
    for (const [ticker, name] of basket.members) {
      const quote = quotesByTicker.get(ticker);
      if (!quote || !Number.isFinite(quote.changePercent)) continue;
      present.push({
        ticker,
        name: nameByTicker.get(ticker) ?? name,
        changePct: quote.changePercent,
      });
    }
    if (present.length === 0) continue; // 시세 0종목 → 바스켓 스킵.

    const sum = present.reduce((acc, p) => acc + p.changePct, 0);
    const changePct = round2(sum / present.length);
    const upCount = present.filter((p) => p.changePct > 0).length;
    const downCount = present.filter((p) => p.changePct < 0).length;

    const leaders: SectorLeader[] = [...present]
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, LEADERS_TOP_N)
      .map((p) => ({ ticker: p.ticker, name: p.name, changePct: round2(p.changePct) }));

    result.push({
      key: basket.key,
      label: basket.label,
      changePct,
      upCount,
      downCount,
      memberCount: present.length,
      leaders,
      weightMode: "equal",
    });
  }

  return result.sort((a, b) => b.changePct - a.changePct);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
