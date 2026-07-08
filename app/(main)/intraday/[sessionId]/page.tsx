import { PaperTradingDetailContainer } from "@/components/paperTrading/PaperTradingDetailContainer";
import { AccessDeniedView } from "@/components/layout/AccessDeniedView";
import { hasServerRole } from "@/lib/auth/serverGuard";
import { isVercelRuntime } from "@/lib/utils/runtimeEnv";

/**
 * `/intraday/[sessionId]` — 단타(cli-agent) 모의 세션 상세. 단타 목록 행의 "전체화면" 진입점.
 * (구 `/dashboard/paper-trading/[sessionId]` 을 단타 네임스페이스로 이전 — 목록/상세 계층 일원화.)
 * 게이트는 목록(`/intraday`)과 동일: prod(Vercel)는 admin 이상, 로컬은 전체.
 */
export default async function IntradaySessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  if (isVercelRuntime() && !(await hasServerRole("admin"))) {
    return <AccessDeniedView />;
  }
  const { sessionId } = await params;
  return <PaperTradingDetailContainer sessionId={sessionId} />;
}
