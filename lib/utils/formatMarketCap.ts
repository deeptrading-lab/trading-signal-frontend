/**
 * 원(₩) 금액 컴팩트 표기 — 실시간 순위의 시가총액·거래대금 컬럼(⑤ `ranking-columns`).
 *
 * 원값은 자릿수가 길어 콤마 표기(`formatMoney`)로는 좁은 순위 셀이 넘친다. 토스식 조/억 컴팩트로
 * 맞춘다(`formatNetBuy` 억원 패턴 답습·NaN 방어). 예:
 *   - `173_400_000_000_000` → `"173.4조"`
 *   - `845_000_000_000`     → `"8,450억"`
 *   - `null`·`0`·`NaN`      → `"-"`(fail-soft — 토스 미설정·enrich 실패·미확보)
 *
 * `formatMarketCap` 은 시총 컬럼용 의미 별칭이고, `formatWonCompact` 은 거래대금 등 다른 원 금액
 * 컬럼이 같은 규칙을 재사용하기 위한 일반 이름이다(동일 로직 — 단위 규칙 SSOT 1곳).
 */

import { formatNumber } from "@/lib/utils/formatMoney";

const JO = 1e12; // 조 = 1,000,000,000,000
const EOK = 1e8; // 억 = 100,000,000

/** 원(₩) 금액 → "N조"/"N억"/"-" 컴팩트 표기. 미확보·비정상 값은 "-"(NaN 방어). */
export function formatWonCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "-";
  if (value >= JO) {
    const jo = value / JO;
    // 100조 이상은 정수(자릿수 절약), 그 미만은 소수 1자리로 대형/중형 구분.
    return `${formatNumber(jo, { digits: jo >= 100 ? 0 : 1 })}조`;
  }
  const eok = value / EOK;
  // 10억 이상은 정수(콤마), 그 미만(극소형)만 소수 1자리로 0억 뭉개짐 방지.
  return `${formatNumber(eok, { digits: eok >= 10 ? 0 : 1 })}억`;
}

/** 시가총액(원) 컴팩트 표기 — `formatWonCompact` 의미 별칭(시총 컬럼). */
export const formatMarketCap = formatWonCompact;
