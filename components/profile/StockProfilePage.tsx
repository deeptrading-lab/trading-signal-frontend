/**
 * StockProfilePage — `/stock/[ticker]` 종목 상세 셸(stock-detail-reskin).
 *
 * 카드리스·화이트 포워드 톤(홈 리스킨과 정합) — 큰 "종목 분석" 타이틀 제거, 검색바 → 상세 본문 →
 * 장중 단타 순으로 컴포즈. 페이지 제목은 접근성용 sr-only h1 로만 남긴다(노스스타 상세는 페이지
 * 타이틀 없이 시세 헤더가 시각 시작점).
 *
 * 구성:
 *   - StockViewRecorder — 마지막 본 종목 기록(side-effect only, DOM 무).
 *   - StockSearchContainer — 다른 종목으로 이동하는 검색 진입점.
 *   - StockPageLayout — T4 티어링 본문(항시: 헤더·차트·시그널 / 온디맨드: 회사·공시·수급).
 *   - IntradayReadSection — 장중 단타 판단(로컬 CLI 게이트). 별도 모듈이라 카드 유지.
 *
 * 본 컴포넌트는 server-safe — useState 0. 자식들이 `'use client'`. page.tsx 가 ticker 를 전달.
 */

import { StockSearchContainer } from "@/components/home/StockSearchContainer";
import { StockPageLayout } from "./StockPageLayout";
import { StockViewRecorder } from "./StockViewRecorder";
import { IntradayReadSection } from "@/components/stock/IntradayReadSection";
import { NAV_MENU_STOCK } from "@/lib/copy/layout/navCopy";

export interface StockProfilePageProps {
  ticker: string;
  /** 검색창 초기값 — "종목 분석" 메뉴로 진입(useStockNavClick) 시 현재 종목명을 미리 채운다. */
  initialKeyword?: string;
}

export function StockProfilePage({ ticker, initialKeyword }: StockProfilePageProps) {
  return (
    <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-2xl">
      {/* 문서 아웃라인용 접근성 제목(시각 비노출 — 카드리스 화이트 톤, 큰 페이지 타이틀 제거). */}
      <h1 className="sr-only">{NAV_MENU_STOCK}</h1>
      <StockViewRecorder ticker={ticker} />
      <StockSearchContainer initialKeyword={initialKeyword} />
      <StockPageLayout ticker={ticker} />
      <IntradayReadSection ticker={ticker} />
    </div>
  );
}
