/**
 * `action` enum 의 한글 라벨 + 배지 스타일 매핑.
 *
 * DESIGN.md OPEN QUESTION #4 결정 그대로:
 *   ACTIONABLE_BUY  → "지금 매수"           (badge-accent)
 *   CONDITIONAL_BUY → "조건 충족 시 매수"   (badge-accent)
 *   HOLD            → "보유 유지"           (badge-info)
 *   PARTIAL_SELL    → "일부 매도"           (badge-warn)
 *   SELL            → "전량 매도"           (badge-critical)
 *   AVOID           → "진입 보류"           (badge-critical)
 *
 * BE 가 새 enum 을 추가해도 깨지지 않게 fallback 을 한 번에 정의한다.
 */

export type ActionBadgeKind = "badge-accent" | "badge-info" | "badge-warn" | "badge-critical";

export type ActionMeta = {
  label: string;
  badge: ActionBadgeKind;
  /** brief.action 과 비교를 위한 의미적 그룹. */
  group: "BUY" | "HOLD" | "SELL" | "AVOID" | "UNKNOWN";
};

const ACTION_META: Record<string, ActionMeta> = {
  ACTIONABLE_BUY: { label: "지금 매수", badge: "badge-accent", group: "BUY" },
  CONDITIONAL_BUY: { label: "조건 충족 시 매수", badge: "badge-accent", group: "BUY" },
  HOLD: { label: "보유 유지", badge: "badge-info", group: "HOLD" },
  PARTIAL_SELL: { label: "일부 매도", badge: "badge-warn", group: "SELL" },
  SELL: { label: "전량 매도", badge: "badge-critical", group: "SELL" },
  AVOID: { label: "진입 보류", badge: "badge-critical", group: "AVOID" },
};

export function getActionMeta(action: string | undefined | null): ActionMeta {
  if (!action) {
    return { label: "분석 결과 확인", badge: "badge-info", group: "UNKNOWN" };
  }
  const found = ACTION_META[action];
  if (found) return found;
  return { label: action, badge: "badge-info", group: "UNKNOWN" };
}

/**
 * `brief.action` (기술 신호) 의 한글 라벨 + 배지.
 *
 * BE 가 BUY/HOLD/SELL 외에 ACTIONABLE_LONG / WATCH_LONG / AVOID_NEW_LONG / EXIT_LONG /
 * REDUCE_LONG 같은 swing-trade 친화 enum 도 보낸다 (실측 확인).
 * 키워드 단위로 분류해 한글 매핑을 폴리시한다.
 */
export function getBriefActionMeta(briefAction: string | undefined | null): ActionMeta {
  if (!briefAction) {
    return { label: "신호 없음", badge: "badge-info", group: "UNKNOWN" };
  }
  const upper = briefAction.toUpperCase();
  if (upper === "BUY") return { label: "매수 신호", badge: "badge-accent", group: "BUY" };
  if (upper === "HOLD") return { label: "관망 신호", badge: "badge-info", group: "HOLD" };
  if (upper === "SELL") return { label: "매도 신호", badge: "badge-warn", group: "SELL" };
  if (upper === "ACTIONABLE_LONG") {
    return { label: "매수 신호", badge: "badge-accent", group: "BUY" };
  }
  if (upper === "WATCH_LONG" || upper === "HOLD_MONITOR") {
    return { label: "관망 신호", badge: "badge-info", group: "HOLD" };
  }
  if (upper === "REDUCE_LONG" || upper === "EXIT_LONG") {
    return { label: "매도 신호", badge: "badge-warn", group: "SELL" };
  }
  if (upper === "AVOID_NEW_LONG") {
    return { label: "진입 보류 신호", badge: "badge-critical", group: "AVOID" };
  }
  return { label: briefAction, badge: "badge-info", group: "UNKNOWN" };
}

/** `action` 과 `brief.action` 이 의미적으로 다른지 (BUY vs SELL 등). */
export function isDivergent(actionGroup: ActionMeta["group"], briefGroup: ActionMeta["group"]): boolean {
  if (actionGroup === "UNKNOWN" || briefGroup === "UNKNOWN") return false;
  return actionGroup !== briefGroup;
}
