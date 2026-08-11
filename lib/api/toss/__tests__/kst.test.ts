/**
 * `lib/api/toss/kst.ts` 단위 테스트.
 *
 * PRD `toss-market-data-adapter` §6 — 토스 캔들 timestamp(시장 로컬 anchor, +09:00 표기)의
 * KST date 키 변환이 표기 오프셋·서버 타임존과 무관하게 안정적인지 회귀 차단:
 *   1. 국내 일봉 anchor(T00:00+09:00) → 같은 날짜
 *   2. 미국 일봉 anchor(T13:00+09:00 = 미국 자정) → 같은 날짜
 *   3. Z(UTC) 표기로 바뀌어도 KST 환산이 맞는다 (slice 였다면 하루 어긋나는 케이스)
 *   4. 분봉 스탬프 "YYYY-MM-DDTHH:mm" — 타임존 접미사 미부착 규약
 */

import { describe, it, expect } from "vitest";
import {
  addDaysToDash,
  isoToKstDate,
  isoToKstMinuteStamp,
  kstDateStartIso,
  ymdToDash,
} from "../kst";

describe("isoToKstDate", () => {
  it("국내 일봉 anchor(T00:00:00+09:00)는 같은 날짜를 돌려준다", () => {
    expect(isoToKstDate("2026-07-02T00:00:00.000+09:00")).toBe("2026-07-02");
  });

  it("미국 일봉 anchor(T13:00:00+09:00 = 미국 자정)도 같은 날짜를 돌려준다", () => {
    expect(isoToKstDate("2026-07-02T13:00:00.000+09:00")).toBe("2026-07-02");
  });

  it("UTC(Z) 표기는 KST(+9h) 로 환산한다 — slice 회귀 차단", () => {
    // 15:00Z = 다음날 00:00 KST. slice(0,10) 이면 "2026-07-01" 로 하루 어긋난다.
    expect(isoToKstDate("2026-07-01T15:00:00Z")).toBe("2026-07-02");
  });

  it("파싱 불가·빈 값은 null", () => {
    expect(isoToKstDate("not-a-date")).toBeNull();
    expect(isoToKstDate(undefined)).toBeNull();
  });
});

describe("isoToKstMinuteStamp", () => {
  it("분봉 키 'YYYY-MM-DDTHH:mm' 를 만든다 (타임존 접미사 없음)", () => {
    expect(isoToKstMinuteStamp("2026-07-02T09:01:00.000+09:00")).toBe(
      "2026-07-02T09:01",
    );
  });

  it("UTC 표기도 KST 로 환산한다", () => {
    expect(isoToKstMinuteStamp("2026-07-02T00:01:00Z")).toBe("2026-07-02T09:01");
  });
});

describe("ymdToDash / addDaysToDash", () => {
  it("YYYYMMDD → YYYY-MM-DD, 이미 dash 형식은 통과", () => {
    expect(ymdToDash("20260702")).toBe("2026-07-02");
    expect(ymdToDash("2026-07-02")).toBe("2026-07-02");
  });

  it("월말·연말 경계를 넘겨 더한다", () => {
    expect(addDaysToDash("2026-06-30", 1)).toBe("2026-07-01");
    expect(addDaysToDash("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("kstDateStartIso", () => {
  it("KST 날짜의 00:00 을 UTC ISO 로 준다(전날 15:00Z)", () => {
    expect(kstDateStartIso("2026-08-03")).toBe("2026-08-02T15:00:00.000Z");
  });

  it("월 경계에서도 어긋나지 않는다", () => {
    expect(kstDateStartIso("2026-08-01")).toBe("2026-07-31T15:00:00.000Z");
  });
});
