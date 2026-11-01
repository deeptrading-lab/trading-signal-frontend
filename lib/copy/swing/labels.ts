/**
 * 스윙 체크 화면 카피 — `/swing` 스크리너 + 종목 상세 "스윙 체크" 카드(PRD `swing-judgment` PR-3,
 * 디자인 `docs/design/swing-ui.md`).
 *
 * 체크리스트 모드(PR-1 검증 결과): 매수·매도 동사·추천 표현 금지. 주의(제외) 사유를 실제 수치와 기준값으로
 * 설명하고, 과거 통계는 n 과 비교 기준(같은 날 전체 종목)을 같이 쓴다.
 */

import type { SwingStage } from "@/lib/swing/features";
import type { SwingItemKey } from "@/lib/swing/itemBits";
import type { SwingExclusion, SwingGrade, SwingJudgment } from "@/lib/swing/judge";
import type { Rulebook } from "@/lib/swing/rulebook";
import type { SwingScreenerFilter, SwingStatsCell } from "@/lib/types/swing/api";

export const SWING_PAGE_TITLE = "스윙 체크";
export const SWING_PAGE_SUBTITLE =
  "내 스윙 체크리스트를 규칙서로 계산한 결과예요. 전 거래일 종가 기준으로 매일 아침 갱신돼요.";
export const SWING_CARD_TITLE = "스윙 체크";
export const SWING_CARD_HELP =
  "수급·매물대·1년 위치·골든크로스·쌍바닥 조건을 정해진 숫자로 계산했어요. 같은 데이터면 늘 같은 결과예요.";

export const SWING_TABS_ARIA = "스윙 체크 목록";
export const SWING_MARKET_ARIA = "시장 선택";
export const SWING_TAB_LABEL: Record<SwingScreenerFilter, string> = {
  flow: "수급 조건 충족",
  excluded: "주의 종목",
  all: "전체",
};
export const SWING_MARKET_ALL = "전체";

export const SWING_STATE_ERROR = "스윙 체크를 불러오지 못했어요.";
export const SWING_RETRY = "다시 시도";
export const SWING_NOT_RUN = "아직 집계 전이에요. 매 영업일 아침 7시 20분 이후 갱신돼요.";
export const SWING_EMPTY: Record<SwingScreenerFilter, string> = {
  flow: "수급 조건(개인 매도 · 외국인·기관 매수)을 채우면서 주의 사유가 없는 종목이 없어요.",
  excluded: "주의 사유가 있는 종목이 없어요.",
  all: "표시할 종목이 없어요.",
};
export const SWING_FLOW_HINT =
  "변동성이 큰 장에서는 대부분 종목이 '주의'로 분류돼요. 주의 종목 탭에서 이유를 확인할 수 있어요.";

export const SWING_DISCLAIMER = "투자 권유가 아니에요. 과거 통계는 미래 수익을 보장하지 않아요.";
export const SWING_RUN_PARTIAL = "마지막 집계가 일부만 끝났어요. 목록이 빠졌을 수 있어요.";
export const SWING_CAUTION_TITLE = "주의 사유";
export const SWING_LOADING = "스윙 체크를 계산하고 있어요";

/**
 * 과거 통계 문장에 쓰는 집단 이름 — 체크리스트 모드라 등급명("매수 후보" 등) 대신 조건 조합으로 부른다.
 * 정의는 `lib/swing/judge.ts` gradeOf 와 같다.
 */
export const SWING_GRADE_COHORT_LABEL = {
  candidate: "수급·국면·지지·전환 모두 충족",
  interest: "수급·국면 충족",
  neutral: "수급·국면 조건 일부 미충족",
  excluded: "주의 사유 있음",
} as const satisfies Record<SwingGrade, string>;

export const SWING_EXCLUSION_LABEL = {
  insufficient_data: "데이터 부족",
  illiquid: "거래대금 부족",
  halted: "거래정지",
  spac_reit: "스팩·리츠",
  high_volatility: "고변동",
  overheated: "과열",
  dart_event: "자금조달·위험 공시",
} as const satisfies Record<SwingExclusion, string>;

/** 응답 문자열 → 라벨(모르는 코드는 "기타 주의"). */
export function swingExclusionLabel(code: string): string {
  return (SWING_EXCLUSION_LABEL as Record<string, string>)[code] ?? "기타 주의";
}

export const SWING_STAGE_LABEL = {
  overheated: "과열",
  bottoming: "바닥권",
  downtrend: "하락추세",
  uptrend: "상승추세",
  range: "횡보",
  mixed: "혼조",
} as const satisfies Record<SwingStage, string>;

export function swingStageLabel(code: string | null): string {
  if (code === null) return "판단 불가";
  return (SWING_STAGE_LABEL as Record<string, string>)[code] ?? "판단 불가";
}

export const SWING_ITEM_LABEL = {
  A1: "개인 순매도",
  A2: "외국인 순매수",
  A3: "기관 순매수(사모 주도 아님)",
  Aplus: "연기금 순매수(참고)",
  A: "수급 조건",
  B: "구조적 지지 · 손익비 1.5 이상",
  C: "과열·하락추세 아님",
  D: "골든크로스 + RSI 45~70",
  E: "쌍바닥 + MACD 상승",
} as const satisfies Record<SwingItemKey, string>;

/** 카드 체크리스트 표 순서(A 묶음은 표시하지 않는다). */
export const SWING_CHECK_ROWS: readonly SwingItemKey[] = ["A1", "A2", "A3", "Aplus", "B", "C", "D", "E"];

export const SWING_CHECK_PASS = "충족";
export const SWING_CHECK_MISS = "—";
/** "—" 의 스크린리더 문구. */
export const SWING_CHECK_MISS_SR = "미충족";
export const SWING_CHECK_UNKNOWN = "확인 불가";

/** 목록 개수 — BFF 가 거래대금 상위 limit 개까지만 준다. */
export function swingCountLabel(n: number, limit = 50): string {
  return n >= limit ? `거래대금 상위 ${limit}개` : `${n}개 · 거래대금 순`;
}

export const SWING_LEVEL_SUPPORT = "참고 지지";
export const SWING_LEVEL_RESISTANCE = "참고 저항";
export const SWING_LEVEL_RANGE = "2주 통상 변동폭";

export const SWING_PENSION_CHIP = "연기금 순매수";

export function swingMetChip(n: number, total = 7): string {
  return `충족 ${n}/${total}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
/** "2026-10-30" → "10월 30일(금)". */
export function swingDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${WEEKDAYS[d.getUTCDay()]})`;
}
export function swingBasisLabel(tradeDate: string): string {
  return `${swingDateLabel(tradeDate)} 종가 기준`;
}

const fmt1 = (x: number) => (Math.abs(x) >= 10 ? Math.round(x).toLocaleString("en-US") : x.toFixed(1));
/** 원 → "123억 원"(부호 포함). */
function eok(won: number): string {
  const v = won / 1e8;
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmt1(Math.abs(v))}억 원`;
}
const pct = (x: number | null, d = 1) => (x === null ? "—" : `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(d)}%`);

/** 주의 사유 한 줄 설명 — 실제 수치 + 기준값. */
export function describeExclusion(code: SwingExclusion, j: SwingJudgment, rb: Rulebook): string {
  const f = j.features;
  switch (code) {
    case "high_volatility":
      return `하루 평균 변동폭(ATR) ${f.atrPct?.toFixed(1) ?? "—"}% (${j.market} 기준 ${rb.highVolAtrPct[j.market]}% 이상)`;
    case "overheated":
      return `20일 수익률 ${pct(f.r20Pct)} · RSI ${f.rsi?.toFixed(0) ?? "—"} (기준: ${rb.overheat.r20Pct}% 이상 또는 RSI ${rb.overheat.rsi} 이상)`;
    case "dart_event":
      return `최근 ${rb.dart.lookbackBars}거래일 공시: ${f.dartReports.map((n) => n.replace(/^주요사항보고서/, "").replace(/[()]/g, "")).join(", ")}`;
    case "illiquid":
      return `최근 20일 평균 거래대금 ${f.adv20 === null ? "—" : eok(f.adv20).replace("+", "")} (기준 ${rb.liquidity.minAdv20Won / 1e8}억 원)`;
    case "halted":
      return `최근 ${rb.haltLookbackBars}거래일 중 거래가 없던 날이 있어요`;
    case "insufficient_data":
      return `일봉 ${rb.windowBars}개 또는 최근 ${rb.flowWindowDays}일 수급이 모자라요`;
    case "spac_reit":
      return "스팩·리츠는 판정 대상이 아니에요";
  }
}

/** 체크리스트 한 줄의 실측값 설명. */
export function describeItem(key: SwingItemKey, j: SwingJudgment, rb: Rulebook): string {
  const f = j.features;
  const flowAmount = (s: number | undefined) =>
    s === undefined || f.adv20 === null ? null : s * f.adv20; // S = Σ순매수 ÷ ADV20 → Σ순매수(원)
  const flowText = (s: number | undefined) => {
    const won = flowAmount(s);
    return won === null ? "수급 데이터 없음" : `${rb.flow.days}일 순매수 ${eok(won)}`;
  };
  switch (key) {
    case "A1":
      return flowText(f.flow?.person);
    case "A2":
      return flowText(f.flow?.foreign);
    case "A3": {
      const org = flowAmount(f.flow?.institution);
      const pe = flowAmount(f.flow?.privateEquity);
      return org === null || pe === null ? "수급 데이터 없음" : `기관 ${eok(org)} · 사모 ${eok(pe)}`;
    }
    case "Aplus":
      return flowText(f.flow?.pension);
    case "A":
      return "";
    case "B": {
      const p = j.plan;
      if (!p || p.rr === null) return "계산 불가";
      const basis = p.stopSource === "doubleBottom" ? "쌍바닥" : p.stopSource === "zone" ? "매물대" : "변동폭";
      return `손익비 ${p.rr.toFixed(2)} · 지지 근거 ${basis}`;
    }
    case "C":
      return j.stage === null ? "판단 불가" : `${swingStageLabel(j.stage)} · 1년 평균 대비 ${pct(f.dev250Pct)}`;
    case "D": {
      const parts = [
        f.macdCrossAgo === null ? null : `MACD 교차 ${f.macdCrossAgo === 0 ? "오늘" : `${f.macdCrossAgo}일 전`}`,
        f.maCrossAgo === null ? null : `5·20일선 교차 ${f.maCrossAgo === 0 ? "오늘" : `${f.maCrossAgo}일 전`}`,
        `RSI ${f.rsi?.toFixed(0) ?? "—"}`,
      ].filter(Boolean);
      return parts.join(" · ");
    }
    case "E": {
      const db = j.doubleBottom;
      if (!db) return "쌍바닥 없음";
      return db.divergence ? "쌍바닥 · MACD 상승" : "쌍바닥 · MACD 상승 아님";
    }
  }
}

/**
 * 과거 통계 한 문장 — n < 30(hidden)이면 null.
 * 10일 뒤 오른 비율과 같은 날 전체 종목 비율, 같은 날 전체 대비 평균 차이(%p)를 쓴다.
 */
export function swingStatsSentence(cell: SwingStatsCell | null, label: string): string | null {
  if (!cell || cell.hidden || cell.upRate === null || cell.baseUpRate === null || cell.meanExcess10 === null) return null;
  const up = (cell.upRate * 100).toFixed(0);
  const base = (cell.baseUpRate * 100).toFixed(0);
  const ex = cell.meanExcess10 * 100;
  const exText = `${ex > 0 ? "+" : ex < 0 ? "−" : ""}${Math.abs(ex).toFixed(2)}%p`;
  return `과거 '${label}' ${cell.n.toLocaleString("ko-KR")}건 — 10일 뒤 오른 비율 ${up}%(같은 날 전체 ${base}%), 같은 날 전체 대비 평균 ${exText}`;
}
