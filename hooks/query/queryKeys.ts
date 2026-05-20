/**
 * TanStack Query 의 queryKey 상수 모음.
 *
 * 후속 PRD 화면 컴포넌트가 invalidate/refetch 시 동일 키를 참조할 수 있도록 한 곳에서 관리한다.
 */

export const queryKeys = {
  whitelist: (q: string) => ["whitelist", "search", q] as const,
  analyze: ["workbench", "analyze"] as const,
} as const;
