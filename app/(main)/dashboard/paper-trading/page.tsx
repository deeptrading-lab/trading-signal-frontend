import { PaperTradingListContainer } from "@/components/paperTrading/PaperTradingListContainer";
import { AccessDeniedView } from "@/components/layout/AccessDeniedView";
import { hasServerRole } from "@/lib/auth/serverGuard";

export default async function PaperTradingPage() {
  // 관리자 전용 — Edge 게이트는 role 을 안 보므로 직접 방어(직접 URL 접근 차단).
  if (!(await hasServerRole("admin"))) return <AccessDeniedView />;
  return <PaperTradingListContainer />;
}
