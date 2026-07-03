/**
 * 클라이언트-안전 실행 환경 판별 헬퍼.
 *
 * `isVercelRuntime()` — Vercel 배포(production·preview) 여부. Vercel 이 빌드타임에
 * `NEXT_PUBLIC_VERCEL_ENV` 를 번들에 인라인하므로 서버/클라이언트 값이 동일 → 하이드레이션 불일치 0.
 * 로컬 CLI(구독) 전용 기능을 Vercel 에서 숨김·차단하는 클라이언트 측 단일 진실 원천
 * (기존에 navItems·AIAnalysisPanel 이 동일 인라인 검사를 각자 복제하던 것을 일원화).
 *
 * ⚠️ 서버 전용 판별은 `lib/server/env.ts` 의 `isVercelEnv()`(VERCEL·VERCEL_ENV 등 비-public env 포함)
 *    를 쓴다. 본 함수는 `NEXT_PUBLIC_*` 만 보므로 클라이언트 컴포넌트에서 안전하게 호출 가능하다.
 */
export function isVercelRuntime(): boolean {
  return typeof process.env.NEXT_PUBLIC_VERCEL_ENV === "string";
}
