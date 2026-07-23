/**
 * Supabase REST 긴급 차단 스위치.
 *
 * `SUPABASE_EGRESS_DISABLED=1`이면 URL/key가 설정되어 있어도 모든 서버 저장소가
 * "미설정"으로 동작한다. 월간 한도 초과 같은 상황에서 프로세스를 계속 실행하면서
 * Supabase 네트워크 호출만 즉시 0으로 만들기 위한 서버 전용 안전장치다.
 *
 * 긴급 차단을 배포 환경변수 전파보다 먼저 보장하기 위해 Vercel에서는 값이 없을 때도
 * 기본 차단한다. 다시 사용하려면 Vercel 환경변수에 명시적으로 `0`을 설정해야 한다.
 */

export type SupabaseServiceConfig = {
  url: string;
  key: string;
};

const ENABLED_VALUES = new Set(["1", "true", "on", "yes"]);

type SupabaseEnv = Readonly<Record<string, string | undefined>>;

export function isSupabaseEgressDisabled(
  env: SupabaseEnv = process.env,
): boolean {
  const configured = env.SUPABASE_EGRESS_DISABLED?.trim();
  if (configured) return ENABLED_VALUES.has(configured.toLowerCase());

  return env.VERCEL === "1" || Boolean(env.VERCEL_ENV);
}

export function getSupabaseServiceConfig(
  env: SupabaseEnv = process.env,
): SupabaseServiceConfig | null {
  if (isSupabaseEgressDisabled(env)) return null;

  const url = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  return { url: url.replace(/\/+$/, ""), key };
}
