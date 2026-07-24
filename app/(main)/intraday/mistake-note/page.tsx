import { notFound } from "next/navigation";
import { IntradayMistakeNoteDashboard } from "@/components/intraday/IntradayMistakeNoteDashboard";
import { isVercelEnv } from "@/lib/server/env";
import { loadMistakeNoteDashboard } from "@/lib/server/paperTrading/mistakeNoteDashboard";

export const dynamic = "force-dynamic";

export default async function IntradayMistakeNotePage() {
  if (isVercelEnv()) notFound();
  const data = await loadMistakeNoteDashboard();
  return <IntradayMistakeNoteDashboard data={data} />;
}
