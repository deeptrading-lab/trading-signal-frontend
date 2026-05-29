/**
 * 관심종목 영구화 — 저장소 격리 모듈.
 *
 * PRD `watchlist-real-data` §3.5 / §8.4 — 본 모듈이 **유일한 localStorage 접근점**이다.
 * 추후 engine 쪽 API 를 통한 DB 저장으로 마이그레이션 시 `readEntries`/`writeEntries`
 * 두 함수의 내부 구현만 교체하면 되고, `useWatchlistTickers` 훅·컴포넌트·BFF 는 무변경이 목표다.
 * (engine DB 교체 경계 — frontend.md 도메인 한 뎁스 + 저장소 중립 시그니처.)
 *
 * 저장 모델: `WatchlistEntry { ticker, name? }` 배열. ticker 와 함께 **추가 시점의 종목명**을
 * 들고 다녀, 시세 부분실패(디그레이드 행)에서도 종목을 식별할 수 있게 한다(UI 점검 #2).
 * 구버전(`string[]`) 저장값은 read 시 `{ ticker }` 로 자동 마이그레이션한다(name 미보유).
 *
 * SSR 안전: `window`/`localStorage` 접근은 모두 가드 뒤에서만. 서버 렌더에서는 빈 배열/no-op.
 */

/** 관심종목 1건 — ticker + 추가 시점 종목명(저장소 중립 스키마). */
export type WatchlistEntry = {
  ticker: string;
  /** 추가 시점 종목명. 구버전 마이그레이션·직접 추가 등으로 미보유면 undefined. */
  name?: string;
};

const STORAGE_KEY = "watchlist:tickers";
/** 시드를 한 번이라도 적용했는지 플래그 — 사용자가 전부 삭제해 0개가 돼도 재시드 금지(§3.5). */
const SEEDED_KEY = "watchlist:seeded";

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * 영구화된 관심종목 엔트리 배열을 읽는다. 미설정/파싱 실패 시 빈 배열.
 *
 * 하위호환: 구버전 `string[]`(ticker 만) 저장값은 `{ ticker }` 로 마이그레이션해 반환한다.
 */
export function readEntries(): WatchlistEntry[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): WatchlistEntry | null => {
        // 구버전: 문자열 ticker 배열.
        if (typeof item === "string") return { ticker: item };
        // 신버전: { ticker, name? } 객체.
        if (
          item != null &&
          typeof item === "object" &&
          typeof (item as { ticker?: unknown }).ticker === "string"
        ) {
          const ticker = (item as { ticker: string }).ticker;
          const name = (item as { name?: unknown }).name;
          return typeof name === "string"
            ? { ticker, name }
            : { ticker };
        }
        return null;
      })
      .filter((e): e is WatchlistEntry => e !== null);
  } catch {
    return [];
  }
}

/** 관심종목 엔트리 배열을 영구화한다. SSR/실패 시 no-op. */
export function writeEntries(entries: readonly WatchlistEntry[]): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
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
