import { ImageResponse } from "next/og";

/**
 * FinSight favicon — App Router `app/icon.tsx` 패턴 + `next/og` ImageResponse 동적 생성.
 * - 시각: 파란 배경 + 흰 lucide `Activity` 아이콘 → 사이드바 brand badge 와 정합.
 * - 색: accent-vivid v8 (#1d4ed8). `ImageResponse` 내부에서는 Tailwind 토큰 직접 호출 불가 → hex 명시.
 *   (디자인 토큰 hex 직타 금지의 합리적 예외 — 토큰 동기화 시 본 파일도 갱신 필요.)
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
          background: "#1d4ed8",
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
          {/* lucide-react Activity icon path */}
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
    ),
    size,
  );
}
