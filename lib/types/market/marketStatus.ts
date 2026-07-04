/**
 * 앱 표준 장 상태 타입 — 토스 캘린더(`TossMarketCalendar`)를 정규화한 진실원천.
 *
 * PRD `toss-market-calendar` §3-3. 기존 `lib/market/snapshot.ts` 의 `MarketSession`
 * ("pre"|"open"|"post"|"closed") 와 **네이밍이 다르며 병존**한다(regular↔open, after↔post) —
 * 리네임 금지(스냅샷 리더 다수). 통합은 후속 PR(§7 매핑 노트).
 */

import type { TossMarketCalendar } from "@/lib/api/toss/types";

/** 장 상태 phase. `unknown` = 키 없음/캘린더 조회 실패(fail-soft). */
export type MarketPhase = "pre" | "regular" | "after" | "closed" | "unknown";

/** 세션별 경계 시각(KST "HH:mm"). 값 없으면 "". */
export type SessionTimes = {
  pre: { start: string; auction: string; end: string };
  regular: { start: string; auction: string; end: string };
  after: { start: string; auctionEnd: string; end: string };
};

export type MarketStatus = {
  phase: MarketPhase;
  /**
   * 정규장 거래 중 여부 — **fail-open**: phase="unknown"(조회 실패) 은 `true` 로 취급한다.
   * 후속 호가/시세 폴링 게이트가 이 값으로 갈아탈 때, 캘린더 실패가 "장중 폴링 오정지"
   * 라는 새 실패모드를 만들지 않도록(캘린더 백드 상태에 폴링을 커플링하지 않음, PRD §8/q3).
   */
  isRegularOpen: boolean;
  /** today.integrated !== null (평일 공휴일 인지). */
  todayIsBusinessDay: boolean;
  /** YYYY-MM-DD (KST). 캘린더 없으면 "". */
  todayDate: string;
  /** 마감·휴장 시 다음 정규장 개장(날짜 + "HH:mm"). 그 외 null. */
  nextOpen: { date: string; time: string } | null;
  /** 오늘 영업일이면 세션 시각, 휴장/불명이면 null. */
  sessionTimes: SessionTimes | null;
};

/** `/api/market/calendar` BFF 응답 — 서버 파생 status + 클라 재평가용 원본 calendar. */
export type MarketCalendarResponse = {
  status: MarketStatus;
  /** 클라 훅이 세션 경계 경과 시 phase 를 재계산할 수 있게 동봉. 키 없음/실패 시 null. */
  calendar: TossMarketCalendar | null;
};

/** fail-soft 기본값 — 키 없음/실패/미마운트. isRegularOpen 은 fail-open(true). */
export const UNKNOWN_MARKET_STATUS: MarketStatus = {
  phase: "unknown",
  isRegularOpen: true,
  todayIsBusinessDay: false,
  todayDate: "",
  nextOpen: null,
  sessionTimes: null,
};
