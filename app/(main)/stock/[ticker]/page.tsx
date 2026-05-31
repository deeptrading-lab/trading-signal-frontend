import { StockProfilePage } from "@/components/profile/StockProfilePage";

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  return <StockProfilePage ticker={ticker} />;
}
