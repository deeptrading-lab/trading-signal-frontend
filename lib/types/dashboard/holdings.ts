/**
 * `/dashboard` 의 보유 자산 Top N 카드 데이터.
 *
 * `assetType` 은 시안의 `type: 'stock' | 'crypto'` 정합 — 자산 식별 토큰
 * (`asset-stock` / `asset-coin`) 의 cascade 분기 기준.
 */

export type HoldingAssetType = "stock" | "crypto";

export type Holding = {
  /** 자산 이름 (한글 표기 — 예: "삼성전자", "비트코인"). */
  name: string;
  /** ticker / 종목 코드 (예: "005930", "BTC", "AAPL"). */
  symbol: string;
  /** 자산 종류 — 시각 분기 (주식 = blue, 코인 = orange). */
  assetType: HoldingAssetType;
  /** 평가 금액 (KRW). */
  amountKrw: number;
  /** 등락률 (백분율). */
  changePct: number;
  /** 상승 여부 (한국식 — true = 빨강, false = 파랑). */
  isUp: boolean;
};
