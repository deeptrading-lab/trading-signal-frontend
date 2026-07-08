import { PaperTradingDetailContainer } from "@/components/paperTrading/PaperTradingDetailContainer";
import { AccessDeniedView } from "@/components/layout/AccessDeniedView";
import { hasServerRole } from "@/lib/auth/serverGuard";

type PaperTradingDetailPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function PaperTradingDetailPage({
  params,
}: PaperTradingDetailPageProps) {
  // 관리자 전용 — Edge 게이트는 role 을 안 보므로 직접 방어(직접 URL 접근 차단).
  if (!(await hasServerRole("admin"))) return <AccessDeniedView />;
  const { sessionId } = await params;
  return <PaperTradingDetailContainer sessionId={sessionId} />;
}
