import { ImageResponse } from "next/og";
import { brandMark } from "@/lib/brand-mark";

/**
 * iOS 홈 화면 아이콘(apple-touch-icon) — App Router `app/apple-icon.tsx` 파일 컨벤션.
 * - iOS 는 PWA manifest 아이콘을 무시하고 본 파일을 홈 아이콘으로 쓴다. 미존재 시 페이지에서
 *   글자만 따 회색 자동 아이콘이 됨(개선 전 증상). 180×180 = iOS 권장 apple-touch-icon 크기.
 * - full-bleed(radius 0): iOS 가 squircle 마스킹을 자체 적용하므로 배경을 끝까지 채운다.
 * - ⚠️ 운영 도메인은 미인증 요청을 `/login` 으로 307 시키므로, `middleware.ts` 의 `isPublicPath`
 *   에 `/apple-icon` 예외가 있어야 iOS 가 PNG 를 받을 수 있다(없으면 로그인 HTML 수신 → 아이콘 깨짐).
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(brandMark(size.width), size);
}
