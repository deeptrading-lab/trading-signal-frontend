/**
 * 종목 호가창(매수/매도 잔량) — `/api/stock/orderbook` BFF 앱 표준 타입.
 *
 * PRD `toss-orderbook` §3-2. 원천은 토스 `GET /api/v1/orderbook`(매도 10 + 매수 10 단계).
 * 토스 원본 문자열 스키마(`TossOrderbook`, `lib/api/toss/types.ts`)를 어댑터가 숫자로 파싱·정규화한
 * 결과가 이 타입이다. 화면(`OrderbookPanel`)은 이 표준 형태만 소비한다.
 */

export type OrderbookLevel = {
  /** 호가 가격(원). */
  price: number;
  /** 잔량(주). */
  qty: number;
  /** 주문 건수 — 스키마에 있으면 채우고 없으면 null. */
  count?: number | null;
};

export type Orderbook = {
  /** 매수 호가 — 최우선(최고가)부터 내림차순. */
  bids: OrderbookLevel[];
  /** 매도 호가 — 최우선(최저가)부터 오름차순. */
  asks: OrderbookLevel[];
  /** 총 매수 잔량(각 단계 합). */
  totalBidQty: number;
  /** 총 매도 잔량(각 단계 합). */
  totalAskQty: number;
  /** 스프레드 = 최우선 매도 − 최우선 매수. 한쪽이라도 없으면 null. */
  spread: number | null;
  /** 스프레드 비율(%) = 스프레드 / 중간가 × 100. 산출 불가 시 null. */
  spreadPct: number | null;
  /** 시세 산출 시각(ISO 8601 +09:00). 빈 호가면 null. */
  updatedAt: string | null;
  /** 매수·매도 모두 유효 단계 0 = 빈 호가(장 마감/미지원). */
  isEmpty: boolean;
};

export type StockOrderbookResponse = {
  orderbook: Orderbook;
};

/** 빈 호가(키 없음·실패·장 마감) — never-throw 디그레이드 기본값. */
export const EMPTY_ORDERBOOK: Orderbook = {
  bids: [],
  asks: [],
  totalBidQty: 0,
  totalAskQty: 0,
  spread: null,
  spreadPct: null,
  updatedAt: null,
  isEmpty: true,
};
