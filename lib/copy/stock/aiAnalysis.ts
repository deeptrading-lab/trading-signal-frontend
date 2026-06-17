import type { SentimentBand, SentimentConfidence } from "@/lib/types/stock/aiAnalysis";

export const COPY = {
  /** 종목 헤더의 AI 분석 진입 버튼 라벨. */
  trigger: "AI 종합분석",
  provider: {
    claude: "Claude",
    codex: "Codex",
  },
  /** AI 분석 진입 화면(ProviderChooser) — 설치된 로컬 CLI 기반 공급자 선택. */
  chooser: {
    title: "분석에 사용할 AI를 선택하세요",
    loading: "사용 가능한 AI를 확인하는 중...",
    // 공급자 이름만 강조 렌더하려고 이름/나머지를 분리한다(ProviderChooser).
    singleSuffix: "로 분석할 수 있어요. 시작할까요?",
    start: "분석 시작",
    noneLocal:
      "사용 가능한 AI CLI가 없어요. claude 또는 codex CLI를 설치한 뒤 다시 시도해 주세요.",
    vercel: "AI 종합분석은 로컬 환경(next dev)에서만 사용할 수 있어요.",
    // 조회 자체가 실패한 경우(네트워크/서버 오류) — "미설치"와 구분해 재시도를 유도.
    error: "사용 가능한 AI를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
    retry: "다시 시도",
    desc: {
      claude: "깊이 있는 추론으로 신중하게 분석",
      codex: "빠르고 간결하게 핵심을 분석",
    },
  },
  previousDecision: {
    title: "저장된 이전 분석",
    loading: "저장된 이전 분석을 확인하는 중...",
    meta: (updatedAt: string, provider: string) =>
      `${updatedAt} · ${provider} 분석 결과`,
    pmOnly:
      "오늘 다시 분석하면 이 결론은 포트폴리오 매니저에게만 참고 자료로 전달돼요.",
    analyze: "이전 결론 참고해 오늘 다시 분석",
    chooseProvider: "다른 AI 선택",
  },
  panel: {
    title: "AI 종합분석",
    /** 분석 중 헤더에 노출 — 현재 진행 중인 에이전트 기준 상태 한 줄. */
    runningStatus: {
      market:            "기술적 지표 분석 중",
      news:              "뉴스·공시 살펴보는 중",
      fundamentals:      "재무·실적 뜯어보는 중",
      social:            "투자 심리 살피는 중",
      bull:              "강세 논거 정리 중",
      bear:              "약세 논거 정리 중",
      research_manager:  "토론 종합하는 중",
      trader:            "매매 전략 짜는 중",
      risk_risky:        "공격적 리스크 점검 중",
      risk_neutral:      "중립적 리스크 점검 중",
      risk_safe:         "보수적 리스크 점검 중",
      portfolio_manager: "최종 결론 내리는 중",
    } as Record<string, string>,
    /** 진행 중이나 특정 에이전트가 아직 안 잡힐 때 폴백. */
    runningFallback: "분석 중",
    stop: "중지",
    resumeFrom: (label: string) => `${label}부터`,
    // restartAll 도 공급자 선택 화면으로 돌아간다(다른 AI로 다시 선택).
    restartAll: "다시 선택",
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
    trader:           ["투자 계획 검토 중...", "매매 전략 수립 중...", "진입 조건 정의 중...", "포지션 규모 계산 중..."],
    risk_risky:       ["고수익 기회 탐색 중...", "공격적 시나리오 검토 중...", "리스크-보상 계산 중...", "강세 근거 재검토 중..."],
    risk_neutral:     ["균형 리스크 평가 중...", "성장·위험 대비 분석 중...", "분산 전략 검토 중...", "중립 시나리오 수립 중..."],
    risk_safe:        ["하방 리스크 점검 중...", "손실 시나리오 평가 중...", "자산 보호 전략 검토 중...", "보수적 기준 적용 중..."],
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
    /** 확신도 산출 근거 — 무엇 기준인지 보조 설명 */
    confidenceBasis: "분석가 합의·데이터 명확성 기준",
    /** verdict 유효 기간 라벨 prefix */
    horizon: (h: "단기" | "중기" | "장기") => `유효 기간: ${h}`,
    strengths: "핵심 강점",
    risks: "핵심 리스크",
    portfolioSummary: "아래에서 전체 결과 확인 ↓",
    disclaimer:
      "본 AI 분석 결과는 투자 참고용이며, 최종 투자 결정과 책임은 투자자 본인에게 있습니다.",
    executionGuide: "매매 실행 가이드",
    /** 신규 진입자 / 기존 보유자 가이드 블록 헤더 */
    newEntryLabel: "🆕 신규 진입 시",
    holderLabel: "📊 이미 보유 중이면",
    targetLabel: "목표가",
    reentryLabel: "재진입 구간",
    stopLossLabel: "손절선",
    rrLabel: "손익비",
    targetHint: "현재가 대비",
    shortTermLabel: "단기 전망 (1~2주)",
    midTermLabel: "중기 전망 (1~3개월)",
  },
  /** SNS 분석가 카드 구조화 감성 배지 — 밴드 1차 · 점수 보조 · 신뢰도 병기(과신 방지). */
  sentiment: {
    /** 7단계 밴드 코드 → 한글 라벨. */
    bandLabel: {
      VERY_NEGATIVE:     "매우 부정적",
      NEGATIVE:          "부정적",
      SLIGHTLY_NEGATIVE: "약간 부정적",
      NEUTRAL:           "중립",
      SLIGHTLY_POSITIVE: "약간 긍정적",
      POSITIVE:          "긍정적",
      VERY_POSITIVE:     "매우 긍정적",
    } as Record<SentimentBand, string>,
    /** 신뢰도 코드 → 한글 라벨. */
    confidenceLabel: {
      low:    "낮음",
      medium: "보통",
      high:   "높음",
    } as Record<SentimentConfidence, string>,
    /** 신뢰도 prefix(예: "신뢰도 보통"). */
    confidencePrefix: "신뢰도",
    /** 점수 접미 — `7/10`. */
    scoreSuffix: "/10",
    /** 점수·신뢰도 사이 구분점. */
    separator: "·",
    /** 배지 전체에 대한 보조 설명(접근성·과신 방지). */
    caption: "커뮤니티 심리 추정",
    /** 신뢰도 '낮음'일 때 덧붙이는 약화 카피. */
    lowNote: "표본 적음 · 참고",
    /** 심리 한 줄 요약(summary) 콜아웃 라벨 — 전체보기 상단. */
    summaryLabel: "심리 한 줄 요약",
  },
  overlay: {
    back: "돌아가기",
  },
  reanalysis: {
    // confirm 은 즉시 재실행이 아니라 공급자 선택 화면으로 돌아가 다시 고르게 한다.
    prompt: "이전 분석 결과가 있습니다. 새로 분석할까요?",
    confirm: "새로 분석",
    dismiss: "유지하기",
  },
  errorState: {
    retry: "다시 시도",
  },
};
