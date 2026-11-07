/**
 * 시장 추세 조회(서버) — 거래일 t 의 KOSPI·KOSDAQ EMA5 vs EMA60. KV 에 거래일 단위로 캐시한다.
 *
 * - 지수 일봉은 1콜 50봉 한도라 약 320일을 청크로 읽는다(시장당 6콜). 하루 한 번만 계산된다.
 * - 크론 마무리가 미리 채우고, 비어 있으면 목록 응답 뒤(after)에 채운다 — 사용자 요청을 기다리게 하지 않는다.
 * - KIS 점검·오류·t 봉 없음이면 null 이고 캐시하지 않는다(다음 기회에 다시).
 */

import { fetchIndexDailyChunked } from "@/lib/api/kis/indexChartChunked";
import { getKisStore } from "@/lib/api/kis/store";
import { marketTrend } from "@/lib/swing/marketTrend";
import type { SwingMarketTrend } from "@/lib/types/swing/api";
import { createLogger } from "@/lib/server/logTag";
import { addDays, ymd } from "./tradeDate";

const TTL_SEC = 36 * 3_600;
const LOOKBACK_DAYS = 320;
const INDEXES = [
  ["KOSPI", "0001"],
  ["KOSDAQ", "1001"],
] as const;
const RETRY_MS = 1_200;
const log = createLogger("swing/trend");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const key = (tradeDate: string) => `swing:trend:v1:${tradeDate}`;

export async function readSwingMarketTrend(tradeDate: string): Promise<SwingMarketTrend[] | null> {
  return getKisStore()
    .get<SwingMarketTrend[]>(key(tradeDate))
    .catch(() => null);
}

/** 캐시에 없으면 계산해 저장한다. 실패면 null. */
export async function ensureSwingMarketTrend(tradeDate: string): Promise<SwingMarketTrend[] | null> {
  const cached = await readSwingMarketTrend(tradeDate);
  if (cached) return cached;
  try {
    const out: SwingMarketTrend[] = [];
    const from = ymd(addDays(tradeDate, -LOOKBACK_DAYS));
    for (const [market, code] of INDEXES) {
      // 시장 연달아 부르면 초당 한도(EGW00201)에 걸린다(실측) — 쉬었다가 실패 시 한 번 더.
      if (out.length > 0) await sleep(RETRY_MS);
      const raw = await fetchIndexDailyChunked(code, from, ymd(tradeDate)).catch(async () => {
        await sleep(RETRY_MS);
        return fetchIndexDailyChunked(code, from, ymd(tradeDate));
      });
      const bars = raw.filter((b) => b.date <= tradeDate);
      const t = marketTrend(bars);
      if (!t || t.asOf !== tradeDate) return null;
      out.push({ market, ...t });
    }
    await getKisStore().set(key(tradeDate), out, TTL_SEC);
    return out;
  } catch (e) {
    log.warn(`trend t=${tradeDate} 실패: ${String((e as { message?: string })?.message ?? e).slice(0, 120)}`);
    return null;
  }
}
