/**
 * 거래량(주식 수) 컴팩트 표기 — 실시간 순위 "거래량" 탭의 값 컬럼(⑤ `ranking-columns` 후속).
 *
 * 누적 거래량은 수백만~수억 주라 콤마 표기로는 순위 셀이 넘친다. 억/만 단위로 접어 좁은 셀에 맞춘다.
 * 금액(`formatWonCompact`)과 달리 단위가 "주"이고 억 미만은 만 단위로 끊는 게 국내 관례. 예:
 *   - `253_000_000` → `"2.5억주"`
 *   - `12_340_000`  → `"1,234만주"`
 *   - `8_500`       → `"8,500주"`
 *   - `null`·`0`·`NaN` → `"-"`(fail-soft — 미확보·비정상 값)
 */

import { formatNumber } from "@/lib/utils/formatMoney";

const EOK = 1e8; // 억 = 100,000,000
const MAN = 1e4; // 만 = 10,000

/** 거래량(주) → "N억주"/"N만주"/"N주"/"-" 컴팩트 표기. 미확보·비정상 값은 "-"(NaN 방어). */
export function formatShareVolume(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "-";
  if (value >= EOK) {
    const eok = value / EOK;
    // 10억주 이상은 정수, 그 미만만 소수 1자리(2.5억주처럼 대략치 유지).
    return `${formatNumber(eok, { digits: eok >= 10 ? 0 : 1 })}억주`;
  }
  if (value >= MAN) {
    // 만 단위는 정수 콤마("1,234만주") — 순위 상위 거래량은 항상 큰 값이라 소수 불필요.
    return `${formatNumber(Math.floor(value / MAN), { digits: 0 })}만주`;
  }
  return `${formatNumber(Math.floor(value), { digits: 0 })}주`;
}
