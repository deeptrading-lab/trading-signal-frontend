import { ImageResponse } from "next/og";
import { PULSE_POLYLINE_POINTS, pulseGradientDefs } from "@/lib/brand-mark";

/**
 * FinSight 소셜 공유 OG 이미지 — App Router `app/opengraph-image.tsx` 파일 컨벤션 + `next/og` ImageResponse.
 * - 카톡/SNS 링크 프리뷰의 대표 이미지(1200×630). twitter:image 도 이 라우트를 fallback 재사용(PRD §3.2 / q2 — twitter-image 미생성).
 * - 시각(신규 로고): **밝은 배경(slate-50) + 흰 배지(테두리·그림자) + 3색 맥박 글리프 + "FinSight" 다크 워드마크**.
 *   파비콘·홈 아이콘·사이드바·헤더 로고와 동일 톤. 그라데이션 색/글리프는 `lib/brand-mark.tsx` 단일 소스.
 * - `ImageResponse` 내부에서는 Tailwind 토큰 직접 호출 불가 → hex 명시(디자인 토큰 직타의 합리적 예외).
 *   slate 팔레트: bg 흰→슬레이트 대각 그라데이션 / 배지 #ffffff / 테두리 #e2e8f0 / 워드마크 #1e293b.
 *   (배경 그라데이션 = 흰 채팅 피드에서도 카드 경계가 살도록 한 톤 음영. 사용자 검토 2026-05-31 옵션②.)
 *   (Satori 는 SVG filter 미지원 → 글리프 드롭섀도는 인앱 로고[BrandPulseIcon]에만, 본 카드엔 미적용.)
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          // 흰→슬레이트 대각 그라데이션 — 흰 채팅 피드에서도 카드 경계가 살도록 미세 음영(옵션②).
          background: "linear-gradient(135deg, #ffffff, #e7edf5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 200,
            height: 200,
            borderRadius: 44,
            background: "#ffffff",
            border: "1px solid #e2e8f0", // slate-200
            boxShadow: "0 12px 32px rgba(15,23,42,0.12)", // 카드 부유감
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* 3색 맥박 그라데이션 — 색/글리프는 lib/brand-mark.tsx 단일 소스(전 표면 동일). */}
            {pulseGradientDefs("ogPulse")}
            {/* lucide-react Activity icon path */}
            <polyline points={PULSE_POLYLINE_POINTS} stroke="url(#ogPulse)" />
          </svg>
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1,
            color: "#1e293b", // slate-800 — 밝은 배경 위 다크 워드마크.
          }}
        >
          FinSight
        </div>
      </div>
    ),
    size,
  );
}
