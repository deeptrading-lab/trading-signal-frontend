import { NextResponse } from "next/server";
import {
  PAPER_TRADING_DEFAULT_INITIAL_CASH,
} from "@/lib/server/paperTrading/constants";
import { getPaperTradingAiCliGate } from "@/lib/server/paperTrading/aiCliGate";
import {
  createPaperTradingSession,
  listPaperTradingSessions,
} from "@/lib/server/paperTrading/sessionStore";
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
    const validation = validateCreateRequest(body);
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

function validateCreateRequest(body: Partial<CreatePaperTradingSessionRequest>): string | null {
  if (body.tickers && (!Array.isArray(body.tickers) || body.tickers.length === 0)) {
    return "종목을 1개 이상 입력해 주세요.";
  }
  if (body.stocks && (!Array.isArray(body.stocks) || body.stocks.length === 0)) {
    return "종목을 1개 이상 선택해 주세요.";
  }
  if (body.stocks && body.stocks.length > 5) {
    return "MVP에서는 종목을 최대 5개까지 선택할 수 있어요.";
  }
  if (body.initialCash !== undefined && (!Number.isFinite(body.initialCash) || body.initialCash <= 0)) {
    return "시작 투자금은 0보다 커야 해요.";
  }
  if (
    body.targetReturnPct !== undefined &&
    (!Number.isFinite(body.targetReturnPct) || body.targetReturnPct <= 0)
  ) {
    return "목표 수익률은 0보다 커야 해요.";
  }
  if (body.decisionProvider && body.decisionProvider !== "mock") {
    return "현재 AI 모의투자는 MVP 판단 방식만 사용할 수 있어요. 단, 실행에는 Codex 또는 Claude CLI가 필요합니다.";
  }
  return null;
}
