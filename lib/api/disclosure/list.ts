/**
 * `/api/disclosure/list` 클라이언트 — DART 최근 공시 N건 BFF 호출.
 *
 * PRD `stock-api-integration` (PR-B) §3.3.2.
 *
 * count 기본값 5 (PR-B Profile 화면 정합). BFF route 가 1~100 으로 clamp.
 */

import { httpClient } from "@/lib/api/client";
import type { DisclosureItem } from "@/lib/api/dart/types";

export async function fetchDisclosureListClient(
  ticker: string,
  count: number = 5,
): Promise<DisclosureItem[]> {
  const response = await httpClient.get<DisclosureItem[]>("/disclosure/list", {
    params: { ticker, count },
  });
  return response.data;
}
