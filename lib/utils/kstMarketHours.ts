/**
 * KRX 정규장 시간 판정 — 도메인 무관 순수 유틸(서버·클라이언트 공용).
 *
 * 원래 `lib/server/market/refreshScheduler.ts` 내부에 있던 것을 단타워치 자동 틱(클라이언트)이
 * 함께 쓰도록 추출. 공휴일은 인지하지 못한다 — 호출측은 fail-soft(휴장일 호출은 서버 dedup·
 * 가격 무변화로 무해) 전제로 사용한다.
 */

function kstMinutesOfWeekday(now: Date): number | null {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday"); // Mon..Sun
  if (weekday === "Sat" || weekday === "Sun") return null;
  // hour12:false 는 자정을 "24"로 줄 수 있어 모듈러로 정규화.
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  return hour * 60 + minute;
}

/** 평일(월~금) 09:00~15:30 KST 면 true — 정규장 시간. */
export function isKstMarketHours(now: Date = new Date()): boolean {
  const mins = kstMinutesOfWeekday(now);
  return mins != null && mins >= 9 * 60 && mins <= 15 * 60 + 30;
}

/**
 * 정규장 + 마감 유예(~15:40) — 단타 자동 틱 폴링용. 15:20 전량 청산은 15:30 창 틱에서
 * 발동하는데, 폴링 게이트가 15:30 에 딱 닫히면 busy 스킵 한 번으로 그 유일한 기회가
 * 사라져 포지션이 오버나잇으로 남는다(코드리뷰 #7). 유예 동안의 여분 호출은 서버가
 * 같은 창으로 dedup 하므로 무해.
 */
export function isKstMarketHoursWithCloseGrace(now: Date = new Date()): boolean {
  const mins = kstMinutesOfWeekday(now);
  return mins != null && mins >= 9 * 60 && mins <= 15 * 60 + 40;
}
