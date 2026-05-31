import { ImageResponse } from "next/og";
import { brandMark } from "@/lib/brand-mark";

/**
 * PWA manifest 아이콘(Android/standalone) — `/icon-pwa?size=192|512`.
 * - 단일 라우트로 두 사이즈를 처리(파일 스프롤 최소화). `app/manifest.ts` 의 `icons[].src` 가 참조.
 * - 경로가 `/icon` 으로 시작 → middleware matcher 제외(`...|icon|...`) + `isPublicPath` 의
 *   `startsWith("/icon")` 로 미인증에도 공개 서빙됨(아이콘은 비밀이 아님).
 * - iOS 홈 아이콘은 본 라우트가 아니라 `app/apple-icon.tsx` 를 쓴다.
 */
const ALLOWED_SIZES = new Set([192, 512]);
const DEFAULT_SIZE = 512;

export function GET(request: Request) {
  const requested = Number(new URL(request.url).searchParams.get("size"));
  const dim = ALLOWED_SIZES.has(requested) ? requested : DEFAULT_SIZE;
  return new ImageResponse(brandMark(dim), { width: dim, height: dim });
}
