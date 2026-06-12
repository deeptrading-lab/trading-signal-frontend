export const COPY = {
  panel: {
    title: "AI 종합분석",
    stop: "중지",
    resumeFrom: (label: string) => `${label}부터`,
    restartAll: "처음부터",
    minimize: "접기",
    expand: "펼치기",
    close: "닫기",
  },
  progress: {
    market:           ["기술적 지표 산출 중...", "차트 패턴 분석 중...", "추세 강도 계산 중...", "매매 시그널 확인 중..."],
    news:             ["최신 뉴스 수집 중...", "공시 데이터 검색 중...", "시장 동향 파악 중...", "뉴스 영향 분석 중..."],
    fundamentals:     ["재무제표 분석 중...", "실적 데이터 조회 중...", "밸류에이션 계산 중...", "기업 가치 평가 중..."],
    social:           ["Reddit 커뮤니티 검색 중...", "투자자 심리 분석 중...", "SNS 반응 수집 중...", "시장 감성 평가 중..."],
    bull:             ["매수 논거 수집 중...", "강세 시나리오 구성 중...", "상방 근거 정리 중...", "반박 논리 검토 중..."],
    bear:             ["약세 논거 도출 중...", "리스크 요인 분석 중...", "하방 시나리오 평가 중...", "손실 시나리오 검토 중..."],
    research_manager: ["토론 결과 종합 중...", "핵심 논점 정리 중...", "투자 계획 수립 중..."],
    risk:             ["리스크 시나리오 평가 중...", "하방 리스크 계산 중...", "손실 한도 산정 중..."],
    portfolio_manager:["최적 비중 계산 중...", "투자 결론 도출 중...", "최종 판단 내리는 중..."],
  },
  card: {
    analyzing: "분석 중...",
    error: "분석 중 오류가 발생했어요.",
    retry: "재시도",
    viewFull: "전체 보기",
    resumeTitle: (label: string) => `${label}부터 재개`,
  },
  debate: {
    title: "강세 vs 약세 토론",
    roundCounter: (current: number, total: number) => `${current}/${total} 라운드`,
    roundMarker: (n: number) => `${n}라운드`,
    bullColumn: "🐂 강세 연구원",
    bearColumn: "🐻 약세 연구원",
    bullWriting: "논거 작성 중...",
    bearWriting: "반론 작성 중...",
    detailTitle: (side: "bull" | "bear", round: number) =>
      `${side === "bull" ? "강세" : "약세"} 연구원 — ${round}라운드`,
  },
  verdict: {
    badge: "최종 결정",
    confidence: (level: "HIGH" | "MEDIUM" | "LOW") =>
      `확신도: ${level === "HIGH" ? "높음" : level === "MEDIUM" ? "보통" : "낮음"}`,
    strengths: "핵심 강점",
    risks: "핵심 리스크",
    portfolioSummary: "아래에서 전체 결과 확인 ↓",
    disclaimer:
      "본 AI 분석 결과는 투자 참고용이며, 최종 투자 결정과 책임은 투자자 본인에게 있습니다.",
    executionGuide: "매매 실행 가이드",
    targetLabel: "목표가",
    reentryLabel: "재진입 구간",
    stopLossLabel: "손절선",
    rrLabel: "손익비",
    shortTermLabel: "단기 전망 (1~2주)",
    midTermLabel: "중기 전망 (1~3개월)",
  },
  overlay: {
    back: "돌아가기",
  },
  reanalysis: {
    prompt: "이전 분석 결과가 있습니다. AI로 재분석할까요?",
    confirm: "재분석하기",
    dismiss: "유지하기",
  },
  empty: {
    title: "AI 에이전트들이 대기 중입니다",
    description: "버튼을 눌러 분석을 시작하세요",
    start: "분석 시작하기",
  },
  errorState: {
    retry: "다시 시도",
  },
};
