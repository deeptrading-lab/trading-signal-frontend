import { NextRequest, NextResponse } from "next/server";
import { getSymbolName } from "@/lib/api/kis/search";
import { isTossConfigured } from "@/lib/api/toss/client";
import { getTossStockMaster } from "@/lib/api/toss/stockMaster";
import { allowsLocalProgram } from "@/lib/server/programTrading/localRequest";
import { getLocalPaperRuntime } from "@/lib/server/programTrading/localPaperRuntime";
import { readProgramAccount } from "@/lib/server/programTrading/accountIdentity";
import { PROGRAM_ASSETS_COPY as A } from "@/lib/copy/programTrading/assets";
import type { ProgramTradingAction, TradingState } from "@/lib/types/programTrading/programTrading";
import { pickStockName } from "@/lib/utils/resolveStockName";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };
const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers });

async function respondWithState(state: TradingState) {
  const candidateNames = new Map(state.candidates.rows.map(({ ticker, name }) => [ticker, name]));
  const seedNames = new Map<string, string | null>();

  // 시드에 없는 신규·소형 종목도 표시한다. 같은 종목의 후보/보유/체결 행은 한 번만 조회한다.
  const rows = [...state.candidates.rows, ...state.positions, ...state.trades];
  const missingTickers = [...new Set(rows.filter(row =>
    !pickStockName(row.ticker, [candidateNames.get(row.ticker), row.name, getSymbolName(row.ticker)]),
  ).map(row => row.ticker))];
  await Promise.all(missingTickers.map(async ticker => {
    try {
      const master = await getTossStockMaster(ticker);
      if (master?.symbol === ticker) {
        seedNames.set(ticker, pickStockName(ticker, [master.name?.trim(), master.englishName?.trim()]));
      }
    } catch {
      // 표시명 조회 실패가 자동매매 상태 조회·명령 결과를 막지 않도록 한다.
    }
  }));

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
    candidates: { ...state.candidates, rows: state.candidates.rows.map(withStockName) },
    positions: state.positions.map(withStockName),
    trades: state.trades.map(withStockName),
  }, { headers });
}

async function handle(request: NextRequest) {
  if (!allowsLocalProgram(request, request.method === "POST")) return fail(403, "로컬 주소에서 자동매매 화면을 열어 주세요.");
  const ownerSub = await readProgramAccount(request);
  if (!ownerSub) return fail(428, A.login);
  if (!isTossConfigured()) return fail(503, ".env.local에 TOSS_CLIENT_ID와 TOSS_CLIENT_SECRET을 입력해 주세요.");

  let action: ProgramTradingAction | undefined;
  if (request.method === "POST") {
    let requestedAction: unknown;
    try { requestedAction = (await request.json())?.action; }
    catch { return fail(400, "지원하지 않는 명령이에요."); }
    if (requestedAction !== "start" && requestedAction !== "pause" && requestedAction !== "flatten" && requestedAction !== "new-session" && requestedAction !== "sync-assets") {
      return fail(400, "지원하지 않는 명령이에요.");
    }
    action = requestedAction;
  }

  try {
    const paper = await getLocalPaperRuntime(ownerSub);
    if (!action) return respondWithState(await paper.snapshot());
    const result = await paper.run(action);
    return result.error !== undefined ? fail(409, result.error) : respondWithState(result.state);
  } catch {
    return fail(503, "로컬 모의투자를 준비하지 못했어요. 종목 설정과 로컬 원장을 확인해 주세요.");
  }
}

export { handle as GET, handle as POST };
