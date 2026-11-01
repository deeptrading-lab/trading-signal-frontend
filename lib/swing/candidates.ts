/**
 * 스윙 v2 후보 피처 — 체크리스트 밖 추가 데이터(수급 세부 주체·신용잔고·프로그램매매·증권사 투자의견).
 *
 * PRD `swing-judgment` §10-1. 판정 규칙 SSOT = `docs/analysis/swing-v2-candidates-preregistration.md`.
 * 순수 함수 — 일봉 인덱스에 맞춘 시계열을 돌려준다. 인덱스 i 의 값은 bars[i].date(=t) **까지 알 수 있던**
 * 데이터만 쓴다(신용잔고는 결제일 ≤ t, 투자의견은 발표일 ≤ t). 값을 못 구하면 null.
 * 오프라인 감사 전용(라이브 경로에서 import 금지 — 통과 피처만 별도로 라이브에 옮긴다).
 */

/** 수급 세부 주체 튜플 — collect.mts flowx. 금액은 백만원, tv 는 원. */
export type FlowxTuple = [
  date: string,
  tv: number,
  person: number,
  foreign: number,
  institution: number,
  pension: number,
  privateEquity: number,
  securities: number,
  investmentTrust: number,
  insurance: number,
  bank: number,
  merchantBank: number,
  otherCorp: number,
  otherOrg: number,
  foreignRegistered: number,
  foreignUnregistered: number,
];

/** 신용잔고 튜플 — collect.mts credit. [거래일, 결제일 YYYYMMDD, 융자잔고금액, 융자잔고율%, 신규, 상환, 대주잔고금액, 대주잔고율%]. */
export type CreditTuple = [string, number, number, number, number, number, number, number];

/** 프로그램매매 튜플 — collect.mts program. [date, 순매수금액, 순매수수량, 매수금액, 매도금액]. */
export type ProgramTuple = [string, number, number, number, number];

export type Opinion = {
  d: string;
  opn: string;
  opnCode: string;
  prevOpn: string;
  prevCode: string;
  broker: string;
  target: number;
  prevClose: number;
};

/** 사전 등록 §2 상수. */
export const CANDIDATE_RULES = {
  /** 수급 강도 누적 일수(v1 과 같은 N). */
  flowDays: 5,
  /** ADV20 창. */
  advDays: 20,
  /** 신용잔고 변화 비교 간격(신용잔고 행 기준). */
  creditChangeRows: 20,
  /** 프로그램 순매수 비율 누적 일수. */
  programDays: 5,
  /** 목표가 상승여력 — 증권사별 최신 목표가 유효기간(달력일). */
  targetLookbackDays: 120,
  /** 목표가 수정 — 같은 증권사 직전 목표가를 찾는 기간(달력일). */
  revisionPrevDays: 365,
  /** 목표가 수정 집계 창(거래일). */
  revisionWindowBars: 20,
} as const;

export type CandidateKey = "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8";

export const CANDIDATES: ReadonlyArray<{ key: CandidateKey; label: string }> = [
  { key: "F1", label: "투신 순매수 강도(5일)" },
  { key: "F2", label: "금융투자 순매수 강도(5일)" },
  { key: "F3", label: "기타법인 순매수 강도(5일)" },
  { key: "F4", label: "신용잔고율" },
  { key: "F5", label: "신용잔고 20행 변화율" },
  { key: "F6", label: "프로그램 순매수 비율(5일)" },
  { key: "F7", label: "목표가 상승여력" },
  { key: "F8", label: "목표가 수정 순건수(20일)" },
];

export type CandidateSeries = Record<CandidateKey, (number | null)[]>;

const dayMs = 86_400_000;
const daysBetween = (a: string, b: string) =>
  (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / dayMs;
const ymdNum = (iso: string) => Number(iso.replaceAll("-", ""));

/**
 * 일봉 날짜 배열(오름차순)에 맞춘 후보 피처 8종.
 * 입력 배열은 오름차순이어야 한다(수집기 산출 그대로).
 */
export function computeCandidateSeries(
  barDates: string[],
  barCloses: number[],
  flowx: FlowxTuple[],
  credit: CreditTuple[],
  program: ProgramTuple[],
  opinions: Opinion[],
): CandidateSeries {
  const n = barDates.length;
  const out: CandidateSeries = {
    F1: new Array(n).fill(null),
    F2: new Array(n).fill(null),
    F3: new Array(n).fill(null),
    F4: new Array(n).fill(null),
    F5: new Array(n).fill(null),
    F6: new Array(n).fill(null),
    F7: new Array(n).fill(null),
    F8: new Array(n).fill(null),
  };
  const R = CANDIDATE_RULES;

  // ── F1~F3 수급 세부 주체 강도 — Σ_N 순매수(원) ÷ ADV20(원). 창 안 하루라도 결측이면 null.
  const fx = new Map(flowx.map((r) => [r[0], r]));
  for (let i = R.advDays - 1; i < n; i++) {
    let tv = 0;
    let ok = true;
    for (let k = i - R.advDays + 1; k <= i; k++) {
      const r = fx.get(barDates[k]);
      if (!r) {
        ok = false;
        break;
      }
      tv += r[1];
    }
    if (!ok || tv <= 0) continue;
    const adv = tv / R.advDays;
    let it = 0;
    let sc = 0;
    let oc = 0;
    for (let k = i - R.flowDays + 1; k <= i; k++) {
      const r = fx.get(barDates[k])!;
      sc += r[7];
      it += r[8];
      oc += r[12];
    }
    out.F1[i] = (it * 1e6) / adv;
    out.F2[i] = (sc * 1e6) / adv;
    out.F3[i] = (oc * 1e6) / adv;
  }

  // ── F4·F5 신용잔고 — 결제일 ≤ t 인 가장 늦은 행. F5 = 그 행 잔고 ÷ 20행 전 잔고 − 1.
  let ci = -1;
  for (let i = 0; i < n; i++) {
    const t = ymdNum(barDates[i]);
    while (ci + 1 < credit.length && credit[ci + 1][1] <= t) ci++;
    if (ci < 0) continue;
    // 결제일이 너무 오래된 행(10거래일 이상 지연 — 정지·누락)은 쓰지 않는다.
    if (daysBetween(credit[ci][0], barDates[i]) > 14) continue;
    out.F4[i] = credit[ci][3];
    const prev = ci - R.creditChangeRows;
    if (prev >= 0 && credit[prev][2] > 0) out.F5[i] = credit[ci][2] / credit[prev][2] - 1;
  }

  // ── F6 프로그램 순매수 비율 — Σ_5 순매수 ÷ Σ_5 (매수+매도). 결측 하루라도 있으면 null.
  const pg = new Map(program.map((r) => [r[0], r]));
  for (let i = R.programDays - 1; i < n; i++) {
    let net = 0;
    let gross = 0;
    let ok = true;
    for (let k = i - R.programDays + 1; k <= i; k++) {
      const r = pg.get(barDates[k]);
      if (!r) {
        ok = false;
        break;
      }
      net += r[1];
      gross += r[3] + r[4];
    }
    if (ok && gross > 0) out.F6[i] = net / gross;
  }

  // ── F7·F8 투자의견 — 발표일 ≤ t.
  const ops = opinions.filter((o) => o.target > 0 && o.broker !== "").sort((a, b) => a.d.localeCompare(b.d) || a.broker.localeCompare(b.broker));
  // 수정 플래그: 같은 증권사 직전 목표가(365일 안) 대비 상향 +1 / 하향 −1 / 같음·직전 없음 0.
  const lastByBroker = new Map<string, Opinion>();
  const revision = ops.map((o) => {
    const prev = lastByBroker.get(o.broker);
    lastByBroker.set(o.broker, o);
    if (!prev || daysBetween(prev.d, o.d) > R.revisionPrevDays) return 0;
    return o.target > prev.target ? 1 : o.target < prev.target ? -1 : 0;
  });
  let oi = 0;
  const latest = new Map<string, Opinion>();
  for (let i = 0; i < n; i++) {
    const t = barDates[i];
    while (oi < ops.length && ops[oi].d <= t) {
      latest.set(ops[oi].broker, ops[oi]);
      oi++;
    }
    const fresh = [...latest.values()].filter((o) => daysBetween(o.d, t) <= R.targetLookbackDays);
    if (fresh.length > 0 && barCloses[i] > 0) {
      const avg = fresh.reduce((s, o) => s + o.target, 0) / fresh.length;
      out.F7[i] = avg / barCloses[i] - 1;
    }
    // 커버리지(120일 안 유효 목표가)가 없으면 null — "수정 0건"과 "커버 안 함"을 섞지 않는다.
    if (fresh.length > 0 && i >= R.revisionWindowBars) {
      const from = barDates[i - R.revisionWindowBars];
      let net = 0;
      for (let k = oi - 1; k >= 0 && ops[k].d > from; k--) net += revision[k];
      out.F8[i] = net;
    }
  }
  return out;
}
