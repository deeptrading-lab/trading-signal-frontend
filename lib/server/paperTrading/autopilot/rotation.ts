/**
 * 오토파일럿 로테이션 플래너 — **순수 결정 로직**(IO 없음, 단위테스트 1급 대상). intraday-autopilot.
 *
 * 스윕마다 "어떤 슬롯을 회수하고(replace) 어떤 후보로 채울지(fill)"만 계산해 계획으로 반환한다.
 * 실행(세션 완료 patch·생성)은 runStore 가 담당한다.
 *
 * 안전 원칙:
 * - **포지션 보유 슬롯은 절대 교체하지 않는다** — 청산은 자식 세션의 judge/하드스톱/15:20 flatten
 *   전담. flat 복귀 후 다음 스윕에서만 교체 대상이 된다.
 * - 랭킹이 비면(스크리너 unavailable) 교체 판정 자체를 하지 않는다(무근거 교체 방지).
 * - fill 창(09:05~14:00) 밖에선 교체 회수도 하지 않는다 — 회수해도 채울 수 없어 슬롯만 놀린다.
 */

import {
  AUTOPILOT_COOLDOWN_MINUTES,
  AUTOPILOT_FIRST_FILL_HHMM,
  AUTOPILOT_MAX_FILLS_PER_SWEEP,
  AUTOPILOT_NO_NEW_FILL_HHMM,
  AUTOPILOT_REPLACE_RANK_THRESHOLD,
  AUTOPILOT_STAGNANT_CONVICTION_MAX,
  AUTOPILOT_STAGNANT_TICKS,
} from "@/lib/server/paperTrading/autopilot/constants";
import type {
  AutopilotCandidate,
  AutopilotRotationEvent,
  AutopilotRun,
} from "@/lib/types/paperTrading/autopilot";
import type {
  PaperTradingSessionDetail,
  PaperTradingSessionStatus,
} from "@/lib/types/paperTrading/paperTrading";

/** KST HH:MM — fill 창 게이트용(요일·장중 게이트는 스윕 진입부의 kstMarketHours 가 담당). */
export function kstHhmmOf(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Seoul",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 슬롯 세션의 로테이션 판단에 필요한 최소 뷰 — buildSlotSessionView 로 조립. */
export type AutopilotSlotSessionView = {
  sessionId: string;
  ticker: string;
  status: PaperTradingSessionStatus;
  /** 수량 1주 이상 보유 여부 — 보유 중이면 교체 불가침. */
  hasPosition: boolean;
  /** 뒤에서부터 연속 무주문 LLM 틱 수(risk 틱은 카운트에서 제외). */
  consecutiveNoOrderTicks: number;
  /** 가장 최근 기록된 judge conviction(0~100). 미기록이면 null. */
  lastConvictionScore: number | null;
};

/** 세션 상세 → 로테이션 뷰. 틱 배열은 시간순(append-only) 전제. */
export function buildSlotSessionView(detail: PaperTradingSessionDetail): AutopilotSlotSessionView {
  let consecutiveNoOrderTicks = 0;
  for (let i = detail.ticks.length - 1; i >= 0; i--) {
    const tick = detail.ticks[i];
    if (tick.triggeredBy === "risk") continue; // 60초 리스크 틱은 판단 틱이 아니다.
    if (tick.orders.length > 0) break;
    consecutiveNoOrderTicks += 1;
  }
  let lastConvictionScore: number | null = null;
  for (let i = detail.ticks.length - 1; i >= 0; i--) {
    const conviction = detail.ticks[i].decision.convictionScore;
    if (typeof conviction === "number") {
      lastConvictionScore = conviction;
      break;
    }
  }
  return {
    sessionId: detail.session.id,
    ticker: detail.session.stocks[0]?.ticker ?? detail.session.tickers[0] ?? "",
    status: detail.session.status,
    hasPosition: detail.positions.some((p) => p.quantity >= 1),
    consecutiveNoOrderTicks,
    lastConvictionScore,
  };
}

export function isTickerInCooldown(run: AutopilotRun, ticker: string, now: Date): boolean {
  const until = run.cooldownUntilByTicker[ticker];
  return !!until && new Date(until).getTime() > now.getTime();
}

export function cooldownUntil(now: Date): string {
  return new Date(now.getTime() + AUTOPILOT_COOLDOWN_MINUTES * 60_000).toISOString();
}

export type AutopilotRotationPlan = {
  /** 교체 회수 대상(완료 patch + 쿨다운 등록 + 슬롯 비움). */
  replacements: Array<{ slotIndex: number; sessionId: string; ticker: string; reason: string }>;
  /** 채움 대상(자식 세션 생성) — 빈 슬롯 순서대로, 스윕당 상한 적용 후. */
  fills: Array<{ slotIndex: number; candidate: AutopilotCandidate }>;
  /** 외부 종료(마감 스윕·수동 중지·소멸) 감지로 비우는 슬롯. */
  reconciled: Array<{ slotIndex: number; sessionId: string; ticker: string; note: string }>;
  events: AutopilotRotationEvent[];
};

/**
 * 스윕 1회의 로테이션 계획 산출.
 *
 * @param input.slotViews 슬롯 sessionId → 세션 뷰. 조회 실패(store 소멸)면 키 부재.
 * @param input.stage1Ranking 하드필터 통과 전 종목(1차 점수순) — 교체 순위 판정 기준.
 *   빈 배열 = 스크리너 미가용 → 교체 판정 skip(빈 슬롯 reconcile 만 수행).
 * @param input.fillRanking 2차 점수까지 산출된 fill 후보(최종 점수순).
 */
export function planRotation(input: {
  run: AutopilotRun;
  slotViews: Map<string, AutopilotSlotSessionView>;
  stage1Ranking: AutopilotCandidate[];
  fillRanking: AutopilotCandidate[];
  now: Date;
}): AutopilotRotationPlan {
  const { run, slotViews, stage1Ranking, fillRanking, now } = input;
  const nowIso = now.toISOString();
  const hhmm = kstHhmmOf(now);
  const fillWindowOpen = hhmm >= AUTOPILOT_FIRST_FILL_HHMM && hhmm < AUTOPILOT_NO_NEW_FILL_HHMM;

  const plan: AutopilotRotationPlan = { replacements: [], fills: [], reconciled: [], events: [] };
  const rankIndexByTicker = new Map(stage1Ranking.map((c, i) => [c.ticker, i]));
  /** 이번 스윕 후에도 슬롯에 남는(또는 새로 채워질) 티커 — fill 중복 배제. */
  const occupiedTickers = new Set<string>();
  const emptySlotIndexes: number[] = [];

  // ① reconcile + 교체 판정 — 슬롯별 현재 상태 정리.
  for (const slot of run.slots) {
    if (!slot.sessionId || !slot.ticker) {
      emptySlotIndexes.push(slot.slotIndex);
      continue;
    }
    const view = slotViews.get(slot.sessionId);
    if (!view || view.status !== "running") {
      // 외부 종료(15:41 마감·수동 중지·크로스데이 정리) 또는 store 소멸 — 슬롯만 비운다.
      plan.reconciled.push({
        slotIndex: slot.slotIndex,
        sessionId: slot.sessionId,
        ticker: slot.ticker,
        note: view ? `세션 ${view.status}` : "세션 소멸",
      });
      plan.events.push({
        at: nowIso,
        kind: "reconcile",
        slotIndex: slot.slotIndex,
        outgoing: {
          sessionId: slot.sessionId,
          ticker: slot.ticker,
          reason: view ? `세션 ${view.status}` : "세션 소멸",
        },
      });
      emptySlotIndexes.push(slot.slotIndex);
      continue;
    }

    // 포지션 보유 = 불가침. 청산은 자식 세션 몫 — flat 후 다음 스윕에서 재평가.
    if (view.hasPosition) {
      occupiedTickers.add(view.ticker);
      continue;
    }

    // 교체 판정 — fill 창 안 + 랭킹 존재 + 대체 후보 존재할 때만(회수만 하고 못 채우는 낭비 방지).
    let replaceReason: string | null = null;
    if (fillWindowOpen && stage1Ranking.length > 0) {
      const rankIndex = rankIndexByTicker.get(view.ticker);
      if (rankIndex === undefined || rankIndex >= AUTOPILOT_REPLACE_RANK_THRESHOLD) {
        replaceReason =
          rankIndex === undefined ? "스코어 탈락(랭킹 밖)" : `스코어 탈락(랭킹 ${rankIndex + 1}위)`;
      } else if (
        view.consecutiveNoOrderTicks >= AUTOPILOT_STAGNANT_TICKS &&
        (view.lastConvictionScore ?? 0) <= AUTOPILOT_STAGNANT_CONVICTION_MAX
      ) {
        replaceReason = `정체(무주문 ${view.consecutiveNoOrderTicks}틱·conviction ${view.lastConvictionScore ?? "—"})`;
      }
    }
    if (replaceReason) {
      plan.replacements.push({
        slotIndex: slot.slotIndex,
        sessionId: view.sessionId,
        ticker: view.ticker,
        reason: replaceReason,
      });
      emptySlotIndexes.push(slot.slotIndex);
      // 회수 티커는 쿨다운 대상 — 이번 스윕 fill 에서도 제외.
      occupiedTickers.add(view.ticker);
    } else {
      occupiedTickers.add(view.ticker);
    }
  }

  // ② fill — 빈 슬롯을 최종 점수 순으로 채운다(창·상한·쿨다운·중복 배제).
  if (fillWindowOpen && emptySlotIndexes.length > 0 && fillRanking.length > 0) {
    // 교체로 비워진 슬롯이 뒤에 push 됐을 수 있어 슬롯 순서로 정렬(표시 안정).
    emptySlotIndexes.sort((a, b) => a - b);
    const usable = fillRanking.filter(
      (c) =>
        !occupiedTickers.has(c.ticker) &&
        !isTickerInCooldown(run, c.ticker, now) &&
        c.finalScore !== undefined,
    );
    const fillCount = Math.min(
      emptySlotIndexes.length,
      usable.length,
      AUTOPILOT_MAX_FILLS_PER_SWEEP,
    );
    for (let i = 0; i < fillCount; i++) {
      plan.fills.push({ slotIndex: emptySlotIndexes[i], candidate: usable[i] });
      occupiedTickers.add(usable[i].ticker);
    }
  }

  // ③ 무행동 사유 기록 — "왜 아무것도 안 했나"를 관측 가능하게.
  if (plan.fills.length === 0 && emptySlotIndexes.length > 0) {
    plan.events.push({
      at: nowIso,
      kind: "skip",
      slotIndex: null,
      note: !fillWindowOpen
        ? `fill 창 밖(${hhmm})`
        : fillRanking.length === 0
          ? "fill 후보 없음(스크리너 미가용/후보 전멸)"
          : "가용 후보 없음(쿨다운·중복 제외)",
    });
  }

  return plan;
}
