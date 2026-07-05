/**
 * KIS 업종(섹터) 랭킹 호출 — "지금 뜨는 산업" 리스트.
 *
 * PRD `trending-sectors` §3-1 / AC-0 실측.
 *
 * ## 랭킹 = 단일 콜 `FHPUP02140000`
 *
 * `GET /uapi/domestic-stock/v1/quotations/inquire-index-category-price` (업종 카테고리별 지수).
 * 파라미터(AC-0 실측, 전부 필수):
 *   - `FID_COND_MRKT_DIV_CODE=U`(업종) · `FID_INPUT_ISCD=0001`(KOSPI) · `FID_COND_SCR_DIV_CODE=20214`
 *   - `FID_MRKT_CLS_CODE=K`(코스피) · `FID_BLNG_CLS_CODE=0`
 * 응답 `output2` = 업종 배열(KOSPI 38 건). 항목: `bstp_cls_code`(업종코드)·`hts_kor_isnm`(업종명)·
 * `bstp_nmix_prdy_ctrt`(등락률)·`prdy_vrss_sign`·`acml_tr_pbmn`(거래대금). 규모티어·테마 지수가 섞여
 * `isKospiSectorCode` 화이트리스트로 실제 산업만 남긴 뒤 등락률 내림차순 정렬 → 상위 N.
 *
 * ## breadth(N개 중 M개 상승) — 상위 N 만 fan-out
 *
 * output2 엔 상승/하락 종목수가 없다. 표시할 **상위 N 업종코드만** `FHPUP02100000`(업종 현재지수,
 * `fetchIndexPrice` 재사용) fan-out 해 `advances`/`declines`/`unchanged` 를 채운다. 38 전체가 아니라
 * 상위 N(≈13) 한정이라 콜 수가 제한적이고, 동시성 캡 + 순차 딜레이로 EGW00201(초당 한도)을 억제한다.
 * 실패는 fail-soft(해당 업종 breadth 0, 등락률은 유지).
 *
 * ## ⚠️ 실전(prod) 전용
 *
 * 두 TR 모두 모의(vts) 미지원. BFF route 가 `resolveKisEnv()==="prod"` 이중 게이트를 통과한 경우에만
 * 호출한다(volume-rank 선례).
 */

import { getKisClient } from "./client";
import { makeKisBusinessError, makeKisTransportError } from "./errors";
import { toNumber, mapDirection } from "./mappers";
import { fetchIndexPrice } from "./index-price";
import { isKospiSectorCode } from "./sectorCodes";
import { getAccessToken } from "./token";
import { delay } from "@/lib/server/bffUtils";
import type { FlowDirection } from "@/lib/types/flow/top10";
import type { SectorRankItem } from "@/lib/types/market/sectors";

/** KIS inquire-index-category-price output2 1행(사용 필드만). */
export type KisSectorCategoryItem = {
  /** 업종 코드(4자리). */
  bstp_cls_code?: string;
  /** 업종명. */
  hts_kor_isnm?: string;
  /** 전일 대비율(%). */
  bstp_nmix_prdy_ctrt?: string;
  /** 전일 대비 부호. */
  prdy_vrss_sign?: string;
  /** 누적 거래대금. */
  acml_tr_pbmn?: string;
};

/** inquire-index-category-price 응답(output1 요약 + output2 업종 배열). */
type KisSectorCategoryResponse = {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output1?: unknown;
  output2?: KisSectorCategoryItem[];
};

function directionFromPercent(changePct: number): FlowDirection {
  if (changePct > 0) return "up";
  if (changePct < 0) return "down";
  return "flat";
}

/**
 * output2 1행 → breadth 없는 `SectorRankItem`(up/down/flat/total=0). breadth 는 fan-out 이 채운다.
 *
 * 방향은 부호(`prdy_vrss_sign`) 우선, 없으면 등락률 부호로 폴백(표시 등락률과 일관).
 */
export function mapSectorCategoryItem(item: KisSectorCategoryItem): SectorRankItem {
  const code = item.bstp_cls_code?.trim() ?? "";
  const changePct = toNumber(item.bstp_nmix_prdy_ctrt);
  const signDir = mapDirection(item.prdy_vrss_sign);
  return {
    code,
    name: item.hts_kor_isnm?.trim() || code,
    changePct,
    direction: signDir !== "flat" ? signDir : directionFromPercent(changePct),
    up: 0,
    down: 0,
    flat: 0,
    total: 0,
  };
}

/**
 * output2 → 산업 화이트리스트 필터 + 등락률 내림차순 정렬 + 상위 N slice(순수 함수, 테스트 대상).
 */
export function rankSectors(
  items: KisSectorCategoryItem[],
  topN: number,
): SectorRankItem[] {
  return items
    .map(mapSectorCategoryItem)
    .filter((s) => isKospiSectorCode(s.code))
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, topN);
}

/** breadth fan-out 동시성 캡 — 초당 한도(EGW00201) 억제. */
const BREADTH_CONCURRENCY = 4;
/** 배치 간 딜레이(ms) — flow/top10 선례. */
const BREADTH_BATCH_DELAY_MS = 120;

/**
 * 상위 N 업종에 breadth(up/down/flat/total)를 fan-out 으로 채운다(best-effort).
 *
 * `fetchIndexPrice(code)`(FHPUP02100000) 를 동시성 캡 배치로 호출. 실패한 업종은 breadth 0 유지
 * (fail-soft — 등락률 랭킹은 무손상). 성공 시 `advances`/`declines`/`unchanged` 합산.
 */
async function enrichBreadth(sectors: SectorRankItem[]): Promise<SectorRankItem[]> {
  const enriched = [...sectors];
  for (let i = 0; i < enriched.length; i += BREADTH_CONCURRENCY) {
    const batch = enriched.slice(i, i + BREADTH_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((s) => fetchIndexPrice(s.code)),
    );
    results.forEach((result, j) => {
      if (result.status !== "fulfilled") return; // fail-soft — breadth 0 유지.
      const quote = result.value;
      const up = quote.advances ?? 0;
      const down = quote.declines ?? 0;
      const flat = quote.unchanged ?? 0;
      const target = batch[j];
      target.up = up;
      target.down = down;
      target.flat = flat;
      target.total = up + down + flat;
    });
    if (i + BREADTH_CONCURRENCY < enriched.length) {
      await delay(BREADTH_BATCH_DELAY_MS);
    }
  }
  return enriched;
}

/**
 * 업종 랭킹 조회 — 카테고리 단건 + 화이트리스트 + 등락률 정렬 상위 N + breadth fan-out.
 *
 * @param topN 표시 상위 업종 수(디자인 기준 ≈13).
 */
export async function fetchSectorRanking(topN: number): Promise<SectorRankItem[]> {
  const client = getKisClient();
  const accessToken = await getAccessToken();

  let response;
  try {
    response = await client.get<KisSectorCategoryResponse>(
      "/uapi/domestic-stock/v1/quotations/inquire-index-category-price",
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
          appkey: process.env.KIS_APP_KEY ?? "",
          appsecret: process.env.KIS_APP_SECRET ?? "",
          tr_id: "FHPUP02140000",
          custtype: "P",
        },
        params: {
          FID_COND_MRKT_DIV_CODE: "U",
          FID_INPUT_ISCD: "0001", // KOSPI.
          FID_COND_SCR_DIV_CODE: "20214",
          FID_MRKT_CLS_CODE: "K", // 코스피.
          FID_BLNG_CLS_CODE: "0",
        },
      },
    );
  } catch (error) {
    const status =
      typeof (error as { response?: { status?: number } }).response?.status ===
      "number"
        ? (error as { response: { status: number } }).response.status
        : undefined;
    throw makeKisTransportError({
      status,
      message:
        error instanceof Error
          ? error.message
          : "KIS 업종 랭킹 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0" || !data.output2) {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  const ranked = rankSectors(data.output2, topN);
  return enrichBreadth(ranked);
}
