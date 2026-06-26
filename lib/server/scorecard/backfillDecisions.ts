/**
 * 결정 원장(ai_analysis_decisions) → 채점 원장(signal_scorecard) **소급 backfill**.
 *
 * PRD `scorecard-backfill-decisions`.
 *
 * 배경: 채점 원장 append 코드(`signal-scorecard`, #140)가 ~6/19 배포되어, 그 이전 분석들은
 * `ai_analysis_decisions`(종목당 최신 1건 upsert)에만 있고 `signal_scorecard` 엔 없다 → 채점 불가.
 * 그중 **결정시점 봉 날짜(`signal.asOf`)가 있는** 결정은 그 봉 종가로 entry 를 복원해 채점 원장 1행을
 * append 할 수 있다. 본 모듈이 그 **멱등 backfill** 을 담당한다.
 *
 * 핵심 원칙(절대 우선순위):
 *   1. **멱등**: 재실행해도 중복 insert 0. 멱등키 = (ticker, entry_date=asOf). 채점 원장에 이미
 *      그 키의 행이 있으면 건너뛴다.
 *   2. **asOf 있는 것만**: `signal.asOf` 가 없는(과거 legacy) 결정은 entry 복원 불가 → skip(추측 금지).
 *   3. **entry 못 구하면 insert 안 함**: asOf 봉 종가를 못 구하면(fetch 실패/봉 부재) 이번 패스 skip.
 *      절대 null/잘못된 종가로 insert 하지 않는다 → 다음 cron 패스에서 재시도(자연 멱등).
 *   4. **fail-soft**: 한 결정 실패가 나머지·cron 을 막지 않는다(결정 단위 catch).
 *
 * 외부 의존(결정 조회·기존행 조회·종목 일봉·벤치 해석·insert)은 모두 **주입 가능**하게 두어
 * fixture 단위 테스트로 멱등·skip·insert payload 정확성·fetch 실패 보류를 검증한다.
 *
 * backfill 로 새로 append 된 행은 모든 horizon pending → 같은 디스패처 패스의 채점 단계
 * (relativeRunScoring)가 이어서 잡는다(또는 다음 cron).
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
import type { AIAnalysisDecisionSnapshot } from "@/lib/types/stock/aiAnalysis";
import type {
  ScorecardInsert,
  ScorecardWriteResult,
} from "@/lib/types/scorecard/scorecard";

/** asOf 봉 종가 복원을 위해 조회할 종목 일봉 윈도우(달력일). asOf 직전 며칠 + 당일 충분 커버. */
const ENTRY_FETCH_LOOKBACK_DAYS = 10;

/** backfill cron 의 외부 의존 — 라우트는 실제 구현, 테스트는 fixture 주입. */
export interface BackfillDecisionsDeps {
  /** 결정 원장 전체(또는 최신 N) 조회. signal.asOf 보유 결정이 backfill 후보. */
  getDecisions: (limit: number) => Promise<AIAnalysisDecisionSnapshot[]>;
  /**
   * 채점 원장 기존 (ticker, entry_date) 키 집합 조회 — 멱등 판별용.
   * 키 형식은 `existsKey(ticker, entryDate)` 와 동일하게 맞춘다.
   */
  getExistingKeys: () => Promise<Set<string>>;
  /** 종목 일봉 조회(YYYYMMDD~YYYYMMDD, 오름차순). entry 종가 복원용. */
  fetchStockDaily: (ticker: string, fromYmd: string, toYmd: string) => Promise<StockDailyCandle[]>;
  /** 종목 → 벤치마크 지수 코드("0001"/"1001"). 미해석이면 폴백 코드 반환(호출부 보장). */
  resolveBench: (ticker: string) => string;
  /** 채점 원장 1행 append(분석 route 와 동일 store 함수 재사용). */
  insertRow: (input: ScorecardInsert) => Promise<ScorecardWriteResult>;
  /** 1회 패스에서 처리할 결정 수 상한(배치). 기본 SCORE_BATCH_LIMIT. */
  limit?: number;
}

export interface BackfillDecisionsResult {
  /** asOf 보유 + 미존재(멱등키 미보유) → backfill 후보였던 결정 수. */
  candidates: number;
  /** 실제 채점 원장에 새로 append 된 행 수. */
  inserted: number;
  /** asOf 없음 → 복원 불가로 건너뛴 결정 수. */
  skippedNoAsOf: number;
  /** 이미 채점 원장에 (ticker, entry_date) 존재 → 멱등 skip 한 결정 수. */
  skippedExists: number;
  /** asOf 봉 종가를 못 구해(fetch 실패/봉 부재) 이번 패스 보류한 결정 수(다음 재시도). */
  skippedNoEntry: number;
  /** insert 호출이 실패(미설정 skip 포함)·결정 처리 중 예외로 넘어간 수. */
  errors: number;
}

/** 멱등키 — (ticker, entry_date=asOf). getExistingKeys 와 insert 후보 양쪽이 동일 형식을 쓴다. */
export function existsKey(ticker: string, entryDate: string): string {
  return `${ticker}|${entryDate}`;
}

/** "YYYY-MM-DD" → "YYYYMMDD"(KIS 일봉 fetch 파라미터). */
function toYmd(iso: string): string {
  return iso.replace(/-/g, "");
}

/** asOf("YYYY-MM-DD") 의 며칠 전 날짜("YYYYMMDD") — 종가 fetch 시작점(직전 영업봉 흡수 여유). */
function lookbackFromYmd(asOf: string, days: number): string {
  const d = new Date(`${asOf}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * 결정 원장 → 채점 원장 멱등 backfill 1회 실행.
 *
 * - asOf 없는 결정 skip(복원 불가).
 * - 채점 원장에 (ticker, asOf) 이미 있으면 skip(멱등).
 * - asOf 봉 종가 복원 성공 시에만 insertRow(verdict/confidence/signal_score/signal_action/
 *   target_pct/stop_loss_pct/entry_close/entry_date=asOf/decided_at=updated_at/bench_key 평탄화).
 * - fetch 실패/봉 부재면 이번 패스 skip(insert 안 함 → 다음 cron 재시도, 자연 멱등).
 *
 * 결정 단위 catch — 한 건 실패가 나머지를 막지 않는다. 결과 카운트 반환(throw 하지 않음).
 */
export async function backfillScorecardFromDecisions(
  deps: BackfillDecisionsDeps,
): Promise<BackfillDecisionsResult> {
  const limit = deps.limit ?? 60;
  const result: BackfillDecisionsResult = {
    candidates: 0,
    inserted: 0,
    skippedNoAsOf: 0,
    skippedExists: 0,
    skippedNoEntry: 0,
    errors: 0,
  };

  const decisions = await deps.getDecisions(limit);
  if (decisions.length === 0) return result;

  const existing = await deps.getExistingKeys();

  // 같은 패스 안에서도 중복 후보(동일 ticker+asOf)를 한 번만 insert 하도록 누적 키 추적.
  const insertedKeys = new Set<string>();

  for (const snap of decisions) {
    try {
      const asOf = snap.signal?.asOf;
      if (!asOf) {
        // asOf 없음 → entry 복원 불가. 추측 insert 금지(자연 필터).
        result.skippedNoAsOf += 1;
        continue;
      }

      const key = existsKey(snap.ticker, asOf);
      if (existing.has(key) || insertedKeys.has(key)) {
        // 채점 원장에 이미 그 (ticker, entry_date) 행 존재 → 멱등 skip.
        result.skippedExists += 1;
        continue;
      }

      result.candidates += 1;

      // asOf 봉 종가 복원 — 직전 며칠~당일 일봉에서 date===asOf 봉 종가.
      const fromYmd = lookbackFromYmd(asOf, ENTRY_FETCH_LOOKBACK_DAYS);
      const candles = await deps.fetchStockDaily(snap.ticker, fromYmd, toYmd(asOf));
      const bar = candles.find((c) => c.date === asOf);
      const entryClose = bar?.close ?? null;
      if (entryClose === null || !(entryClose > 0)) {
        // 봉 부재/0 → 이번 패스 보류(다음 재시도). 절대 null/0 으로 insert 금지.
        result.skippedNoEntry += 1;
        continue;
      }

      const input: ScorecardInsert = {
        ticker: snap.ticker,
        provider: snap.provider,
        verdict: snap.decision.verdict,
        decisionConfidence: snap.decision.confidence,
        signalScore: snap.signal?.score ?? null,
        signalAction: snap.signal?.action ?? null,
        targetPct: snap.decision.target_pct,
        stopLossPct: snap.decision.stop_loss_pct,
        entryClose,
        entryDate: asOf,
        livePrice: null, // 라이브 현재가는 결정 시점 미보존 — 채점 미사용(보조 컬럼).
        decidedAt: snap.updatedAt, // 결정 timestamp = 결정 원장 updated_at.
        runId: null, // 토큰 usage 연계 키는 사후 복원 불가.
        benchKey: deps.resolveBench(snap.ticker),
      };

      const writeResult = await deps.insertRow(input);
      if (writeResult.ok && !writeResult.skipped) {
        result.inserted += 1;
        insertedKeys.add(key);
      } else if (writeResult.ok && writeResult.skipped) {
        // Supabase 미설정 → insert 무의미. 패스 보류(에러는 아님, 게이트가 막아야 정상).
        result.errors += 1;
      } else {
        // insert 실패 — 다음 패스 재시도(멱등키가 막아주지 못하므로 inserted 마킹 안 함).
        result.errors += 1;
      }
    } catch {
      // 한 결정 실패가 나머지·cron 을 막지 않는다(fail-soft).
      result.errors += 1;
    }
  }

  return result;
}
