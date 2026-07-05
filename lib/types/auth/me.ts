/**
 * `/api/auth/me` 응답 타입 — 현재 세션의 role(표시용).
 *
 * PRD `market-status-aware-home` §3-5. 서버(`readSession`, HMAC 검증)에서만 role 을 판정하고
 * 클라는 이 값을 **표시용**으로만 쓴다(특권 동작 없음 — "다시 시도" 버튼 노출 여부만). 세션 없음/시크릿
 * 부재/위조는 서버가 `role: null` 로 안전 실패(401 아님 — 이미 게이트 통과한 세션의 role 조회).
 */

import type { ProfileRole } from "@/lib/types/auth/profile";

export type AuthMeResponse = {
  /** 검증된 세션 role. 신원 세션(v=2)만 존재, 그 외/미인증은 null. */
  role: ProfileRole | null;
  /** `role === "admin"` 파생값 — 클라 편의(서버가 계산해 내려 클라 재판정 불필요). */
  isAdmin: boolean;
};
