import { afterEach, describe, expect, it } from "vitest";
import { hostname } from "os";
import { resolveServerOperator } from "@/lib/server/paperTrading/operator";

const ORIGINAL = process.env.INTRADAY_OPERATOR;

/** env 미설정 시 기대값 — 실제 해석과 동일 규칙(hostname 폴백 → "local", 64자 컷). */
function expectedFallback(): string {
  return (hostname() || "local").slice(0, 64);
}

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.INTRADAY_OPERATOR;
  else process.env.INTRADAY_OPERATOR = ORIGINAL;
});

describe("resolveServerOperator", () => {
  it("INTRADAY_OPERATOR env 를 우선 사용하고 앞뒤 공백을 제거한다", () => {
    process.env.INTRADAY_OPERATOR = "  hayoung  ";
    expect(resolveServerOperator()).toBe("hayoung");
  });

  it("env 미설정이면 os.hostname() 으로 폴백한다", () => {
    delete process.env.INTRADAY_OPERATOR;
    expect(resolveServerOperator()).toBe(expectedFallback());
  });

  it("공백뿐인 env 는 폴백으로 처리한다(빈 값 취급)", () => {
    process.env.INTRADAY_OPERATOR = "   ";
    expect(resolveServerOperator()).toBe(expectedFallback());
  });

  it("64자를 넘으면 잘라 payload/배지 표시를 안정화한다", () => {
    process.env.INTRADAY_OPERATOR = "x".repeat(100);
    expect(resolveServerOperator()).toHaveLength(64);
  });
});
