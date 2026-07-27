/**
 * `/api/cron/intraday-read` — 장중 단타 판단(참고)을 **JSON 으로 반환**(Slack 안 쏨). intraday-scalping-agent §0.
 *
 * Slack 봇(dev-manager-bot/ai/trading_bot)이 호출해 결과를 자기 스레드에 포맷·게시한다.
 * `/api/cron/intraday-slack` 은 webhook 으로 직접 푸시하지만, 봇은 스레드 댓글(thread_ts)을 직접
 * 관리해야 하므로 read 원본 JSON 만 필요하다 — 그 표면이 이 라우트.
 *
 * 앱 비밀번호 게이트 예외(`/api/cron/*`)라 봇이 쿠키 없이 호출 가능(proxy.ts isPublicPath).
 * 로컬 CLI(구독) 기반 read → Vercel/KIS 미설정은 503(봇이 "로컬 전용"으로 안내).
 *
 * GET ?ticker=005930&secret=<CRON_SECRET?>&provider=claude|codex
 */

import { NextRequest, NextResponse } from "next/server";
import { isVercelEnv } from "@/lib/server/env";
import { isKisConfigured } from "@/lib/api/kis";
import { readIntraday } from "@/lib/server/intraday/read";
import { isKstMarketHours } from "@/lib/utils/kstMarketHours";
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

  if (!isKstMarketHours()) {
    return NextResponse.json(
      { ok: false, reason: "market-closed" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  // 로컬 CLI(구독) 전용 — Vercel/KIS 미설정이면 503(봇이 "로컬 전용"으로 분기).
  if (isVercelEnv() || !isKisConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "local-cli-only" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "");
  if (!ticker) {
    return NextResponse.json({ error: "ticker 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }
  const rawProvider = request.nextUrl.searchParams.get("provider") ?? "claude";
  const provider: AIAnalysisProvider = rawProvider === "codex" ? "codex" : "claude";

  try {
    const read = await readIntraday(ticker, { provider, abortSignal: request.signal });
    return NextResponse.json(read, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const aborted = (error as { name?: string })?.name === "AbortError";
    const reason = aborted ? "timeout/abort" : error instanceof Error ? error.message : "read 실패";
    console.warn(`[intraday-read] ${ticker} 실패 — ${reason}`);
    return NextResponse.json(
      { ok: false, reason },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
