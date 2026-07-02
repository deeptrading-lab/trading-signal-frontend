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
  "AI 모의투자는 로컬 Codex 또는 Claude CLI가 있을 때만 진행돼요. CLI가 없으면 세션 생성과 재판단을 실행하지 않습니다.";
export const PAPER_TRADING_LIVE_PRICE_NOTICE =
  "체결 기준 가격은 KIS 실제 현재가를 사용하며, 국내주식은 1주 단위로만 가상 체결돼요.";
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
export const PAPER_TRADING_PROVIDER_MOCK = "MVP 판단 · AI CLI 필요";
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

/* 세션 상세(전체 화면) 재디자인 — intraday-paper-watch. */
export const PAPER_TRADING_BACK_TO_WATCH = "단타 워치로";
export const PAPER_TRADING_METRIC_REALIZED = "실현손익 합";
export const PAPER_TRADING_METRIC_COSTS = "비용 누계";
export const PAPER_TRADING_ORDERS_TITLE = "체결 내역";
export const PAPER_TRADING_ORDERS_EMPTY = "아직 체결이 없어요.";
export const PAPER_TRADING_ORDER_BUY = "매수";
export const PAPER_TRADING_ORDER_SELL = "매도";
export const PAPER_TRADING_ORDER_COLS = {
  time: "시각",
  side: "구분",
  qty: "수량",
  price: "체결가",
  notional: "금액",
  cost: "비용",
  pnl: "실현손익",
  note: "판단 메모",
} as const;
export const PAPER_TRADING_ANALYST_PREFIX = "흐름 진단";
export const PAPER_TRADING_GATE_PREFIX = "룰 조정";
/** cli-agent 세션 — 수동 재판단 대신 자동 주기 안내. */
export const PAPER_TRADING_AUTO_TICK_NOTE = "단타 워치 화면이 열려 있는 동안 자동으로 판단해요.";

export const PAPER_TRADING_TABLE_TICKER = "종목";
export const PAPER_TRADING_TABLE_QUANTITY = "수량";
export const PAPER_TRADING_TABLE_AVG = "평균가";
export const PAPER_TRADING_TABLE_PRICE = "현재가";
export const PAPER_TRADING_TABLE_VALUE = "평가금액";
export const PAPER_TRADING_TABLE_PNL = "손익";
export const PAPER_TRADING_TABLE_ALLOC = "실제 체결 비중";
