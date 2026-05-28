/**
 * Market 도메인 어댑터 — 시장 지수 조회.
 *
 * PRD `stock-api-integration` (PR-C) §3.5 — Market 도메인 어댑터만 신설, 화면 전환 X.
 *
 * 인터페이스:
 *   `getMarketIndices(codes?: string[]): Promise<MarketIndexQuote[]>`
 *   - codes 기본값 = `DEFAULT_INDEX_CODES` (KOSPI 0001 + KOSDAQ 1001).
 *   - 후속 PR 이 S&P 500 / NASDAQ / USDKRW 등 해외 지수 추가 시 codes 확장.
 *
 * 구현 전략 (KIS 시장지수 API 확인 결과):
 *   - KIS `inquire-index-price` 엔드포인트는 별도 TR_ID (`FHPUP02100000` 등) 필요.
 *   - 본 PR-C 는 **PR-A 의 `/api/stock/price` BFF 반복 호출** 패턴 채택.
 *     - 종목코드 형태 (KOSPI=`0001`, KOSDAQ=`1001`) 가 일반 종목과 동일해 동일 BFF 재활용 가능.
 *     - KIS 응답이 지수 전용 필드 (전일 대비 등) 를 종목과 다른 키로 돌려줄 수 있어 후속 PR
 *       에서 별도 매퍼 도입 가능성 인지 — 본 PR 은 인터페이스만 정착, 매퍼 정밀화는 화면 전환
 *       PR 의 책임.
 *
 * 후속 화면 전환 PR 이 본 어댑터를 import 한다.
 */

import { fetchStockPriceClient } from "@/lib/api/stock/price";
import type { StockPrice } from "@/lib/api/kis/types";

/**
 * 기본 시장 지수 코드 — KOSPI / KOSDAQ.
 * 후속 PR 이 해외 지수 / 환율 / 코인 도미넌스 등 추가 시 codes 인자로 확장.
 */
export const DEFAULT_INDEX_CODES = ["0001", "1001"] as const;

/**
 * 시장 지수 응답 — StockPrice 의 ticker 가 지수 코드, name 이 지수명.
 * 후속 PR 이 도메인 친화 필드 (`region`, `unit` 등) 추가 시 자연 확장.
 */
export type MarketIndexQuote = StockPrice;

export async function getMarketIndices(
  codes: readonly string[] = DEFAULT_INDEX_CODES,
): Promise<MarketIndexQuote[]> {
  if (codes.length === 0) {
    return [];
  }
  const quotes = await Promise.all(
    codes.map((code) => fetchStockPriceClient(code)),
  );
  return quotes;
}
