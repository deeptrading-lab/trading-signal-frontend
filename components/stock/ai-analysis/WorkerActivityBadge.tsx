"use client";

/**
 * prod 분석 큐 — 로컬 워커 활동 상태 뱃지(S7).
 *
 * 워커가 지금 분석을 돌리는 중인지 / 대기가 몇 건인지 / 서버가 꺼졌는지를 작은 칩으로 보여준다.
 * `ProdAnalysisQueueCard` 상단에 마운트되며, 마운트된 동안만 worker-status 를 폴링한다
 * (`useWorkerActivity`). 활동 없음(online·idle·빈 큐) 또는 상태 미수신(로딩/에러)이면 렌더하지
 * 않는다(null) — prod 카드 흐름에 영향 없음(fail-soft).
 *
 * 색은 신규 토큰 0 — processing/queued 는 accent-vivid-soft(옅은 파랑) + primary, offline 은 muted.
 * 점/스피너는 aria-hidden, 가시 텍스트가 곧 접근성 이름이다. aria-live 미사용(15s 주기 갱신 ambient).
 */

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { useWorkerActivity } from "@/hooks/stock/useWorkerActivity";

const PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption break-keep";
/** 상태 점 — bg-current 로 칩 글자색을 그대로 따른다(색 토큰 추가 0). */
const DOT = "w-1.5 h-1.5 rounded-full bg-current";

export function WorkerActivityBadge() {
  const activity = useWorkerActivity(true);

  if (activity.kind === "hidden") return null;

  if (activity.kind === "offline") {
    return (
      <span className={cn(PILL_BASE, "bg-surface-muted text-text-muted")}>
        <span className={DOT} aria-hidden />
        {COPY.prodQueue.workerOfflineBadge}
      </span>
    );
  }

  // processing | queued — 둘 다 "활동 중" 옅은 파랑. processing 은 스피너, queued 는 정적 점.
  const isProcessing = activity.kind === "processing";
  const queueText =
    activity.queueDepth > 0
      ? COPY.prodQueue.queuedCount(activity.queueDepth)
      : null;
  const label = isProcessing
    ? [COPY.prodQueue.processing, queueText].filter(Boolean).join(" · ")
    : (queueText ?? COPY.prodQueue.processing);

  return (
    <span className={cn(PILL_BASE, "bg-accent-vivid-soft text-primary")}>
      {isProcessing ? (
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
      ) : (
        <span className={DOT} aria-hidden />
      )}
      {label}
    </span>
  );
}
