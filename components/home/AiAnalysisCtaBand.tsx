/**
 * AiAnalysisCtaBand — 홈 하단 "AI 종합분석" 강조 밴드(카드리스 홈의 유일한 강조면).
 *
 * home-reskin. 노스스타 `#homeScreen .aicta` 정합 — 카드리스 흰 홈에서 유일하게 색을 채운
 *   그라데이션 밴드. `.gradient-ai-bg` 합성 토큰(라이트=흰 텍스트/진한 그라데이션, 다크=진한
 *   텍스트/밝은 그라데이션 — 토큰 indirection 으로 양쪽 대비 정합) 재사용, hex 직타 0.
 *
 * 액션: 전체 밴드가 `/analyze`(AI 분석 결과 카드) 로 가는 단일 링크. 내부 "보러 가기" pill 은
 *   시각 어포던스일 뿐 중첩 interactive 아님(밴드 자체가 링크).
 *
 * server-safe — `next/link` 만. useState 0.
 */

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import {
  HOME_AI_TITLE,
  HOME_AI_DESC,
  HOME_AI_ACTION,
} from "@/lib/copy/home/marketOverview";

export function AiAnalysisCtaBand() {
  return (
    <Link
      href="/analyze"
      aria-label={`${HOME_AI_TITLE} — ${HOME_AI_ACTION}`}
      className="gradient-ai-bg group flex items-center gap-md rounded-lg px-lg py-lg no-underline transition-[filter] duration-base hover:brightness-105"
    >
      <Sparkles className="h-xl w-xl shrink-0" aria-hidden="true" />
      <div className="mr-auto min-w-0">
        <span className="block text-body-sm-strong">{HOME_AI_TITLE}</span>
        <span className="block truncate text-caption opacity-90">
          {HOME_AI_DESC}
        </span>
      </div>
      <span className="inline-flex shrink-0 items-center gap-xs rounded-pill border border-surface/25 bg-surface/15 px-md py-sm text-button-sm">
        {HOME_AI_ACTION}
        <ArrowRight
          className="h-4 w-4 transition-transform duration-base group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}
