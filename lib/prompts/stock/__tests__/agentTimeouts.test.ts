/**
 * 타임아웃 상한 불변식 회귀.
 *
 * 배경: 단계별 상한의 합(최악 경로)과 전체 상한이 **정확히 3,000,000ms 로 같아 슬랙이 0** 이었다.
 * 이 상태에서 단계 상한만 올리면 전체 abort 가 먼저 터져, 단계별 실패 사유(timeout/cli-error)가
 * 아니라 "중지"로 끝나 원인이 지워진다. 실제로 최종 단계(portfolio_manager)에서만 타임아웃 나는
 * 실행이 반복 관측됐다(한미약품 등). 상한을 올릴 때 둘 중 하나만 고치는 것을 막는다.
 */

import { describe, it, expect } from "vitest";
import {
  AGENT_PROMPTS,
  TIMEOUT_TOTAL_MS,
  WORST_CASE_STAGE_MS,
} from "@/lib/prompts/stock/aiAnalysis";

describe("에이전트 타임아웃 상한", () => {
  it("전체 상한은 최악 경로(단계 상한 합)보다 커야 한다", () => {
    expect(TIMEOUT_TOTAL_MS).toBeGreaterThan(WORST_CASE_STAGE_MS);
  });

  it("전체 상한에 최소 5% 안전마진이 있다(슬랙 0 재발 방지)", () => {
    const slackPct = ((TIMEOUT_TOTAL_MS - WORST_CASE_STAGE_MS) / WORST_CASE_STAGE_MS) * 100;
    expect(slackPct).toBeGreaterThanOrEqual(5);
  });

  it("portfolio_manager 는 가장 긴 상한을 갖는다(최대 입력·최대 출력 단계)", () => {
    const pm = AGENT_PROMPTS.portfolio_manager.timeoutMs;
    for (const [key, prompts] of Object.entries(AGENT_PROMPTS)) {
      if (key === "portfolio_manager") continue;
      expect(prompts.timeoutMs).toBeLessThanOrEqual(pm);
    }
  });

  it("PM 상한은 실측 최대(405s)의 2배 이상 — 프롬프트 증량에 따른 드리프트 흡수", () => {
    expect(AGENT_PROMPTS.portfolio_manager.timeoutMs).toBeGreaterThanOrEqual(405_000 * 2);
  });
});
