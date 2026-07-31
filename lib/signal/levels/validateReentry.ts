/**
 * PM 이 낸 **가격 레벨의 타당성 검증** — 재진입가 앵커(강제) + 무효화 라인 노이즈 판정(관측).
 *
 * 약세 판정의 재진입가(`target_pct`)가 **실제 지지에 앵커됐는지** 검증한다.
 *
 * ## 왜 서버가 강제하는가
 * 프롬프트에도 같은 규칙이 있지만(#375) **프롬프트는 강제가 아니다** — 모델이 무시하면 사후에만
 * 검출된다. 그리고 이 숫자는 단순 텍스트가 아니라 **차트 오버레이의 재진입 라벨과 phase-2 터치
 * 채점을 구동**한다. 규칙이 한 번 무시되는 순간, 아래에 받쳐줄 매물대가 없는 위험한 가격이
 * 권위 있는 숫자로 화면에 찍힌다(실측: 두산에너빌리티 -13% = 55,400원 — 매물대 공백 한복판).
 *
 * ## 판정
 * 재진입 예상가가 **현재가 이하 매물대 구간 안에 들어와야** 앵커된 것으로 본다.
 * 허용 오차는 고정 %가 아니라 **매물대 구간폭의 절반** — 구간폭은 종목의 1년 가격 범위에서
 * 나오므로 변동성에 자동으로 스케일한다(고정 ±3% 는 저변동주에서 헐겁고 고변동주에서 빡빡하다).
 *
 * ## 강세에는 적용하지 않는다 (비대칭이 실재한다)
 * 현재가 **아래** 공백은 "받아줄 매수 평단이 없다" = 낙폭 확대를 뜻하지만,
 * **위쪽** 공백은 "팔 물량이 없다" = 오히려 잘 오른다는 뜻이다. 상방 목표가 저항 위에 있는 것은
 * 모순이 아니므로 검증 대상이 아니다.
 *
 * 순수 함수(IO 없음) — 호출부가 로깅·기록을 담당한다.
 */

import type { PriceLevels } from "@/lib/signal/levels/priceLevels";
import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";

/** 재진입가 검증 결과. */
export interface ReentryAnchorCheck {
  /** 검증 대상이었는지(약세 + target_pct 음수 + 레벨 데이터 존재). 아니면 그대로 통과. */
  checked: boolean;
  /** 실측 지지에 앵커됐는지. `checked=false` 면 항상 true(판단 보류 = 통과). */
  anchored: boolean;
  /** 재진입 예상가(원). 계산 불가면 null. */
  reentryPrice: number | null;
  /** 앵커된 매물대 중앙가(원). 앵커 실패면 null. */
  matchedZonePrice: number | null;
  /** 사람이 읽는 사유 — 로그·기록용. 통과면 null. */
  reason: string | null;
}

const PASS: ReentryAnchorCheck = {
  checked: false,
  anchored: true,
  reentryPrice: null,
  matchedZonePrice: null,
  reason: null,
};

/** 재진입가를 무를 수 있는 약세 판정(SELL 은 target_pct 가 애초에 null 규약). */
function isReentryVerdict(verdict: FinalDecision["verdict"]): boolean {
  return verdict === "UNDERWEIGHT" || verdict === "REDUCE";
}

/**
 * 약세 재진입가가 실측 지지에 앵커됐는지 검사한다.
 *
 * @param verdict PM 최종 판정.
 * @param targetPct 재진입 구간(현재가 대비 %, 음수). null 이면 검사 없음(이미 제시 안 함).
 * @param basePrice 판정 시점 현재가(원).
 * @param levels 같은 일봉으로 계산한 가격 레벨. null 이면 검사 보류(통과).
 */
export function checkReentryAnchor(
  verdict: FinalDecision["verdict"],
  targetPct: number | null,
  basePrice: number | null,
  levels: PriceLevels | null,
): ReentryAnchorCheck {
  if (!isReentryVerdict(verdict)) return PASS;
  if (targetPct == null || targetPct >= 0) return PASS;
  if (!basePrice || basePrice <= 0) return PASS;
  // 레벨·매물대가 없으면 **판단 근거가 없는 것**이지 위반이 아니다 — 조용히 통과(fail-soft).
  if (!levels || !levels.binWidth || levels.zones.length === 0) return PASS;

  const reentryPrice = Math.round(basePrice * (1 + targetPct / 100));
  const tolerance = levels.binWidth / 2;

  // 현재가 이하(도달 포함) 매물대만 지지 후보다 — 위쪽 매물대는 저항이라 재진입 근거가 못 된다.
  const supports = levels.zones.filter((z) => z.side === "below" || z.side === "at");
  if (supports.length === 0) {
    return {
      checked: true,
      anchored: false,
      reentryPrice,
      matchedZonePrice: null,
      reason: `현재가 아래 매물대가 없어(공백) 재진입가 ${reentryPrice.toLocaleString("ko-KR")}원을 받쳐줄 지지가 없음`,
    };
  }

  let matched: number | null = null;
  let nearest = supports[0];
  for (const z of supports) {
    if (Math.abs(reentryPrice - z.price) <= tolerance) {
      matched = z.price;
      break;
    }
    if (Math.abs(reentryPrice - z.price) < Math.abs(reentryPrice - nearest.price)) nearest = z;
  }

  if (matched !== null) {
    return { checked: true, anchored: true, reentryPrice, matchedZonePrice: matched, reason: null };
  }

  return {
    checked: true,
    anchored: false,
    reentryPrice,
    matchedZonePrice: null,
    reason:
      `재진입가 ${reentryPrice.toLocaleString("ko-KR")}원이 매물대 공백에 위치` +
      ` (가장 가까운 지지 ${nearest.price.toLocaleString("ko-KR")}원, 허용 오차 ±${Math.round(tolerance).toLocaleString("ko-KR")}원)`,
  };
}

/**
 * 무효화 라인이 **통상 변동폭 안**에 있는지 — 관측 전용(값을 바꾸지 않는다).
 *
 * 안에 있으면 논거가 깨져서가 아니라 노이즈로 발동한다. 다만 매물대·직전 저점처럼 구조적 경계라면
 * 좁아도 정당할 수 있어 **강제하지 않고 기록만** 한다(프롬프트 준수율 계측 → 필요하면 나중에 승격).
 *
 * @param timeHorizon 판단 기간 — 대응하는 통상 변동폭을 고른다.
 * @returns 노이즈 안이면 사유 문자열, 아니면 null(판정 불가 포함).
 */
export function checkStopNoiseBand(
  stopPct: number,
  timeHorizon: FinalDecision["time_horizon"],
  levels: PriceLevels | null,
): string | null {
  if (!levels) return null;
  const { d5, d10, d21 } = levels.typicalMove;
  const typical = timeHorizon === "단기" ? d5 : timeHorizon === "장기" ? d21 : d10;
  if (typical == null || typical <= 0) return null;
  const width = Math.abs(stopPct);
  if (width >= typical) return null;
  return `무효화 라인 ±${width.toFixed(1)}% 가 ${timeHorizon} 통상 변동폭 ±${typical.toFixed(1)}% 안 — 노이즈로 발동할 수 있음`;
}
