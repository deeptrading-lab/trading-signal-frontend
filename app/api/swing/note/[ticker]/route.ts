/**
 * `/api/swing/note/[ticker]` BFF — 스윙 체크 AI 노트(뉴스·공시 정리, PRD `swing-judgment` PR-4).
 *
 * - GET: 종목의 최신 노트(없으면 note:null).
 * - POST: 노트 요청 — 진행 중이거나 6시간 안에 만든 노트가 있으면 그것을, 아니면 pending 1행(로컬 워커가 처리).
 *   prod 는 로그인 필요(분석 요청 enqueue 와 같은 규칙), 대기 상한이면 429.
 * ⚠️ 판정(swing_judgments)은 읽지도 쓰지도 않는다 — 노트는 판정과 무관한 별도 저장소.
 */

import { NextRequest, NextResponse } from "next/server";
import { getMarketByTicker, getSymbolName } from "@/lib/api/kis/search";
import { requireProdSessionApi, sessionEmail } from "@/lib/server/auth/apiGuard";
import {
  getLatestSwingNote,
  isSwingNoteStoreConfigured,
  requestSwingNote,
  reusableNote,
} from "@/lib/server/swing/noteStore";
import { createLogger } from "@/lib/server/logTag";
import type { SwingNoteResponse } from "@/lib/types/swing/api";

const log = createLogger("swing/note");
const NOT_SUPPORTED = "스윙 체크는 KOSPI·KOSDAQ 상장 주식만 지원해요(ETF·ETN·해외 종목 제외).";
const UNAVAILABLE = "AI 노트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

async function tickerOf(ctx: { params: Promise<{ ticker: string }> }): Promise<string | null> {
  const { ticker } = await ctx.params;
  return /^\d{6}$/.test(ticker) && getMarketByTicker(ticker) ? ticker : null;
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ ticker: string }> }) {
  const ticker = await tickerOf(ctx);
  if (!ticker) return NextResponse.json({ error: NOT_SUPPORTED }, { status: 404 });
  if (!isSwingNoteStoreConfigured()) return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  try {
    const note = await getLatestSwingNote(ticker);
    const body: SwingNoteResponse = { note, canRequest: reusableNote(note, Date.now()) === null };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    log.warn(`노트 조회 실패 ${ticker}`, error);
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ ticker: string }> }) {
  const denied = await requireProdSessionApi(request);
  if (denied) return denied;
  const ticker = await tickerOf(ctx);
  if (!ticker) return NextResponse.json({ error: NOT_SUPPORTED }, { status: 404 });
  if (!isSwingNoteStoreConfigured()) return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  try {
    const note = await requestSwingNote(ticker, getSymbolName(ticker) ?? ticker, await sessionEmail(request));
    if (note === "busy") {
      return NextResponse.json({ error: "지금 정리 요청이 많아요. 잠시 후 다시 시도해 주세요." }, { status: 429 });
    }
    const body: SwingNoteResponse = { note, canRequest: false };
    return NextResponse.json(body);
  } catch (error) {
    log.warn(`노트 요청 실패 ${ticker}`, error);
    return NextResponse.json({ error: "AI 노트를 요청하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
}
