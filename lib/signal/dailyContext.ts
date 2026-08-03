/**
 * 일봉 흐름 컨텍스트 (intraday-decision-overhaul I1) — 단타 진입을 상위 타임프레임(일봉)에 정렬.
 *
 * 지금까지 judge 는 일봉을 레짐(강세/약세/중립) **한 숫자**로만 봤다. 여기에 MACD 크로스·RSI·
 * 이평 배열·전고/전저 대비 위치를 얹어, "오늘 이 자리가 일봉상 살 자리인가(눌림) 아니면 추격인가
 * + 어떤 스탠스로"를 판단하게 한다. `buildContext`(일봉) 재사용 — 중복 계산 없음.
 *
 * 순수 관측 텍스트만 만든다(결정 없음). 봉 부족(<130)이면 빈 문자열(무주입 → 프롬프트 무변경).
 */
import type { StockDailyCandle } from "@/lib/api/kis/types";
import { buildContext } from "./context";
import { crossover, crossunder } from "@/lib/utils/technicalIndicators";

export function formatDailyContext(candles: StockDailyCandle[]): string {
  if (candles.length < 130) return "";
  const ctx = buildContext(candles);
  const i = ctx.i;
  const close = ctx.closes[i];
  if (!Number.isFinite(close) || close <= 0) return "";

  const parts: string[] = [];

  // ① 이평 배열 + 현재가 위치
  const { short: ma5arr, mid: ma20arr, long: ma60arr, base: ma120arr } = ctx.sma;
  const ma5 = ma5arr[i], ma20 = ma20arr[i], ma60 = ma60arr[i], ma120 = ma120arr[i];
  const rel = (ma: number | null) => (ma == null ? "?" : close > ma ? "위" : "아래");
  const bull = ma5 != null && ma20 != null && ma60 != null && ma5 > ma20 && ma20 > ma60;
  const bear = ma5 != null && ma20 != null && ma60 != null && ma5 < ma20 && ma20 < ma60;
  parts.push(
    `이평 ${bull ? "정배열(상승추세)" : bear ? "역배열(하락추세)" : "혼조"}·현재가 20일 ${rel(ma20)}/60일 ${rel(ma60)}/120일 ${rel(ma120)}`,
  );

  // ② MACD — 최근 3봉 내 골든/데드크로스, 없으면 시그널 상/하회
  const macdLine = ctx.macd.map((m) => m.macd);
  const signalLine = ctx.macd.map((m) => m.signal);
  const m = ctx.macd[i];
  if (m?.macd != null && m?.signal != null) {
    let state = m.macd > m.signal ? "시그널 상회" : "시그널 하회";
    for (let k = i; k > i - 3 && k > 0; k--) {
      if (crossover(macdLine, signalLine, k)) { state = "골든크로스 최근"; break; }
      if (crossunder(macdLine, signalLine, k)) { state = "데드크로스 최근"; break; }
    }
    parts.push(`MACD ${state}`);
  }

  // ③ RSI
  const rsi = ctx.rsi[i];
  if (rsi != null) parts.push(`RSI ${rsi.toFixed(0)}(${rsi >= 70 ? "과매수" : rsi <= 30 ? "과매도" : "중립"})`);

  // ④ 최근 20일 고점/저점 대비 위치 — 눌림(전저 근처=지지) vs 고점 추격(전고 근처=저항)
  const win = ctx.candles.slice(Math.max(0, i - 19), i + 1);
  const hi = Math.max(...win.map((c) => c.high));
  const lo = Math.min(...win.map((c) => c.low));
  if (hi > 0 && lo > 0) {
    const fromHi = ((close - hi) / hi) * 100;
    const fromLo = ((close - lo) / lo) * 100;
    parts.push(`20일 고점대비 ${fromHi >= 0 ? "+" : ""}${fromHi.toFixed(1)}%·저점대비 +${fromLo.toFixed(1)}%`);
  }

  // ⑤ 최근 5일 추세
  if (i >= 5) {
    const p5 = ctx.closes[i - 5];
    if (p5 > 0) {
      const chg5 = ((close - p5) / p5) * 100;
      parts.push(`최근5일 ${chg5 >= 0 ? "+" : ""}${chg5.toFixed(1)}%`);
    }
  }

  return `[일봉 흐름] ${parts.join(" · ")}`;
}
