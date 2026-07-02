/**
 * 토스 종목 마스터(`GET /api/v1/stocks`) 조회 + 프로세스 내 24h 캐시.
 *
 * PRD `toss-market-data-adapter` §3-3. 현재가 경로(name·상장주수)와 `fetchStockInfo` 위임이
 * 같은 마스터를 반복 조회하므로 캐시로 흡수한다(마스터는 일 단위로만 변함).
 * KIS `search-stock-info`(prod 전용·국내 한정)와 달리 env 무관 + 미국 티커 동작.
 */

import { pickTossArray, tossGet } from "./client";
import { makeTossBusinessError } from "./errors";
import type { TossStockRow } from "./types";
import type { StockInfo, StockMarket } from "@/lib/api/kis/types";

const MASTER_TTL_MS = 24 * 60 * 60 * 1_000;

type CacheEntry = { row: TossStockRow; cachedAt: number };

const cache = new Map<string, CacheEntry>();

/**
 * 종목 마스터 1건 — 캐시 우선. 응답에 심볼이 없으면 null (미상장 등).
 */
export async function getTossStockMaster(symbol: string): Promise<TossStockRow | null> {
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.cachedAt < MASTER_TTL_MS) return hit.row;

  const result = await tossGet<unknown>("/api/v1/stocks", { symbols: symbol });
  const rows = pickTossArray<TossStockRow>(result, "stocks");
  const row = rows.find((r) => r.symbol === symbol) ?? rows[0] ?? null;
  if (row) cache.set(symbol, { row, cachedAt: Date.now() });
  return row;
}

/** 토스 market 문자열 → 앱 `StockMarket` 배지. 미국(NASDAQ/NYSE 등)·미지 값은 "기타". */
function mapTossMarket(row: TossStockRow): StockMarket {
  if (row.securityType?.toUpperCase() === "ETF") return "ETF";
  const market = row.market?.trim().toUpperCase();
  if (market === "KOSPI") return "KOSPI";
  if (market === "KOSDAQ") return "KOSDAQ";
  if (market === "KONEX") return "KONEX";
  return "기타";
}

/**
 * `fetchStockInfo` 의 토스 구현 — `StockInfo` 반환 계약 유지.
 *
 * 토스 미제공 필드 디그레이드(§8): `isAdminItem`(관리종목)=false 고정,
 * `isKospi200`/`industryName`=undefined (UI 는 옵셔널/불리언 배지라 미표시로 수렴).
 */
export async function fetchStockInfoToss(ticker: string): Promise<StockInfo> {
  const row = await getTossStockMaster(ticker);
  if (!row) {
    throw makeTossBusinessError(404, {
      error: { code: "stock-not-found", message: "요청한 종목을 찾을 수 없어요." },
    });
  }

  return {
    ticker,
    name: row.name?.trim() || row.englishName?.trim() || ticker,
    market: mapTossMarket(row),
    isTradeStopped: Boolean(row.koreanMarketDetail?.krxTradingSuspended),
    isAdminItem: false,
    isKospi200: undefined,
    industryName: undefined,
  };
}

/** 테스트 전용 — 마스터 캐시 초기화. */
export function resetTossStockMasterForTest(): void {
  cache.clear();
}
