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

const DEFAULT_RATIO = 3; // 최신 iPhone 대부분 @3x

function clampDim(raw: string | null, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= MIN_DIM && n <= MAX_DIM ? n : fallback;
}

function clampRatio(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 && n <= 4 ? n : DEFAULT_RATIO;
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const width = clampDim(url.searchParams.get("w"), DEFAULT_W);
  const height = clampDim(url.searchParams.get("h"), DEFAULT_H);
  // 인앱 스플래시(`.splash-icon`/`.splash-wordmark`)와 동일 레이아웃 — **로고 정중앙 + 워드마크 하단**.
  // 고정 dp(로고 160 / 폰트 36)에 기기 ratio 를 곱해, iOS 시작화면(본 이미지)→인앱 전환 시 위치·크기 점프 없음.
  const ratio = clampRatio(url.searchParams.get("r"));
  const glyph = Math.round(160 * ratio);
  const fontSize = Math.round(36 * ratio);
  // 워드마크 하단 위치 — 인앱 `.splash-wordmark` bottom(safe-area-inset-bottom ~34dp + 48px ≈ 82dp) 매칭.
  const textBottom = Math.round(82 * ratio);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          alignItems: "center", // 로고 정중앙
          justifyContent: "center",
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
            position: "absolute", // 워드마크는 화면 하단(여백)
            bottom: textBottom,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
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
