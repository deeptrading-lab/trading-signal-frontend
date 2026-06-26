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
import { buildMarketSnapshot } from "@/lib/market/snapshot";
import { getCachedSnapshot, setCachedSnapshot } from "@/lib/market/cache";
import { buildMarketAnalysis } from "@/lib/market/analysis";
import {
  getLatestMarketAnalysis,
  insertMarketAnalysis,
} from "@/lib/server/marketAnalysisStore";
import { getMockMarketAnalysis } from "@/lib/mock/market/analysis";
import { jsonWithDataSource, withTimeout, BFF_TIMEOUT_SENTINEL } from "@/lib/server/bffUtils";
import { createLogger } from "@/lib/server/logTag";

export const preferredRegion = "icn1";
/** CLI 합성(effort medium, CLI 타임아웃 180s) 여유 — 라우트 함수 최대 실행시간. */
export const maxDuration = 300;

const log = createLogger("market/analysis");
/** 스냅샷 빌드 타임아웃(캐시 미스 시) — snapshot 라우트 정합. */
const SNAPSHOT_TIMEOUT_MS = 20_000;

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

  // ── 생성: 스냅샷(캐시 우선) → CLI 합성 → 저장 ────────────────────────────
  try {
    let snapshot = getCachedSnapshot();
    if (!snapshot) {
      const built = await withTimeout(buildMarketSnapshot(), SNAPSHOT_TIMEOUT_MS);
      snapshot = built.snapshot;
      setCachedSnapshot(snapshot);
    }

    const { analysis, cliInvoked, degraded } = await buildMarketAnalysis(snapshot, {
      signal: request.signal,
    });

    // 적립 제외: mock 스냅샷 / degrade(합성 실패 기본값) — 가짜 분석이 최신본으로 고착되는 것 방지.
    // degrade 면 직전 정상 저장본이 ?mode=latest 로 유지된다.
    if (snapshot.dataSource !== "mock" && !degraded) {
      const write = await insertMarketAnalysis(analysis, snapshot.dataSource);
      if (!write.ok) log.warn("저장 실패", write.error);
    }

    log(
      `phase=${analysis.regimeDiagnosis.phase} risk=${analysis.systemRisk.level} cli=${cliInvoked} degraded=${degraded} source=${snapshot.dataSource}`,
    );
    return jsonWithDataSource(analysis, snapshot.dataSource, {
      "X-KIS-Env": env,
      "X-Cache": "miss",
      "X-CLI": cliInvoked ? "1" : "0",
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
