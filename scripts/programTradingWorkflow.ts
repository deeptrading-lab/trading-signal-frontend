type View = "summary" | "detail" | "buy" | "sell" | "settlement";
type Node = {
  id: string;
  lane: string;
  col: number;
  type: string;
  icon: string;
  label: string;
  sublabel: string;
  width: number;
  sources: { path: string; line: number }[];
};
type Edge = { from: string; to: string; label?: string; role?: string; variant?: string; fromSide?: string; toSide?: string };

function width(label: string, note: string) {
  const units = (value: string) => [...value].reduce((sum, char) => sum + (char.codePointAt(0)! > 127 ? 2 : 1), 0);
  return Math.max(240, units(label) * 6.5 + 24, units(note) * 4.8 + 16);
}

export function createProgramTradingWorkflow(html: string, view: View, revision: string) {
  const section = html.match(new RegExp(`<section data-view="${view === "detail" ? "buy" : view}"><h2>([^<]+)</h2>([\\s\\S]*?)</section>`));
  if (!section) throw new Error(`다이어그램 원본이 없어요: ${view}`);

  const laneLabels: Record<View, string[]> = {
    summary: ["브라우저", "브라우저 자산", "로컬 서버", "토스 랭킹", "가상 체결", "토스 현재가", "오후 수익 확인", "매도 판단", "종료"],
    detail: ["운용 시간", "후보 조회", "후보 조건", "순위", "예산", "가상 체결"],
    buy: ["운용 시간", "후보 조회", "후보 조건", "순위", "예산", "가상 체결"],
    sell: ["토스 현재가", "오후 수익 확인", "종목 손익", "가상 매도", "남은 보유", "세션 손익"],
    settlement: ["종료 요청", "토스 현재가", "가상 정산", "종료 자산", "DB 저장", "원장"],
  };
  const sources = [{ path: "docs/program-trading/rules.template.html", line: 1 }];
  const lanes: { id: string; label: string }[] = [];
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const mainPath: string[] = [];
  const steps = section[2].matchAll(/<div class="node (gate|action)">([^<]+)<small>([^<]+)<\/small><\/div>(?:\s*<div class="branch"( data-continue="true")?>↳ ([^<]+)<\/div>)?/g);
  for (const [index, [, kind, label, note, continueBranch, exception]] of [...steps].entries()) {
    const id = `step${index + 1}`;
    const previous = mainPath.at(-1);
    lanes.push({ id, label: laneLabels[view][index] ?? label });
    nodes.push({
      id, lane: id, col: 0, type: kind === "gate" ? "security" : "backend",
      icon: kind === "gate" ? "decision" : "active", label, sublabel: note, width: width(label, note), sources,
    });
    if (previous) edges.push({ from: previous, to: id, fromSide: "bottom", toSide: "top" });
    if (exception) {
      const branch = `${id}-alternate`;
      const [heading, description] = exception.split(" → ");
      nodes.push({
        id: branch, lane: id, col: 1, type: "security", icon: "decision",
        label: heading, sublabel: description ?? "다음 조회 대기", width: width(heading, description ?? ""), sources,
      });
      edges.push({ from: id, to: branch, role: "branch", variant: "security" });
      if (continueBranch) edges.push({ from: branch, to: `step${index + 2}`, role: "branch", fromSide: "bottom", toSide: "right" });
    }
    mainPath.push(id);
  }
  return {
    schema_version: 2, diagram_type: "workflow",
    meta: {
      output: `.archify/program-rules/${view}.html`,
      repository: { url: "git@github.com:deeptrading-lab/trading-signal-frontend.git", revision, link_mode: "local-only" },
      title: `자동매매 · ${section[1]}`, locale: "ko", quality_profile: "showcase", legend: { entries: { backend: { label: "실행" }, security: { label: "확인·대기" } } } },
    lanes, nodes, edges, mainPath,
  };
}
