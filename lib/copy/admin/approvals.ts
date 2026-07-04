/**
 * 가입 승인(admin) 화면의 한글 카피 — `lib/copy/<domain>/` 룰(i18n 여지 분리).
 *
 * PRD `user-login-auth` §3.7:
 *   - 관리자가 대기(`pending`) 사용자를 확인하고 `approved` 로 전환하는 최소 화면.
 *   - 화면 `.tsx` 에 한글 평문 산재 금지 — 본 상수를 참조.
 */

/** 화면 제목. */
export const ADMIN_APPROVALS_TITLE = "가입 승인";
/** 화면 부제. */
export const ADMIN_APPROVALS_SUBTITLE =
  "승인 대기 중인 사용자를 확인하고 접근을 허용하세요.";
/** 목록 로딩 중. */
export const ADMIN_APPROVALS_LOADING = "불러오는 중…";
/** 목록 조회 실패. */
export const ADMIN_APPROVALS_ERROR =
  "대기 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
/** 대기자가 없을 때. */
export const ADMIN_APPROVALS_EMPTY = "승인 대기 중인 사용자가 없어요.";
/** 목록 재조회 버튼. */
export const ADMIN_APPROVALS_RETRY = "다시 시도";
/** 승인 버튼 라벨. */
export const ADMIN_APPROVE_CTA = "승인";
/** 승인 처리 중 버튼 라벨. */
export const ADMIN_APPROVE_PENDING = "승인 중…";
/** 승인 실패 안내. */
export const ADMIN_APPROVE_ERROR = "승인에 실패했어요. 다시 시도해 주세요.";
/** 대기 신청 시각 접두(예: "신청 3일 전"). */
export const ADMIN_REQUESTED_AT_PREFIX = "신청";
/** Google 프로필명이 없을 때의 이름 대체. */
export const ADMIN_NO_NAME = "이름 미상";
