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
  KisInquireIndexPriceOutput,
  KisInquirePriceOutput,
  KisIntstockMultpriceItem,
  KisSearchStockInfoOutput,
  MarketIndexQuote,
  StockDailyCandle,
  StockInfo,
  StockMarket,
  StockPrice,
  WatchlistQuote,
} from "./types";
import { INDEX_NAME_BY_CODE } from "./types";

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
export function mapDirection(
  sign: string | undefined,
): "up" | "down" | "flat" {
  if (sign === "1" || sign === "2") return "up";
  if (sign === "4" || sign === "5") return "down";
  return "flat";
}

/**
 * KIS 의 숫자 문자열 → number. 빈 문자열 / NaN 은 0.
 *
 * 부호 처리: KIS 의 `prdy_vrss` 는 음수 시 "-" 포함 문자열 (예: "-500"). parseFloat 이 자연 처리.
 */
export function toNumber(value: string | undefined): number {
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
    // ⚠️ 업종명(섹터) — 종목명 아님. extractStockName 과 혼동 금지. 기업개황 업종 라벨 보강용.
    sector: output.bstp_kor_isnm?.trim() || undefined,
  };
}

/**
 * `search-stock-info.output` → 시장 배지 매핑.
 *
 * 1차 `mket_id_cd`(STK유가/KSQ코스닥/KNX코넥스/ETF) → 없거나 미매핑 시 2차 `excg_dvsn_cd`(02코스피/03코스닥).
 * 둘 다 못 맞추면 "기타" graceful degrade.
 */
function mapMarket(
  mketIdCd: string | undefined,
  excgDvsnCd: string | undefined,
): StockMarket {
  const mket = mketIdCd?.trim().toUpperCase();
  if (mket === "STK") return "KOSPI";
  if (mket === "KSQ") return "KOSDAQ";
  if (mket === "KNX") return "KONEX";
  if (mket === "ETF") return "ETF";

  const excg = excgDvsnCd?.trim();
  if (excg === "02") return "KOSPI";
  if (excg === "03") return "KOSDAQ";

  return "기타";
}

/**
 * KIS search-stock-info 응답 → 클라이언트 친화 `StockInfo`.
 *
 * ⚠️ 종목명 1차 소스 = `prdt_abrv_name`("삼성전자"). 빈 값이면 `prdt_name` → ticker.
 * `inquire-price` 의 `hts_kor_isnm`/`bstp_kor_isnm`/`extractStockName` 은 사용하지 않는다.
 */
export function mapStockInfo(
  output: KisSearchStockInfoOutput,
  ticker: string,
): StockInfo {
  const abrv = output.prdt_abrv_name?.trim();
  const full = output.prdt_name?.trim();
  const name = abrv || full || ticker;

  return {
    ticker,
    name,
    market: mapMarket(output.mket_id_cd, output.excg_dvsn_cd),
    isTradeStopped: output.tr_stop_yn?.trim() === "Y",
    isAdminItem: output.admn_item_yn?.trim() === "Y",
    isKospi200: output.kospi200_item_yn?.trim() === "Y",
    industryName: output.std_idst_clsf_cd_name?.trim() || undefined,
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
 * KIS inquire-index-price 응답 → 클라이언트 친화 `MarketIndexQuote`.
 *
 * ⚠️ 지수명은 응답에 없으므로 `INDEX_NAME_BY_CODE` 상수로만 부여 — 종목명 API 미사용.
 * 상수에 없는 코드는 graceful degrade 로 code 그대로 name 에 사용.
 */
export function mapIndexPrice(
  output: KisInquireIndexPriceOutput,
  code: string,
): MarketIndexQuote {
  return {
    code,
    name: INDEX_NAME_BY_CODE[code] ?? code,
    value: toNumber(output.bstp_nmix_prpr),
    change: toNumber(output.bstp_nmix_prdy_vrss),
    changePercent: toNumber(output.bstp_nmix_prdy_ctrt),
    direction: mapDirection(output.prdy_vrss_sign),
    volume: toNumber(output.acml_vol),
    tradeAmount: output.acml_tr_pbmn
      ? toNumber(output.acml_tr_pbmn)
      : undefined,
    advances: output.ascn_issu_cnt ? toNumber(output.ascn_issu_cnt) : undefined,
    declines: output.down_issu_cnt ? toNumber(output.down_issu_cnt) : undefined,
    unchanged: output.stnr_issu_cnt
      ? toNumber(output.stnr_issu_cnt)
      : undefined,
    open: output.bstp_nmix_oprc ? toNumber(output.bstp_nmix_oprc) : undefined,
    high: output.bstp_nmix_hgpr ? toNumber(output.bstp_nmix_hgpr) : undefined,
    low: output.bstp_nmix_lwpr ? toNumber(output.bstp_nmix_lwpr) : undefined,
    yearHigh: output.dryy_bstp_nmix_hgpr
      ? toNumber(output.dryy_bstp_nmix_hgpr)
      : undefined,
    yearLow: output.dryy_bstp_nmix_lwpr
      ? toNumber(output.dryy_bstp_nmix_lwpr)
      : undefined,
  };
}

/**
 * KIS intstock-multprice 응답 종목 1건 → 정규 `WatchlistQuote`.
 *
 * PRD `watchlist-batch-quotes` §3.1 / AC-5.
 *
 * - 등락 부호(`prdy_vrss_sign`) → `mapDirection` 재사용, 모든 숫자 문자열 → `toNumber` 재사용.
 * - ⚠️ `name` 은 본 응답에서 신뢰값이 오지 않으므로 매퍼가 종목명을 채우지 않는다 — 인자 `ticker` 를
 *   임시 식별값으로만 두고, 실제 종목명 폴백(시드 → ticker)은 BFF 가, 최종 표시명은 클라 store 가 결정.
 * - ⚠️ `inter_kor_isnm`(관심 종목명)·`bstp_kor_isnm`(업종명)을 `name` 에 절대 대입하지 않는다(AC-5).
 *
 * @param item KIS intstock-multprice.output 종목 1건.
 * @param ticker BFF 가 좌조인에 쓰는 입력 ticker(6자리). 응답 `inter_shrn_iscd` 와 동일해야 함.
 */
export function mapIntstockMultprice(
  item: KisIntstockMultpriceItem,
  ticker: string,
): WatchlistQuote {
  return {
    ticker,
    name: ticker, // 식별 임시값. BFF 가 시드 fallback, 클라가 store name 으로 덮음.
    price: toNumber(item.inter2_prpr),
    change: toNumber(item.inter2_prdy_vrss),
    changePercent: toNumber(item.prdy_ctrt),
    direction: mapDirection(item.prdy_vrss_sign),
    volume: toNumber(item.acml_vol),
    open: item.inter2_oprc ? toNumber(item.inter2_oprc) : undefined,
    high: item.inter2_hgpr ? toNumber(item.inter2_hgpr) : undefined,
    low: item.inter2_lwpr ? toNumber(item.inter2_lwpr) : undefined,
  };
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
