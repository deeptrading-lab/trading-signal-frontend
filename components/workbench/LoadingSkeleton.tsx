/**
 * 분석 중 결과 영역 스켈레톤 — 4장 (action / feasibility / risk_plan / horizons).
 *
 * DESIGN.md 핸드오프 명세 "로딩 (Loading)" 행 그대로.
 * aria-busy="true" + aria-live="polite" 로 스크린리더 안내.
 */

export function LoadingSkeleton() {
  return (
    <div
      className="grid gap-md mt-lg"
      aria-busy="true"
      aria-live="polite"
      aria-label="분석 중"
    >
      <div className="skeleton min-h-[120px]">
        <div className="skeleton-line skeleton-line-narrow" />
        <div className="skeleton-line skeleton-line-medium" />
        <div className="skeleton-line" />
      </div>
      <div className="skeleton min-h-[84px]">
        <div className="skeleton-line skeleton-line-medium" />
        <div className="skeleton-line" />
      </div>
      <div className="skeleton min-h-[160px]">
        <div className="skeleton-line skeleton-line-narrow" />
        <div className="skeleton-line" />
        <div className="skeleton-line skeleton-line-medium" />
        <div className="skeleton-line" />
      </div>
      <div className="skeleton min-h-[100px]">
        <div className="skeleton-line skeleton-line-narrow" />
        <div className="skeleton-line" />
        <div className="skeleton-line skeleton-line-medium" />
      </div>
    </div>
  );
}
