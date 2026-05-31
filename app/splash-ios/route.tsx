import { ImageResponse } from "next/og";
import {
  BRAND_MARK_BG,
  PULSE_POLYLINE_POINTS,
  pulseGradientDefs,
} from "@/lib/brand-mark";

/**
 * iOS 설치형 PWA 시작 화면(apple-touch-startup-image) 동적 생성 — `/splash-ios?w=&h=`.
 *
 * iOS 는 Android 와 달리 manifest 로 스플래시를 자동 생성하지 않아, 기본값이 **빈 흰 화면**이다.
 * 본 라우트가 기기 해상도(w×h px)에 맞춘 **흰 배경 + 중앙 3색 맥박 글리프 + "FinSight" 워드마크**
 * PNG 를 굽고, `app/layout.tsx` 의 `appleWebApp.startupImage` 가 미디어쿼리별로 참조한다.
 * → iOS 도 Android 네이티브 스플래시급 브랜드 화면을 얻는다.
 *
 * 인앱 스플래시(`components/pwa/SplashScreen.tsx`)와 **배경(#ffffff)·글리프·워드마크를 맞춰**,
 * 네이티브 스플래시 → 인앱 스플래시 전환이 "중복 2회" 가 아니라 연속 화면으로 보이게 한다.
 *
 * 색/글리프는 `lib/brand-mark.tsx` 단일 소스. ImageResponse(Satori) 내부는 Tailwind 토큰 직접
 * 호출 불가라 hex 명시(디자인 토큰 직타의 합리적 예외 — 토큰 변경 시 본 상수도 갱신).
 * 공개 경로: `middleware.ts` `PUBLIC_EXACT_PATHS` 의 `/splash-ios` (미인증 iOS 도 PNG 수신).
 */
const MIN_DIM = 320;
const MAX_DIM = 3000;
const DEFAULT_W = 1170; // iPhone 12~14 (390pt @3x)
const DEFAULT_H = 2532;

function clampDim(raw: string | null, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= MIN_DIM && n <= MAX_DIM ? n : fallback;
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const width = clampDim(url.searchParams.get("w"), DEFAULT_W);
  const height = clampDim(url.searchParams.get("h"), DEFAULT_H);
  // 글리프·워드마크는 짧은 변 기준 스케일(세로/가로 균형) — 인앱 스플래시 비율과 근사.
  const base = Math.min(width, height);
  const glyph = Math.round(base * 0.26);
  const fontSize = Math.round(base * 0.11);
  const gap = Math.round(base * 0.06);

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
          gap,
          background: BRAND_MARK_BG,
        }}
      >
        <svg
          width={glyph}
          height={glyph}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {pulseGradientDefs("splashIosPulse")}
          {/* lucide-react Activity 글리프 — 색/좌표는 lib/brand-mark.tsx 단일 소스. */}
          <polyline points={PULSE_POLYLINE_POINTS} stroke="url(#splashIosPulse)" />
        </svg>
        <div
          style={{
            fontSize,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1,
            color: "#1e293b", // slate-800 — 흰 배경 위 다크 워드마크(OG 이미지와 동일 톤).
          }}
        >
          FinSight
        </div>
      </div>
    ),
    { width, height },
  );
}
