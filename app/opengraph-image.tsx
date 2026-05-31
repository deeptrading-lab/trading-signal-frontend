import { ImageResponse } from "next/og";

/**
 * FinSight 소셜 공유 OG 이미지 — App Router `app/opengraph-image.tsx` 파일 컨벤션 + `next/og` ImageResponse.
 * - 카톡/SNS 링크 프리뷰의 대표 이미지(1200×630). twitter:image 도 이 라우트를 fallback 재사용(PRD §3.2 / q2 — twitter-image 미생성).
 * - 시각: 파란 배경 + 흰 lucide `Activity` 아이콘 + "FinSight" 라틴 워드마크 → `app/icon.tsx`(favicon) 와 동일 브랜드 톤.
 *   1차는 라틴 워드마크만(폰트 주입 없는 시스템 텍스트). 한글 태그라인은 Pretendard subset 주입 후속(PRD §3.2 / q4).
 * - 색: accent-vivid v8 (#1d4ed8). `ImageResponse` 내부에서는 Tailwind 토큰 직접 호출 불가 → hex 명시.
 *   (디자인 토큰 hex 직타 금지의 합리적 예외 — 토큰 동기화 시 본 파일도 갱신 필요. `app/icon.tsx` 와 동일 값 유지.)
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
          gap: 36,
          background: "#1d4ed8", // accent-vivid v8 — app/icon.tsx 와 동일(브랜드 정합). hex 직타 예외(상단 주석).
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 180,
            height: 180,
            borderRadius: 36,
            background: "rgba(255,255,255,0.12)",
            border: "6px solid rgba(255,255,255,0.9)", // 배지 흰색 테두리(브랜드 타일 강조)
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* lucide-react Activity icon path — app/icon.tsx 와 동일 */}
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          FinSight
        </div>
      </div>
    ),
    size,
  );
}
