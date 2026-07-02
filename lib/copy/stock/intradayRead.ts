/**
 * 장중 단타 판단(참고) UI 카피 — intraday-scalping-agent §0(decision-support).
 *
 * ⚠️ 문구 원칙: "참고·판단 보조"를 전면에. 자동 수익/집행/추천 보장 표현 금지(검증 결과 엣지 미증명).
 */

import type { IntradayAction } from "@/lib/types/intraday/intradayDecision";

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
    invalidation: "무효화가",
    rrr: "손익비",
    entryZone: "진입 구간",
    holding: "예상 보유",
    signal: "분봉 시그널",
    regime: "일봉 레짐",
  },
  regimeLabel: { 1: "강세", 0: "중립", "-1": "약세" } as Record<string, string>,
  none: "—",
  gateNote: "리스크 룰 조정",
} as const;

/** 단타 워치 워크스페이스(B) 카피. */
export const INTRADAY_WATCH_COPY = {
  title: "단타 워치",
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
  /* 진행 중 모의 세션 복원 칩 — 새로고침으로 워치가 비어도 세션은 서버에 살아있다. */
  runningTitle: "진행 중 모의 단타",
  runningHint: "눌러서 워치에 다시 추가하면 현황이 보여요.",
} as const;

/** 워치 카드 하단 "AI 모의 단타" 시작/현황 카피 — intraday-paper-watch. */
export const INTRADAY_PAPER_COPY = {
  title: "AI 모의 단타",
  badge: "가상",
  startLabel: "모의 단타 시작",
  cashLabel: "모의 투자금(원)",
  cashInvalid: "모의 투자금은 0보다 큰 숫자여야 해요.",
  creating: "세션 생성 중…",
  /**
   * 워치 표 위 공통 안내 — 동작 / 매매 규칙 / 면책을 짧은 줄로 분리(가독성 피드백).
   * 규칙 수치는 서버 스펙과 정합: 슬리피지=체결가·수수료/제세금=현금(virtualExecution),
   * 15:00 신규진입 금지·15:20 전량 청산·일일 −3% kill(constants).
   */
  noticeLines: [
    "장중(평일 09:00~15:30) 이 화면이 열려 있는 동안, 행에서 선택한 판단 주기마다 AI가 상황을 점검하고 필요할 때 가상 체결해요.",
    "체결가엔 슬리피지, 현금엔 수수료·제세금 반영 · 15:00 이후 신규 진입 없음 · 15:20 전량 청산 · 하루 −3% 손실 시 신규 진입 중단",
    "AI 보조 분석 기반의 가상 기록이에요 — 실제 주문은 발생하지 않고, 실제 매매 판단·집행은 직접 하세요.",
  ],
  autoTicking: "자동 판단 동작 중",
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
    colRead: "AI 진단",
    colPaper: "모의 매매",
    colManage: "관리",
    none: "—",
    readRun: "진단 받기",
    readRunning: "진단 중",
    readTitle: "매매 없이 지금 시점의 단타 판단만 받아봐요",
    startRun: "모의 시작",
    ordersButton: "체결 내역",
    removeAria: "워치에서 제거",
    expandAria: "상세 접기/펼치기",
    expandEmpty: "AI 진단을 누르면 판단 결과가, 모의 시작 후엔 체결 내역 진입이 여기에 표시돼요.",
    cashPresetAria: "금액 빠른 선택",
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
