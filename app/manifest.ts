import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/copy/site";

/**
 * 웹 앱 매니페스트 — `app/manifest.ts` 파일 컨벤션 → `/manifest.webmanifest` 로 서빙.
 * "홈 화면에 추가" 시 앱 이름·색·전체화면(standalone) + 아이콘을 제공한다(Android "앱 설치" 배너 트리거).
 * - `/manifest.webmanifest` 는 `middleware.ts` 의 `isPublicPath` 에 이미 공개 등록됨.
 * - 아이콘 PNG 는 `app/icon-pwa/route.tsx`(`/icon-pwa?size=…`) 가 동적 생성.
 * - 색: light 고정 디자인과 정합. surface(#ffffff) 배경 / 상태바 흰색. (추후 브랜드 블루로 교체 가능.)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon-pwa?size=192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-pwa?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-pwa?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
