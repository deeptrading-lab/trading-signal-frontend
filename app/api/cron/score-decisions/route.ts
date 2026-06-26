/**
 * `/api/cron/score-decisions` — AI 판정 채점 cron(채점 로직 단독 라우트).
 *
 * PRD `signal-scorecard` §3-2 / §9 D4.
 * - **인증**: `Authorization: Bearer ${CRON_SECRET}` 미일치 401(Vercel Cron 자동 부착).
 * - **게이트**: KIS 미설정/비-prod → 채점 skip + 헬스 마커 후 200(fail-soft, 재시도 폭주 방지).
 * - **로직**: pending horizon 행을 찾아 평가 시점 종가로 hit/miss/flat 확정(runScoring).
 *
 * 정기 실행은 단일 디스패처(`flow-snapshot`)가 flow 스냅샷 후 runScoring 을 순차 호출한다
 * (`vercel.json` cron 1개 — Hobby 1일 1회 한도). 본 라우트는 수동/독립 호출용으로도 유효
 * (디스패처와 동일 로직 공유). 각각 독립 try/catch 로 한 단계 실패가 다른 단계를 막지 않는다.
 */

import { NextRequest, NextResponse } from "next/server";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { relativeRunScoring } from "@/lib/server/scorecard/relativeRunScoring";
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

  try {
    const result = await relativeRunScoring();
    log(
      `채점 완료 candidates=${result.candidates} scored=${result.scored} ` +
        `hit=${result.hit} miss=${result.miss} flat=${result.flat} ` +
        `skipped=${result.skipped} backfilled=${result.backfilled} errors=${result.errors}`,
    );
    await saveScorecardCronMeta({ at: new Date().toISOString(), ok: true, env, result });
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    // fail-soft — 전체 throw 도 200(다른 cron·재시도 보호). 헬스 마커에 사유 기록.
    log.error("채점 예외", error);
    await saveScorecardCronMeta({
      at: new Date().toISOString(),
      ok: false,
      reason: "scoring-error",
      env,
    });
    return NextResponse.json({ ok: false, reason: "scoring-error" }, { status: 200 });
  }
}
