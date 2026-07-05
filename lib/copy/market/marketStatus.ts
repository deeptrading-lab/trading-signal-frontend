/**
 * 장 상태 배지(`MarketStatusBadge`)의 한글 카피 — 단일 위치(i18n 여지).
 *
 * PRD `toss-market-calendar` §3-7 / DESIGN 핸드오프 매트릭스. 시각 값(동시호가·종료 시각·다음
 * 개장)은 서버 응답 `sessionTimes`/`nextOpen` 에서 파생하며 하드코딩하지 않는다. 요일 포맷은
 * `lib/api/toss/kst.ts`(Asia/Seoul) 재사용(§9 q5).
 */

import { kstWeekdayKo } from "@/lib/api/toss/kst";
import type { MarketStatus } from "@/lib/types/market/marketStatus";

/** 배지 컨테이너 스크린리더 라벨. */
export const MARKET_STATUS_ARIA = "국내 장 상태";

export type MarketStatusLabel = { full: string; short: string };

/**
 * phase → 라벨(PC 풀 / 모바일 축약). unknown 은 null(미표시).
 *   - pre: 동시호가 시각, after: 종료 시각을 세션 시각에서 붙인다.
 *   - closed: `todayIsBusinessDay` 로 "장 마감"(영업일) vs "휴장"(주말·공휴일) 분기.
 */
export function marketStatusLabel(status: MarketStatus): MarketStatusLabel | null {
  switch (status.phase) {
    case "regular":
      return { full: "장중", short: "장중" };
    case "pre": {
      const auction = status.sessionTimes?.pre.auction;
      return { full: auction ? `장전 · 동시호가 ${auction}` : "장전", short: "장전" };
    }
    case "after": {
      const end = status.sessionTimes?.after.end;
      return { full: end ? `시간외 · ${end}까지` : "시간외", short: "시간외" };
    }
    case "closed":
      return status.todayIsBusinessDay
        ? { full: "장 마감", short: "마감" }
        : { full: "휴장", short: "휴장" };
    case "unknown":
    default:
      return null;
  }
}

/** "다음 개장 7/6(월) 09:00" — nextOpen 존재 시(마감·휴장). */
export function nextOpenText(nextOpen: { date: string; time: string }): string {
  const [, mm, dd] = nextOpen.date.split("-");
  const md = mm && dd ? `${Number(mm)}/${Number(dd)}` : nextOpen.date;
  const weekday = kstWeekdayKo(nextOpen.date);
  const dateLabel = weekday ? `${md}(${weekday})` : md;
  return `다음 개장 ${dateLabel} ${nextOpen.time}`;
}
