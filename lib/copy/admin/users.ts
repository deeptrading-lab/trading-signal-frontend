/**
 * 유저 관리(superadmin) 화면의 한글 카피 — `lib/copy/<domain>/` 룰(i18n 여지 분리).
 *
 * PRD user-login-auth Phase 2(3-tier 권한). 화면 `.tsx` 에 한글 평문 산재 금지 — 본 상수 참조.
 */

import type { ProfileRole } from "@/lib/types/auth/profile";

export const ADMIN_USERS_TITLE = "유저 관리";
export const ADMIN_USERS_SUBTITLE = "가입한 사용자의 등급과 접근 권한을 관리하세요.";
export const ADMIN_USERS_LOADING = "불러오는 중…";
export const ADMIN_USERS_ERROR =
  "사용자 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
export const ADMIN_USERS_EMPTY = "가입한 사용자가 없어요.";
export const ADMIN_USERS_RETRY = "다시 시도";
export const ADMIN_USERS_NO_NAME = "이름 미상";

/** 등급 라벨(드롭다운) — `ProfileRole` 정합. */
export const ADMIN_ROLE_LABEL: Record<ProfileRole, string> = {
  user: "일반",
  admin: "관리자",
  superadmin: "최고 관리자",
};
/** 등급 드롭다운 a11y 라벨 접두. */
export const ADMIN_ROLE_SELECT_LABEL = "등급 변경";

export const ADMIN_STATUS_APPROVED = "승인됨";
export const ADMIN_STATUS_PENDING = "대기 중";
/** 대기 사용자 승인 버튼. */
export const ADMIN_USERS_APPROVE_CTA = "승인";
/** 승인된 사용자 접근 취소 버튼. */
export const ADMIN_USERS_REVOKE_CTA = "승인 취소";
/** 가입 시각 접두(예: "가입 3일 전"). */
export const ADMIN_JOINED_PREFIX = "가입";

/** 등급 변경 일반 실패. */
export const ADMIN_ROLE_CHANGE_ERROR = "변경에 실패했어요. 다시 시도해 주세요.";
/** 마지막 superadmin 강등 차단(409). */
export const ADMIN_LAST_SUPERADMIN_ERROR =
  "마지막 최고 관리자는 강등할 수 없어요.";
