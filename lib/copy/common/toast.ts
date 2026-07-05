/**
 * 앱 공통 토스트 카피 — 특정 도메인에 속하지 않는 총칭 알림 문구. (`lib/copy/<domain>/` 룰)
 *
 * 전역 mutation 실패 안전망(`app/providers.tsx` 의 `mutationCache.onError`)이 띄우는 총칭 메시지.
 * 자체 에러 피드백(인라인/배너/전용 토스트)을 가진 mutation 은 `meta.skipGlobalErrorToast` 로 opt-out.
 */

export const GENERIC_MUTATION_ERROR =
  "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
