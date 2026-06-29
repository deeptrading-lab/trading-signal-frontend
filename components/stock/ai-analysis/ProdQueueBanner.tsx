"use client";

/**
 * prod 분석 요청 상태 배너(DESIGN.md S4·S5·S6·S9 + enqueue 실패).
 *
 * 색 위계로 심각도를 가른다 — 접수=info(파랑) / 오프라인=warn(주황, 빨강 아님 R2) / 중복=옅은 파랑 /
 * 실패=critical(빨강). 모두 앱 글로벌 토큰·합성 클래스(.card-info/.card-warn/.card-critical) 재사용.
 *
 * 평면 카드(그림자 없음, soft 배경 + 동색 border). 제목(body-sm-strong) + 보조 안내(body-sm) 한 줄씩.
 * 접근성: role="status" + aria-live="polite" — CTA 클릭 → 배너 전이를 스크린리더가 읽는다.
 */

import { cn } from "@/lib/utils/cn";

export type ProdQueueBannerTone = "info" | "warn" | "duplicate" | "critical";

interface ProdQueueBannerProps {
  tone: ProdQueueBannerTone;
  title: string;
  desc: string;
  /** 실패(S9·enqueue 실패) 배너 하단 재요청 CTA 등. */
  action?: React.ReactNode;
  /** 제목 왼쪽에 인라인 배치할 요소(예: 워커 활동 뱃지). 없으면 제목만. */
  leading?: React.ReactNode;
}

// 톤 → 합성 클래스/유틸. 중복(duplicate)은 .card-info 보다 약한 옅은 파랑(accent-vivid-soft + primary).
const TONE_CLASS: Record<ProdQueueBannerTone, string> = {
  info: "card-info",
  warn: "card-warn",
  critical: "card-critical",
  duplicate:
    "bg-accent-vivid-soft text-primary border border-accent-vivid-soft rounded-lg p-card-px-mobile",
};

export function ProdQueueBanner({
  tone,
  title,
  desc,
  action,
  leading,
}: ProdQueueBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "w-full",
        TONE_CLASS[tone],
      )}
    >
      {/* 제목 줄 — leading(워커 뱃지 등) 있으면 제목 왼쪽에 인라인. */}
      <div className="flex flex-wrap items-center gap-2">
        {leading}
        <p className="text-body-sm-strong break-keep">{title}</p>
      </div>
      <p className="mt-1 text-body-sm leading-relaxed break-keep opacity-90">
        {desc}
      </p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
