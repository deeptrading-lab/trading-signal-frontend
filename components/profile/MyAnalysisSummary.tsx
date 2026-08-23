"use client";

/**
 * MyAnalysisSummary — `/profile` "내 분석" 요약 (client).
 *
 * profile-real-data — mock 자산 섹션을 걷어낸 자리에 **실제로 계정에 묶여 있는 데이터**를 둔다.
 *   analyze-owner-cards 로 `ai_analysis_decisions` 가 계정별로 분리됐으므로, 목록 BFF 가
 *   내려주는 items 는 이미 "내가 분석한 종목"이다(여기서 추가 필터 불필요).
 *
 * `useQueryAIDecisions` 를 그대로 재사용해 `/analyze` 와 **캐시를 공유**한다 — 마이페이지에서
 *   /analyze 로 이동하면 이미 채워진 목록이 즉시 뜬다(재요청 0).
 *
 * 요약이라 상위 3건만 보여주고 전체는 `/analyze` 로 넘긴다.
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQueryAIDecisions } from "@/hooks/stock/useQueryAIDecisions";
import { cn } from "@/lib/utils/cn";
import {
  VERDICT_LABEL,
  isBullishVerdict,
  isBearishVerdict,
} from "@/components/stock/ai-analysis/verdictLabels";
import {
  MY_ANALYSIS_TITLE,
  MY_ANALYSIS_COUNT,
  MY_ANALYSIS_EMPTY,
  MY_ANALYSIS_ERROR,
  MY_ANALYSIS_MORE,
} from "@/lib/copy/profile/labels";

const PREVIEW_COUNT = 3;

/** 판정 톤 — 목록 카드(AIDecisionCard)와 같은 강세/약세/중립 3분기. */
function verdictToneClass(verdict: Parameters<typeof isBullishVerdict>[0]): string {
  if (isBullishVerdict(verdict)) return "text-signal-up";
  if (isBearishVerdict(verdict)) return "text-signal-down";
  return "text-text-muted";
}

export function MyAnalysisSummary() {
  const { data, isLoading, isError } = useQueryAIDecisions();
  const items = data?.items ?? [];

  return (
    <Section
      title={MY_ANALYSIS_TITLE}
      action={
        <Link
          href="/analyze"
          className="inline-flex items-center gap-xs text-caption text-text-muted hover:text-text-strong"
        >
          {MY_ANALYSIS_MORE}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      }
    >
      {isLoading ? (
        <div aria-busy="true">
          {Array.from({ length: PREVIEW_COUNT }).map((_, i) => (
            <Skeleton key={i} variant="line" className="mb-sm h-6 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-body-sm text-text-muted" role="alert">
          {MY_ANALYSIS_ERROR}
        </p>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-text-muted">{MY_ANALYSIS_EMPTY}</p>
      ) : (
        <>
          <p className="text-caption text-text-muted">
            {MY_ANALYSIS_COUNT(items.length)}
          </p>
          <ul className="divide-y divide-border-line">
            {items.slice(0, PREVIEW_COUNT).map((item) => (
              <li key={item.ticker}>
                <Link
                  href={`/stock/${item.ticker}?ai=1`}
                  className="flex items-center gap-md py-md hover:bg-surface-muted"
                >
                  <span className="min-w-0 flex-1 truncate text-body-sm-strong text-text-strong">
                    {item.name ?? item.ticker}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-body-sm-strong",
                      verdictToneClass(item.decision.verdict),
                    )}
                  >
                    {VERDICT_LABEL[item.decision.verdict]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}
