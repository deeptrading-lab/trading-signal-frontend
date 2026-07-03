/**
 * 토스 매수 유의사항(시장경보·VI) 조회 — PRD `stock-warnings` §3-1.
 *
 * `GET /api/v1/stocks/{symbol}/warnings` — 정리매매·단기과열·투자경고·투자위험·VI 발동 중
 * **활성 항목만** 배열로 온다. AI 종합분석 그라운딩 1줄과 종목 상세 경고 칩이 소비한다.
 *
 * ## ⚠️ 첫 "토스 전용" 데이터 — KIS 폴백 없음
 *
 * 시세 어댑터(`withTossFallback` 계열)와 달리 대응 KIS TR 을 쓰지 않는다. 따라서
 * `MARKET_DATA_SOURCE` 토글과 무관하게 `isTossConfigured()` 만 게이트로 보고, 키 없는
 * 로컬(동료 머신)·토스 장애·404 전부 **빈 배열로 조용히 디그레이드** 한다 — 경보는 부가
 * 정보라 실패가 화면·분석 진행을 막으면 안 된다(never-throw).
 *
 * ## 캐시 (성공·실패 60s + single-flight)
 *
 * TTL 60s 는 VI(실시간 계열, 발동 수 초 내 반영) 신선도 기준 — 지정 계열(일배치)엔 과하게
 * 짧지만 콜 수가 미미해(종목 상세 진입·분석 1회당 1콜, `STOCK` 그룹 5/s) 단순화를 택한다.
 * `createKisMetaLoader`(tossEnrich)를 재사용하지 않는 이유: 국내 6자리 가드(여긴 미국 티커
 * 포함 심볼 무관)와 KIS 행 방지용 예산 레이스(여긴 호출자가 직접 await)가 이 경로에 부적합.
 */

import { isTossConfigured, tossGet } from "./client";
import type { TossStockWarning } from "./types";
import type { StockWarningItem } from "@/lib/types/stock/warnings";

const SUCCESS_TTL_MS = 60_000;
const FAILURE_TTL_MS = 60_000;
/**
 * 스펙 Symbol 패턴(국내 6자리 + 미국 티커, '.'·'-' 허용)에 두 가지 강화 — 리뷰 F-1:
 * 길이 캡(20)과 영문숫자 1자 이상. `encodeURIComponent` 는 `.` 을 인코딩하지 않아
 * "." / ".." 만으로 된 입력이 URL 정규화 시 경로 세그먼트를 이탈할 수 있다.
 */
const SYMBOL_RE = /^[A-Za-z0-9.\-]{1,20}$/;
const HAS_ALNUM_RE = /[A-Za-z0-9]/;

/** BFF route 의 400 판정과 로더 게이트가 같은 규칙을 쓰도록 단일 위치. */
export function isValidWarningsSymbol(symbol: string): boolean {
  return SYMBOL_RE.test(symbol) && HAS_ALNUM_RE.test(symbol);
}

/** 캐시 상한 — 유니크 심볼 난사로 Map 이 무한 성장하지 않게 오래된 키부터 축출(리뷰 F-2). */
const MAX_CACHE_ENTRIES = 512;

type CacheEntry = {
  /** null = 직전 조회 실패(실패 캐시). */
  value: StockWarningItem[] | null;
  cachedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<StockWarningItem[]>>();

/** warningType 없는 행 제거 + null 정규화. unknown warningType 은 그대로 통과(스펙 의무). */
function normalizeWarnings(rows: TossStockWarning[]): StockWarningItem[] {
  return rows
    .filter(
      (row): row is TossStockWarning & { warningType: string } =>
        typeof row?.warningType === "string" && row.warningType.length > 0,
    )
    .map((row) => ({
      warningType: row.warningType,
      exchange: row.exchange ?? null,
      startDate: row.startDate ?? null,
      endDate: row.endDate ?? null,
    }));
}

/** 상한 초과 시 삽입 순서상 가장 오래된 키 축출 후 적재. */
function setCache(symbol: string, value: StockWarningItem[] | null): void {
  if (!cache.has(symbol) && cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest != null) cache.delete(oldest);
  }
  cache.set(symbol, { value, cachedAt: Date.now() });
}

async function load(symbol: string): Promise<StockWarningItem[]> {
  try {
    const rows = await tossGet<TossStockWarning[]>(
      `/api/v1/stocks/${encodeURIComponent(symbol)}/warnings`,
    );
    const items = normalizeWarnings(Array.isArray(rows) ? rows : []);
    setCache(symbol, items);
    return items;
  } catch {
    // 404(종목 없음)·5xx·네트워크 전부 빈 배열 수렴 + 실패 캐시로 재시도 억제.
    setCache(symbol, null);
    return [];
  } finally {
    inflight.delete(symbol);
  }
}

/**
 * 활성 매수 유의사항 조회 — **never-throw**.
 * 키 미설정·형식 밖 심볼·조회 실패 = 빈 배열(부가 정보 fail-soft).
 */
export async function fetchActiveWarnings(
  symbol: string,
): Promise<StockWarningItem[]> {
  const normalized = symbol.trim().toUpperCase();
  if (!isTossConfigured()) return [];
  if (!isValidWarningsSymbol(normalized)) return [];

  const hit = cache.get(normalized);
  if (hit) {
    const ttl = hit.value === null ? FAILURE_TTL_MS : SUCCESS_TTL_MS;
    if (Date.now() - hit.cachedAt < ttl) return hit.value ?? [];
  }

  let pending = inflight.get(normalized);
  if (!pending) {
    pending = load(normalized);
    inflight.set(normalized, pending);
  }
  return pending;
}

export function resetWarningsForTest(): void {
  cache.clear();
  inflight.clear();
}
