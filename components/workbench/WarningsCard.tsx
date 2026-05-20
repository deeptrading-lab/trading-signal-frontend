/**
 * warnings 카드. 빈 배열일 경우 호출 측에서 렌더하지 않음.
 *
 * DESIGN.md OPEN QUESTION #6 결정 그대로: action 카드 바로 아래 (feasibility 위) 노출.
 */

import type { Warnings } from "@/lib/types/workbench";

type Props = {
  warnings: Warnings;
};

export function WarningsCard({ warnings }: Props) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <article className="card card-warn" aria-label="주의 사항">
      <p className="text-h2 text-warn">주의 사항</p>
      <ul className="mt-sm pl-[18px] list-disc">
        {warnings.map((w, idx) => (
          <li key={idx} className="my-sm text-body-sm text-warn">
            {typeof w === "string" ? w : w.message}
          </li>
        ))}
      </ul>
    </article>
  );
}
