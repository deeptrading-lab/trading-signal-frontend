import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./components.css";
import { Providers } from "./providers";

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
 * 사이트 설명 — OG/Twitter 와 한 곳에서만 정의(중복 방지). PRD social-share-metadata §3.1 / q5.
 */
const SITE_DESCRIPTION = "AI 기반 매수·매도 판단 보조 서비스";

/**
 * OG/Twitter 이미지·url 의 절대 URL 해석 기준(metadataBase).
 * - prod/preview 모두 자기 도메인을 가리키도록 Vercel 제공 도메인을 우선, 없으면 prod 하드코딩 폴백.
 *   (PRD social-share-metadata §3.3 / q3 = 옵션 A — 하드코딩 + Vercel 폴백, 신규 env 미도입.)
 */
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://trading-signal-frontend.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "FinSight",
  description: SITE_DESCRIPTION,
  // OG 이미지(`/opengraph-image`)는 `app/opengraph-image.tsx` 파일 컨벤션으로 Next 가 자동 주입한다(Next 16).
  // → openGraph.images / twitter.images 명시 불필요. metadataBase 가 절대 URL 해석을 담당.
  openGraph: {
    title: "FinSight",
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "FinSight",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    // OG 이미지 1종 공유 — twitter-image.tsx 미생성, opengraph-image 를 fallback 으로 재사용(q2).
    card: "summary_large_image",
    title: "FinSight",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning — 일부 브라우저 확장 (예: WebClipper "webcrx") 이
    // 클라이언트에서 <html> 에 추가 속성을 주입하여 SSR/CSR mismatch 가 발생.
    // 외부 요인이므로 본 한 레벨에서만 경고 억제 (자식 트리에는 미전파).
    <html lang="ko" className={pretendard.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
