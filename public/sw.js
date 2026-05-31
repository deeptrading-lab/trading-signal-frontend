/**
 * FinSight 최소 서비스워커 — 오프라인 캐싱 없음(네트워크 그대로 통과).
 *
 * 목적: Android Chrome 의 PWA 설치 가능 조건(서비스워커 등록 + fetch 핸들러)을 충족해
 * "주소창 없는 전체화면 설치(WebAPK)"를 활성화하는 것뿐. `fetch` 에서 respondWith 를 호출하지
 * 않으므로 모든 요청은 브라우저 기본 네트워크 처리로 위임 → 응답 캐싱/가로채기 0 = stale 데이터 위험 0.
 * (실시간 시세/시그널 앱이라 의도적으로 오프라인 캐싱을 두지 않음.)
 *
 * iOS 는 SW 없이도 standalone 이므로 본 파일과 무관하나, 등록돼도 무해(no-op).
 * 등록은 `components/pwa/ServiceWorkerRegister.tsx` 가 담당. 게이트 예외는 `middleware.ts` `/sw.js`.
 */
self.addEventListener("install", () => {
  // 새 SW 를 대기 없이 즉시 활성화.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 활성화 즉시 열린 모든 탭을 제어(설치 직후 1회 새로고침 없이 동작).
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // no-op: respondWith 미호출 → 브라우저 기본 동작. 캐싱하지 않음.
});
