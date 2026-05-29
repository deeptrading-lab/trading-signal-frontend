/**
 * KIS Developers Open API 클라이언트 모듈 — 본 PR-A 의 진입점.
 *
 * PRD `stock-api-integration` §9 q4 [RESOLVED] — 주문 API 안전장치:
 *
 *   ⚠️ 본 모듈은 **조회 (read-only) 함수만** export 한다.
 *   주문 / 매매 (KIS `order-cash`, `order-credit`, `order-rvsecncl`) 함수는 본 PR-A 에서 의도적으로 export 하지 않는다.
 *
 *   사용자가 실전계좌 (72245021) 도 보유하므로 `KIS_ENV=prod` 환경에서 실수 주문 위험.
 *   주문 API 도입은 별도 PRD `stock-order-integration` 의 책임이며 다음 다중 게이트가 의무:
 *     1. 주문 BFF route (`app/api/order/*`) — 본 PR-A 에서 디렉터리 자체 미생성 (AC-13 검증).
 *     2. 비밀번호 재확인 (계좌비밀번호) — 매 주문 1회.
 *     3. dry-run 모드 — `KIS_DRY_RUN=1` 환경변수 시 모든 주문 호출이 mock 응답.
 *     4. 금액 상한 — 단일 주문 최대 금액 환경변수 (`KIS_ORDER_MAX_KRW`).
 *     5. audit log — 모든 주문 시도/성공/실패를 별도 저장 (DB or 파일).
 *
 *   본 PRD 머지 후 첫 PR 이 주문 API 추가면 reviewer 가 자동 차단.
 *
 * ## 본 PR-A 에서 export 하는 함수
 *
 *   - `fetchStockPrice(ticker)` — 현재가
 *   - `fetchStockDaily(ticker, period)` — 일자별 시세
 *   - `fetchIndexPrice(code)` — 국내 업종 현재지수 (조회 only)
 *   - `searchSymbols(keyword)` — 종목 검색 (symbols.json 기반)
 *   - `getCorpCode(ticker)` — DART corp_code 매핑
 *   - `getAccessToken()` — 토큰 발급 + 캐시 (내부 사용)
 *   - `isKisConfigured()` — 환경변수 설정 여부 (BFF fallback 분기)
 */

export { fetchStockPrice, fetchStockDaily } from "./price";
export { fetchIndexPrice } from "./index-price";
export { searchSymbols, getCorpCode, getSymbolsMeta } from "./search";
export { getAccessToken } from "./token";
export { isKisConfigured, resolveKisEnv } from "./client";
export { INDEX_NAME_BY_CODE } from "./types";
export type {
  StockPrice,
  StockDailyCandle,
  StockSearchResult,
  MarketIndexQuote,
  KisInquireIndexPriceOutput,
} from "./types";
