export const INTRADAY_AUTO_PORTFOLIO_COPY = {
  title: "AI 자동 단타",
  description: "금액만 정하면 수급·거래량 상위 종목을 조합해 오늘의 모의 포트폴리오를 운용해요.",
  cashLabel: "투자금",
  cashAria: "자동 단타 투자금",
  start: "자동 모의매매 시작",
  starting: "종목별 AI 첫 판단 중…",
  rule: "상위 후보 중 3~5종목을 자동 선정하고 10%는 현금으로 남겨요. 5분마다 AI가 판단하며 15:40에 자동 종료돼요.",
  startError: "자동 모의매매를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.",
  metrics: {
    stocks: "운용 종목",
    running: (count: number) => `${count}개 자동 운용 중`,
    initial: "시작 투자금",
    value: "현재 평가금",
    return: "포트폴리오 수익률",
  },
} as const;
