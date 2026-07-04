/**
 * `/api/market/volume-rank` 클라이언트 어댑터 — 브라우저 → BFF route 단방향.
 *
 * KIS 직접 호출 금지(AGENTS.md BFF 원칙). `hooks/market/useQueryVolumeRank` 안에서만 호출한다.
 * BFF 응답이 이미 화면 친화 스키마(`VolumeRankResponse`)라 unwrap 외 가공 없음.
 */

import { httpClient } from "@/lib/api/client";
import type {
  VolumeRankBy,
  VolumeRankResponse,
} from "@/lib/types/market/volumeRank";

export async function getVolumeRank(
  by: VolumeRankBy = "volume",
): Promise<VolumeRankResponse> {
  const response = await httpClient.get<VolumeRankResponse>(
    "/market/volume-rank",
    { params: { by } },
  );
  return response.data;
}
