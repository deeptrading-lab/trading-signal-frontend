/**
 * `/api/swing/screener` BFF — 스윙 스크리너 목록(PRD `swing-judgment` PR-2, AC-2.6).
 *
 * GET ?filter=flow|excluded|all&market=KOSPI|KOSDAQ&date=YYYY-MM-DD
 * - date 없으면 가장 최근 저장 거래일. 거래대금(ADV20) 순 최대 50행, 필요한 열만 조회.
 * - flow = 수급 조건(개인−·외국인+·기관+) 통과 ∧ 제외 없음, excluded = 제외 종목(사유 포함).
 * - 판정은 크론이 저장한 행을 그대로 쓴다(여기서 계산하지 않는다).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSymbolName } from "@/lib/api/kis/search";
import { RULEBOOK } from "@/lib/swing/rulebook";
import { readSwingScreenerMeta, screenerListDate } from "@/lib/server/swing/screener";
import { SWING_RELEASE } from "@/lib/server/swing/stats";
import {
  countSwingRows,
  isSwingStoreConfigured,
  latestSwingTradeDate,
  listSwingRows,
  toSwingScreenerItem,
  type SwingListFilter,
} from "@/lib/server/swing/store";
import { SWING_SCREENER_LIMIT, type SwingScreenerResponse } from "@/lib/types/swing/api";

const FILTERS: SwingListFilter[] = ["flow", "excluded", "all"];

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const filter = (FILTERS.includes(sp.get("filter") as SwingListFilter) ? sp.get("filter") : "flow") as SwingListFilter;
  const marketParam = sp.get("market");
  const market = marketParam === "KOSPI" || marketParam === "KOSDAQ" ? marketParam : null;
  const sort = sp.get("sort") === "met" ? "met" : "adv";
  const dateParam = sp.get("date");
  if (dateParam !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "날짜 형식이 올바르지 않아요(YYYY-MM-DD)." }, { status: 400 });
  }
  if (!isSwingStoreConfigured()) {
    return NextResponse.json({ error: "스윙 판정 저장소가 설정되지 않았어요." }, { status: 503 });
  }

  const [latest, meta] = await Promise.all([
    dateParam ? Promise.resolve(dateParam) : latestSwingTradeDate(RULEBOOK.version),
    readSwingScreenerMeta(),
  ]);
  // 날짜 지정이 없으면 집계 도중의 일부 목록 대신 마지막으로 끝까지 돈 거래일(screenerListDate).
  const tradeDate = dateParam ?? screenerListDate(meta, latest, RULEBOOK.version);
  const [rows, counts] = tradeDate
    ? await Promise.all([
        listSwingRows({ tradeDate, version: RULEBOOK.version, filter, market, limit: SWING_SCREENER_LIMIT, sort }),
        countSwingRows({ tradeDate, version: RULEBOOK.version, market }),
      ])
    : [[], null];
  if (rows === null) {
    return NextResponse.json({ error: "스윙 판정 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }

  const body: SwingScreenerResponse = {
    tradeDate,
    rulebookVersion: RULEBOOK.version,
    release: SWING_RELEASE,
    filter,
    items: rows.map((r) => toSwingScreenerItem(r, getSymbolName(r.ticker) ?? r.ticker)),
    run: meta ? { at: meta.at, ok: meta.ok, tradeDate: meta.tradeDate ?? null } : null,
    counts,
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "private, max-age=60" } });
}
