import { describe, it, expect } from "vitest";
import { judgeSwing } from "@/lib/swing/judge";
import { flatCloses, makeInput, ramp } from "@/lib/swing/__tests__/_swingFixtures";
import { passesPrefilter, swingInputHash } from "../compute";
import { createKisPacer, isTransientKisError } from "../pace";
import { adverseBits, hasAdverseBit, hasItemBit, itemBits, metCount } from "@/lib/swing/itemBits";
import { RULEBOOK } from "@/lib/swing/rulebook";
import { toSwingRow } from "../row";
import { isScreenerRunOk, screenerListDate, swingUniverse } from "../screener";
import { kstToday, pickTradeDate } from "../tradeDate";

const strongFlow = { lastN: 5, nets: { person: -1_000, foreign: 600, institution: 500, pension: 100, privateEquity: 0 } };

describe("toSwingRow — 압축 행", () => {
  const input = makeInput([...flatCloses(10_000, 280), ...ramp(10_000, 10_300, 40)], { flow: strongFlow });
  const j = judgeSwing(input);

  it("같은 판정이면 같은 행(결정성) · 거래일 = 판정 기준일", () => {
    const a = toSwingRow(j, "screener", "abc");
    const b = toSwingRow(judgeSwing(structuredClone(input)), "screener", "abc");
    expect(a).toEqual(b);
    expect(a.trade_date).toBe(input.bars.at(-1)!.date);
    expect(a.rulebook_version).toBe("swing-v1");
  });

  it("조건 비트·충족 수·수급 통과 플래그", () => {
    const row = toSwingRow(j, "screener", "abc");
    expect(hasItemBit(row.items, "A")).toBe(j.items.A.pass === true);
    expect(row.met_count).toBe(metCount(j.items));
    expect(row.flow_pass).toBe(j.items.A.pass === true && j.exclusions.length === 0);
    // 아래 16비트 = 충족 비트, 위쪽 = 불리한 신호(표시 전용).
    expect(row.items & 0xffff).toBe(itemBits(j.items));
    expect(row.items).toBe(itemBits(j.items) | adverseBits(j.features, RULEBOOK));
  });

  it("불리한 신호 — 반대 방향 수급·과열/하락추세·RSI 과매수만, 충족 비트와 안 겹친다", () => {
    const flow = { person: 0.2, foreign: -0.2, institution: 0.2, pension: -0.05, privateEquity: 0.15 };
    const bits = adverseBits({ flow, stage: "downtrend", rsi: 75 }, RULEBOOK);
    for (const k of ["A1", "A2", "A3", "Aplus", "C", "D"] as const) expect(hasAdverseBit(bits, k)).toBe(true);
    expect(hasAdverseBit(bits, "B")).toBe(false);
    expect(hasAdverseBit(bits, "E")).toBe(false);
    expect(bits & 0xffff).toBe(0);
    const calm = adverseBits({ flow: { person: -0.2, foreign: 0.2, institution: 0.2, pension: 0, privateEquity: 0 }, stage: "range", rsi: 55 }, RULEBOOK);
    expect(calm).toBe(0);
  });

  it("충족 수는 연기금(가점)·A(묶음)를 세지 않는다", () => {
    const T = { pass: true };
    const F = { pass: false };
    const items = { A1: T, A2: T, A3: T, Aplus: T, A: T, B: F, C: T, D: F, E: F };
    expect(metCount(items)).toBe(4);
  });
});

describe("swingInputHash · passesPrefilter", () => {
  const input = makeInput(flatCloses(10_000, 320), { flow: strongFlow });

  it("판정 창 밖(300봉 이전) 봉이 바뀌어도 해시는 같고, 창 안 봉이 바뀌면 달라진다", () => {
    const h = swingInputHash(input.bars, input.flow, input.events);
    const outside = structuredClone(input);
    outside.bars[0].close += 1;
    expect(swingInputHash(outside.bars, outside.flow, outside.events)).toBe(h);
    const inside = structuredClone(input);
    inside.bars[inside.bars.length - 1].volume += 1;
    expect(swingInputHash(inside.bars, inside.flow, inside.events)).not.toBe(h);
  });

  it("1차 거르기 — 종가×거래량 20일 평균 ≥ 20억 · 종가 ≥ 1,000", () => {
    const liquid = makeInput(flatCloses(10_000, 30, 0), { candle: { volumes: new Array(30).fill(200_000) } }).bars; // 20억
    const thin = makeInput(flatCloses(10_000, 30, 0), { candle: { volumes: new Array(30).fill(199_999) } }).bars;
    const cheap = makeInput(flatCloses(900, 30, 0), { candle: { volumes: new Array(30).fill(10_000_000) } }).bars;
    expect(passesPrefilter(liquid)).toBe(true);
    expect(passesPrefilter(thin)).toBe(false);
    expect(passesPrefilter(cheap)).toBe(false);
    expect(passesPrefilter(liquid.slice(0, 19))).toBe(false);
  });
});

describe("pickTradeDate · kstToday", () => {
  it("오늘(KST) 보다 이른 마지막 지수 봉 — 장중 오늘 봉은 제외", () => {
    expect(pickTradeDate(["2026-10-29", "2026-10-30", "2026-11-02"], "2026-11-02")).toBe("2026-10-30");
    expect(pickTradeDate(["2026-10-30"], "2026-11-01")).toBe("2026-10-30");
    expect(pickTradeDate([], "2026-11-01")).toBeNull();
  });
  it("UTC 22:20 = 다음 날 07:20 KST", () => {
    expect(kstToday(new Date("2026-11-01T22:20:00Z"))).toBe("2026-11-02");
    expect(kstToday(new Date("2026-11-01T14:59:00Z"))).toBe("2026-11-01");
  });
});

describe("KIS 페이서", () => {
  it("일시 오류 판별 — 초당 제한·토큰·세션 포화·5xx·네트워크", () => {
    expect(isTransientKisError({ detail: { msg_cd: "EGW00201" } })).toBe(true);
    expect(isTransientKisError({ detail: { msg_cd: "OPSQ1002" } })).toBe(true);
    expect(isTransientKisError({ kind: "network" })).toBe(true);
    expect(isTransientKisError({ status: 500 })).toBe(true);
    expect(isTransientKisError({ status: 200, detail: { msg_cd: "OPSQ0002" } })).toBe(false);
    expect(isTransientKisError(new Error("x"))).toBe(false);
  });

  it("일시 오류는 재시도해 성공, 영구 오류는 바로 던진다", async () => {
    const call = createKisPacer(0, 2, 1);
    let n = 0;
    await expect(
      call(async () => {
        n++;
        if (n < 3) throw { status: 503 };
        return "ok";
      }),
    ).resolves.toBe("ok");
    expect(n).toBe(3);
    let m = 0;
    await expect(
      call(async () => {
        m++;
        throw { status: 400 };
      }),
    ).rejects.toEqual({ status: 400 });
    expect(m).toBe(1);
  });
});

describe("swingUniverse · isScreenerRunOk", () => {
  it("스팩·리츠 제외, 메리츠금융지주 포함, 종목코드 순", () => {
    const u = swingUniverse();
    expect(u.some((s) => /스팩/.test(s.name))).toBe(false);
    expect(u.some((s) => /리츠$/.test(s.name))).toBe(false);
    expect(u.some((s) => s.name === "메리츠금융지주")).toBe(true);
    expect(u.map((s) => s.ticker)).toEqual([...u.map((s) => s.ticker)].sort());
  });
  it("완료 = 처리 > 0 이고 실패 ≤ 2%", () => {
    expect(isScreenerRunOk(1_000, 20)).toBe(true);
    expect(isScreenerRunOk(1_000, 21)).toBe(false);
    expect(isScreenerRunOk(0, 0)).toBe(false);
  });
});

describe("screenerListDate — 집계 도중엔 마지막 완료 거래일", () => {
  const done = { at: "x", ok: true, tradeDate: "2026-10-30", version: "swing-v1" };
  it("새 거래일 집계 중(완료 마커는 전날)이면 전날 목록", () => {
    expect(screenerListDate(done, "2026-11-02", "swing-v1")).toBe("2026-10-30");
  });
  it("마커 없음·실패·다른 버전이면 최신 저장일", () => {
    expect(screenerListDate(null, "2026-11-02", "swing-v1")).toBe("2026-11-02");
    expect(screenerListDate({ ...done, ok: false, tradeDate: "2026-11-02" }, "2026-11-02", "swing-v1")).toBe("2026-11-02");
    expect(screenerListDate({ ...done, version: "swing-v2" }, "2026-11-02", "swing-v1")).toBe("2026-11-02");
  });
});
