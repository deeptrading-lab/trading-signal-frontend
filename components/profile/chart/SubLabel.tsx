/**
 * 보조지표 섹션 헤더 — 상단 구분선 + 진한 타이틀로 메인↔보조, 보조↔보조 경계를 또렷하게.
 */

export function SubLabel({ label }: { label: string }) {
  return (
    <div className="mt-md mb-xs pt-md border-t border-border-line">
      <p className="text-caption font-semibold text-text-strong px-xs">{label}</p>
    </div>
  );
}
