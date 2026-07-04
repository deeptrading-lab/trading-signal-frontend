/**
 * `/login` 화면의 한글 카피 — `lib/copy/<domain>/` 룰(i18n 여지 분리).
 *
 * PRD `app-password-gate` §3.4 / AC-17:
 *   - 로그인 화면 `.tsx` 에 한글 평문 산재 금지 — 본 상수를 참조.
 *   - 실패 메시지에 비밀번호 값/구체적 사유/힌트 노출 금지(보안).
 */

/** 화면 안내 1줄. 브랜드 워드마크는 `BrandLockup`(→ `NAV_BRAND_LABEL`) 단일 소스 공유. */
export const LOGIN_SUBTITLE = "이용하려면 비밀번호를 입력해 주세요.";
/** 비밀번호 입력 라벨. */
export const LOGIN_PASSWORD_LABEL = "비밀번호";
/** 비밀번호 입력 placeholder. */
export const LOGIN_PASSWORD_PLACEHOLDER = "비밀번호 입력";
/** 제출 버튼 라벨. */
export const LOGIN_SUBMIT = "입장하기";
/** 제출 중 버튼 라벨. */
export const LOGIN_SUBMIT_PENDING = "확인 중…";
/** 비밀번호 불일치 — 힌트 노출 0(보안). */
export const LOGIN_ERROR_INVALID = "비밀번호가 올바르지 않아요.";
/** 통신·서버 오류 등 그 외 실패. */
export const LOGIN_ERROR_GENERIC =
  "로그인에 실패했어요. 잠시 후 다시 시도해 주세요.";
/** 게이트 비활성 상태에서 제출 시 안내(비밀번호 미설정). */
export const LOGIN_ERROR_GATE_DISABLED =
  "비밀번호 보호가 꺼져 있어요. 바로 이용할 수 있어요.";
