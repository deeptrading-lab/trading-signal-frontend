/**
 * axios 응답 헤더에서 `X-Data-Source` 를 읽어 `DataSource` union 으로 표면화한다.
 *
 * PRD `market-status-aware-home` §3-0 — 클라 어댑터가 응답 데이터만 반환하고 소스 헤더를 버리던 것을
 * 표면화하기 위한 도메인 무관 헬퍼. axios 는 헤더 키를 소문자로 정규화하므로 `x-data-source` 로 읽는다.
 * 알려지지 않은 값(오타·헤더 부재)은 `undefined`(판정 측이 안전 실패).
 */

import { KNOWN_DATA_SOURCES, type DataSource } from "@/lib/types/market/dataSource";

/** 헤더 객체에서 `x-data-source` 값을 안전하게 추출. 미지/부재 시 undefined. */
export function readDataSource(headers: unknown): DataSource | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const raw = (headers as Record<string, unknown>)["x-data-source"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === "string" && KNOWN_DATA_SOURCES.has(value)) {
    return value as DataSource;
  }
  return undefined;
}
