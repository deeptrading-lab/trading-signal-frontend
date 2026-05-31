/**
 * 최근 검색 종목 — localStorage 유틸리티.
 *
 * 저장 키: `finsight:recent-searches` / 최대 5건 / 최신순(인덱스 0이 가장 최근).
 * 동일 ticker 재검색 시 기존 항목을 제거하고 맨 앞으로 이동(dedupe + bump).
 *
 * SSR 안전: localStorage 접근은 모두 hasWindow() 가드 뒤에서만 실행.
 */

const STORAGE_KEY = "finsight:recent-searches";
const MAX_ITEMS = 5;

export type RecentSearchEntry = {
  ticker: string;
  name: string;
};

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readRecentSearches(): RecentSearchEntry[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentSearchEntry =>
        item != null &&
        typeof item === "object" &&
        typeof (item as RecentSearchEntry).ticker === "string" &&
        typeof (item as RecentSearchEntry).name === "string",
    );
  } catch {
    return [];
  }
}

/** 새 항목을 맨 앞에 추가. 동일 ticker 가 있으면 기존 제거 후 삽입(dedupe + bump). */
export function addRecentSearch(entry: RecentSearchEntry): void {
  if (!hasWindow()) return;
  try {
    const existing = readRecentSearches().filter((e) => e.ticker !== entry.ticker);
    const updated = [entry, ...existing].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage 접근 실패 — 화면 동작은 유지
  }
}
