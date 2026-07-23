/**
 * 틱 자가채점 라벨링 엔진 — intraday-decision-overhaul PR-2 (서버 전용).
 *
 * 영속된 모의 단타 틱(decision.intradaySnapshot)을 그날 이후 분봉 경로와 대조해
 * WIN/LOSS/NEUTRAL/UNRESOLVED 로 채점하고 Supabase `intraday_tick_labels` 에 멱등 upsert 한다.
 * HOLD 틱도 스냅샷 구조 레벨(tp/sl)로 "만약 그 레벨로 진입했다면"의 **반사실(counterfactual)**
 * 라벨을 남긴다 — conviction 컷·임계값 캘리브레이션(PR-3a/PR-4)의 근거 데이터.
 *
 * 설계 원칙:
 * - **관측 전용** — 트레이딩 루프 무접촉. 세션 완료 훅은 fire-and-forget(모든 실패 삼킴).
 * - 라벨 규칙은 `lib/signal/backtest/label.ts` tripleBarrier 와 동일 시맨틱(봉 내 TP·SL 동시 터치
 *   시 손절 우선 — 보수적). tripleBarrier 를 직접 재사용하지 않는 이유: ① 배리어가 절대가(틱의
 *   targetPrice/스냅샷 레벨)로 이미 확정돼 있는데 tripleBarrier 는 %·ATR·구조 재계산 모드만 받고
 *   ② 진입가가 봉 종가가 아니라 스냅샷 basePrice 이며 ③ horizon 이 봉 수가 아니라 "당일 15:20"
 *   벽시계다. 옵션으로 우겨넣으면 returnPct 기준이 뒤틀려, 같은 우선순위 규칙의 작은 로컬 워커가
 *   더 정직하다.
 * - Supabase REST 는 `lib/server/paperTrading/persistence.ts` 관례 그대로(supabaseConfig·헤더·
 *   4s 타임아웃·warnOnce). never-throw.
 * - ⚠️ KIS 과거 분봉(`inquire-time-dailychartprice`)은 **최근 며칠만** 조회 가능 — 오래된 틱은
 *   UNRESOLVED 가 정상이며 기대 동작이다(코퍼스 백필 시 다수 발생).
 */

import { isKisConfigured } from "@/lib/api/kis";
import {
  fetchMinuteCandlesForDate,
  fetchTodayMinuteCandles,
} from "@/lib/api/kis/minuteChartChunked";
import { minutesOfDay } from "@/lib/api/kis/minuteResample";
import { createLogger } from "@/lib/server/logTag";
import { getSupabaseServiceConfig } from "@/lib/server/supabase/egressGuard";
import {
  PAPER_TRADING_CLOSE_FLATTEN_HHMM,
  deriveIntradayTimeframe,
} from "@/lib/server/paperTrading/constants";
import type { StockMinuteCandle } from "@/lib/api/kis/types";
import type {
  PaperTradingDecision,
  PaperTradingSession,
  PaperTradingTick,
} from "@/lib/types/paperTrading/paperTrading";
import type {
  IntradayTickLabelPayload,
  IntradayTickLabelRow,
  IntradayTickLabelSource,
  IntradayTickLabelSummaryResponse,
  IntradayLabelBucket,
  IntradayLabelCounts,
  IntradayScoreBand,
  IntradayScoreBandBucket,
  IntradayTickLabelValue,
} from "@/lib/types/intraday/tickLabels";

const log = createLogger("tick-labels");

const LABELS_TABLE = "intraday_tick_labels";
/** 개별 REST 호출 타임아웃 — persistence.ts 관례(4s) 동일. */
const FETCH_TIMEOUT_MS = 4_000;
/** upsert 청크 크기 — payload jsonb 포함 행이라 과대 요청을 피한다. */
const UPSERT_CHUNK_SIZE = 200;
/** 집계/기존라벨 조회 페이지 크기·총량 캡 — PostgREST 조용한 절단(max-rows) 회피(persistence 선례). */
const PAGE_SIZE = 1_000;
const MAX_ROWS = 20_000;

/** 시간 만료 경계(분) — 강제 청산 창(15:20)과 동일 상수에서 파생(단일 진실). */
const EXPIRY_MINUTES = (() => {
  const [hh, mm] = PAPER_TRADING_CLOSE_FLATTEN_HHMM.split(":");
  return Number(hh) * 60 + Number(mm);
})();

// ─── Supabase REST 공통(persistence.ts 관례) ─────────────────────────────────

function supabaseConfig(): { url: string; key: string } | null {
  return getSupabaseServiceConfig();
}

function headers(key: string, extra?: Record<string, string>): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** 실패 로그 1회 억제 — 미설정/장애가 라벨링마다 콘솔을 도배하지 않게. */
let warnedOnce = false;
function warnOnce(message: string, error?: unknown): void {
  if (warnedOnce) return;
  warnedOnce = true;
  log.warn(`${message} — 이후 동일 경고 생략`, error);
}

/** 라벨 저장소(Supabase) 설정 여부 — 라우트가 미설정 fail-soft 응답을 만들 때 사용. */
export function isTickLabelStoreConfigured(): boolean {
  return supabaseConfig() !== null;
}

// ─── 순수 라벨 계산 ──────────────────────────────────────────────────────────

/** `labelTick` 계산 결과 — DB 행(payload)으로 변환되기 전의 순수 산출물. */
export interface TickLabelComputation {
  label: IntradayTickLabelValue;
  /** 진입가(basePrice) 대비 실현 수익률(%) — UNRESOLVED 는 null. */
  returnPct: number | null;
  /** 판단→청산까지 경과 분 — UNRESOLVED 는 null. */
  exitMinutes: number | null;
  entryPrice: number | null;
  tpPrice: number | null;
  slPrice: number | null;
  tpFrom: "decision" | "levels" | null;
  slFrom: "decision" | "levels" | null;
  /** UNRESOLVED 사유(진단·payload 영속) — 확정 라벨은 null. */
  reason: string | null;
}

/** ISO(UTC) → KST "YYYY-MM-DDTHH:mm" — 분봉 date 스탬프와 같은 사전식 비교 가능 형식. */
export function kstMinuteStamp(iso: string): string {
  // sv-SE 로케일은 "YYYY-MM-DD HH:mm" 을 내놓는다 — 공백만 T 로 치환.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(" ", "T");
}

/**
 * 영속 틱에서 판단 출처 파생 — `PaperTradingDecision.source` 는 provider("cli-agent")만 남고
 * `IntradayDecision.source`(intraday-cli/fallback)는 미영속이라, **judge 성공 시에만 기록되는
 * judgeModel 존재 여부**로 복원한다(intradayCli.withModels — judge:true 는 LLM 결정 경로뿐.
 * preGate 스킵·judge 실패 폴백은 judgeModel 미기록).
 */
export function deriveTickLabelSource(decision: PaperTradingDecision): IntradayTickLabelSource {
  return decision.judgeModel ? "intraday-cli" : "intraday-fallback";
}

function unresolved(reason: string, partial?: Partial<TickLabelComputation>): TickLabelComputation {
  return {
    label: "UNRESOLVED",
    returnPct: null,
    exitMinutes: null,
    entryPrice: null,
    tpPrice: null,
    slPrice: null,
    tpFrom: null,
    slFrom: null,
    reason,
    ...partial,
  };
}

/**
 * 틱 1개 라벨 계산(순수) — 판단 시점 **이후** 같은 거래일 분봉을 걸어 삼중배리어 결과를 낸다.
 *
 * - 진입가 = `intradaySnapshot.basePrice`(판단 기준가 — 마지막 분봉 종가).
 * - TP/SL = LLM 결정가(`decision.targetPrice`/`invalidationPrice`) 우선, null 이면 스냅샷 구조
 *   레벨(`levels.tpPrice/slPrice`) — HOLD 틱의 반사실 라벨은 후자로 성립한다.
 * - 방향 = 항상 LONG(단타 전략은 신규 진입이 BUY 뿐) — SELL/HOLD 틱도 "그 레벨로 롱 진입했다면".
 * - 워크 = 판단 스탬프(KST 분) **초과** 봉만(판단이 일어난 진행 중 봉 제외 — 룩어헤드 방지),
 *   같은 날 15:20(강제 청산 창) 이내. 봉 내 TP·SL 동시 터치는 손절 우선(tripleBarrier 보수 규칙).
 * - 만료 = 15:20 까지 미도달 → 마지막 봉 종가 NEUTRAL / 이후 봉 없음·데이터 없음 → UNRESOLVED.
 */
export function labelTick(
  tick: PaperTradingTick,
  minuteCandles: StockMinuteCandle[],
): TickLabelComputation {
  const snapshot = tick.decision.intradaySnapshot;
  if (!snapshot) return unresolved("스냅샷 없음(스냅샷 도입 이전 틱)");

  const entry = snapshot.basePrice;
  if (!Number.isFinite(entry) || entry <= 0) return unresolved("기준가 없음");

  const tpFrom: "decision" | "levels" | null =
    tick.decision.targetPrice != null ? "decision" : snapshot.levels.tpPrice != null ? "levels" : null;
  const slFrom: "decision" | "levels" | null =
    tick.decision.invalidationPrice != null
      ? "decision"
      : snapshot.levels.slPrice != null
        ? "levels"
        : null;
  const tp = tick.decision.targetPrice ?? snapshot.levels.tpPrice ?? null;
  const sl = tick.decision.invalidationPrice ?? snapshot.levels.slPrice ?? null;
  const levelMeta = { entryPrice: entry, tpPrice: tp, slPrice: sl, tpFrom, slFrom };

  if (tp === null || sl === null) return unresolved("TP/SL 레벨 없음", levelMeta);
  // 롱 기준 정합 검사 — 역전 레벨(TP≤진입가 등)은 채점 의미가 없다(쓰레기 라벨 방지).
  if (!(tp > entry && sl < entry && sl > 0)) return unresolved("레벨 부정합(롱 기준 역전)", levelMeta);

  const decidedAtIso = tick.tickWindowStart || tick.pricedAt || tick.createdAt;
  const stamp = kstMinuteStamp(decidedAtIso);
  const day = stamp.slice(0, 10);
  const decidedMin = minutesOfDay(stamp);

  // 판단 이후 같은 날 · 15:20 이내 봉만. `date > stamp` 는 판단이 속한 진행 중 봉(버킷 시작 ≤ 판단
  // 시각)을 자연히 제외한다 — 그 봉의 초반 움직임은 판단과 동시간대라 룩어헤드 위험.
  const future = minuteCandles.filter((c) => {
    if (c.date.slice(0, 10) !== day || c.date <= stamp) return false;
    const min = minutesOfDay(c.date);
    return min >= 0 && min <= EXPIRY_MINUTES;
  });
  if (future.length === 0) return unresolved("판단 이후 분봉 없음(과거 조회 불가·장 막판)", levelMeta);

  const realized = (exitPrice: number) => ((exitPrice - entry) / entry) * 100;
  const exitMinutesAt = (bar: StockMinuteCandle) => {
    const exitMin = minutesOfDay(bar.date);
    return exitMin >= 0 && decidedMin >= 0 ? exitMin - decidedMin : null;
  };

  for (const bar of future) {
    const slHit = bar.low <= sl;
    const tpHit = bar.high >= tp;
    // 보수적: 같은 봉 양쪽 터치 시 손절 우선(tripleBarrier 규칙 미러 — 과대평가 방지).
    if (slHit) {
      return { label: "LOSS", returnPct: realized(sl), exitMinutes: exitMinutesAt(bar), reason: null, ...levelMeta };
    }
    if (tpHit) {
      return { label: "WIN", returnPct: realized(tp), exitMinutes: exitMinutesAt(bar), reason: null, ...levelMeta };
    }
  }

  // 시간 만료(15:20) — 마지막 봉 종가 기준 NEUTRAL.
  const last = future[future.length - 1];
  return {
    label: "NEUTRAL",
    returnPct: realized(last.close),
    exitMinutes: exitMinutesAt(last),
    reason: null,
    ...levelMeta,
  };
}

// ─── 세션 단위 라벨링(분봉 페치 + upsert) ────────────────────────────────────

export interface SessionLabelResult {
  /** WIN/LOSS/NEUTRAL 로 확정 저장한 수. */
  labeled: number;
  /** UNRESOLVED 로 저장한 수. */
  unresolved: number;
  /** 저장 자체를 건너뛰었는가(Supabase/KIS 미설정 — UNRESOLVED 오염 없이 skip). */
  skipped: boolean;
}

const SKIPPED: SessionLabelResult = { labeled: 0, unresolved: 0, skipped: true };

function todayKstDate(): string {
  return kstMinuteStamp(new Date().toISOString()).slice(0, 10);
}

/** (ticker, KST 일자) 분봉 1회 페치 — 당일=라이브 페이저 / 과거=일자 지정. 실패는 빈 배열. */
async function fetchDayMinuteCandles(
  ticker: string,
  dayKst: string,
  timeframe: number,
): Promise<StockMinuteCandle[]> {
  try {
    if (dayKst === todayKstDate()) return await fetchTodayMinuteCandles(ticker, timeframe, 400);
    // ⚠️ KIS 과거 분봉은 최근 며칠만 제공 — 그 밖의 일자는 빈 응답 → 해당 틱 전부 UNRESOLVED(기대 동작).
    return await fetchMinuteCandlesForDate(ticker, dayKst.replaceAll("-", ""), timeframe);
  } catch {
    return [];
  }
}

function toLabelRow(
  tick: PaperTradingTick,
  ticker: string,
  timeframe: number,
  comp: TickLabelComputation,
): Record<string, unknown> {
  const snapshot = tick.decision.intradaySnapshot;
  const payload: IntradayTickLabelPayload = {
    signalScore: snapshot?.signal.score ?? null,
    signalAction: snapshot?.signal.action ?? null,
    signalConfidence: snapshot?.signal.confidence ?? null,
    regime: snapshot?.signal.regime ?? null,
    entryPrice: comp.entryPrice,
    tpPrice: comp.tpPrice,
    slPrice: comp.slPrice,
    tpFrom: comp.tpFrom,
    slFrom: comp.slFrom,
    rrr: snapshot?.levels.rrr ?? null,
    tpSource: snapshot?.levels.tpSource ?? null,
    slSource: snapshot?.levels.slSource ?? null,
    structureEvent: snapshot?.structureEvent ?? null,
    timeframe,
    conviction: null, // PR-3a 에서 judge 점수화가 채운다(placeholder).
    reason: comp.reason,
  };
  return {
    tick_id: tick.id,
    session_id: tick.sessionId,
    ticker,
    tick_index: tick.tickIndex,
    decided_at: tick.tickWindowStart || tick.pricedAt || tick.createdAt,
    action: tick.decision.action,
    source: deriveTickLabelSource(tick.decision),
    label: comp.label,
    return_pct: comp.returnPct,
    exit_minutes: comp.exitMinutes,
    payload,
    // DB default now() 는 upsert **갱신**엔 안 먹는다 — 재실행 시 갱신 시각이 남게 명시.
    labeled_at: new Date().toISOString(),
  };
}

/** 라벨 행 청크 upsert(on_conflict=tick_id, merge-duplicates — 재실행 멱등). 성공 행 수 반환. */
async function upsertLabelRows(rows: Record<string, unknown>[]): Promise<number> {
  const config = supabaseConfig();
  if (!config || rows.length === 0) return 0;
  let persisted = 0;
  for (let offset = 0; offset < rows.length; offset += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(offset, offset + UPSERT_CHUNK_SIZE);
    try {
      const res = await fetch(`${config.url}/rest/v1/${LABELS_TABLE}?on_conflict=tick_id`, {
        method: "POST",
        headers: headers(config.key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        warnOnce(`라벨 저장 실패 HTTP ${res.status}`, await res.text().catch(() => ""));
        continue;
      }
      persisted += chunk.length;
    } catch (error) {
      warnOnce("라벨 저장 실패(네트워크)", error);
    }
  }
  return persisted;
}

/**
 * 세션 틱 라벨링 — (ticker, KST 일자)당 분봉 1회 페치 후 전 틱 채점·멱등 upsert. never-throw.
 *
 * - Supabase 미설정 → skip(저장 불가).
 * - KIS 미설정 → skip — UNRESOLVED 를 영속하면 run 라우트의 tick_id dedupe 가 영영 건너뛰므로,
 *   env 문제일 뿐인 틱은 저장하지 않는다(설정 후 재실행 시 정상 채점). 데이터 소스 게이트는
 *   sibling(intradayTickDecision)과 동일하게 isKisConfigured 만 본다(토스 폴백은 페처 내부 소관).
 */
export async function labelSessionTicks(
  session: PaperTradingSession,
  ticks: PaperTradingTick[],
): Promise<SessionLabelResult> {
  try {
    if (session.decisionProvider !== "cli-agent" || ticks.length === 0) return SKIPPED;
    if (!supabaseConfig() || !isKisConfigured()) return SKIPPED;

    const ticker = session.stocks[0]?.ticker ?? session.tickers[0];
    if (!ticker) return SKIPPED;
    const timeframe = deriveIntradayTimeframe(session.tickIntervalMinutes);

    // KST 일자별 그룹 — 크로스데이 세션(과거 자동종료 이전)도 일자별로 정확히 채점.
    const byDay = new Map<string, PaperTradingTick[]>();
    for (const tick of ticks) {
      const day = kstMinuteStamp(tick.tickWindowStart || tick.pricedAt || tick.createdAt).slice(0, 10);
      byDay.set(day, [...(byDay.get(day) ?? []), tick]);
    }

    const rows: Record<string, unknown>[] = [];
    let labeled = 0;
    let unresolvedCount = 0;
    for (const [day, dayTicks] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const candles = await fetchDayMinuteCandles(ticker, day, timeframe);
      for (const tick of dayTicks) {
        const comp = labelTick(tick, candles);
        if (comp.label === "UNRESOLVED") unresolvedCount += 1;
        else labeled += 1;
        rows.push(toLabelRow(tick, ticker, timeframe, comp));
      }
    }

    const persisted = await upsertLabelRows(rows);
    if (persisted < rows.length) {
      // 일부/전부 저장 실패 — 저장된 만큼만 보고(비율 배분 대신 보수적으로 실패분은 미확정 취급 안 함).
      log.warn(`라벨 저장 부분 실패 — ${persisted}/${rows.length}행만 저장`);
    }
    log(
      `세션 라벨링 — session=${session.id.slice(0, 8)} 확정 ${labeled} · 미확정 ${unresolvedCount} · 저장 ${persisted}`,
    );
    return { labeled, unresolved: unresolvedCount, skipped: false };
  } catch (error) {
    // never-throw — 라벨링 실패가 완료 전이·run 라우트를 깨지 않는다.
    warnOnce("세션 라벨링 실패", error);
    return SKIPPED;
  }
}

/**
 * 세션 완료 전이 훅 — fire-and-forget · 프로세스당 세션 1회(중복 전이 가드). 관측 전용이라
 * 어떤 실패도 삼킨다. 멱등 upsert 라 재시작 후 run 라우트로 다시 돌려도 안전하다.
 */
const completedOnce = new Set<string>();
export function scheduleSessionTickLabeling(
  session: PaperTradingSession,
  ticks: PaperTradingTick[],
): void {
  if (session.decisionProvider !== "cli-agent") return;
  if (completedOnce.has(session.id)) return;
  completedOnce.add(session.id);
  void labelSessionTicks(session, [...ticks]).catch(() => undefined);
}

// ─── 기존 라벨 dedupe · 집계 ─────────────────────────────────────────────────

/**
 * 이미 라벨된 tick_id 집합 — run 라우트가 미라벨 틱만 다시 채점하게(멱등 백필).
 * 조회 실패는 빈 Set(전체 재채점 — upsert 멱등이라 무해). never-throw.
 */
export async function fetchLabeledTickIds(sessionIds: string[]): Promise<Set<string>> {
  const config = supabaseConfig();
  const ids = new Set<string>();
  if (!config || sessionIds.length === 0) return ids;
  try {
    for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
      const res = await fetch(
        `${config.url}/rest/v1/${LABELS_TABLE}?select=tick_id&session_id=in.(${sessionIds.join(",")})` +
          `&order=tick_id.asc&limit=${PAGE_SIZE}&offset=${offset}`,
        {
          headers: headers(config.key),
          cache: "no-store",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
      );
      if (!res.ok) {
        warnOnce(`기존 라벨 조회 실패 HTTP ${res.status}`);
        return ids;
      }
      const page = (await res.json()) as Array<{ tick_id: string }>;
      for (const row of page) ids.add(row.tick_id);
      if (page.length < PAGE_SIZE) break;
    }
    return ids;
  } catch (error) {
    warnOnce("기존 라벨 조회 실패(네트워크)", error);
    return ids;
  }
}

const LABEL_VALUES: IntradayTickLabelValue[] = ["WIN", "LOSS", "NEUTRAL", "UNRESOLVED"];

function emptyCounts(): IntradayLabelCounts {
  return { WIN: 0, LOSS: 0, NEUTRAL: 0, UNRESOLVED: 0 };
}

/** 표시 순서 — LLM 경로 먼저, 액션은 진입→청산→관망. */
const SOURCE_ORDER: IntradayTickLabelSource[] = ["intraday-cli", "intraday-fallback"];
const ACTION_ORDER = ["BUY", "INCREASE", "REDUCE", "EXIT", "SELL", "HOLD"];
const BAND_ORDER: IntradayScoreBand[] = ["lt40", "b40to60", "gte60"];

type MutableBucket = { counts: IntradayLabelCounts; returnSum: number; returnN: number };

function accumulate(bucket: MutableBucket, label: IntradayTickLabelValue, returnPct: number | null) {
  bucket.counts[label] += 1;
  if (label !== "UNRESOLVED" && returnPct !== null && Number.isFinite(returnPct)) {
    bucket.returnSum += returnPct;
    bucket.returnN += 1;
  }
}

function finalize(bucket: MutableBucket): { counts: IntradayLabelCounts; total: number; avgReturnPct: number | null } {
  return {
    counts: bucket.counts,
    total: LABEL_VALUES.reduce((sum, l) => sum + bucket.counts[l], 0),
    avgReturnPct: bucket.returnN > 0 ? bucket.returnSum / bucket.returnN : null,
  };
}

/** 라벨 행 → 출처×액션 버킷 + 시그널 점수대 밴드(순수 집계 — 테스트 대상). */
export function bucketizeLabels(rows: IntradayTickLabelRow[]): {
  buckets: IntradayLabelBucket[];
  scoreBands: IntradayScoreBandBucket[];
} {
  const byBucket = new Map<string, MutableBucket>();
  const byBand = new Map<IntradayScoreBand, MutableBucket>();

  for (const row of rows) {
    const key = `${row.source}|${row.action}`;
    const bucket = byBucket.get(key) ?? { counts: emptyCounts(), returnSum: 0, returnN: 0 };
    accumulate(bucket, row.label, row.returnPct);
    byBucket.set(key, bucket);

    const score = row.payload?.signalScore;
    if (typeof score === "number" && Number.isFinite(score)) {
      const band: IntradayScoreBand = score < 40 ? "lt40" : score < 60 ? "b40to60" : "gte60";
      const bandBucket = byBand.get(band) ?? { counts: emptyCounts(), returnSum: 0, returnN: 0 };
      accumulate(bandBucket, row.label, row.returnPct);
      byBand.set(band, bandBucket);
    }
  }

  const orderIdx = (list: readonly string[], v: string) => {
    const i = list.indexOf(v);
    return i === -1 ? list.length : i;
  };
  const buckets: IntradayLabelBucket[] = [...byBucket.entries()]
    .map(([key, bucket]) => {
      const [source, action] = key.split("|") as [IntradayTickLabelSource, string];
      return { source, action, ...finalize(bucket) };
    })
    .sort(
      (a, b) =>
        orderIdx(SOURCE_ORDER, a.source) - orderIdx(SOURCE_ORDER, b.source) ||
        orderIdx(ACTION_ORDER, a.action) - orderIdx(ACTION_ORDER, b.action) ||
        a.action.localeCompare(b.action),
    );
  const scoreBands: IntradayScoreBandBucket[] = BAND_ORDER.filter((band) => byBand.has(band)).map(
    (band) => ({ band, ...finalize(byBand.get(band)!) }),
  );
  return { buckets, scoreBands };
}

/**
 * 라벨 전량 집계 — 페이지네이션 GET(캡 20k) 후 라우트 프로세스에서 집계.
 * PostgREST group-by 가 번거롭고 이 규모(수천 행)에선 클라이언트 집계로 충분하다.
 * Supabase 미설정 → configured:false + 빈 집계. HTTP 실패는 throw(라우트가 500 처리).
 */
export async function summarizeLabels(): Promise<IntradayTickLabelSummaryResponse> {
  const config = supabaseConfig();
  const generatedAt = new Date().toISOString();
  if (!config) return { configured: false, total: 0, buckets: [], scoreBands: [], generatedAt };

  const rows: IntradayTickLabelRow[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const res = await fetch(
      `${config.url}/rest/v1/${LABELS_TABLE}?select=tick_id,session_id,ticker,action,source,label,return_pct,payload` +
        `&order=tick_id.asc&limit=${PAGE_SIZE}&offset=${offset}`,
      {
        headers: headers(config.key),
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!res.ok) throw new Error(`라벨 집계 조회 실패 HTTP ${res.status}`);
    const page = (await res.json()) as Array<{
      tick_id: string;
      session_id: string;
      ticker: string;
      action: string;
      source: IntradayTickLabelSource;
      label: IntradayTickLabelValue;
      return_pct: number | string | null;
      payload: IntradayTickLabelPayload | null;
    }>;
    for (const row of page) {
      rows.push({
        tickId: row.tick_id,
        sessionId: row.session_id,
        ticker: row.ticker,
        action: row.action,
        source: row.source,
        label: row.label,
        // PostgREST numeric 은 문자열로 올 수 있다 — 숫자로 정규화.
        returnPct: row.return_pct === null ? null : Number(row.return_pct),
        payload: row.payload,
      });
    }
    if (page.length < PAGE_SIZE) break;
  }

  return { configured: true, total: rows.length, ...bucketizeLabels(rows), generatedAt };
}
