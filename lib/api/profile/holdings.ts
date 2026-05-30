/**
 * Profile 도메인 어댑터 — 보유 종목 multi-price 조회.
 *
 * home-market-redesign PR1 — `lib/api/dashboard/holdings.ts` 를 profile 도메인으로 이전
 * (계좌 위젯 `/dashboard` → `/profile`). 인터페이스·구현 무변경, 도메인 폴더만 dashboard → profile.
 *
 * 인터페이스:
 *   `getHoldings(tickers: string[]): Promise<HoldingQuote[]>` — 보유 종목 ticker 배열을 입력받아
 *   각 종목의 현재가 + 종목명 + 등락을 반환. 화면 컴포넌트가 보유 수량과 곱해 평가 금액 계산.
 *
 * 구현 전략 (stock-api-integration PR-C 무회귀):
 *   - PR-A 의 `/api/stock/price` BFF 반복 호출 + Promise.all 병렬(KIS multi-price TR 미도입).
 *   - same-origin `/api` 만 사용(브라우저 → FastAPI 직접 호출 0, AGENTS.md BFF 원칙).
 *   - 빈 배열 입력 시 빈 배열 즉시 반환(네트워크 호출 0).
 *
 * 현 PR1 의 자산 섹션은 mock 직접 주입(server)이라 본 어댑터는 실계좌 연동(후속, PRD §8.4)을 위한 준비.
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
 * 보유 종목 multi-price 조회 — 각 ticker 별 stock/price BFF 호출 + Promise.all 병렬.
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
