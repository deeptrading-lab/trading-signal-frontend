import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./components.css";
import { Providers } from "./providers";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { SplashScreen } from "@/components/pwa/SplashScreen";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/copy/site";

/**
 * iOS PWA 시작 화면(`apple-touch-startup-image`) — iOS 는 manifest 로 스플래시를 자동 생성하지
 * 않으므로(기본 빈 흰 화면), 기기 해상도별로 `/splash-ios?w=&h=`(흰 배경+글리프+FinSight)를 연결한다.
 * 표는 [CSS pt 폭, 높이, devicePixelRatio] — 이미지 px = pt × ratio. 세로(portrait) 한정.
 * 최근 ~6년 iPhone(SE2 ~ 16 Pro Max) 커버. Android 는 네이티브 스플래시가 있어 불필요.
 */
const IOS_SPLASH_DEVICES: ReadonlyArray<[number, number, number]> = [
  [375, 667, 2], // SE 2·3 / 8 / 7 / 6s
  [414, 736, 3], // 8·7·6s Plus
  [375, 812, 3], // X / XS / 11 Pro
  [414, 896, 2], // XR / 11
  [414, 896, 3], // XS Max / 11 Pro Max
  [360, 780, 3], // 12 mini / 13 mini
  [390, 844, 3], // 12 / 12 Pro / 13 / 13 Pro / 14
  [428, 926, 3], // 12·13 Pro Max / 14 Plus
  [393, 852, 3], // 14 Pro / 15 / 15 Pro / 16
  [430, 932, 3], // 14 Pro Max / 15 Plus·Pro Max / 16 Plus·Pro Max
  [402, 874, 3], // 16 Pro
];

const APPLE_STARTUP_IMAGES = IOS_SPLASH_DEVICES.map(([w, h, r]) => ({
  // `r`(devicePixelRatio) 도 넘겨, 라우트가 로고/워드마크를 인앱 스플래시와 동일한 고정 dp×r 로 굽게 한다
  // (시작화면 → 인앱 스플래시 로고 점프 방지).
  url: `/splash-ios?w=${w * r}&h=${h * r}&r=${r}`,
  media: `screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
}));

/**
 * Pretendard (Korean-Hangul + Latin subset) — `next/font/local` 로 self-host.
 * - `public/fonts/pretendard/` 의 woff2 4 종 (400 / 500 / 700 / 800) 을 흡수.
 * - CSS variable `--font-pretendard` 로 export → `tailwind.theme.json.fontFamily` 의
 *   각 토큰 첫 패밀리 `Pretendard` 와 정합 (브라우저는 `Pretendard` 글리프를 본 self-host 에서 우선 로드).
 * - `next/font` 가 size-adjust + font-display: swap 을 자동 주입해 FOUT 0 건.
 * - PRD finsight-redesign §9 q6 RESOLVED 옵션 B (self-host).
 */
const pretendard = localFont({
  src: [
    {
      path: "../public/fonts/pretendard/Pretendard-Regular.subset.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/pretendard/Pretendard-Medium.subset.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/pretendard/Pretendard-Bold.subset.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/pretendard/Pretendard-ExtraBold.subset.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-pretendard",
  display: "swap",
  preload: true,
  fallback: ["-apple-system", "BlinkMacSystemFont", "Arial", "sans-serif"],
});

/**
 * 사이트 이름/설명은 `lib/copy/site.ts` 단일 소스에서 import(중복 방지) — manifest 와 공유.
 * PRD social-share-metadata §3.1 / q5.
 *
 * OG/Twitter 이미지·url 의 절대 URL 해석 기준(metadataBase).
 * - prod/preview 모두 자기 도메인을 가리키도록 Vercel 제공 도메인을 우선, 없으면 prod 하드코딩 폴백.
 *   (PRD social-share-metadata §3.3 / q3 = 옵션 A — 하드코딩 + Vercel 폴백, 신규 env 미도입.)
 */
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://trading-signal-frontend.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  // 웹 앱 매니페스트(`app/manifest.ts` → `/manifest.webmanifest`) — "홈 화면에 추가" 시 앱 이름·색·
  // 전체화면 + 아이콘 제공. middleware `isPublicPath` 에 이미 공개 등록됨.
  manifest: "/manifest.webmanifest",
  // iOS standalone(주소창 없는 전체화면) — 홈 아이콘은 `app/apple-icon.tsx` 가 별도 담당.
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default", // light 고정 디자인 → 흰 상태바 + 어두운 텍스트.
    startupImage: APPLE_STARTUP_IMAGES, // iOS 시작 화면(흰 배경+글리프+FinSight) — Android 는 네이티브.
  },
  // OG 이미지(`/opengraph-image`)는 `app/opengraph-image.tsx` 파일 컨벤션으로 Next 가 자동 주입한다(Next 16).
  // → openGraph.images / twitter.images 명시 불필요. metadataBase 가 절대 URL 해석을 담당.
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    // OG 이미지 1종 공유 — twitter-image.tsx 미생성, opengraph-image 를 fallback 으로 재사용(q2).
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

/**
 * 브라우저 toolbar/상태바 tint(`<meta name="theme-color">`) — manifest `theme_color` 와 정합.
 * Next 16 은 themeColor 를 metadata 가 아닌 viewport export 에 두기를 권장.
 *
 * `viewportFit: "cover"` — 설치형 PWA(standalone)에서 콘텐츠를 화면 가장자리(상태바·홈 인디케이터)
 *   까지 확장해 `env(safe-area-inset-*)` 를 활성화한다. 헤더 글래스를 상태바 영역까지 끌어올려
 *   `순백 상태바 ↔ 반투명 글래스` 경계선(seam)을 제거하기 위함(`.header-glass` / `.bottom-nav`
 *   의 safe-area 패딩과 세트). 데스크탑·일반 브라우저 탭은 인셋이 0이라 무회귀.
 */
export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning — 일부 브라우저 확장 (예: WebClipper "webcrx") 이
    // 클라이언트에서 <html> 에 추가 속성을 주입하여 SSR/CSR mismatch 가 발생.
    // 외부 요인이므로 본 한 레벨에서만 경고 억제 (자식 트리에는 미전파).
    <html lang="ko" className={pretendard.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
        {/* 콜드 로드 직후 풀스크린 브랜드 스플래시(로고+FinSight) → 로드되면 fade-out.
         *  네이티브 OS 스플래시(Android 아이콘 / iOS startupImage)를 이어받아 연속 화면처럼 보인다. */}
        <SplashScreen />
      </body>
    </html>
  );
}
