/**
 * `/` (Home / AnalysisDashboard mock) 화면의 한글 라벨 카피.
 *
 * mock 데이터의 카피 키 (`labelKey` / `bodyKey` / `summaryKey`) 와 1:1 매칭.
 */

/* 검색 토글 라벨 */
export const SEARCH_TOGGLE_STOCK = "주식";
export const SEARCH_TOGGLE_CRYPTO = "코인";

/* 자산 상단 영역 */
export const ASSET_FAVORITE_ARIA = "관심종목 추가";

/* 카드 헤더 */
export const PRICE_CHART_TITLE = "가격 추이";
export const AI_ANALYSIS_TITLE = "AI 투자 분석 요약";
export const AI_VERDICT_BUY_BIAS = "매수 우위";
export const AI_VERDICT_HOLD = "관망";
export const AI_VERDICT_SELL_BIAS = "매도 우위";
export const MARKET_STATS_TITLE = "시장 정보";
export const TECHNICAL_INDICATORS_TITLE = "기술적 지표 (1일 기준)";
export const NEWS_TITLE = "실시간 관련 뉴스";
export const NEWS_VIEW_MORE = "더보기";

/* AI 시그널 카드 라벨 (mock 의 labelKey 정합) */
export const AI_SIGNAL_BULLISH = "강세 신호";
export const AI_SIGNAL_CAUTION = "주의 구간";
export const AI_SIGNAL_SUGGEST = "AI 제안";

/* AI 시그널 카드 본문 (mock 의 bodyKey 정합) */
export const AI_BODY_BULLISH =
  "RSI 65 구간 진입으로 상승 모멘텀 유지 중. 거래량 동반된 점진적 우상향.";
export const AI_BODY_CAUTION =
  "단기 급등에 따른 차익실현 매물 출회 가능성 존재. 8,700만원 지지 여부 확인 필요.";
export const AI_BODY_SUGGEST =
  "분할 매수 접근 유효. 현 비중 유지하며 9,000만원 안착 시 추가 매수 고려.";

/* AI 분석 요약 본문 (mock 의 summaryKey 정합) */
export const AI_SUMMARY_DEFAULT =
  "현재 비트코인은 단기 상승 채널을 유지하며 주요 저항선인 9,000만원 돌파를 시도하고 있습니다. 기관 투자자의 매수세가 지속되고 있으며, 볼린저 밴드 상단에 위치해 있어 단기 변동성이 확대될 수 있습니다.";

/* 기술적 지표 라벨 (mock 의 IndicatorLabelKey 정합) */
export const INDICATOR_LABEL_RSI = "RSI (14)";
export const INDICATOR_LABEL_MACD = "MACD (12, 26)";
export const INDICATOR_LABEL_BOLLINGER = "볼린저 밴드";

/* 기술적 지표 시그널 표시 (mock 의 IndicatorSignalKey 정합) */
export const INDICATOR_SIGNAL_OVERBOUGHT = "65.4 - 과매수 진입";
export const INDICATOR_SIGNAL_BUY = "매수 시그널";
export const INDICATOR_SIGNAL_BOLLINGER_UPPER = "상단 밴드 터치";

/* 시장 정보 라벨 (mock 의 MarketStatKey 정합) */
export const MARKET_STAT_MARKET_CAP = "시가총액";
export const MARKET_STAT_VOLUME_24H = "24시간 거래대금";
export const MARKET_STAT_CIRCULATING_SUPPLY = "유통량";
export const MARKET_STAT_HIGH_52W = "52주 최고가";
export const MARKET_STAT_LOW_52W = "52주 최저가";
export const MARKET_STAT_DOMINANCE = "시장 점유율(도미넌스)";
