/**
 * `/profile` 의 연동된 거래소 / 증권사 카드 데이터.
 *
 * 시안 `Profile.tsx` 의 3 항목 정합 (키움증권 / 업비트 / 토스증권).
 */

export type ExchangeStatus = "CONNECTED" | "DISCONNECTED";

/** 동기화 시점 enum — 한글 매핑은 `lib/copy/profile/labels.ts` 의 `SYNC_*`. */
export type SyncedAtKey = "SYNC_REALTIME" | "SYNC_1H_AGO" | "SYNC_NONE";

export type ConnectedExchange = {
  /** 거래소 / 증권사 이름 (한글). */
  name: string;
  status: ExchangeStatus;
  /** 마지막 동기화 시점 카피 키. */
  syncedAtKey: SyncedAtKey;
  /** 아바타 배경 컬러 토큰 — 본 PRD 의 토큰 정합 위해 hex 대신 의미 키로.
   * (`brand-kiwoom` / `brand-upbit` 등 식별 키. 실제 색 매핑은 컴포넌트 단). */
  brandKey: string;
};

export type ConnectedExchanges = ConnectedExchange[];
