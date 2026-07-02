/**
 * 시세 데이터 소스 토글 — `MARKET_DATA_SOURCE` env 로 kis ↔ toss 를 전환한다.
 *
 * PRD `toss-market-data-adapter` §3-2. 판정 규칙(두 조건 AND):
 *   1. `MARKET_DATA_SOURCE === "toss"` (명시 opt-in — 미설정/그 외 값 전부 kis)
 *   2. `isTossConfigured()` (TOSS_CLIENT_ID/SECRET 존재)
 *
 * → **토스 키가 없는 로컬(동료 머신)은 토글값과 무관하게 기존 KIS 경로 그대로**(목표 2).
 *
 * 적용 범위는 종목 시세·캔들·종목정보 함수 한정(하이브리드) — 지수·수급·관심종목 일괄시세는
 * 토스 API 부재/후속으로 KIS 고정. BFF 라우트의 `isKisConfigured()` mock 게이트도 무변경이라
 * 토스 모드에서도 KIS 키는 여전히 필요하다(§4).
 */

import { isKisConfigured } from "@/lib/api/kis/client";
import { isTossConfigured } from "@/lib/api/toss/client";

export type MarketDataSource = "kis" | "toss";

export function resolveMarketDataSource(): MarketDataSource {
  const value = process.env.MARKET_DATA_SOURCE?.trim().toLowerCase();
  if (value === "toss" && isTossConfigured()) return "toss";
  return "kis";
}

/**
 * 소스 위임 + 폴백 단일 지점 — 기존 KIS 함수 본문 최상단에서 호출한다.
 *
 * - 소스가 kis 면 kisFn 그대로 (무회귀 경로 — 토글 off 시 추가 비용 0).
 * - 소스가 toss 면 tossFn 시도, 실패 시:
 *   - KIS 설정돼 있으면 warn 1줄 남기고 kisFn 폴백 (PRD 목표 3).
 *   - KIS 미설정이면 토스 에러 그대로 전파 (상위 mock 분기·에러 매핑이 기존대로 처리).
 */
export async function withTossFallback<T>(
  label: string,
  tossFn: () => Promise<T>,
  kisFn: () => Promise<T>,
): Promise<T> {
  if (resolveMarketDataSource() !== "toss") return kisFn();

  try {
    return await tossFn();
  } catch (error) {
    if (!isKisConfigured()) throw error;
    console.warn(
      `[marketdata] toss ${label} 실패 — KIS 폴백:`,
      error instanceof Error ? error.message : error,
    );
    return kisFn();
  }
}
