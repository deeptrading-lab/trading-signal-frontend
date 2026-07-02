/**
 * 토스 모드 KIS 메타 보강 로더 — best-effort 캐시 러너.
 *
 * 토스 API 는 업종명·외국인 지분율·관리종목·표준산업분류 같은 KIS 부가 메타를 제공하지 않아
 * (PRD toss-market-data-adapter §3-3 디그레이드), 토스 모드에서 해당 UI 가 "-" 로 비었다.
 * 이 로더는 토스 응답 위에 KIS 값을 **보조 필드만** 합성한다. 설계 제약 3가지:
 *
 *   1. **best-effort** — KIS 실패(야간 500·vts 미지원·타임아웃)는 조용히 미보강으로 수렴.
 *      보강은 시세 서빙의 성패에 절대 관여하지 않는다.
 *   2. **예산 캡(budgetMs)** — KIS 가 행(hang)일 때 라우트 타임아웃(5s)을 갉아먹지 않도록
 *      호출당 대기 상한을 두고, 초과 시 이번 응답은 미보강(만료된 캐시가 있으면 그 값으로
 *      stale-while-revalidate). 로드 자체는 백그라운드로 계속돼 다음 호출이 캐시를 집는다.
 *   3. **실패 캐시(failureTtlMs)** — KIS 장애 중 매 호출이 재시도로 지연을 반복하지 않게
 *      실패도 짧게 캐시한다.
 *
 * ⚠️ 이 경로는 X-Data-Source 추적(recordServedSource)에 기록하지 않는다 — 응답의 주 데이터는
 * 여전히 토스이고, KIS 는 보조 메타만 얹는다(헤더는 "toss" 유지).
 */

import { delay } from "@/lib/server/bffUtils";

type CacheEntry<T> = {
  /** null = 직전 로드 실패(실패 캐시). */
  value: T | null;
  cachedAt: number;
};

export type KisMetaLoaderOptions<T> = {
  /** 성공 캐시 TTL(ms). */
  ttlMs: number;
  /** 실패 캐시 TTL(ms) — KIS 장애 중 재시도 빈도 상한. */
  failureTtlMs: number;
  /** 호출당 대기 예산(ms) — 초과 시 이번 호출은 미보강, 로드는 백그라운드 지속. */
  budgetMs: number;
  /** KIS 메타 페처 — throw 는 실패 캐시로 흡수된다. */
  fetcher: (ticker: string) => Promise<T>;
};

/**
 * 티커 단위 캐시 + single-flight + 예산 레이스가 붙은 메타 로더를 만든다.
 * 반환 함수는 절대 throw 하지 않는다 — 값 또는 null(미보강).
 */
export function createKisMetaLoader<T>(
  options: KisMetaLoaderOptions<T>,
): (ticker: string) => Promise<T | null> {
  const cache = new Map<string, CacheEntry<T>>();
  const inflight = new Map<string, Promise<T | null>>();

  async function load(ticker: string): Promise<T | null> {
    try {
      const value = await options.fetcher(ticker);
      cache.set(ticker, { value, cachedAt: Date.now() });
      return value;
    } catch {
      cache.set(ticker, { value: null, cachedAt: Date.now() });
      return null;
    } finally {
      inflight.delete(ticker);
    }
  }

  return async function getKisMeta(ticker: string): Promise<T | null> {
    // KIS 국내 전용 — 미국 티커 등은 시도 자체를 생략.
    if (!/^\d{6}$/.test(ticker)) return null;

    const hit = cache.get(ticker);
    if (hit) {
      const ttl = hit.value === null ? options.failureTtlMs : options.ttlMs;
      if (Date.now() - hit.cachedAt < ttl) return hit.value;
    }

    let pending = inflight.get(ticker);
    if (!pending) {
      pending = load(ticker);
      inflight.set(ticker, pending);
    }

    // 예산 레이스 — 늦으면 만료된 이전 값(있다면)으로 stale-while-revalidate.
    return Promise.race([
      pending,
      delay(options.budgetMs).then(() => hit?.value ?? null),
    ]);
  };
}
