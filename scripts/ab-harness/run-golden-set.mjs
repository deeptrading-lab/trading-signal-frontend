/**
 * A/B 토큰 최적화 하니스 — 골든셋 러너 (순수 Node, tsx 불필요).
 *
 * 고정 ticker 세트 × config(A/B) × repeats 를 로컬 dev 서버의 분석 API 로 실행한다.
 * route-side 태깅(session 동봉)이 ab_run_config 에 run_id↔config 를 기록하므로 이 스크립트는
 * HTTP 만 호출하면 된다. 결과(토큰/품질)는 DB(ai_agent_usage·signal_scorecard·ab_run_config)에 쌓이고,
 * 비교는 GET /api/ab-harness/report?session=<SESSION> 로 본다.
 *
 * 사용:
 *   1) 로컬 dev 가동: npx next dev --webpack -p 3100
 *   2) node scripts/ab-harness/run-golden-set.mjs
 *   환경변수: BASE_URL(기본 http://localhost:3100), SESSION(기본 ab-<timestamp>)
 *
 * 주의: 분석 1회 ~9분 + 실제 Claude 비용. tickers/repeats 를 작게 유지하라.
 *       claude 고정(codex 는 비용 미측정). ticker 내 A/B 는 순차(이전결론 upsert race 회피),
 *       ticker 간 최대 3개 동시(서버 동시 3건 상한 #163).
 */

import { randomUUID } from "node:crypto";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const SESSION = process.env.SESSION ?? `ab-${Date.now()}`;
const CONCURRENCY = 3;

// ── 실험 정의(편집 지점) ──────────────────────────────────────────────────────
const GOLDEN_TICKERS = ["005930", "000660", "035720", "005380", "035420"];
const REPEATS = 2;
/** config A=현행(override 없음), B=토론 1라운드(smoke 예시). 필요시 slices/effort 등 추가. */
const CONFIGS = [
  { id: "A", label: "baseline", override: null },
  { id: "B", label: "debateRounds=1", override: { debateRounds: 1 } },
];

const PROVIDER = "claude";

/** 분석 1건 실행 + SSE 소비. 완료(done)/에러까지 대기. */
async function runOne(ticker, config) {
  const runId = randomUUID();
  const body = {
    ticker,
    provider: PROVIDER,
    runId,
    session: SESSION,
    configId: config.id,
    configLabel: config.label,
    config: config.override ?? undefined,
  };

  const res = await fetch(`${BASE_URL}/api/stock/ai-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status} (${ticker}/${config.id})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let verdict = null;
  let errored = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      let evt;
      try {
        evt = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }
      if (evt.type === "final") verdict = evt.decision?.verdict ?? evt.verdict ?? "?";
      else if (evt.type === "error") errored = evt.message ?? "error";
    }
  }

  if (errored) throw new Error(`${ticker}/${config.id}: ${errored}`);
  return { runId, verdict };
}

/** 한 ticker 의 모든 config×repeat 를 순차 실행(같은 ticker 동시 금지 — upsert race 회피). */
async function runTicker(ticker) {
  for (const config of CONFIGS) {
    for (let i = 1; i <= REPEATS; i++) {
      const tag = `${ticker} ${config.id}#${i}`;
      const t0 = Date.now();
      try {
        const { runId, verdict } = await runOne(ticker, config);
        const mins = ((Date.now() - t0) / 60000).toFixed(1);
        console.log(`✓ ${tag} → verdict=${verdict} (${mins}분) run=${runId}`);
      } catch (e) {
        console.error(`✗ ${tag} → ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
}

/** ticker 들을 동시성 CONCURRENCY 로 처리. */
async function main() {
  console.log(`A/B 하니스 시작 — session=${SESSION}, base=${BASE_URL}`);
  console.log(`tickers=${GOLDEN_TICKERS.length} × configs=${CONFIGS.length} × repeats=${REPEATS} = ${GOLDEN_TICKERS.length * CONFIGS.length * REPEATS} runs`);

  const queue = [...GOLDEN_TICKERS];
  async function worker() {
    for (;;) {
      const ticker = queue.shift();
      if (!ticker) return;
      await runTicker(ticker);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\n완료. 리포트: GET ${BASE_URL}/api/ab-harness/report?session=${SESSION}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
