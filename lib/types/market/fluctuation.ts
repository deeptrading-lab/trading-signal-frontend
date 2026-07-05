/**
 * 등락률 순위(급상승/급하락) 도메인 모델 — KIS `fluctuation`(`FHPST01700000`) output → 화면 친화 스키마.
 *
 * 홈 리스킨 "실시간 랭킹" 탭(급상승/급하락)용. BFF(`/api/market/fluctuation`)가 매핑해 반환한다.
 * 거래량 순위(`VolumeRankRow`)와 동일 골격에서 `volume` 만 뺀 형태 — 등락률 랭킹은 등락률이 본체.
 */

import type { FlowDirection } from "@/lib/types/flow/top10";

/** 등락률 순위 정렬 방향 — 급상승(상승율순) / 급하락(하락율순). */
export type FluctuationDirection = "up" | "down";

/** 등락률 순위 1행. */
export type FluctuationRow = {
  /** 종목 코드(6자리) — KIS `stck_shrn_iscd`. */
  ticker: string;
  /** 종목명 — KIS `hts_kor_isnm`, 없으면 ticker. */
  name: string;
  /** 현재가(원). */
  price: number;
  /** 전일 대비율(%, 부호 포함) — KIS `prdy_ctrt`. */
  changePercent: number;
  /** 등락 방향 — changePercent 부호 기준(급상승=up / 급하락=down). */
  direction: FlowDirection;
  /**
   * 누적 거래대금(원) — 급상승/급하락 랭킹 TR 은 거래대금을 안 주므로 KIS `inquire-price`
   * (`loadKisPriceMeta`) 서버 best-effort enrich 로 채운다(거래대금 값 컬럼용, 4탭 통일).
   * 미조회·실패·예산초과 시 null(fail-soft → UI "-").
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

/** 등락률 순위 응답. */
export type FluctuationResponse = {
  rows: FluctuationRow[];
  /** 요청한 정렬 방향 — 응답 에코(캐시/표시 구분용). */
  direction: FluctuationDirection;
  /** 기준 시각(ISO). */
  asOf: string;
};
