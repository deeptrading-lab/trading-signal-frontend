/**
 * ThesisBreachBadge — 현재가가 판정의 무효화/손절 라인을 넘었음을 알리는 카드 배지.
 *
 * 배경(사후검증 2026-07-28): 약세 판정의 상방 무효화 라인이 실제로 3건 발동했고 그중 2건은 발동 후
 * 주가가 7~8% 더 올라 "이 판정은 틀렸다"를 일주일 앞서 경고했다. 그런데 그 신호를 보여주는 곳이
 * 저장 결정 상세뷰뿐이라 목록에선 어떤 판정이 깨졌는지 알 수 없었다 — 이 배지가 그 격차를 메운다.
 *
 * 색: 경고(warn 앰버) 계열 — InflightBadge 의 대기 상태와 같은 토큰을 쓰되 아이콘으로 구분한다.
 * 무효화(약세 상방)와 손절 이탈(강세 하방)을 문구로 나눈다. 토큰만 사용(hex·dark: 클래스 0).
 */

"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/formatMoney";
import {
  THESIS_INVALIDATED,
  THESIS_STOP_HIT,
  thesisBreachTitle,
} from "@/lib/copy/analyze/labels";
import type { ThesisBreach } from "@/lib/stock/thesisBreach";

export function ThesisBreachBadge({ breach }: { breach: ThesisBreach }) {
  const invalidation = breach.kind === "invalidation";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-xs rounded-pill px-sm py-0.5 text-caption whitespace-nowrap",
        "bg-warn-soft text-warn",
      )}
      title={thesisBreachTitle(breach.kind, formatMoney(breach.linePrice), breach.overshootPct)}
    >
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      {invalidation ? THESIS_INVALIDATED : THESIS_STOP_HIT}
    </span>
  );
}
