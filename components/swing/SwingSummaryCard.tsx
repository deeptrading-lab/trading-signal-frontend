/**
 * SwingSummaryCard — 종목 페이지 아래쪽의 스윙 체크 요약 한 줄 + "자세히 보기"(사이드 패널).
 *
 * 상세(조건 체크·참고 가격대·과거 통계·뉴스)는 헤더 버튼과 같은 패널(`SwingCheckPanel`)에서 본다.
 * 판정이 아직 없을 때(로딩·오류·야간 저장분·미지원 404)는 `SwingJudgmentCard` 의 상태 화면을 그대로 쓴다.
 */

"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useQuerySwingJudgment } from "@/hooks/swing/useQuerySwingJudgment";
import { useQueryStockPrice } from "@/hooks/stock/useQueryStockPrice";
import { metCount } from "@/lib/swing/itemBits";
import {
  SWING_CARD_TITLE,
  SWING_CAUTION_TITLE,
  SWING_CHECK_PASS,
  SWING_DETAIL_OPEN,
  SWING_MATRIX_COLUMNS,
  SWING_SUMMARY_NONE,
  swingBasisLabel,
  swingExclusionLabel,
  swingMetChip,
  swingMetChipSr,
} from "@/lib/copy/swing/labels";
import { SwingCheckPanel } from "./SwingCheckPanel";
import { SwingJudgmentCard } from "./SwingJudgmentCard";

export function SwingSummaryCard({
  ticker,
  fallback,
}: {
  ticker: string;
  fallback?: ReactNode;
}) {
  const { data } = useQuerySwingJudgment(ticker);
  const { data: price } = useQueryStockPrice(ticker);
  const [open, setOpen] = useState(false);
  const titleId = useId();

  if (!data) return <SwingJudgmentCard ticker={ticker} fallback={fallback} />;

  const j = data.judgment;
  const met = metCount(j.items);
  const caution = j.exclusions.length > 0;
  const metLabels = SWING_MATRIX_COLUMNS.filter(
    (c) => j.items[c.key].pass === true,
  ).map((c) => c.label);
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-sm">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div className="flex items-center gap-sm">
          <h2 id={titleId} className="text-h2 text-text-strong">
            {SWING_CARD_TITLE}
          </h2>
          <Badge variant="accent">
            <span aria-hidden="true">{swingMetChip(met)}</span>
            <span className="sr-only">{swingMetChipSr(met)}</span>
          </Badge>
        </div>
        <button
          type="button"
          className="button-secondary inline-flex shrink-0 items-center gap-xs whitespace-nowrap"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          {SWING_DETAIL_OPEN}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {caution ? (
        <p className="text-body-sm text-warn">
          <span className="font-bold">{SWING_CAUTION_TITLE}</span> ·{" "}
          {j.exclusions.map(swingExclusionLabel).join(" · ")}
        </p>
      ) : null}
      <p className="text-body-sm text-text-strong">
        {metLabels.length > 0 ? (
          <>
            <span className="font-bold text-outcome-hit">
              {SWING_CHECK_PASS}
            </span>{" "}
            · {metLabels.join(" · ")}
          </>
        ) : (
          SWING_SUMMARY_NONE
        )}
      </p>
      <p className="text-caption text-text-muted">
        {swingBasisLabel(data.tradeDate)}
      </p>
      {open ? (
        <SwingCheckPanel
          ticker={ticker}
          name={price?.name ?? ticker}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </section>
  );
}
