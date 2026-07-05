/**
 * 거래량 순위 도메인 모델 — KIS `volume-rank`(`FHPST01710000`) output → 화면 친화 스키마.
 *
 * 단타워치 후보 추천용(수급 Top10 과 병렬 노출). BFF(`/api/market/volume-rank`)가 매핑해 반환한다.
 */

import type { FlowDirection } from "@/lib/types/flow/top10";

/**
 * 정렬 기준 — 거래량순(기본) / 거래대금순.
 *   - `volume` → KIS `FID_BLNG_CLS_CODE=0`(평균거래량), 지표 = `acml_vol`.
 *   - `value`  → KIS `FID_BLNG_CLS_CODE=3`(거래금액순), 지표 = `acml_tr_pbmn`.
 */
export type VolumeRankBy = "volume" | "value";

/** 거래량 순위 1행. */
export type VolumeRankRow = {
  /** 종목 코드(6자리). */
  ticker: string;
  /** 종목명 — KIS `hts_kor_isnm`, 없으면 ticker. */
  name: string;
  /** 현재가(원). */
  price: number;
  /** 전일 대비율(%, 부호 포함). */
  changePercent: number;
  /** 등락 방향 — changePercent 부호 기준. */
  direction: FlowDirection;
  /** 누적 거래량(주). */
  volume: number;
  /**
   * 누적 거래대금 — KIS `acml_tr_pbmn` 원값 그대로(단위 환산은 프론트 포맷터 책임).
   * 거래대금순(`by=value`) 응답에서 채워진다. 거래량순에서도 응답에 있으면 함께 매핑.
   * enrich 통과 시 `number | null`(랭킹 TR 값 우선, `marketCap` 과 동일 fail-soft 계약).
   */
  tradingValue?: number | null;
  /**
   * 시가총액(원) — 토스 마스터 `sharesOutstanding × price`(서버 best-effort enrich, PRD `ranking-columns`).
   * 토스 미설정·실패·예산초과 시 null(fail-soft → UI "-"). NaN 없음.
   */
  marketCap?: number | null;
  /**
   * 업종명 — KIS `inquire-price`(`bstp_kor_isnm`, `loadKisPriceMeta`) 서버 best-effort enrich.
   * 미조회·실패 시 미설정(graceful omit → UI 빈칸). 업종코드 미노출.
   */
  sector?: string;
};

/** 거래량 순위 응답. */
export type VolumeRankResponse = {
  rows: VolumeRankRow[];
  /** 기준 시각(ISO). */
  asOf: string;
};
