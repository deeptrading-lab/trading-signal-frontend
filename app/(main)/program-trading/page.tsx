import { ProgramTradingPanel } from "@/components/programTrading/ProgramTradingPanel";
import { AccessDeniedView } from "@/components/layout/AccessDeniedView";
import { isVercelRuntime } from "@/lib/utils/runtimeEnv";

export default function ProgramTradingPage() {
  if (isVercelRuntime() || process.env.NODE_ENV !== "development") return <AccessDeniedView />;
  return <ProgramTradingPanel />;
}
