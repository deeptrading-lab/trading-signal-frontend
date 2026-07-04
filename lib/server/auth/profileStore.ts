/**
 * 사용자 프로필 저장소 — Supabase REST(service-role) 기반 서버 전용 유틸.
 *
 * PRD user-login-auth §3.1. `lib/server/ai/decisionStore.ts` 의 `supabaseConfig()`(url+service-role)
 * 연결 패턴을 계승하되, **인증 경로라 fail-soft 가 아니다**:
 *   - Supabase 미설정/오류를 조용히 "통과"로 처리하면 승인 게이트가 붕괴한다(fail-open 금지, §8.4).
 *   - 따라서 미설정·네트워크·REST 오류는 전부 `ProfileStoreError` 로 **throw** 한다.
 *     콜백 라우트는 이를 500 으로 매핑하고 **접근을 열지 않는다**(AC-16).
 *
 * ⚠️ service-role key 는 서버(route handler)에서만. 브라우저 노출 0(AC-20).
 */

import type {
  Profile,
  ProfileLoginOutcome,
  ProfileRole,
  ProfileStatus,
} from "@/lib/types/auth/profile";

const TABLE = "profiles";
const SELECT_COLS = "sub,email,role,status,display_name,created_at,updated_at";

/** 프로필 스토어 실패 — 인증 경로에서 접근을 열지 않기 위해 명시적으로 던진다(fail-open 금지). */
export class ProfileStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileStoreError";
  }
}

type ProfileRow = {
  sub: string;
  email: string;
  role: ProfileRole;
  status: ProfileStatus;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseConfig = { url: string; key: string };

function supabaseConfig(): SupabaseConfig | null {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

/** 미설정이면 throw — 인증은 fail-soft 대상이 아니다(못 읽으면 접근 거부). */
function requireConfig(): SupabaseConfig {
  const config = supabaseConfig();
  if (!config) {
    throw new ProfileStoreError(
      "Supabase 미설정 — 프로필을 읽을 수 없어 로그인을 거부합니다(fail-open 금지).",
    );
  }
  return config;
}

/** 프로필 스토어(Supabase service-role)가 설정돼 있는지 — 라우트 게이트 힌트용. */
export function isProfileStoreConfigured(): boolean {
  return supabaseConfig() !== null;
}

function headers(key: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function errMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 허용목록(`ADMIN_EMAILS`) — 콤마 구분, 소문자 정규화 Set. */
function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

function toProfile(row: ProfileRow): Profile {
  return {
    sub: row.sub,
    email: row.email,
    role: row.role,
    status: row.status,
    displayName: row.display_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * `sub` 로 프로필 1건 조회. 없으면 null. 미설정·네트워크·REST 오류는 throw(fail-open 금지).
 */
export async function getProfileBySub(sub: string): Promise<Profile | null> {
  const config = requireConfig();
  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", SELECT_COLS);
  url.searchParams.set("sub", `eq.${sub}`);
  url.searchParams.set("limit", "1");

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { ...headers(config.key), Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    throw new ProfileStoreError(`프로필 조회 네트워크 오류: ${errMessage(error)}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ProfileStoreError(`프로필 조회 실패 status=${res.status} ${text}`);
  }

  const rows = (await res.json().catch(() => [])) as ProfileRow[];
  const row = Array.isArray(rows) ? rows[0] : undefined;
  return row ? toProfile(row) : null;
}

/**
 * 로그인 시 프로필 upsert.
 *   - **최초**(행 없음): 허용목록 이메일이면 `approved`+`admin`, 아니면 `pending`+`user` 로 insert.
 *   - **기존**(행 있음): email/display_name 만 갱신, **role·status 는 보존**.
 * 반환 = 최종 `{ role, status }`(세션 발급/게이트 분기용). 미설정·오류는 throw(AC-16).
 *
 * 동시 최초 로그인 경합(unique 충돌)은 재조회로 확정값을 반환한다(select-then-insert).
 */
export async function upsertProfileOnLogin(input: {
  sub: string;
  email: string;
  displayName?: string | null;
}): Promise<ProfileLoginOutcome> {
  const config = requireConfig();
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName?.trim() || null;

  const existing = await getProfileBySub(input.sub);
  if (existing) {
    // 기존 — email/display 만 갱신, role/status 보존(AC-13).
    await patchBySub(config, input.sub, {
      email,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    });
    return { role: existing.role, status: existing.status };
  }

  // 최초 — 허용목록이면 admin+approved 자동 시드, 아니면 user+pending.
  const isAdmin = adminEmails().has(email);
  const role: ProfileRole = isAdmin ? "admin" : "user";
  const status: ProfileStatus = isAdmin ? "approved" : "pending";

  const inserted = await insertProfile(config, {
    sub: input.sub,
    email,
    role,
    status,
    display_name: displayName,
  });
  if (inserted) return { role, status };

  // insert 충돌(동시 최초 로그인) → 먼저 insert 된 확정값을 재조회해 반환.
  const raced = await getProfileBySub(input.sub);
  if (raced) return { role: raced.role, status: raced.status };
  throw new ProfileStoreError("프로필 upsert 실패 — insert 충돌 후 재조회 불가.");
}

/** 승인 대기(`pending`) 목록 — 오래된 순(승인 화면용). 미설정·오류는 throw. */
export async function listPendingProfiles(): Promise<Profile[]> {
  const config = requireConfig();
  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", SELECT_COLS);
  url.searchParams.set("status", "eq.pending");
  url.searchParams.set("order", "created_at.asc");

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { ...headers(config.key), Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    throw new ProfileStoreError(`대기목록 조회 네트워크 오류: ${errMessage(error)}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ProfileStoreError(`대기목록 조회 실패 status=${res.status} ${text}`);
  }

  const rows = (await res.json().catch(() => [])) as ProfileRow[];
  return Array.isArray(rows) ? rows.map(toProfile) : [];
}

/** 승인 상태 변경(대기→승인 등). 미설정·오류는 throw. */
export async function setProfileStatus(
  sub: string,
  status: ProfileStatus,
): Promise<void> {
  const config = requireConfig();
  await patchBySub(config, sub, {
    status,
    updated_at: new Date().toISOString(),
  });
}

/** insert — 성공 true, unique 충돌(409/경합) false, 그 외 오류 throw. */
async function insertProfile(
  config: SupabaseConfig,
  row: {
    sub: string;
    email: string;
    role: ProfileRole;
    status: ProfileStatus;
    display_name: string | null;
  },
): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch(`${config.url}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: { ...headers(config.key), Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
  } catch (error) {
    throw new ProfileStoreError(`프로필 insert 네트워크 오류: ${errMessage(error)}`);
  }

  if (res.ok) return true;
  // 409 = unique(sub/email) 충돌 → 상위에서 재조회(경합 흡수).
  if (res.status === 409) return false;
  const text = await res.text().catch(() => "");
  throw new ProfileStoreError(`프로필 insert 실패 status=${res.status} ${text}`);
}

/** sub 로 부분 갱신 — 공통 PATCH. 미설정·오류는 throw. */
async function patchBySub(
  config: SupabaseConfig,
  sub: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("sub", `eq.${sub}`);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "PATCH",
      headers: { ...headers(config.key), Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
  } catch (error) {
    throw new ProfileStoreError(`프로필 갱신 네트워크 오류: ${errMessage(error)}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ProfileStoreError(`프로필 갱신 실패 status=${res.status} ${text}`);
  }
}
