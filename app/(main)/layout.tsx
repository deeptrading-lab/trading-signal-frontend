/**
 * (main) route group layout — finsight 글로벌 셸.
 *
 * PR3 (finsight-redesign) — 라우트 그룹 rename `(workbench)` → `(main)`.
 *   사유 (PRD §5.3 AC-L-5): 본 PR3 후 6 화면이 공유하는 layout host 가 되므로 의미상
 *         `workbench` (워크벤치 한정) → `main` (메인 셸) 로 정합.
 *   URL 영향 0건 — Next.js 라우트 그룹은 URL 에 반영되지 않음.
 *
 * 책임:
 *   - 데스크탑(`>= lg`): Sidebar (264px, viewport 전체 높이) + 우측 컬럼.
 *                      우측 컬럼 안에서 Header (sticky top) + main (스크롤 영역).
 *   - 모바일(`< md`): Header 상단 + main + BottomNav 하단 (BottomNav 가 fixed bottom-0 이므로
 *     main 의 padding-bottom 으로 콘텐츠 가림 회피).
 *   - WorkbenchSessionProvider — 워크벤치 페이지가 `/` 에 mount 되어 있는 동안 history /
 *     favorites in-session state 를 호스트 (PR3 시점 임시 — PR5 의 `/analyze` 이전 시 정리).
 *
 * 변경 사유 (PR6 fix — 사용자 dev 실측):
 *   - 시안 (`Stock and Coin Analysis App/src/app/components/AppLayout.tsx`) 의 구조 정합:
 *     Header 가 전폭이 아니라 우측 컬럼 안에서 sticky. Sidebar 는 좌측 전체 높이 점유.
 *   - `min-h-screen flex flex-col` (Header 전폭) → `h-screen overflow-hidden flex` (Sidebar 가
 *     좌측 viewport 전체 높이 점유, main 만 overflow-y-auto).
 *   - `min-h-[calc(...)]` v3 calc 제거 — 부모 `h-screen` 이 높이를 잡아준다.
 */

"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { WorkbenchSessionProvider } from "@/hooks/workbench/useWorkbenchSession";
import { AIAnalysisProvider } from "@/hooks/stock/aiAnalysisProvider";
import { GlobalAIAnalysis } from "@/components/stock/GlobalAIAnalysis";
import { cn } from "@/lib/utils/cn";

/** 카드리스 화이트 포워드 리스킨을 적용한 라우트(home-reskin → stock-detail-reskin). 점진 롤아웃 —
 * 아래 조건에 맞는 라우트만 main 배경을 흰색(surface)으로 덮는다. 나머지는 기존 회색(surface-muted)+
 * 카드 유지. 전역 `main-area`/`surface-muted` 토큰은 무변경(라우트 한정 override).
 *
 * 대상:
 *   - `/`            홈(home-reskin)
 *   - `/stock*`      종목 상세·검색(`/stock`, `/stock/[ticker]`) — stock-detail-reskin
 * `startsWith("/stock")` 는 `/stockfoo` 같은 유령 경로가 없어(라우트 트리상 `/stock` 세그먼트뿐)
 * 다른 도메인(`/market`·`/profile`·`/watchlist`·`/analyze`·`/dashboard`)으로 새지 않는다. */
function isWhiteSurfaceRoute(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/stock");
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // usePathname 은 SSR/클라 초기 렌더 동일값 → hydration mismatch 0.
  const isWhiteSurface = isWhiteSurfaceRoute(pathname);
  return (
    <WorkbenchSessionProvider>
      <AIAnalysisProvider>
      <div className="flex h-screen overflow-hidden bg-surface-muted">
        {/* 좌측 Sidebar — viewport 전체 높이 점유 (데스크탑 한정, `< lg` 에선 sidebar 합성
         *  토큰의 `hidden lg:flex` 가 미렌더). */}
        <Sidebar />
        {/* 우측 컬럼 — Header (sticky top) + main (overflow-y-auto). */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          {/* main 영역 — 모바일에서 BottomNav (fixed bottom-0, h=navbar-h + safe-area-bottom) 가
           *  콘텐츠 위에 올라가지 않도록 하단 padding 으로 spacer 확보. PWA(cover)에서 BottomNav 가
           *  홈 인디케이터만큼 더 커지므로 spacer 도 `+ env(safe-area-inset-bottom)`.
           *  추가로 `+ spacing.lg`(14px) — 마지막 카드와 BottomNav 사이 숨 쉴 여백(카드 간 gap-lg 와 동일 리듬).
           *  md+ 에서는 BottomNav 미렌더 → `md:pb-0`. */}
          <main
            className={cn(
              "flex-1 overflow-y-auto pb-[calc(theme(spacing.navbar-h)+env(safe-area-inset-bottom)+theme(spacing.lg))] md:pb-0 main-area scrollbar-hide-mobile",
              // 홈 한정 — main-area 의 surface-muted(회색) 대신 surface(흰색)로 덮는다(카드리스 화이트).
              isWhiteSurface && "bg-surface",
            )}
          >
            {children}
          </main>
        </div>
        <BottomNav />
        {/* AI 분석 패널·재열기 탭 — 셸에 두어 페이지 이동에도 백그라운드 분석이 끊기지 않게 한다. */}
        <GlobalAIAnalysis />
      </div>
      </AIAnalysisProvider>
    </WorkbenchSessionProvider>
  );
}
