/**
 * 분석 히스토리 도메인 훅 — 사이드바·드로어가 호출하는 view.
 *
 * 책임: `useWorkbenchSession` Context 에서 history 만 노출. pushHistory 는
 * 메인 페이지의 mutation 성공 시점에 호출되므로 일반 컴포넌트에는 노출하지 않는다 — 단,
 * sidebar 항목 클릭에 의한 입력 복원은 entry.lastInput 을 page.tsx 가 처리하는 방식.
 *
 * 외부 인터페이스:
 *   - history       : AnalyzeHistoryEntry[] (최근 ticker 최대 5건, LRU)
 *   - pushHistory   : (entry) => void — mutation 성공 시 자동 호출용 (page.tsx 만 사용)
 */

"use client";

import { useWorkbenchSession } from "@/hooks/workbench/useWorkbenchSession";
import type { AnalyzeHistoryEntry } from "@/hooks/workbench/useWorkbenchSession";

export type UseAnalyzeHistoryResult = {
  history: AnalyzeHistoryEntry[];
  pushHistory: (entry: AnalyzeHistoryEntry) => void;
};

export function useAnalyzeHistory(): UseAnalyzeHistoryResult {
  const { history, pushHistory } = useWorkbenchSession();
  return { history, pushHistory };
}

export type { AnalyzeHistoryEntry };
