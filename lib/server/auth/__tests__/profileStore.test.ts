/**
 * `lib/server/auth/profileStore.ts` 단위 테스트 (PRD user-login-auth §3.1 / AC-13·16).
 *
 *   - 미설정 → 모든 함수 throw(ProfileStoreError) — fail-open 금지(접근 안 열림).
 *   - 최초 로그인: 허용목록 밖 = pending+user insert, 허용목록 = approved+admin insert.
 *   - 기존 로그인: email/display 만 PATCH, role·status 보존(PATCH body 에 role/status 없음).
 *   - list/setStatus 매핑, REST 오류 시 throw.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProfileStoreError,
  getProfileBySub,
  isProfileStoreConfigured,
  listPendingProfiles,
  setProfileStatus,
  upsertProfileOnLogin,
} from "@/lib/server/auth/profileStore";

const ORIGINAL_ENV = { ...process.env };

function configureEnv() {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  delete process.env.ADMIN_EMAILS;
}

/** method 별로 응답을 라우팅하는 fetch mock. GET rows 는 인자로 주입. */
function stubFetch(config: {
  getRows?: unknown[];
  writeOk?: boolean;
  writeStatus?: number;
}) {
  const mock = vi.fn((_url: unknown, init?: { method?: string }) => {
    const method = init?.method ?? "GET";
    if (method === "GET") {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => config.getRows ?? [],
        text: async () => "",
      });
    }
    // POST / PATCH
    return Promise.resolve({
      ok: config.writeOk ?? true,
      status: config.writeStatus ?? 200,
      json: async () => [],
      text: async () => "",
    });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

const EXISTING_ADMIN_ROW = {
  sub: "sub-1",
  email: "admin@example.com",
  role: "admin",
  status: "approved",
  display_name: "관리자",
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
};

beforeEach(() => {
  configureEnv();
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe("profileStore — 미설정 시 fail-open 금지(throw)", () => {
  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("[AC-16] 미설정이면 isConfigured=false 이고 모든 함수가 throw", async () => {
    expect(isProfileStoreConfigured()).toBe(false);
    await expect(getProfileBySub("s")).rejects.toBeInstanceOf(ProfileStoreError);
    await expect(
      upsertProfileOnLogin({ sub: "s", email: "e@example.com" }),
    ).rejects.toBeInstanceOf(ProfileStoreError);
    await expect(listPendingProfiles()).rejects.toBeInstanceOf(ProfileStoreError);
    await expect(setProfileStatus("s", "approved")).rejects.toBeInstanceOf(
      ProfileStoreError,
    );
  });
});

describe("upsertProfileOnLogin — 최초 로그인", () => {
  it("허용목록 밖 이메일 → pending+user 로 insert, {role:user,status:pending} 반환", async () => {
    const mock = stubFetch({ getRows: [] });
    const result = await upsertProfileOnLogin({
      sub: "new-sub",
      email: "New@Example.COM",
      displayName: "  새 사용자  ",
    });

    expect(result).toEqual({ role: "user", status: "pending" });

    // 두 번째 호출 = POST insert. body 검증.
    const insertCall = mock.mock.calls.find(
      (c) => (c[1] as { method?: string })?.method === "POST",
    );
    expect(insertCall).toBeTruthy();
    const body = (insertCall![1] as { body: string }).body;
    expect(body).toContain('"status":"pending"');
    expect(body).toContain('"role":"user"');
    // 이메일 소문자 정규화 + display 트림.
    expect(body).toContain('"email":"new@example.com"');
    expect(body).toContain('"display_name":"새 사용자"');
  });

  it("[시드] ADMIN_EMAILS 이메일 → approved+admin 으로 insert", async () => {
    process.env.ADMIN_EMAILS = "boss@example.com, other@x.com";
    const mock = stubFetch({ getRows: [] });
    const result = await upsertProfileOnLogin({
      sub: "boss-sub",
      email: "boss@example.com",
    });

    expect(result).toEqual({ role: "admin", status: "approved" });
    const insertCall = mock.mock.calls.find(
      (c) => (c[1] as { method?: string })?.method === "POST",
    );
    const body = (insertCall![1] as { body: string }).body;
    expect(body).toContain('"status":"approved"');
    expect(body).toContain('"role":"admin"');
  });
});

describe("upsertProfileOnLogin — 기존 로그인(role/status 보존)", () => {
  it("[AC-13] 기존 행이면 PATCH 로 email/display 만 갱신, role/status 는 손대지 않음", async () => {
    const mock = stubFetch({ getRows: [EXISTING_ADMIN_ROW] });
    const result = await upsertProfileOnLogin({
      sub: "sub-1",
      email: "admin@example.com",
      displayName: "새 이름",
    });

    // 기존 role/status 그대로 반환.
    expect(result).toEqual({ role: "admin", status: "approved" });

    // INSERT(POST) 는 없어야 하고 PATCH 만.
    const postCall = mock.mock.calls.find(
      (c) => (c[1] as { method?: string })?.method === "POST",
    );
    expect(postCall).toBeUndefined();

    const patchCall = mock.mock.calls.find(
      (c) => (c[1] as { method?: string })?.method === "PATCH",
    );
    expect(patchCall).toBeTruthy();
    const body = (patchCall![1] as { body: string }).body;
    expect(body).toContain('"email":"admin@example.com"');
    expect(body).toContain('"display_name":"새 이름"');
    // role/status 는 절대 갱신하지 않는다(보존).
    expect(body).not.toContain('"role"');
    expect(body).not.toContain('"status"');
  });
});

describe("list / setStatus / 오류", () => {
  it("listPendingProfiles → camelCase 매핑", async () => {
    stubFetch({
      getRows: [
        {
          sub: "sub-9",
          email: "pending@example.com",
          role: "user",
          status: "pending",
          display_name: null,
          created_at: "2026-07-02T00:00:00.000Z",
          updated_at: "2026-07-02T00:00:00.000Z",
        },
      ],
    });
    const rows = await listPendingProfiles();
    expect(rows).toEqual([
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
  });

  it("setProfileStatus → PATCH 로 status 갱신", async () => {
    const mock = stubFetch({});
    await setProfileStatus("sub-1", "approved");
    const patchCall = mock.mock.calls.find(
      (c) => (c[1] as { method?: string })?.method === "PATCH",
    );
    expect(patchCall).toBeTruthy();
    expect((patchCall![1] as { body: string }).body).toContain(
      '"status":"approved"',
    );
  });

  it("REST 오류(non-ok) → throw(fail-open 금지)", async () => {
    const mock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: async () => [],
        text: async () => "db down",
      }),
    );
    vi.stubGlobal("fetch", mock);
    await expect(getProfileBySub("s")).rejects.toBeInstanceOf(ProfileStoreError);
  });
});
