/**
 * `/api/cron/swing-screener` — 스윙 스크리너 크론(PRD `swing-judgment` §3-3 · AC-2.2~2.4).
 *
 * - **인증**: `Authorization: Bearer ${CRON_SECRET}` 미일치 401.
 * - **게이트**: KIS 비-prod·Supabase 미설정 → `ok:false` + 사유(200, 재시도 폭주 방지).
 * - **구간 처리** `?offset=0&limit=400`: 거래일 t(KOSPI 지수 마지막 봉) 판정 → 유니버스 구간을 230초 안에서
 *   판정·저장 → 남으면 `next`. offset=0 이고 같은 t·버전 완료 마커가 있으면 `skip:"done"`.
 * - **마무리** `?finalize=1&processed=N&failed=M`: 실패 ≤ 2% 면 ok 마커(KV `swing:screener:meta`).
 *
 * GitHub Actions `swing-screener.yml` 이 07:20 KST(+08:20·09:20 재시도) 호출한다. LLM 호출 0(#371 예외, PRD §9 OQ-1).
 */

import { NextRequest, NextResponse } from "next/server";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { RULEBOOK } from "@/lib/swing/rulebook";
import { createKisPacer } from "@/lib/server/swing/pace";
import {
  isScreenerRunOk,
  readSwingScreenerMeta,
  runScreenerSlice,
  saveSwingScreenerMeta,
} from "@/lib/server/swing/screener";
import { isSwingStoreConfigured } from "@/lib/server/swing/store";
import { resolveTradeDate } from "@/lib/server/swing/tradeDate";
import { createLogger } from "@/lib/server/logTag";

export const preferredRegion = "icn1";
export const maxDuration = 300;

/** 새 종목 시작을 멈추는 시점 — maxDuration(300초)에서 저장·응답 여유를 뺀 값. */
const BUDGET_MS = 230_000;
const DEFAULT_LIMIT = 400;

const log = createLogger("swing-screener");

const int = (v: string | null, fallback: number) => {
  const n = v === null ? Number.NaN : Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export async function GET(request: NextRequest) {
  const started = Date.now();
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const env = resolveKisEnv();
  if (!isKisConfigured() || env !== "prod") {
    await saveSwingScreenerMeta({ at: new Date().toISOString(), ok: false, reason: "kis-not-prod" });
    return NextResponse.json({ ok: false, reason: "kis-not-prod", env });
  }
  if (!isSwingStoreConfigured()) {
    return NextResponse.json({ ok: false, reason: "supabase-not-configured" });
  }

  const tradeDate = await resolveTradeDate(createKisPacer()).catch(() => null);
  if (!tradeDate) return NextResponse.json({ ok: false, reason: "no-trade-date" });

  const sp = request.nextUrl.searchParams;
  if (sp.get("finalize") === "1") {
    const processed = int(sp.get("processed"), 0);
    const failed = int(sp.get("failed"), 0);
    const ok = isScreenerRunOk(processed, failed);
    await saveSwingScreenerMeta({ at: new Date().toISOString(), ok, tradeDate, version: RULEBOOK.version, processed, failed });
    log(`finalize t=${tradeDate} processed=${processed} failed=${failed} ok=${ok}`);
    return NextResponse.json({ ok, tradeDate, processed, failed });
  }

  const offset = int(sp.get("offset"), 0);
  const limit = Math.min(int(sp.get("limit"), DEFAULT_LIMIT), 3_000) || DEFAULT_LIMIT;
  if (offset === 0) {
    const meta = await readSwingScreenerMeta();
    if (meta?.ok && meta.tradeDate === tradeDate && meta.version === RULEBOOK.version) {
      return NextResponse.json({ ok: true, skip: "done", tradeDate });
    }
  }

  try {
    const r = await runScreenerSlice({ tradeDate, offset, limit, deadline: started + BUDGET_MS });
    log(
      `t=${tradeDate} offset=${offset} processed=${r.processed} written=${r.written} ` +
        `prefiltered=${r.prefiltered} noBars=${r.noBars} failed=${r.failed.length} next=${r.next}`,
    );
    return NextResponse.json({
      ok: true,
      tradeDate,
      offset,
      processed: r.processed,
      written: r.written,
      prefiltered: r.prefiltered,
      noBars: r.noBars,
      failed: r.failed.length,
      failedSample: r.failed.slice(0, 5),
      next: r.next,
      universe: r.universe,
    });
  } catch (error) {
    log.warn("구간 처리 실패", error);
    return NextResponse.json({ ok: false, reason: "slice-failed", tradeDate, offset }, { status: 500 });
  }
}
