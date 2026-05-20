/**
 * 화이트리스트 단일 종목 메타데이터.
 *
 * BE `GET /api/whitelist/search` 응답 `results[]` 의 단일 요소 스키마.
 * 후속 PRD 가 종목 자동완성 UI 에 사용한다.
 *
 * BE 가 새로운 메타 필드를 추가해도 화면이 깨지지 않도록 부가 필드는 옵셔널로 둔다.
 */
export type WhitelistItem = {
  ticker: string;
  name: string;
  asset_type: string;
  exchange: string;
  currency: string;
  sector: string;
  risk_tier: string;
  aliases: string[];
  enabled?: boolean;
  notes?: string;
};

/**
 * BE `GET /api/whitelist/search` 응답 envelope.
 */
export type WhitelistSearchResponse = {
  results: WhitelistItem[];
};
