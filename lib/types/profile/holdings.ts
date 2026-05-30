/**
 * `/profile` "내 자산" 섹션의 보유종목 전체 테이블 데이터.
 *
 * home-market-redesign PR1 — `/dashboard` 의 `Holding` 을 마이페이지 자산 섹션으로 이전(PRD §3.1).
 * 보유종목은 Top3 요약이 아닌 **전체 테이블**(종목명·평가액·수익률·비중, 정렬 가능 — AC-2).
 *
 * `assetType` 은 자산 식별 토큰(`asset-stock` / `asset-coin`)의 cascade 분기 기준.
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
