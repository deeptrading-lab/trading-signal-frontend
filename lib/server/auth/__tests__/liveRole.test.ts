/**
 * liveRole — 세션 신원 → DB 대조 신원 (live-role-check).
 *
 * 핵심 계약 4가지를 고정한다:
 *   1. DB 등급이 쿠키 등급을 **이긴다**(강등 즉시 반영).
 *   2. 승인취소(pending)는 특권 없음.
 *   3. 스토어 오류·행 없음은 **거부**(fail-closed) — 설정됐는데 확인 못 하면 열지 않는다.
 *   4. 스토어 미설정(로컬 dev)은 세션 값 폴백(개발 무마찰).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasLivePrivilege,
  resolveLiveIdentity,
} from "@/lib/server/auth/liveRole";
import {
  getProfileBySub,
  isProfileStoreConfigured,
} from "@/lib/server/auth/profileStore";
import type { SessionIdentity } from "@/lib/auth/session";
import type { Profile } from "@/lib/types/auth/profile";

vi.mock("@/lib/server/auth/profileStore", () => ({
  getProfileBySub: vi.fn(),
  isProfileStoreConfigured: vi.fn(() => true),
}));

const storeConfigured = vi.mocked(isProfileStoreConfigured);
const fetchProfile = vi.mocked(getProfileBySub);

/** 쿠키에 admin 이 구워진 세션 — 강등 전에 발급된 상황. */
const ADMIN_SESSION: SessionIdentity = {
  v: 2,
  sub: "g-1",
  email: "a@b.com",
  role: "admin",
};

function profile(over: Partial<Profile> = {}): Profile {
  return {
    sub: "g-1",
    email: "a@b.com",
    role: "user",
    status: "approved",
    displayName: "테스터",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  storeConfigured.mockReturnValue(true);
});

describe("resolveLiveIdentity", () => {
  it("DB 등급이 쿠키 등급을 이긴다 — 강등된 관리자는 특권 없음", async () => {
    fetchProfile.mockResolvedValue(profile({ role: "user" }));

    const live = await resolveLiveIdentity(ADMIN_SESSION);

    expect(live?.role).toBe("user"); // 쿠키의 admin 이 아니라 DB 의 user.
    expect(live?.live).toBe(true);
    expect(hasLivePrivilege(live, "admin")).toBe(false);
  });

  it("승인취소(pending)는 등급이 남아 있어도 특권 없음", async () => {
    fetchProfile.mockResolvedValue(profile({ role: "admin", status: "pending" }));

    const live = await resolveLiveIdentity(ADMIN_SESSION);

    expect(live?.status).toBe("pending"); // 표시용으로는 그대로 노출.
    expect(hasLivePrivilege(live, "admin")).toBe(false);
  });

  it("스토어 오류는 거부한다(fail-closed)", async () => {
    fetchProfile.mockRejectedValue(new Error("network"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(resolveLiveIdentity(ADMIN_SESSION)).resolves.toBeNull();
    expect(hasLivePrivilege(null, "admin")).toBe(false);
    warn.mockRestore();
  });

  it("삭제된 유저(행 없음)도 거부한다", async () => {
    fetchProfile.mockResolvedValue(null);
    await expect(resolveLiveIdentity(ADMIN_SESSION)).resolves.toBeNull();
  });

  it("스토어 미설정(로컬 dev)이면 세션 값으로 폴백 — DB 조회 0", async () => {
    storeConfigured.mockReturnValue(false);

    const live = await resolveLiveIdentity(ADMIN_SESSION);

    expect(live).toEqual({
      sub: "g-1",
      email: "a@b.com",
      role: "admin",
      status: "approved",
      live: false,
    });
    expect(fetchProfile).not.toHaveBeenCalled();
    expect(hasLivePrivilege(live, "admin")).toBe(true);
  });

  it("세션이 없거나 신원 세션이 아니면 null", async () => {
    await expect(resolveLiveIdentity(null)).resolves.toBeNull();
    await expect(resolveLiveIdentity({ v: 1 } as SessionIdentity)).resolves.toBeNull();
  });

  it("승인된 superadmin 은 하위 등급 요구를 모두 통과한다", async () => {
    fetchProfile.mockResolvedValue(profile({ role: "superadmin" }));

    const live = await resolveLiveIdentity(ADMIN_SESSION);

    expect(hasLivePrivilege(live, "user")).toBe(true);
    expect(hasLivePrivilege(live, "admin")).toBe(true);
    expect(hasLivePrivilege(live, "superadmin")).toBe(true);
  });
});
