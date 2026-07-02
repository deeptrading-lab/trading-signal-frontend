#!/usr/bin/env node
/**
 * 토스증권 Open API 스모크 테스트 — KIS 교체 검토용 실측.
 *
 * 문서(https://developers.tossinvest.com/docs)가 침묵하는 5가지를 발급 키로 직접 확인한다:
 *   ① 토큰 만료 주기 + 재발급 정책(연속 발급 시 동일 토큰 재사용 여부)
 *   ② 현재가/체결 신선도 (실시간 vs 지연 — 장중 실행이어야 판별력 있음)
 *   ③ 일봉 과거 조회 깊이 + 당일 진행 봉 포함 여부
 *   ④ 분봉 과거일 조회 가능 여부와 깊이
 *   ⑤ 종목정보(/stocks) 실제 응답 필드
 *
 * 사용:
 *   npm run toss:smoke                    # 기본 (분봉 30콜 ≈ 최근 15거래일 탐침)
 *   npm run toss:smoke -- --deep          # 분봉 300콜 (~150거래일)까지 깊이 탐침
 *   npm run toss:smoke -- --symbol=000660 # 대상 종목 변경 (기본 005930)
 *
 * .env.local 에 TOSS_CLIENT_ID / TOSS_CLIENT_SECRET 필요 (.env.local.example 참고).
 */

const BASE = "https://openapi.tossinvest.com";
const CHART_SPACING_MS = 300; // MARKET_DATA_CHART 5 TPS 준수

const args = process.argv.slice(2);
const DEEP = args.includes("--deep");
const SYMBOL = (args.find((a) => a.startsWith("--symbol=")) ?? "").split("=")[1] || "005930";

const clientId = process.env.TOSS_CLIENT_ID;
const clientSecret = process.env.TOSS_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("TOSS_CLIENT_ID / TOSS_CLIENT_SECRET 이 없습니다. .env.local 에 채운 뒤 npm run toss:smoke 로 실행하세요.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const kstDate = (d = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(d instanceof Date ? d : new Date(d));
const kstTime = (ts) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "medium" }).format(new Date(ts));
const agoSec = (ts) => Math.round((Date.now() - new Date(ts).getTime()) / 1000);

/** 응답 래핑이 {result: ...} 인지 평평한지 문서상 불명 — 둘 다 흡수 */
const unwrap = (json) => (json && typeof json === "object" && "result" in json ? json.result : json);
const pickArray = (body, ...keys) => {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return null;
  for (const k of keys) if (Array.isArray(body[k])) return body[k];
  return Object.values(body).find(Array.isArray) ?? null;
};

const rateLimitSeen = new Map(); // path prefix → 마지막 X-RateLimit-Limit
let token = null;

async function issueToken() {
  const res = await fetch(`${BASE}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

async function api(path, bearer) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${bearer ?? token}`, Accept: "application/json" },
    });
    const limit = res.headers.get("x-ratelimit-limit");
    if (limit) rateLimitSeen.set(path.split("?")[0], limit);
    if (res.status === 429 && attempt < 2) {
      const wait = Number(res.headers.get("retry-after") ?? "1");
      console.log(`  · 429 — ${wait}s 대기 후 재시도`);
      await sleep(wait * 1000 + 100);
      continue;
    }
    let json = null;
    try {
      json = await res.json();
    } catch {}
    return { status: res.status, json };
  }
}

const fail = (label, status, json) =>
  console.log(`  ✗ ${label} 실패 — HTTP ${status} ${JSON.stringify(json?.error ?? json)?.slice(0, 300)}`);

/** 캔들을 nextBefore 커서로 과거 방향 페이징하며 깊이 측정 */
async function probeCandles(interval, maxCalls) {
  const out = { total: 0, earliest: null, latest: null, calls: 0, reachedEnd: false, dates: new Set(), sample: null, firstPageLatest: null, error: null };
  let before = null;
  while (out.calls < maxCalls) {
    const qs = new URLSearchParams({ symbol: SYMBOL, interval, count: "200" });
    if (before) qs.set("before", before);
    const { status, json } = await api(`/api/v1/candles?${qs}`);
    out.calls++;
    if (status !== 200) {
      out.error = { status, json };
      break;
    }
    const body = unwrap(json);
    const candles = pickArray(body, "candles") ?? [];
    if (candles.length === 0) {
      out.reachedEnd = true;
      break;
    }
    if (!out.sample) out.sample = candles[0];
    out.total += candles.length;
    for (const c of candles) {
      const t = new Date(c.timestamp).getTime();
      if (!Number.isFinite(t)) continue;
      if (out.earliest === null || t < out.earliest) out.earliest = t;
      if (out.latest === null || t > out.latest) out.latest = t;
      if (interval === "1m") out.dates.add(kstDate(c.timestamp));
    }
    if (out.firstPageLatest === null) out.firstPageLatest = out.latest;
    const next = body?.nextBefore ?? null;
    if (!next || next === before) {
      out.reachedEnd = true;
      break;
    }
    before = next;
    await sleep(CHART_SPACING_MS);
  }
  return out;
}

console.log(`\n=== 토스증권 Open API 스모크 테스트 — ${SYMBOL}, ${kstTime(Date.now())} KST${DEEP ? " (deep)" : ""} ===\n`);

// ① 토큰
console.log("① 토큰 발급 (POST /oauth2/token)");
const t1 = await issueToken();
if (t1.status !== 200 || !t1.json?.access_token) {
  fail("토큰 발급", t1.status, t1.json);
  process.exit(1);
}
token = t1.json.access_token;
const meta = Object.fromEntries(Object.entries(t1.json).filter(([k]) => k !== "access_token"));
console.log(`  ✓ 발급 성공 — ${JSON.stringify(meta)}`);
if (t1.json.expires_in) console.log(`  · 만료: ${t1.json.expires_in}초 (≈ ${(t1.json.expires_in / 3600).toFixed(1)}시간)`);

// ② 현재가/체결 신선도
const OTHER = /^\d{6}$/.test(SYMBOL) ? "AAPL" : "005930"; // 반대 시장 종목을 곁들여 KR/US 응답 비교
console.log(`\n② 현재가/체결/호가 신선도 (/prices, /trades, /orderbook)`);
const p1 = await api(`/api/v1/prices?symbols=${SYMBOL},${OTHER}`);
if (p1.status !== 200) fail("prices", p1.status, p1.json);
else {
  const list = pickArray(unwrap(p1.json), "prices") ?? [];
  console.log(`  · 응답 원문 필드: ${JSON.stringify(list)}`);
  const mine = list.find((p) => p.symbol === SYMBOL);
  if (mine?.timestamp) console.log(`  · ${SYMBOL} 시세 시각: ${kstTime(mine.timestamp)} (지금으로부터 ${agoSec(mine.timestamp)}초 전)`);
  await sleep(4000);
  const p2 = await api(`/api/v1/prices?symbols=${SYMBOL}`);
  const mine2 = (pickArray(unwrap(p2.json), "prices") ?? [])[0];
  if (mine && mine2)
    console.log(`  · 4초 후 재조회: lastPrice ${mine.lastPrice} → ${mine2.lastPrice}, timestamp ${mine.timestamp === mine2.timestamp ? "동일(장외이거나 갱신 없음)" : `전진(${agoSec(mine2.timestamp)}초 전)`}`);
}
const tr = await api(`/api/v1/trades?symbol=${SYMBOL}&count=3`);
if (tr.status !== 200) fail("trades", tr.status, tr.json);
else {
  const trades = pickArray(unwrap(tr.json), "trades") ?? [];
  const newest = trades[0]?.timestamp ?? trades[trades.length - 1]?.timestamp;
  console.log(`  · 최근 체결 ${trades.length}건${newest ? `, 최신 체결 ${kstTime(newest)} (${agoSec(newest)}초 전)` : ""}`);
  console.log(`  ※ 실시간/지연 판별은 해당 시장 개장 시간대 실행 기준으로 해석할 것`);
}
const ob = await api(`/api/v1/orderbook?symbol=${SYMBOL}`);
if (ob.status !== 200) fail("orderbook", ob.status, ob.json);
else {
  const b = unwrap(ob.json);
  console.log(`  · 호가: asks ${b?.asks?.length ?? 0}단 / bids ${b?.bids?.length ?? 0}단${b?.timestamp ? ` (${kstTime(b.timestamp)})` : ""}`);
}
const pl = await api(`/api/v1/price-limits?symbol=${SYMBOL}`);
console.log(pl.status === 200 ? `  · 상하한가: ${JSON.stringify(unwrap(pl.json))}` : `  · 상하한가: HTTP ${pl.status} (${pl.json?.error?.code ?? "?"}) — 미국 종목이면 개념상 미지원일 수 있음`);

// ③ 일봉 깊이
console.log(`\n③ 일봉 과거 깊이 (/candles?interval=1d, 콜당 200개 페이징)`);
const daily = await probeCandles("1d", DEEP ? 80 : 40);
if (daily.error) fail("일봉", daily.error.status, daily.error.json);
if (daily.total > 0) {
  console.log(`  · 캔들 샘플 필드: ${JSON.stringify(daily.sample)}`);
  console.log(`  · ${daily.calls}콜 / 총 ${daily.total}개 — 범위 ${kstDate(daily.earliest)} ~ ${kstDate(daily.latest)}`);
  console.log(`  · 과거 한계: ${daily.reachedEnd ? `${kstDate(daily.earliest)} 에서 데이터 끝(진짜 한계)` : `콜 상한 도달 — 최소 ${kstDate(daily.earliest)} 이전까지 더 있음`}`);
  const today = kstDate();
  console.log(`  · 당일(${today}) 진행 봉 포함: ${kstDate(daily.firstPageLatest) === today ? "예" : `아니오 (최신 봉 ${kstDate(daily.firstPageLatest)}) — 장 시작 전이면 정상일 수 있음`}`);
}

// ④ 분봉 깊이
console.log(`\n④ 분봉 과거일 조회 (/candles?interval=1m) — ${DEEP ? 300 : 30}콜 탐침`);
const minute = await probeCandles("1m", DEEP ? 300 : 30);
if (minute.error) fail("분봉", minute.error.status, minute.error.json);
if (minute.total > 0) {
  const days = [...minute.dates].sort();
  console.log(`  · ${minute.calls}콜 / 총 ${minute.total}개 — ${days.length}개 거래일 (${days[0]} ~ ${days[days.length - 1]})`);
  console.log(`  · 과거 한계: ${minute.reachedEnd ? `${kstTime(minute.earliest)} 에서 끝(진짜 한계)` : `콜 상한 도달 — ${days[0]} 이전까지 더 있음 (--deep 으로 추가 탐침)`}`);
  console.log(`  · 과거일 분봉 제공: ${days.length > 1 ? "예 — 당일 외 과거 거래일 분봉 존재" : "당일치만 확인됨(탐침 범위 내)"}`);
}

// ⑤ 종목정보 필드
console.log(`\n⑤ 종목정보 (/stocks?symbols=${SYMBOL},${OTHER})`);
const st = await api(`/api/v1/stocks?symbols=${SYMBOL},${OTHER}`);
if (st.status !== 200) fail("stocks", st.status, st.json);
else console.log(`  · 응답 원문: ${JSON.stringify(pickArray(unwrap(st.json), "stocks") ?? unwrap(st.json))}`);

// ⑥ 시장정보 핑
console.log(`\n⑥ 환율/장캘린더 핑 (MARKET_INFO)`);
const fx = await api(`/api/v1/exchange-rate?baseCurrency=USD&quoteCurrency=KRW`);
console.log(fx.status === 200 ? `  · 환율: ${JSON.stringify(unwrap(fx.json))}` : `  ✗ 환율 HTTP ${fx.status}`);
await sleep(400);
const cal = await api(`/api/v1/market-calendar/KR`);
console.log(cal.status === 200 ? `  · KR 캘린더 키: ${Object.keys(unwrap(cal.json) ?? {}).join(", ")}` : `  ✗ 캘린더 HTTP ${cal.status}`);

// ⑦ 토큰 재발급 정책 — 반드시 마지막(재발급이 기존 토큰을 무효화하면 이후 호출이 전부 401이 되므로)
console.log(`\n⑦ 토큰 재발급 정책`);
await sleep(1100);
const t2 = await issueToken();
let revokes = "판별 불가";
if (t2.status === 200 && t2.json?.access_token) {
  if (t2.json.access_token === token) {
    revokes = "동일 토큰 재사용(서버측 캐시)";
    console.log(`  · 연속 재발급: 동일 토큰 반환 — 서버가 활성 토큰을 캐시함`);
  } else {
    console.log(`  · 연속 재발급: 성공 — 매번 새 토큰 발급`);
    await sleep(500);
    const oldProbe = await api(`/api/v1/exchange-rate?baseCurrency=USD&quoteCurrency=KRW`, token); // 이전 토큰으로 호출
    revokes = oldProbe.status === 401 ? "재발급 시 기존 토큰 즉시 무효화(단일 활성 토큰)" : `기존 토큰 병행 유효(HTTP ${oldProbe.status})`;
    console.log(`  · 재발급 후 이전 토큰 상태: ${revokes}`);
    if (oldProbe.status === 401)
      console.log(`  ⚠️ 다중 인스턴스(Vercel)가 각자 발급하면 서로 토큰을 죽임 — KIS처럼 공유 store(단일 발급 수렴) 필수`);
  }
} else {
  revokes = `재발급 자체가 HTTP ${t2.status} — 발급 빈도 제한 가능성`;
  console.log(`  · 연속 재발급: HTTP ${t2.status} — ${JSON.stringify(t2.json?.error ?? t2.json)?.slice(0, 200)}`);
}

// 요약
console.log(`\n=== 요약 — 문서에 없던 미지수 실측 ===`);
console.log(`① 토큰: 만료 ${t1.json.expires_in ? `${t1.json.expires_in}초` : "expires_in 없음"} / ${revokes}`);
console.log(`② 시세 신선도: 위 ② 섹션 타임스탬프 참고 (장중 실행 기준으로 판단)`);
console.log(`③ 일봉 깊이: ${daily.total > 0 ? `${kstDate(daily.earliest)} 까지 확인${daily.reachedEnd ? " (끝 도달)" : " (더 있음)"}` : "실패"} / 당일봉 ${daily.total > 0 && kstDate(daily.firstPageLatest) === kstDate() ? "포함" : "미포함·확인 필요"}`);
console.log(`④ 분봉 깊이: ${minute.total > 0 ? `${minute.dates.size}개 거래일 확인${minute.reachedEnd ? " (끝 도달)" : " (더 있음 — --deep)"}` : "실패"}`);
console.log(`⑤ 레이트리밋 실측: ${[...rateLimitSeen.entries()].map(([p, l]) => `${p.replace("/api/v1/", "")}=${l}/s`).join(", ") || "헤더 미노출"}`);
