/**
 * Dashboard 도메인 어댑터 — 보유 종목 multi-price 조회.
 *
 * PRD `stock-api-integration` (PR-C) §3.5 — Dashboard 도메인 어댑터만 신설, 화면 전환 X.
 *
 * 인터페이스:
 *   `getHoldings(tickers: string[]): Promise<HoldingQuote[]>` — 보유 종목 ticker 배열을 입력받아
 *   각 종목의 현재가 + 종목명 + 등락을 반환. 화면 컴포넌트가 보유 수량과 곱해 평가 금액 계산.
 *
 * 구현 전략 (KIS multi-price API 확인 결과):
 *   - KIS `inquire-multiple-price` 엔드포인트는 존재하나 별도 TR_ID 필요 + 종목당 30개 제한.
 *   - 본 PR-C 는 **PR-A 의 `/api/stock/price` BFF 반복 호출 + Promise.all** 패턴 채택.
 *   - 이유:
 *     1. PR-A 의 토큰 single-flight + mock fallback 인프라를 그대로 재활용.
 *     2. TanStack Query 의 캐싱 + queryKeys 표준 정합 (각 ticker 별 캐시 hit 가능).
 *     3. KIS 신규 TR_ID 도입은 후속 PR 자연 진입 (성능 데이터 기반).
 *   - 빈 배열 입력 시 빈 배열 즉시 반환 (네트워크 호출 0).
 *
 * 후속 화면 전환 PR 들 (별도 slug) 이 본 어댑터를 import 한다.
 */

import { fetchStockPriceClient } from "@/lib/api/stock/price";
import type { StockPrice } from "@/lib/api/kis/types";

/**
 * 보유 종목 현재가 응답 — 화면 컴포넌트가 보유 수량과 곱해 평가 금액 계산.
 *
 * `StockPrice` 그대로 노출하지 않고 도메인 친화 별칭으로 1차 분리 — 후속 PR 이 보유 수량·
 * 평균 단가 등 도메인 필드를 추가할 때 자연 확장.
 */
export type HoldingQuote = StockPrice;

/**
 * 보유 종목 multi-price 조회 — 각 ticker 별 PR-A 의 stock/price BFF 호출 + Promise.all 병렬.
 *
 * 실패 정책: Promise.all 은 첫 reject 즉시 전체 reject. 한 종목 실패 시 전체 실패.
 *   - 의도적 — 보유 종목 중 일부만 노출되면 평가 금액이 부정확해 오히려 위험.
 *   - 후속 PR 이 부분 실패 graceful degrade 필요 시 `Promise.allSettled` 로 자연 전환 가능.
 */
export async function getHoldings(
  tickers: readonly string[],
): Promise<HoldingQuote[]> {
  if (tickers.length === 0) {
    return [];
  }
  const quotes = await Promise.all(
    tickers.map((ticker) => fetchStockPriceClient(ticker)),
  );
  return quotes;
}
