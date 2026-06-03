/**
 * 수급 일별 스냅샷 적립/누적 조회 — **서버 전용**.
 *
 * PRD `investor-flow-cumulative` §4 / §6.2 / §6.3.
 *
 * `FHPTJ04400000`(시장 전체 외국인/기관 순매수 랭킹)은 날짜 파라미터가 없어 history 직접 불가
 * → 매 영업일 장마감 후 cron(`/api/cron/flow-snapshot`)이 당일 랭킹 **전 행**을 KV 에 적립하고,
 * 누적 조회(`/api/flow/top10?mode=cumulative`)가 최근 N영업일치를 합산·재정렬한다.
 *
 * 저장소: `lib/api/kis/store.ts` 의 `KisStore`(get/set/del, **fail-soft** — 에러·타임아웃은
 *   throw 가 아니라 null/no-op). KV(`KIS_TOKEN_STORE=kv`) 또는 메모리(로컬/테스트).
 *
 * 키: `flow:snap:<YYYYMMDD(KST)>:<frgn|orgn>`, TTL 12일(7영업일 + 주말/공휴일 여유).
 * 누적 합산은 **근사**(§7) — 일별 랭킹이 상위 N행만 담으면 중위권 누락 가능.
 */

import { getKisStore } from "@/lib/api/kis/store";
import type { ForeignInstitutionSubject } from "@/lib/api/kis/investor-flow";
import type { InvestorFlowRow } from "@/lib/types/flow/top10";

const KEY_PREFIX = "flow:snap";
const TTL_SEC = 12 * 24 * 60 * 60; // 12일.
const MAX_LOOKBACK_DAYS = 12; // 7영업일 수집까지 최대 12달력일 역산(주말/공휴일 흡수).
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** `offsetDays` 전(0=오늘) KST 날짜를 YYYYMMDD 로. 서버 UTC 기준이라 +9h 보정. */
function kstYyyymmdd(offsetDays: number): string {
  const d = new Date(Date.now() + KST_OFFSET_MS - offsetDays * DAY_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function snapKey(date: string, subject: ForeignInstitutionSubject): string {
  return `${KEY_PREFIX}:${date}:${subject}`;
}

/** 당일(KST) 주체별 스냅샷 전 행을 KV 에 저장. fail-soft(에러는 store 가 흡수). */
export async function saveFlowSnapshot(
  subject: ForeignInstitutionSubject,
  rows: InvestorFlowRow[],
): Promise<void> {
  await getKisStore().set(snapKey(kstYyyymmdd(0), subject), rows, TTL_SEC);
}

export type CumulativeResult = {
  /** 합산·재정렬된 순매수 상위 행(전체 — 상위 N slice 는 호출 측). */
  rows: InvestorFlowRow[];
  /** 실제 합산에 사용된 영업일 수(존재한 스냅샷 수, ≤ days). */
  daysCount: number;
};

/**
 * 최근 `days` 영업일치 스냅샷을 KV 에서 모아 ticker 별 순매수(거래대금) 합산 후 재정렬.
 * 없는 날(주말·공휴일·미적립)은 자연 skip — 최대 `MAX_LOOKBACK_DAYS` 달력일 역산.
 */
export async function readCumulativeSnapshots(
  subject: ForeignInstitutionSubject,
  days: number,
): Promise<CumulativeResult> {
  const store = getKisStore();
  const snapshots: InvestorFlowRow[][] = [];
  for (
    let offset = 0;
    offset < MAX_LOOKBACK_DAYS && snapshots.length < days;
    offset += 1
  ) {
    const snap = await store.get<InvestorFlowRow[]>(
      snapKey(kstYyyymmdd(offset), subject),
    );
    if (snap && snap.length > 0) snapshots.push(snap);
  }
  return { rows: aggregate(snapshots), daysCount: snapshots.length };
}

/**
 * 스냅샷들(최신→과거 순)을 ticker 별로 합산. 메타(name·price·changePercent·direction)는
 * 가장 최근 스냅샷 값 보존(누적서 가격·등락은 참고용). 거래대금 내림차순 정렬.
 */
function aggregate(snapshots: InvestorFlowRow[][]): InvestorFlowRow[] {
  const map = new Map<string, InvestorFlowRow>();
  for (const snap of snapshots) {
    for (const row of snap) {
      const existing = map.get(row.ticker);
      if (existing) {
        existing.netBuyAmount += row.netBuyAmount;
        existing.netBuyQty += row.netBuyQty;
      } else {
        map.set(row.ticker, { ...row });
      }
    }
  }
  return [...map.values()].sort((a, b) => b.netBuyAmount - a.netBuyAmount);
}
