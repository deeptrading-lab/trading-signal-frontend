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

export const metadata: Metadata = {
  title: "TradingSignalEngine",
  description: "AI 기반 매수·매도 판단 보조 서비스",
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
