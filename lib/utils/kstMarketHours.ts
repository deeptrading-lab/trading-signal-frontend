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

/**
 * 토·일(KST)이면 true — 주말 판정. **공휴일은 인지하지 못한다**(주말만).
 * `deriveMarketStatus` 의 캘린더 미가용(키 없음/실패) 폴백에서 "장 마감"(평일) vs "휴장"(주말)
 * 라벨 분기에 쓴다. `kstMinutesOfWeekday` 가 주말에 null 을 주는 것과 동일 기준(Asia/Seoul weekday).
 */
export function isKstWeekend(now: Date = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(now);
  return weekday === "Sat" || weekday === "Sun";
}

/**
 * 평일 마감 유예(15:40)를 지난 시각이면 true — 단타 세션 **마감 자동 완료** 게이트.
 * 장중·프리마켓(09:00 이전)·주말은 false. 15:20 전량 청산이 이미 지나 종료 시 열린 포지션은 없다.
 *
 * `isKstMarketHoursWithCloseGrace`(≤15:40)와 겹치지 않게 **초과(>15:40)** 로 판정한다 —
 * 15:40 까지는 틱, 15:41 부터 종료 스윕이라 마지막 틱과 종료가 서로 밟지 않는다.
 * 프리마켓을 제외하는 이유: 09:00 직전에 미리 만들어 둔 세션을 개장 전에 완료시키지 않기 위함.
 */
export function isKstAfterMarketClose(now: Date = new Date()): boolean {
  const mins = kstMinutesOfWeekday(now);
  return mins != null && mins > 15 * 60 + 40;
}
