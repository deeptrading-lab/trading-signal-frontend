import { PaperTradingDetailContainer } from "@/components/paperTrading/PaperTradingDetailContainer";

type PaperTradingDetailPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function PaperTradingDetailPage({
  params,
}: PaperTradingDetailPageProps) {
  const { sessionId } = await params;
  return <PaperTradingDetailContainer sessionId={sessionId} />;
}
