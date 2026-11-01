/**
 * `/api/swing/judgment/[ticker]` BFF — 종목 스윙 판정 상세(PRD `swing-judgment` PR-2, AC-2.5).
 *
 * - 스크리너와 **같은 함수**(`computeSwingJudgment`)로 즉시 계산 — 1차 거르기 없이(유동성 부족도 "제외"로 보여 준다).
 * - 거래일 t = 오늘(KST) 이전 마지막 거래일. (규칙서 버전, t, 종목) 단위로 KV 캐시(36시간).
 * - 같은 t 의 스크리너 저장 행이 있으면 입력 해시 일치 여부를 함께 돌려준다.
 * - 과거 통계(stats-v1.json) 셀 + 현재 시장경보(토스, 판정 미사용) 병기.
 */

import { NextRequest, NextResponse } from "next/server";
import { isKisConfigured } from "@/lib/api/kis";
import { getMarketByTicker, getSymbolName } from "@/lib/api/kis/search";
import { getKisStore } from "@/lib/api/kis/store";
import { fetchActiveWarnings } from "@/lib/api/toss/warnings";
import type { SwingJudgment } from "@/lib/swing/judge";
import { RULEBOOK } from "@/lib/swing/rulebook";
import { computeSwingJudgment, getMajorReportEvents } from "@/lib/server/swing/compute";
import { createKisPacer } from "@/lib/server/swing/pace";
import { SWING_RELEASE, swingStatsFor } from "@/lib/server/swing/stats";
import { getStoredSwingRow } from "@/lib/server/swing/store";
import { kstToday, resolveTradeDate } from "@/lib/server/swing/tradeDate";
import type { SwingJudgmentResponse } from "@/lib/types/swing/api";
import { createLogger } from "@/lib/server/logTag";

export const preferredRegion = "icn1";
export const maxDuration = 30;

const JUDGMENT_TTL_SEC = 36 * 3_600;
const TRADE_DATE_TTL_SEC = 3_600;
const log = createLogger("swing/judgment");

type Cached = { judgment: SwingJudgment; inputHash: string };

export async function GET(_request: NextRequest, ctx: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await ctx.params;
  const market = /^\d{6}$/.test(ticker) ? getMarketByTicker(ticker) : null;
  if (!market) {
    return NextResponse.json({ error: "스윙 체크는 KOSPI·KOSDAQ 상장 주식만 지원해요(ETF·ETN·해외 종목 제외)." }, { status: 404 });
  }
  if (!isKisConfigured()) {
    return NextResponse.json({ error: "시세 연결이 설정되지 않아 판정할 수 없어요." }, { status: 503 });
  }

  const store = getKisStore();
  const call = createKisPacer();
  try {
    // 거래일 — 오늘(KST) 단위로 캐시해 요청마다 지수를 다시 부르지 않는다.
    const tdKey = `swing:td:${kstToday()}`;
    let tradeDate = await store.get<string>(tdKey);
    if (!tradeDate) {
      tradeDate = await resolveTradeDate(call);
      if (!tradeDate) throw new Error("거래일을 정하지 못했어요");
      await store.set(tdKey, tradeDate, TRADE_DATE_TTL_SEC);
    }

    const key = `swing:judgment:${RULEBOOK.version}:${tradeDate}:${ticker}`;
    let cached = await store.get<Cached>(key);
    if (!cached) {
      const events = await getMajorReportEvents(tradeDate);
      const name = getSymbolName(ticker) ?? ticker;
      const r = await computeSwingJudgment({ ticker, name, market }, tradeDate, events, call, { prefilter: false });
      if (r.status !== "judged") {
        return NextResponse.json({ error: "일봉이 없어 판정할 수 없어요(신규 상장·거래정지)." }, { status: 404 });
      }
      cached = { judgment: r.judgment, inputHash: r.inputHash };
      await store.set(key, cached, JUDGMENT_TTL_SEC);
    }

    const [stored, liveWarnings] = await Promise.all([
      getStoredSwingRow(tradeDate, ticker, RULEBOOK.version),
      fetchActiveWarnings(ticker),
    ]);
    const body: SwingJudgmentResponse = {
      tradeDate,
      rulebookVersion: RULEBOOK.version,
      releaseMode: SWING_RELEASE[market],
      judgment: cached.judgment,
      inputHash: cached.inputHash,
      stored: stored ? { inputHash: stored.input_hash, grade: stored.grade } : null,
      matchesStored: stored ? stored.input_hash === cached.inputHash : null,
      stats: swingStatsFor(cached.judgment.grade, market),
      liveWarnings,
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    log.warn(`판정 실패 ${ticker}`, error);
    return NextResponse.json({ error: "스윙 판정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
}
