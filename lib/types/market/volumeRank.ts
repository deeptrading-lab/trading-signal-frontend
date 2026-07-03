/**
 * 거래량 순위 도메인 모델 — KIS `volume-rank`(`FHPST01710000`) output → 화면 친화 스키마.
 *
 * 단타워치 후보 추천용(수급 Top10 과 병렬 노출). BFF(`/api/market/volume-rank`)가 매핑해 반환한다.
 */

import type { FlowDirection } from "@/lib/types/flow/top10";

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
};

/** 거래량 순위 응답. */
export type VolumeRankResponse = {
  rows: VolumeRankRow[];
  /** 기준 시각(ISO). */
  asOf: string;
};
