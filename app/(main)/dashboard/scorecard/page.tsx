/**
 * `/dashboard/scorecard` — AI 판정 적중률 운영자 뷰(내부 등급, 디자인 폴리시 최소).
 *
 * PRD `signal-scorecard` §3-3-B / §9 D6.
 * 채점 원장(signal_scorecard) 집계를 표로 보여 신호 품질을 자가점검한다. Supabase 읽기 전용
 * BFF(`/api/scorecard/summary`)라 prod 에서도 동작한다(분석 실행만 로컬 전용).
 *
 * 부모 `/dashboard` 는 `/profile` 로 리다이렉트하지만, 본 중첩 라우트(`/dashboard/scorecard`)는
 * 독립 경로라 영향받지 않는다.
 */

import { ScorecardContainer } from "@/components/scorecard/ScorecardContainer";
import {
  SCORECARD_PAGE_SUBTITLE,
  SCORECARD_PAGE_TITLE,
} from "@/lib/copy/scorecard/labels";

export default function ScorecardPage() {
  return (
    <div className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg">
      <header className="flex flex-col gap-xs">
        <h1 className="text-h1 text-text-strong">{SCORECARD_PAGE_TITLE}</h1>
        <p className="text-body-sm text-text-muted">{SCORECARD_PAGE_SUBTITLE}</p>
      </header>
      <ScorecardContainer />
    </div>
  );
}
