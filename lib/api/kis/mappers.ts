/**
 * KIS 응답 (snake_case + 한국식 약어) → 클라이언트 친화 스키마 매핑.
 *
 * PRD `stock-api-integration` §3.1, AC-10 — 종목명 추출 회귀 차단의 1차 방어선.
 *
 * ## ⚠️ 종목명 vs 업종명 — 우선순위 강제
 *
 * `bstp_kor_isnm` 은 **업종명** ("전기·전자"). 종목명 아님.
 * 종목명 추출 우선순위:
 *   1. `hts_kor_isnm` — KIS 가 돌려주는 정식 종목명. 1차 소스.
 *   2. `prdt_name` — 일부 다른 엔드포인트의 종목명 대체.
 *   3. ticker — 둘 다 비면 종목코드 그대로.
 *
 * → `bstp_kor_isnm` 은 절대 종목명으로 사용 X (AC-10 #4 회귀 차단).
 *
 * 단위 테스트 위치: `lib/api/kis/__tests__/mappers.test.ts`.
 */

import type {
  KisInquireDailyPriceItem,
  KisInquirePriceOutput,
  StockDailyCandle,
  StockPrice,
} from "./types";

/**
 * 종목명 추출 — `bstp_kor_isnm` 절대 사용 안 함.
 *
 * @param output KIS inquire-price.output (또는 호환 스키마)
 * @param ticker fallback 으로 사용할 종목코드
 */
export function extractStockName(
  output: Pick<KisInquirePriceOutput, "hts_kor_isnm" | "prdt_name">,
  ticker: string,
): string {
  const hts = output.hts_kor_isnm?.trim();
  if (hts) return hts;
  const prdt = output.prdt_name?.trim();
  if (prdt) return prdt;
  return ticker;
}

/**
 * KIS prdy_vrss_sign → "up" / "down" / "flat" 매핑.
 *
 * "1" 상한 / "2" 상승 → up
 * "3" 보합 → flat
 * "4" 하한 / "5" 하락 → down
 * 그 외 → flat (안전한 fallback)
 */
function mapDirection(sign: string | undefined): "up" | "down" | "flat" {
  if (sign === "1" || sign === "2") return "up";
  if (sign === "4" || sign === "5") return "down";
  return "flat";
}

/**
 * KIS 의 숫자 문자열 → number. 빈 문자열 / NaN 은 0.
 *
 * 부호 처리: KIS 의 `prdy_vrss` 는 음수 시 "-" 포함 문자열 (예: "-500"). parseFloat 이 자연 처리.
 */
function toNumber(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * KIS inquire-price 응답 → 클라이언트 친화 `StockPrice`.
 */
export function mapStockPrice(
  output: KisInquirePriceOutput,
  ticker: string,
): StockPrice {
  return {
    ticker,
    name: extractStockName(output, ticker),
    price: toNumber(output.stck_prpr),
    change: toNumber(output.prdy_vrss),
    changePercent: toNumber(output.prdy_ctrt),
    direction: mapDirection(output.prdy_vrss_sign),
    volume: toNumber(output.acml_vol),
    open: output.stck_oprc ? toNumber(output.stck_oprc) : undefined,
    high: output.stck_hgpr ? toNumber(output.stck_hgpr) : undefined,
    low: output.stck_lwpr ? toNumber(output.stck_lwpr) : undefined,
  };
}

/**
 * YYYYMMDD → YYYY-MM-DD.
 *
 * 8자리 숫자 문자열이 아니면 그대로 통과 (디펜시브).
 */
function formatDate(stckBsopDate: string): string {
  if (/^\d{8}$/.test(stckBsopDate)) {
    return `${stckBsopDate.slice(0, 4)}-${stckBsopDate.slice(4, 6)}-${stckBsopDate.slice(6, 8)}`;
  }
  return stckBsopDate;
}

/**
 * KIS inquire-daily-price 단건 → 클라이언트 친화 `StockDailyCandle`.
 */
export function mapDailyCandle(
  item: KisInquireDailyPriceItem,
): StockDailyCandle {
  return {
    date: formatDate(item.stck_bsop_date),
    open: toNumber(item.stck_oprc),
    high: toNumber(item.stck_hgpr),
    low: toNumber(item.stck_lwpr),
    close: toNumber(item.stck_clpr),
    volume: toNumber(item.acml_vol),
  };
}
