/**
 * `/api/market/fluctuation` 클라이언트 어댑터 — 브라우저 → BFF route 단방향.
 *
 * KIS 직접 호출 금지(AGENTS.md BFF 원칙). `hooks/market/useQueryFluctuation` 안에서만 호출한다.
 * BFF 응답이 이미 화면 친화 스키마(`FluctuationResponse`)라 unwrap 외 가공 없음.
 */

import { httpClient } from "@/lib/api/client";
import type {
  FluctuationDirection,
  FluctuationResponse,
} from "@/lib/types/market/fluctuation";

export async function getFluctuation(
  direction: FluctuationDirection = "up",
): Promise<FluctuationResponse> {
  const response = await httpClient.get<FluctuationResponse>(
    "/market/fluctuation",
    { params: { dir: direction } },
  );
  return response.data;
}
