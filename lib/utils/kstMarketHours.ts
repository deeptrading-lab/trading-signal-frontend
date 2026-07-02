/**
 * KRX 정규장 시간 판정 — 도메인 무관 순수 유틸(서버·클라이언트 공용).
 *
 * 원래 `lib/server/market/refreshScheduler.ts` 내부에 있던 것을 단타워치 자동 틱(클라이언트)이
 * 함께 쓰도록 추출. 공휴일은 인지하지 못한다 — 호출측은 fail-soft(휴장일 호출은 서버 dedup·
 * 가격 무변화로 무해) 전제로 사용한다.
 */

/** 평일(월~금) 09:00~15:30 KST 면 true — 정규장 시간. */
export function isKstMarketHours(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday"); // Mon..Sun
  if (weekday === "Sat" || weekday === "Sun") return false;
  // hour12:false 는 자정을 "24"로 줄 수 있어 모듈러로 정규화.
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  const mins = hour * 60 + minute;
  return mins >= 9 * 60 && mins <= 15 * 60 + 30;
}
