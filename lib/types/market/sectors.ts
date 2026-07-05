/**
 * "지금 뜨는 산업"(업종 랭킹 + 구성종목) 도메인 모델 — KIS 응답 → 화면 친화 스키마.
 *
 * PRD `trending-sectors` §3-5. BFF(`/api/market/sectors`·`/api/market/sectors/[code]/constituents`)가
 * 매핑해 반환한다. 등락 방향(`FlowDirection`)은 기존 랭킹 도메인과 공유.
 */

import type { FlowDirection } from "@/lib/types/flow/top10";

/**
 * 업종 랭킹 1행 — 등락률 + breadth(N개 중 M개 상승).
 *
 * breadth(`up`/`down`/`flat`/`total`)는 상위 N 업종만 `FHPUP02100000` fan-out 으로 채운다.
 * fan-out 실패(레이트리밋·타임아웃) 시 전부 `0` 으로 남기고 UI 가 `total > 0` 일 때만 요약을 렌더한다
 * (fail-soft — 등락률은 항상 표시). NaN 방어를 위해 항상 number.
 */
export type SectorRankItem = {
  /** 업종 코드 — KIS `bstp_cls_code`(4자리). UI 미표시(코드 노출 금지), 조인·구성종목 조회 키. */
  code: string;
  /** 업종명 — KIS `hts_kor_isnm`("음식료·담배"). */
  name: string;
  /** 전일 대비율(%, 부호 포함) — KIS `bstp_nmix_prdy_ctrt`. */
  changePct: number;
  /** 등락 방향 — changePct 부호 기준. */
  direction: FlowDirection;
  /** 상승 종목수 — breadth fan-out(`ascn_issu_cnt`). 미확보 시 0. */
  up: number;
  /** 하락 종목수 — breadth fan-out(`down_issu_cnt`). 미확보 시 0. */
  down: number;
  /** 보합 종목수 — breadth fan-out(`stnr_issu_cnt`). 미확보 시 0. */
  flat: number;
  /** 총 종목수(up+down+flat). 0 이면 breadth 미확보 → UI 요약 미렌더. */
  total: number;
};

/** 업종 랭킹 응답. */
export type SectorRankingResponse = {
  sectors: SectorRankItem[];
  /** 기준 시각(ISO). */
  asOf: string;
};

/** 구성종목 1행 — 대표/급등 종목(top-30 movers). */
export type SectorConstituent = {
  /** 종목 코드(6자리) — KIS `stck_shrn_iscd`. UI 미표시, `/stock/[ticker]` 라우팅 키. */
  ticker: string;
  /** 종목명 — KIS `hts_kor_isnm`, 없으면 ticker. */
  name: string;
  /** 현재가(원) — KIS `stck_prpr`. */
  price: number;
  /** 전일 대비율(%, 부호 포함) — KIS `prdy_ctrt`. */
  changePct: number;
  /** 등락 방향 — changePct 부호 기준. */
  direction: FlowDirection;
  /**
   * 시가총액(원) — 토스 마스터 `sharesOutstanding × price`(best-effort). 미확보 시 null →
   * 시가총액 정렬 시 후순위(맨 뒤). NaN 없음.
   */
  marketCap: number | null;
};

/** 구성종목 응답. */
export type SectorConstituentsResponse = {
  /** 업종 코드(에코 — 캐시/표시 구분). */
  code: string;
  constituents: SectorConstituent[];
  /** 기준 시각(ISO). */
  asOf: string;
};

/** 구성종목 정렬 세그먼트 — 수익률(등락률) / 시가총액. */
export type SectorConstituentSort = "return" | "marketCap";

/**
 * 구성종목 스파크라인 배치 응답 — 티커별 최근 종가 시리즈(오래된→최신).
 *   행마다 개별 차트 API 를 부르는 대신 **한 번의 배치 요청**으로 전 종목을 모아 받아, 모달 차트 열이
 *   빈 네모·순차 렌더 없이 **일괄** 그려지게 한다(서버가 KIS 동시성·캐시 관리). 미확보 티커는 키 생략
 *   (fail-soft → 해당 행 스파크라인 없음). 2점 미만은 그리지 않는다.
 */
export type SectorSparklinesResponse = {
  sparklines: Record<string, number[]>;
};
