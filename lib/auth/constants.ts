/**
 * 인증 게이트 상수 — 쿠키 이름·수명·경로를 한 곳에 모은다.
 *
 * PRD `app-password-gate` §3.2 / §6:
 *   - 쿠키 이름 인라인 문자열 산재 금지 (본 파일이 단일 진실).
 *   - maxAge 30일. 만료의 단일 진실은 토큰 payload `exp`(서명 검증) 이고
 *     쿠키 maxAge 는 같은 30일을 쓰되 보조 수단(클라 변조 가능 → 서버는 항상 서명 검증).
 *
 * Edge 호환 — 본 파일은 상수만, 런타임 API 미사용.
 */

/** 세션 쿠키 이름. middleware·route handler·검증 유틸이 공유한다. */
export const SESSION_COOKIE_NAME = "app_auth";

/** 세션 수명 — 30일(초). 쿠키 `Max-Age` 와 토큰 `exp` 둘 다 동일 값. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 2_592_000 = 30일.

/**
 * 토큰 payload 버전.
 *   - `1` = 구 공유 비밀번호 세션(`signSession`, 신원 없음). **비밀번호 로그인 폐지 → 거부**
 *     (`verifySession`/`readSession` 이 v!==2 를 무효 처리, 남은 30일 쿠키 강제 재로그인).
 *     `signSession` 은 이 v=1 거부 동작을 검증하는 테스트에서만 사용된다(프로덕션 발급 경로 없음).
 *   - `2` = Google 로그인 신원 세션(`signIdentitySession`, `sub`/`email`/`role` 포함) — 유일한 유효 버전.
 */
export const SESSION_TOKEN_VERSION = 1;

/** 신원(Google 로그인) 세션 payload 버전. */
export const SESSION_TOKEN_VERSION_IDENTITY = 2;

/**
 * OAuth state(CSRF) 쿠키 이름 — `/api/auth/google/start` 가 발급, `callback` 이 대조.
 * PRD user-login-auth §3.3 / AC-19: httpOnly + 콜백 쿼리 state 와 일치해야 통과(불일치 400).
 */
export const OAUTH_STATE_COOKIE_NAME = "oauth_state";

/** OAuth state 쿠키 수명(초) — authorize 왕복 시간만. 10분이면 충분. */
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60; // 600.
