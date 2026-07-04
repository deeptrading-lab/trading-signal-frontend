/**
 * `/login` — 로그인 화면(Google 로그인 + 전환기 비밀번호 폴백).
 *
 * PRD `app-password-gate` §3.4 / `user-login-auth` §3.4:
 *   - 라우트 그룹 `(main)` **밖** — 글로벌 셸(Sidebar/Header/BottomNav)을 상속하지 않는 풀스크린 폼.
 *   - 서버 컴포넌트가 `process.env` 로 방식 활성 여부를 계산해 `LoginForm` 에 **boolean flag 만** 넘긴다
 *     (secret 값은 클라이언트로 넘기지 않는다 — AC-17):
 *       · `googleEnabled`   = `GOOGLE_OAUTH_CLIENT_ID`·`_SECRET`·`_REDIRECT_URI` 3종 모두 존재.
 *       · `passwordEnabled` = `APP_PASSWORD` 존재.
 *   - `useSearchParams`(LoginForm 내부) 는 Suspense 경계가 필요 → 본 page 가 Suspense 로 감싼다.
 *   - `force-dynamic` — env 를 요청 시점에 읽어 방식 노출을 결정(빌드 타임 정적 캡처 방지, 게이트와 정합).
 */

import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

/** Google OAuth 구성 여부 — env 3종의 존재만 검사(값 미노출). proxy 게이트의 판정과 동일 규칙. */
function isGoogleEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REDIRECT_URI,
  );
}

export default function LoginPage() {
  const googleEnabled = isGoogleEnabled();
  const passwordEnabled = Boolean(process.env.APP_PASSWORD);

  return (
    <Suspense fallback={null}>
      <LoginForm googleEnabled={googleEnabled} passwordEnabled={passwordEnabled} />
    </Suspense>
  );
}
