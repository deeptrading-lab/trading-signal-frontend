/**
 * 워크벤치 in-session 상태 Context — 분석 히스토리 + 즐겨찾기.
 *
 * 사이드바·메인 영역·드로어 등 여러 컴포넌트에서 동일 상태를 참조하므로
 * React Context 한 군데로 묶는다. 도메인 훅 (`useAnalyzeHistory`, `useFavorites`)
 * 은 본 Context 를 얇게 래핑한 view 다.
 *
 * 정책 (PRD §3.1.2 + §9.7~§9.9 결정 사항):
 *   - in-session 메모리만. 새로고침 시 초기화.
 *   - 분석 히스토리: 최근 ticker 5건 LRU. mutation 성공 시 자동 push (R8).
 *   - 즐겨찾기: in-session 메모리. ticker-header + 사이드바 히스토리 두 진입점에서 토글 (R6).
 *   - 신규 라이브러리 도입 0건 (Zustand 등 금지). React Context + useState 만.
 *
 * TanStack Query 인터페이스 누출 0건 — 본 훅은 페칭 훅이 아닌 in-session UI 상태 훅.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";
import type { AnalyzeRequest } from "@/lib/types/workbench/analyze";

const HISTORY_LIMIT = 5;

/**
 * 분석 히스토리 한 항목.
 *
 * ticker · alias · currency 메타는 사이드바 표시용,
 * lastInput 은 항목 클릭 시 입력값 복원에 사용 (시나리오 B step 5).
 */
export type AnalyzeHistoryEntry = {
  ticker: string;
  name: string;
  currency: string;
  lastInput: AnalyzeRequest;
  /** mutation 성공 시점의 epoch millis. 사이드바 정렬·상대 시간 표시에 사용. */
  pushedAt: number;
};

export type WorkbenchSessionState = {
  history: AnalyzeHistoryEntry[];
  favorites: WhitelistItem[];
  pushHistory: (entry: AnalyzeHistoryEntry) => void;
  isFavorite: (ticker: string) => boolean;
  toggleFavorite: (item: WhitelistItem) => void;
};

const WorkbenchSessionContext = createContext<WorkbenchSessionState | null>(
  null,
);

export function WorkbenchSessionProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<AnalyzeHistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<WhitelistItem[]>([]);

  const pushHistory = useCallback((entry: AnalyzeHistoryEntry) => {
    setHistory((prev) => {
      // 동일 ticker 가 이미 있으면 제거 후 맨 위로 promote (LRU).
      const filtered = prev.filter((e) => e.ticker !== entry.ticker);
      const next = [entry, ...filtered];
      return next.slice(0, HISTORY_LIMIT);
    });
  }, []);

  const isFavorite = useCallback(
    (ticker: string) => favorites.some((f) => f.ticker === ticker),
    [favorites],
  );

  const toggleFavorite = useCallback((item: WhitelistItem) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.ticker === item.ticker);
      if (exists) return prev.filter((f) => f.ticker !== item.ticker);
      return [item, ...prev];
    });
  }, []);

  const value = useMemo<WorkbenchSessionState>(
    () => ({ history, favorites, pushHistory, isFavorite, toggleFavorite }),
    [history, favorites, pushHistory, isFavorite, toggleFavorite],
  );

  return (
    <WorkbenchSessionContext.Provider value={value}>
      {children}
    </WorkbenchSessionContext.Provider>
  );
}

export function useWorkbenchSession(): WorkbenchSessionState {
  const ctx = useContext(WorkbenchSessionContext);
  if (!ctx) {
    throw new Error(
      "useWorkbenchSession 은 WorkbenchSessionProvider 안에서만 사용할 수 있어요.",
    );
  }
  return ctx;
}
