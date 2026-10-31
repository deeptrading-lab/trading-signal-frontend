import { describe, it, expect } from "vitest";
import { compareJudgments, gradeOf, judgeSwing, type SwingItems, type SwingJudgment } from "../judge";
import { RULEBOOK, type Rulebook } from "../rulebook";
import { flatCloses, makeInput, ramp } from "./_swingFixtures";

const rb = RULEBOOK;

/** 수급 A 를 통과하는 입력 — 개인 −, 외국인 +, 기관 +(사모 0), 연기금 +. */
const strongFlow = { lastN: 5, nets: { person: -1_000, foreign: 600, institution: 500, pension: 100, privateEquity: 0 } };

describe("judgeSwing — 결정성", () => {
  it("같은 입력이면 같은 출력(deep equal)", () => {
    const input = makeInput([...flatCloses(10_000, 280), ...ramp(10_000, 10_300, 40)], { flow: strongFlow });
    expect(judgeSwing(input)).toEqual(judgeSwing(structuredClone(input)));
  });

  it("창 불변성 — 600봉을 넣어도 마지막 300봉만 넣은 것과 같다", () => {
    const input = makeInput([...flatCloses(10_000, 560, 40), ...ramp(10_000, 10_400, 40)], { flow: strongFlow });
    const tail = { ...input, bars: input.bars.slice(-300) };
    expect(judgeSwing(input)).toEqual(judgeSwing(tail));
  });
});

describe("judgeSwing — 수급 조건", () => {
  it("개인 −, 외국인 +, 기관 + 면 A 통과, 연기금 + 면 A+", () => {
    const j = judgeSwing(makeInput(flatCloses(10_000, 320), { flow: strongFlow }));
    expect(j.items.A1.pass).toBe(true);
    expect(j.items.A2.pass).toBe(true);
    expect(j.items.A3.pass).toBe(true);
    expect(j.items.A.pass).toBe(true);
    expect(j.items.Aplus.pass).toBe(true);
  });

  it("기관 순매수의 절반 이상이 사모면 A3 탈락", () => {
    const j = judgeSwing(
      makeInput(flatCloses(10_000, 320), {
        flow: { lastN: 5, nets: { person: -1_000, foreign: 600, institution: 500, privateEquity: 250 } },
      }),
    );
    expect(j.items.A3.pass).toBe(false);
    expect(j.items.A.pass).toBe(false);
    expect(j.grade).toBe("neutral");
  });

  it("문턱 — 5일 강도 0.10(=0.02×5) 경계", () => {
    // 거래대금 100억/일 → 5일 합 10억(=1,000백만원) 이 정확히 0.10.
    const at = judgeSwing(makeInput(flatCloses(10_000, 320), { flow: { lastN: 5, nets: { foreign: 200, institution: 200, person: -200 } } }));
    expect(at.items.A2.pass).toBe(true);
    const below = judgeSwing(makeInput(flatCloses(10_000, 320), { flow: { lastN: 5, nets: { foreign: 199, institution: 200, person: -200 } } }));
    expect(below.items.A2.pass).toBe(false);
  });

  it("N=10 변형은 수급 조건만 바꾼다", () => {
    const input = makeInput(flatCloses(10_000, 320), { flow: strongFlow });
    const n10: Rulebook = { ...rb, version: "swing-v1-n10", flow: { ...rb.flow, days: 10 } };
    const a = judgeSwing(input);
    const b = judgeSwing(input, n10);
    const nonFlow = (j: SwingJudgment) => ({ B: j.items.B, C: j.items.C, D: j.items.D, E: j.items.E });
    expect(nonFlow(b)).toEqual(nonFlow(a));
    expect(b.plan).toEqual(a.plan);
    expect(b.stage).toBe(a.stage);
  });
});

describe("judgeSwing — 제외", () => {
  it("거래대금 20일 평균 30억 미만이면 illiquid", () => {
    const j = judgeSwing(makeInput(flatCloses(10_000, 320), { flow: { tradingValue: 2_999_999_999 } }));
    expect(j.exclusions).toContain("illiquid");
    expect(j.grade).toBe("excluded");
  });

  it("일봉 300개 미만이면 insufficient_data — 조건은 계산 가능한 만큼 채운다", () => {
    const j = judgeSwing(makeInput(flatCloses(10_000, 200), { flow: strongFlow }));
    expect(j.exclusions).toContain("insufficient_data");
    expect(j.items.A.pass).toBe(true);
  });

  it("스팩·리츠는 제외, 메리츠금융지주는 아니다", () => {
    const of = (name: string) => judgeSwing(makeInput(flatCloses(10_000, 320), { name })).exclusions;
    expect(of("엔에이치스팩29호")).toContain("spac_reit");
    expect(of("제이알글로벌리츠")).toContain("spac_reit");
    expect(of("메리츠금융지주")).not.toContain("spac_reit");
  });

  it("과열(20일 +20% 이상)이면 overheated 로 제외", () => {
    const j = judgeSwing(makeInput([...flatCloses(10_000, 290), ...ramp(10_000, 12_500, 30)]));
    expect(j.stage).toBe("overheated");
    expect(j.exclusions).toContain("overheated");
  });
});

describe("gradeOf — 등급 진리표", () => {
  const T = { pass: true };
  const F = { pass: false };
  const N = { pass: null };
  const items = (o: Partial<SwingItems>): SwingItems => ({ A1: T, A2: T, A3: T, Aplus: F, A: T, B: F, C: T, D: F, E: F, ...o });

  it("제외가 하나라도 있으면 excluded", () => {
    expect(gradeOf(["dart_event"], items({ B: T, D: T }))).toBe("excluded");
  });
  it("A ∧ C ∧ B ∧ (D ∨ E) = candidate", () => {
    expect(gradeOf([], items({ B: T, D: T }))).toBe("candidate");
    expect(gradeOf([], items({ B: T, E: T }))).toBe("candidate");
  });
  it("A ∧ C ∧ (B ∨ D ∨ E) 이고 candidate 아님 = interest", () => {
    expect(gradeOf([], items({ B: T }))).toBe("interest");
    expect(gradeOf([], items({ D: T }))).toBe("interest");
  });
  it("A 나 C 가 아니면 neutral — 판정 불가(null)도 미충족", () => {
    expect(gradeOf([], items({ A: F, B: T, D: T }))).toBe("neutral");
    expect(gradeOf([], items({ C: N, B: T, D: T }))).toBe("neutral");
    expect(gradeOf([], items({}))).toBe("neutral");
  });
});

describe("compareJudgments — 정렬", () => {
  const j = (ticker: string, grade: SwingJudgment["grade"], pension: boolean, rr: number | null) =>
    ({ ticker, grade, items: { Aplus: { pass: pension } }, plan: rr === null ? null : { rr } }) as unknown as SwingJudgment;

  it("등급 → 연기금 → 손익비 → 종목코드", () => {
    const sorted = [
      j("000003", "interest", true, 3),
      j("000002", "candidate", false, 2),
      j("000001", "candidate", false, 2),
      j("000004", "candidate", true, 1.5),
      j("000005", "candidate", false, 2.5),
    ].sort(compareJudgments);
    expect(sorted.map((x) => x.ticker)).toEqual(["000004", "000005", "000001", "000002", "000003"]);
  });
});
