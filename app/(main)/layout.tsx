/**
 * (main) route group layout — finsight 글로벌 셸.
 *
 * PR3 (finsight-redesign) — 라우트 그룹 rename `(workbench)` → `(main)`.
 *   사유 (PRD §5.3 AC-L-5): 본 PR3 후 6 화면이 공유하는 layout host 가 되므로 의미상
 *         `workbench` (워크벤치 한정) → `main` (메인 셸) 로 정합.
 *   URL 영향 0건 — Next.js 라우트 그룹은 URL 에 반영되지 않음.
 *
 * 책임:
 *   - Header 렌더 (sticky top-0, 글래스 효과).
 *   - 데스크탑(`>= lg`): Sidebar (264px) + main 영역의 2-column 셸.
 *   - 모바일(`< md`): Header 상단 + main + BottomNav 하단 (BottomNav 가 fixed bottom-0 이므로
 *     main 의 padding-bottom 으로 콘텐츠 가림 회피).
 *   - WorkbenchSessionProvider — 워크벤치 페이지가 `/` 에 mount 되어 있는 동안 history /
 *     favorites in-session state 를 호스트 (PR3 시점 임시 — PR5 의 `/analyze` 이전 시 정리).
 *
 * 변경 사유 (legacy `(workbench)/layout.tsx` → 본 파일):
 *   - 워크벤치 한정 history/favorites 측면 패널 (Sidebar/MobileDrawer/SidebarContent) 제거.
 *   - 6 메뉴 글로벌 셸 (Header / Sidebar / BottomNav) 도입.
 *   - 워크벤치 페이지 (`page.tsx`) 의 ticker change 이벤트 dispatch 는 그대로 동작
 *     (수신자가 mount 되어 있지 않으면 자연 무시 — 회귀 위험 0).
 */

"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { WorkbenchSessionProvider } from "@/hooks/workbench/useWorkbenchSession";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkbenchSessionProvider>
      <div className="min-h-screen flex flex-col bg-surface-muted">
        <Header />
        <div className="flex flex-1 min-h-0 items-stretch min-h-[calc(100vh-theme(spacing.navbar-h))]">
          <Sidebar />
          {/* main 영역 — 모바일에서 BottomNav (fixed bottom-0, h=navbar-h) 가
           *  콘텐츠 위에 올라가지 않도록 하단 padding 으로 spacer 확보. md+ 에서는 BottomNav 미렌더. */}
          <main className="flex-1 min-w-0 main-area pb-navbar-h md:pb-0">{children}</main>
        </div>
        <BottomNav />
      </div>
    </WorkbenchSessionProvider>
  );
}
