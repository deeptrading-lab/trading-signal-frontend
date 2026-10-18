/**
 * `/api/cron/score-decisions` — AI 판정 채점 cron(채점 로직 단독 라우트).
 *
 * PRD `signal-scorecard` §3-2 / §9 D4.
 * - **인증**: `Authorization: Bearer ${CRON_SECRET}` 미일치 401(Vercel Cron 자동 부착).
 * - **게이트**: KIS 미설정/비-prod → 채점 skip + 헬스 마커 후 200(fail-soft, 재시도 폭주 방지).
 * - **로직**: pending horizon 행을 찾아 평가 시점 종가로 hit/miss/flat 확정(runScoring).
 *
 * GitHub Actions `score-decisions.yml` 이 매 영업일 예약 호출한다(flow-snapshot 예약 중지 후 채점만 분리).
 * backfill → 채점 → 터치 스캔 순서. 각각 독립 try/catch 로 한 단계 실패가 다른 단계를 막지 않는다.
 */

import { NextRequest, NextResponse } from "next/server";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { relativeRunScoring } from "@/lib/server/scorecard/relativeRunScoring";
import { runBackfillDecisions } from "@/lib/server/scorecard/runBackfillDecisions";
import { runTouchScan, type TouchScanResult } from "@/lib/server/scorecard/runTouchScan";
import { saveScorecardCronMeta } from "@/lib/server/scorecard/scorecardCronMeta";
import { createLogger } from "@/lib/server/logTag";

const log = createLogger("score-decisions");

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const env = resolveKisEnv();

  // KIS 미설정/비-prod → 채점 skip(일봉 조회 prod 전용). cron 재시도 폭주 막으려 200.
  if (!isKisConfigured() || env !== "prod") {
    await saveScorecardCronMeta({
      at: new Date().toISOString(),
      ok: false,
      reason: "kis-not-prod",
      env,
    });
    return NextResponse.json({ ok: false, reason: "kis-not-prod", env }, { status: 200 });
  }

  // backfill — 채점 원장 append(#140) 이전 결정을 멱등 복원(독립 try/catch, 채점 앞).
  // PRD `scorecard-backfill-decisions`. 디스패처(flow-snapshot)와 동일 단계를 수동 트리거에도 공유.
  let backfill: Awaited<ReturnType<typeof runBackfillDecisions>> | null = null;
  try {
    backfill = await runBackfillDecisions();
    log(
      `backfill candidates=${backfill.candidates} inserted=${backfill.inserted} ` +
        `skippedNoAsOf=${backfill.skippedNoAsOf} skippedExists=${backfill.skippedExists} ` +
        `skippedNoEntry=${backfill.skippedNoEntry} errors=${backfill.errors}`,
    );
  } catch (error) {
    log.warn("backfill 실패 — 채점은 계속", error);
  }

  // 터치 스캔(phase-2) — 채점과 독립. 실패해도 채점 응답은 그대로 낸다.
  const scanTouch = async (): Promise<TouchScanResult | null> => {
    try {
      const touch = await runTouchScan();
      log(
        `touch candidates=${touch.candidates} scanned=${touch.scanned} ` +
          `targetHits=${touch.targetHits} stopHits=${touch.stopHits} ` +
          `completed=${touch.completed} errors=${touch.errors}`,
      );
      return touch;
    } catch (error) {
      log.warn("터치 스캔 실패 — 채점 결과는 유지", error);
      return null;
    }
  };

  try {
    const result = await relativeRunScoring();
    log(
      `채점 완료 candidates=${result.candidates} scored=${result.scored} ` +
        `hit=${result.hit} miss=${result.miss} flat=${result.flat} ` +
        `skipped=${result.skipped} backfilled=${result.backfilled} errors=${result.errors}`,
    );
    await saveScorecardCronMeta({ at: new Date().toISOString(), ok: true, env, result });
    const touch = await scanTouch();
    return NextResponse.json({ ok: true, backfill, result, touch }, { status: 200 });
  } catch (error) {
    // fail-soft — 전체 throw 도 200(다른 cron·재시도 보호). 헬스 마커에 사유 기록.
    log.error("채점 예외", error);
    await saveScorecardCronMeta({
      at: new Date().toISOString(),
      ok: false,
      reason: "scoring-error",
      env,
    });
    const touch = await scanTouch();
    return NextResponse.json({ ok: false, reason: "scoring-error", touch }, { status: 200 });
  }
}
