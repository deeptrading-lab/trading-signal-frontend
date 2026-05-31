import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./components.css";
import { Providers } from "./providers";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/copy/site";

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
 */
export const viewport: Viewport = {
  themeColor: "#ffffff",
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
      </body>
    </html>
  );
}
