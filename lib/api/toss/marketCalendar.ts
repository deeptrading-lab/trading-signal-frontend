/**
 * 토스 국내 장 캘린더 조회 — PRD `toss-market-calendar` §3-1.
 *
 * `GET /api/v1/market-calendar/KR`(옵션 `?date=YYYY-MM-DD`) — 오늘 영업일 여부(휴장이면
 * `today.integrated === null`)·세션 경계(장전/정규장/시간외 + 동시호가)·다음 영업일. 장 상태
 * 배지·장시계 유틸이 소비한다.
 *
 * ## 토스 전용 — KIS 폴백 없음
 *
 * `warnings.ts`/`orderbook.ts` 와 동일하게 대응 KIS TR 이 없다. `MARKET_DATA_SOURCE` 토글과
 * 무관하게 `isTossConfigured()` 만 게이트로 보고, 키 없는 로컬·토스 장애·5xx·빈 응답 전부
 * **null 로 조용히 디그레이드**(never-throw) — 상위 `deriveMarketStatus(null, …)` 가 phase="unknown"
 * fail-soft 로 흡수한다.
 *
 * ## 캐시 (성공 15분·실패 30s + single-flight)
 *
 * 캘린더는 하루 단위로 사실상 정적(레이트리밋 헤더 3)이라 성공 TTL 을 길게(15분) 잡아 하루
 * 수콜로 억제하고, 실패는 30s 로 재시도를 촉진한다. 캐시 상한·오래된 키 축출은 `warnings.ts`
 * `setCache` 답습. 키는 `date`(기본 = 오늘 KST) 단위, single-flight 로 동시 요청 1콜 수렴.
 */

import { isTossConfigured, tossGet } from "./client";
import { todayKstDate } from "./kst";
import type { TossMarketCalendar } from "./types";

const SUCCESS_TTL_MS = 15 * 60_000;
const FAILURE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 64;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type CacheEntry = {
  /** null = 직전 조회 실패(실패 캐시). */
  value: TossMarketCalendar | null;
  cachedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<TossMarketCalendar | null>>();

/** 유효 date(YYYY-MM-DD)면 그대로, 아니면 오늘 KST. */
function resolveKey(date?: string): string {
  return date && DATE_RE.test(date) ? date : todayKstDate();
}

/** 최소 형태 방어 — today 필드가 있어야 유효 응답으로 본다. */
function isValidCalendar(raw: unknown): raw is TossMarketCalendar {
  return Boolean(raw && typeof raw === "object" && "today" in (raw as object));
}

/** 상한 초과 시 삽입 순서상 가장 오래된 키 축출 후 적재. */
function setCache(key: string, value: TossMarketCalendar | null): void {
  if (!cache.has(key) && cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest != null) cache.delete(oldest);
  }
  cache.set(key, { value, cachedAt: Date.now() });
}

async function load(key: string, date?: string): Promise<TossMarketCalendar | null> {
  try {
    const raw = await tossGet<TossMarketCalendar>(
      "/api/v1/market-calendar/KR",
      date && DATE_RE.test(date) ? { date } : undefined,
    );
    const value = isValidCalendar(raw) ? raw : null;
    setCache(key, value);
    return value;
  } catch {
    // 5xx·네트워크·파싱 실패 전부 null 수렴 + 실패 캐시로 재시도 억제.
    setCache(key, null);
    return null;
  } finally {
    inflight.delete(key);
  }
}

/**
 * 국내 장 캘린더 조회 — **never-throw**.
 * 키 미설정·조회 실패 = null(fail-soft). 성공 15분·실패 30s 캐시 + single-flight.
 */
export async function fetchMarketCalendar(
  date?: string,
): Promise<TossMarketCalendar | null> {
  if (!isTossConfigured()) return null;

  const key = resolveKey(date);
  const hit = cache.get(key);
  if (hit) {
    const ttl = hit.value === null ? FAILURE_TTL_MS : SUCCESS_TTL_MS;
    if (Date.now() - hit.cachedAt < ttl) return hit.value;
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = load(key, date);
    inflight.set(key, pending);
  }
  return pending;
}

export function resetMarketCalendarForTest(): void {
  cache.clear();
  inflight.clear();
}
