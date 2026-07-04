/**
 * 토스 최근 체결(체결 테이프 원천) 조회 — PRD `toss-trades` §3-1.
 *
 * `GET /api/v1/trades?symbol=` — 최근 체결 배열(최신순 추정). 종목 상세·단타 워치의 체결강도
 * 게이지 + 체결 테이프가 소비한다.
 *
 * ## ⚠️ 세 번째 "토스 전용" 데이터 — KIS 폴백 없음 · side 필드 부재
 *
 * `warnings.ts`·`orderbook.ts` 와 동일하게 대응 KIS 체결 TR 을 쓰지 않는다. `MARKET_DATA_SOURCE`
 * 토글과 무관하게 `isTossConfigured()` 만 게이트로 보고, 키 없는 로컬·토스 장애·404·빈 응답 전부
 * **빈 배열로 조용히 디그레이드**(never-throw). 응답에 매수/매도 방향이 없어 체결강도는 틱룰
 * (`tradeStrength.ts`)로 파생하는 근사치다 — 본 어댑터는 정규화(문자열 파싱·유효성)만 담당하고
 * 방향 파생은 route 가 순수 함수로 수행한다.
 *
 * ## 파라미터 함정(실측 확정)
 *
 * 단수 `?symbol=<sym>` 만 유효 — `?symbols=`(복수)는 400. `count=` 파라미터 수용(full 기준 넉넉히 요청 후 UI slice).
 *
 * ## 캐시 (성공 3s·실패 10s + single-flight)
 *
 * 체결은 초 단위로 변해 orderbook 과 동일 신선도 → 성공 TTL 3s(지면 폴링 주기와 정렬). 실패는 10s 로
 * 재시도 억제. 캐시 상한 512·오래된 키 축출은 `orderbook.ts` `setCache` 답습. 캐시 키 = `symbol:count`.
 */

import { isTossConfigured, tossGet } from "./client";
import type { TossTrade } from "./types";
import type { Trade } from "@/lib/types/stock/trades";

const SUCCESS_TTL_MS = 3_000;
const FAILURE_TTL_MS = 10_000;

/** 체결 요청 기본 건수 — full(30건) 기준 넉넉히 요청 후 UI 에서 slice(PRD §9 q2). */
export const DEFAULT_TRADES_COUNT = 50;

/** orderbook 과 동일 심볼 규칙(국내 6자리 + 미국 티커, '.'·'-' 허용 + 길이 캡 + 영숫자 1자↑). */
const SYMBOL_RE = /^[A-Za-z0-9.\-]{1,20}$/;
const HAS_ALNUM_RE = /[A-Za-z0-9]/;

/** BFF route 의 400 판정과 로더 게이트가 같은 규칙을 쓰도록 단일 위치. */
export function isValidTradesSymbol(symbol: string): boolean {
  return SYMBOL_RE.test(symbol) && HAS_ALNUM_RE.test(symbol);
}

/** 캐시 상한 — 유니크 심볼 난사로 Map 이 무한 성장하지 않게 오래된 키부터 축출. */
const MAX_CACHE_ENTRIES = 512;

type CacheEntry = {
  /** null = 직전 조회 실패(실패 캐시). */
  value: Trade[] | null;
  cachedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Trade[]>>();

/**
 * 토스 원본 체결 배열 → 앱 표준 `Trade[]`. **순수 함수**(응답 순서 보존 = 최신순 가정).
 * price 유한 양수·volume 유한 0 이상·timestamp 문자열만 통과(NaN·음수·결측 방어).
 */
export function normalizeTrades(raw: TossTrade[] | null | undefined): Trade[] {
  const out: Trade[] = [];
  for (const row of Array.isArray(raw) ? raw : []) {
    const price = Number(row?.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const volume = Number(row?.volume);
    if (!Number.isFinite(volume) || volume < 0) continue;
    const timestamp = typeof row?.timestamp === "string" ? row.timestamp : "";
    if (!timestamp) continue;
    out.push({ price, volume, timestamp });
  }
  return out;
}

/** 상한 초과 시 삽입 순서상 가장 오래된 키 축출 후 적재. */
function setCache(key: string, value: Trade[] | null): void {
  if (!cache.has(key) && cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest != null) cache.delete(oldest);
  }
  cache.set(key, { value, cachedAt: Date.now() });
}

async function load(key: string, symbol: string, count: number): Promise<Trade[]> {
  try {
    const raw = await tossGet<TossTrade[]>("/api/v1/trades", { symbol, count });
    const trades = normalizeTrades(raw);
    setCache(key, trades);
    return trades;
  } catch {
    // 404(종목 없음)·5xx·네트워크 전부 빈 배열 수렴 + 실패 캐시로 재시도 억제.
    setCache(key, []);
    return [];
  } finally {
    inflight.delete(key);
  }
}

/**
 * 체결 조회 — **never-throw**. 키 미설정·형식 밖 심볼·조회 실패 = 빈 배열(부가 정보 fail-soft).
 * 반환은 정규화된 원본 순서(최신순 가정) — 방향 파생·표시 정렬은 호출부(route)가 순수 함수로 수행.
 */
export async function fetchTrades(
  symbol: string,
  count: number = DEFAULT_TRADES_COUNT,
): Promise<Trade[]> {
  const normalized = symbol.trim().toUpperCase();
  if (!isTossConfigured()) return [];
  if (!isValidTradesSymbol(normalized)) return [];

  const key = `${normalized}:${count}`;
  const hit = cache.get(key);
  if (hit) {
    const ttl = hit.value === null ? FAILURE_TTL_MS : SUCCESS_TTL_MS;
    if (Date.now() - hit.cachedAt < ttl) return hit.value ?? [];
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = load(key, normalized, count);
    inflight.set(key, pending);
  }
  return pending;
}

export function resetTradesForTest(): void {
  cache.clear();
  inflight.clear();
}
