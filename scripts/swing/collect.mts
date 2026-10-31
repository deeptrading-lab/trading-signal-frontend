/**
 * 스윙 규칙서 v1 오프라인 검증 데이터 수집 — PRD `swing-judgment` PR-1.
 *
 *   npx tsx scripts/swing/collect.mts <probe|universe|bars|flow|index|dart|status>
 *
 * 출력 scripts/swing/__cache__/ (gitignore):
 *   universe.json               symbols.json 스냅샷(스팩·리츠 제외)
 *   bars/<t>.json               KIS 일봉 [date,o,h,l,c,v][] — fetchStockDailyChartKis (FHKST03010100 'J' 수정주가)
 *   flow/<t>.json               KIS 투자자 일별 [date,tv(원),개인,외국인,기관계,연기금,사모(백만원)][] — fetchInvestorTradeDaily
 *   index/<code>.json           KIS 업종지수 종가 [{date,close}] — 0001 KOSPI · 1001 KOSDAQ
 *   dart/<Y|K>_<bgn>_<end>.json OpenDART 주요사항보고 — fetchMajorReports
 *   failures.json               마지막 실행의 실패 목록
 *
 * 규칙
 * - 재실행 = 이어받기(있는 파일 건너뜀). 실패한 종목은 파일을 만들지 않는다(빈 배열 저장 금지).
 * - 조회 전용 TR 만 쓴다(주문 API 없음). KIS 호출 시작 간격 ≥ 125ms(초당 8회 이하, prod 키 여유분 보존).
 * - KIS 야간 점검(21:45~07:00 KST)에 들어가면 그 자리에서 멈춘다 → 다음 실행이 이어받는다.
 * - 일봉 소스는 KIS 로 고정한다(토스 폴백 없음) — 라이브(PR-2)와 같은 함수·같은 파라미터.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
for (const line of fs.readFileSync(`${ROOT}.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const CACHE = fileURLToPath(new URL("./__cache__/", import.meta.url));
for (const d of ["", "bars", "flow", "index", "dart"]) fs.mkdirSync(`${CACHE}${d}`, { recursive: true });

const { getKisClient } = await import("@/lib/api/kis/client");
const { getAccessToken } = await import("@/lib/api/kis/token");
const { fetchStockDailyChartKis } = await import("@/lib/api/kis/price");
const { fetchInvestorTradeDaily } = await import("@/lib/api/kis/investor-flow");
const { fetchIndexDailyChunked } = await import("@/lib/api/kis/indexChartChunked");
const { fetchMajorReports } = await import("@/lib/api/dart/disclosure");

// ── 수집 범위 ────────────────────────────────────────────────────────────────
/** 일봉 시작 — 2022-01 신호일에 300봉 창이 차도록 넉넉히. */
const BAR_FROM = "2020-09-01";
/** 수급 시작 — 2022-01 신호일의 20일 창 + 여유. KIS 조회는 2021-11 까지 확인(probe). */
const FLOW_FROM = "2021-11-01";
const TO = "2026-10-30";
const BAR_CHUNK_DAYS = 130; // KIS 1콜 최대 100봉 ≈ 130 달력일
const PREFILTER_ADV20 = 2_000_000_000; // 수급 수집 대상 1차 거르기(종가×거래량 20일 평균, 원)
const MIN_CLOSE = 1_000;
const FLOW_WINDOW = 20; // 판정에 쓰는 수급 일수(ADV20·수급 강도)
const KIS_GAP_MS = 125;
const WORKERS = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ymd = (iso: string) => iso.replaceAll("-", "");
const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoOf(d);
};
const readJson = <T,>(f: string): T => JSON.parse(fs.readFileSync(f, "utf8")) as T;

/** KIS 야간 점검 창(21:45~07:00 KST) 안이면 true. */
function inKisMaintenance(): boolean {
  const kst = new Date(Date.now() + 9 * 3600_000);
  const min = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  return min >= 21 * 60 + 45 || min < 7 * 60;
}

// ── KIS 공용 속도 제한 + 재시도 ──────────────────────────────────────────────
let nextSlot = 0;
async function kisSlot() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + KIS_GAP_MS;
  if (at > now) await sleep(at - now);
}

/** 초당 건수 초과·토큰 만료·5xx·네트워크는 일시 오류로 보고 3회까지 재시도. */
async function kisCall<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    await kisSlot();
    try {
      return await fn();
    } catch (e) {
      const err = e as { kind?: string; status?: number; detail?: { msg_cd?: string } };
      const msgCd = err.detail?.msg_cd;
      const transient =
        msgCd === "EGW00201" ||
        msgCd === "EGW00123" ||
        err.kind === "network" ||
        (err.status !== undefined && err.status >= 500);
      if (attempt < 3 && transient) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
}

const errMsg = (e: unknown) => (e as { message?: string }).message ?? String(e);

/** 동시 작업자 W 개가 큐를 나눠 처리. 점검 시간 진입 시 stop 플래그로 새 작업을 멈춘다. */
async function runPool<T>(items: T[], worker: (item: T) => Promise<void>): Promise<boolean> {
  let i = 0;
  let stopped = false;
  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      while (!stopped && i < items.length) {
        if (inKisMaintenance()) {
          stopped = true;
          break;
        }
        const item = items[i++];
        await worker(item);
      }
    }),
  );
  return !stopped;
}

type UniverseSymbol = { ticker: string; name: string; market: "KOSPI" | "KOSDAQ"; corp_code: string };
type Universe = { meta: { symbolsCreatedAt: string; generatedAt: string; total: number; excluded: Record<string, number> }; symbols: UniverseSymbol[] };

function loadUniverse(): Universe {
  const f = `${CACHE}universe.json`;
  if (!fs.existsSync(f)) throw new Error("universe.json 없음 — 먼저 `collect.mts universe` 실행");
  return readJson<Universe>(f);
}

/** 일봉 튜플 — [date, open, high, low, close, volume]. */
type BarTuple = [string, number, number, number, number, number];
/** 수급 튜플 — [date, tv(원), 개인, 외국인, 기관계, 연기금, 사모(백만원)]. */
type FlowTuple = [string, number, number, number, number, number, number];

const failures: Array<{ mode: string; ticker: string; error: string }> = [];
function saveFailures() {
  fs.writeFileSync(`${CACHE}failures.json`, JSON.stringify(failures, null, 1));
}

const mode = process.argv[2];
const t0 = Date.now();
const elapsed = () => `${((Date.now() - t0) / 60000).toFixed(1)}분`;

// ── probe ────────────────────────────────────────────────────────────────────
if (mode === "probe") {
  type Raw = { rt_cd: string; msg_cd: string; msg1: string; output2?: Record<string, string>[] };
  const raw = async (ticker: string, date: string): Promise<Raw> => {
    const token = await getAccessToken();
    await sleep(300);
    const r = await getKisClient().get("/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily", {
      headers: { authorization: `Bearer ${token}`, appkey: process.env.KIS_APP_KEY!, appsecret: process.env.KIS_APP_SECRET!, tr_id: "FHPTJ04160001", custtype: "P" },
      params: { FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: ticker, FID_INPUT_DATE_1: date, FID_ORG_ADJ_PRC: "", FID_ETC_CLS_CODE: "1" },
    });
    return r.data as Raw;
  };
  const d = await raw("005930", ymd(TO));
  const r0 = d.output2![0];
  const keys = Object.keys(r0);
  console.log("rt", d.rt_cd, d.msg_cd, "rows", d.output2?.length, "keys", keys.length);
  console.log(keys.filter((k) => /ntby|acml|bsop|clpr/.test(k)).join(" "));
  console.log("close×vol =", Number(r0.stck_clpr) * Number(r0.acml_vol), " acml_tr_pbmn =", Number(r0.acml_tr_pbmn));
  const amt = (g: string) => Number(r0[`${g}_ntby_tr_pbmn`]);
  console.log("기관계", amt("orgn"), "= 세부합", ["scrt", "ivtr", "pe_fund", "bank", "insu", "mrbn", "fund"].reduce((s, g) => s + amt(g), 0));
  const qty = (g: string) => Number(r0[`${g}_ntby_qty`] ?? r0[`${g}_ntby_vol`]);
  console.log("투자자 전체 순매수 수량 합 =", ["prsn", "frgn", "orgn", "etc_corp", "etc_orgt"].reduce((s, g) => s + qty(g), 0));
  for (const [t, dt] of [["005930", "20211231"], ["247540", "20211231"], ["005930", "20211105"]] as const) {
    const x = await raw(t, dt);
    const rows = (x.output2 ?? []).filter((r) => /^\d{8}$/.test(r.stck_bsop_date ?? ""));
    console.log("depth", t, dt, "rows", rows.length, rows.at(-1)?.stck_bsop_date, "~", rows[0]?.stck_bsop_date);
  }
  // lib 함수 경로 확인(엄격 파서).
  const lib = await fetchInvestorTradeDaily("005930", ymd(TO));
  console.log("lib fetchInvestorTradeDaily", lib.length, JSON.stringify(lib.at(-1)));
}

// ── universe ─────────────────────────────────────────────────────────────────
if (mode === "universe") {
  const sym = readJson<{ $meta: { createdAt: string }; symbols: UniverseSymbol[] }>(`${ROOT}lib/api/kis/symbols.json`);
  const excluded: Record<string, number> = { 스팩: 0, 리츠: 0, 기타시장: 0 };
  const symbols = sym.symbols.filter((s) => {
    if (s.market !== "KOSPI" && s.market !== "KOSDAQ") return (excluded.기타시장++, false);
    if (/스팩/.test(s.name)) return (excluded.스팩++, false);
    if (/리츠$/.test(s.name)) return (excluded.리츠++, false);
    return true;
  });
  const u: Universe = {
    meta: { symbolsCreatedAt: sym.$meta.createdAt, generatedAt: new Date().toISOString(), total: symbols.length, excluded },
    symbols: symbols.sort((a, b) => a.ticker.localeCompare(b.ticker)),
  };
  fs.writeFileSync(`${CACHE}universe.json`, JSON.stringify(u));
  console.log(`universe ${u.symbols.length} (KOSPI ${u.symbols.filter((s) => s.market === "KOSPI").length} · KOSDAQ ${u.symbols.filter((s) => s.market === "KOSDAQ").length}) 제외`, excluded);
}

// ── bars ─────────────────────────────────────────────────────────────────────
if (mode === "bars") {
  const { symbols } = loadUniverse();
  const todo = symbols.filter((s) => !fs.existsSync(`${CACHE}bars/${s.ticker}.json`));
  console.log(`bars 대상 ${todo.length}/${symbols.length}`);
  let done = 0;
  const complete = await runPool(todo, async (s) => {
    const rows = new Map<string, BarTuple>();
    try {
      for (let end = TO; end >= BAR_FROM; end = addDays(end, -BAR_CHUNK_DAYS)) {
        const startRaw = addDays(end, -BAR_CHUNK_DAYS + 1);
        const start = startRaw < BAR_FROM ? BAR_FROM : startRaw;
        const candles = await kisCall(() => fetchStockDailyChartKis(s.ticker, ymd(start), ymd(end)));
        const valid = candles.filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.date) && c.close > 0);
        // 상장 이전 구간 — 이미 받은 봉이 있는데 빈 청크면 더 과거는 없다.
        // ponytail: 130일 넘는 거래정지가 중간에 있으면 그 이전 이력이 잘린다(드묾). 필요 시 끝까지 훑게 바꿀 것.
        if (valid.length === 0 && rows.size > 0) break;
        for (const c of valid) {
          // 거래정지일은 시·고·저가가 0 으로 올 수 있다 → 종가로 채운다(가격 이동 없음).
          const o = c.open > 0 ? c.open : c.close;
          const h = c.high > 0 ? c.high : c.close;
          const l = c.low > 0 ? c.low : c.close;
          rows.set(c.date, [c.date, o, h, l, c.close, c.volume >= 0 ? c.volume : 0]);
        }
      }
    } catch (e) {
      failures.push({ mode, ticker: s.ticker, error: errMsg(e) });
      return; // 파일 안 씀 → 재실행 때 다시 시도
    }
    const list = [...rows.values()].sort((a, b) => a[0].localeCompare(b[0]));
    fs.writeFileSync(`${CACHE}bars/${s.ticker}.json`, JSON.stringify(list));
    if (++done % 50 === 0) console.log(`  bars ${done}/${todo.length} · ${elapsed()} · 실패 ${failures.length}`);
  });
  saveFailures();
  console.log(`bars ${complete ? "완료" : "⏸ KIS 점검 시간 — 중단(재실행하면 이어받음)"}: 신규 ${done} · 실패 ${failures.length} · ${elapsed()}`);
}

// ── flow ─────────────────────────────────────────────────────────────────────
/**
 * 수급이 필요한 날짜 = 1차 거르기(종가 ≥ 1,000 · 종가×거래량 20일 평균 ≥ 20억)를 통과한 날의
 * 직전 20거래일 창의 합집합(FLOW_FROM 이후). 한 번도 통과 못 한 종목은 수급을 받지 않는다.
 */
function neededFlowDates(bars: BarTuple[]): string[] {
  const need = new Set<string>();
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i][4] * bars[i][5];
    if (i >= FLOW_WINDOW) sum -= bars[i - FLOW_WINDOW][4] * bars[i - FLOW_WINDOW][5];
    if (i < FLOW_WINDOW - 1) continue;
    if (bars[i][4] < MIN_CLOSE || sum / FLOW_WINDOW < PREFILTER_ADV20) continue;
    for (let k = i - FLOW_WINDOW + 1; k <= i; k++) if (bars[k][0] >= FLOW_FROM) need.add(bars[k][0]);
  }
  return [...need].sort();
}

if (mode === "flow") {
  const { symbols } = loadUniverse();
  const todo: Array<{ ticker: string; need: string[] }> = [];
  let notNeeded = 0;
  for (const s of symbols) {
    if (fs.existsSync(`${CACHE}flow/${s.ticker}.json`)) continue;
    const bf = `${CACHE}bars/${s.ticker}.json`;
    if (!fs.existsSync(bf)) continue; // 일봉 먼저
    const need = neededFlowDates(readJson<BarTuple[]>(bf));
    if (need.length === 0) {
      notNeeded++;
      continue;
    }
    todo.push({ ticker: s.ticker, need });
  }
  const pagesEst = todo.reduce((s, x) => s + Math.ceil(x.need.length / 30), 0);
  console.log(`flow 대상 ${todo.length} (불필요 ${notNeeded}) · 예상 최소 ${pagesEst}콜`);
  let done = 0;
  let calls = 0;
  const complete = await runPool(todo, async ({ ticker, need }) => {
    const rows = new Map<string, FlowTuple>();
    const pending = new Set(need);
    try {
      for (let guard = 0; pending.size > 0 && guard < 120; guard++) {
        const cursor = [...pending].sort().at(-1)!;
        const page = await kisCall(() => fetchInvestorTradeDaily(ticker, ymd(cursor)));
        calls++;
        if (page.length === 0) break; // 조회 가능 과거 끝
        for (const r of page) {
          rows.set(r.date, [r.date, r.tradingValue, r.person, r.foreign, r.institution, r.pension, r.privateEquity]);
        }
        const oldest = page[0].date;
        for (const d of [...pending]) if (d >= oldest && d <= cursor) pending.delete(d);
        if (oldest >= cursor) break; // 진전 없음 방어
      }
    } catch (e) {
      failures.push({ mode, ticker, error: errMsg(e) });
      return;
    }
    const list = [...rows.values()].sort((a, b) => a[0].localeCompare(b[0]));
    if (list.length === 0) {
      failures.push({ mode, ticker, error: "수급 응답 0행" });
      return;
    }
    fs.writeFileSync(`${CACHE}flow/${ticker}.json`, JSON.stringify(list));
    if (++done % 25 === 0) console.log(`  flow ${done}/${todo.length} · 콜 ${calls} · ${elapsed()} · 실패 ${failures.length}`);
  });
  saveFailures();
  console.log(`flow ${complete ? "완료" : "⏸ KIS 점검 시간 — 중단(재실행하면 이어받음)"}: 신규 ${done} · 콜 ${calls} · 실패 ${failures.length} · ${elapsed()}`);
}

// ── index ────────────────────────────────────────────────────────────────────
if (mode === "index") {
  for (const code of ["0001", "1001"]) {
    const f = `${CACHE}index/${code}.json`;
    if (fs.existsSync(f)) continue;
    const rows = await fetchIndexDailyChunked(code, ymd(BAR_FROM), ymd(TO));
    if (rows.length === 0) throw new Error(`지수 ${code} 0행`);
    fs.writeFileSync(f, JSON.stringify(rows));
    console.log(`index ${code}: ${rows.length}행 ${rows[0].date}~${rows.at(-1)!.date}`);
  }
}

// ── dart ─────────────────────────────────────────────────────────────────────
if (mode === "dart") {
  for (const cls of ["Y", "K"] as const) {
    for (let s = BAR_FROM; s <= TO; ) {
      const e3 = new Date(`${s}T00:00:00Z`);
      e3.setUTCMonth(e3.getUTCMonth() + 3);
      const endRaw = addDays(isoOf(e3), -1);
      const end = endRaw > TO ? TO : endRaw;
      const f = `${CACHE}dart/${cls}_${ymd(s)}_${ymd(end)}.json`;
      if (!fs.existsSync(f)) {
        const list = await fetchMajorReports(cls, ymd(s), ymd(end));
        fs.writeFileSync(f, JSON.stringify(list));
        console.log(`  dart ${cls} ${s}~${end}: ${list.length}건`);
        await sleep(200);
      }
      s = addDays(end, 1);
    }
  }
}

// ── status ───────────────────────────────────────────────────────────────────
if (mode === "status") {
  const count = (d: string) => fs.readdirSync(`${CACHE}${d}`).filter((f) => f.endsWith(".json")).length;
  const u = fs.existsSync(`${CACHE}universe.json`) ? loadUniverse().symbols.length : 0;
  console.log(`universe ${u} · bars ${count("bars")} · flow ${count("flow")} · index ${count("index")} · dart ${count("dart")}`);
  if (fs.existsSync(`${CACHE}failures.json`)) console.log("최근 실패", readJson<unknown[]>(`${CACHE}failures.json`).length);
}
