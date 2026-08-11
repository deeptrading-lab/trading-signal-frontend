/**
 * AI 모의투자 영구 저장 — Supabase REST 기반 서버 전용 유틸. intraday-paper-watch.
 *
 * 목적: 단타 판단·가상 체결 로그를 dev 서버 재시작 너머로 축적해 AI 단타 판단 고도화의
 * 데이터 기반을 만든다(세션·틱·주문 전량 보존).
 *
 * 설계 — in-memory(sessionStore)가 1차 진실, Supabase 는 write-through 백업:
 * - 쓰기: 세션 스냅샷 upsert + 틱 append (fire-and-forget, 실패해도 모의투자 흐름 비차단).
 * - 읽기: 프로세스 부팅 후 첫 접근에서 1회 hydrate(멱등) — 메모리에 없는 세션만 복원.
 * - 스키마: 필드 컬럼 대신 payload jsonb(무마이그레이션 진화) + 필터용 최소 컬럼.
 * - Supabase 미설정/오류는 조용히 skip(decisionStore 선례) — 로컬 무DB 환경은 기존과 동일.
 *
 * ⚠️ `docs/sql/paper-trading.sql` 을 Supabase SQL Editor 에서 수동 1회 실행 필요(선례 동일).
 */

import { createLogger } from "@/lib/server/logTag";
import { getSupabaseServiceConfig } from "@/lib/server/supabase/egressGuard";
import type {
  PaperTradingDecisionProvider,
  PaperTradingPosition,
  PaperTradingSession,
  PaperTradingTick,
} from "@/lib/types/paperTrading/paperTrading";

const log = createLogger("paper-persist");

const SESSIONS_TABLE = "paper_trading_sessions";
const TICKS_TABLE = "paper_trading_ticks";
/**
 * 반복 목록 동기화와 부팅 복원에 포함할 최근 세션 수 상한.
 * 오래된 완료 세션 원본은 Supabase에 보존하되 기본 화면/메모리에는 최신 20건만 올린다.
 */
const HYDRATE_SESSION_LIMIT = 20;
/**
 * 틱 페이지 크기/총량 상한 — PostgREST 는 무제한 쿼리를 max-rows(기본 1000)에서 **조용히**
 * 자르므로(리뷰 #3) 명시 페이지네이션으로 전부 걷되, 폭주 방지 총량 캡을 둔다(1분 주기
 * 세션 하루 ~390틱 × 다세션 대비).
 */
const TICK_PAGE_SIZE = 1000;
const TICK_MAX_ROWS = 20_000;
/** 개별 REST 호출 타임아웃 — hydrate 가 API 첫 진입을 무기한 블로킹하지 않게(리뷰 #4). */
const FETCH_TIMEOUT_MS = 4_000;

export type PersistedSession = {
  session: PaperTradingSession;
  positions: PaperTradingPosition[];
  ticks: PaperTradingTick[];
};

export type PersistedSessionSummary = Omit<PersistedSession, "ticks">;

/** hydrate 결과 — error 는 호출측이 재시도할 수 있게 disabled(미설정)와 구분한다(리뷰 #4). */
export type LoadPersistedResult =
  | { status: "disabled" }
  | { status: "error" }
  | { status: "ok"; sessions: PersistedSession[] };

export type LoadPersistedSessionSummariesResult =
  | { status: "disabled" }
  | { status: "error" }
  | { status: "ok"; sessions: PersistedSessionSummary[] };

export type LoadPersistedTicksResult =
  | { status: "disabled" }
  | { status: "error" }
  | { status: "ok"; ticks: PaperTradingTick[] };

/** 단건 조회 — `session: null` 은 "정상 조회했으나 그런 세션 없음"(error 와 구분). */
export type LoadPersistedSessionByIdResult =
  | { status: "disabled" }
  | { status: "error" }
  | { status: "ok"; session: PersistedSessionSummary | null };

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

/** 실패 로그 1회 억제 — 미설정/장애가 틱마다 콘솔을 도배하지 않게. */
let warnedOnce = false;
function warnOnce(message: string, error?: unknown): void {
  if (warnedOnce) return;
  warnedOnce = true;
  log.warn(`${message} — 이후 동일 경고 생략`, error);
}

/** 세션 스냅샷 upsert(fire-and-forget) — 세션 필드 + 현재 포지션을 통째로 저장. */
export async function persistPaperSession(
  session: PaperTradingSession,
  positions: PaperTradingPosition[],
): Promise<void> {
  const config = supabaseConfig();
  if (!config) return;
  try {
    const res = await fetch(`${config.url}/rest/v1/${SESSIONS_TABLE}?on_conflict=id`, {
      method: "POST",
      headers: headers(config.key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: JSON.stringify([
        {
          id: session.id,
          status: session.status,
          decision_provider: session.decisionProvider,
          payload: session,
          positions,
          updated_at: session.updatedAt,
        },
      ]),
    });
    if (!res.ok) warnOnce(`세션 저장 실패 HTTP ${res.status}`, await res.text().catch(() => ""));
  } catch (error) {
    warnOnce("세션 저장 실패(네트워크)", error);
  }
}

/** 틱 append(fire-and-forget) — id PK 라 중복 발화는 무시(멱등). */
export async function persistPaperTick(tick: PaperTradingTick): Promise<void> {
  const config = supabaseConfig();
  if (!config) return;
  try {
    const res = await fetch(`${config.url}/rest/v1/${TICKS_TABLE}?on_conflict=id`, {
      method: "POST",
      headers: headers(config.key, { Prefer: "resolution=ignore-duplicates,return=minimal" }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: JSON.stringify([
        {
          id: tick.id,
          session_id: tick.sessionId,
          tick_index: tick.tickIndex,
          payload: tick,
          created_at: tick.createdAt,
        },
      ]),
    });
    if (!res.ok) warnOnce(`틱 저장 실패 HTTP ${res.status}`, await res.text().catch(() => ""));
  } catch (error) {
    warnOnce("틱 저장 실패(네트워크)", error);
  }
}

/**
 * 저장된 세션 + 틱 로드(부팅 hydrate 용).
 * - 미설정 → disabled(성공 취급, 재시도 불필요) / 실패 → error(호출측이 다음 접근에서 재시도).
 * - 최근 업데이트순 HYDRATE_SESSION_LIMIT 개 세션 + 틱은 **명시 페이지네이션**으로 전량
 *   (session_id·tick_index 정렬, TICK_MAX_ROWS 캡 — 캡 도달 시 경고).
 * - 모든 호출에 FETCH_TIMEOUT_MS 타임아웃 — API 첫 진입 블로킹 상한.
 */
export async function loadPersistedPaperTrading(): Promise<LoadPersistedResult> {
  const config = supabaseConfig();
  if (!config) return { status: "disabled" };
  try {
    const sessionsRes = await fetch(
      `${config.url}/rest/v1/${SESSIONS_TABLE}?select=payload,positions&order=updated_at.desc&limit=${HYDRATE_SESSION_LIMIT}`,
      {
        headers: headers(config.key),
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!sessionsRes.ok) {
      warnOnce(`세션 로드 실패 HTTP ${sessionsRes.status}`);
      return { status: "error" };
    }
    const sessionRows = (await sessionsRes.json()) as Array<{
      payload: PaperTradingSession;
      positions: PaperTradingPosition[] | null;
    }>;
    if (sessionRows.length === 0) return { status: "ok", sessions: [] };

    const ids = sessionRows.map((row) => row.payload.id);
    const tickRows: Array<{ payload: PaperTradingTick }> = [];
    for (let offset = 0; offset < TICK_MAX_ROWS; offset += TICK_PAGE_SIZE) {
      const ticksRes = await fetch(
        `${config.url}/rest/v1/${TICKS_TABLE}?select=payload&session_id=in.(${ids.join(",")})` +
          `&order=session_id.asc,tick_index.asc&limit=${TICK_PAGE_SIZE}&offset=${offset}`,
        {
          headers: headers(config.key),
          cache: "no-store",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
      );
      if (!ticksRes.ok) {
        warnOnce(`틱 로드 실패 HTTP ${ticksRes.status}`);
        return { status: "error" };
      }
      const page = (await ticksRes.json()) as Array<{ payload: PaperTradingTick }>;
      tickRows.push(...page);
      if (page.length < TICK_PAGE_SIZE) break;
      if (offset + TICK_PAGE_SIZE >= TICK_MAX_ROWS) {
        log.warn(`틱 로드 ${TICK_MAX_ROWS}행 캡 도달 — 초과분 절단(오래된 세션 정리 권장)`);
      }
    }

    const ticksBySession = new Map<string, PaperTradingTick[]>();
    for (const row of tickRows) {
      const list = ticksBySession.get(row.payload.sessionId) ?? [];
      list.push(row.payload);
      ticksBySession.set(row.payload.sessionId, list);
    }

    return {
      status: "ok",
      sessions: sessionRows.map((row) => ({
        session: row.payload,
        positions: row.positions ?? [],
        ticks: ticksBySession.get(row.payload.id) ?? [],
      })),
    };
  } catch (error) {
    warnOnce("모의투자 저장본 로드 실패(네트워크/타임아웃)", error);
    return { status: "error" };
  }
}

/**
 * 목록 동기화용 경량 로드 — 세션/포지션만 읽고 대용량 틱 payload 는 받지 않는다.
 *
 * `sessionStore.refreshForeignSessions` 는 장중 화면 폴링 중 반복 호출된다. 기존에는 이 경로도
 * `loadPersistedPaperTrading` 을 사용해 최근 50개 세션의 틱을 매번 전량 다운로드했고, Supabase
 * PostgREST egress 가 데이터 크기에 비례해 폭증했다. 목록에서 필요한 것은 세션 상태와 포지션뿐이므로
 * 틱은 상세 조회의 증분 로드로 분리한다.
 *
 * 과거 내역 페이지네이션(intraday-history-pagination)이 같은 쿼리를 limit/offset 만 바꿔 재사용한다 —
 * 인메모리 창(`HYDRATE_SESSION_LIMIT`)과 무관하게 원장 전체를 페이지 단위로 읽는 유일한 경로다.
 * 무인자 호출은 기존 동작(최신 20건, provider 필터 없음)을 그대로 유지한다.
 */
export type LoadSessionSummariesOptions = {
  /** 1페이지 행 수. 미지정 = `HYDRATE_SESSION_LIMIT`. */
  limit?: number;
  /** 건너뛸 행 수. 0/미지정이면 URL 에 넣지 않는다(기존 호출부 URL 불변). */
  offset?: number;
  /** `decision_provider` 컬럼 필터. 미지정이면 전체(기존 동작). */
  decisionProvider?: PaperTradingDecisionProvider;
  /**
   * `payload->>startedAt` 이 이 ISO 시각 **미만**인 세션만(과거 내역 = 오늘 이전 경계).
   *
   * 이 필터를 서버가 걸지 않으면, 정렬 기준이 `updated_at` 이라 오늘 세션이 1페이지를 거의 다
   * 차지하고 과거는 몇 건만 남는다(실측: 20칸 중 14칸이 오늘). 클라가 오늘을 걸러내는 방식으로는
   * 페이지 예산이 낭비되고 `hasMore` 도 의미가 흐려진다.
   *
   * ISO(UTC)는 고정 폭 `Z` 접미사라 텍스트 사전순 비교 = 시간순 비교다(저장 시 항상
   * `toISOString()`). 인덱스는 없지만 원장 규모(수백~수천 행)에서 문제되지 않는다.
   */
  startedBefore?: string;
};

export async function loadPersistedPaperTradingSessionSummaries(
  options: LoadSessionSummariesOptions = {},
): Promise<LoadPersistedSessionSummariesResult> {
  const config = supabaseConfig();
  if (!config) return { status: "disabled" };
  const limit = Math.max(1, Math.trunc(options.limit ?? HYDRATE_SESSION_LIMIT));
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  // 정렬은 `updated_at.desc` + PK tiebreak — offset 페이지네이션은 전순서가 없으면 동일 timestamp
  // 경계에서 행이 건너뛰이거나 중복된다.
  const query =
    `select=payload,positions&order=updated_at.desc,id.desc&limit=${limit}` +
    (offset > 0 ? `&offset=${offset}` : "") +
    (options.decisionProvider ? `&decision_provider=eq.${options.decisionProvider}` : "") +
    (options.startedBefore
      ? `&${encodeURIComponent("payload->>startedAt")}=lt.${encodeURIComponent(options.startedBefore)}`
      : "");
  try {
    const res = await fetch(
      `${config.url}/rest/v1/${SESSIONS_TABLE}?${query}`,
      {
        headers: headers(config.key),
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!res.ok) {
      warnOnce(`세션 요약 로드 실패 HTTP ${res.status}`);
      return { status: "error" };
    }
    const rows = (await res.json()) as Array<{
      payload: PaperTradingSession;
      positions: PaperTradingPosition[] | null;
    }>;
    return {
      status: "ok",
      sessions: rows.map((row) => ({
        session: row.payload,
        positions: row.positions ?? [],
      })),
    };
  } catch (error) {
    warnOnce("모의투자 세션 요약 로드 실패(네트워크/타임아웃)", error);
    return { status: "error" };
  }
}

/**
 * 세션 단건 로드(틱 제외) — 인메모리 창(`HYDRATE_SESSION_LIMIT`) 밖 과거 세션 상세 복원용.
 *
 * 목록 요약 로더와 달리 id 로 콕 집어 1행만 읽는다. 호출측(`getArchivedPaperTradingSessionDetail`)이
 * 틱을 별도로 붙인다.
 */
export async function loadPersistedPaperTradingSessionById(
  sessionId: string,
): Promise<LoadPersistedSessionByIdResult> {
  const config = supabaseConfig();
  if (!config) return { status: "disabled" };
  try {
    const url = new URL(`${config.url}/rest/v1/${SESSIONS_TABLE}`);
    url.searchParams.set("select", "payload,positions");
    url.searchParams.set("id", `eq.${sessionId}`);
    url.searchParams.set("limit", "1");

    const res = await fetch(url, {
      headers: headers(config.key),
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      warnOnce(`세션 단건 로드 실패 HTTP ${res.status}`);
      return { status: "error" };
    }
    const rows = (await res.json()) as Array<{
      payload: PaperTradingSession;
      positions: PaperTradingPosition[] | null;
    }>;
    const row = rows[0];
    return {
      status: "ok",
      session: row ? { session: row.payload, positions: row.positions ?? [] } : null,
    };
  } catch (error) {
    warnOnce("모의투자 세션 단건 로드 실패(네트워크/타임아웃)", error);
    return { status: "error" };
  }
}

/**
 * 세션 상세 동기화용 틱 증분 로드.
 *
 * `afterTickIndex` 가 있으면 이미 메모리에 있는 틱 이후만 조회한다. 타 운영자 세션 상세를 30초마다
 * 갱신해도 빈 배열 또는 새 틱 몇 건만 전송되므로, 과거 틱 전체를 반복 다운로드하지 않는다.
 */
export async function loadPersistedPaperTradingTicks(
  sessionId: string,
  afterTickIndex?: number,
): Promise<LoadPersistedTicksResult> {
  const config = supabaseConfig();
  if (!config) return { status: "disabled" };
  try {
    const ticks: PaperTradingTick[] = [];
    for (let offset = 0; offset < TICK_MAX_ROWS; offset += TICK_PAGE_SIZE) {
      const url = new URL(`${config.url}/rest/v1/${TICKS_TABLE}`);
      url.searchParams.set("select", "payload");
      url.searchParams.set("session_id", `eq.${sessionId}`);
      if (afterTickIndex !== undefined) {
        url.searchParams.set("tick_index", `gt.${afterTickIndex}`);
      }
      url.searchParams.set("order", "tick_index.asc");
      url.searchParams.set("limit", String(TICK_PAGE_SIZE));
      url.searchParams.set("offset", String(offset));

      const res = await fetch(url, {
        headers: headers(config.key),
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        warnOnce(`세션 틱 증분 로드 실패 HTTP ${res.status}`);
        return { status: "error" };
      }
      const page = (await res.json()) as Array<{ payload: PaperTradingTick }>;
      ticks.push(...page.map((row) => row.payload));
      if (page.length < TICK_PAGE_SIZE) break;
      if (offset + TICK_PAGE_SIZE >= TICK_MAX_ROWS) {
        log.warn(`세션 틱 증분 로드 ${TICK_MAX_ROWS}행 캡 도달 — 초과분 절단`);
      }
    }
    return { status: "ok", ticks };
  } catch (error) {
    warnOnce("세션 틱 증분 로드 실패(네트워크/타임아웃)", error);
    return { status: "error" };
  }
}
