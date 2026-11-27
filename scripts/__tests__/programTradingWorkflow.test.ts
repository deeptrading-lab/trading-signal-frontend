import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createProgramTradingWorkflow } from "../programTradingWorkflow";

const template = readFileSync("docs/program-trading/rules.template.html", "utf8");
const make = (view: Parameters<typeof createProgramTradingWorkflow>[1]) => createProgramTradingWorkflow(template, view, "b".repeat(40));

describe("거래량 기준 자동매매 도식", () => {
  it("브라우저의 상태 조회와 두 토스 호출을 구별한다", () => {
    const diagram = make("summary");
    const steps = diagram.mainPath.map(id => diagram.nodes.find(node => node.id === id)?.sublabel);
    expect(steps).toEqual(expect.arrayContaining([
      expect.stringContaining("GET은 로컬 상태 조회"),
      expect.stringContaining("GET /api/v1/rankings"),
      expect.stringContaining("GET /api/v1/prices"),
    ]));
    expect(diagram.nodes.find(node => node.label === "429")?.sublabel).toContain("요청 폐기");
  });

  it("후보 미충족 경로가 가상 체결에 이어지지 않는다", () => {
    const diagram = make("buy");
    for (const id of ["step1", "step2", "step3", "step4", "step6"]) {
      expect(diagram.edges).toContainEqual(expect.objectContaining({ from: id, to: `${id}-alternate`, role: "branch" }));
      expect(diagram.edges.find(edge => edge.from === `${id}-alternate`)).toBeUndefined();
    }
    expect(diagram.nodes.at(-1)?.label).toBe("정수 주를 순위대로 가상 체결");
  });

  it("보유가 모두 해소된 다음 세션 손익을 판단한다", () => {
    const diagram = make("sell");
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: "step4", to: "step5" }));
    expect(diagram.nodes.find(node => node.id === "step5-alternate")?.label).toContain("보유 중");
    expect(diagram.nodes.find(node => node.id === "step5-alternate")?.sublabel).toContain("별도 후보 조회");
    expect(diagram.nodes.find(node => node.id === "step6-alternate")?.label).toBe("세션 한도 미도달");
  });

  it("최종 조회 실패도 마지막 가격으로 가상 청산과 원장 기록에 이어진다", () => {
    const diagram = make("settlement");
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: "step2", to: "step2-alternate" }));
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: "step2-alternate", to: "step3" }));
    expect(diagram.nodes.find(node => node.id === "step2-alternate")?.sublabel).toContain("마지막 유효 가격");
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: "step3", to: "step4" }));
  });
});
