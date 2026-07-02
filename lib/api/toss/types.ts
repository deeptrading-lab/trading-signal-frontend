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
