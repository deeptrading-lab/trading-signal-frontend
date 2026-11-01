/**
 * 스윙 판정 계산 — 스크리너 크론과 종목 즉시 판정이 **같은 함수**를 쓴다(PRD `swing-judgment` AC-2.5).
 *
 * 입력 조립(KIS 일봉 'J' 수정주가 + FHPTJ04160001 수급 + DART 주요사항보고)과 입력 해시만 담당하고,
 * 판정 자체는 `judgeSwing`(lib/swing, 오프라인 백테스트와 같은 순수 함수)에 맡긴다.
 */

import { createHash } from "node:crypto";
import type { StockDailyCandle } from "@/lib/api/kis/types";
import type { InvestorTradeDay } from "@/lib/api/kis/investor-flow";
import { fetchInvestorTradeDaily } from "@/lib/api/kis/investor-flow";
import { fetchStockDailyChartKis } from "@/lib/api/kis/price";
import { fetchMajorReports } from "@/lib/api/dart/disclosure";
import { getKisStore } from "@/lib/api/kis/store";
import { normalizeDailyBar, windowOf, type SwingEvent } from "@/lib/swing/features";
import { judgeSwing, type SwingJudgment } from "@/lib/swing/judge";
import { RULEBOOK, type Rulebook, type SwingMarket } from "@/lib/swing/rulebook";
import type { KisCall } from "./pace";
import { addDays, ymd } from "./tradeDate";

/** KIS 기간 차트 1콜 ≈ 최대 100봉 → 130 달력일씩. 4청크 ≈ 360 거래일 ≥ 300봉. */
const CHUNK_DAYS = 130;
const MAX_CHUNKS = 4;
const DART_LOOKBACK_DAYS = 45;
const DART_CACHE_TTL_SEC = 3 * 24 * 3_600;

export type SwingTarget = { ticker: string; name: string; market: SwingMarket };

export type SwingComputeResult =
  | { status: "judged"; judgment: SwingJudgment; inputHash: string }
  | { status: "skipped"; reason: "no_bars" | "prefilter" };

/** 1차 거르기 — 최근 20봉 종가×거래량 평균 ≥ 20억 · 마지막 종가 ≥ 1,000원(오프라인 수집과 같은 기준). */
export function passesPrefilter(bars: StockDailyCandle[], rb: Rulebook = RULEBOOK): boolean {
  if (bars.length < rb.flowWindowDays) return false;
  const last = bars.slice(-rb.flowWindowDays);
  const adv = last.reduce((s, b) => s + b.close * b.volume, 0) / last.length;
  return last[last.length - 1].close >= rb.liquidity.minClose && adv >= rb.liquidity.prefilterAdv20Won;
}

/**
 * 판정 입력 해시(16자) — 같은 입력이면 같은 판정이라는 걸 저장 행과 즉시 판정 사이에서 확인하는 용도.
 * 판정이 실제로 읽는 범위만 넣는다: 마지막 windowBars 봉, 최근 flowWindowDays 봉 날짜의 수급, 공시 창.
 */
export function swingInputHash(
  bars: StockDailyCandle[],
  flow: InvestorTradeDay[],
  events: SwingEvent[],
  rb: Rulebook = RULEBOOK,
): string {
  const w = windowOf(bars, rb.windowBars);
  const dates = new Set(w.slice(-rb.flowWindowDays).map((b) => b.date));
  const from = w[Math.max(0, w.length - 1 - rb.dart.lookbackBars)]?.date ?? "";
  const to = w[w.length - 1]?.date ?? "";
  const canonical = {
    v: rb.version,
    b: w.map((b) => [b.date, b.open, b.high, b.low, b.close, b.volume]),
    f: flow
      .filter((f) => dates.has(f.date))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((f) => [f.date, f.tradingValue, f.person, f.foreign, f.institution, f.pension, f.privateEquity]),
    e: events
      .filter((e) => e.date > from && e.date <= to)
      .map((e) => [e.date, e.reportName])
      .sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1])),
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 16);
}

/**
 * 시장 전체 주요사항보고(최근 45일, KOSPI·KOSDAQ) → 종목별 공시 목록. KV 에 거래일 단위로 캐시한다
 * (스크리너 배치 여러 번 + 즉시 판정이 같은 목록을 공유).
 */
export async function getMajorReportEvents(tradeDate: string): Promise<Map<string, SwingEvent[]>> {
  const store = getKisStore();
  const key = `swing:dart:${tradeDate}`;
  let list = await store.get<Array<[string, string, string]>>(key);
  if (!list) {
    const from = ymd(addDays(tradeDate, -DART_LOOKBACK_DAYS));
    const to = ymd(tradeDate);
    const all = [...(await fetchMajorReports("Y", from, to)), ...(await fetchMajorReports("K", from, to))];
    list = all
      .filter((r) => /^\d{6}$/.test(r.stockCode) && r.rceptDate <= tradeDate)
      .map((r): [string, string, string] => [r.stockCode, r.rceptDate, r.reportName]);
    await store.set(key, list, DART_CACHE_TTL_SEC);
  }
  const by = new Map<string, SwingEvent[]>();
  for (const [code, date, reportName] of list) by.set(code, [...(by.get(code) ?? []), { date, reportName }]);
  return by;
}

/**
 * 한 종목 판정. prefilter=true(스크리너)면 첫 청크로 1차 거르기를 해서 통과한 종목만 나머지 일봉·수급을
 * 부른다(하루 호출량 절감). 즉시 판정은 prefilter=false — 유동성 부족도 "제외(유동성)"로 보여 준다.
 */
export async function computeSwingJudgment(
  target: SwingTarget,
  tradeDate: string,
  events: Map<string, SwingEvent[]>,
  call: KisCall,
  opts: { prefilter: boolean } = { prefilter: true },
): Promise<SwingComputeResult> {
  const bars = new Map<string, StockDailyCandle>();
  let end = tradeDate;
  for (let k = 0; k < MAX_CHUNKS; k++) {
    const start = addDays(end, -CHUNK_DAYS + 1);
    const chunk = await call(() => fetchStockDailyChartKis(target.ticker, ymd(start), ymd(end)));
    const valid = chunk
      .map(normalizeDailyBar)
      .filter((c): c is StockDailyCandle => c !== null && c.date <= tradeDate);
    if (valid.length === 0) break; // 상장 이전 구간
    for (const c of valid) bars.set(c.date, c);
    if (k === 0 && opts.prefilter && !passesPrefilter([...bars.values()].sort((a, b) => a.date.localeCompare(b.date)))) {
      return { status: "skipped", reason: "prefilter" };
    }
    if (bars.size >= RULEBOOK.windowBars) break;
    end = addDays(start, -1);
  }
  if (bars.size === 0) return { status: "skipped", reason: "no_bars" };

  const sorted = [...bars.values()].sort((a, b) => a.date.localeCompare(b.date));
  const flow = await call(() => fetchInvestorTradeDaily(target.ticker, ymd(tradeDate)));
  const ev = events.get(target.ticker) ?? [];
  const judgment = judgeSwing({ ...target, bars: sorted, flow, events: ev });
  return { status: "judged", judgment, inputHash: swingInputHash(sorted, flow, ev) };
}
