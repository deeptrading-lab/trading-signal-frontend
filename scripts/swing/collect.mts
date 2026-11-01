/**
 * 스윙 규칙서 v1 오프라인 검증 데이터 수집 — PRD `swing-judgment` PR-1.
 *
 *   npx tsx scripts/swing/collect.mts <probe|universe|bars|flow|index|dart|status> [--ignore-window]
 *   npx tsx scripts/swing/collect.mts <probe2|flowx|credit|program|opinion>   # v2 후보 입력(규칙서 v1 판정 미사용)
 *
 * 출력 scripts/swing/__cache__/ (gitignore):
 *   universe.json               symbols.json 스냅샷(스팩·리츠 제외)
 *   bars/<t>.json               KIS 일봉 [date,o,h,l,c,v][] — fetchStockDailyChartKis (FHKST03010100 'J' 수정주가)
 *   flow/<t>.json               KIS 투자자 일별 [date,tv(원),개인,외국인,기관계,연기금,사모(백만원)][] — fetchInvestorTradeDaily
 *   index/<code>.json           KIS 업종지수 종가 [{date,close}] — 0001 KOSPI · 1001 KOSDAQ
 *   dart/<Y|K>_<bgn>_<end>.json OpenDART 주요사항보고 — fetchMajorReports
 *   failures.json               마지막 실행의 실패 목록
 *   — v2 후보 입력(별도 사전 등록 감사 전까지 판정에 쓰지 않는다) —
 *   flowx/<t>.json              수급 세부 주체(금융투자·투신·보험·은행·종금·기타법인·기타단체·외국인 등록/비등록)
 *   credit/<t>.json             신용잔고 일별(결제일 포함)
 *   program/<t>.json            프로그램매매 일별
 *   extra/opinion_<t>.json      증권사 투자의견·목표가 이력
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
for (const d of ["", "bars", "flow", "flowx", "credit", "program", "index", "dart", "extra"]) fs.mkdirSync(`${CACHE}${d}`, { recursive: true });

const { getKisClient } = await import("@/lib/api/kis/client");
const { getAccessToken } = await import("@/lib/api/kis/token");
const { fetchStockDailyChartKis } = await import("@/lib/api/kis/price");
const { fetchInvestorTradeDaily, fetchInvestorTradeDailyDetail } = await import("@/lib/api/kis/investor-flow");
const { fetchIndexDailyChart } = await import("@/lib/api/kis/index-chart");
const { CHUNK_DAYS: INDEX_CHUNK_DAYS } = await import("@/lib/api/kis/indexChartChunked");
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

/** `--ignore-window` — 시간대 대신 연속 실패 차단기로만 멈춘다(실제 점검 시작은 날마다 다르다). */
const IGNORE_WINDOW = process.argv.includes("--ignore-window");
/** 종목 연속 실패가 이만큼 쌓이면 점검·장애로 보고 멈춘다(실패 종목은 파일 미작성 → 재실행이 이어받음). */
const MAX_CONSECUTIVE_FAILS = 10;
let consecutiveFails = 0;

/** KIS 야간 점검 창(21:45~07:00 KST) 안이면 true. */
function inKisMaintenance(): boolean {
  if (IGNORE_WINDOW) return false;
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
        if (inKisMaintenance() || consecutiveFails >= MAX_CONSECUTIVE_FAILS) {
          stopped = true;
          break;
        }
        const item = items[i++];
        const before = failures.length;
        await worker(item);
        consecutiveFails = failures.length > before ? consecutiveFails + 1 : 0;
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

// ── probe2 — v2 후보 TR 파라미터·키·과거 조회 깊이 확인 ──────────────────────
if (mode === "probe2") {
  const raw = async (path: string, trId: string, params: Record<string, string>) => {
    const token = await getAccessToken();
    await sleep(400);
    try {
      const r = await getKisClient().get(`/uapi/domestic-stock/v1/quotations/${path}`, {
        headers: { authorization: `Bearer ${token}`, appkey: process.env.KIS_APP_KEY!, appsecret: process.env.KIS_APP_SECRET!, tr_id: trId, custtype: "P" },
        params,
      });
      return r.data as Record<string, unknown>;
    } catch (e) {
      return { http: (e as { response?: { status?: number } }).response?.status ?? "net" };
    }
  };
  const show = (label: string, d: Record<string, unknown>) => {
    const arrKey = ["output", "output1", "output2"].find((k) => Array.isArray(d[k]) && (d[k] as unknown[]).length > 0);
    const arr = (arrKey ? d[arrKey] : []) as Record<string, string>[];
    const dateKey = arr[0] ? Object.keys(arr[0]).find((k) => /date|bsop|dt$/.test(k)) : undefined;
    console.log(`${label}: rt ${d.rt_cd ?? "-"} ${d.msg_cd ?? ""} ${String(d.msg1 ?? d.http ?? "")} · ${arrKey ?? "배열 없음"} ${arr.length}행 · ${dateKey ? `${arr.at(-1)?.[dateKey]}~${arr[0]?.[dateKey]}` : ""}`);
    if (arr[0]) console.log(`   keys: ${Object.keys(arr[0]).join(" ")}`);
  };
  for (const date of ["20261030", "20220103"]) {
    show(`신용잔고 ${date}`, await raw("daily-credit-balance", "FHPST04760000", { fid_cond_mrkt_div_code: "J", fid_cond_scr_div_code: "20476", fid_input_iscd: "005930", fid_input_date_1: date }));
    show(`프로그램 ${date}`, await raw("program-trade-by-stock-daily", "FHPPG04650201", { FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: "005930", FID_INPUT_DATE_1: date }));
  }
  for (const [s, e] of [["20261001", "20261030"], ["20220103", "20220131"]]) {
    show(`대차 ${s}~${e}`, await raw("daily-loan-trans", "HHPST074500C0", { MRKT_DIV_CLS_CODE: "3", MKSC_SHRN_ISCD: "005930", START_DATE: s, END_DATE: e, CTS: "" }));
  }
  for (const [s, e] of [["20260101", "20261030"], ["20220101", "20221231"]]) {
    show(`투자의견 ${s}~${e}`, await raw("invest-opinion", "FHKST663300C0", { FID_COND_MRKT_DIV_CODE: "J", FID_COND_SCR_DIV_CODE: "16633", FID_INPUT_ISCD: "005930", FID_INPUT_DATE_1: s, FID_INPUT_DATE_2: e }));
  }
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
  console.log(`bars ${complete ? "완료" : "⏸ 중단 — 점검 시간 또는 연속 실패(재실행하면 이어받음)"}: 신규 ${done} · 실패 ${failures.length} · ${elapsed()}`);
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

/**
 * 날짜 커서 페이징 수집(수급류 공용) — 필요한 날짜(neededFlowDates)를 덮을 때까지 가장 늦은 미수집 날짜를
 * 커서로 페이지를 받는다. page 는 오름차순 [date, ...값] 튜플을 돌려줘야 한다.
 */
async function collectPaged(dir: string, fetchPage: (ticker: string, cursorYmd: string) => Promise<Array<[string, ...number[]]>>) {
  const { symbols } = loadUniverse();
  const todo: Array<{ ticker: string; need: string[] }> = [];
  let notNeeded = 0;
  for (const s of symbols) {
    if (fs.existsSync(`${CACHE}${dir}/${s.ticker}.json`)) continue;
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
  console.log(`${dir} 대상 ${todo.length} (불필요 ${notNeeded}) · 예상 최소 ${pagesEst}콜`);
  let done = 0;
  let calls = 0;
  const complete = await runPool(todo, async ({ ticker, need }) => {
    const rows = new Map<string, [string, ...number[]]>();
    const pending = new Set(need);
    try {
      for (let guard = 0; pending.size > 0 && guard < 120; guard++) {
        const cursor = [...pending].sort().at(-1)!;
        const page = await kisCall(() => fetchPage(ticker, ymd(cursor)));
        calls++;
        if (page.length === 0) break; // 조회 가능 과거 끝
        for (const r of page) rows.set(r[0], r);
        const oldest = page[0][0];
        for (const d of [...pending]) if (d >= oldest && d <= cursor) pending.delete(d);
        if (oldest >= cursor) break; // 진전 없음 방어
      }
    } catch (e) {
      failures.push({ mode, ticker, error: errMsg(e) });
      return;
    }
    const list = [...rows.values()].sort((a, b) => a[0].localeCompare(b[0]));
    if (list.length === 0) {
      failures.push({ mode, ticker, error: "응답 0행" });
      return;
    }
    fs.writeFileSync(`${CACHE}${dir}/${ticker}.json`, JSON.stringify(list));
    if (++done % 25 === 0) console.log(`  ${dir} ${done}/${todo.length} · 콜 ${calls} · ${elapsed()} · 실패 ${failures.length}`);
  });
  saveFailures();
  console.log(`${dir} ${complete ? "완료" : "⏸ 중단 — 점검 시간 또는 연속 실패(재실행하면 이어받음)"}: 신규 ${done} · 콜 ${calls} · 실패 ${failures.length} · ${elapsed()}`);
}

if (mode === "flow") {
  await collectPaged("flow", async (ticker, cursor) =>
    (await fetchInvestorTradeDaily(ticker, cursor)).map(
      (r): FlowTuple => [r.date, r.tradingValue, r.person, r.foreign, r.institution, r.pension, r.privateEquity],
    ),
  );
}

/**
 * flowx — v2 후보 입력: 같은 수급 TR 의 세부 주체까지.
 * [date, tv(원), 개인, 외국인, 기관계, 연기금, 사모, 금융투자, 투신, 보험, 은행, 종금, 기타법인, 기타단체, 외국인등록, 외국인비등록] (백만원)
 */
if (mode === "flowx") {
  await collectPaged("flowx", async (ticker, cursor) =>
    (await fetchInvestorTradeDailyDetail(ticker, cursor)).map((r) => [
      r.date, r.tradingValue, r.person, r.foreign, r.institution, r.pension, r.privateEquity,
      r.detail.securities, r.detail.investmentTrust, r.detail.insurance, r.detail.bank, r.detail.merchantBank,
      r.detail.otherCorp, r.detail.otherOrg, r.detail.foreignRegistered, r.detail.foreignUnregistered,
    ]),
  );
}

// ── v2 후보 입력 — 신용잔고·프로그램매매·투자의견 (원본 조회, 엄격 파싱) ─────────────
/** quotations 원본 GET — rt_cd≠0 은 ApiError 모양으로 throw(kisCall 재시도 판정용). */
async function kisRaw(path: string, trId: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  let r;
  try {
    r = await getKisClient().get(`/uapi/domestic-stock/v1/quotations/${path}`, {
      headers: { authorization: `Bearer ${token}`, appkey: process.env.KIS_APP_KEY!, appsecret: process.env.KIS_APP_SECRET!, tr_id: trId, custtype: "P" },
      params,
    });
  } catch (e) {
    const status = (e as { response?: { status?: number } }).response?.status;
    throw { kind: status ? "server" : "network", status, message: `${trId} HTTP ${status ?? "network"}` };
  }
  const d = r.data as { rt_cd?: string; msg_cd?: string; msg1?: string };
  if (d.rt_cd !== "0") throw { kind: "server", status: 200, message: `${trId} ${d.msg_cd} ${d.msg1}`, detail: { msg_cd: d.msg_cd } };
  return r.data as Record<string, unknown>;
}
/** 엄격 숫자 — 키 누락·비숫자는 throw(가짜 0 차단). */
function num(row: Record<string, string>, key: string, ctx: string): number {
  const raw = row[key];
  const v = raw === undefined || raw.trim() === "" ? Number.NaN : Number(raw);
  if (!Number.isFinite(v)) throw new Error(`${ctx}: ${key} 없음/비숫자`);
  return v;
}
const isoFromYmd = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

/**
 * credit — 신용잔고 일별(FHPST04760000). 거래일 기준 행, 결제일(stlm_date)이 약 2영업일 늦다 →
 * 판정 시점 t 에는 stlm_date ≤ t 인 행만 쓸 수 있다(감사 쪽 책임).
 * [date(거래일), 결제일 YYYYMMDD, 융자잔고금액, 융자잔고율%, 융자신규금액, 융자상환금액, 대주잔고금액, 대주잔고율%]
 */
if (mode === "credit") {
  await collectPaged("credit", async (ticker, cursor) => {
    const d = await kisRaw("daily-credit-balance", "FHPST04760000", { fid_cond_mrkt_div_code: "J", fid_cond_scr_div_code: "20476", fid_input_iscd: ticker, fid_input_date_1: cursor });
    const rows = ((d.output as Record<string, string>[]) ?? []).filter((r) => /^\d{8}$/.test(r.deal_date ?? ""));
    return rows
      .map((r): [string, ...number[]] => {
        const ctx = `credit ${ticker} ${r.deal_date}`;
        return [
          isoFromYmd(r.deal_date), num(r, "stlm_date", ctx),
          num(r, "whol_loan_rmnd_amt", ctx), num(r, "whol_loan_rmnd_rate", ctx), num(r, "whol_loan_new_amt", ctx), num(r, "whol_loan_rdmp_amt", ctx),
          num(r, "whol_stln_rmnd_amt", ctx), num(r, "whol_stln_rmnd_rate", ctx),
        ];
      })
      .sort((a, b) => a[0].localeCompare(b[0]));
  });
}

/** program — 종목별 프로그램매매 일별(FHPPG04650201). [date, 순매수금액, 순매수수량, 매수금액, 매도금액] (원본 단위 그대로). */
if (mode === "program") {
  await collectPaged("program", async (ticker, cursor) => {
    const d = await kisRaw("program-trade-by-stock-daily", "FHPPG04650201", { FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: ticker, FID_INPUT_DATE_1: cursor });
    const rows = ((d.output as Record<string, string>[]) ?? []).filter((r) => /^\d{8}$/.test(r.stck_bsop_date ?? ""));
    return rows
      .map((r): [string, ...number[]] => {
        const ctx = `program ${ticker} ${r.stck_bsop_date}`;
        return [
          isoFromYmd(r.stck_bsop_date),
          num(r, "whol_smtn_ntby_tr_pbmn", ctx), num(r, "whol_smtn_ntby_qty", ctx),
          num(r, "whol_smtn_shnu_tr_pbmn", ctx), num(r, "whol_smtn_seln_tr_pbmn", ctx),
        ];
      })
      .sort((a, b) => a[0].localeCompare(b[0]));
  });
}

/**
 * opinion — 증권사 투자의견·목표가 이력(FHKST663300C0). 1콜 최대 100건이라 2021-01~2026-10 전체를 한 번에 물어보고,
 * 100건이 차면 기간을 반으로 나눠 다시 묻는다. 수급 수집 대상(유동성 1회 이상 통과) 종목만.
 * 객체 배열 {d, opn, opnCode, prevOpn, prevCode, broker, target, prevClose}.
 */
if (mode === "opinion") {
  const { symbols } = loadUniverse();
  const todo = symbols.filter((s) => {
    if (fs.existsSync(`${CACHE}extra/opinion_${s.ticker}.json`)) return false;
    const bf = `${CACHE}bars/${s.ticker}.json`;
    return fs.existsSync(bf) && neededFlowDates(readJson<BarTuple[]>(bf)).length > 0;
  });
  console.log(`opinion 대상 ${todo.length}`);
  let done = 0;
  let calls = 0;
  type Op = { d: string; opn: string; opnCode: string; prevOpn: string; prevCode: string; broker: string; target: number; prevClose: number };
  const fetchRange = async (ticker: string, from: string, to: string, depth: number): Promise<Op[]> => {
    const d = await kisCall(() => kisRaw("invest-opinion", "FHKST663300C0", { FID_COND_MRKT_DIV_CODE: "J", FID_COND_SCR_DIV_CODE: "16633", FID_INPUT_ISCD: ticker, FID_INPUT_DATE_1: ymd(from), FID_INPUT_DATE_2: ymd(to) }));
    calls++;
    const rows = ((d.output as Record<string, string>[]) ?? []).filter((r) => /^\d{8}$/.test(r.stck_bsop_date ?? ""));
    if (rows.length >= 100 && depth < 8 && from < to) {
      const mid = isoOf(new Date((Date.parse(`${from}T00:00:00Z`) + Date.parse(`${to}T00:00:00Z`)) / 2));
      return [...(await fetchRange(ticker, from, mid, depth + 1)), ...(await fetchRange(ticker, addDays(mid, 1), to, depth + 1))];
    }
    return rows.map((r) => {
      const ctx = `opinion ${ticker} ${r.stck_bsop_date}`;
      return {
        d: isoFromYmd(r.stck_bsop_date),
        opn: (r.invt_opnn ?? "").trim(),
        opnCode: (r.invt_opnn_cls_code ?? "").trim(),
        prevOpn: (r.rgbf_invt_opnn ?? "").trim(),
        prevCode: (r.rgbf_invt_opnn_cls_code ?? "").trim(),
        broker: (r.mbcr_name ?? "").trim(),
        target: num(r, "hts_goal_prc", ctx),
        prevClose: num(r, "stck_prdy_clpr", ctx),
      };
    });
  };
  const complete = await runPool(todo, async (s) => {
    try {
      const list = (await fetchRange(s.ticker, "2021-01-01", TO, 0)).sort((a, b) => a.d.localeCompare(b.d) || a.broker.localeCompare(b.broker));
      fs.writeFileSync(`${CACHE}extra/opinion_${s.ticker}.json`, JSON.stringify(list)); // 0건도 정상(커버리지 없음)
    } catch (e) {
      failures.push({ mode, ticker: s.ticker, error: errMsg(e) });
      return;
    }
    if (++done % 100 === 0) console.log(`  opinion ${done}/${todo.length} · 콜 ${calls} · ${elapsed()} · 실패 ${failures.length}`);
  });
  saveFailures();
  console.log(`opinion ${complete ? "완료" : "⏸ 중단"}: 신규 ${done} · 콜 ${calls} · 실패 ${failures.length} · ${elapsed()}`);
}

// ── index ────────────────────────────────────────────────────────────────────
// fetchIndexDailyChunked 는 청크 하나만 500 이 나도 전체가 실패한다(재시도 없음). 다른 수집과 호출이 겹치면
// KIS 가 간헐적으로 500 을 주므로, 여기서는 같은 60일 청크를 직접 돌며 청크마다 kisCall 로 재시도한다.
if (mode === "index") {
  for (const code of ["0001", "1001"]) {
    const f = `${CACHE}index/${code}.json`;
    if (fs.existsSync(f)) continue;
    const rows = new Map<string, { date: string; close: number }>();
    for (let end = TO; end >= BAR_FROM; end = addDays(end, -INDEX_CHUNK_DAYS)) {
      const startRaw = addDays(end, -INDEX_CHUNK_DAYS + 1);
      const start = startRaw < BAR_FROM ? BAR_FROM : startRaw;
      const chunk = await kisCall(() => fetchIndexDailyChart(code, ymd(start), ymd(end)));
      for (const r of chunk) rows.set(r.date, r);
    }
    const list = [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
    if (list.length === 0) throw new Error(`지수 ${code} 0행`);
    fs.writeFileSync(f, JSON.stringify(list));
    console.log(`index ${code}: ${list.length}행 ${list[0].date}~${list.at(-1)!.date}`);
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
