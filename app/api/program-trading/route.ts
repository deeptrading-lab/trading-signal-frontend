import { NextRequest, NextResponse } from "next/server";
import { getSymbolName } from "@/lib/api/kis/search";
import { isTossConfigured } from "@/lib/api/toss/client";
import { allowsLocalProgram } from "@/lib/server/programTrading/localRequest";
import { getLocalPaperRuntime } from "@/lib/server/programTrading/localPaperRuntime";
import type { ProgramTradingAction, TradingState } from "@/lib/types/programTrading/programTrading";
import { pickStockName } from "@/lib/utils/resolveStockName";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };
const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers });

function respondWithState(state: TradingState) {
  const candidateNames = new Map(state.candidates.rows.map(({ ticker, name }) => [ticker, name]));
  const seedNames = new Map<string, string | null>();

  function withStockName<T extends { ticker: string; name?: string }>(row: T) {
    const { ticker } = row;
    const knownName = pickStockName(ticker, [candidateNames.get(ticker), row.name]);
    if (knownName) return { ...row, name: knownName };

    if (!seedNames.has(ticker)) seedNames.set(ticker, getSymbolName(ticker));
    const name = seedNames.get(ticker);
    return name ? { ...row, name } : row;
  }

  return NextResponse.json({
    ...state,
    positions: state.positions.map(withStockName),
    trades: state.trades.map(withStockName),
  }, { headers });
}

async function handle(request: NextRequest) {
  if (!allowsLocalProgram(request, request.method === "POST")) return fail(403, "로컬 주소에서 자동매매 화면을 열어 주세요.");
  if (!isTossConfigured()) return fail(503, ".env.local에 TOSS_CLIENT_ID와 TOSS_CLIENT_SECRET을 입력해 주세요.");

  let action: ProgramTradingAction | undefined;
  if (request.method === "POST") {
    let requestedAction: unknown;
    try { requestedAction = (await request.json())?.action; }
    catch { return fail(400, "지원하지 않는 명령이에요."); }
    if (requestedAction !== "start" && requestedAction !== "pause" && requestedAction !== "flatten" && requestedAction !== "new-session") {
      return fail(400, "지원하지 않는 명령이에요.");
    }
    action = requestedAction;
  }

  try {
    const paper = await getLocalPaperRuntime();
    if (!action) return respondWithState(await paper.snapshot());
    const result = await paper.run(action);
    return result.error !== undefined ? fail(409, result.error) : respondWithState(result.state);
  } catch {
    return fail(503, "로컬 모의투자를 준비하지 못했어요. 종목 설정과 로컬 원장을 확인해 주세요.");
  }
}

export { handle as GET, handle as POST };
