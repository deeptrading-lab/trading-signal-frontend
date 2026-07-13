/**
 * `/analyze` — AI 분석 화면. 상위 탭으로 "분석 결과 카드"와 "토큰 사용량 대시보드"를 묶는다.
 *
 * "AI 분석" 사이드 메뉴가 이 라우트를 가리킨다(navItems.ts).
 * - 분석 결과: 지금까지 분석한 종목들을 최신순 카드로, 클릭 시 결론 상세 + 카드별 토큰.
 * - 토큰 사용량: 분석가별 토큰 최적화 대시보드(기존).
 * 모두 Supabase 읽기 전용이라 prod(Vercel)에서도 동작한다(분석 실행 자체는 로컬 전용,
 * POST /api/stock/ai-analysis).
 *
 * 데이터 경로:
 *   - 결과: AIDecisionListContainer → useQueryAIDecisions → /api/stock/ai-analysis/decisions
 *           → Supabase ai_analysis_decisions(+ai_agent_usage 토큰 합산).
 *   - 토큰: AgentUsageContainer → useQueryAgentUsage → /api/stock/ai-analysis/usage
 *           → Supabase ai_agent_usage.
 *
 * 참고: 기존 AI 분석 워크벤치(FastAPI signal)는 별개 기능으로 components/workbench/* ·
 *   hooks/workbench/* · app/api/workbench/* 에 그대로 보존된다(라우트만 교체).
 */

import { Suspense } from "react";
import { AnalyzeTabsContainer } from "@/components/analyze/AnalyzeTabsContainer";
import { ANALYZE_PAGE_TITLE } from "@/lib/copy/analyze/labels";

export default function AnalyzePage() {
  // 권한 게이트 없음(analyze-open-access) — 판정 카드는 로그인 유저 전체 공개(로그인은 전역 proxy
  // 게이트 담당). 운영정보 격리는 지면 안에서: usage 탭 prod 숨김(IS_PROD)·카드 삭제 superadmin·
  // usage API admin 가드 유지.
  return (
    <div className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg">
      {/* 페이지 타이틀 — 전 페이지 공통으로 시각 타이틀 제거(홈 정합), 문서 아웃라인용 h1 만 sr-only 유지. */}
      <header className="sr-only">
        <h1 className="text-h1 text-text-strong">{ANALYZE_PAGE_TITLE}</h1>
      </header>
      {/* useSearchParams(탭 상태) 가 Suspense 경계를 요구 — login 패턴과 동일. */}
      <Suspense fallback={null}>
        <AnalyzeTabsContainer />
      </Suspense>
    </div>
  );
}
