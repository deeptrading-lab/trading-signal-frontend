/**
 * `/api/cron/intraday-slack` — 장중 단타 판단(참고)을 Slack 으로 푸시(C). intraday-scalping-agent §0.
 *
 * 앱 비밀번호 게이트 예외(`/api/cron/*`)라 crontab curl(쿠키 없음)로 호출 가능.
 * 로컬 CLI(구독) 기반 read → Vercel/KIS 미설정/webhook 미설정은 fail-soft 200(스케줄러 폭주 방지).
 *
 * GET ?ticker=005930&secret=<CRON_SECRET?>&provider=claude|codex
 */

import { NextRequest, NextResponse } from "next/server";
import { isVercelEnv } from "@/lib/server/env";
import { isKisConfigured } from "@/lib/api/kis";
import { readIntraday } from "@/lib/server/intraday/read";
import { postIntradayReadToSlack } from "@/lib/server/intraday/slack";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const q = request.nextUrl.searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && q !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (isVercelEnv() || !isKisConfigured()) {
    return NextResponse.json({ ok: false, reason: "local-cli-only" }, { status: 200 });
  }

  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").trim().replace(/[^A-Za-z0-9_-]/g, "");
  if (!ticker) {
    return NextResponse.json({ error: "ticker 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }
  const rawProvider = request.nextUrl.searchParams.get("provider") ?? "claude";
  const provider: AIAnalysisProvider = rawProvider === "codex" ? "codex" : "claude";

  try {
    const read = await readIntraday(ticker, { provider, abortSignal: request.signal });
    const slack = await postIntradayReadToSlack(read, request.signal);
    return NextResponse.json(
      { ok: slack.ok, ticker, action: read.decision.action, slack },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: error instanceof Error ? error.message : "read 실패" },
      { status: 200 },
    );
  }
}
