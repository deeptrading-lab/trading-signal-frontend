/**
 * `/analyze` — AI 분석 토큰 사용량 대시보드.
 *
 * "AI 분석" 사이드 메뉴가 이 라우트를 가리킨다(navItems.ts).
 * 분석가(agent)별 토큰을 줄일 최적화 포인트를 찾기 위한 모니터링 화면 — Supabase 읽기 전용이라
 * prod(Vercel)에서도 동작한다(분석 실행 자체는 로컬 전용, POST /api/stock/ai-analysis).
 *
 * 데이터 경로: AgentUsageContainer → useQueryAgentUsage → fetchAgentUsageSummary
 *   → /api/stock/ai-analysis/usage → Supabase ai_agent_usage.
 *
 * 참고: 기존 AI 분석 워크벤치(FastAPI signal)는 별개 기능으로 components/workbench/* ·
 *   hooks/workbench/* · app/api/workbench/* 에 그대로 보존된다(라우트만 교체).
 */

import { AgentUsageContainer } from "@/components/analyze/AgentUsageContainer";
import { USAGE_SUBTITLE, USAGE_TITLE } from "@/lib/copy/analyze/labels";

export default function AnalyzeUsagePage() {
  return (
    <div className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg">
      <header className="flex flex-col gap-xs">
        <h1 className="text-h1 text-text-strong">{USAGE_TITLE}</h1>
        <p className="text-body-sm text-text-muted">{USAGE_SUBTITLE}</p>
      </header>
      <AgentUsageContainer />
    </div>
  );
}
