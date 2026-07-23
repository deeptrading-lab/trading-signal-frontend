import { describe, expect, it } from "vitest";
import {
  getSupabaseServiceConfig,
  isSupabaseEgressDisabled,
} from "@/lib/server/supabase/egressGuard";

describe("Supabase egress guard", () => {
  it.each(["1", "true", "TRUE", "on", "yes"])(
    "차단값 %s이면 URL/key가 있어도 설정을 반환하지 않는다",
    (value) => {
      const env = {
        SUPABASE_EGRESS_DISABLED: value,
        SUPABASE_URL: "https://example.supabase.co/",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
      };

      expect(isSupabaseEgressDisabled(env)).toBe(true);
      expect(getSupabaseServiceConfig(env)).toBeNull();
    },
  );

  it("차단하지 않으면 기존 URL/key 설정을 정규화해 반환한다", () => {
    expect(
      getSupabaseServiceConfig({
        SUPABASE_EGRESS_DISABLED: "0",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co///",
        SUPABASE_SERVICE_ROLE_KEY: " service-role ",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      key: "service-role",
    });
  });

  it("Vercel은 별도 값이 없어도 기본 차단하고, 명시적 0으로만 재활성화한다", () => {
    const vercelEnv = {
      VERCEL: "1",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
    };

    expect(isSupabaseEgressDisabled(vercelEnv)).toBe(true);
    expect(getSupabaseServiceConfig(vercelEnv)).toBeNull();
    expect(
      isSupabaseEgressDisabled({
        ...vercelEnv,
        SUPABASE_EGRESS_DISABLED: "0",
      }),
    ).toBe(false);
  });

  it("URL 또는 service role key가 없으면 미설정으로 처리한다", () => {
    expect(getSupabaseServiceConfig({ SUPABASE_URL: "https://example.supabase.co" })).toBeNull();
    expect(getSupabaseServiceConfig({ SUPABASE_SERVICE_ROLE_KEY: "service-role" })).toBeNull();
  });
});
