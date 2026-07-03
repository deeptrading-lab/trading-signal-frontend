/**
 * SignalSummarySkeleton — 컴팩트 시그널 요약(SignalSummary)의 로딩 플레이스홀더.
 *
 * `SignalSummary` 의 `isLoading` 분기와 라우트 `loading.tsx` 가 **같은 마크업**을 공유하도록 추출
 * (라우트 로딩 → 컴포넌트 로딩 전환 무-jump). 카드리스 `<section>`(제목은 aria-label) 은
 * SignalSummary 의 SummaryShell 과 동일 — 헤어라인은 상위(StockPageLayout / loading.tsx)가 관리.
 */

import { Skeleton } from "@/components/ui/Skeleton";
import {
  SIGNAL_SUMMARY_TITLE,
  SIGNAL_SUMMARY_LOADING,
} from "@/lib/copy/signal/labels";

export function SignalSummarySkeleton() {
  return (
    <section aria-label={SIGNAL_SUMMARY_TITLE}>
      <div
        className="flex flex-col gap-md sm:flex-row sm:items-center sm:gap-lg"
        aria-busy="true"
      >
        <span className="sr-only">{SIGNAL_SUMMARY_LOADING}</span>
        <Skeleton variant="line" className="mb-0 h-8 w-24" />
        <div className="grid flex-1 grid-cols-2 gap-x-lg gap-y-md sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="line" className="mb-0 h-4 w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}
