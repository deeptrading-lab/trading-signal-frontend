/**
 * `/api/stock/chart-minute` 클라이언트 어댑터 — 분봉(단타워치·종목 상세 차트 탭).
 *
 * KIS/토스 직접 호출 금지(BFF 원칙). `hooks/stock/useQueryMinuteChart` 안에서만 호출한다.
 *
 * `priorDays` 0 = 당일 한 세션(기존 `bars` 캡 경로), >0 = 과거 거래일 포함 멀티데이
 *   (라우트가 `fetchMinuteHistory` 로 전환). 멀티데이는 `bars` 대신 `priorDays` 로 범위를 정한다.
 */

import { httpClient } from "@/lib/api/client";
import type { StockMinuteCandle } from "@/lib/api/kis/types";

export async function getStockMinuteChart(
  ticker: string,
  timeframe: number,
  bars: number,
  priorDays: number = 0,
): Promise<StockMinuteCandle[]> {
  const response = await httpClient.get<StockMinuteCandle[]>("/stock/chart-minute", {
    params: priorDays > 0 ? { ticker, timeframe, priorDays } : { ticker, timeframe, bars },
  });
  return response.data;
}
