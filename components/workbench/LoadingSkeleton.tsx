/**
 * 분석 중 결과 영역 스켈레톤 — 4장 (action / feasibility / risk_plan / horizons).
 *
 * DESIGN.md 핸드오프 명세 "로딩 (Loading)" 행 그대로.
 * aria-busy="true" + aria-live="polite" 로 스크린리더 안내.
 */

export function LoadingSkeleton() {
  return (
    <div className="resultGroup" aria-busy="true" aria-live="polite" aria-label="분석 중">
      <div className="skeleton" style={{ minHeight: "120px" }}>
        <div className="skeletonLine is-narrow" />
        <div className="skeletonLine is-medium" />
        <div className="skeletonLine" />
      </div>
      <div className="skeleton" style={{ minHeight: "84px" }}>
        <div className="skeletonLine is-medium" />
        <div className="skeletonLine" />
      </div>
      <div className="skeleton" style={{ minHeight: "160px" }}>
        <div className="skeletonLine is-narrow" />
        <div className="skeletonLine" />
        <div className="skeletonLine is-medium" />
        <div className="skeletonLine" />
      </div>
      <div className="skeleton" style={{ minHeight: "100px" }}>
        <div className="skeletonLine is-narrow" />
        <div className="skeletonLine" />
        <div className="skeletonLine is-medium" />
      </div>
    </div>
  );
}
