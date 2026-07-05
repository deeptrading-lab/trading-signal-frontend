/**
 * `X-Data-Source` 헤더 값 union — BFF route 가 응답에 실어 내리는 데이터 출처.
 *
 * PRD `market-status-aware-home` §3-0·§6. 라우트가 방출하는 실제 값과 정합(라우트 무변경):
 *   - `kis`         — KIS 실데이터 성공.
 *   - `mock`        — 미설정/비-prod(dev) 편의 mock. **정상**(점검 아님).
 *   - `kv`          — KV 스냅샷(7일 누적). 판정 대상 아님(항상 정상).
 *   - `mock-timeout`/`mock-empty`/`mock-error` — KIS 시도 후 실패로 mock degrade. **점검(unavailable)**.
 *
 * 가용성 판정(`lib/market/availability.ts`)이 이 값 + HTTP 상태(isError)를 함께 본다(§6 q4).
 */
export type DataSource =
  | "kis"
  | "mock"
  | "kv"
  | "mock-timeout"
  | "mock-empty"
  | "mock-error";

/** 알려진 소스 집합 — 헤더 파싱 시 화이트리스트(미지 값은 undefined). */
export const KNOWN_DATA_SOURCES: ReadonlySet<string> = new Set<DataSource>([
  "kis",
  "mock",
  "kv",
  "mock-timeout",
  "mock-empty",
  "mock-error",
]);
