/**
 * 장중 단타 판단(참고) UI 카피 — intraday-scalping-agent §0(decision-support).
 *
 * ⚠️ 문구 원칙: "참고·판단 보조"를 전면에. 자동 수익/집행/추천 보장 표현 금지(검증 결과 엣지 미증명).
 */

import type { IntradayAction } from "@/lib/types/intraday/intradayDecision";
import type {
  IntradayScoreBand,
  IntradayTickLabelSource,
  RunIntradayTickLabelsResponse,
} from "@/lib/types/intraday/tickLabels";

export const INTRADAY_READ_COPY = {
  title: "장중 단타 판단",
  badge: "참고",
  /** 카드 상단·버튼 옆 상시 노출 면책. */
  disclaimer:
    "결정론 레벨 + AI 에이전트의 보조 분석이에요. 자동 수익을 보장하지 않으며, 매매 판단·집행은 직접 하세요.",
  trigger: "장중 단타 판단 받기",
  rerun: "다시 판단",
  loading: "분봉 흐름 분석 중…",
  loadingHint: "분봉 페치 + 에이전트 분석으로 수십 초 걸릴 수 있어요.",
  localOnly: "장중 단타 판단은 로컬 환경(CLI 설치)에서만 사용할 수 있어요.",
  error: "판단을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.",

  /** 3-액션 라벨 — 진입/관망/청산(보유자 기준). */
  action: {
    BUY: "진입 검토",
    HOLD: "관망",
    SELL: "청산·회피",
  } satisfies Record<IntradayAction, string>,
  actionTone: {
    BUY: "up",
    HOLD: "flat",
    SELL: "down",
  } satisfies Record<IntradayAction, "up" | "down" | "flat">,

  confidence: { HIGH: "높음", MEDIUM: "보통", LOW: "낮음" },

  sectionSetup: "흐름·세력 진단",
  sectionJudge: "진입·청산 판단",
  sectionLevels: "구조 레벨",

  field: {
    box: "박스권",
    target: "목표가",
    stop: "손절가",
    invalidation: "재검토가",
    rrr: "손익비",
    entryZone: "진입 구간",
    holding: "예상 보유",
    signal: "분봉 시그널",
    regime: "일봉 큰 흐름",
  },
  regimeLabel: { 1: "강세", 0: "중립", "-1": "약세" } as Record<string, string>,
  none: "—",
  gateNote: "리스크 룰 조정",
} as const;

/** 단타 워치 워크스페이스(B) 카피. */
export const INTRADAY_WATCH_COPY = {
  title: "AI 단타",
  subtitle: "수급 몰리는 종목을 골라 장중 단타 판단(참고)을 받아보세요.",
  disclaimer:
    "결정론 레벨 + AI 에이전트의 보조 분석이에요. 자동 수익을 보장하지 않으며, 매매 판단·집행은 직접 하세요.",
  recommendTitle: "추천 후보",
  flowTitle: "수급 상위",
  flowHint: "외국인·기관 순매수 상위 (당일)",
  volumeTitle: "거래량 상위",
  volumeHint: "거래량 순위 (실전 KIS)",
  candidatesLoading: "후보를 불러오는 중…",
  candidatesEmpty: "후보를 불러올 수 없어요(장중·prod KIS 필요).",
  empty: "검색하거나 추천 후보를 눌러 종목을 추가하면 장중 단타 판단을 받아볼 수 있어요.",
  /* 종목 검색 — 후보 밖 종목도 워치에 추가. */
  searchPlaceholder: "종목명·코드로 검색해 워치에 추가",
  /* 선택 종목 호가창(단일) — 행 클릭으로 전환. */
  orderbookTitle: "선택 종목 호가",
  orderbookHint: "· 행을 눌러 종목을 바꿀 수 있어요.",
} as const;

/** 워치 카드 하단 "AI 모의 단타" 시작/현황 카피 — intraday-paper-watch. */
export const INTRADAY_PAPER_COPY = {
  title: "AI 모의 단타",
  badge: "가상",
  startLabel: "모의 단타 시작",
  cashLabel: "모의 투자금(원)",
  cashInvalid: "모의 투자금은 0보다 큰 숫자여야 해요.",
  creating: "세션 생성 중…",
  /** 장중인데 자동 판단이 끊긴 세션 배지 — 재시작 유도(장 마감 정지는 예외). "멈춤"은 일시정지와 의미가 겹쳐 개칭. */
  stalled: "판단 끊김",
  stalledHint: "장중인데 자동 판단이 끊겼어요 — 모니터링을 재시작해 주세요.",
  /**
   * 워치 표 위 공통 안내 — 동작 / 매매 규칙 / 면책을 짧은 줄로 분리(가독성 피드백).
   * 규칙 수치는 서버 스펙과 정합: 슬리피지=체결가·수수료/제세금=현금(virtualExecution),
   * 15:00 신규진입 금지·15:20 전량 청산·일일 −3% kill(constants)·15:40 세션 자동 완료(tickScheduler).
   */
  noticeLines: [
    "장중(평일 09:00~15:30) dev 서버가 켜져 있는 동안, 행에서 선택한 판단 주기마다 서버가 자동 판단하고 필요할 때 가상 체결해요 — 이 화면을 벗어나도 계속돼요.",
    "체결가엔 슬리피지, 현금엔 수수료·제세금 반영 · 15:00 이후 신규 진입 없음 · 15:20 전량 청산 · 하루 −3% 손실 시 신규 진입 중단 · 15:40 세션 자동 완료(다음 날 새로 시작)",
    "AI 보조 분석 기반의 가상 기록이에요 — 실제 주문은 발생하지 않고, 실제 매매 판단·집행은 직접 하세요.",
  ],
  autoTicking: "장중 자동 판단 중",
  /* 세션 소유자(운영자) 구분 — 공유 Supabase 를 여러 서버가 함께 쓸 때(intraday-session-owner). */
  owner: {
    mine: "나",
    mineTitle: "내 서버가 만든 세션이에요",
    otherTitle: (op: string) => `다른 서버(${op})가 만든 세션이에요`,
    mineOnly: "내 세션만",
    mineOnlyHint: "다른 서버가 만든 세션을 숨겨요",
  },
  metricReturn: "수익률",
  metricValue: "평가",
  metricCash: "현금",
  positionLabel: "포지션",
  positionNone: "무포지션",
  lastDecision: "최근 판단",
  noDecision: "아직 판단 기록이 없어요.",
  ticksLabel: "판단",
  detailLink: "전체 화면",
  cardOpenHint: "눌러서 체결 내역 보기",
  error: "모의 단타 세션 처리에 실패했어요. 잠시 후 다시 시도해 주세요.",
  disclaimer: "가상 체결 기록이에요. 실제 주문은 발생하지 않으며, 실제 매매 판단·집행은 직접 하세요.",

  /* 과거 내역 섹션 — Supabase 원장을 페이지 단위로 읽는다(intraday-history-pagination). */
  past: {
    title: "과거 모의투자 내역",
    hint: "오늘 목록에는 영향을 주지 않아요",
    loading: "과거 내역을 불러오는 중…",
    empty: "아직 과거 모의투자 내역이 없어요.",
    error: "과거 내역을 불러오지 못했어요.",
    retry: "다시 시도",
    more: "더 보기",
    loadingMore: "불러오는 중…",
    end: "마지막 기록까지 다 봤어요.",
    /** Supabase 미설정(로컬 무DB·egress 차단) — 장애가 아니라 저장소가 꺼진 상태. */
    disabled: "과거 내역 저장소가 꺼져 있어 이전 기록을 불러올 수 없어요.",
  },

  /* 워치 표 (토스 랭킹 표 스타일) — 컬럼 헤더·행 액션(input·버튼 컬럼 포함). */
  table: {
    colStock: "종목",
    colPrice: "현재가",
    colChange: "등락률",
    colReturn: "모의 수익률",
    colValue: "평가금액",
    colPosition: "포지션",
    colLast: "최근 판단",
    colCash: "모의 투자금(원)",
    colInterval: "주기",
    colHardStop: "손절 상한",
    colRead: "AI 분석",
    colPaper: "모의 매매",
    colManage: "관리",
    none: "—",
    /* 손절 상한(포지션 하드스톱) 선택 — 급락 시 자동 전량 청산 백스톱(intraday-stop-slippage C). */
    hardStopTitle: "포지션이 이 손실률에 닿으면 자동 전량 청산해요(하드스톱 백스톱).",
    hardStopOff: "끄기",
    hardStopConservative: "보수",
    hardStopStandard: "표준",
    hardStopAggressive: "공격",
    hardStopOffWarn: "물타기 무제한 리스크",
    hardStopOffWarnTitle:
      "하드스톱을 끄면 급락 시 손실이 −10% 이상으로 커질 수 있어요(다스코류). 동적 손절선은 계속 작동해요.",
    readRun: "현황 분석",
    readRunning: "분석 중",
    readTitle: "매매·기록 없이 지금 시점 현황을 AI가 분석해요",
    startRun: "모의 시작",
    ordersButton: "체결 내역",
    removeAria: "워치에서 제거",
    expandAria: "상세 접기/펼치기",
    cashPresetAria: "금액 빠른 선택",
    /* 펼침 탭 — 차트(당일 분봉+체결 마커) / 체결 내역(미니 로그). */
    tabChart: "차트",
    tabOrders: "체결 내역",
    chartLoading: "당일 분봉을 불러오는 중…",
    chartEmpty: "당일 분봉이 아직 없어요.",
    chartError: "분봉을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
    ordersNoSession: "모의 세션이 없어요 — 모의 시작을 누르면 여기에 체결이 기록돼요.",
    /* 날짜별 그룹 헤더 — 세션 시작일 기준(오늘/어제/그 외 M/D) + 건수 + 당일 요약. */
    groupToday: "오늘",
    groupYesterday: "어제",
    groupCount: (n: number) => `${n}건`,
    groupToggleAria: (label: string) => `${label} 그룹 접기/펼치기`,
    /* 당일 요약 — 합산 수익률 접두어 · 승/패 · 진행중. */
    groupSummaryReturn: "합산",
    groupWinLoss: (w: number, l: number) => `${w}승 ${l}패`,
    groupRunning: (n: number) => `진행 ${n}`,
    /* 전체 그룹 접기/펼치기 컨트롤. */
    groupExpandAll: "모두 펼치기",
    groupCollapseAll: "모두 접기",
  },

  /* 상세 시트 — 카드 클릭 시 체결 내역·거래별 손익. */
  sheet: {
    ariaLabel: "모의 단타 상세",
    metricInitial: "시작 투자금",
    metricRealized: "실현손익 합",
    ordersTitle: "체결 내역",
    ordersEmpty: "아직 체결이 없어요.",
    colTime: "시각",
    colSide: "구분",
    colQty: "수량",
    colPrice: "체결가",
    colNotional: "금액",
    colCost: "비용",
    colPnl: "실현손익",
    colNote: "판단 메모",
    sideBuy: "매수",
    sideSell: "매도",
    decisionsTitle: "최근 판단",
    analystPrefix: "흐름 진단",
    gatePrefix: "룰 조정",
    close: "닫기",
  },
} as const;

/** 오토파일럿(자동 포트폴리오) 카드 카피 — intraday-autopilot. */
export const INTRADAY_AUTOPILOT_COPY = {
  title: "오토파일럿",
  badge: "자동 포트폴리오",
  subtitle:
    "시작해 두면 장중에 단타 적합 종목(변동성·유동성·모멘텀)을 스스로 골라 슬롯을 채우고, 죽은 종목은 빼고 새로 뜨는 종목으로 교체하며 모의 단타를 자동 운영해요.",
  startLabel: "자동 시작",
  starting: "시작 중…",
  stopLabel: "중지",
  stopping: "중지 중…",
  stopHint: "종목 선정·교체만 멈춰요 — 이미 진행 중인 모의 세션은 그대로 이어져요.",
  totalCapitalLabel: "총자본(원)",
  slotCountLabel: "슬롯",
  slotCountUnit: (n: number) => `${n}종목`,
  capitalInvalid: "총자본은 100만 원 이상이어야 해요.",
  /* 상태 라인 — 시작 전/장 시작 대기/가동 중/중지·완료. */
  statusWaitingOpen: "장 시작 대기 — 09:05부터 종목을 골라 채워요.",
  statusActive: "가동 중 — 10분마다 종목을 재평가해요.",
  statusStopped: "중지됨",
  statusCompleted: "오늘 운영 종료",
  kisNotReady: "KIS 실전 미설정 — 종목 선정(랭킹 조회)을 할 수 없어요.",
  /* 슬롯 칩. */
  slotEmpty: "빈 슬롯",
  slotDone: "종료",
  /* 런 누적 손익(교체 회수된 세션 포함). */
  pnlLabel: "런 손익",
  pnlChildren: (n: number) => `세션 ${n}개 합산`,
  /* 로테이션 히스토리(접이식). */
  historyTitle: "선정·교체 기록",
  historyEmpty: "아직 기록이 없어요.",
  historyKind: {
    fill: "편입",
    replace: "교체",
    reconcile: "정리",
    skip: "대기",
  },
  /* 마지막 스크리너 요약. */
  screenerLabel: (universe: number, passed: number) => `후보 ${universe} → 통과 ${passed}`,
  error: "오토파일럿 처리에 실패했어요. 잠시 후 다시 시도해 주세요.",
  disclaimer: "가상 기록이에요 — 실제 주문은 발생하지 않아요.",
  /* 워치 표 행 배지 — 오토파일럿이 자동 편입한 세션 구분. */
  rowBadge: "오토",
  rowBadgeTitle: "오토파일럿이 자동 편입한 종목이에요",
} as const;

/** 관리자 캘리브레이션 패널(틱 자가채점 라벨) 카피 — intraday-decision-overhaul PR-2. */
export const INTRADAY_CALIBRATION_COPY = {
  title: "판단 캘리브레이션",
  badge: "관리자",
  subtitle:
    "저장된 판단 틱을 그날 이후 분봉과 대조해 '그 레벨로 진입했다면'의 결과를 채점해요 (관망 틱은 반사실 라벨).",
  run: "라벨링 실행",
  running: "라벨링 중…",
  runHint: "완료 세션을 한 번에 최대 3개씩 채점해요 — 남은 세션이 있으면 다시 눌러 이어가요.",
  result: (r: RunIntradayTickLabelsResponse) =>
    r.configured
      ? `확정 ${r.labeled}건 · 미확정 ${r.unresolved}건 · 세션 ${r.sessions}개 처리${
          r.remaining > 0 ? ` · ${r.remaining}개 세션 남음` : " · 전부 최신 상태예요"
        }`
      : "라벨 저장소(Supabase)가 설정되지 않아 실행하지 못했어요.",
  loading: "라벨 집계를 불러오는 중…",
  error: "라벨 집계를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
  empty: "아직 라벨이 없어요 — 라벨링 실행을 누르면 완료된 세션부터 채점을 시작해요.",
  unconfigured: "라벨 저장소(Supabase)가 설정되지 않았어요 — 로컬 env 를 확인해 주세요.",
  staleNote:
    "KIS 과거 분봉은 최근 며칠만 조회돼요 — 오래된 세션 틱은 '미확정'이 정상이에요. 익절·손절 동시 터치 봉은 손절로 집계(보수적)해요.",
  totalLabel: "누적 라벨",
  table: {
    colBucket: "출처 × 판단",
    colWin: "익절",
    colLoss: "손절",
    colNeutral: "만료",
    colUnresolved: "미확정",
    colAvgReturn: "평균수익률",
  },
  source: {
    "intraday-cli": "AI 판단",
    "intraday-fallback": "결정론 폴백",
  } satisfies Record<IntradayTickLabelSource, string>,
  actionLabel: {
    BUY: "매수",
    INCREASE: "추가매수",
    REDUCE: "부분청산",
    EXIT: "전량청산",
    SELL: "매도",
    HOLD: "관망",
  } as Record<string, string>,
  bandsTitle: "시그널 점수대별",
  band: {
    lt40: "40 미만",
    b40to60: "40~60",
    gte60: "60 이상",
  } satisfies Record<IntradayScoreBand, string>,
} as const;
