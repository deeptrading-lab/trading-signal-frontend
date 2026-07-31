import type { AgentFailReason, SentimentBand, SentimentConfidence } from "@/lib/types/stock/aiAnalysis";
import type { StaleReason } from "@/lib/stock/decisionStaleness";
import type { AiLevelRole } from "@/lib/utils/aiVerdictLevels";

/**
 * AI 판정 레벨의 역할 → 화면 라벨. **차트 축 알약·판정 스트립·패널이 모두 이걸 쓴다**
 * (전에는 세 곳에 같은 매핑이 하드코딩돼 있어 문구가 갈라질 수 있었다).
 *
 * `invalidation` = 약세 판정에서 현재가 **위**에 그리는 선. 여기까지 오르면 약세로 본 근거가
 * 깨진 것이므로 판단을 다시 봐야 한다는 뜻이라 **"재검토"** 로 표기한다.
 * (내부 role 명은 도메인 개념어 `invalidation` 을 유지하고, 사람이 읽는 말만 여기서 정한다.)
 */
export const AI_LEVEL_ROLE_LABEL = {
  target: "목표",
  reentry: "재진입",
  stop: "손절",
  invalidation: "재검토",
} as const satisfies Record<AiLevelRole, string>;

/** 저장 분석 재분석 권유 사유 → 한글 문구(앰버 배너). decisionStaleness 의 StaleReason 과 1:1. */
const SAVED_STALE_REASON: Record<StaleReason, string> = {
  "stop-near": "손절가 부근이에요",
  "invalidation-near": "재검토 가격 부근이에요",
  "target-near": "목표가에 근접했어요",
  "big-move": "분석 시점보다 가격이 크게 움직였어요",
  aged: "분석한 지 시간이 지났어요",
};

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
  /**
   * 저장모드(우측 패널 verdict-forward) — ai-analysis-redesign PR③.
   * 저장된 결론을 그대로 보여주고, staleness(decisionStaleness) 에 따라 재분석을 권한다.
   * ⚠️ 일반 사용자 뷰엔 provider/model 명을 쓰지 않는다("AI 분석"으로 총칭). **관리자에게만** 실제
   *    분석 엔진/모델을 하단 캡션(adminEngine)으로 노출한다(user-login-auth Phase 2 — useMe().isAdmin).
   */
  savedMode: {
    /** 재분석 권유 사유 라벨(배너 내부용·접근성). */
    staleReason: SAVED_STALE_REASON,
    /**
     * 상단 앰버 배너 본문 — 라이브 현재가(있으면) + 사유 + 재분석 권유.
     * aged(오래됨)는 경과 시각(relative: "N시간 전"·"N일 전"·"YYYY.MM.DD")을 넣어 "언제 분석했는지"를 보여준다.
     */
    staleBanner: (reason: StaleReason, price: string | null, relative?: string): string => {
      const reasonText =
        reason === "aged" && relative ? `${relative} 분석이에요` : SAVED_STALE_REASON[reason];
      return `${price ? `현재가 ${price} · ` : ""}${reasonText} — 지금 기준으로 다시 분석해 보세요.`;
    },
    /** 앰버 배너 CTA. */
    staleCta: "지금 기준 재분석",
    /** 앰버 배너 접근성 라벨(role=status). */
    staleAria: "저장된 분석 재분석 권장",
    /** 유효(신선) 하단 재분석 행 — 노스스타 `.sf-info`("최근 분석 방금 · 가격 유효 범위 · AI 분석") 정합. */
    validFooter: (relative: string): string => `최근 분석 ${relative} · 가격 유효 범위 · AI 분석`,
    /** 하단 재분석 버튼. */
    reanalyze: "재분석",
    /** 저장모드 스크림 라벨(이전 분석임을 알리는 미니 태그) — stale 일 때 히어로 위. */
    previousTag: "이전 분석 기준",
    /**
     * 관리자 전용 — 분석 엔진/모델 표기(user-login-auth Phase 2). 모델(claude-sonnet-5 등)이 있으면
     * 모델을, 없으면(legacy·env 미설정) provider(claude/codex)를 총칭한다. 일반 사용자에겐 미노출.
     */
    adminEngine: (provider: string, model: string | null | undefined): string =>
      `분석 엔진 · ${model || provider}`,
  },
  previousDecision: {
    title: "저장된 이전 분석",
    loading: "저장된 이전 분석을 확인하는 중...",
    meta: (updatedAt: string, provider: string) =>
      `${updatedAt} · ${provider} 분석 결과`,
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
    /** 우측 재열기 탭 — 종목별 패널 열기 aria. */
    reopen: (name: string) => `${name} AI 분석 패널 열기`,
    /** 재열기 탭 닫기(완료 슬롯 제거) aria. */
    dismissTab: (name: string) => `${name} 분석 닫기`,
    /** 재열기 핀 브랜드 라벨(세 줄 스택). */
    reopenBrand: ["AI", "종합", "분석"],
    /** 재열기 핀 aria — 대기/진행 건수 주입. */
    reopenPin: (count: number) => `AI 분석 ${count}건 열기`,
    /** 트레이더 카드 위 '심층 추론' 배지. */
    deepReasoning: "🧠 심층 추론",
  },
  /**
   * 4-페이즈 타임라인(분석가 → 토론 → 종합 → 최종 판정) 라벨·상태·접근성 카피.
   * 회색 12-칩 스트립을 대체하는 페이즈 노드/행이 소비한다.
   */
  phase: {
    /** 페이즈 헤딩 라벨. verdict = "최종 판정"(PM/매니저 표기 미노출). */
    label: {
      analysts: "분석가",
      debate: "강세 vs 약세 토론",
      synthesis: "종합",
      verdict: "최종 판정",
    } as Record<"analysts" | "debate" | "synthesis" | "verdict", string>,
    /** 페이즈 보조 설명(접힘 요약 좌측). */
    desc: {
      analysts: "시장·뉴스·재무·심리",
      debate: "강세·약세 논거 공방",
      synthesis: "리서치·트레이더·리스크",
      verdict: "종합 결론 도출",
    } as Record<"analysts" | "debate" | "synthesis" | "verdict", string>,
    /** 상태 텍스트(요약·접근성). */
    status: {
      pending: "대기",
      running: "진행 중",
      done: "완료",
      error: "오류",
    } as Record<"pending" | "running" | "done" | "error", string>,
    /** 상태 노드 aria-label — "분석가 진행 중" 등. */
    nodeAria: (label: string, statusText: string) => `${label} ${statusText}`,
    /** 페이즈 내 완료 카운터 — "3/4". */
    progress: (done: number, total: number) => `${done}/${total}`,
    /** 펼침 토글 aria(aria-expanded 와 병기). */
    toggleExpand: (label: string) => `${label} 상세 펼치기`,
    toggleCollapse: (label: string) => `${label} 상세 접기`,
    /** 오류 페이즈 재개 버튼 라벨. */
    resume: "여기서부터 다시",
    /**
     * 진행중(running) 뷰 스트리밍 카피. 분석가·토론·종합은 각 행/버블/카드가 라이브 토큰을 인라인으로
     * 직접 흘리므로(per-element) 별도 라벨이 없고, 최종 판정(PM 단일)만 박스형 stream-box `.sbx-who`
     * 헤더에 이 `writing` 라벨을 쓴다. done 뷰는 phaseDone 카피(PHASE 1 미변경).
     */
    stream: {
      /** stream-box 헤더(`.sbx-who`) — "{에이전트} · 작성 중". */
      writing: (label: string) => `${label} · 작성 중`,
    },
  },
  /**
   * 완료(done) 뷰 전용 — 노스스타 flat 행/컴팩트 카드의 라벨·태그·힌트.
   * 진행(running) 뷰는 phase.stream 스트리밍 카피를 쓴다(PHASE 2 노스스타 stream 모델).
   */
  phaseDone: {
    /** 분석가 flat 행 — 짧은 도메인 라벨(약 66px 라벨열). 전문 오버레이 제목엔 AGENT_META 풀 라벨 사용. */
    analystLabel: {
      market: "기술적",
      news: "뉴스",
      fundamentals: "기본적",
      social: "SNS",
    } as Record<"market" | "news" | "fundamentals" | "social", string>,
    /** 4행 아래 힌트 — 감정 칩 옆 "눌러서 전문 펼침" 안내. */
    rowHint: "각 항목을 누르면 리포트 전문을 볼 수 있어요",
    /** 종합 flat 행 — 짧은 역할 라벨(약 82px 라벨열). */
    synLabel: {
      research_manager: "리서치매니저",
      trader: "트레이더",
    } as Record<"research_manager" | "trader", string>,
    /** 리스크 3카드 — 짧은 역할 라벨(공격/중립/보수). */
    riskLabel: {
      risk_risky: "공격적",
      risk_neutral: "중립적",
      risk_safe: "보수적",
    } as Record<"risk_risky" | "risk_neutral" | "risk_safe", string>,
    /**
     * 리스크 역할별 특성 스탠스 태그 — 각 검토관의 **고정 렌즈**(공격=기회 옹호 / 중립=균형 / 보수=하방 집중)를
     * 나타낸다. TradingAgents 구조상 세 리스크 검토관은 종목과 무관하게 스탠스가 고정돼 있어, 이 태그는
     * '해당 관점의 성향'이지 이 종목의 최종 판정이 아니다(최종 판정은 히어로·판정 페이즈가 담당). 실제 결론은 카드를 눌러 확인.
     */
    riskTag: {
      risk_risky: "매수",
      risk_neutral: "조건부",
      risk_safe: "주의",
    } as Record<"risk_risky" | "risk_neutral" | "risk_safe", string>,
    /** done 이지만 리포트 본문이 비었을 때 폴백 미리보기. */
    emptyPreview: "요약을 불러오지 못했어요",
  },
  /**
   * verdict-forward 히어로(T4 항시-글랜스) — 스트리밍 중 도출-대기 + 완료 시 판정 글랜스.
   * 스트리밍 중엔 가격 기반 결정론 시그널을 채워 12분 대기 동안 빈 화면을 막는다.
   */
  hero: {
    /** 스트리밍/대기 중 헤딩. */
    pendingTitle: "판정 대기 중",
    /** 대기 부제 — AI가 종합 판정을 준비 중. */
    pendingCaption: "AI가 종합 판정을 준비하고 있어요",
    /** 전체 진행 카운터 — "7/12 에이전트". */
    progress: (done: number, total: number) => `${done}/${total} 에이전트`,
    /** 대기 중 채우는 결정론 시그널 설명(오해 방지 — AI 판정과 구분). */
    signalNote: "가격 기반 기술 시그널 · 최종 판정은 분석 완료 후 표시",
    /** 시그널 미산출(데이터 부족·로딩) 시 대기 보조 문구. */
    signalUnavailable: "분석이 끝나면 종합 판정을 여기에 보여드려요",
    /** 완료 히어로 v-meta 라벨 — 예상 기간. */
    metaPeriod: "기간",
    /** 완료 히어로 v-meta 라벨 — 라이브 현재가(live 모드). */
    metaLivePrice: "현재가",
    /** 완료 히어로 v-meta 라벨 — 분석 시점가(saved 모드, base_price). */
    metaBasePrice: "분석 시점가",
    /** 라이브 완료 히어로 v-meta 힌트 — 근거·전략은 아래 최종 판정 페이즈에서. */
    detailHint: "근거·전략은 아래 최종 판정에서",
    /** 저장모드(과거) 히어로 배지 — 이전 분석임을 알리는 미니 태그. */
    previousTag: "이전 분석",
  },
  /** 동시 분석 상한(최대 3개) 안내. */
  limit: {
    atCapacity: (max: number) =>
      `동시 분석은 최대 ${max}개까지예요. 진행 중인 분석이 끝나면 다시 시도해 주세요.`,
  },
  /**
   * 액션 피드백 토스트 — 분석 완료/실패. 종목명(name)을 알면 이름으로 표기(코드 노출 금지),
   * 모르면 종목 없이 총칭한다.
   */
  toast: {
    done: (name?: string) => (name ? `${name} 분석이 완료됐어요` : "분석이 완료됐어요"),
    failed: (name?: string) => (name ? `${name} 분석에 실패했어요` : "분석에 실패했어요"),
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
    /** SSE progress.reason → 재시도 카드에 표시할 실패 사유 라벨. satisfies 로 키 완전성 컴파일 강제. */
    failReason: {
      timeout: "응답 시간 초과",
      "cli-error": "실행 오류",
      "json-parse": "결론 형식 오류",
      "verdict-invalid": "결론 판정 오류",
    } satisfies Record<AgentFailReason, string>,
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
    /**
     * 완료(done) 세로 스택 버블의 방향 라벨 — 라운드 번호는 좌측 `.rn` 박스가 담당하므로
     * 버블 헤더엔 방향("강세" 위 / "약세 반박" 아래)만 노출한다. 진행 뷰(좌우 대치)는 roundMarker 유지.
     */
    bubbleWho: {
      bull: "강세",
      bear: "약세 반박",
    } as Record<"bull" | "bear", string>,
  },
  verdict: {
    badge: "최종 결정",
    /** 최종 판정 에이전트 진행/실패 상태(최종 결론). */
    pmLoading: "최종 결론 도출 중…",
    pmFailed: "최종 결론 도출 실패",
    /** 헤더 우측 강조 박스 라벨(신호 강도 / 신뢰도). */
    signalStrengthShort: "신호 강도",
    confidenceShort: "신뢰도",
    /** 신뢰도 값만(상/중/하) — 강조 박스 숫자 자리. 노스스타 `.v-chip`("신뢰도 중") 정합. */
    confidenceValue: (level: "HIGH" | "MEDIUM" | "LOW") =>
      level === "HIGH" ? "상" : level === "MEDIUM" ? "중" : "하",
    confidence: (level: "HIGH" | "MEDIUM" | "LOW") =>
      `신뢰도: ${level === "HIGH" ? "상" : level === "MEDIUM" ? "중" : "하"}`,
    /** 신뢰도 산출 근거 — 무엇 기준인지 보조 설명 */
    confidenceBasis: "분석가 합의·데이터 명확성 기준",
    /** 결정론 시그널 강도 칩 — score(0~100) 표시. LLM 자기평가 확신도를 대체한다. */
    signalStrength: (score: number) => `신호 강도 ${Math.round(score)}`,
    /** 신호 강도 산출 근거 — 무엇 기준인지 보조 설명 */
    signalStrengthBasis: "가격 기반 결정론 시그널(추세·모멘텀·거래량·변동성) 종합점수",
    /** verdict 유효 기간 라벨 prefix */
    horizon: (h: "단기" | "중기" | "장기") => `유효 기간: ${h}`,
    /** 히어로 글랜스용 예상 기간 라벨. */
    horizonLabel: "예상 기간",
    /**
     * time_horizon enum → 구체 기간 텍스트(히어로 글랜스). 프롬프트가 이미 함의하는 범위를 UI 에서만 풀어 표기.
     * 단기 = 수일~수주 / 중기 = 1~3개월 / 장기 = 3개월+.
     */
    horizonConcrete: {
      단기: "수일~수주",
      중기: "1~3개월",
      장기: "3개월+",
    } as Record<"단기" | "중기" | "장기", string>,
    strengths: "핵심 강점",
    risks: "핵심 리스크",
    portfolioSummary: "아래에서 전체 결과 확인 ↓",
    disclaimer:
      "본 AI 분석 결과는 투자 참고용이며, 최종 투자 결정과 책임은 투자자 본인에게 있습니다.",
    executionGuide: "매매 실행 가이드",
    /** 신규 진입자 / 기존 보유자 가이드 블록 헤더 — 노스스타 `.g-tag`(이모지 없는 짧은 라벨) 정합. */
    newEntryLabel: "신규 진입",
    holderLabel: "보유 중",
    targetLabel: "목표가",
    reentryLabel: "재진입 구간",
    stopLossLabel: "손절가",
    /** 약세 판정의 상방 라인 라벨 — 여기까지 오르면 약세로 본 근거가 깨져 판단을 다시 봐야 한다(stop_loss_pct 양수). */
    invalidationLabel: "재검토 가격",
    rrLabel: "손익비",
    targetHint: "현재가 대비",
    shortTermLabel: "단기 전망 (1~2주)",
    midTermLabel: "중기 전망 (1~3개월)",
    /** 데이터 제한 경고 칩 — 거래일 봉 수 부족(< 130봉)으로 장기추세 미확보 시 노출 */
    limitedData: (bars: number) =>
      `데이터 제한 · ${bars}봉 — 장기추세(120일선) 미확보, 참고용`,
    /** 데이터 제한 컴팩트 칩(저장 결정 카드용) — 짧은 봉 수 표기 */
    limitedDataShort: (bars: number) => `데이터 제한 · ${bars}봉`,
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
  /**
   * prod(Vercel) 배포 주소 한정 — 비동기 분석 "요청 접수" 카드 카피(DESIGN.md S2~S9).
   * 로컬 라이브 경로는 위 chooser/previousDecision/reanalysis 키를 그대로 쓴다(무회귀).
   * 색·간격은 신규 토큰 0 — 기존 .card-info/.card-warn/.card-critical + accent-vivid 재사용.
   */
  prodQueue: {
    /** 빈 결과 인트로(S3) */
    emptyTitle: "아직 분석 결과가 없어요",
    emptyDesc: "요청하면 잠시 뒤 이 화면에서 결과를 볼 수 있어요.",
    /** 신선도 낮은 이전 결론 위 재요청 안내(S2) */
    staleTitle: "더 최신 분석이 필요하면 다시 요청할 수 있어요",
    /**
     * 이전 결론 메타 한 줄 — "얼마나 지났는지"(상대 경과) · 공급자. 예: "최근 분석 3일 전 · Claude".
     * formatRelativeTime 이 3일 초과 시 절대날짜(YYYY.MM.DD)로 강등하므로 오래된 분석은 날짜가 보인다.
     * 로컬 SavedDecisionView.validFooter("최근 분석 {relative} · AI 분석") 의 상대시간 표기와 정합.
     */
    recentMeta: (relative: string, provider: string): string =>
      `최근 분석 ${relative} · ${provider}`,
    /** 요청 CTA(S2·S3) */
    request: "이 종목 분석 요청",
    /** CTA 누른 직후(enqueue 대기) */
    requesting: "요청 보내는 중…",
    /** 접수 성공(S4) */
    acceptedTitle: "분석 요청이 접수됐어요",
    acceptedDesc:
      "보통 몇 분 뒤 이 화면에서 결과를 볼 수 있어요. 잠시 후 다시 들러 주세요.",
    /** 오프라인 경고(S5) — 접수 + 경고 */
    offlineTitle: "분석 요청은 접수됐지만, 지금 분석 서버가 꺼져 있어요",
    offlineDesc:
      "서버가 켜지면 자동으로 처리돼요. 처리되면 이 화면에서 결과를 확인할 수 있어요.",
    /** 중복(S6) */
    duplicateTitle: "이미 분석 중이에요",
    duplicateDesc: "잠시 후 이 화면에서 결과를 확인할 수 있어요.",
    /**
     * 진행 중 선제 표시(unified-analysis-jobs 후속) — 패널을 열었을 때 이 종목이 이미 큐에서
     * active(처리/대기 중)면 요청 CTA 대신 노출. desc 는 duplicateDesc 재사용.
     */
    activeProcessingTitle: "이 종목은 분석 중이에요",
    activePendingTitle: "분석 대기 중이에요",
    /** 처리 중 뱃지(S7) — 워커가 분석을 돌리는 중(busy)일 때. */
    processing: "분석 중",
    /** 처리 중 뱃지 — 대기 큐 건수 칩("· 대기 N건" / "대기 N건"). */
    queuedCount: (n: number) => `대기 ${n}건`,
    /** 처리 중 뱃지 — 워커 오프라인 선제 안내(차분한 muted 칩). 제출 배너(offlineTitle)와 축이 다름. */
    workerOfflineBadge: "분석 서버 꺼짐",
    /** 실패(S9) — decision 기반 failed 판정은 후속, v1 은 키만 보존. */
    failedTitle: "지난 분석 요청이 처리되지 못했어요",
    failedDesc: "아래 버튼으로 다시 요청할 수 있어요.",
    retry: "다시 요청",
    /** enqueue 자체 실패(네트워크/미설정 fail-soft) */
    enqueueErrorTitle: "요청을 보내지 못했어요",
    enqueueErrorDesc: "잠시 후 다시 시도해 주세요.",
    /** 상태 변화 aria-live 안내(스크린리더) — 접수 시 1회 */
    ariaAccepted: "분석 요청이 접수됐어요",
  },
};
