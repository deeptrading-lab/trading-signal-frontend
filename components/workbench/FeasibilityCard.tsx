/**
 * feasibility 카드.
 *
 * DESIGN.md 결정 그대로:
 *   - feasibility 가 UNREALISTIC 일 때 `card-warn` 배경 + `badge-warn` "⚠ 비현실적인 목표예요"
 *   - 본문에 BE 가 보낸 연환산 목표 수익률(`annualized_target_return_pct`) 노출
 *   - 색·텍스트·이모지 세 트랙 모두 (AC-15)
 *   - REALISTIC/STRETCH 등 다른 라벨은 정상 카드 + body 한 줄
 */

import { formatPct } from "@/lib/formatters/pct";

type Props = {
  feasibility: string;
  annualizedTargetReturnPct: number;
  targetReturnPct: number;
  targetPeriodDays: number;
};

const REALISTIC_COPY: Record<string, string> = {
  REALISTIC: "현실적인 목표예요. 계획대로 진행해도 좋아요.",
  STRETCH: "다소 도전적인 목표예요. 진입과 손절 라인을 더 단단히 잡아주세요.",
};

export function FeasibilityCard({
  feasibility,
  annualizedTargetReturnPct,
  targetReturnPct,
  targetPeriodDays,
}: Props) {
  const isUnrealistic = feasibility?.toUpperCase() === "UNREALISTIC";

  return (
    <article
      className={isUnrealistic ? "card card-warn" : "card"}
      aria-label="목표 현실성"
    >
      {isUnrealistic ? (
        <>
          <div className="flex gap-sm flex-wrap mb-md">
            <span className="badge-warn">⚠ 비현실적인 목표예요</span>
          </div>
          <p className="mt-sm text-body-sm text-warn">
            {`${targetPeriodDays}일 동안 ${formatPct(targetReturnPct)} 수익을 노리는 건 연 환산 약 `}
            <strong>{formatPct(annualizedTargetReturnPct)}</strong>
            {` 에 해당해요. 기간을 늘리거나 목표를 낮춰 보세요.`}
          </p>
        </>
      ) : (
        <>
          <p className="text-h2 text-primary">목표 현실성</p>
          <p className="mt-sm text-body-sm text-body-strong">
            {REALISTIC_COPY[feasibility?.toUpperCase() ?? ""] ??
              "BE 가 제공한 현실성 라벨을 그대로 표시해요."}
          </p>
          <p className="mt-sm text-mono-numeric tabular">
            {`연 환산 약 ${formatPct(annualizedTargetReturnPct)}`}
          </p>
        </>
      )}
    </article>
  );
}
