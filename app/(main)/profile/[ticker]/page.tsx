/**
 * `/profile/[ticker]` — 종목 상세 (실데이터).
 *
 * PRD `stock-api-integration` (PR-B) §3.5, AC-8.
 *
 * 본 라우트는 finsight-redesign 시리즈의 mock 시안 `/` (Home / AnalysisDashboard) 와 다른 진입점이다.
 * - `/` = mock 데모 (시각 톤 검증용, 영구 보존).
 * - `/profile/[ticker]` = **실 KIS + DART 데이터** 종단 검증 화면 (본 PR-B "이게 됐다" 단일 증거).
 *
 * 기존 `/profile` 라우트 (마이페이지) 는 Next.js App Router 의 정적/동적 세그먼트 공존 규칙에 따라
 * `/profile/page.tsx` (정적) 와 `/profile/[ticker]/page.tsx` (동적) 가 자연 공존. `/profile` 진입 →
 * 마이페이지, `/profile/005930` 진입 → 종목 상세.
 *
 * Next.js 16 — params 는 Promise 형태로 전달. server component 가 await.
 */

import { StockProfilePage } from "@/components/profile/StockProfilePage";

export default async function StockProfileRoutePage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  return <StockProfilePage ticker={ticker} />;
}
