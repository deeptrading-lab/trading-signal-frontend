import { NextResponse, type NextRequest } from "next/server";
import { requireProdAdminApi } from "@/lib/server/auth/apiGuard";
import {
  PAPER_TRADING_DEFAULT_INITIAL_CASH,
} from "@/lib/server/paperTrading/constants";
import { getPaperTradingAiCliGate } from "@/lib/server/paperTrading/aiCliGate";
import { resolveServerOperator } from "@/lib/server/paperTrading/operator";
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
import { isKstAfterMarketClose } from "@/lib/utils/kstMarketHours";

export async function GET(request: NextRequest): Promise<Response> {
  // 단타(모의투자) 세션 원장 — prod 만 admin+(로컬 전체), /intraday 페이지 게이트와 정합.
  const denied = await requireProdAdminApi(request);
  if (denied) return denied;

  const payload: PaperTradingSessionsResponse = {
    sessions: await listPaperTradingSessions(),
    // 클라가 "내 세션"(session.owner === currentOperator)을 판정해 소유자 배지·"내 세션만" 필터에 쓴다.
    currentOperator: resolveServerOperator(),
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

    if ((body.decisionProvider ?? "mock") === "cli-agent" && isKstAfterMarketClose()) {
      return NextResponse.json(
        { error: "15시 40분 이후에는 단타 세션을 새로 만들지 않아요." },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
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
      // 손절 상한(포지션 하드스톱) — 미지정이면 서버가 riskMode 기본, null 이면 끄기(C).
      positionHardStopPct: body.positionHardStopPct,
      sessionHardStopPct: body.sessionHardStopPct,
      portfolioId: body.portfolioId,
      portfolioName: body.portfolioName,
      portfolioAllocationPct: body.portfolioAllocationPct,
    });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "모의투자 세션을 만들지 못했어요." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
