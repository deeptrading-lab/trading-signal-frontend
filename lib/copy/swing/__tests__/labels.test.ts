/** 스윙 체크 카피 — 수치 설명·과거 통계 문장·체크리스트 모드 금지어 회귀 차단(PRD swing-judgment PR-3). */

import { describe, expect, it } from "vitest";
import * as copy from "../labels";
import {
  describeExclusion,
  describeItem,
  swingCountLabel,
  swingDateLabel,
  swingStatsSentence,
} from "../labels";
import type { SwingJudgment } from "@/lib/swing/judge";
import { RULEBOOK } from "@/lib/swing/rulebook";
import type { SwingStatsCell } from "@/lib/types/swing/api";

const judgment = (over: Partial<SwingJudgment> = {}, features: Record<string, unknown> = {}) =>
  ({
    market: "KOSPI",
    stage: "range",
    plan: { rr: 1.834, stopSource: "zone" },
    doubleBottom: null,
    ...over,
    features: {
      adv20: 1e10,
      atrPct: 7.04,
      r20Pct: 23.4,
      rsi: 77.2,
      dev250Pct: -4.25,
      macdCrossAgo: 2,
      maCrossAgo: null,
      dartReports: ["주요사항보고서(유상증자결정)"],
      flow: { person: -0.1, foreign: 0.15, institution: 0.08, pension: 0.02, privateEquity: -0.003 },
      ...features,
    },
  }) as unknown as SwingJudgment;

describe("describeExclusion — 실측값 + 기준값", () => {
  it("고변동은 ATR% 와 시장별 기준", () => {
    expect(describeExclusion("high_volatility", judgment(), RULEBOOK)).toBe(
      "하루 평균 변동폭(ATR) 7.0% (KOSPI 기준 4.97% 이상)",
    );
  });
  it("과열은 20일 수익률·RSI 와 기준", () => {
    expect(describeExclusion("overheated", judgment(), RULEBOOK)).toBe(
      "20일 수익률 +23.4% · RSI 77 (기준: 20% 이상 또는 RSI 75 이상)",
    );
  });
  it("공시는 보고서명에서 접두어·괄호를 걷어 낸다", () => {
    expect(describeExclusion("dart_event", judgment(), RULEBOOK)).toBe("최근 20거래일 공시: 유상증자결정");
  });
  it("거래대금 부족은 억 원 단위(부호 없음)", () => {
    expect(describeExclusion("illiquid", judgment({}, { adv20: 2.1e9 }), RULEBOOK)).toBe(
      "최근 20일 평균 거래대금 21억 원 (기준 30억 원)",
    );
  });
});

describe("describeItem — 수급 강도 S × ADV20 = 순매수 금액", () => {
  it("개인·외국인·기관·사모 금액(억 원, 부호)", () => {
    const j = judgment();
    expect(describeItem("A1", j, RULEBOOK)).toBe("5일 순매수 −10억 원");
    expect(describeItem("A2", j, RULEBOOK)).toBe("5일 순매수 +15억 원");
    expect(describeItem("A3", j, RULEBOOK)).toBe("기관 +8.0억 원 · 사모 −0.3억 원");
  });
  it("1만 억 이상은 천 단위 구분", () => {
    expect(describeItem("A3", judgment({}, { adv20: 1.3e13 }), RULEBOOK)).toBe("기관 +10,400억 원 · 사모 −390억 원");
  });
  it("수급 없으면 안내 문구", () => {
    expect(describeItem("A1", judgment({}, { flow: null }), RULEBOOK)).toBe("수급 데이터 없음");
  });
  it("B 손익비·지지 근거, C 국면·1년 평균 대비, D 교차 시점·RSI, E 쌍바닥", () => {
    const j = judgment();
    expect(describeItem("B", j, RULEBOOK)).toBe("손익비 1.83 · 지지 근거 매물대");
    expect(describeItem("C", j, RULEBOOK)).toBe("횡보 · 1년 평균 대비 −4.3%");
    expect(describeItem("D", j, RULEBOOK)).toBe("MACD 교차 2일 전 · RSI 77");
    expect(describeItem("E", j, RULEBOOK)).toBe("쌍바닥 없음");
    expect(describeItem("B", judgment({ plan: null }), RULEBOOK)).toBe("계산 불가");
  });
});

describe("swingStatsSentence", () => {
  const cell = {
    n: 1354,
    hidden: false,
    upRate: 0.468,
    baseUpRate: 0.435,
    meanExcess10: 0.002458,
  } as SwingStatsCell;
  it("n·상승 비율·같은 날 전체 비교·초과 평균(%p)", () => {
    expect(swingStatsSentence(cell, "수급·국면 충족")).toBe(
      "과거 '수급·국면 충족' 1,354건 — 10일 뒤 오른 비율 47%(같은 날 전체 44%), 같은 날 전체 대비 평균 +0.25%p",
    );
  });
  it("n < 30(hidden)·셀 없음이면 null", () => {
    expect(swingStatsSentence({ ...cell, hidden: true }, "x")).toBeNull();
    expect(swingStatsSentence(null, "x")).toBeNull();
  });
});

describe("날짜·개수", () => {
  it("swingDateLabel — 요일 포함", () => {
    expect(swingDateLabel("2026-10-30")).toBe("10월 30일(금)");
    expect(swingDateLabel("2026-11-02")).toBe("11월 2일(월)");
  });
  it("swingCountLabel — 상한 도달 시 상위 n개", () => {
    expect(swingCountLabel(3)).toBe("3개 · 거래대금 순");
    expect(swingCountLabel(50)).toBe("거래대금 상위 50개");
  });
});

describe("체크리스트 모드 금지어", () => {
  // 매수 추천으로 읽히는 표현 금지(디자인 swing-ui Do's and Don'ts). 면책 문구의 "보장하지 않아요"는 허용.
  const BANNED = /매수 후보|추천|확실|지금 사|매수하세요|매도하세요|손절가|목표가/;
  const strings = Object.values(copy).flatMap((v) =>
    typeof v === "string" ? [v] : typeof v === "object" && v !== null ? Object.values(v).filter((x) => typeof x === "string") : [],
  );
  it("화면 카피 상수에 금지어가 없다", () => {
    expect(strings.length).toBeGreaterThan(20);
    expect(strings.filter((s) => BANNED.test(s))).toEqual([]);
  });
});
