/**
 * 전진 관찰(사후 성적) — 스크리너가 저장한 판정 행의 종가끼리 비교한다. 시세 API 를 더 부르지 않는다.
 *
 * - 보유 = 저장 거래일 순서로 h 거래일 뒤 종가 / 기준일 종가 − 1 (종가→종가. 규칙서 측정은 t+1 시가 진입이라 근사).
 * - 초과 = 같은 기준일·같은 시장 저장 종목 평균을 뺀 값.
 * - 묶음 평균 = 기준일별 묶음 평균의 평균(하루 한 표) — 감사(audit)와 같은 집계.
 * - |수익| > 60% 는 액면분할·병합 등 비정상으로 보고 뺀다.
 * - 저장이 빠진 거래일이 있으면 그만큼 기간이 길어진다(저장일 순서 기준).
 */

export type ForwardRow = {
  trade_date: string;
  ticker: string;
  market: "KOSPI" | "KOSDAQ";
  grade: "excluded" | "candidate" | "interest" | "neutral";
  met_count: number;
  flow_pass: boolean;
  exclusions: string[];
  close: number | string;
};

export const FORWARD_GROUPS = ["all", "candidate", "interest", "flow", "met5", "noCaution", "caution", "highVol", "overheated"] as const;
export type ForwardGroup = (typeof FORWARD_GROUPS)[number];

export type ForwardCell = {
  group: ForwardGroup;
  /** 평가된 종목-일 수. */
  n: number;
  /** 기준일 수. */
  days: number;
  /** 시장 대비 평균 초과(소수, 0.012 = +1.2%p). 표본 없으면 null. */
  meanExcess: number | null;
  /** 시장 평균을 이긴 비율(0~1). */
  winRate: number | null;
  /** 평균 절대 수익(소수). */
  meanReturn: number | null;
};

export type ForwardHorizon = { horizon: number; firstBase: string | null; lastBase: string | null; cells: ForwardCell[] };

const MAX_ABS_RETURN = 0.6;

function groupsOf(r: ForwardRow): ForwardGroup[] {
  const g: ForwardGroup[] = ["all"];
  const caution = r.exclusions.length > 0;
  if (r.grade === "candidate") g.push("candidate");
  if (r.grade === "interest") g.push("interest");
  if (r.flow_pass && !caution) g.push("flow");
  if (r.met_count >= 5 && !caution) g.push("met5");
  g.push(caution ? "caution" : "noCaution");
  if (r.exclusions.includes("high_volatility")) g.push("highVol");
  if (r.exclusions.includes("overheated")) g.push("overheated");
  return g;
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function forwardStats(rows: ReadonlyArray<ForwardRow>, horizons: readonly number[]): ForwardHorizon[] {
  const byDate = new Map<string, Map<string, ForwardRow>>();
  for (const r of rows) {
    let m = byDate.get(r.trade_date);
    if (!m) byDate.set(r.trade_date, (m = new Map()));
    m.set(r.ticker, r);
  }
  const dates = [...byDate.keys()].sort();

  return horizons.map((h) => {
    // group -> 기준일별 초과 목록
    const perGroup = new Map<ForwardGroup, { dayMeans: number[]; ex: number[]; ret: number[] }>();
    let firstBase: string | null = null;
    let lastBase: string | null = null;
    for (let i = 0; i + h < dates.length; i++) {
      const base = byDate.get(dates[i])!;
      const end = byDate.get(dates[i + h])!;
      const recs: Array<{ r: ForwardRow; ret: number }> = [];
      for (const [t, r] of base) {
        const e = end.get(t);
        const c0 = Number(r.close);
        const c1 = e ? Number(e.close) : NaN;
        if (!(c0 > 0) || !(c1 > 0)) continue;
        const ret = c1 / c0 - 1;
        if (Math.abs(ret) > MAX_ABS_RETURN) continue;
        recs.push({ r, ret });
      }
      if (recs.length === 0) continue;
      firstBase ??= dates[i];
      lastBase = dates[i];
      const mkt = new Map<string, number>();
      for (const m of ["KOSPI", "KOSDAQ"]) {
        const xs = recs.filter((x) => x.r.market === m).map((x) => x.ret);
        if (xs.length) mkt.set(m, mean(xs));
      }
      const dayGroup = new Map<ForwardGroup, number[]>();
      for (const { r, ret } of recs) {
        const ex = ret - (mkt.get(r.market) ?? 0);
        for (const g of groupsOf(r)) {
          let cell = perGroup.get(g);
          if (!cell) perGroup.set(g, (cell = { dayMeans: [], ex: [], ret: [] }));
          cell.ex.push(ex);
          cell.ret.push(ret);
          let d = dayGroup.get(g);
          if (!d) dayGroup.set(g, (d = []));
          d.push(ex);
        }
      }
      for (const [g, xs] of dayGroup) perGroup.get(g)!.dayMeans.push(mean(xs));
    }
    const cells: ForwardCell[] = FORWARD_GROUPS.map((group) => {
      const c = perGroup.get(group);
      if (!c || c.ex.length === 0) return { group, n: 0, days: 0, meanExcess: null, winRate: null, meanReturn: null };
      return {
        group,
        n: c.ex.length,
        days: c.dayMeans.length,
        meanExcess: mean(c.dayMeans),
        winRate: c.ex.filter((x) => x > 0).length / c.ex.length,
        meanReturn: mean(c.ret),
      };
    });
    return { horizon: h, firstBase, lastBase, cells };
  });
}
