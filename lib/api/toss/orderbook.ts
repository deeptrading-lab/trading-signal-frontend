/**
 * 토스 호가창(매수/매도 잔량) 조회 — PRD `toss-orderbook` §3-1.
 *
 * `GET /api/v1/orderbook?symbol=` — 매도(asks) 10 + 매수(bids) 10 단계. 종목 상세·단타 워치의
 * 순간 수급 압력(매수벽/매도벽) 표시가 소비한다.
 *
 * ## ⚠️ 두 번째 "토스 전용" 데이터 — KIS 폴백 없음
 *
 * `warnings.ts` 와 동일하게 대응 KIS TR(실시간호가)을 쓰지 않는다. `MARKET_DATA_SOURCE` 토글과
 * 무관하게 `isTossConfigured()` 만 게이트로 보고, 키 없는 로컬·토스 장애·404·빈 응답 전부
 * **빈 호가로 조용히 디그레이드**(never-throw) — 호가는 부가 정보라 실패가 화면을 막으면 안 된다.
 *
 * ## 캐시 (성공 3s·실패 10s + single-flight)
 *
 * 호가는 초 단위로 변해 warnings(60s)보다 훨씬 신선도가 높다 → 성공 TTL 3s(지면 폴링 주기와 정렬).
 * 실패는 10s 로 재시도 억제. 캐시 상한 512·오래된 키 축출은 `warnings.ts` `setCache` 답습.
 */

import { isTossConfigured, tossGet } from "./client";
import type { TossOrderbook, TossOrderbookLevel } from "./types";
import type { Orderbook, OrderbookLevel } from "@/lib/types/stock/orderbook";
import { EMPTY_ORDERBOOK } from "@/lib/types/stock/orderbook";

const SUCCESS_TTL_MS = 3_000;
const FAILURE_TTL_MS = 10_000;

/** warnings 와 동일 심볼 규칙(국내 6자리 + 미국 티커, '.'·'-' 허용 + 길이 캡 + 영숫자 1자↑). */
const SYMBOL_RE = /^[A-Za-z0-9.\-]{1,20}$/;
const HAS_ALNUM_RE = /[A-Za-z0-9]/;

/** BFF route 의 400 판정과 로더 게이트가 같은 규칙을 쓰도록 단일 위치. */
export function isValidOrderbookSymbol(symbol: string): boolean {
  return SYMBOL_RE.test(symbol) && HAS_ALNUM_RE.test(symbol);
}

/** 캐시 상한 — 유니크 심볼 난사로 Map 이 무한 성장하지 않게 오래된 키부터 축출. */
const MAX_CACHE_ENTRIES = 512;

type CacheEntry = {
  /** null = 직전 조회 실패(실패 캐시). */
  value: Orderbook | null;
  cachedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Orderbook>>();

/** 문자열 → 유한 양수만. 비유한·음수·null 은 undefined(단계 제외 신호). */
function toPositive(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** 문자열 잔량 → 유한 0 이상, 아니면 0. */
function toQty(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** 원본 단계 배열 → 정규화 단계(가격 유효 단계만) + 총잔량. */
function normalizeLevels(rows: TossOrderbookLevel[] | undefined): {
  levels: OrderbookLevel[];
  total: number;
} {
  const levels: OrderbookLevel[] = [];
  let total = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const price = toPositive(row?.price);
    if (price === undefined) continue; // 가격 없는/0 단계 방어.
    const qty = toQty(row?.volume);
    levels.push({ price, qty });
    total += qty;
  }
  return { levels, total };
}

/**
 * 토스 원본 → 앱 표준 `Orderbook`. **순수 함수**(후속 단타 컨텍스트 주입 PR 이 재사용).
 *   - asks 오름차순(최우선=최저가 먼저)·bids 내림차순(최우선=최고가 먼저) 정렬 보장.
 *   - 스프레드 = 최우선 매도 − 최우선 매수(양쪽 존재 시만), % 는 중간가 기준.
 *   - 유효 단계 0/0 = 빈 호가.
 */
export function normalizeOrderbook(raw: TossOrderbook | null | undefined): Orderbook {
  const { levels: asks, total: totalAskQty } = normalizeLevels(raw?.asks);
  const { levels: bids, total: totalBidQty } = normalizeLevels(raw?.bids);

  asks.sort((a, b) => a.price - b.price); // 오름차순: asks[0]=최우선(최저).
  bids.sort((a, b) => b.price - a.price); // 내림차순: bids[0]=최우선(최고).

  if (asks.length === 0 && bids.length === 0) return EMPTY_ORDERBOOK;

  const bestAsk = asks[0]?.price ?? null;
  const bestBid = bids[0]?.price ?? null;
  let spread: number | null = null;
  let spreadPct: number | null = null;
  if (bestAsk != null && bestBid != null) {
    spread = bestAsk - bestBid;
    const mid = (bestAsk + bestBid) / 2;
    spreadPct = mid > 0 ? (spread / mid) * 100 : null;
  }

  return {
    bids,
    asks,
    totalBidQty,
    totalAskQty,
    spread,
    spreadPct,
    updatedAt: raw?.timestamp ?? null,
    isEmpty: false,
  };
}

/** 상한 초과 시 삽입 순서상 가장 오래된 키 축출 후 적재. */
function setCache(symbol: string, value: Orderbook | null): void {
  if (!cache.has(symbol) && cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest != null) cache.delete(oldest);
  }
  cache.set(symbol, { value, cachedAt: Date.now() });
}

async function load(symbol: string): Promise<Orderbook> {
  try {
    const raw = await tossGet<TossOrderbook>("/api/v1/orderbook", { symbol });
    const orderbook = normalizeOrderbook(raw);
    setCache(symbol, orderbook);
    return orderbook;
  } catch {
    // 404(종목 없음)·5xx·네트워크 전부 빈 호가 수렴 + 실패 캐시로 재시도 억제.
    setCache(symbol, null);
    return EMPTY_ORDERBOOK;
  } finally {
    inflight.delete(symbol);
  }
}

/**
 * 호가 조회 — **never-throw**.
 * 키 미설정·형식 밖 심볼·조회 실패 = 빈 호가(부가 정보 fail-soft).
 */
export async function fetchOrderbook(symbol: string): Promise<Orderbook> {
  const normalized = symbol.trim().toUpperCase();
  if (!isTossConfigured()) return EMPTY_ORDERBOOK;
  if (!isValidOrderbookSymbol(normalized)) return EMPTY_ORDERBOOK;

  const hit = cache.get(normalized);
  if (hit) {
    const ttl = hit.value === null ? FAILURE_TTL_MS : SUCCESS_TTL_MS;
    if (Date.now() - hit.cachedAt < ttl) return hit.value ?? EMPTY_ORDERBOOK;
  }

  let pending = inflight.get(normalized);
  if (!pending) {
    pending = load(normalized);
    inflight.set(normalized, pending);
  }
  return pending;
}

export function resetOrderbookForTest(): void {
  cache.clear();
  inflight.clear();
}
