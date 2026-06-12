export const COPY = {
  provider: {
    claude: "Claude",
    codex: "Codex",
    select: "AI 공급자 선택",
    current: (label: string) => `${label}로 분석`,
    changeDisabled: "분석 중에는 공급자를 바꿀 수 없어요.",
  },
  panel: {
    title: "AI 종합분석",
    stop: "중지",
    resumeFrom: (label: string) => `${label}부터`,
    restartAll: "처음부터",
    minimize: "접기",
    expand: "펼치기",
    close: "닫기",
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
    description: (provider: string) => `${provider} 에이전트로 분석을 시작할 수 있어요`,
    start: "분석 시작하기",
  },
  errorState: {
    retry: "다시 시도",
  },
};
