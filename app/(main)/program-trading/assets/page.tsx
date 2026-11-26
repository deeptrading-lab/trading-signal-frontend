import { ProgramTradingAssets } from "@/components/programTrading/ProgramTradingAssets";
import { AccessDeniedView } from "@/components/layout/AccessDeniedView";
import { isVercelRuntime } from "@/lib/utils/runtimeEnv";

export default function ProgramTradingAssetsPage() {
  if (isVercelRuntime() || process.env.NODE_ENV !== "development") return <AccessDeniedView />;
  return <ProgramTradingAssets />;
}
