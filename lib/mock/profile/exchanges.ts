/**
 * `/profile` 연동 거래소 mock — 3건.
 *
 * 시안 `Profile.tsx` 의 연동 리스트 정합 — 키움증권 (연동됨) / 업비트 (연동됨) / 토스증권 (연결 필요).
 * 동기화 시점 표기 (`syncedAt`) 는 데이터로 보존. 상태 enum 한글 매핑은 `lib/copy/profile/labels.ts`.
 */

import type { ConnectedExchanges } from "@/lib/types/profile/exchanges";

export const CONNECTED_EXCHANGES_MOCK: ConnectedExchanges = [
  {
    name: "키움증권",
    status: "CONNECTED",
    syncedAtKey: "SYNC_1H_AGO",
    brandKey: "kiwoom",
  },
  {
    name: "업비트",
    status: "CONNECTED",
    syncedAtKey: "SYNC_REALTIME",
    brandKey: "upbit",
  },
  {
    name: "토스증권",
    status: "DISCONNECTED",
    syncedAtKey: "SYNC_NONE",
    brandKey: "toss",
  },
];
