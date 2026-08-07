/**
 * 다음 자동 판단(틱) 예정 시각 판정 — 순수 util. intraday-live-refresh.
 *
 * 판단은 5분 주기라 그 사이에는 표가 멈춘 것처럼 보인다. "다음 판단 14:05 예정" 을 보여주면 화면이
 * 죽은 건지 아직 때가 안 된 건지 바로 구분된다.
 *
 * ── 서버 규칙 미러 (직접 확인함) ─────────────────────────────────────────────
 * - `sessionStore.resolveNextTickWindow` 는 cli-agent 면 `floorToTickWindow(now, interval)` 를 쓰고,
 *   실제 발화 여부는 `runTick` 의 `tickWindowStart` **동일성 dedup** 이 정한다.
 *   → 다음 판단은 `lastTickWindowStart` **이후 첫 주기 경계** = `floor(last, interval) + interval`.
 *   `last + interval` 이 아니다: 세션 중 주기를 바꾸거나 리스크 스윕(초=30 창)이 끼면 `last` 가
 *   현재 주기에 정렬돼 있지 않다.
 * - AI 판단 틱은 `isKstMarketHours`(평일 09:00~15:30)에서만 돈다. 15:30~15:40 은 리스크 스윕만
 *   도는 구간이라 "다음 판단"은 없다 → 폴링 게이트(15:40)와 **다른 시각을 쓴다**.
 *
 * ⚠️ 서버 `lib/server/paperTrading/time.ts` 를 import 하지 않는다(서버 네임스페이스). floor/add 는
 *    2줄이라 여기 다시 쓰고, 테스트로 서버 기대값에 핀을 박는다.
 * ⚠️ 상대 표기("3분 후")를 쓰지 않는 이유: TanStack 구조적 공유 + memo 행이라 틱 사이엔 재렌더가
 *    없어 카운트다운이 얼어붙는다. 절대 시각은 재렌더 없이도 계속 옳다.
 * ⚠️ 공휴일은 알지 못한다(기존 kstMarketHours 와 동일한 한계) — 휴일엔 "예정"이 떴다가 결국
 *    "판단 끊김"으로 넘어간다.
 */

import { isKstMarketHours } from "@/lib/utils/kstMarketHours";
import { isPaperSessionStalled } from "@/lib/utils/paperTradingStale";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

type TickInput = Pick<
  PaperTradingSession,
  "status" | "tickIntervalMinutes" | "lastTickWindowStart" | "startedAt"
>;

const KST_HHMM_FMT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** KST "HH:mm". */
function kstHhmm(ms: number): string {
  return KST_HHMM_FMT.format(ms);
}

/** KST 기준 그 날 15:30(판단 마지막 창) 의 epoch ms. */
function kstJudgeCutoffMs(ms: number): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);
  return Date.parse(`${parts}T15:30:00+09:00`);
}

/**
 * 다음 틱 창(ISO) — `lastTickWindowStart` 이후 첫 주기 경계. 틱 기록이 없으면 null.
 * 현재 시각과 무관한 순수 산술이다(현재 시각 대비 판정은 `paperNextTickState` 가 한다).
 */
export function nextPaperTickWindowStart(session: TickInput): string | null {
  if (!session.lastTickWindowStart) return null;
  const lastMs = Date.parse(session.lastTickWindowStart);
  if (!Number.isFinite(lastMs)) return null;
  const intervalMs = Math.max(1, session.tickIntervalMinutes) * 60_000;
  // floor 후 +1주기 — last 가 경계에 정렬돼 있지 않아도(주기 변경·리스크 스윕 창) 항상 다음 경계.
  return new Date(Math.floor(lastMs / intervalMs) * intervalMs + intervalMs).toISOString();
}

export type PaperNextTickState =
  /** 세션 없음·완료·실패 — 표시할 다음 판단이 없다. */
  | { kind: "none" }
  /** 일시정지 — 재개 전까지 판단 없음. */
  | { kind: "paused" }
  /** 장외·주말·15:30 이후 — 오늘은 더 판단하지 않는다. */
  | { kind: "closed" }
  /** 예정 시각이 지났고 곧 발화(스케줄러 폴 60초 + 분석 시간). */
  | { kind: "due" }
  /** 판단 끊김 — StatusPill 이 이미 알리므로 예정 줄은 비운다. */
  | { kind: "stalled" }
  /** 다음 판단 예정. */
  | { kind: "scheduled"; at: string; hhmm: string };

export function paperNextTickState(
  session: TickInput | null | undefined,
  now: Date = new Date(),
): PaperNextTickState {
  if (!session) return { kind: "none" };
  if (session.status === "completed" || session.status === "failed") return { kind: "none" };
  // 일시정지를 장 마감보다 **먼저** 본다 — 장외의 일시정지 세션이 "장 마감"으로 보이면 안 된다.
  if (session.status === "paused") return { kind: "paused" };
  if (!isKstMarketHours(now)) return { kind: "closed" };
  if (isPaperSessionStalled(session, now)) return { kind: "stalled" };

  const nextIso = nextPaperTickWindowStart(session);
  // 아직 틱 기록이 없음(생성 POST 가 타임아웃됐지만 서버는 성공한 경우 등) — 곧 발화.
  if (!nextIso) return { kind: "due" };

  const nextMs = Date.parse(nextIso);
  const nowMs = now.getTime();
  if (nextMs <= nowMs) return { kind: "due" };
  // 15:30 이후 창은 AI 판단이 돌지 않는다(리스크 스윕만).
  if (nextMs > kstJudgeCutoffMs(nowMs)) return { kind: "closed" };

  return { kind: "scheduled", at: nextIso, hhmm: kstHhmm(nextMs) };
}
