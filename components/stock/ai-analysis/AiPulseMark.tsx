import { PULSE_POLYLINE_POINTS, pulseGradientDefs } from "@/lib/brand-mark";
import { cn } from "@/lib/utils/cn";

/**
 * AI 종합분석 패널 헤더용 **애니메이션** 브랜드 맥박 마크 — "AI 가 일하는 중" 을 심전도(ECG)
 * 스윕으로 전한다. 정적 로고(`components/layout/BrandPulseIcon`, 사이드바·헤더)는 건드리지 않고,
 * AI 패널만 이 살아있는 버전을 쓴다.
 *
 * 구성(2 polyline 겹침):
 *   - 트랙: 전체 맥박 라인(옅은 헤어라인 = border-line 토큰). 항상 정지.
 *   - 스파크: 같은 라인 위를 짧은 밝은 구간이 **좌→우**로 흐른다(gradient stroke + 파란 글로우).
 *
 * 색·글리프·그라데이션은 `lib/brand-mark` 단일 소스 재사용(정적 마크와 정합). 애니메이션 CSS 는
 * `app/components.css`(`.pulse-mark*` + `@keyframes ai-ecg`)에 거주 — `aria-hidden`(장식).
 */

/**
 * brand-mark 좌표는 우→좌(`22 … 2`) 순서라 dash 가 우→좌로 흐른다. **점 쌍 순서를 뒤집으면**
 * 그려지는 라인은 시각적으로 동일하되(같은 6점) 경로 방향만 반대가 돼, dash 스윕이 **좌→우**가 된다.
 * 예: `22 12 18 12 15 21 9 3 6 12 2 12` → `2 12 6 12 9 3 15 21 18 12 22 12`.
 */
function reversePolylinePoints(points: string): string {
  const nums = points.trim().split(/\s+/);
  const pairs: string[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pairs.push(`${nums[i]} ${nums[i + 1]}`);
  }
  return pairs.reverse().join(" ");
}

/** 좌→우 스윕용 뒤집힌 좌표(모듈 로드 1회 계산 — brand-mark 글리프 변경 시 자동 정합). */
const SWEEP_POINTS = reversePolylinePoints(PULSE_POLYLINE_POINTS);

export function AiPulseMark({
  className,
  gradientId,
  state = "active",
}: {
  className?: string;
  /** 한 문서 내 유일해야 하는 gradient id(호출부가 지정 — 동시 마운트 충돌 방지). */
  gradientId: string;
  /** active = 분석 중(정상 스윕) / calm = 완료·대기(느리고 살짝 옅게). */
  state?: "active" | "calm";
}) {
  return (
    <svg
      className={cn("pulse-mark", state === "calm" && "is-calm", className)}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {pulseGradientDefs(gradientId)}
      {/* 트랙 — 전체 맥박 라인(옅은 헤어라인). */}
      <polyline points={SWEEP_POINTS} className="pulse-mark-track stroke-border-line" />
      {/* 스파크 — 좌→우로 흐르는 짧은 밝은 구간(3색 맥박 그라데이션 stroke). */}
      <polyline
        points={SWEEP_POINTS}
        className="pulse-mark-spark"
        stroke={`url(#${gradientId})`}
      />
    </svg>
  );
}
