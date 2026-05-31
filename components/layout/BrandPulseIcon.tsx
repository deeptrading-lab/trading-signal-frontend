import { PULSE_POLYLINE_POINTS, pulseGradientDefs } from "@/lib/brand-mark";

/**
 * 브랜드 로고용 맥박 아이콘(브라우저 DOM) — lucide `Activity` 대체. 사이드바·헤더 brand badge 공용.
 * 홈 아이콘/파비콘/OG(Satori) 와 동일한 3색 맥박 그라데이션(상승=빨강 / 가운데=슬레이트 / 하락=파랑)을
 * stroke 에 적용 + 옅은 드롭섀도(DOM 전용 — Satori 는 filter 미지원이라 아이콘류엔 미적용).
 * - 색/글리프는 `lib/brand-mark.tsx` 단일 소스 공유.
 * - 크기·위치는 `className`(예: `sidebar-brand-icon` = h-5 w-5) 이 제어 — lucide 와 동일하게 svg 에 전달.
 * - `gradientId` 는 한 문서 내 유일해야 하므로 호출부가 지정(헤더/사이드바 동시 마운트 충돌 방지).
 */
export function BrandPulseIcon({
  className,
  gradientId,
}: {
  className?: string;
  gradientId: string;
}) {
  const shadowId = `${gradientId}-shadow`;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {pulseGradientDefs(gradientId)}
      <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow
          dx="0"
          dy="1.5"
          stdDeviation="1"
          floodColor="#0f172a"
          floodOpacity="0.15"
        />
      </filter>
      <polyline
        points={PULSE_POLYLINE_POINTS}
        stroke={`url(#${gradientId})`}
        filter={`url(#${shadowId})`}
      />
    </svg>
  );
}
