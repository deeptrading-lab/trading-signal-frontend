/**
 * `/api/market/fear-greed` 클라이언트 어댑터 — 브라우저 → BFF route 단방향.
 *
 * CNN 직접 호출 금지(BFF 경유, `@/lib/api/client`). `hooks/market/useQueryFearGreed` 안에서만 호출.
 * BFF 응답은 이미 `FearGreed` 화면 친화 스키마.
 *
 * `live` — `X-Data-Source` 헤더로 실값(cnn)/폴백(mock) 구분. CNN 차단(Vercel IP 등) 시 mock 으로
 * degrade 하므로, mock 일 땐 UI 가 가짜 숫자 대신 "불러올 수 없어요"를 표시하도록 신호한다.
 */

import { httpClient } from "@/lib/api/client";
import type { FearGreed } from "@/lib/types/dashboard/fearGreed";

export type CnnFearGreedResult = FearGreed & {
  /** BFF 가 CNN 실값을 받았으면 true, mock degrade 면 false. */
  live: boolean;
};

export async function getCnnFearGreed(): Promise<CnnFearGreedResult> {
  const response = await httpClient.get<FearGreed>("/market/fear-greed");
  const source = response.headers["x-data-source"];
  return { ...response.data, live: source === "cnn" };
}
