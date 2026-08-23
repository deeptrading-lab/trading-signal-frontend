/**
 * `app/api/admin/approvals/route.ts` 단위 테스트 (PRD user-login-auth AC-10·11).
 *
 *   - role != admin(쿠키 없음·v=1·user) → 403(게이트 통과해도 라우트가 방어).
 *   - admin GET → 대기목록, POST {sub} → 승인 ok.
 *   - body 불량 → 400, 스토어 오류 → 500.
 *
 * profileStore(list/setStatus)는 mock, 세션 서명/검증은 실제(위조 role 차단 경로 포함).
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import {
  getProfileBySub,
  isProfileStoreConfigured,
  listPendingProfiles,
  setProfileStatus,
} from "@/lib/server/auth/profileStore";
import { signIdentitySession, signSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type { Profile } from "@/lib/types/auth/profile";

vi.mock("@/lib/server/auth/profileStore", () => ({
  listPendingProfiles: vi.fn(),
  setProfileStatus: vi.fn(),
  // live-role-check — 가드가 DB 등급을 대조한다. 기본은 **미설정**으로 두어 기존 케이스가
  // 그대로 "쿠키 role → 결과" 계약을 검증하게 한다(스토어 미설정 = 세션 폴백 경로).
  // 라이브 경로(강등 즉시 반영)는 아래 별도 describe 에서 configured=true 로 검증한다.
  isProfileStoreConfigured: vi.fn(() => false),
  getProfileBySub: vi.fn(),
}));

const mockList = vi.mocked(listPendingProfiles);
const mockSetStatus = vi.mocked(setProfileStatus);
const mockStoreConfigured = vi.mocked(isProfileStoreConfigured);
const mockGetProfile = vi.mocked(getProfileBySub);

const ORIGINAL_SECRET = process.env.APP_AUTH_SECRET;

beforeEach(() => {
  process.env.APP_AUTH_SECRET = "admin-secret-0123456789abcdef";
  mockStoreConfigured.mockReturnValue(false);
});

afterEach(() => {
  vi.clearAllMocks();
  if (ORIGINAL_SECRET === undefined) delete process.env.APP_AUTH_SECRET;
  else process.env.APP_AUTH_SECRET = ORIGINAL_SECRET;
});

function makeRequest(
  method: "GET" | "POST",
  options?: { cookie?: string; body?: unknown },
): NextRequest {
  const headers = new Headers();
  if (options?.cookie) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${options.cookie}`);
  }
  const init: { method: string; headers: Headers; body?: string } = {
    method,
    headers,
  };
  if (options?.body !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(options.body);
  }
  return new NextRequest("http://localhost/api/admin/approvals", init);
}

async function adminCookie(): Promise<string> {
  return (await signIdentitySession({
    sub: "admin-sub",
    email: "admin@example.com",
    role: "admin",
  })) as string;
}

describe("GET/POST /api/admin/approvals — role 방어(AC-11)", () => {
  it("쿠키 없음 → 403", async () => {
    expect((await GET(makeRequest("GET"))).status).toBe(403);
    expect((await POST(makeRequest("POST", { body: { sub: "x" } }))).status).toBe(
      403,
    );
  });

  it("v=1(비밀번호) 세션 → role 없음 → 403", async () => {
    const token = (await signSession()) as string;
    const res = await GET(makeRequest("GET", { cookie: token }));
    expect(res.status).toBe(403);
  });

  it("user role 세션 → 403", async () => {
    const token = (await signIdentitySession({
      sub: "u",
      email: "u@example.com",
      role: "user",
    })) as string;
    const res = await GET(makeRequest("GET", { cookie: token }));
    expect(res.status).toBe(403);
    expect(mockList).not.toHaveBeenCalled();
  });
});

describe("admin 정상 흐름", () => {
  it("admin GET → 대기목록 반환", async () => {
    mockList.mockResolvedValue([
      {
        sub: "sub-9",
        email: "pending@example.com",
        role: "user",
        status: "pending",
        displayName: null,
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z",
      },
    ]);
    const res = await GET(makeRequest("GET", { cookie: await adminCookie() }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profiles).toHaveLength(1);
    expect(body.profiles[0].sub).toBe("sub-9");
  });

  it("[AC-10] admin POST {sub} → 승인 ok", async () => {
    mockSetStatus.mockResolvedValue();
    const res = await POST(
      makeRequest("POST", { cookie: await adminCookie(), body: { sub: "sub-9" } }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockSetStatus).toHaveBeenCalledWith("sub-9", "approved");
  });

  it("admin POST body 불량 → 400", async () => {
    const res = await POST(
      makeRequest("POST", { cookie: await adminCookie(), body: { notSub: 1 } }),
    );
    expect(res.status).toBe(400);
    expect(mockSetStatus).not.toHaveBeenCalled();
  });

  it("[AC-16] admin GET 스토어 오류 → 500", async () => {
    mockList.mockRejectedValue(new Error("db down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(makeRequest("GET", { cookie: await adminCookie() }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "profile_store_error" });
    errorSpy.mockRestore();
  });
});

describe("live-role-check — 쿠키 등급이 아니라 DB 등급으로 판정", () => {
  /** 쿠키에는 admin 이 구워져 있지만 DB 에서는 강등/승인취소된 상태를 만든다. */
  function storedProfile(over: Partial<Profile>): Profile {
    return {
      sub: "admin-sub",
      email: "admin@example.com",
      role: "admin",
      status: "approved",
      displayName: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...over,
    };
  }

  it("강등된 관리자(쿠키 admin · DB user) → 403", async () => {
    mockStoreConfigured.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(storedProfile({ role: "user" }));

    const res = await GET(makeRequest("GET", { cookie: await adminCookie() }));

    expect(res.status).toBe(403);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("승인취소된 관리자(DB status=pending) → 403", async () => {
    mockStoreConfigured.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(storedProfile({ status: "pending" }));

    expect(
      (await GET(makeRequest("GET", { cookie: await adminCookie() }))).status,
    ).toBe(403);
  });

  it("DB 에서도 admin 이면 통과", async () => {
    mockStoreConfigured.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(storedProfile({}));
    mockList.mockResolvedValue([]);

    expect(
      (await GET(makeRequest("GET", { cookie: await adminCookie() }))).status,
    ).toBe(200);
  });

  it("프로필 스토어 오류 → 403 (fail-closed)", async () => {
    mockStoreConfigured.mockReturnValue(true);
    mockGetProfile.mockRejectedValue(new Error("network"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      (await GET(makeRequest("GET", { cookie: await adminCookie() }))).status,
    ).toBe(403);
    warn.mockRestore();
  });
});
