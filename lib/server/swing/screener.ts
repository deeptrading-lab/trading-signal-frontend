/**
 * 스윙 스크리너 — 유니버스 구간(offset·limit)을 시간 예산 안에서 판정·저장한다(크론 1회 호출 단위).
 *
 * 무상태·멱등: 같은 거래일 같은 구간을 다시 돌려도 upsert 라 결과가 같다. 시간 예산을 넘기면 아직 시작
 * 안 한 첫 종목 위치를 `next` 로 돌려줘 다음 호출이 이어받는다(GHA 가 반복 호출).
 */

import { listDomesticSymbols } from "@/lib/api/kis/search";
import { getKisStore } from "@/lib/api/kis/store";
import { RULEBOOK } from "@/lib/swing/rulebook";
import { computeSwingJudgment, getMajorReportEvents, type SwingTarget } from "./compute";
import { createKisPacer } from "./pace";
import { toSwingRow, type SwingJudgmentRow } from "./row";
import { upsertSwingRows } from "./store";

/** 동시에 도는 종목 수 — 호출 간격은 페이서가 공유하므로 초당 상한은 그대로다. */
const WORKERS = 2;
const UPSERT_CHUNK = 100;

/** 유니버스 = 국내 시드 전 종목 − 규칙서 이름 제외(스팩·리츠). 종목코드 순(호출 간 offset 이 안정적). */
export function swingUniverse(): SwingTarget[] {
  const patterns = RULEBOOK.excludeNamePatterns.map((p) => new RegExp(p));
  return listDomesticSymbols()
    .filter((s) => !patterns.some((re) => re.test(s.name)))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}

export type ScreenerSliceResult = {
  /** 이번 호출에서 끝낸 종목 수(판정·건너뜀·실패 모두). */
  processed: number;
  written: number;
  prefiltered: number;
  noBars: number;
  failed: Array<{ ticker: string; error: string }>;
  /** 이어받을 유니버스 위치. 끝까지 갔으면 null. */
  next: number | null;
  universe: number;
};

export async function runScreenerSlice(opts: {
  tradeDate: string;
  offset: number;
  limit: number;
  /** 이 시각(ms) 이후에는 새 종목을 시작하지 않는다. */
  deadline: number;
}): Promise<ScreenerSliceResult> {
  const universe = swingUniverse();
  const slice = universe.slice(opts.offset, opts.offset + opts.limit);
  const events = await getMajorReportEvents(opts.tradeDate);
  const call = createKisPacer();
  const rows: SwingJudgmentRow[] = [];
  const failed: ScreenerSliceResult["failed"] = [];
  let prefiltered = 0;
  let noBars = 0;
  let i = 0;

  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      while (i < slice.length && Date.now() < opts.deadline) {
        const target = slice[i++];
        try {
          const r = await computeSwingJudgment(target, opts.tradeDate, events, call, { prefilter: true });
          if (r.status === "judged") rows.push(toSwingRow(r.judgment, "screener", r.inputHash));
          else if (r.reason === "prefilter") prefiltered++;
          else noBars++;
        } catch (e) {
          failed.push({ ticker: target.ticker, error: String((e as { message?: string })?.message ?? e).slice(0, 120) });
        }
      }
    }),
  );

  let written = 0;
  for (let k = 0; k < rows.length; k += UPSERT_CHUNK) {
    const chunk = rows.slice(k, k + UPSERT_CHUNK);
    const err = await upsertSwingRows(chunk);
    if (err) throw new Error(err); // 저장 실패는 호출 전체 실패 → GHA 가 같은 구간을 재시도(멱등)
    written += chunk.length;
  }

  const end = opts.offset + i;
  const next = i < slice.length ? end : end < universe.length ? end : null;
  return { processed: i, written, prefiltered, noBars, failed, next, universe: universe.length };
}

// ── KV 헬스 마커 (scorecardCronMeta 패턴) ─────────────────────────────────────
const META_KEY = "swing:screener:meta";
const META_TTL_SEC = 30 * 24 * 3_600;

export type SwingScreenerMeta = {
  at: string;
  ok: boolean;
  tradeDate?: string;
  version?: string;
  processed?: number;
  failed?: number;
  reason?: string;
};

export async function saveSwingScreenerMeta(meta: SwingScreenerMeta): Promise<void> {
  await getKisStore().set(META_KEY, meta, META_TTL_SEC);
}

export async function readSwingScreenerMeta(): Promise<SwingScreenerMeta | null> {
  return getKisStore().get<SwingScreenerMeta>(META_KEY);
}

/** 완료 판정 — 끝까지 처리했고 실패가 2% 이하. */
export function isScreenerRunOk(processed: number, failed: number): boolean {
  return processed > 0 && failed / processed <= 0.02;
}
