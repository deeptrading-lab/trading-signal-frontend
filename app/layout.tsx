import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradingSignalEngine",
  description: "AI 기반 매수·매도 판단 보조 서비스",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
