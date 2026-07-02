import { NextResponse } from "next/server";
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

export async function GET(): Promise<Response> {
  const payload: PaperTradingSessionsResponse = {
    sessions: listPaperTradingSessions(),
    generatedAt: new Date().toISOString(),
  };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
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
    });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "모의투자 세션을 만들지 못했어요." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
