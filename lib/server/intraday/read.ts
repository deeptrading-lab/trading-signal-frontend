/**
 * 장중 단타 판단(참고) — on-demand standalone read. intraday-scalping-agent §0(decision-support).
 *
 * 종목 1개의 분봉을 즉시 페치 → 결정론 시그널·레벨(매물대/박스/구조 TP·SL) + 2-에이전트 그룹 서사 →
 * 사람이 보는 판단 근거를 반환한다. **자동 수익/집행 주장 없음** — 최종 판단·집행은 사람.
 * 로컬 CLI(구독) 기반 → Vercel 미지원(라우트가 503). paper-trading 틱과 달리 세션·포지션 없음.
 */

import { fetchMinuteHistory } from "@/lib/api/kis/minuteChartChunked";
import { fetchDailyChunked } from "@/lib/api/kis/chartChunked";
import { fetchStockPrice } from "@/lib/api/kis";
import { dailyRegimeFromCandles, resolveIntradayProfile } from "@/lib/signal/intradayProfile";
import {
  decideIntradayWithCli,
  buildIntradayLevels,
} from "@/lib/server/paperTrading/decisionProviders/intradayCli";
import { kstHhmm } from "@/lib/server/paperTrading/intradayTickDecision";
import {
  PAPER_TRADING_DEFAULT_MAX_POSITION_PCT,
  PAPER_TRADING_INTRADAY_PRIOR_DAYS,
  PAPER_TRADING_INTRADAY_TICK_INTERVAL_MINUTES,
  PAPER_TRADING_INTRADAY_TIMEFRAME,
} from "@/lib/server/paperTrading/constants";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";
import type { IntradayReadResponse } from "@/lib/types/intraday/intradayDecision";

function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

export interface ReadIntradayOptions {
  timeframe?: number;
  provider?: AIAnalysisProvider;
  abortSignal: AbortSignal;
}

export async function readIntraday(
  ticker: string,
  opts: ReadIntradayOptions,
): Promise<IntradayReadResponse> {
  const timeframe = opts.timeframe ?? PAPER_TRADING_INTRADAY_TIMEFRAME;
  const profile = resolveIntradayProfile(timeframe);

  // 분봉 — 당일 + 전일 warmup(priorDays). 콜이 많아 latency 큼(on-demand 허용).
  const minuteCandles = await fetchMinuteHistory(ticker, {
    timeframe,
    priorDays: PAPER_TRADING_INTRADAY_PRIOR_DAYS,
  });

  // 일봉 레짐(분봉 regimeOverride). 실패는 0(중립)으로 degrade.
  let dailyRegime: -1 | 0 | 1 = 0;
  try {
    const to = ymd(new Date());
    const from = new Date();
    from.setDate(from.getDate() - 200);
    dailyRegime = dailyRegimeFromCandles(await fetchDailyChunked(ticker, ymd(from), to));
  } catch {
    dailyRegime = 0;
  }

  const priceData = await fetchStockPrice(ticker).catch(() => null);
  const lastClose = minuteCandles.at(-1)?.close ?? 0;
  const price = priceData && priceData.price > 0 ? priceData.price : lastClose;
  const name = priceData?.name ?? ticker;
  const nowHhmm = kstHhmm(new Date().toISOString());

  const levels = buildIntradayLevels(minuteCandles, lastClose > 0 ? lastClose : price, timeframe);

  const { intraday } = await decideIntradayWithCli({
    ticker,
    name,
    minuteCandles,
    timeframe,
    // on-demand 단독 판단엔 세션 주기가 없다 — env 기본 주기를 참고 시야로 전달.
    tickIntervalMinutes: PAPER_TRADING_INTRADAY_TICK_INTERVAL_MINUTES,
    dailyRegime,
    price,
    nowHhmm,
    position: null,
    previousDecision: null,
    dailyLossKill: false,
    riskMode: "balanced",
    maxPositionPct: PAPER_TRADING_DEFAULT_MAX_POSITION_PCT,
    provider: opts.provider ?? "claude",
    abortSignal: opts.abortSignal,
    forceAgents: true, // 사람이 직접 요청 — HOLD 라도 분석가 서사 필요.
  });

  const warning =
    minuteCandles.length < profile.softMinBars
      ? `분봉 데이터 부족(${minuteCandles.length}봉 < ${profile.softMinBars}봉) — 장 초반·저유동 종목은 판단 신뢰도가 낮아요.`
      : undefined;

  return {
    ticker,
    name,
    asOf: intraday.signal.asOf,
    price,
    timeframe,
    signal: intraday.signal,
    levels,
    decision: intraday,
    warning,
  };
}
