import { ImageResponse } from "next/og";
import { PULSE_POLYLINE_POINTS, pulseGradientDefs } from "@/lib/brand-mark";

/**
 * FinSight favicon — App Router `app/icon.tsx` 패턴 + `next/og` ImageResponse 동적 생성.
 * - 시각: **흰 배경(+ 옅은 테두리)** + lucide `Activity` 아이콘(3색 맥박 그라데이션 — 상승=빨강/
 *   가운데=슬레이트/하락=파랑) → 사이드바·헤더 brand badge · 홈 아이콘 · OG 와 정합(신규 로고).
 *   그라데이션 색/글리프는 `lib/brand-mark.tsx` 단일 소스.
 * - `ImageResponse` 내부에서는 Tailwind 토큰 직접 호출 불가 → hex 명시(디자인 토큰 직타의 합리적
 *   예외). 흰 배경이 브라우저 탭(밝은 영역)에 묻히지 않게 slate-200(#e2e8f0) 테두리.
 * - ⚠️ 32px 라 그라데이션 효과는 미세함(브랜드 일관성 목적).
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {pulseGradientDefs("faviconPulse")}
          {/* lucide-react Activity icon path (맥박 그라데이션 stroke) */}
          <polyline points={PULSE_POLYLINE_POINTS} stroke="url(#faviconPulse)" />
        </svg>
      </div>
    ),
    size,
  );
}
