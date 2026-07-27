/**
 * `/api/stock/intraday-read` — 장중 단타 판단(참고) on-demand 생성. intraday-scalping-agent §0.
 *
 * POST { ticker, provider?: "claude"|"codex" } → IntradayReadResponse
 *
 * ⚠️ 로컬 전용(로컬 CLI 구독 기반) — Vercel 감지 시 503. KIS 미설정 시 400.
 * ⚠️ 의사결정 보조용 — 자동 수익/집행 주장 없음. 응답 no-store.
 */

import { NextRequest, NextResponse } from "next/server";
import { isVercelEnv } from "@/lib/server/env";
import { isKisConfigured } from "@/lib/api/kis";
import { readIntraday } from "@/lib/server/intraday/read";
import { isKstMarketHours } from "@/lib/utils/kstMarketHours";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(req: NextRequest): Promise<Response> {
  if (isVercelEnv()) {
    return NextResponse.json(
      { error: "장중 단타 판단은 로컬 환경(next dev)에서만 사용할 수 있어요." },
      { status: 503, headers: NO_STORE },
    );
  }

  if (!isKstMarketHours()) {
    return NextResponse.json(
      { error: "정규장 시간에만 단타 판단을 새로 실행할 수 있어요." },
      { status: 409, headers: NO_STORE },
    );
  }

  const body = (await req.json().catch(() => null)) as { ticker?: unknown; provider?: unknown } | null;
  if (!body || typeof body.ticker !== "string") {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400, headers: NO_STORE });
  }
  const ticker = body.ticker.trim().replace(/[^A-Za-z0-9_-]/g, "");
  if (!ticker) {
    return NextResponse.json({ error: "ticker가 필요합니다." }, { status: 400, headers: NO_STORE });
  }

  const rawProvider = body.provider ?? "claude";
  if (rawProvider !== "claude" && rawProvider !== "codex") {
    return NextResponse.json({ error: "지원하지 않는 AI 공급자입니다." }, { status: 400, headers: NO_STORE });
  }
  const provider: AIAnalysisProvider = rawProvider;

  if (!isKisConfigured()) {
    return NextResponse.json(
      { error: "KIS API가 설정되지 않아 분봉을 불러올 수 없어요." },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = await readIntraday(ticker, { provider, abortSignal: req.signal });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      return NextResponse.json({ error: "요청이 취소됐어요." }, { status: 499, headers: NO_STORE });
    }
    return NextResponse.json(
      { error: "장중 단타 판단을 생성하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 502, headers: NO_STORE },
    );
  }
}
