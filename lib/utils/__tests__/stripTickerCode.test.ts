/**
 * stripTickerCode — 분석 대상 티커 코드 노출 제거 단위 테스트.
 *
 * 핵심 계약:
 * - 괄호 포함 `(017670)` / 독립 `017670` / 접미 `017670.KS` 제거.
 * - **분석 대상 티커만** 제거 → 가격·연도·타 종목 코드는 오탐 없이 유지.
 * - 빈 티커/무관 텍스트는 원문 그대로. 특수문자 티커 이스케이프.
 */

import { describe, it, expect } from "vitest";
import { stripTickerCode } from "@/lib/utils/stripTickerCode";

describe("stripTickerCode", () => {
  it("괄호 포함 코드 `(017670)` 를 괄호째 제거한다", () => {
    expect(
      stripTickerCode("SK텔레콤(017670)에 대한 펀더멘털 리서치", "017670"),
    ).toBe("SK텔레콤에 대한 펀더멘털 리서치");
  });

  it("괄호 앞뒤 공백이 있어도 이중공백을 남기지 않는다", () => {
    expect(stripTickerCode("SK텔레콤 (017670) 분석", "017670")).toBe(
      "SK텔레콤 분석",
    );
  });

  it("독립 코드 `017670` 를 단어 경계로 제거한다", () => {
    expect(stripTickerCode("종목코드 017670 분석", "017670")).toBe(
      "종목코드 분석",
    );
  });

  it("거래소 접미 `017670.KS` 를 접미까지 함께 제거한다", () => {
    expect(stripTickerCode("017670.KS 종목", "017670")).toBe("종목");
    expect(stripTickerCode("(017670.KQ) 요약", "017670")).toBe("요약");
  });

  it("문장 중간·행 반복 노출을 모두 제거한다", () => {
    expect(
      stripTickerCode("017670 은 통신주다. 017670(017670) 재확인", "017670"),
    ).toBe("은 통신주다. 재확인");
  });

  it("티커가 빈 문자열/공백/undefined 면 원문 그대로", () => {
    const text = "SK텔레콤(017670) 분석";
    expect(stripTickerCode(text, "")).toBe(text);
    expect(stripTickerCode(text, "   ")).toBe(text);
    expect(stripTickerCode(text, undefined)).toBe(text);
    expect(stripTickerCode(text, null)).toBe(text);
  });

  it("빈 텍스트는 안전하게 빈 문자열", () => {
    expect(stripTickerCode("", "017670")).toBe("");
  });

  it("텍스트에 해당 티커가 없으면 원문을 그대로 반환한다(정리 미적용)", () => {
    const text = "현재가  84900원 목표 92000원"; // 이중공백 의도 — 미변경 확인
    expect(stripTickerCode(text, "017670")).toBe(text);
  });

  it("오탐 방지 — 가격/연도/타 종목 코드는 유지", () => {
    // 대상 티커(005930)만 제거, 가격(84900)·연도(2024)·타 코드(017670)는 유지.
    expect(
      stripTickerCode(
        "삼성전자(005930) 현재가 84900원, 2024년 실적, 비교 017670",
        "005930",
      ),
    ).toBe("삼성전자 현재가 84900원, 2024년 실적, 비교 017670");
  });

  it("코드가 더 큰 숫자 토큰의 일부이면 제거하지 않는다", () => {
    // 3017670 / 0176700 / 1.017670 안에는 017670 이 포함되지만 독립 토큰이 아니므로 유지.
    const text = "값 3017670 과 0176700 그리고 비율 1.017670 유지";
    expect(stripTickerCode(text, "017670")).toBe(text);
  });

  it("코드만 있는 텍스트는 빈 문자열로 정리된다", () => {
    expect(stripTickerCode("017670", "017670")).toBe("");
    expect(stripTickerCode("(017670)", "017670")).toBe("");
  });

  it("정규식 특수문자 티커를 리터럴로 이스케이프한다", () => {
    // `+` 가 수량자로 처리되면 오작동 — 리터럴 매칭만 되고 AxB 는 유지되어야 한다.
    expect(stripTickerCode("A+B and AxB", "A+B")).toBe("and AxB");
  });

  it("여러 줄 텍스트의 개행 구조를 보존한다", () => {
    const input = "1줄 017670 끝\n2줄 유지\n3줄 017670";
    expect(stripTickerCode(input, "017670")).toBe("1줄 끝\n2줄 유지\n3줄");
  });
});
