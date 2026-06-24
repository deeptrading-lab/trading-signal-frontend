/**
 * `/api/market/snapshot` BFF route — 구조화된 시장 스냅샷(시황 데이터 레이어 Phase 1).
 *
 * PRD `market-snapshot` §3. 브라우저/봇 → 본 route → KIS 단방향(AGENTS.md BFF 원칙).
 *
 * - GET — 지수·시장폭·테마섹터·지수집중도·국면·공포탐욕·수급을 한 스냅샷으로 반환.
 * - **이중 게이트**: `isKisConfigured()` AND `resolveKisEnv()==="prod"` 통과 시에만 KIS 실호출.
 *   (지수·multprice 가 prod 전용이라) 미통과 시 mock degrade.
 * - 90s in-memory TTL 캐시(`?fresh=1` 로 우회). 전체 실패 시 last-good 폴백.
 * - `X-Data-Source`(live/partial/mock) + `X-KIS-Env` + `X-Call-Count` 헤더, `Cache-Control: no-store`.
 * - KIS 는 서울 서버 — 해외 지수 500 회피 위해 실행 리전 서울(icn1) 고정(indices 라우트 정합).
 */

import { NextRequest } from "next/server";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { buildMarketSnapshot } from "@/lib/market/snapshot";
import {
  getCachedSnapshot,
  setCachedSnapshot,
  getLastGoodSnapshot,
} from "@/lib/market/cache";
import { getMockMarketSnapshot } from "@/lib/mock/market/snapshot";
import { jsonWithDataSource, withTimeout, BFF_TIMEOUT_SENTINEL } from "@/lib/server/bffUtils";
import type { MarketSnapshot } from "@/lib/market/types";

export const preferredRegion = "icn1";

/** 전체 조립 타임아웃 — multprice+일봉 청크 포함이라 indices(5s)보다 넉넉히. */
const BFF_TIMEOUT_MS = 20_000;

export async function GET(request: NextRequest) {
  const env = resolveKisEnv();

  // 이중 게이트 — 미설정/비-prod 면 mock.
  if (!isKisConfigured() || env !== "prod") {
    return jsonWithDataSource(getMockMarketSnapshot(), "mock", { "X-KIS-Env": env });
  }

  // 캐시(fresh=1 로 우회).
  const fresh = request.nextUrl.searchParams.get("fresh") === "1";
  if (!fresh) {
    const cached = getCachedSnapshot();
    if (cached) {
      return jsonWithDataSource(cached, cached.dataSource, {
        "X-KIS-Env": env,
        "X-Cache": "hit",
      });
    }
  }

  try {
    const { snapshot, callCount } = await withTimeout(buildMarketSnapshot(), BFF_TIMEOUT_MS);
    setCachedSnapshot(snapshot);
    console.info(`[market/snapshot] dataSource=${snapshot.dataSource} calls=${callCount} warnings=${snapshot.warnings.length}`);
    return jsonWithDataSource(snapshot, snapshot.dataSource, {
      "X-KIS-Env": env,
      "X-Cache": "miss",
      "X-Call-Count": String(callCount),
    });
  } catch (error) {
    // 타임아웃/전체 실패 → last-good 폴백, 없으면 mock.
    const fallback: MarketSnapshot | null = getLastGoodSnapshot();
    const isTimeout = error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL;
    console.warn(`[market/snapshot] ${isTimeout ? "timeout" : "error"} — ${fallback ? "last-good" : "mock"} fallback`, error);
    if (fallback) {
      return jsonWithDataSource(fallback, "partial", {
        "X-KIS-Env": env,
        "X-Cache": "stale",
        "X-Error": isTimeout ? "조립 지연 — 직전 스냅샷 반환" : "조립 실패 — 직전 스냅샷 반환",
      });
    }
    return jsonWithDataSource(getMockMarketSnapshot(), "mock", {
      "X-KIS-Env": env,
      "X-Error": "시황 스냅샷을 불러오지 못했어요.",
    });
  }
}