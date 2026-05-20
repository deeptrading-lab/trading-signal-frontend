/**
 * 최종 권고 `action` 카드 — display 한 줄 + 보조 근거.
 *
 * DESIGN.md `card-elevated` 한 장으로 화면당 1회. 한글 라벨은 `lib/copy/action-labels.ts`.
 */

import { getActionMeta } from "@/lib/copy/workbench/actionLabels";

type Props = {
  action: string;
  reason?: string | null;
};

export function ActionCard({ action, reason }: Props) {
  const meta = getActionMeta(action);
  return (
    <article className="card-elevated" aria-label="최종 권고">
      <div className="flex gap-sm flex-wrap mb-md">
        <span className={meta.badge}>최종 권고</span>
      </div>
      <p className="mt-sm text-display text-primary">{meta.label}</p>
      {reason ? (
        <p className="mt-md text-body-md text-body-strong">{reason}</p>
      ) : null}
    </article>
  );
}
