/**
 * (workbench) route group layout — 3-section shell.
 *
 * App Router 컨벤션 (frontend.md §App Router layout.tsx 컨벤션):
 *   - app/layout.tsx = RootLayout 으로 html/body/Providers 만 책임 (이전과 동일).
 *   - 본 layout = navbar + sidebar + main 슬롯의 3-section shell + WorkbenchSessionProvider.
 *   - route group `(workbench)` 는 URL 에 반영되지 않음 → "/" 경로 무회귀.
 *
 * 책임:
 *   - Navbar 렌더 (sticky top-0).
 *   - 데스크탑(`lg+`): Navbar 아래 Sidebar(264px) + main(나머지) 의 2-column grid.
 *   - 모바일(`< lg`): Navbar 아래 main 만. Sidebar 는 CSS 측에서 `hidden lg:flex` 로 자동 숨김.
 *   - 모바일에서 hamburger 클릭 → MobileDrawer 열림. useBreakpoint().isDesktop true 로 전환되면 drawer 자동 닫힘.
 *
 * 상태 분리:
 *   - drawer open/close, 사이드바 항목 클릭 시 메인 영역 ticker / 입력값 복원 = 본 layout 의 책임.
 *   - 분석 mutation, 결과 표시 = page.tsx 의 책임.
 *   - 두 영역의 공유 상태(`selectedHistoryEntry`)는 본 layout 이 setter 를 page 로 전달.
 *
 * 호스트와 page 간 통신:
 *   - layout 은 children 의 prop 을 직접 주입할 수 없으므로, 사이드바 클릭 → 메인 영역 복원
 *     이벤트는 WorkbenchSessionProvider 외부에 둔 별도 ref/context 가 아니라 **DOM CustomEvent**
 *     로 전달한다. page.tsx 는 mount 시 `window.addEventListener("workbench:select-history", ...)`
 *     로 수신한다. layout 과 page 의 컴포넌트 경계가 React Tree 안에서는 분리돼 있어
 *     props drilling 으로 풀 수 없으므로 lightweight 한 이벤트 채널을 선택 (Zustand 미도입 원칙 무회귀).
 *
 *   대안 비교:
 *     (a) context 로 selectedTicker setter 를 노출: layout 과 page 가 같은 Provider 안에 있어야 하는데
 *         RootLayout 이 Provider 를 가지지 않는 한 어려움. WorkbenchSessionProvider 에 selectedTicker
 *         자체를 넣는 것도 가능하지만, useAnalyzeForm 의 현재 인터페이스가 selectedTicker 를 자체 보유하므로
 *         이중 출처가 발생.
 *     (b) DOM CustomEvent: 채택. layout · page 의 컴포넌트 경계를 깨지 않으면서 사이드바 클릭 신호를
 *         page 로 전달. side-effect 가 명확하고 cleanup 도 쉬움.
 *     (c) URL search param 동기화: ?ticker=AAPL 식. URL 무변경 원칙 무회귀 + SearchPanel 의 자동완성과
 *         경합 가능. 비채택.
 */

"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { WorkbenchSessionProvider } from "@/hooks/workbench/useWorkbenchSession";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";
import type { AnalyzeHistoryEntry } from "@/hooks/workbench/useWorkbenchSession";
import {
  WORKBENCH_SELECT_HISTORY_EVENT,
  WORKBENCH_SELECT_FAVORITE_EVENT,
  WORKBENCH_TICKER_CHANGE_EVENT,
  type WorkbenchSelectHistoryDetail,
  type WorkbenchSelectFavoriteDetail,
  type WorkbenchTickerChangeDetail,
} from "@/components/layout/workbenchEvents";

export default function WorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkbenchSessionProvider>
      <ShellInner>{children}</ShellInner>
    </WorkbenchSessionProvider>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const { isDesktop } = useBreakpoint();
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const drawerId = useId();

  // 모바일 → 데스크탑 리사이즈 시 drawer 자동 닫기 (AC-6 / AC-14).
  useEffect(() => {
    if (isDesktop && isDrawerOpen) {
      setDrawerOpen(false);
    }
  }, [isDesktop, isDrawerOpen]);

  // 메인 영역(page.tsx)이 선택된 ticker 를 layout 으로 알린다 — 사이드바 active 표시용.
  // page 가 발화하는 별도 CustomEvent 수신.
  useEffect(() => {
    function handleTickerChange(event: Event) {
      const detail = (event as CustomEvent<WorkbenchTickerChangeDetail>).detail;
      setSelectedTicker(detail?.ticker ?? null);
    }
    window.addEventListener(WORKBENCH_TICKER_CHANGE_EVENT, handleTickerChange);
    return () => {
      window.removeEventListener(WORKBENCH_TICKER_CHANGE_EVENT, handleTickerChange);
    };
  }, []);

  const dispatchSelectHistory = useCallback((entry: AnalyzeHistoryEntry) => {
    window.dispatchEvent(
      new CustomEvent<WorkbenchSelectHistoryDetail>(
        WORKBENCH_SELECT_HISTORY_EVENT,
        { detail: { entry } },
      ),
    );
  }, []);

  const dispatchSelectFavorite = useCallback((item: WhitelistItem) => {
    window.dispatchEvent(
      new CustomEvent<WorkbenchSelectFavoriteDetail>(
        WORKBENCH_SELECT_FAVORITE_EVENT,
        { detail: { item } },
      ),
    );
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface-muted">
      <Navbar
        showHamburger={true}
        isDrawerOpen={isDrawerOpen}
        onHamburgerClick={() => setDrawerOpen((v) => !v)}
        drawerId={drawerId}
      />
      {/* v7 PRD §3.2 — `items-stretch` 명시 (flex 의 default 라 무회귀 보장 보조) +
       *   `min-h-[calc(100vh-...)]` 로 내부 콘텐츠가 짧을 때도 sidebar/main 영역이 viewport 끝까지 stretched. */}
      <div className="flex flex-1 min-h-0 items-stretch min-h-[calc(100vh-theme(spacing.navbar-h))]">
        <Sidebar
          selectedTicker={selectedTicker}
          onSelectHistory={dispatchSelectHistory}
          onSelectFavorite={dispatchSelectFavorite}
        />
        <main className="flex-1 min-w-0 main-area">{children}</main>
      </div>
      <MobileDrawer
        open={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        selectedTicker={selectedTicker}
        onSelectHistory={dispatchSelectHistory}
        onSelectFavorite={dispatchSelectFavorite}
      />
    </div>
  );
}
