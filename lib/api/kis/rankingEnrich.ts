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
};

/** 티커별 업종명 맵 — dedup fan-out + 동시성 캡. 미조회·실패는 생략(호출측 빈칸). */
async function loadSectors(
  rows: readonly RankingEnrichRow[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const tickers = [...new Set(rows.map((r) => r.ticker))]; // 탭 내 중복 티커 제거.
  for (let i = 0; i < tickers.length; i += SECTOR_CONCURRENCY) {
    const batch = tickers.slice(i, i + SECTOR_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((t) => loadKisPriceMeta(t)),
    );
    results.forEach((result, j) => {
      if (result.status === "fulfilled" && result.value?.sector) {
        out.set(batch[j], result.value.sector);
      }
    });
  }
  return out;
}

/** 시총·산업 enrich 를 예산 내 병렬 수집(never-throw·never-block). */
async function collectEnrichment(
  rows: readonly RankingEnrichRow[],
): Promise<Enrichment> {
  const work = Promise.all([
    loadMarketCaps(rows).catch(() => new Map<string, number>()),
    loadSectors(rows).catch(() => new Map<string, string>()),
  ]).then(([marketCap, sector]) => ({ marketCap, sector }));

  return Promise.race([
    work,
    delay(ENRICH_BUDGET_MS).then(
      (): Enrichment => ({ marketCap: new Map(), sector: new Map() }),
    ),
  ]);
}

/**
 * 랭킹 행에 `marketCap`·`sector` 를 best-effort 로 얹어 반환한다.
 *
 * 미확보 값은 `marketCap=null`·`sector=undefined`(fail-soft). 원본 순서 보존. 절대 throw 안 함 —
 * enrich 실패가 랭킹 응답을 죽이지 않는다(호출 route 의 정상 200 유지).
 */
export async function enrichRankingRows<
  T extends { ticker: string; price: number },
>(rows: T[]): Promise<(T & { marketCap: number | null; sector?: string })[]> {
  const enrich =
    rows.length === 0 ? null : await collectEnrichment(rows).catch(() => null);
  return rows.map((row) => ({
    ...row,
    marketCap: enrich?.marketCap.get(row.ticker) ?? null,
    sector: enrich?.sector.get(row.ticker) ?? undefined,
  }));
}
