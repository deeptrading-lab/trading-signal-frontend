/**
 * normalizeDecisionEnums 회귀 — confidence·time_horizon 관대 정규화와 폴백 통지를 고정한다.
 *
 * 배경: 정확일치 폴백이 조용히 기본값으로 덮어 저장 결정 50건이 confidence 100% MEDIUM ·
 * time_horizon 100% 중기 로 고정됐던 사건(같은 응답의 verdict 는 정상 분산). 아래 케이스가
 * 그 회귀(정규 표기 외 변형이 전부 기본값으로 삼켜지는 것)를 잡는다.
 */

import { describe, it, expect, vi } from "vitest";
import {
  normalizeConfidence,
  normalizeTimeHorizon,
} from "@/lib/server/ai/normalizeDecisionEnums";

describe("normalizeConfidence", () => {
  it("[정규 표기] 영문 대문자는 그대로", () => {
    expect(normalizeConfidence("HIGH")).toBe("HIGH");
    expect(normalizeConfidence("MEDIUM")).toBe("MEDIUM");
    expect(normalizeConfidence("LOW")).toBe("LOW");
  });

  it("[회귀] 소문자·혼합·공백 변형을 흡수(과거엔 전부 MEDIUM 으로 삼켜짐)", () => {
    expect(normalizeConfidence("high")).toBe("HIGH");
    expect(normalizeConfidence("Low")).toBe("LOW");
    expect(normalizeConfidence("  HIGH  ")).toBe("HIGH");
  });

  it("[회귀] 한글 동의어를 흡수 — 프롬프트가 한국어 서술을 강제해 모델이 한글로 낼 수 있음", () => {
    expect(normalizeConfidence("높음")).toBe("HIGH");
    expect(normalizeConfidence("중간")).toBe("MEDIUM");
    expect(normalizeConfidence("낮음")).toBe("LOW");
  });

  it("[폴백] 해석 불가·누락은 MEDIUM 이되 반드시 통지한다(조용한 폴백 금지)", () => {
    const report = vi.fn();
    expect(normalizeConfidence("확신함", report)).toBe("MEDIUM");
    expect(normalizeConfidence(undefined, report)).toBe("MEDIUM");
    expect(normalizeConfidence(null, report)).toBe("MEDIUM");
    expect(normalizeConfidence(3, report)).toBe("MEDIUM");
    expect(normalizeConfidence("", report)).toBe("MEDIUM");
    expect(report).toHaveBeenCalledTimes(5);
    expect(report.mock.calls[0][0]).toBe("confidence");
  });

  it("[폴백] 정상 값이면 통지하지 않는다", () => {
    const report = vi.fn();
    normalizeConfidence("high", report);
    normalizeConfidence("높음", report);
    expect(report).not.toHaveBeenCalled();
  });
});

describe("normalizeTimeHorizon", () => {
  it("[정규 표기] 한글 enum 은 그대로", () => {
    expect(normalizeTimeHorizon("단기")).toBe("단기");
    expect(normalizeTimeHorizon("중기")).toBe("중기");
    expect(normalizeTimeHorizon("장기")).toBe("장기");
  });

  it("[회귀] 영문 변형을 흡수", () => {
    expect(normalizeTimeHorizon("short")).toBe("단기");
    expect(normalizeTimeHorizon("Long-Term")).toBe("장기");
    expect(normalizeTimeHorizon("mid_term")).toBe("중기");
    expect(normalizeTimeHorizon(" 장기 ")).toBe("장기");
  });

  it("[폴백] 해석 불가·누락은 중기 이되 통지한다", () => {
    const report = vi.fn();
    expect(normalizeTimeHorizon("6개월", report)).toBe("중기");
    expect(normalizeTimeHorizon(undefined, report)).toBe("중기");
    expect(report).toHaveBeenCalledTimes(2);
    expect(report.mock.calls[0][0]).toBe("time_horizon");
  });
});
