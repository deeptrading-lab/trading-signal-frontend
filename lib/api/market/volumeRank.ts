/**
 * `/api/market/volume-rank` 클라이언트 어댑터 — 브라우저 → BFF route 단방향.
 *
 * KIS 직접 호출 금지(AGENTS.md BFF 원칙). `hooks/market/useQueryVolumeRank` 안에서만 호출한다.
 * BFF 응답이 이미 화면 친화 스키마(`VolumeRankResponse`)라 unwrap 외 가공 없음.
 *
 * PRD `market-status-aware-home` §3-0 — 가용성 판정을 위해 `X-Data-Source` 헤더를 표면화한다
 * (기존엔 `response.data` 만 반환하고 헤더를 버렸다). `{ data, dataSource }` envelope 로 반환.
 */

import { httpClient } from "@/lib/api/client";
import { readDataSource } from "@/lib/utils/dataSource";
import type { DataSource } from "@/lib/types/market/dataSource";
import type {
  VolumeRankBy,
  VolumeRankResponse,
} from "@/lib/types/market/volumeRank";

/** 어댑터 반환 — 화면 데이터 + 표면화된 출처(가용성 판정 근거). */
export type VolumeRankResult = {
  data: VolumeRankResponse;
  dataSource: DataSource | undefined;
};

export async function getVolumeRank(
  by: VolumeRankBy = "volume",
): Promise<VolumeRankResult> {
  const response = await httpClient.get<VolumeRankResponse>(
    "/market/volume-rank",
    { params: { by } },
  );
  return { data: response.data, dataSource: readDataSource(response.headers) };
}
