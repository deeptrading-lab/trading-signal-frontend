/**
 * 홈 최신 공시 피드(카드리스) 한글 카피 — home-reskin.
 *
 * 기존 `DisclosureFeedContainer` 인라인 문자열을 카피 계층으로 분리(i18n 여지).
 */

/** 섹션 제목 — 노스스타 `#homeScreen .feed` 정합("공시"). */
export const DISCLOSURE_FEED_TITLE = "공시";
export const DISCLOSURE_FEED_EMPTY_TICKERS =
  "관심 종목을 추가하면 최신 공시를 볼 수 있어요";
export const DISCLOSURE_FEED_EMPTY = "최근 공시가 없어요";
export const DISCLOSURE_FEED_ERROR =
  "공시 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

/** 우측 카운트("최근 N건"). */
export function disclosureFeedCount(count: number): string {
  return `최근 ${count}건`;
}
