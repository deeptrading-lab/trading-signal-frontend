import type {
  PaperTradingDecisionAction,
  PaperTradingSessionStatus,
} from "@/lib/types/paperTrading/paperTrading";

export const PAPER_TRADING_PAGE_TITLE = "AI 모의투자";
export const PAPER_TRADING_PAGE_SUBTITLE =
  "가상 투자금으로 AI 판단 흐름을 검증해요. 실제 주문은 연결하지 않아요.";
export const PAPER_TRADING_DETAIL_TITLE = "모의투자 세션";
export const PAPER_TRADING_CREATE_TITLE = "새 모의투자";
export const PAPER_TRADING_CREATE_BUTTON = "세션 시작";
export const PAPER_TRADING_CREATING = "세션 생성 중";
export const PAPER_TRADING_REFRESH = "새로고침";
export const PAPER_TRADING_EMPTY_TITLE = "아직 모의투자 세션이 없어요";
export const PAPER_TRADING_EMPTY_BODY = "종목과 시작 투자금을 입력해 첫 가상 판단을 만들어 보세요.";
export const PAPER_TRADING_ERROR = "모의투자 정보를 불러오지 못했어요.";
export const PAPER_TRADING_RETRY = "다시 시도";
export const PAPER_TRADING_RUN_TICK = "지금 재판단";
export const PAPER_TRADING_RUNNING_TICK = "재판단 중";
export const PAPER_TRADING_PAUSE = "일시정지";
export const PAPER_TRADING_RESUME = "재개";
export const PAPER_TRADING_COMPLETE = "완료 처리";
export const PAPER_TRADING_MOCK_NOTICE =
  "MVP-A는 mock 판단과 in-memory 저장소로 동작해요. Supabase와 CLI 에이전트 연결은 후속 단계입니다.";
export const PAPER_TRADING_REAL_ACTION_NOTICE =
  "이 화면은 가상 체결 기록입니다. 실제 매매는 별도 증권 앱에서 직접 판단해 주세요.";

export const PAPER_TRADING_FIELD_NAME = "세션 이름";
export const PAPER_TRADING_FIELD_STOCK_SEARCH = "투자할 종목";
export const PAPER_TRADING_STOCK_SEARCH_PLACEHOLDER = "종목명으로 검색… 예: 삼성전자";
export const PAPER_TRADING_STOCK_SEARCH_EMPTY = "검색 결과가 없어요.";
export const PAPER_TRADING_SELECTED_STOCKS = "선택한 종목";
export const PAPER_TRADING_REMOVE_STOCK = "종목 제거";
export const PAPER_TRADING_FIELD_CASH = "시작 투자금";
export const PAPER_TRADING_FIELD_TARGET_RETURN = "목표 수익률";
export const PAPER_TRADING_FIELD_RISK = "위험 모드";
export const PAPER_TRADING_FIELD_PROVIDER = "판단 방식";

export const PAPER_TRADING_RISK_CONSERVATIVE = "보수";
export const PAPER_TRADING_RISK_BALANCED = "균형";
export const PAPER_TRADING_RISK_AGGRESSIVE = "공격";
export const PAPER_TRADING_PROVIDER_MOCK = "Mock 판단";
export const PAPER_TRADING_PROVIDER_DISABLED = "후속 예정";

export const PAPER_TRADING_METRIC_INITIAL = "시작 투자금";
export const PAPER_TRADING_METRIC_VALUE = "현재 평가금액";
export const PAPER_TRADING_METRIC_RETURN = "누적 수익률";
export const PAPER_TRADING_METRIC_TARGET = "목표 수익률";
export const PAPER_TRADING_METRIC_PROGRESS = "목표 달성률";
export const PAPER_TRADING_METRIC_CASH = "가상 현금";
export const PAPER_TRADING_EQUITY_TITLE = "자산 곡선";
export const PAPER_TRADING_DECISION_TITLE = "최신 AI 판단";
export const PAPER_TRADING_POSITIONS_TITLE = "가상 포지션";
export const PAPER_TRADING_TIMELINE_TITLE = "판단 타임라인";
export const PAPER_TRADING_NO_POSITION = "보유 중인 가상 포지션이 없어요.";
export const PAPER_TRADING_NO_DECISION = "아직 판단 기록이 없어요.";

export const ACTION_LABEL: Record<PaperTradingDecisionAction, string> = {
  BUY: "가상 매수",
  SELL: "가상 매도",
  HOLD: "유지",
  INCREASE: "비중 확대",
  REDUCE: "비중 축소",
  EXIT: "전량 정리",
};

export const STATUS_LABEL: Record<PaperTradingSessionStatus, string> = {
  running: "실행 중",
  paused: "일시정지",
  completed: "완료",
  failed: "실패",
};

export const PAPER_TRADING_TABLE_TICKER = "종목";
export const PAPER_TRADING_TABLE_QUANTITY = "수량";
export const PAPER_TRADING_TABLE_AVG = "평균가";
export const PAPER_TRADING_TABLE_PRICE = "현재가";
export const PAPER_TRADING_TABLE_VALUE = "평가금액";
export const PAPER_TRADING_TABLE_PNL = "손익";
export const PAPER_TRADING_TABLE_ALLOC = "비중";
