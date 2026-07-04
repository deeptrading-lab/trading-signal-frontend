/**
 * `/pending`(승인 대기) 화면의 한글 카피 — `lib/copy/<domain>/` 룰(i18n 여지 분리).
 *
 * PRD `user-login-auth` §3.5:
 *   - Google 로그인은 됐으나 아직 `approved` 가 아닌(=`pending`) 사용자에게 보이는 정적 안내.
 *   - 세션·앱데이터 노출 0 — 순수 안내 문구 + 재로그인/로그아웃 액션만.
 */

/** 화면 제목. */
export const PENDING_TITLE = "승인 대기 중이에요";
/** 안내 본문 — 승인 후 재로그인이 필요함을 알린다. */
export const PENDING_DESCRIPTION =
  "관리자가 계정을 승인하면 바로 이용할 수 있어요. 승인이 완료된 뒤 다시 로그인해 주세요.";
/** 다시 로그인(계정 전환 포함) 링크 라벨 — `/login` 으로. */
export const PENDING_RELOGIN_CTA = "다시 로그인";
/** 로그아웃 버튼 라벨 — 세션(있다면)을 정리하고 로그인 화면으로. */
export const PENDING_LOGOUT_CTA = "로그아웃";
