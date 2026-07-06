/**
 * 구성종목 스파크라인 배치 로더 — 티커 목록의 최근 종가 시리즈를 서버에서 모아 반환.
 *
 * 구성종목 모달의 미니 차트를 **행마다 개별 API 콜**로 그리면 top-30 열 때 최대 30개 `/api/stock/chart`
 * 가 동시에 발사돼(레이트리밋 위험) 빈 네모가 종목별로 순차 채워진다. 대신 이 로더가 **서버에서
 * 동시성 캡으로 한 번에** 모아 한 응답으로 내려, 클라는 배치 하나로 전 종목을 **일괄** 렌더한다.
 *
 * 데이터 = `fetchStockDaily`(일자별 시세, inquire-daily-price ~30영업일) 의 종가. 스파크라인은 지표
 * 워밍업이 필요 없어 이 가벼운 일자별 콜로 충분(차트 라우트의 250봉 대신). 오래된→최신 정렬 후
 * 최근 `SPARK_POINTS` 점. never-throw — 실패 티커는 생략(fail-soft), 절대 던지지 않는다.
 *
 * ## 레이트리밋 안전(KIS EGW00201, 전역 리미터 없음 — 기능별 방어)
 * 앱엔 전역 KIS 리미터가 없어 홈 위젯들이 겹치면 간헐 EGW00201(초당 한도, 실전 ~20/s)이 난다. 30콜
 * 배치가 초당 한도를 넘기지 않도록 3중 방어: ①**동시성 5**(과거 8→축소) ②배치 간 `BATCH_GAP_MS` 지연
 * ③각 콜을 `fetchWithTransientRetry` 로 감싸 **EGW00201 시 backoff 후 1회 재시도**(그래도 실패면 []→생략).
 */

import { fetchStockDaily } from "./price";
import { delay, fetchWithTransientRetry } from "@/lib/server/bffUtils";
import type { StockDailyCandle } from "./types";

/** 서버 fan-out 동시성 캡 — KIS 초당 한도(EGW00201) 보호(8→5 축소). */
const SPARK_CONCURRENCY = 5;
/** 배치 간 지연(ms) — 초당 한도 억제(다른 위젯 콜과 겹침 여유). */
const BATCH_GAP_MS = 120;
/** EGW00201/네트워크 재시도 backoff(ms). */
const RETRY_BACKOFF_MS = 250;
/** 스파크라인 점 수(최근 N 종가) — 약 6주 추세. */
const SPARK_POINTS = 30;

/** 티커별 최근 종가 시리즈(오래된→최신) 맵. 미확보·2점 미만 티커는 생략. */
export async function loadSparklines(
  tickers: readonly string[],
): Promise<Record<string, number[]>> {
  const out: Record<string, number[]> = {};
  const uniq = [...new Set(tickers)];
  for (let i = 0; i < uniq.length; i += SPARK_CONCURRENCY) {
    const batch = uniq.slice(i, i + SPARK_CONCURRENCY);
    // 각 콜 = EGW00201/네트워크 시 backoff 후 1회 재시도, 그래도 실패면 [](생략) — throw 없음.
    const candlesList = await Promise.all(
      batch.map((t) =>
        fetchWithTransientRetry<StockDailyCandle[]>(
          () => fetchStockDaily(t, "D"),
          [],
          RETRY_BACKOFF_MS,
        ),
      ),
    );
    candlesList.forEach((candles, j) => {
      if (candles.length === 0) return;
      const closes = [...candles]
        .sort((a, b) => a.date.localeCompare(b.date)) // 오래된→최신.
        .map((c) => c.close)
        .filter((n) => Number.isFinite(n))
        .slice(-SPARK_POINTS);
      if (closes.length >= 2) out[batch[j]] = closes;
    });
    // 배치 간 지연(마지막 배치 뒤엔 생략) — 초당 한도 버스트 억제.
    if (i + SPARK_CONCURRENCY < uniq.length) await delay(BATCH_GAP_MS);
  }
  return out;
}
