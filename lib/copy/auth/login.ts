/**
 * `/login` 화면의 한글 카피 — `lib/copy/<domain>/` 룰(i18n 여지 분리).
 *
 * PRD `app-password-gate` §3.4 / AC-17, `user-login-auth` §3.4:
 *   - 로그인 화면 `.tsx` 에 한글 평문 산재 금지 — 본 상수를 참조.
 *   - 실패 메시지에 비밀번호 값/구체적 사유/힌트 노출 금지(보안).
 *   - Google 로그인 버튼·구분선·OAuth 실패 코드별 안내를 함께 관리(전환기 비밀번호 폴백 공존).
 */

/** 비밀번호 전용 게이트 안내 1줄. 브랜드 워드마크는 `BrandLockup`(→ `NAV_BRAND_LABEL`) 단일 소스 공유. */
export const LOGIN_SUBTITLE = "이용하려면 비밀번호를 입력해 주세요.";
/** Google 로그인이 켜졌을 때의 중립 안내 1줄(비밀번호 문구 대신). */
export const LOGIN_SUBTITLE_GOOGLE = "계속하려면 로그인해 주세요.";
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

/* ---------------------------------------------------------------------------
 * Google 로그인(user-login-auth §3.4) — 버튼·구분선·게이트 비활성 안내.
 * ------------------------------------------------------------------------- */

/** "Google로 계속하기" 버튼 라벨(`<a href="/api/auth/google/start">` — 클라 fetch 0). */
export const LOGIN_GOOGLE_CTA = "Google로 계속하기";
/** Google·비밀번호 두 방식이 함께 보일 때의 구분선 라벨. */
export const LOGIN_DIVIDER = "또는";
/** OAuth·비밀번호 둘 다 꺼진 채 /login 에 직접 진입했을 때 안내(정상 흐름 아님). */
export const LOGIN_GATE_DISABLED_NOTICE = "지금은 로그인이 필요하지 않아요.";
/** 게이트 비활성 안내에서 홈으로 이동하는 링크 라벨. */
export const LOGIN_GO_HOME = "홈으로 가기";

/**
 * Google 콜백/시작 라우트가 실패 시 `/login?error=<code>` 로 실어 보내는 코드별 한글 안내.
 *   - `oauth_disabled`   : OAuth 미구성(start/callback).
 *   - `oauth`            : 사용자 취소·code 누락·토큰 교환 실패(callback).
 *   - `email_unverified` : Google 이메일 미검증(callback, AC-18).
 * invalid_state(400)·profile_store_error(500) 등 JSON 응답 코드는 /login 으로 오지 않지만,
 * 모르는 코드는 방어적으로 generic 으로 떨어뜨린다(구체 사유 노출 0 — 보안).
 */
const LOGIN_OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_disabled: "지금은 Google 로그인을 사용할 수 없어요.",
  oauth: "Google 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.",
  email_unverified:
    "이메일이 확인되지 않은 Google 계정이에요. 이메일 인증 후 다시 시도해 주세요.",
};

/**
 * `?error=` 코드 → 사용자 노출 한글 메시지. 코드가 없으면 null(배너 미표시),
 * 모르는 코드면 generic. `LoginForm` 이 상단 알림으로 노출한다.
 */
export function loginOAuthErrorMessage(
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  return LOGIN_OAUTH_ERROR_MESSAGES[code] ?? LOGIN_ERROR_GENERIC;
}
