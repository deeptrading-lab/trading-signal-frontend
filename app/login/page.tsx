/**
 * `/login` — 공유 비밀번호 입력 화면.
 *
 * PRD `app-password-gate` §3.4 / AC-18:
 *   - 라우트 그룹 `(main)` **밖** — 글로벌 셸(Sidebar/Header/BottomNav)을 상속하지 않는 풀스크린 폼.
 *   - `useSearchParams`(LoginForm 내부) 는 Suspense 경계가 필요 → 본 page 가 Suspense 로 감싼다.
 *   - 미니멀 폼 — 신규 디자인 토큰 0, 기존 v8 합성 클래스만(LoginForm).
 */

import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
