import { NextResponse, type NextRequest } from "next/server";
import { requireProdAdminApi } from "@/lib/server/auth/apiGuard";
import {
  PAPER_TRADING_DEFAULT_INITIAL_CASH,
} from "@/lib/server/paperTrading/constants";
import { getPaperTradingAiCliGate } from "@/lib/server/paperTrading/aiCliGate";
import {
  createPaperTradingSession,
  listPaperTradingSessions,
} from "@/lib/server/paperTrading/sessionStore";
import { validateCreateSessionRequest } from "@/lib/server/paperTrading/validateCreateSession";
import type {
  CreatePaperTradingSessionRequest,
  CreatePaperTradingSessionResponse,
  PaperTradingSessionsResponse,
} from "@/lib/types/paperTrading/paperTrading";

export async function GET(request: NextRequest): Promise<Response> {
  // 단타(모의투자) 세션 원장 — prod 만 admin+(로컬 전체), /intraday 페이지 게이트와 정합.
  const denied = await requireProdAdminApi(request);
  if (denied) return denied;

  const payload: PaperTradingSessionsResponse = {
    sessions: await listPaperTradingSessions(),
    generatedAt: new Date().toISOString(),
  };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest): Promise<Response> {
  const denied = await requireProdAdminApi(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Partial<CreatePaperTradingSessionRequest>;
    const validation = validateCreateSessionRequest(body);
    if (validation) {
      return NextResponse.json({ error: validation }, { status: 422 });
    }

    const cliGate = getPaperTradingAiCliGate();
    if (!cliGate.ok) {
      return NextResponse.json(
        { error: cliGate.message },
        { status: cliGate.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    const payload: CreatePaperTradingSessionResponse = await createPaperTradingSession({
      name: body.name ?? "AI 모의투자",
      tickers: body.tickers ?? body.stocks?.map((stock) => stock.ticker) ?? ["005930"],
      stocks: body.stocks,
      initialCash: body.initialCash ?? PAPER_TRADING_DEFAULT_INITIAL_CASH,
      targetReturnPct: body.targetReturnPct ?? 5,
      riskMode: body.riskMode ?? "balanced",
      decisionProvider: body.decisionProvider ?? "mock",
      aiProvider: cliGate.provider,
      tickIntervalMinutes: body.tickIntervalMinutes,
    });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "모의투자 세션을 만들지 못했어요." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
