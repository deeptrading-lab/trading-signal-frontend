/**
 * 시가총액 배치 enrich 공용 로더 — 토스 마스터 `sharesOutstanding × price`.
 *
 * ⑥ "지금 뜨는 산업" 구성종목(`sectorConstituents.ts`)이 쓰던 `enrichMarketCap` 의 핵심 배치 로직을
 * 실시간 순위(⑤ `ranking-columns`)와 공유하려고 분리한다. 두 지면 모두 동일한 억제 정책을 답습한다:
 *
 *   - **토스 게이트** — `isTossConfigured()` 미충족이면 즉시 빈 맵(전부 미확보 → 호출측이 null 처리).
 *   - **동시성 캡**(`MARKETCAP_CONCURRENCY=6`) — 토스 `/api/v1/stocks`(24h 캐시)라도 콜드 시 폭주 방지.
 *   - **fail-soft** — 티커별 조회 실패·미상장·shares/price ≤ 0 은 맵에서 생략(호출측 null 처리).
 *   - **never-throw** — 배치 전체가 `Promise.allSettled` 로 개별 실패를 삼킨다.
 */

import { toNumber } from "./mappers";
import { getTossStockMaster } from "@/lib/api/toss/stockMaster";
import { isTossConfigured } from "@/lib/api/toss/client";

/** 시총 enrich 동시성 캡 — 토스 `/api/v1/stocks` 조회(24h 캐시)라도 콜드 시 폭주 방지. */
export const MARKETCAP_CONCURRENCY = 6;

/** 시총 산출 입력 — 티커 + 현재가(원). */
export type MarketCapInput = {
  ticker: string;
  price: number;
};

/**
 * 티커별 시가총액(원) 맵을 best-effort 로 채운다(`shares × price`).
 *
 * 토스 미설정이면 빈 맵. 설정 시 동시성 캡 배치로 마스터를 조회해 계산하고,
 * 실패·미상장·비정상 값은 맵에서 생략한다(호출측이 null 로 처리). 절대 throw 하지 않는다.
 */
export async function loadMarketCaps(
  items: readonly MarketCapInput[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!isTossConfigured() || items.length === 0) return out;

  for (let i = 0; i < items.length; i += MARKETCAP_CONCURRENCY) {
    const batch = items.slice(i, i + MARKETCAP_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((c) => getTossStockMaster(c.ticker)),
    );
    results.forEach((result, j) => {
      if (result.status !== "fulfilled" || !result.value) return;
      const shares = toNumber(result.value.sharesOutstanding);
      const price = batch[j].price;
      if (shares > 0 && price > 0) {
        out.set(batch[j].ticker, shares * price);
      }
    });
  }
  return out;
}
