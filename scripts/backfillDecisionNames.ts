/**
 * backfillDecisionNames — 기존 `ai_analysis_decisions` 행 중 종목명(name)이 비어있는(legacy) 종목의
 * 종목명을 KIS 로 조회해 한 번 채운다(decision-stock-name 일회성 백필).
 *
 * 배경: name 컬럼 도입 이전 저장된 결론은 ticker 만 있어, /analyze 카드에서 "종목번호 → 종목명"
 *   깜빡임이 남는다. 이 스크립트로 과거분도 즉시 종목명이 뜨게 채운다.
 *
 * 실행: `npm run backfill:decision-names`
 *   (= node --env-file=.env.local --import tsx scripts/backfillDecisionNames.ts)
 *   `next dev` 와 별개 프로세스 — Supabase·KIS env(.env.local)가 `--env-file` 로 로드돼야 한다.
 *
 * 안전성:
 *   - 멱등: name 이 이미 있는 행은 조회 대상에서 제외(다시 돌려도 무방).
 *   - KIS 실패·이름 미해석(ticker 동일/빈 값)은 건너뛴다 → 다음 실행에서 재시도 가능.
 *   - 종목명만 부분 PATCH(setDecisionName) — decision/sentiment/signal 등 다른 컬럼은 손대지 않는다.
 *   - KIS rate limit 여유로 호출 간 200ms 간격.
 */

import {
  getAllAIDecisions,
  setDecisionName,
  isAIDecisionStoreConfigured,
} from "@/lib/server/ai/decisionStore";
import { fetchStockPrice, getSymbolName } from "@/lib/api/kis";
import { pickStockName } from "@/lib/utils/resolveStockName";

const GAP_MS = 200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  if (!isAIDecisionStoreConfigured()) {
    console.error("✗ Supabase 미설정 — .env.local 의 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 확인하세요.");
    process.exit(1);
  }

  const all = await getAllAIDecisions(1000);
  const missing = all.filter((d) => !d.name);
  console.log(
    `[backfill] 총 ${all.length}건 중 종목명 없는 ${missing.length}건 백필 시작`,
  );
  if (missing.length === 0) {
    console.log("[backfill] 채울 행이 없습니다. 종료.");
    process.exit(0);
  }

  let filled = 0;
  let skipped = 0;
  let failed = 0;

  for (const d of missing) {
    try {
      // KIS 현재가 응답명 우선 — 단 inquire-price 의 hts_kor_isnm 은 자주 비어 ticker 로 폴백되므로
      //   시드(symbols.json, getSymbolName)로 보강. KIS 호출이 실패해도 시드로 종목명을 채운다.
      let kisName: string | undefined;
      try {
        kisName = (await fetchStockPrice(d.ticker))?.name;
      } catch {
        // KIS 조회 실패 — 시드 폴백으로 진행.
      }
      const name = pickStockName(d.ticker, [kisName, getSymbolName(d.ticker)]);
      if (!name) {
        skipped += 1;
        console.warn(`- ${d.ticker}: 종목명 미해석(KIS·시드 모두 없음) — 스킵`);
      } else {
        const ok = await setDecisionName(d.ticker, name);
        if (ok) {
          filled += 1;
          console.log(`✓ ${d.ticker} → ${name}`);
        } else {
          failed += 1;
          console.warn(`✗ ${d.ticker}: PATCH 실패`);
        }
      }
    } catch (err) {
      failed += 1;
      console.warn(`✗ ${d.ticker}: ${err instanceof Error ? err.message : String(err)}`);
    }
    await sleep(GAP_MS);
  }

  console.log(
    `[backfill] 완료 — 채움 ${filled} / 스킵 ${skipped} / 실패 ${failed}`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

void main();
