import { StockProfilePage } from "@/components/profile/StockProfilePage";

export default async function StockDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { ticker } = await params;
  const { q } = await searchParams;
  return <StockProfilePage ticker={ticker} initialKeyword={q} />;
}
