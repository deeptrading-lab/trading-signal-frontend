import { IntradayWatchWorkspace } from "@/components/intraday/IntradayWatchWorkspace";
import { AccessDeniedView } from "@/components/layout/AccessDeniedView";
import { hasServerRole } from "@/lib/auth/serverGuard";
import { isVercelRuntime } from "@/lib/utils/runtimeEnv";

export default async function IntradayPage() {
  // prod(Vercel)는 admin 이상만, 로컬(dev)은 전체 — 메뉴 노출 규칙(getVisibleNavItems)과 동일.
  // Edge 게이트는 role 을 안 보므로 직접 URL 접근을 여기서 방어(prod 한정).
  if (isVercelRuntime() && !(await hasServerRole("admin"))) {
    return <AccessDeniedView />;
  }
  return <IntradayWatchWorkspace />;
}
