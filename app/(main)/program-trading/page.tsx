import { ProgramTradingPanel } from "@/components/programTrading/ProgramTradingPanel";
import { AccessDeniedView } from "@/components/layout/AccessDeniedView";
import { hasServerRole } from "@/lib/auth/serverGuard";
import { isVercelRuntime } from "@/lib/utils/runtimeEnv";

export default async function ProgramTradingPage() {
  if (isVercelRuntime() && !(await hasServerRole("admin"))) return <AccessDeniedView />;
  return <ProgramTradingPanel />;
}
