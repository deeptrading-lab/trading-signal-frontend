/**
 * 종목 매수 유의사항(거래소 시장경보·VI) — `/api/stock/warnings` BFF 응답 타입.
 *
 * PRD `stock-warnings` §6. 원천은 토스 warnings API — **활성(오늘 적용 중) 항목만** 온다.
 * 항목 존재 = 현재 지정/발동 중. 한글 라벨·심각도 매핑은 `lib/copy/stock/warnings.ts`.
 */

export type StockWarningItem = {
  /**
   * 토스 warningType — `LIQUIDATION_TRADING`(정리매매)·`OVERHEATED`(단기과열)·
   * `INVESTMENT_WARNING`(투자경고)·`INVESTMENT_RISK`(투자위험)·`VI_STATIC`/`VI_DYNAMIC`/
   * `VI_STATIC_AND_DYNAMIC`(변동성완화장치)·`STOCK_WARRANTS`(신주인수권).
   * 스펙이 unknown code 허용을 의무화 — enum 밖 값도 그대로 통과(라벨은 폴백 처리).
   */
  warningType: string;
  /** 물리 거래소(KRX·NXT). 거래소 무관 경보는 null. */
  exchange: string | null;
  /**
   * 적용 시작일 YYYY-MM-DD (KST). ⚠️ 실측(2026-07-03, 단기과열 111710): 지정 중인데도
   * null 로 옴 — 기간 필드 의존 금지, 표시는 "지정 중" 상태만.
   */
  startDate: string | null;
  /** 적용 종료일 — 진행 중/미정/실측 대부분 null. */
  endDate: string | null;
};

export type StockWarningsResponse = {
  warnings: StockWarningItem[];
};
