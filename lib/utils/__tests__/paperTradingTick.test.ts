/**
 * 다음 판단 예정 판정 — intraday-live-refresh.
 *
 * 서버 규칙에 핀을 박는다:
 *  - 다음 창 = `floor(lastTickWindowStart, interval) + interval` (창 dedup 이 동일성 비교라,
 *    주기 변경·리스크 스윕(초=30) 으로 last 가 어긋나 있어도 항상 다음 **경계**여야 한다)
 *  - AI 판단은 15:30 까지만(그 뒤 15:40 까지는 리스크 스윕 전용 구간)
 */
import { describe, expect, it } from "vitest";
import {
  nextPaperTickWindowStart,
  paperNextTickState,
} from "@/lib/utils/paperTradingTick";

// 2026-07-06 = 월요일. 05:00Z = 14:00 KST(장중). 2026-07-04 = 토요일.
const marketNow = new Date("2026-07-06T05:00:00.000Z"); // 14:00 KST
const weekendNow = new Date("2026-07-04T05:00:00.000Z");
const afterJudgeNow = new Date("2026-07-06T06:35:00.000Z"); // 15:35 KST — 판단 종료·스윕 구간

const base = {
  status: "running",
  tickIntervalMinutes: 5,
  startedAt: "2026-07-06T04:00:00.000Z",
} as const;

describe("nextPaperTickWindowStart", () => {
  it("경계에 정렬된 마지막 틱 → 다음 경계", () => {
    expect(
      nextPaperTickWindowStart({ ...base, lastTickWindowStart: "2026-07-06T04:55:00.000Z" }),
    ).toBe("2026-07-06T05:00:00.000Z");
  });

  it("주기 변경으로 어긋난 마지막 틱 → last+주기가 아니라 다음 '경계'", () => {
    // 04:02 에 5분 주기 → 04:07 이 아니라 04:05.
    expect(
      nextPaperTickWindowStart({ ...base, lastTickWindowStart: "2026-07-06T04:02:00.000Z" }),
    ).toBe("2026-07-06T04:05:00.000Z");
  });

  it("리스크 스윕 창(초=30)도 다음 경계로 정렬된다", () => {
    expect(
      nextPaperTickWindowStart({ ...base, lastTickWindowStart: "2026-07-06T04:52:30.000Z" }),
    ).toBe("2026-07-06T04:55:00.000Z");
  });

  it("틱 기록이 없으면 null", () => {
    expect(nextPaperTickWindowStart({ ...base, lastTickWindowStart: null })).toBeNull();
  });
});

describe("paperNextTickState", () => {
  it("정상 진행 → 예정 시각(KST)", () => {
    const state = paperNextTickState(
      { ...base, lastTickWindowStart: "2026-07-06T05:00:00.000Z" },
      marketNow,
    );
    expect(state).toEqual({
      kind: "scheduled",
      at: "2026-07-06T05:05:00.000Z",
      hhmm: "14:05",
    });
  });

  it("예정 시각이 지났으면 곧 판단", () => {
    // last 04:50 → 다음 04:55, now 05:00 → 이미 지남.
    expect(
      paperNextTickState({ ...base, lastTickWindowStart: "2026-07-06T04:50:00.000Z" }, marketNow)
        .kind,
      // 단, 2주기+2분(12분) 을 넘지 않아 '끊김'은 아니다.
    ).toBe("due");
  });

  it("방금 시작해 틱 기록이 아직 없으면 곧 판단", () => {
    // 생성 POST 가 클라 타임아웃됐지만 서버는 성공한 경우 등. 시작 직후라 '끊김'은 아니다.
    expect(
      paperNextTickState(
        { ...base, startedAt: "2026-07-06T04:58:00.000Z", lastTickWindowStart: null },
        marketNow,
      ).kind,
    ).toBe("due");
  });

  it("틱 없이 2주기+여유를 넘기면 startedAt 기준으로 끊김 판정", () => {
    expect(
      paperNextTickState({ ...base, lastTickWindowStart: null }, marketNow).kind,
    ).toBe("stalled");
  });

  it("2주기+여유를 넘겨 끊기면 stalled(예정 줄은 비운다)", () => {
    expect(
      paperNextTickState({ ...base, lastTickWindowStart: "2026-07-06T04:40:00.000Z" }, marketNow)
        .kind,
    ).toBe("stalled");
  });

  it("세션 없음·완료·실패는 표시하지 않는다", () => {
    expect(paperNextTickState(null, marketNow).kind).toBe("none");
    expect(
      paperNextTickState(
        { ...base, status: "completed", lastTickWindowStart: "2026-07-06T05:00:00.000Z" },
        marketNow,
      ).kind,
    ).toBe("none");
    expect(
      paperNextTickState(
        { ...base, status: "failed", lastTickWindowStart: "2026-07-06T05:00:00.000Z" },
        marketNow,
      ).kind,
    ).toBe("none");
  });

  it("일시정지는 장외에서도 '장 마감'이 아니라 '일시정지'", () => {
    const paused = {
      ...base,
      status: "paused",
      lastTickWindowStart: "2026-07-06T05:00:00.000Z",
    } as const;
    expect(paperNextTickState(paused, marketNow).kind).toBe("paused");
    expect(paperNextTickState(paused, weekendNow).kind).toBe("paused");
  });

  it("주말·장 마감이면 closed", () => {
    expect(
      paperNextTickState({ ...base, lastTickWindowStart: "2026-07-06T05:00:00.000Z" }, weekendNow)
        .kind,
    ).toBe("closed");
    expect(
      paperNextTickState({ ...base, lastTickWindowStart: "2026-07-06T06:30:00.000Z" }, afterJudgeNow)
        .kind,
    ).toBe("closed");
  });

  it("★ 15:25 장중이어도 다음 창이 15:30 을 넘으면 closed — AI 판단은 15:30 까지", () => {
    // now 15:25 KST(06:25Z), last 15:25 → 다음 15:30. 15:30 자체는 경계라 아직 허용,
    // 다음 창이 15:35 가 되는 케이스가 closed 여야 한다.
    const at1525 = new Date("2026-07-06T06:25:00.000Z");
    expect(
      paperNextTickState({ ...base, lastTickWindowStart: "2026-07-06T06:25:00.000Z" }, at1525),
    ).toMatchObject({ kind: "scheduled", hhmm: "15:30" });

    const at1531 = new Date("2026-07-06T06:31:00.000Z"); // 15:31 KST → 판단 구간 밖
    expect(
      paperNextTickState({ ...base, lastTickWindowStart: "2026-07-06T06:30:00.000Z" }, at1531).kind,
    ).toBe("closed");
  });
});
