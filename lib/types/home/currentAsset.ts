/**
 * `/` (Home / AnalysisDashboard mock) 화면의 현재 선택된 자산.
 *
 * 시안 `AnalysisDashboard.tsx` 의 상단 영역 (비트코인 / 89,240,000 / +2.4%) 정합.
 * 자산 종류 (`assetType`) 는 검색 토글의 활성 분기와 동일 enum 을 공유.
 */

export type HomeAssetType = "stock" | "crypto";

export type CurrentAsset = {
  /** 자산 이름 (한글 표기 — 예: "비트코인", "삼성전자"). */
  name: string;
  /** ticker / 종목 코드 (예: "BTC", "005930"). */
  symbol: string;
  /** 자산 종류. */
  assetType: HomeAssetType;
  /** 거래 페어 표시 (예: "BTC/KRW", "005930/KRW"). */
  pair: string;
  /** 현재 가격 (KRW). */
  priceKrw: number;
  /** 등락 절대값 (KRW). */
  changeKrw: number;
  /** 등락률 (백분율). */
  changePct: number;
  /** 상승 여부 (한국식 — true = 빨강, false = 파랑). */
  isUp: boolean;
  /** 단위 표기 (예: "KRW"). */
  unit: string;
};
