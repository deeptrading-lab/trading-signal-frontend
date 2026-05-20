/**
 * 최종 권고 `action` 카드 — display 한 줄 + 보조 근거.
 *
 * DESIGN.md `card-elevated` 한 장으로 화면당 1회. 한글 라벨은 `lib/copy/action-labels.ts`.
 */

import { getActionMeta } from "@/lib/copy/action-labels";

type Props = {
  action: string;
  reason?: string | null;
};

export function ActionCard({ action, reason }: Props) {
  const meta = getActionMeta(action);
  return (
    <article className="card-elevated actionCard" aria-label="최종 권고">
      <div className="actionBadgeRow">
        <span className={meta.badge}>최종 권고</span>
      </div>
      <p className="actionDisplay">{meta.label}</p>
      {reason ? <p className="actionReason">{reason}</p> : null}
    </article>
  );
}
