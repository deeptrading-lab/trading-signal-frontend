/**
 * 순위 랭킹(거래량·등락률) 공통 ETP 필터 — BFF route handler 전용.
 *
 * KIS 순위 TR 은 `FID_DIV_CLS_CODE=1`(보통주)로도 ETP 가 걸러지지 않아(실측: 인버스 ETF·ETN 이
 * 상위 도배) 이름·코드로 2차 필터한다. 급상승/급하락·거래량 후보는 개별 종목이 목적이라
 * `volume-rank`·`fluctuation` 두 route 가 **동일한** 휴리스틱을 공유해야 드리프트가 없다.
 *
 * - 코드: 정규 6자리 숫자만(ETN 은 Q 접두 등 비정형).
 * - 이름: 대표 ETP 브랜드·파생 키워드.
 */

export const ETP_NAME_RE =
  /(ETN|ETF|KODEX|TIGER|KBSTAR|RISE|SOL|ACE|PLUS|HANARO|ARIRANG|레버리지|인버스|선물|콜|풋)/i;

export function isRegularStock(row: { ticker: string; name: string }): boolean {
  return /^\d{6}$/.test(row.ticker) && !ETP_NAME_RE.test(row.name);
}
