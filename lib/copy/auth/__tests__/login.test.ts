/**
 * `loginOAuthErrorMessage` 단위 테스트 — `/login?error=<code>` → 친화 한글 안내 매핑.
 *
 * PRD `user-login-auth` §3.4 / AC-18·19:
 *   - 콜백/시작 라우트가 실는 코드별(oauth_disabled·oauth·email_unverified) 안내 확정.
 *   - 코드 없음 → null(배너 미표시). 모르는 코드 → generic 폴백(구체 사유 비노출 — 보안).
 */

import { describe, it, expect } from "vitest";
import {
  loginOAuthErrorMessage,
  LOGIN_ERROR_GENERIC,
} from "@/lib/copy/auth/login";

describe("loginOAuthErrorMessage", () => {
  it("코드가 없으면 null(배너 미표시)", () => {
    expect(loginOAuthErrorMessage(null)).toBeNull();
    expect(loginOAuthErrorMessage(undefined)).toBeNull();
    expect(loginOAuthErrorMessage("")).toBeNull();
  });

  it("알려진 코드는 전용 한글 메시지", () => {
    expect(loginOAuthErrorMessage("oauth_disabled")).toBe(
      "지금은 Google 로그인을 사용할 수 없어요.",
    );
    expect(loginOAuthErrorMessage("email_unverified")).toContain("이메일");
    expect(loginOAuthErrorMessage("oauth")).toContain("실패");
  });

  it("모르는 코드는 generic 으로 폴백(구체 사유 비노출)", () => {
    expect(loginOAuthErrorMessage("weird_code")).toBe(LOGIN_ERROR_GENERIC);
    // invalid_state(400)·profile_store_error(500)는 JSON 응답이라 /login 으로 오지 않지만 방어적 폴백.
    expect(loginOAuthErrorMessage("invalid_state")).toBe(LOGIN_ERROR_GENERIC);
  });
});
