/**
 * 시황 분석 생성·저장 코어 — 라우트(`/api/market/analysis?refresh=1`)와 로컬 자동 스케줄러
 * (`refreshScheduler`)가 공유한다. 스냅샷(캐시 우선) → CLI 합성 → 저장(degrade 제외) → 보존 정리.
 *
 * ⚠️ CLI 합성은 로컬 claude CLI(구독) 전용 — Vercel(서버리스)엔 CLI 가 없어 `degraded:true` 가 되고
 *    저장에서 제외된다. 즉 시황 "생성"은 본질적으로 로컬에서만 의미가 있고, prod 는 `?mode=latest`
 *    로 마지막 로컬 생성본을 읽기만 한다.
 *
 * 스냅샷 실패/타임아웃은 throw — 호출측(라우트)이 저장본/mock 폴백을 결정한다.
 */

import { buildMarketSnapshot } from "@/lib/market/snapshot";
import { getCachedSnapshot, setCachedSnapshot } from "@/lib/market/cache";
import { buildMarketAnalysis } from "@/lib/market/analysis";
import {
  insertMarketAnalysis,
  pruneOldMarketAnalyses,
  MARKET_ANALYSIS_RETENTION_DAYS,
} from "@/lib/server/marketAnalysisStore";
import { withTimeout } from "@/lib/server/bffUtils";
import { createLogger } from "@/lib/server/logTag";

const log = createLogger("market/analysis");

/** 스냅샷 빌드 타임아웃(캐시 미스 시) — snapshot 라우트 정합. */
const SNAPSHOT_TIMEOUT_MS = 20_000;

type AnalysisData = Awaited<ReturnType<typeof buildMarketAnalysis>>["analysis"];
type SnapshotDataSource = Awaited<ReturnType<typeof buildMarketSnapshot>>["snapshot"]["dataSource"];

export interface RefreshMarketAnalysisResult {
  analysis: AnalysisData;
  dataSource: SnapshotDataSource;
  cliInvoked: boolean;
  degraded: boolean;
  pruned: number;
}

/**
 * 스냅샷 → CLI 합성 → 저장 → 보존 정리. 생성 결과(저장 여부·prune 수 포함)를 반환.
 * 저장은 mock 스냅샷/degrade(합성 실패) 시 제외 — 가짜 분석이 최신본으로 고착되는 것 방지.
 */
export async function refreshMarketAnalysis(
  opts: { signal?: AbortSignal } = {},
): Promise<RefreshMarketAnalysisResult> {
  let snapshot = getCachedSnapshot();
  if (!snapshot) {
    const built = await withTimeout(buildMarketSnapshot(), SNAPSHOT_TIMEOUT_MS);
    snapshot = built.snapshot;
    setCachedSnapshot(snapshot);
  }

  const { analysis, cliInvoked, degraded } = await buildMarketAnalysis(snapshot, {
    signal: opts.signal,
  });

  let pruned = 0;
  if (snapshot.dataSource !== "mock" && !degraded) {
    const write = await insertMarketAnalysis(analysis, snapshot.dataSource);
    if (!write.ok) {
      log.warn("저장 실패", write.error);
    } else if (!write.skipped) {
      // 저장 성공 시에만 보존 윈도우(90일) 초과분 정리(롤링 보존, fail-soft).
      const prune = await pruneOldMarketAnalyses();
      if (prune.ok && !prune.skipped && prune.deleted > 0) {
        pruned = prune.deleted;
        log(`보존 정리 — ${pruned}행 삭제(>${MARKET_ANALYSIS_RETENTION_DAYS}일)`);
      } else if (!prune.ok) {
        log.warn("보존 정리 실패", prune.error);
      }
    }
  }

  log(
    `phase=${analysis.regimeDiagnosis.phase} risk=${analysis.systemRisk.level} cli=${cliInvoked} degraded=${degraded} source=${snapshot.dataSource} pruned=${pruned}`,
  );
  return { analysis, dataSource: snapshot.dataSource, cliInvoked, degraded, pruned };
}
