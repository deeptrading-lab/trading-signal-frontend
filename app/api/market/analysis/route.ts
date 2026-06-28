/**
 * `/api/market/analysis` BFF route — 시황 CLI 국면 합성(시황 레이어 Phase 2).
 *
 * PRD `market-analysis` §3. Phase 1 스냅샷을 Claude CLI 가 국면·시스템 리스크·전망으로 합성.
 *
 * 모드:
 * - `?mode=latest` — 저장된 최신 1건을 **CLI/KIS 0콜**로 반환(Phase 3 주입·봇 폴링용 저비용 조회).
 * - `?refresh=1`   — 스냅샷→CLI 강제 생성 + 저장(cron·수동 트리거).
 * - 기본          — 최신 저장본 있으면 그대로(저비용), 없으면 1회 생성(cold-start).
 *
 * 게이트: 생성은 `isKisConfigured()` AND `resolveKisEnv()==="prod"` 통과 시에만(스냅샷이 prod 전용).
 *   미통과 시 mock degrade. CLI 부재/실패는 buildMarketAnalysis 가 fail-soft degrade.
 * CLI 합성이 30~90s 걸려 maxDuration 확장. KIS 서울 서버 정합 위해 리전 서울(icn1) 고정.
 */

import { NextRequest } from "next/server";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { getLatestMarketAnalysis } from "@/lib/server/marketAnalysisStore";
import { refreshMarketAnalysis } from "@/lib/server/market/refreshMarketAnalysis";
import { getMockMarketAnalysis } from "@/lib/mock/market/analysis";
import { jsonWithDataSource, BFF_TIMEOUT_SENTINEL } from "@/lib/server/bffUtils";
import { createLogger } from "@/lib/server/logTag";

export const preferredRegion = "icn1";
/** CLI 합성(effort medium, CLI 타임아웃 180s) 여유 — 라우트 함수 최대 실행시간. */
export const maxDuration = 300;

const log = createLogger("market/analysis");

export async function GET(request: NextRequest) {
  const env = resolveKisEnv();
  const mode = request.nextUrl.searchParams.get("mode");
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";

  // ── ?mode=latest — 저비용 저장본 조회(생성/KIS 없음) ──────────────────────
  if (mode === "latest") {
    const latest = await getLatestMarketAnalysis();
    if (latest) {
      return jsonWithDataSource(latest.analysis, latest.dataSource, {
        "X-KIS-Env": env,
        "X-Cache": "store",
        "X-Call-Count": "0",
      });
    }
    return jsonWithDataSource(getMockMarketAnalysis(), "mock", {
      "X-KIS-Env": env,
      "X-Analysis-Empty": "1",
    });
  }

  // ── 생성 경로 — prod 게이트(미통과 mock) ─────────────────────────────────
  if (!isKisConfigured() || env !== "prod") {
    return jsonWithDataSource(getMockMarketAnalysis(), "mock", { "X-KIS-Env": env });
  }

  // 기본 모드: 최신 저장본 있으면 저비용 반환(refresh=1 이면 건너뜀).
  if (!refresh) {
    const latest = await getLatestMarketAnalysis();
    if (latest) {
      return jsonWithDataSource(latest.analysis, latest.dataSource, {
        "X-KIS-Env": env,
        "X-Cache": "store",
        "X-Call-Count": "0",
      });
    }
  }

  // ── 생성: 스냅샷(캐시 우선) → CLI 합성 → 저장(공유 코어 refreshMarketAnalysis) ──
  try {
    const { analysis, dataSource, cliInvoked, pruned } = await refreshMarketAnalysis({
      signal: request.signal,
    });
    return jsonWithDataSource(analysis, dataSource, {
      "X-KIS-Env": env,
      "X-Cache": "miss",
      "X-CLI": cliInvoked ? "1" : "0",
      "X-Pruned": String(pruned),
    });
  } catch (error) {
    // 스냅샷 빌드 실패/타임아웃 — 저장본 폴백, 없으면 mock.
    const isTimeout = error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL;
    log.warn(`${isTimeout ? "timeout" : "error"} — 폴백`, error);
    const latest = await getLatestMarketAnalysis();
    if (latest) {
      return jsonWithDataSource(latest.analysis, "partial", {
        "X-KIS-Env": env,
        "X-Cache": "stale",
        "X-Error": isTimeout ? "스냅샷 지연 — 직전 분석 반환" : "스냅샷 실패 — 직전 분석 반환",
      });
    }
    return jsonWithDataSource(getMockMarketAnalysis(), "mock", {
      "X-KIS-Env": env,
      "X-Error": "시황 분석을 생성하지 못했어요.",
    });
  }
}
