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
