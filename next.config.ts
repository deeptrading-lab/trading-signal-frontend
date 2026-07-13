import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import path from "node:path";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    // 배럴(index re-export) 해석을 빌드 타임에 평면화해 tree-shaking·모듈 그래프 비용 절감
    // (mobile-perf-bundle). lucide-react 는 Next 기본 목록에 이미 포함되어 명시 불요.
    optimizePackageImports: ["recharts"],
  },
};

export default withBundleAnalyzer(nextConfig);
