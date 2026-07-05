/**
 * 실시간 순위(⑤ `ranking-columns`) 서버 enrich — 시가총액(토스)·산업(KIS) best-effort.
 *
 * 랭킹 TR(`FHPST01710000`/`FHPST01700000`)은 시총·업종을 행에 싣지 않는다. 두 값은 **서버 전용
 * 자격증명**이 필요해(시총=토스 마스터 키·산업=KIS 앱키) BFF route 에서만 얻을 수 있다(PRD §3-2).
 * 본 모듈은 top-N(≤14) 행에 두 컬럼을 얹되 **랭킹 응답 자체를 절대 죽이지 않는다**(AC-8 never-block).
 *
 * 억제 정책(PRD §6-2·q2):
 *   - **시총** — 공용 `loadMarketCaps`(동시성 캡 6·토스 24h 캐시·fail-soft).
 *   - **산업** — `loadKisPriceMeta`(inquire-price per-ticker, ttl 10분·failure 60s·budget 1.2s)를
 *     동시성 캡 6 으로 fan-out. 티커 dedup(탭 내 중복 제거) + 모듈 캐시(탭 간 대형주 중복 dedup).
 *   - **전체 예산**(`ENRICH_BUDGET_MS`) — enrich 가 예산을 넘기면 이번 응답은 미보강으로 수렴하고
 *     백그라운드 로드는 계속돼 다음 요청이 캐시를 집는다(랭킹 응답 지연 상한).
 *   - **never-throw** — 모든 실패를 삼켜 route 의 정상 200(kis) 을 유지한다.
 */

import { loadMarketCaps } from "./marketCapEnrich";
import { loadKisPriceMeta } from "./price";
import { delay } from "@/lib/server/bffUtils";

/** 산업 fan-out 동시성 캡 — KIS inquire-price 초당 한도(EGW00201) 보호. */
const SECTOR_CONCURRENCY = 6;
/** enrich 전체 예산(ms) — 초과 시 이번 응답 미보강(never-block). */
const ENRICH_BUDGET_MS = 3_000;

/** enrich 입력 행 — 티커 + 현재가(시총 산출용). */
export type RankingEnrichRow = { ticker: string; price: number };

type Enrichment = {
  marketCap: Map<string, number>;
  sector: Map<string, string>;
  tradeAmount: Map<string, number>;
};

/**
 * 티커별 KIS 메타(업종명 + 거래대금) 맵 — dedup fan-out + 동시성 캡. 미조회·실패는 생략(호출측 빈칸).
 *   `loadKisPriceMeta`(inquire-price) 한 번에 sector·tradeAmount 를 함께 얻어 추가 호출이 없다
 *   (거래대금은 급상승/급하락 행에만 필요 — 거래량/거래대금 탭은 랭킹 TR 값을 그대로 유지).
 */
async function loadKisMeta(rows: readonly RankingEnrichRow[]): Promise<{
  sector: Map<string, string>;
  tradeAmount: Map<string, number>;
}> {
  const sector = new Map<string, string>();
  const tradeAmount = new Map<string, number>();
  const tickers = [...new Set(rows.map((r) => r.ticker))]; // 탭 내 중복 티커 제거.
  for (let i = 0; i < tickers.length; i += SECTOR_CONCURRENCY) {
    const batch = tickers.slice(i, i + SECTOR_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((t) => loadKisPriceMeta(t)),
    );
    results.forEach((result, j) => {
      if (result.status !== "fulfilled" || !result.value) return;
      if (result.value.sector) sector.set(batch[j], result.value.sector);
      if (typeof result.value.tradeAmount === "number") {
        tradeAmount.set(batch[j], result.value.tradeAmount);
      }
    });
  }
  return { sector, tradeAmount };
}

/** 시총·산업·거래대금 enrich 를 예산 내 병렬 수집(never-throw·never-block). */
async function collectEnrichment(
  rows: readonly RankingEnrichRow[],
): Promise<Enrichment> {
  const empty = (): Enrichment => ({
    marketCap: new Map(),
    sector: new Map(),
    tradeAmount: new Map(),
  });
  const work = Promise.all([
    loadMarketCaps(rows).catch(() => new Map<string, number>()),
    loadKisMeta(rows).catch(() => ({
      sector: new Map<string, string>(),
      tradeAmount: new Map<string, number>(),
    })),
  ]).then(([marketCap, meta]) => ({
    marketCap,
    sector: meta.sector,
    tradeAmount: meta.tradeAmount,
  }));

  return Promise.race([work, delay(ENRICH_BUDGET_MS).then(empty)]);
}

/**
 * 랭킹 행에 `marketCap`·`sector`·`tradingValue`(거래대금) 를 best-effort 로 얹어 반환한다.
 *
 * 미확보 값은 `marketCap=null`·`sector=undefined`·`tradingValue=null`(fail-soft). 원본 순서 보존.
 * `tradingValue` 는 **행이 이미 가진 값(거래량/거래대금 탭의 랭킹 TR 값)을 우선**하고, 없을 때만
 * enrich 거래대금으로 채운다(급상승/급하락 행). 절대 throw 안 함 — enrich 실패가 랭킹 응답을 죽이지
 * 않는다(호출 route 의 정상 200 유지).
 */
export async function enrichRankingRows<
  T extends { ticker: string; price: number },
>(
  rows: T[],
): Promise<
  (Omit<T, "tradingValue"> & {
    marketCap: number | null;
    sector?: string;
    tradingValue: number | null;
  })[]
> {
  const enrich =
    rows.length === 0 ? null : await collectEnrichment(rows).catch(() => null);
  return rows.map((row) => {
    // 행 자체가 거래대금을 가지면(거래량/거래대금 탭 TR 값) 그것을 우선 — enrich 보다 정확·최신.
    const ownTradingValue = (row as { tradingValue?: number | null })
      .tradingValue;
    return {
      ...row,
      marketCap: enrich?.marketCap.get(row.ticker) ?? null,
      sector: enrich?.sector.get(row.ticker) ?? undefined,
      tradingValue:
        ownTradingValue ?? enrich?.tradeAmount.get(row.ticker) ?? null,
    };
  });
}
