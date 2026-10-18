/**
 * 새 입력 감사(E-2) 데이터 수집 — 사전 등록 `docs/analysis/new-input-audit-preregistration.md` §1·§5.
 *
 *   npx tsx scripts/signal/collect-flow.mts
 *
 * 출력(scripts/signal/__flow__/, gitignore — 재실행 시 있는 것은 스킵 = 이어받기):
 * - dart_<bgn>_<end>.json : OpenDART 주요사항보고(corp_cls=Y, pblntf_ty=B, last_reprt_at=N) 3개월 창
 * - sectors.json          : ticker → KIS inquire-price `bstp_kor_isnm`(업종명), 캐시 전 종목
 * - <ticker>.json         : KIS FHPTJ04160001 일별 [{d, f(외국인 순매수 백만원), o(기관계), tv(acml_tr_pbmn)}]
 *
 * 조회 전용 TR 만 쓴다(주문 API 없음). KIS 호출 간 ≥ 200ms, transient 1회 재시도,
 * 야간 점검 시간대(21:45~07:00 KST)에 들어가면 그 자리에서 중단 → 다음 실행이 이어받는다.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { StockDailyCandle } from "@/lib/api/kis/types";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
for (const line of fs.readFileSync(`${ROOT}.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const DAILY = fileURLToPath(new URL("./__daily__/", import.meta.url));
const OUT = fileURLToPath(new URL("./__flow__/", import.meta.url));
fs.mkdirSync(OUT, { recursive: true });

const { getKisClient } = await import("@/lib/api/kis/client");
const { getAccessToken } = await import("@/lib/api/kis/token");

const FLOW_FROM = "20240102", FLOW_TO = "20260810";
const GAP_MS = 220;
const MIN_TURNOVER = 3_000_000_000, MIN_CLOSE = 1_000; // daily-audit 와 동일
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** KIS 야간 점검 창(21:45~07:00 KST) 안이면 true. */
function inKisMaintenance(): boolean {
  const kst = new Date(Date.now() + 9 * 3600_000);
  const min = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  return min >= 21 * 60 + 45 || min < 7 * 60;
}

// ── 유니버스 ─────────────────────────────────────────────────────────────────
const tickers = fs.readdirSync(DAILY).filter((f) => /^\d{6}\.json$/.test(f)).map((f) => f.slice(0, 6)).sort();
/** 기간 중 유동성 필터를 1회 이상 통과한 종목 — 수급 수집 대상(사전 등록 §1). */
const everLiquid = tickers.filter((t) => {
  const c: StockDailyCandle[] = JSON.parse(fs.readFileSync(`${DAILY}${t}.json`, "utf8"));
  for (let i = 19; i < c.length; i++) {
    if (c[i].close < MIN_CLOSE) continue;
    let s = 0;
    for (let k = i - 19; k <= i; k++) s += c[k].close * (c[k].volume ?? 0);
    if (s / 20 >= MIN_TURNOVER) return true;
  }
  return false;
});
console.log(`캐시 ${tickers.length}종목 · 유동성 1회 이상 통과 ${everLiquid.length}종목`);

// ── 1. OpenDART 주요사항보고 ─────────────────────────────────────────────────
const dartKey = process.env.OPENDART_API_KEY ?? "";
if (!dartKey) throw new Error("OPENDART_API_KEY 없음");
const ymd = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");
for (let s = new Date("2023-12-01T00:00:00Z"); ymd(s) <= FLOW_TO; ) {
  const e = new Date(s);
  e.setUTCMonth(e.getUTCMonth() + 3);
  e.setUTCDate(e.getUTCDate() - 1);
  const bgn = ymd(s), end = ymd(e) > FLOW_TO ? FLOW_TO : ymd(e);
  const f = `${OUT}dart_${bgn}_${end}.json`;
  if (!fs.existsSync(f)) {
    const list: unknown[] = [];
    for (let page = 1, total = 1; page <= total; page++) {
      const q = new URLSearchParams({ crtfc_key: dartKey, corp_cls: "Y", pblntf_ty: "B", last_reprt_at: "N", bgn_de: bgn, end_de: end, page_count: "100", page_no: String(page) });
      const j = await fetch(`https://opendart.fss.or.kr/api/list.json?${q}`).then((r) => r.json());
      if (j.status === "013") break; // 조회 결과 없음
      if (j.status !== "000") throw new Error(`DART ${bgn}~${end} p${page}: ${j.status} ${j.message}`);
      total = j.total_page;
      list.push(...j.list);
      await sleep(200);
    }
    fs.writeFileSync(f, JSON.stringify(list));
    console.log(`  DART ${bgn}~${end}: ${list.length}건`);
  }
  s = new Date(e);
  s.setUTCDate(s.getUTCDate() + 1);
}

// ── KIS 공통 ─────────────────────────────────────────────────────────────────
let token = await getAccessToken();
async function kisGet(path: string, trId: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  for (let attempt = 0; ; attempt++) {
    await sleep(GAP_MS);
    try {
      const r = await getKisClient().get(path, {
        headers: { authorization: `Bearer ${token}`, appkey: process.env.KIS_APP_KEY!, appsecret: process.env.KIS_APP_SECRET!, tr_id: trId, custtype: "P" },
        params,
      });
      const d = r.data as { rt_cd?: string; msg_cd?: string; msg1?: string };
      if (d.rt_cd === "0") return r.data;
      // 초당 거래건수 초과·토큰 만료는 transient 로 보고 1회 재시도.
      if (attempt === 0 && (d.msg_cd === "EGW00201" || d.msg_cd === "EGW00123")) {
        if (d.msg_cd === "EGW00123") token = await getAccessToken();
        await sleep(1000);
        continue;
      }
      throw new Error(`KIS ${trId} ${d.msg_cd} ${d.msg1}`);
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      const transient = status === undefined || status >= 500;
      if (attempt === 0 && transient && !(e instanceof Error && e.message.startsWith("KIS "))) { await sleep(1000); continue; }
      throw e;
    }
  }
}
function stopIfMaintenance(where: string) {
  if (!inKisMaintenance()) return;
  console.log(`\n⏸ KIS 야간 점검 시간대 — ${where} 에서 중단. 재실행하면 캐시 스킵 후 이어받는다.`);
  process.exit(0);
}

// ── 2. 업종명 (캐시 전 종목 — F4 비교군) ─────────────────────────────────────
const secFile = `${OUT}sectors.json`;
const sectors: Record<string, string> = fs.existsSync(secFile) ? JSON.parse(fs.readFileSync(secFile, "utf8")) : {};
let secFail = 0;
for (const t of tickers) {
  if (t in sectors) continue;
  stopIfMaintenance(`업종명(${Object.keys(sectors).length}/${tickers.length})`);
  try {
    const d = await kisGet("/uapi/domestic-stock/v1/quotations/inquire-price", "FHKST01010100", { FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: t });
    sectors[t] = String((d.output as { bstp_kor_isnm?: string })?.bstp_kor_isnm ?? "").trim();
  } catch (e) { secFail++; console.log(`  업종 실패 ${t}: ${(e as Error).message}`); continue; }
  if (Object.keys(sectors).length % 100 === 0) fs.writeFileSync(secFile, JSON.stringify(sectors));
}
fs.writeFileSync(secFile, JSON.stringify(sectors));
console.log(`업종명 ${Object.keys(sectors).length}/${tickers.length} (실패 ${secFail})`);

// ── 3. 종목별 일별 투자자 매매 ───────────────────────────────────────────────
type FlowRow = { d: string; f: number; o: number; tv: number };
const prevDay = (yyyymmdd: string) => {
  const d = new Date(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return ymd(d);
};
let done = 0, skipped = 0, failed = 0, empty = 0;
const t0 = Date.now();
for (const t of everLiquid) {
  const f = `${OUT}${t}.json`;
  if (fs.existsSync(f)) { skipped++; continue; }
  stopIfMaintenance(`수급(${skipped + done}/${everLiquid.length})`);
  const rows = new Map<string, FlowRow>();
  let cursor = FLOW_TO;
  try {
    for (let guard = 0; guard < 40; guard++) {
      const d = await kisGet("/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily", "FHPTJ04160001", {
        FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: t, FID_INPUT_DATE_1: cursor, FID_ORG_ADJ_PRC: "", FID_ETC_CLS_CODE: "1",
      });
      const out = ((d.output2 as Array<Record<string, string>>) ?? []).filter((r) => /^\d{8}$/.test(r.stck_bsop_date ?? ""));
      if (out.length === 0) break;
      for (const r of out) {
        rows.set(r.stck_bsop_date, { d: r.stck_bsop_date, f: Number(r.frgn_ntby_tr_pbmn), o: Number(r.orgn_ntby_tr_pbmn), tv: Number(r.acml_tr_pbmn) });
      }
      const oldest = out.map((r) => r.stck_bsop_date).sort()[0];
      if (oldest <= FLOW_FROM || oldest >= cursor) break;
      cursor = prevDay(oldest);
    }
  } catch (e) { failed++; console.log(`  수급 실패 ${t}: ${(e as Error).message}`); continue; } // 파일 안 씀 → 재실행 시 재시도
  const list = [...rows.values()]
    .filter((r) => r.d >= FLOW_FROM && r.d <= FLOW_TO)
    .sort((a, b) => a.d.localeCompare(b.d))
    .map((r) => ({ ...r, d: `${r.d.slice(0, 4)}-${r.d.slice(4, 6)}-${r.d.slice(6, 8)}` }));
  fs.writeFileSync(f, JSON.stringify(list));
  if (list.length === 0) empty++;
  done++;
  if (done % 25 === 0) {
    const el = (Date.now() - t0) / 1000;
    console.log(`  수급 ${skipped + done}/${everLiquid.length} (${el.toFixed(0)}s · 잔여 약 ${(((everLiquid.length - skipped - done) * el) / done / 60).toFixed(1)}분)`);
  }
}
console.log(`\n수급 완료: 신규 ${done} · 스킵 ${skipped} · 빈응답 ${empty} · 실패 ${failed} · ${((Date.now() - t0) / 60000).toFixed(1)}분`);
