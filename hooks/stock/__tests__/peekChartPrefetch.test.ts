/**
 * Peek 미니 차트 선반입 키 정합 — `warmupFetchDays` 가 useChartData 와 동일 fetch 봉 수를 산출해,
 * 프리패치 쿼리키가 팝오버 마운트 시 `useQueryStockChart` 요청과 정확히 일치함을 고정한다.
 *   (WARMUP_DAYS 를 프리패치 쪽에 복제하면 값 드리프트로 캐시 미스 → 이 테스트가 회귀를 잡는다.)
 */

import { describe, it, expect } from "vitest";
import { warmupFetchDays } from "@/hooks/stock/useChartData";
import { MINI_CHART_DEFAULT_DAYS } from "@/components/stock/MiniStockChart";
import { queryKeys } from "@/hooks/query/queryKeys";

describe("peek 미니 차트 선반입 키 정합", () => {
  it("일봉 워밍업 fetch 봉 수 = 보기 구간 + 워밍업(190), MAX 3000 클램프", () => {
    expect(warmupFetchDays("D", MINI_CHART_DEFAULT_DAYS)).toBe(280); // 90 + 190
    expect(warmupFetchDays("D", 3000)).toBe(3000); // 3190 → 클램프
  });

  it("프리패치 쿼리키가 MiniStockChart 의 useChartData 요청과 동일", () => {
    const days = warmupFetchDays("D", MINI_CHART_DEFAULT_DAYS);
    // MiniStockChart(기본 90) → useChartData("D", 90) → useQueryStockChart("D", 280)
    expect(queryKeys.stock.chart("005930", "D", days)).toEqual([
      "stock",
      "chart",
      "005930",
      "D",
      280,
    ]);
  });
});
