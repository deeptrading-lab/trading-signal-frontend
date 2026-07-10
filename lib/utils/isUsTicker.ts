/**
 * 미국 종목 티커 판정 (us-stock-support).
 *
 * 국내 티커는 항상 6자리 숫자(005930), 미국 티커는 영문으로 시작(AAPL·BRK.A·SPY).
 * KR/US 분기(상세 페이지 KR 전용 섹션 숨김·데이터 소스 라우팅)의 단일 판정 헬퍼 —
 * `/^\d{6}$/` 인라인 중복을 대체한다.
 */
export function isUsTicker(ticker: string): boolean {
  return /^[A-Za-z]/.test(ticker);
}
