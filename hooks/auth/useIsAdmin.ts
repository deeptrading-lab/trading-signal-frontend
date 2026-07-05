/**
 * useIsAdmin — 현재 세션이 관리자인지(표시용) 도메인 훅.
 *
 * PRD `market-status-aware-home` §3-5. 컴포넌트는 `useQuery` 를 직접 import 하지 않고 이 훅만 소비한다
 * (`docs/rules/frontend.md` §1·§2). 반환은 boolean 하나 — role 판정은 서버(HMAC 검증)에서만 이뤄지고,
 * 이 값은 "다시 시도" 버튼 노출 여부만 결정한다(재시도는 공개 랭킹 refetch 라 위조돼도 실질 위험 0).
 *
 * 로딩/미인증/에러는 모두 false(안전 기본) — 확정 전엔 버튼을 숨긴다.
 */

"use client";

import { useQueryAuthMe } from "@/hooks/query/useQueryAuthMe";

export function useIsAdmin(): boolean {
  const { data } = useQueryAuthMe();
  return data?.isAdmin ?? false;
}
