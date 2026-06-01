/**
 * `/api/stock/chart` BFF route — 기간별 차트 시세.
 *
 * `inquire-daily-itemchartprice`(FHKST03010100) 경유.
 *
 * GET ?ticker=005930&days=100&period=D|W|M
 *   - days  : 오늘 기준 과거 N 캘린더일 (기본 100, 최대 3000)
 *   - period: D(일봉) / W(주봉) / M(월봉), 기본 D
 *   - 응답  : StockDailyCandle[] 오름차순(오래된 날 먼저)
 *
 * 일봉 + 긴 기간(days > DAILY_CHUNK_DAYS): KIS 1회 100봉 한도 초과 방지를 위해
 * 130일 단위로 청크 분할 순차 호출 후 합산·중복제거.
 * 청크 간 150ms 지연으로 EGW00201 회피.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchStockDailyChart, isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { isApiError } from "@/lib/api/errors";
import { getMockStockChart } from "@/lib/mock/stock/daily";
import type { StockDailyCandle } from "@/lib/api/kis/types";

/** 일봉 단일 호출 커버 가능 캘린더일 (100 영업봉 ≒ 140일, 여유 10일). */
const DAILY_CHUNK_DAYS = 130;
const CHUNK_DELAY_MS = 150;
/** 일봉 1년 = ~3콜, 타임아웃을 넉넉히. */
const BFF_TIMEOUT_MS = 12_000;
const DEFAULT_DAYS = 100;
const MAX_DAYS = 3_000;

const VALID_PERIODS = new Set(["D", "W", "M"]);
type KisPeriod = "D" | "W" | "M";

const FALLBACK_TIMEOUT_MESSAGE =
  "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

function toYyyymmdd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** 일봉 청크 분할 호출 — 130일 단위로 나눠 순차 조회 후 합산. */
async function fetchDailyChunked(
  ticker: string,
  fromDate: string,
  toDate: string,
): Promise<StockDailyCandle[]> {
  const from = new Date(`${fromDate.slice(0, 4)}-${fromDate.slice(4, 6)}-${fromDate.slice(6, 8)}`);
  const to = new Date(`${toDate.slice(0, 4)}-${toDate.slice(4, 6)}-${toDate.slice(6, 8)}`);

  // 청크 목록 생성 (최신 → 과거 순)
  const chunks: Array<{ from: string; to: string }> = [];
  let chunkTo = new Date(to);
  while (chunkTo >= from) {
    const chunkFrom = addDays(chunkTo, -DAILY_CHUNK_DAYS + 1);
    const effectiveFrom = chunkFrom < from ? from : chunkFrom;
    chunks.push({ from: toYyyymmdd(effectiveFrom), to: toYyyymmdd(chunkTo) });
    chunkTo = addDays(effectiveFrom, -1);
  }

  // rate-limit 관측 — 청크 수 = 순차 KIS 실호출 수. 큰 범위(days 3000 등)에서
  // 한도 근접을 조기 감지하기 위한 로그(수치 변경 전 관측용, 로드맵 P2).
  console.info(
    `[stock/chart] chunked daily ticker=${ticker} range=${fromDate}~${toDate} ` +
      `chunks=${chunks.length} (= KIS calls)`,
  );

  const all: StockDailyCandle[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const { from: cf, to: ct } = chunks[i];
    const candles = await fetchStockDailyChart(ticker, cf, ct, "D");
    all.push(...candles);
    if (i < chunks.length - 1) await delay(CHUNK_DELAY_MS);
  }

  // 중복 제거 + 오름차순 정렬
  const seen = new Set<string>();
  return all
    .filter((c) => { if (seen.has(c.date)) return false; seen.add(c.date); return true; })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(request: NextRequest) {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").trim();
  const rawDays = parseInt(request.nextUrl.searchParams.get("days") ?? "", 10);
  const days = Number.isFinite(rawDays) && rawDays > 0
    ? Math.min(rawDays, MAX_DAYS)
    : DEFAULT_DAYS;
  const rawPeriod = (request.nextUrl.searchParams.get("period") ?? "D").toUpperCase();
  const period: KisPeriod = VALID_PERIODS.has(rawPeriod) ? (rawPeriod as KisPeriod) : "D";

  if (!ticker) {
    return NextResponse.json(
      { error: "ticker query parameter 가 필요합니다." },
      { status: 400 },
    );
  }

  if (!isKisConfigured()) {
    return jsonOk(getMockStockChart(ticker), "mock");
  }

  const toDate = toYyyymmdd(new Date());
  const fromDate = toYyyymmdd(addDays(new Date(), -days));

  try {
    const fetch =
      period === "D" && days > DAILY_CHUNK_DAYS
        ? fetchDailyChunked(ticker, fromDate, toDate)
        : fetchStockDailyChart(ticker, fromDate, toDate, period).then((c) =>
            c.slice().sort((a, b) => a.date.localeCompare(b.date)),
          );

    const candles = await withTimeout(fetch, BFF_TIMEOUT_MS);
    return jsonOk(candles, "kis", { "X-KIS-Env": resolveKisEnv() });
  } catch (error) {
    return mapErrorToResponse(error, ticker);
  }
}

function jsonOk(
  data: unknown,
  source: "kis" | "mock" | "mock-timeout",
  extra?: Record<string, string>,
): NextResponse {
  return NextResponse.json(data, {
    status: 200,
    headers: { "X-Data-Source": source, "Cache-Control": "no-store", ...(extra ?? {}) },
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("__BFF_TIMEOUT__")), ms);
  });
  try {
    return (await Promise.race([promise, timeout])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapErrorToResponse(error: unknown, ticker: string): NextResponse {
  if (error instanceof Error && error.message === "__BFF_TIMEOUT__") {
    return jsonOk(getMockStockChart(ticker), "mock-timeout", {
      "X-Error": FALLBACK_TIMEOUT_MESSAGE,
    });
  }
  if (isApiError(error)) {
    return NextResponse.json(
      { error: error.message, detail: error.detail },
      {
        status: error.status && error.status >= 400 ? error.status : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
  return NextResponse.json(
    { error: "KIS 서버 일시 오류. 잠시 후 다시 시도해주세요." },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}
