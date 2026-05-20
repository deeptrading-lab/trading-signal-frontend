/**
 * brief (기술 신호) 카드.
 *
 * DESIGN.md 결정:
 *   - 헤더에 `badge-accent`/`badge-info`/`badge-warn` (BUY/HOLD/SELL)
 *   - action 과 의미적으로 다르면 좌측 3px line 보더 + caption "최종 권고와는 별개의 기술 신호예요." (AC-4)
 *   - 본문: reasons 목록, reference_price·confidence 보조 메타
 */

import type { Brief } from "@/lib/types/workbench/analyze";
import { getActionMeta, getBriefActionMeta, isDivergent } from "@/lib/copy/workbench/actionLabels";
import { formatNumber } from "@/lib/utils/formatMoney";
import { cn } from "@/lib/utils/cn";

type Props = {
  brief: Brief;
  action: string;
  currency?: string;
};

export function BriefCard({ brief, action, currency }: Props) {
  const briefMeta = getBriefActionMeta(brief.action);
  const actionMeta = getActionMeta(action);
  const divergent = isDivergent(actionMeta.group, briefMeta.group);

  return (
    <article
      className={cn("card", divergent && "border-l-[3px] border-l-line")}
      aria-label="기술 신호"
    >
      <p className="mb-sm text-h2 text-primary">기술 신호</p>
      {divergent ? (
        <p className="mb-sm text-caption text-secondary">
          최종 권고와는 별개의 기술 신호예요.
        </p>
      ) : null}
      <div className="flex items-center gap-sm mb-sm">
        <span className={briefMeta.badge}>{briefMeta.label}</span>
        <span className="badge-info" aria-label="신뢰도">
          신뢰도 {brief.confidence}
        </span>
      </div>
      {brief.reasons && brief.reasons.length > 0 ? (
        <ul className="mt-sm pl-[18px] list-disc">
          {brief.reasons.map((reason, idx) => (
            <li key={idx} className="my-sm text-body-sm text-body-strong">
              {reason}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-md flex-wrap mt-sm text-caption text-secondary">
        <span>
          참고 가격{" "}
          <strong className="text-primary tabular">
            {formatNumber(brief.reference_price)} {currency ?? ""}
          </strong>
        </span>
        {brief.entry_condition ? <span>{brief.entry_condition}</span> : null}
      </div>
    </article>
  );
}
