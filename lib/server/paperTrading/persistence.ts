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
import type {
  PaperTradingPosition,
  PaperTradingSession,
  PaperTradingTick,
} from "@/lib/types/paperTrading/paperTrading";

const log = createLogger("paper-persist");

const SESSIONS_TABLE = "paper_trading_sessions";
const TICKS_TABLE = "paper_trading_ticks";
/** hydrate 시 복원할 최근 세션 수 상한 — 오래된 실험 세션이 무한히 붙는 것 방지. */
const HYDRATE_SESSION_LIMIT = 50;

export type PersistedSession = {
  session: PaperTradingSession;
  positions: PaperTradingPosition[];
  ticks: PaperTradingTick[];
};

function supabaseConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
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
 * 저장된 세션 + 틱 로드(부팅 hydrate 용). 미설정/실패 시 null — 호출측은 메모리만으로 진행.
 * 최근 업데이트순 HYDRATE_SESSION_LIMIT 개 세션과 그 틱 전부를 재조립한다.
 */
export async function loadPersistedPaperTrading(): Promise<PersistedSession[] | null> {
  const config = supabaseConfig();
  if (!config) return null;
  try {
    const sessionsRes = await fetch(
      `${config.url}/rest/v1/${SESSIONS_TABLE}?select=payload,positions&order=updated_at.desc&limit=${HYDRATE_SESSION_LIMIT}`,
      { headers: headers(config.key), cache: "no-store" },
    );
    if (!sessionsRes.ok) {
      warnOnce(`세션 로드 실패 HTTP ${sessionsRes.status}`);
      return null;
    }
    const sessionRows = (await sessionsRes.json()) as Array<{
      payload: PaperTradingSession;
      positions: PaperTradingPosition[] | null;
    }>;
    if (sessionRows.length === 0) return [];

    const ids = sessionRows.map((row) => row.payload.id);
    const ticksRes = await fetch(
      `${config.url}/rest/v1/${TICKS_TABLE}?select=payload&session_id=in.(${ids.join(",")})&order=tick_index.asc`,
      { headers: headers(config.key), cache: "no-store" },
    );
    if (!ticksRes.ok) {
      warnOnce(`틱 로드 실패 HTTP ${ticksRes.status}`);
      return null;
    }
    const tickRows = (await ticksRes.json()) as Array<{ payload: PaperTradingTick }>;
    const ticksBySession = new Map<string, PaperTradingTick[]>();
    for (const row of tickRows) {
      const list = ticksBySession.get(row.payload.sessionId) ?? [];
      list.push(row.payload);
      ticksBySession.set(row.payload.sessionId, list);
    }

    return sessionRows.map((row) => ({
      session: row.payload,
      positions: row.positions ?? [],
      ticks: ticksBySession.get(row.payload.id) ?? [],
    }));
  } catch (error) {
    warnOnce("모의투자 저장본 로드 실패(네트워크)", error);
    return null;
  }
}
