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

/** 주요사항보고 1건 — 스윙 규칙서 자금조달·위험 공시 제외 입력(PRD `swing-judgment`). */
export type MajorReportItem = {
  /** 6자리 종목코드(비상장은 빈 문자열 → 호출부가 거른다). */
  stockCode: string;
  corpName: string;
  reportName: string;
  /** 접수일 YYYY-MM-DD. */
  rceptDate: string;
  rceptNo: string;
};

/**
 * 시장 전체 주요사항보고(`pblntf_ty=B`) 목록 — 기간 지정, 전 페이지.
 *
 * - `corp_code` 없이 조회하므로 OpenDART 제약상 기간은 **3개월 이내**여야 한다(호출부가 창을 나눈다).
 * - `last_reprt_at=N` — 정정 전 원본도 포함한다(그 시점에 실제로 보였던 공시 = 시점 일관성).
 * - 조회 결과 없음(`013`)은 빈 배열.
 *
 * 오프라인 수집기와 라이브(PR-2)가 같이 쓴다.
 */
export async function fetchMajorReports(
  corpCls: "Y" | "K",
  bgnDe: string,
  endDe: string,
): Promise<MajorReportItem[]> {
  const client = getDartClient();
  const apiKey = getDartApiKey();
  if (!apiKey) {
    throw makeDartTransportError({
      message: "OPENDART_API_KEY 환경변수가 설정되지 않았습니다.",
    });
  }

  const items: MajorReportItem[] = [];
  for (let page = 1, totalPage = 1; page <= totalPage; page++) {
    let response;
    try {
      response = await client.get<DartDisclosureListResponse>("/list.json", {
        params: {
          crtfc_key: apiKey,
          corp_cls: corpCls,
          pblntf_ty: "B",
          last_reprt_at: "N",
          bgn_de: bgnDe,
          end_de: endDe,
          page_count: 100,
          page_no: page,
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
      if (isDartEmptyStatus(data.status)) return items;
      throw makeDartBusinessError(data.status, data.message);
    }
    totalPage = data.total_page ?? 1;
    for (const item of data.list ?? []) {
      items.push({
        stockCode: (item.stock_code ?? "").trim(),
        corpName: item.corp_name,
        reportName: item.report_nm,
        rceptDate: formatDate(item.rcept_dt),
        rceptNo: item.rcept_no,
      });
    }
  }
  return items;
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
