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

/** 토큰 payload 버전 — 향후 스키마 변경 시 무효화 키로 사용. */
export const SESSION_TOKEN_VERSION = 1;
