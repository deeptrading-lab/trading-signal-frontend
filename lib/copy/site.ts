/**
 * 사이트 전역 메타 카피 — 단일 소스(중복 방지).
 * `app/layout.tsx`(metadata) 와 `app/manifest.ts`(PWA manifest) 가 함께 참조한다.
 * - 기존엔 `SITE_DESCRIPTION` 이 layout.tsx 안에만 로컬로 존재했으나, manifest 도 같은 값을
 *   써야 해 한 곳으로 추출. PRD social-share-metadata §3.1 / q5 의 "한 곳에서만 정의" 규약 계승.
 */
export const SITE_NAME = "FinSight";
export const SITE_DESCRIPTION = "AI 기반 매수·매도 판단 보조 서비스";
