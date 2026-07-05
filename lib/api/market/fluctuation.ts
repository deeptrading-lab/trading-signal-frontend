/**
 * `/api/market/fluctuation` 클라이언트 어댑터 — 브라우저 → BFF route 단방향.
 *
 * KIS 직접 호출 금지(AGENTS.md BFF 원칙). `hooks/market/useQueryFluctuation` 안에서만 호출한다.
 * BFF 응답이 이미 화면 친화 스키마(`FluctuationResponse`)라 unwrap 외 가공 없음.
 *
 * PRD `market-status-aware-home` §3-0 — 가용성 판정을 위해 `X-Data-Source` 헤더를 표면화한다.
 * fluctuation 은 never-throw(실패도 200+mock-*) 라 헤더가 판정의 유일 근거 → 필수(§6 q4).
 */

import { httpClient } from "@/lib/api/client";
import { readDataSource } from "@/lib/utils/dataSource";
import type { DataSource } from "@/lib/types/market/dataSource";
import type {
  FluctuationDirection,
  FluctuationResponse,
} from "@/lib/types/market/fluctuation";

/** 어댑터 반환 — 화면 데이터 + 표면화된 출처(가용성 판정 근거). */
export type FluctuationResult = {
  data: FluctuationResponse;
  dataSource: DataSource | undefined;
};

export async function getFluctuation(
  direction: FluctuationDirection = "up",
): Promise<FluctuationResult> {
  const response = await httpClient.get<FluctuationResponse>(
    "/market/fluctuation",
    { params: { dir: direction } },
  );
  return { data: response.data, dataSource: readDataSource(response.headers) };
}
