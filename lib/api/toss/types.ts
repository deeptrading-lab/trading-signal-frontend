/**
 * 토스증권 Open API 응답 타입.
 *
 * PRD `toss-market-data-adapter` §6 — 스펙 출처는 `openapi.tossinvest.com/openapi-docs/latest/openapi.json`
 * + 2026-07-02 스모크 실측(`scripts/tossSmokeTest.mjs`).
 *
 * ## 응답 규약 (KIS 와 다른 점)
 *
 * - 성공 응답은 `{ result: ... }` 래핑, 실패는 `{ error: { requestId, code, message, data } }` (HTTP 4xx/5xx).
 *   KIS 의 `rt_cd` 분기와 달리 HTTP status 로 성패가 갈린다.
 * - 숫자는 전부 문자열("288500"). KIS 관례와 동일해 `toNumber` 계열 방어가 그대로 유효.
 * - 캔들 `timestamp` 는 **시장 로컬 자정/분 anchor 를 `+09:00` 오프셋으로 표기**한 ISO 8601.
 *   국내 일봉 = `T00:00:00+09:00`, 미국 일봉 = `T13:00:00+09:00`(=미국 자정). date 키 변환은
 *   반드시 `kst.ts` 유틸 경유(서버 타임존 비의존) — 문자열 slice 금지.
 */

export type TossErrorBody = {
  error?: {
    requestId?: string;
    code?: string;
    message?: string;
    data?: unknown;
  };
};

/** `GET /api/v1/prices` 종목 1건 — 이 4필드가 전부(등락률·거래량 없음, PRD §1). */
export type TossPriceRow = {
  symbol?: string;
  /** ISO 8601 (+09:00). 시세 산출 시각. */
  timestamp?: string;
  lastPrice?: string;
  currency?: string;
};

/** `GET /api/v1/candles` 캔들 1건. interval 은 "1m" | "1d" 뿐(주/월봉은 리샘플). */
export type TossCandle = {
  /** ISO 8601 (+09:00). 봉 시작 anchor. */
  timestamp?: string;
  openPrice?: string;
  highPrice?: string;
  lowPrice?: string;
  closePrice?: string;
  volume?: string;
  currency?: string;
};

/** `GET /api/v1/candles` 페이지 — `nextBefore` 커서로 과거 방향 페이징. */
export type TossCandlePage = {
  candles?: TossCandle[];
  /** 다음 페이지 커서(ISO 8601). null 이면 끝. */
  nextBefore?: string | null;
};

export type TossKoreanMarketDetail = {
  liquidationTrading?: boolean;
  nxtSupported?: boolean;
  krxTradingSuspended?: boolean;
  nxtTradingSuspended?: boolean;
};

/**
 * `GET /api/v1/stocks/{symbol}/warnings` 항목 — 매수 유의사항(시장경보·VI).
 * 활성(오늘 적용 중) 항목만 응답. warningType 은 enum + unknown 허용 의무(스펙 명시).
 * ⚠️ 실측(2026-07-03): 지정 중인 종목도 exchange·startDate·endDate 가 null 로 옴 —
 * warningType 존재만 신뢰하고 날짜 필드에 의존하지 않는다.
 */
export type TossStockWarning = {
  warningType?: string;
  exchange?: string | null;
  /** YYYY-MM-DD (KST). */
  startDate?: string | null;
  endDate?: string | null;
};

/** `GET /api/v1/orderbook` 호가 1단계 — price·volume 은 문자열(KIS 관례와 동일, toNumber 방어). */
export type TossOrderbookLevel = {
  /** 호가 가격(문자열, 예 "288500"). */
  price?: string;
  /** 잔량(문자열, 주). */
  volume?: string;
};

/**
 * `GET /api/v1/orderbook?symbol=` 응답 — 매도(asks)·매수(bids) 각 10단계.
 * 국내·미국 공통 스키마. ⚠️ 실측(2026-07-04):
 *   - `asks` 는 price 오름차순(asks[0]=최우선=최저 매도호가), `bids` 는 내림차순(bids[0]=최우선=최고 매수호가).
 *   - 장 마감·미지원 종목은 `asks: []`, `bids: []`(빈 배열)로 옴 — 빈 호가로 디그레이드.
 */
export type TossOrderbook = {
  /** ISO 8601 (+09:00). 시세 산출 시각. */
  timestamp?: string;
  currency?: string;
  asks?: TossOrderbookLevel[];
  bids?: TossOrderbookLevel[];
};

/** `GET /api/v1/stocks` 종목 마스터 1건. 국내·미국 공통 스키마(미국은 koreanMarketDetail=null). */
export type TossStockRow = {
  symbol?: string;
  /** 한글명("삼성전자"·"애플"). */
  name?: string;
  englishName?: string;
  isinCode?: string;
  /** "KOSPI" | "KOSDAQ" | "KONEX" | "NASDAQ" | "NYSE" 등. */
  market?: string;
  /** "STOCK" | "ETF" 등. */
  securityType?: string;
  isCommonShare?: boolean;
  status?: string;
  currency?: string;
  listDate?: string;
  delistDate?: string | null;
  /** 상장주식수 — 시총 = lastPrice × sharesOutstanding. */
  sharesOutstanding?: string;
  leverageFactor?: string | null;
  koreanMarketDetail?: TossKoreanMarketDetail | null;
};
