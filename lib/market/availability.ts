/**
 * 라이브 섹션 가용성 판정 — 마켓 홈 실시간 순위/순매수의 "받을 수 있나(가용성)" 축.
 *
 * PRD `market-status-aware-home` §6 / DESIGN 핸드오프 매트릭스. 시장 시각(장 열림/닫힘)이 아니라
 * **실제 데이터를 받았는지**로 렌더를 가른다. 세 라우트 구조가 달라(§6 q5) HTTP 상태(isError) 와
 * `X-Data-Source` 헤더를 **둘 다** 봐야 한다(§6 q4):
 *
 *   - available   = `isError=false` AND `dataSource ∈ {kis, mock}`
 *   - unavailable = `isError=true`(502) OR `dataSource ∈ {mock-timeout, mock-empty, mock-error}`
 *   - loading     = 아직 settled 전(첫 프로브 진행 중)
 *
 * dev 무키(`mock`)는 available 로 처리 — "영구 점검중" 회귀 방지(§6 q1, R10). cumulative(`kv`)는
 * 판정 대상이 아니다(항상 정상 — 컴포넌트가 이 함수를 호출하지 않는다).
 */

import type { DataSource } from "@/lib/types/market/dataSource";

/** 라이브 섹션/탭의 3-상태 가용성. */
export type Availability = "loading" | "available" | "unavailable";

/** available(정상 표시)로 취급하는 소스 — dev 편의 mock 포함(§6 q1). */
const AVAILABLE_SOURCES: ReadonlySet<DataSource> = new Set<DataSource>([
  "kis",
  "mock",
]);

export type AvailabilityInput = {
  /** 첫 프로브 진행 중(settled 전). */
  isLoading: boolean;
  /** 502 → axios throw → true(volume-rank·flow today 계열). */
  isError: boolean;
  /** 표면화된 `X-Data-Source`(fluctuation never-throw 계열의 mock-* 구분). */
  dataSource: DataSource | undefined;
};

/**
 * 단일 쿼리 결과 → 가용성 3-상태.
 *
 * loading 은 available/unavailable 확정 전 상태로 우선한다(settled 전 점검 오판 방지).
 */
export function resolveAvailability(input: AvailabilityInput): Availability {
  if (input.isLoading) return "loading";
  if (input.isError) return "unavailable";
  if (input.dataSource && AVAILABLE_SOURCES.has(input.dataSource)) {
    return "available";
  }
  return "unavailable";
}

/** available 여부(settled 이후 boolean 필요 지면용 편의). loading 은 false. */
export function isAvailable(input: AvailabilityInput): boolean {
  return resolveAvailability(input) === "available";
}
