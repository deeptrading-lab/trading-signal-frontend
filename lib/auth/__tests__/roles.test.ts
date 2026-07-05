import { describe, it, expect } from "vitest";
import { isAtLeast, isValidRole, ALL_ROLES } from "@/lib/auth/roles";

describe("roles — 위계 isAtLeast (user < admin < superadmin)", () => {
  it("자기 등급 이상은 통과", () => {
    expect(isAtLeast("user", "user")).toBe(true);
    expect(isAtLeast("admin", "admin")).toBe(true);
    expect(isAtLeast("superadmin", "superadmin")).toBe(true);
  });

  it("높은 등급은 낮은 required 통과 (superadmin·admin 이 admin 게이트 통과)", () => {
    expect(isAtLeast("superadmin", "admin")).toBe(true);
    expect(isAtLeast("superadmin", "user")).toBe(true);
    expect(isAtLeast("admin", "user")).toBe(true);
  });

  it("낮은 등급은 높은 required 미달", () => {
    expect(isAtLeast("user", "admin")).toBe(false);
    expect(isAtLeast("admin", "superadmin")).toBe(false);
    expect(isAtLeast("user", "superadmin")).toBe(false);
  });

  it("null/undefined 는 false (안전 실패 — 권한 게이트는 확정 등급만 통과)", () => {
    expect(isAtLeast(null, "user")).toBe(false);
    expect(isAtLeast(undefined, "admin")).toBe(false);
  });
});

describe("roles — isValidRole / ALL_ROLES", () => {
  it("유효 role 문자열만 true", () => {
    expect(isValidRole("user")).toBe(true);
    expect(isValidRole("admin")).toBe(true);
    expect(isValidRole("superadmin")).toBe(true);
  });

  it("그 외 입력은 false (라우트 입력 검증)", () => {
    expect(isValidRole("root")).toBe(false);
    expect(isValidRole("")).toBe(false);
    expect(isValidRole(null)).toBe(false);
    expect(isValidRole(123)).toBe(false);
    expect(isValidRole(undefined)).toBe(false);
  });

  it("ALL_ROLES 는 낮은→높은 순 3개", () => {
    expect(ALL_ROLES).toEqual(["user", "admin", "superadmin"]);
  });
});
