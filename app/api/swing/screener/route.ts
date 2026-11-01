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
import { readSwingScreenerMeta } from "@/lib/server/swing/screener";
import { SWING_RELEASE } from "@/lib/server/swing/stats";
import { isSwingStoreConfigured, latestSwingTradeDate, listSwingRows, type SwingListFilter } from "@/lib/server/swing/store";
import type { SwingScreenerResponse } from "@/lib/types/swing/api";

const LIMIT = 50;
const FILTERS: SwingListFilter[] = ["flow", "excluded", "all"];

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const filter = (FILTERS.includes(sp.get("filter") as SwingListFilter) ? sp.get("filter") : "flow") as SwingListFilter;
  const marketParam = sp.get("market");
  const market = marketParam === "KOSPI" || marketParam === "KOSDAQ" ? marketParam : null;
  const dateParam = sp.get("date");
  if (dateParam !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "날짜 형식이 올바르지 않아요(YYYY-MM-DD)." }, { status: 400 });
  }
  if (!isSwingStoreConfigured()) {
    return NextResponse.json({ error: "스윙 판정 저장소가 설정되지 않았어요." }, { status: 503 });
  }

  const [tradeDate, meta] = await Promise.all([
    dateParam ? Promise.resolve(dateParam) : latestSwingTradeDate(RULEBOOK.version),
    readSwingScreenerMeta(),
  ]);
  const rows = tradeDate
    ? await listSwingRows({ tradeDate, version: RULEBOOK.version, filter, market, limit: LIMIT })
    : [];
  if (rows === null) {
    return NextResponse.json({ error: "스윙 판정 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }

  const body: SwingScreenerResponse = {
    tradeDate,
    rulebookVersion: RULEBOOK.version,
    release: SWING_RELEASE,
    filter,
    items: rows.map((r) => ({
      ticker: r.ticker,
      name: getSymbolName(r.ticker) ?? r.ticker,
      market: r.market,
      grade: r.grade,
      metCount: r.met_count,
      flowPass: r.flow_pass,
      exclusions: r.exclusions,
      items: r.items,
      stage: r.stage,
      close: Number(r.close),
      adv20: r.adv20 === null ? null : Number(r.adv20),
      planStop: r.plan_stop === null ? null : Number(r.plan_stop),
      planTarget: r.plan_target === null ? null : Number(r.plan_target),
      planRr: r.plan_rr === null ? null : Number(r.plan_rr),
    })),
    run: meta ? { at: meta.at, ok: meta.ok, tradeDate: meta.tradeDate ?? null } : null,
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "private, max-age=60" } });
}
