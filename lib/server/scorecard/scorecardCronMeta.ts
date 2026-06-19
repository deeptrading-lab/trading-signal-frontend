/**
 * 채점 cron 헬스 마커 — KV 기반(서버 전용).
 *
 * PRD `signal-scorecard` §3-2(헬스 마커). Vercel 로그 보존(Hobby)에 의존하지 않고 채점 cron
 * 건강을 확인한다. flow-snapshot 의 `saveFlowCronMeta` 패턴 정합 — KisStore(get/set, fail-soft).
 * flow 스냅샷 키(`flow:snap:*`)와 겹치지 않는 `scorecard:cron:meta` 사용.
 */

import { getKisStore } from "@/lib/api/kis/store";
import type { ScoreDecisionsResult } from "@/lib/server/scorecard/scoreDecisions";

const META_KEY = "scorecard:cron:meta";
const TTL_SEC = 30 * 24 * 60 * 60; // 30일.

export type ScorecardCronMeta = {
  /** 마지막 실행 시각(ISO, UTC). */
  at: string;
  /** 채점 단계가 끝까지 돈 경우 true(401/게이트 skip 은 ok=false). */
  ok: boolean;
  /** 비-채점 사유(미설정/비-prod). 정상 채점이면 생략. */
  reason?: string;
  /** 실행 시점 KIS 환경. */
  env?: string;
  /** 채점 결과 요약(정상 채점 시). */
  result?: ScoreDecisionsResult;
};

/** cron 실행 결과 마커 기록 — 다음 실행에서 덮어씀. fail-soft. */
export async function saveScorecardCronMeta(meta: ScorecardCronMeta): Promise<void> {
  await getKisStore().set(META_KEY, meta, TTL_SEC);
}

/** 마지막 cron 실행 마커 조회(없으면 null). */
export async function readScorecardCronMeta(): Promise<ScorecardCronMeta | null> {
  return getKisStore().get<ScorecardCronMeta>(META_KEY);
}
