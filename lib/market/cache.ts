/**
 * 시황 레이어 — 스냅샷 in-memory TTL 캐시 + last-good 폴백.
 *
 * PRD `market-snapshot` §3.2. `/api/market/indices`(index 라우트)의 L1 모듈 캐시 패턴을 차용한
 * 경량 버전. 30분 polling 시 같은 인스턴스 warm 상태에서 KIS 반복 호출을 막는다(장중 TTL).
 * KV(L2) 공유는 Phase 1 범위 밖 — 후속에 index-store 패턴으로 확장 가능.
 */

import type { MarketSnapshot } from "./types";

/** 장중 스냅샷 TTL — 90s(30분 polling 대비 충분, 과도한 재호출 억제). */
const TTL_MS = 90_000;

type Entry = { snapshot: MarketSnapshot; expiresAt: number };

let cached: Entry | null = null;
let lastGood: MarketSnapshot | null = null;

/** 유효 TTL 내 캐시 스냅샷(없거나 만료면 null). */
export function getCachedSnapshot(): MarketSnapshot | null {
  if (cached && cached.expiresAt > Date.now()) return cached.snapshot;
  return null;
}

/** 캐시 갱신 — mock 이 아니면 last-good 으로도 보관(전체 실패 시 폴백용). */
export function setCachedSnapshot(snapshot: MarketSnapshot): void {
  cached = { snapshot, expiresAt: Date.now() + TTL_MS };
  if (snapshot.dataSource !== "mock") lastGood = snapshot;
}

/** 최근 성공 스냅샷(전체 실패 시 graceful degrade 용). */
export function getLastGoodSnapshot(): MarketSnapshot | null {
  return lastGood;
}

/** 테스트 전용 — 캐시 초기화. */
export function resetSnapshotCacheForTest(): void {
  cached = null;
  lastGood = null;
}
