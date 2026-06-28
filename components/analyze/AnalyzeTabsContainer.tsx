/**
 * AnalyzeTabsContainer — /analyze 상위 탭 (분석 결과 카드 / 토큰 사용량 대시보드).
 *
 * 기본 탭은 "분석 결과". 토큰 대시보드(AgentUsageContainer)는 그대로 보존하고 탭으로만 분리한다.
 * pill 탭 UI 는 AgentUsageContainer 의 provider 탭(role=tablist)과 동일 패턴.
 *
 * 탭 상태는 **URL 쿼리(?tab=usage)** 가 단일 출처 — 딥링크·새로고침·공유·뒤로가기가 일관 동작.
 * useSearchParams 를 쓰므로 호출부(page.tsx)가 Suspense 로 감싼다(login 패턴과 동일).
 *
 * 탭 줄 우측에는 결과 탭 툴바(종목 수·새로고침)가 들어갈 슬롯을 둔다 — 개수가 검색 필터에 의존해
 * AIDecisionListContainer 가 소유하므로, 그 자식이 이 슬롯으로 portal 해 같은 줄에 렌더한다.
 */

"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { AIDecisionListContainer } from "./AIDecisionListContainer";
import { AgentUsageContainer } from "./AgentUsageContainer";
import {
  ANALYZE_TAB_PARAM,
  analyzeTabFromParam,
  analyzeTabHref,
  type AnalyzeTab,
} from "./analyzeTab";
import { TAB_RESULTS, TAB_USAGE } from "@/lib/copy/analyze/labels";

const TABS: { key: AnalyzeTab; label: string }[] = [
  { key: "results", label: TAB_RESULTS },
  { key: "usage", label: TAB_USAGE },
];

export function AnalyzeTabsContainer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = analyzeTabFromParam(searchParams.get(ANALYZE_TAB_PARAM));
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null);

  // scroll:false — 탭 전환 시 스크롤 점프 방지(같은 라우트 쿼리만 교체).
  const selectTab = (next: AnalyzeTab) =>
    router.replace(analyzeTabHref(pathname, next), { scroll: false });

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between gap-md flex-wrap border-b border-border-line pb-md">
        <div className="flex items-center gap-sm" role="tablist" aria-label="AI 분석 화면">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => selectTab(t.key)}
              className={cn(
                "cursor-pointer rounded-pill border px-md py-xs text-body-sm-strong transition-colors",
                tab === t.key
                  ? "border-transparent bg-accent-vivid text-surface"
                  : "border-border-line bg-surface text-text-muted hover:text-text-strong",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* 결과 탭 툴바(종목 수·새로고침)가 portal 로 채워지는 슬롯 */}
        <div ref={setToolbarSlot} className="flex items-center gap-md" />
      </div>

      {tab === "results" ? (
        <AIDecisionListContainer toolbarSlot={toolbarSlot} />
      ) : (
        <AgentUsageContainer />
      )}
    </div>
  );
}
