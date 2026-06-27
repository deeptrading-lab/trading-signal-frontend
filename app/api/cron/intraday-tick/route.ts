/**
 * `/api/cron/intraday-tick` — 장중 단타 틱 트리거(로컬 스케줄러용). intraday-scalping-agent §3-6.
 *
 * 앱 비밀번호 게이트(`proxy.ts`)는 `/api/*` 를 401 로 막지만 `/api/cron/*` 은 예외(게이트 통과) —
 * 따라서 인증 쿠키 없는 crontab curl 은 본 라우트로 단타 세션 tick 을 밀어넣는다.
 * (UI 수동 트리거는 쿠키가 있는 `/api/paper-trading/.../tick` 을 그대로 쓴다.)
 *
 * - **인증**: `CRON_SECRET` 설정 시 `Authorization: Bearer ${CRON_SECRET}` 또는 `?secret=` 필수.
 *   미설정(로컬 dev)이면 통과(단타 시스템 자체가 로컬 전용).
 * - **멱등**: `runPaperTradingSessionTick` 가 같은 tickWindowStart 당 1틱 보장 → 중복 발화 무해.
 * - **fail-soft**: 세션 없음/CLI 미설치/예외는 200(cron 재시도 폭주 방지).
 *
 * GET ?session=<sessionId>&secret=<CRON_SECRET?>
 */

import { NextRequest, NextResponse } from "next/server";
import { runPaperTradingSessionTick } from "@/lib/server/paperTrading/sessionStore";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const q = request.nextUrl.searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && q !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const sessionId = (request.nextUrl.searchParams.get("session") ?? "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "session 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }

  try {
    const detail = await runPaperTradingSessionTick(sessionId, { triggeredBy: "cli" });
    if (!detail) {
      return NextResponse.json({ ok: false, reason: "session-not-found" }, { status: 200 });
    }
    const last = detail.ticks.at(-1);
    return NextResponse.json(
      {
        ok: true,
        status: detail.session.status,
        action: last?.decision.action ?? null,
        rationale: last?.rationale ?? null,
        returnPct: detail.session.returnPct,
        ticks: detail.ticks.length,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: error instanceof Error ? error.message : "tick 실패" },
      { status: 200 },
    );
  }
}
