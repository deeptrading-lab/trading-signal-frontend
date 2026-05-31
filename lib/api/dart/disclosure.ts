/**
 * OpenDART 공시 목록 조회 (`/api/list.json`).
 *
 * PRD `stock-api-integration` §3.2.
 *
 * 입력: 8자리 corp_code + 최근 N건.
 * 출력: 클라이언트 친화 `DisclosureItem[]`.
 *
 * 최근 N건 조회 정책:
 *   - `end_de` 미지정 → DART 기본 = 오늘.
 *   - `bgn_de` = 1년 전 (YYYYMMDD).
 *   - `last_reprt_at=Y` — 최종보고서만.
 *   - `page_count=count` — N건 페이지 사이즈.
 *   - 정렬 = 접수일자 내림차순 (DART 기본).
 */

import { getDartApiKey, getDartClient } from "./client";
import {
  isDartEmptyStatus,
  isDartQuotaExceededStatus,
  makeDartBusinessError,
  makeDartTransportError,
} from "./errors";
import type {
  DartDisclosureItem,
  DartDisclosureListResponse,
  DisclosureItem,
} from "./types";

export async function fetchDisclosureList(
  corpCode: string,
  count: number = 5,
): Promise<DisclosureItem[]> {
  const client = getDartClient();
  const apiKey = getDartApiKey();
  if (!apiKey) {
    throw makeDartTransportError({
      message: "OPENDART_API_KEY 환경변수가 설정되지 않았습니다.",
    });
  }

  const safeCount = Math.max(1, Math.min(100, Math.floor(count)));
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  let response;
  try {
    response = await client.get<DartDisclosureListResponse>("/list.json", {
      params: {
        crtfc_key: apiKey,
        corp_code: corpCode,
        bgn_de: toYYYYMMDD(oneYearAgo),
        end_de: toYYYYMMDD(today),
        last_reprt_at: "Y",
        page_count: safeCount,
        page_no: 1,
      },
    });
  } catch (error) {
    const status =
      typeof (error as { response?: { status?: number } }).response?.status ===
      "number"
        ? (error as { response: { status: number } }).response.status
        : undefined;
    throw makeDartTransportError({
      status,
      message: status
        ? "OpenDART 서버 오류가 발생했어요. 잠시 후 다시 시도해주세요."
        : "OpenDART 서버와 연결할 수 없어요. 잠시 후 다시 시도해주세요.",
    });
  }

  const data = response.data;
  if (data.status !== "000") {
    if (isDartEmptyStatus(data.status)) return [];
    if (isDartQuotaExceededStatus(data.status)) {
      // BFF route 가 mock fallback 분기.
    }
    throw makeDartBusinessError(data.status, data.message);
  }

  return (data.list ?? []).slice(0, safeCount).map(mapDisclosureItem);
}

function mapDisclosureItem(item: DartDisclosureItem): DisclosureItem {
  return {
    rceptNo: item.rcept_no,
    corpName: item.corp_name,
    reportName: item.report_nm,
    filerName: item.flr_nm,
    rceptDate: formatDate(item.rcept_dt),
  };
}

function toYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatDate(yyyymmdd: string): string {
  if (/^\d{8}$/.test(yyyymmdd)) {
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  }
  return yyyymmdd;
}
