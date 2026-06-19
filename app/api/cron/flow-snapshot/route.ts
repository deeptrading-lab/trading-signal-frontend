/**
 * `/api/cron/flow-snapshot` — 매 영업일 장마감 후 **단일 디스패처** cron.
 *
 * PRD `investor-flow-cumulative` §4.A / §6 + `signal-scorecard` §3-2 / §9 D4.
 *
 * - **Vercel Cron** 이 호출(`vercel.json` crons, KST 16:10 = UTC 07:10, 평일). cron 항목 1개 유지
 *   (Hobby 1일 1회 한도) → 이 슬롯 안에서 ①수급 스냅샷 적립 후 ②AI 판정 채점(runScoring)을
 *   **순차 호출**한다. 각 단계는 **독립 try/catch** — 한 단계 실패가 다른 단계를 막지 않는다.
 * - **인증**: `Authorization: Bearer ${CRON_SECRET}` 필수(Vercel Cron 자동 부착). 미일치 401.
 * - 외국인·기관 각각 `fetchForeignInstitutionTotal` → **전 행** 저장(top10 slice 안 함, 누적 커버리지).
 * - transient(EGW00201/네트워크) 1회 재시도(`fetchWithTransientRetry`). 2콜 간 delay 로 한도 회피.
 * - **fail-soft**: 휴장/빈응답/실패는 저장 skip 후 200(cron 재시도 폭주 방지). KIS 미설정/비-prod 도 skip.
 * - **q1 PoC**: 반환 행 수를 `console.info` 로 로깅 — 누적 랭킹 근사 오차 판단용(전시장 vs 상위 N행).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchForeignInstitutionTotal,
  isKisConfigured,
  resolveKisEnv,
  type ForeignInstitutionSubject,
} from "@/lib/api/kis";
import { saveFlowSnapshot, saveFlowCronMeta } from "@/lib/server/flowSnapshotStore";
import { delay, fetchWithTransientRetry } from "@/lib/server/bffUtils";
import { runScoring } from "@/lib/server/scorecard/runScoring";
import { saveScorecardCronMeta } from "@/lib/server/scorecard/scorecardCronMeta";
import type { ScoreDecisionsResult } from "@/lib/server/scorecard/scoreDecisions";

const SUBJECT_DELAY_MS = 200; // 주체 2콜 간 지연 — EGW00201 회피.
const RETRY_BACKOFF_MS = 250;
const SUBJECTS: ForeignInstitutionSubject[] = ["frgn", "orgn"];

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const env = resolveKisEnv();

  // KIS 미설정/비-prod → 적립·채점 모두 skip(랭킹·일봉 TR 은 prod 전용 가능성). 재시도 폭주 막으려 200.
  if (!isKisConfigured() || env !== "prod") {
    // 헬스 마커 — 로그 없이도 cron 건강 확인용(/api/flow/cron-status).
    await saveFlowCronMeta({ at: new Date().toISOString(), ok: false, reason: "kis-not-prod", env });
    await saveScorecardCronMeta({ at: new Date().toISOString(), ok: false, reason: "kis-not-prod", env });
    return NextResponse.json({ ok: false, reason: "kis-not-prod", env }, { status: 200 });
  }

  // ── 단계 ① 수급 스냅샷 적립 (독립 try/catch) ─────────────────────────────────
  const saved: Record<string, number> = {};
  try {
    for (const subject of SUBJECTS) {
      const rows = await fetchWithTransientRetry(
        () => fetchForeignInstitutionTotal(subject),
        [],
        RETRY_BACKOFF_MS,
      );
      // q1 PoC — 반환 행 수 로깅(전시장이면 수백, 상위 N행이면 수십).
      console.info(`[flow-snapshot] subject=${subject} rows=${rows.length}`);
      if (rows.length > 0) {
        await saveFlowSnapshot(subject, rows);
        saved[subject] = rows.length;
      }
      await delay(SUBJECT_DELAY_MS);
    }
    // 헬스 마커 — 마지막 실행 시각/저장 결과. saved 가 비면 휴장/빈응답.
    await saveFlowCronMeta({ at: new Date().toISOString(), ok: true, env, saved });
  } catch (error) {
    console.warn("[flow-snapshot] 수급 적립 단계 실패 — 채점 단계는 계속", error);
    await saveFlowCronMeta({ at: new Date().toISOString(), ok: false, reason: "flow-error", env });
  }

  // ── 단계 ② AI 판정 채점 (독립 try/catch — 수급 실패와 무관하게 실행) ──────────
  let scoring: ScoreDecisionsResult | null = null;
  try {
    scoring = await runScoring();
    console.info(
      `[flow-snapshot] scoring candidates=${scoring.candidates} scored=${scoring.scored} ` +
        `hit=${scoring.hit} miss=${scoring.miss} flat=${scoring.flat} skipped=${scoring.skipped}`,
    );
    await saveScorecardCronMeta({ at: new Date().toISOString(), ok: true, env, result: scoring });
  } catch (error) {
    console.warn("[flow-snapshot] 채점 단계 실패 — 디스패처는 200", error);
    await saveScorecardCronMeta({ at: new Date().toISOString(), ok: false, reason: "scoring-error", env });
  }

  return NextResponse.json({ ok: true, saved, scoring }, { status: 200 });
}
