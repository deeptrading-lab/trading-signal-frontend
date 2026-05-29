/**
 * 관심종목 ticker 영구화 — 저장소 격리 모듈.
 *
 * PRD `watchlist-real-data` §3.5 / §8.4 — 본 모듈이 **유일한 localStorage 접근점**이다.
 * 추후 engine 쪽 API 를 통한 DB 저장으로 마이그레이션 시 `readTickers`/`writeTickers`
 * 두 함수의 내부 구현만 교체하면 되고, `useWatchlistTickers` 훅·컴포넌트·BFF 는 무변경이 목표다.
 * (engine DB 교체 경계 — frontend.md 도메인 한 뎁스 + 저장소 중립 시그니처.)
 *
 * SSR 안전: `window`/`localStorage` 접근은 모두 가드 뒤에서만. 서버 렌더에서는 빈 배열/no-op.
 */

const STORAGE_KEY = "watchlist:tickers";
/** 시드를 한 번이라도 적용했는지 플래그 — 사용자가 전부 삭제해 0개가 돼도 재시드 금지(§3.5). */
const SEEDED_KEY = "watchlist:seeded";

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** 영구화된 ticker 배열을 읽는다. 미설정/파싱 실패 시 빈 배열. */
export function readTickers(): string[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string");
  } catch {
    return [];
  }
}

/** ticker 배열을 영구화한다. SSR/실패 시 no-op. */
export function writeTickers(tickers: readonly string[]): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
  } catch {
    // quota 초과 등 — 영구화 실패는 화면 동작을 막지 않는다(메모리 state 는 유지).
  }
}

/** 시드를 이미 적용했는지 여부. */
export function hasSeeded(): boolean {
  if (!hasWindow()) return false;
  try {
    return window.localStorage.getItem(SEEDED_KEY) === "1";
  } catch {
    return false;
  }
}

/** 시드 적용 플래그를 기록한다(이후 0개가 돼도 재시드 안 함). */
export function markSeeded(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(SEEDED_KEY, "1");
  } catch {
    // no-op
  }
}
