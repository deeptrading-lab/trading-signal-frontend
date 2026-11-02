/**
 * SwingCheckButton — 종목 헤더 오른쪽(옛 "AI 종합분석" 자리)의 "스윙 체크" 진입 버튼.
 *
 * 상태를 버튼에 같이 보여 준다: 충족 n/7(주의 사유 없음) / "주의"(주의 사유 있음, 앰버).
 * 누르면 사이드 패널(`SwingCheckPanel`)이 열린다. 국내 종목 전용 — 미지원(404: ETF·ETN 등)이면 숨긴다.
 * 판정은 종목 카드와 같은 쿼리(캐시 공유)라 추가 요청이 없다.
 */

"use client";

import { useState } from "react";
import { ChevronRight, ListChecks } from "lucide-react";
import { useQuerySwingJudgment } from "@/hooks/swing/useQuerySwingJudgment";
import { metCount } from "@/lib/swing/itemBits";
import { cn } from "@/lib/utils/cn";
import { SWING_PANEL_BUTTON, SWING_PANEL_CAUTION } from "@/lib/copy/swing/labels";
import { SwingCheckPanel } from "./SwingCheckPanel";

export function SwingCheckButton({ ticker, name }: { ticker: string; name: string }) {
  const [open, setOpen] = useState(false);
  const { data, error } = useQuerySwingJudgment(ticker);
  if (error?.status === 404) return null;

  const j = data?.judgment;
  const caution = !!j && j.exclusions.length > 0;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="ml-auto inline-flex h-button-sm-h shrink-0 items-center gap-xs rounded-pill bg-accent-vivid pl-md pr-sm text-button-sm text-surface shadow-sm transition-colors hover:bg-accent-vivid/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-vivid/40"
      >
        <ListChecks className="h-4 w-4" aria-hidden="true" />
        {SWING_PANEL_BUTTON}
        {j ? (
          <span
            className={cn(
              "rounded-pill px-sm text-caption font-bold",
              caution ? "bg-warn-soft text-warn" : "bg-surface text-accent-vivid",
            )}
          >
            {caution ? SWING_PANEL_CAUTION : `${metCount(j.items)}/7`}
          </span>
        ) : null}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? <SwingCheckPanel ticker={ticker} name={name} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
