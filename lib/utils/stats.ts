/**
 * 감사용 기초 통계(순수 함수) — 스윙 규칙서 감사(`lib/swing/audit*`, `scripts/swing/*`)와 신호 감사
 * (`scripts/signal/*`)가 쓴다. 옛 AI 판정 진단 모듈(`lib/server/scorecard/directionDiagnosis.ts`)에서
 * 수식 그대로 옮겼다(swing-judgment PR-5, 그 모듈은 삭제).
 */

/** ISO 주(월요일 시작) 키 — 그 주 월요일 `YYYY-MM-DD`. 입력은 `YYYY-MM-DD`. */
export function isoWeekKey(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** (a − b) × 100 %p, 소수 6자리 반올림 — 0.3−0.2=0.0999… 같은 부동소수 오차로 경계가 어긋나는 것 방지. */
export function toPp(a: number, b: number): number {
  return Math.round((a - b) * 100 * 1e6) / 1e6;
}

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 분위수(선형 보간, R type 7). 빈 배열 null. */
export function quantile(xs: number[], q: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** 평균 순위(동점은 순위 평균, 1부터). */
export function averageRanks(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const ranks = new Array<number>(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[idx[k][1]] = r;
    i = j + 1;
  }
  return ranks;
}

function pearson(xs: number[], ys: number[]): number {
  const mx = mean(xs) ?? 0;
  const my = mean(ys) ?? 0;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? Number.NaN : sxy / Math.sqrt(sxx * syy);
}

/** Spearman 순위상관(평균 순위의 Pearson). 한쪽 분산 0 이면 NaN. */
export function spearman(xs: number[], ys: number[]): number {
  return pearson(averageRanks(xs), averageRanks(ys));
}

/**
 * Newey-West(Bartlett 커널) t — 기간이 겹치는 수익률처럼 자기상관된 시계열의 평균 t.
 * lag = 겹침 길이 − 1 (10거래일 수익이면 9). 분산이 0 이하이면 NaN.
 */
export function neweyWestT(xs: number[], lag: number): number {
  const n = xs.length;
  const m = mean(xs) ?? 0;
  const d = xs.map((x) => x - m);
  const gamma = (l: number) => {
    let s = 0;
    for (let i = l; i < n; i++) s += d[i] * d[i - l];
    return s / n;
  };
  let v = gamma(0);
  for (let l = 1; l <= lag; l++) v += 2 * (1 - l / (lag + 1)) * gamma(l);
  return v > 0 ? m / Math.sqrt(v / n) : Number.NaN;
}

/** 결정론 PRNG — mulberry32. [0, 1) 균등. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
