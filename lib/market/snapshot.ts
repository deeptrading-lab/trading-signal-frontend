/**
 * 시황 레이어 — `MarketSnapshot` 오케스트레이터 (유일한 I/O 모듈).
 *
 * PRD `market-snapshot` §3.2. KIS 실데이터를 모아 순수함수(sectors/concentration/regime)로 가공해
 * 단일 스냅샷을 조립한다. 각 섹션은 독립 try/catch — 일부 실패해도 전체 200(부분 성공, `partial`).
 *
 * 호출 예산(§3.4): 지수 5 + multprice ⌈유니버스/30⌉(~4) + ETF 일봉 청크(~3) + flow 2 ≈ 6~10콜.
 */

import {
  fetchIndexPriceShared,
  fetchOverseasIndexShared,
  fetchForeignInstitutionTotal,
  fetchIntstockMultprice,
  type MarketIndexQuote,
} from "@/lib/api/kis";
import { fetchDailyChunked } from "@/lib/api/kis/chartChunked";
import { computeDomesticFearGreed } from "@/lib/utils/fearGreed";
import {
  THEME_BASKETS,
  MEGACAP,
  BASKETS_AS_OF,
  INDEX_PROXY_ETF,
  allBasketTickers,
  basketNameByTicker,
} from "./baskets";
import { computeSectorPerf } from "./sectors";
import { computeConcentration } from "./concentration";
import { computeIndexRegime } from "./regime";
import type {
  BreadthBlock,
  FlowBlock,
  IndexBlock,
  MarketSnapshot,
  MarketSession,
} from "./types";

const DOMESTIC_CODES = ["0001", "1001", "2001"] as const;
const OVERSEAS_CODES = ["SPX", "COMP"] as const;
/** 집중도 기여 비중 산출 기준 상위 N. */
const DEFAULT_TOP_N = 5;
/** flow 상위 노출 개수. */
const FLOW_TOP_N = 7;
/** regime 일봉 룩백(캘린더일) — 120+20 거래봉 확보용 여유. */
const REGIME_LOOKBACK_DAYS = 400;

export type BuildResult = { snapshot: MarketSnapshot; callCount: number };

/**
 * 시장 스냅샷 조립. KIS 실호출을 수행하는 유일한 함수.
 * @param opts.topN 집중도 상위 N(기본 5).
 */
export async function buildMarketSnapshot(opts?: { topN?: number }): Promise<BuildResult> {
  const topN = opts?.topN ?? DEFAULT_TOP_N;
  const warnings: string[] = [];
  let calls = 0;
  let anyFail = false;

  // ── 지수 (국내 3 + 해외 2, 병렬) ──────────────────────────────────────────
  const domesticQuotes = new Map<string, MarketIndexQuote>();
  const overseasQuotes = new Map<string, MarketIndexQuote>();
  {
    const settled = await Promise.allSettled([
      ...DOMESTIC_CODES.map((c) => fetchIndexPriceShared(c)),
      ...OVERSEAS_CODES.map((c) => fetchOverseasIndexShared(c)),
    ]);
    calls += DOMESTIC_CODES.length + OVERSEAS_CODES.length;
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") {
        const code = i < DOMESTIC_CODES.length ? DOMESTIC_CODES[i] : OVERSEAS_CODES[i - DOMESTIC_CODES.length];
        (i < DOMESTIC_CODES.length ? domesticQuotes : overseasQuotes).set(code, r.value);
      } else {
        anyFail = true;
      }
    });
    if (domesticQuotes.size === 0) warnings.push("국내 지수 조회 실패 — 일부 지표 누락");
  }

  const domestic = [...domesticQuotes.values()].map(toIndexBlock);
  const overseas = [...overseasQuotes.values()].map(toIndexBlock);

  // ── 시장 폭 (KOSPI+KOSDAQ 합산) ──────────────────────────────────────────
  const breadth = computeBreadth(domesticQuotes.get("0001"), domesticQuotes.get("1001"));

  // ── 섹터 + 집중도 (multprice 일괄) ───────────────────────────────────────
  let sectors: MarketSnapshot["sectors"] = [];
  let concentration: MarketSnapshot["concentration"] = null;
  {
    const universe = allBasketTickers();
    try {
      const quotes = await fetchIntstockMultprice(universe);
      calls += Math.ceil(universe.length / 30);
      const byTicker = new Map(quotes.map((q) => [q.ticker, { changePercent: q.changePercent }]));
      const names = basketNameByTicker();
      sectors = computeSectorPerf(byTicker, THEME_BASKETS, names);
      concentration = computeConcentration(byTicker, MEGACAP, topN, BASKETS_AS_OF);
      if (quotes.length < universe.length) {
        warnings.push(`바스켓 시세 부분 확보(${quotes.length}/${universe.length})`);
      }
    } catch {
      anyFail = true;
      warnings.push("바스켓 일괄 시세 조회 실패 — 섹터·집중도 누락");
    }
  }
  if (concentration) {
    warnings.push("집중도는 시총상위 바스켓 한정 상대값(전체 구성종목 부재)이며, 가중치 기준일 " + BASKETS_AS_OF + " 추정치입니다.");
  }

  // ── 국면 (KODEX200 ETF 일봉 프록시) ─────────────────────────────────────
  let regime: MarketSnapshot["regime"] = null;
  {
    const to = kstYyyymmdd(0);
    const from = kstYyyymmdd(-REGIME_LOOKBACK_DAYS);
    try {
      const candles = await fetchDailyChunked(INDEX_PROXY_ETF.kospi.ticker, from, to);
      calls += Math.ceil(REGIME_LOOKBACK_DAYS / 130);
      const closes = candles.map((c) => c.close).filter((v) => Number.isFinite(v));
      if (closes.length > 0) {
        regime = computeIndexRegime(closes, { breadthPct: breadth?.breadthPct });
        if (closes.length < 140) warnings.push(`국면 일봉 부족(${closes.length}봉) — 장기추세 일부 미확보`);
      } else {
        warnings.push("국면 일봉 미수신 — regime 생략");
      }
    } catch {
      anyFail = true;
      warnings.push("국면 일봉(KODEX200) 조회 실패 — regime 생략");
    }
  }

  // ── 공포·탐욕 (국내 합성) ────────────────────────────────────────────────
  const kospi = domesticQuotes.get("0001");
  const domesticFg =
    kospi && kospi.advances != null && kospi.declines != null
      ? computeDomesticFearGreed({
          advances: kospi.advances,
          declines: kospi.declines,
          changePercent: kospi.changePercent,
          value: kospi.value,
          yearHigh: kospi.yearHigh,
          yearLow: kospi.yearLow,
        })
      : null;

  // ── 수급 (외국인/기관 순매수 상위) ──────────────────────────────────────
  let flow: FlowBlock | null = null;
  {
    const settled = await Promise.allSettled([
      fetchForeignInstitutionTotal("frgn"),
      fetchForeignInstitutionTotal("orgn"),
    ]);
    calls += 2;
    const foreign = settled[0].status === "fulfilled" ? settled[0].value : null;
    const inst = settled[1].status === "fulfilled" ? settled[1].value : null;
    if (foreign || inst) {
      flow = {
        foreignTop: (foreign ?? []).slice(0, FLOW_TOP_N).map(toFlowRow),
        institutionTop: (inst ?? []).slice(0, FLOW_TOP_N).map(toFlowRow),
      };
    } else {
      anyFail = true;
      warnings.push("수급 랭킹 조회 실패");
    }
  }

  const snapshot: MarketSnapshot = {
    asOf: new Date().toISOString(),
    session: estimateSession(),
    dataSource: anyFail ? "partial" : "live",
    indices: { domestic, overseas },
    breadth,
    sectors,
    concentration,
    regime,
    fearGreed: { domestic: domesticFg, us: null },
    flow,
    warnings,
  };

  return { snapshot, callCount: calls };
}

// ── 매퍼 ─────────────────────────────────────────────────────────────────────

function toIndexBlock(q: MarketIndexQuote): IndexBlock {
  const block: IndexBlock = {
    code: q.code,
    name: q.name,
    value: q.value,
    change: q.change,
    changePercent: q.changePercent,
    direction: q.direction,
    yearHigh: q.yearHigh,
    yearLow: q.yearLow,
  };
  if (q.yearHigh != null && q.yearLow != null && q.yearHigh > q.yearLow) {
    block.pos52w = round2((q.value - q.yearLow) / (q.yearHigh - q.yearLow));
    block.pctFrom52wHigh = round2(((q.value - q.yearHigh) / q.yearHigh) * 100);
  }
  return block;
}

function computeBreadth(
  kospi?: MarketIndexQuote,
  kosdaq?: MarketIndexQuote,
): BreadthBlock | null {
  const adv = (kospi?.advances ?? 0) + (kosdaq?.advances ?? 0);
  const dec = (kospi?.declines ?? 0) + (kosdaq?.declines ?? 0);
  const unch = (kospi?.unchanged ?? 0) + (kosdaq?.unchanged ?? 0);
  if (adv + dec + unch === 0) return null;
  const denom = adv + dec;
  return {
    advances: adv,
    declines: dec,
    unchanged: unch,
    advanceDeclineRatio: denom > 0 ? round2(adv / denom) : 0.5,
    breadthPct: round2((adv / (adv + dec + unch)) * 100),
  };
}

function toFlowRow(r: { ticker: string; name: string; changePercent: number; netBuyAmount: number }) {
  return {
    ticker: r.ticker,
    name: r.name,
    changePercent: r.changePercent,
    netBuyAmount: r.netBuyAmount,
  };
}

// ── KST 시각 유틸 ─────────────────────────────────────────────────────────────

/** 오늘+offsetDays 의 KST 날짜 YYYYMMDD. */
function kstYyyymmdd(offsetDays: number): string {
  const kst = new Date(Date.now() + 9 * 3_600_000 + offsetDays * 86_400_000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** 장 세션 추정(KST 시각 기반, 휴장 정밀 판정은 안 함). */
function estimateSession(): MarketSession {
  const kst = new Date(Date.now() + 9 * 3_600_000);
  const day = kst.getUTCDay(); // 0=일,6=토
  if (day === 0 || day === 6) return "closed";
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  if (minutes < 9 * 60) return "pre";
  if (minutes <= 15 * 60 + 30) return "open";
  if (minutes <= 18 * 60) return "post";
  return "closed";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
