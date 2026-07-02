/**
 * 시세 데이터 소스 토글 — `MARKET_DATA_SOURCE` env 로 kis ↔ toss 를 전환한다.
 *
 * PRD `toss-market-data-adapter` §3-2. 판정 규칙(두 조건 AND):
 *   1. `MARKET_DATA_SOURCE === "toss"` (명시 opt-in — 미설정/그 외 값 전부 kis)
 *   2. `isTossConfigured()` (TOSS_CLIENT_ID/SECRET 존재)
 *
 * → **토스 키가 없는 로컬(동료 머신)은 토글값과 무관하게 기존 KIS 경로 그대로**(목표 2).
 *
 * 적용 범위는 종목 시세·캔들·종목정보 함수 한정(하이브리드) — 지수·수급·관심종목 일괄시세는
 * 토스 API 부재/후속으로 KIS 고정. BFF 라우트의 `isKisConfigured()` mock 게이트도 무변경이라
 * 토스 모드에서도 KIS 키는 여전히 필요하다(§4).
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { isKisConfigured } from "@/lib/api/kis/client";
import { isTossConfigured } from "@/lib/api/toss/client";

export type MarketDataSource = "kis" | "toss";

export function resolveMarketDataSource(): MarketDataSource {
  const value = process.env.MARKET_DATA_SOURCE?.trim().toLowerCase();
  if (value === "toss" && isTossConfigured()) return "toss";
  return "kis";
}

/**
 * 요청 단위 "실제 서빙 소스" 추적 — X-Data-Source 관측성(PR#199 다음 작업).
 *
 * 라우트가 `trackMarketDataSource()` 로 감싸면, 그 async 컨텍스트 안에서 `withTossFallback`
 * 이 성공적으로 사용한 소스가 기록된다. 헤더는 토글 상태가 아니라 **응답 데이터의 실제 출처**:
 * 토스 성공 = "toss", 토글 off·전량 폴백 = "kis", 다콜 중 일부만 폴백 = "toss,kis".
 */
type SourceTracking = { used: Set<MarketDataSource> };

const trackingStore = new AsyncLocalStorage<SourceTracking>();

function recordServedSource(source: MarketDataSource): void {
  trackingStore.getStore()?.used.add(source);
}

export async function trackMarketDataSource<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; servedSource: string | null }> {
  const tracking: SourceTracking = { used: new Set() };
  const result = await trackingStore.run(tracking, fn);
  const list = Array.from(tracking.used).sort().reverse(); // toss 를 앞에 — "toss,kis"
  return { result, servedSource: list.length > 0 ? list.join(",") : null };
}

/**
 * 프로세스당 1회, 최초 시세 호출 시 소스 판정을 로그로 남긴다 — dev 콘솔에서 토글 상태를
 * 값 지문 없이 즉시 확인. 특히 "toss 지정했는데 키가 없어 kis 로 게이트된" 케이스(동료 로컬)를
 * 명시해 디버깅 미스터리를 없앤다.
 */
let sourceLoggedOnce = false;

function logResolvedSourceOnce(): void {
  if (sourceLoggedOnce) return;
  sourceLoggedOnce = true;
  const raw = process.env.MARKET_DATA_SOURCE?.trim().toLowerCase() ?? "";
  const resolved = resolveMarketDataSource();
  if (raw === "toss" && resolved !== "toss") {
    console.warn(
      "[marketdata] MARKET_DATA_SOURCE=toss 지정됐지만 TOSS_CLIENT_ID/SECRET 미설정 — kis 로 동작합니다(무영향 게이트).",
    );
    return;
  }
  console.info(
    `[marketdata] 시세 소스: ${resolved}${resolved === "toss" ? " (호출 실패 시 해당 호출만 KIS 폴백)" : ""}`,
  );
}

/** 테스트 전용 — 1회 로그 플래그 초기화. */
export function resetSourceLogForTest(): void {
  sourceLoggedOnce = false;
}

/**
 * 소스 위임 + 폴백 단일 지점 — 기존 KIS 함수 본문 최상단에서 호출한다.
 *
 * - 소스가 kis 면 kisFn 그대로 (무회귀 경로 — 토글 off 시 추가 비용 0).
 * - 소스가 toss 면 tossFn 시도, 실패 시:
 *   - KIS 설정돼 있으면 warn 1줄 남기고 kisFn 폴백 (PRD 목표 3).
 *   - KIS 미설정이면 토스 에러 그대로 전파 (상위 mock 분기·에러 매핑이 기존대로 처리).
 */
export async function withTossFallback<T>(
  label: string,
  tossFn: () => Promise<T>,
  kisFn: () => Promise<T>,
): Promise<T> {
  logResolvedSourceOnce();

  if (resolveMarketDataSource() !== "toss") {
    const result = await kisFn();
    recordServedSource("kis");
    return result;
  }

  try {
    const result = await tossFn();
    recordServedSource("toss");
    return result;
  } catch (error) {
    if (!isKisConfigured()) throw error;
    console.warn(
      `[marketdata] toss ${label} 실패 — KIS 폴백:`,
      error instanceof Error ? error.message : error,
    );
    const result = await kisFn();
    recordServedSource("kis");
    return result;
  }
}
