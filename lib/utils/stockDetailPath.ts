/**
 * stockDetailPath — 종목 상세(`/stock/[ticker]`) 경로 빌더.
 *
 * 이름을 알고 진입하는 호출부(수급·관심목록·"종목 분석" 메뉴)는 `?q=<종목명>` 을 실어
 * 상세 페이지가 검색창을 미리 채우도록 한다(`StockSearchContainer initialKeyword`).
 * 이름이 없거나 ticker 폴백(미해결)이면 `q` 를 생략해 `?q=005930` 같은 무의미 쿼리를 피한다.
 */
export function stockDetailPath(ticker: string, name?: string | null): string {
  const base = `/stock/${ticker}`;
  if (name && name !== ticker) {
    return `${base}?q=${encodeURIComponent(name)}`;
  }
  return base;
}
