/**
 * `/api/market/sectors` 클라이언트 어댑터 — 브라우저 → BFF route 단방향.
 *
 * KIS 직접 호출 금지(AGENTS.md BFF 원칙). `hooks/market/useQuerySectorRanking`·
 * `useQuerySectorConstituents` 안에서만 호출한다. BFF 응답이 이미 화면 친화 스키마라 unwrap 외 가공 없음.
 * 가용성 판정을 위해 `X-Data-Source` 헤더를 표면화한다(`{ data, dataSource }` envelope, volume-rank 선례).
 */

import { httpClient } from "@/lib/api/client";
import { readDataSource } from "@/lib/utils/dataSource";
import type { DataSource } from "@/lib/types/market/dataSource";
import type {
  SectorConstituentsResponse,
  SectorRankingResponse,
} from "@/lib/types/market/sectors";

/** 업종 랭킹 어댑터 반환 — 화면 데이터 + 표면화된 출처(가용성 판정 근거). */
export type SectorRankingResult = {
  data: SectorRankingResponse;
  dataSource: DataSource | undefined;
};

/** 구성종목 어댑터 반환. */
export type SectorConstituentsResult = {
  data: SectorConstituentsResponse;
  dataSource: DataSource | undefined;
};

export async function getSectorRanking(): Promise<SectorRankingResult> {
  const response = await httpClient.get<SectorRankingResponse>("/market/sectors");
  return { data: response.data, dataSource: readDataSource(response.headers) };
}

export async function getSectorConstituents(
  code: string,
): Promise<SectorConstituentsResult> {
  const response = await httpClient.get<SectorConstituentsResponse>(
    `/market/sectors/${code}/constituents`,
  );
  return { data: response.data, dataSource: readDataSource(response.headers) };
}
