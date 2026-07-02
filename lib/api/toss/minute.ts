/**
 * 토스 분봉 어댑터 — `minuteChartChunked.ts` 3개 진입점의 토스 구현.
 *
 * PRD `toss-market-data-adapter` §3-3, AC-5.
 *
 * ## KIS 파리티 규약
 *
 * - 반환은 기존과 동일한 `StockMinuteCandle[]`(date="YYYY-MM-DDTHH:mm", 오름차순, 0거래량 필터,
 *   `resampleMinuteCandles` 리샘플) — 시그널 엔진·백테스트가 그대로 소비.
 * - **국내 심볼은 KRX 정규장(09:00~15:30)만** 남긴다. 토스 분봉은 NXT 프리(08:00~)·애프터
 *   (~20:00)를 포함해 KIS 보다 세션이 넓은데, 단타 엔진의 세션 가정(09:00~15:30)을 지키기
 *   위해 필터로 파리티를 유지한다. NXT 확장 활용은 §9 q4 별도 트랙.
 * - "당일" 페치는 KIS `FID_PW_DATA_INCU_YN=Y` 관례를 따라 **최신 세션**(휴장이면 직전 거래일)
 *   기준 — 최신 봉의 KST 날짜를 세션 날짜로 삼는다.
 *
 * 미국 티커는 세션 필터를 건너뛴다(현 소비처는 국내 단타 한정 — KST 날짜 그룹핑 한계 주석 참조).
 */

import { fetchCandlesPage } from "./candles";
import { isoToKstMinuteStamp, todayKstDate, ymdToDash } from "./kst";
import type { TossCandle } from "./types";
import {
  dedupeSortMinuteCandles,
  dropFillerBars,
  minutesOfDay,
  resampleMinuteCandles,
} from "@/lib/api/kis/minuteResample";
import { toNumber } from "@/lib/api/kis/mappers";
import type { StockMinuteCandle } from "@/lib/api/kis/types";
import { delay } from "@/lib/server/bffUtils";

const PAGE_DELAY_MS = 250;
/** 당일(NXT 포함 최대 ~720분) 페이지 상한 — 200봉/콜. */
const TODAY_MAX_PAGES = 8;
const DATE_MAX_PAGES = 6;

const SESSION_START_MIN = 9 * 60; // 09:00
const SESSION_END_MIN = 15 * 60 + 30; // 15:30 (동시호가 종가봉 포함)
/**
 * ⚠️ 토스는 KRX 종가 동시호가 체결을 **15:31 봉**에 기록한다(E2E 실측 — 15:21~15:30 은
 * 0거래량 채움봉, 15:31 에 대량 체결). KIS 는 같은 체결이 15:30 봉이므로, 15:31 봉을
 * 세션에 포함시켰다가 정렬 후 15:30 으로 병합/리라벨해 파리티를 맞춘다
 * (`mergeClosingAuctionBars`). 과거일 커서도 이 봉이 잘리지 않게 15:32 를 anchor 로 쓴다.
 */
const CLOSING_AUCTION_MIN = 15 * 60 + 31; // 15:31

function isKoreanTicker(symbol: string): boolean {
  return /^\d{6}$/.test(symbol);
}

function mapTossMinuteCandle(candle: TossCandle): StockMinuteCandle | null {
  const stamp = isoToKstMinuteStamp(candle.timestamp);
  if (!stamp) return null;
  return {
    date: stamp,
    open: toNumber(candle.openPrice),
    high: toNumber(candle.highPrice),
    low: toNumber(candle.lowPrice),
    close: toNumber(candle.closePrice),
    volume: toNumber(candle.volume),
  };
}

/**
 * 국내 심볼 정규장 필터 — KIS 세션 파리티(모듈 주석). 미국 티커는 통과.
 * 15:31 종가 동시호가 봉은 **원본 스탬프 그대로** 통과시킨다 — 여기서 리라벨하면 실체결
 * 15:30 봉과 키가 충돌해 dedupe 가 한쪽 거래량을 비결정적으로 버린다. 병합/리라벨은
 * 정렬 뒤 `mergeClosingAuctionBars` 가 결정론적으로 수행.
 */
function filterRegularSession(
  symbol: string,
  candles: StockMinuteCandle[],
): StockMinuteCandle[] {
  if (!isKoreanTicker(symbol)) return candles;
  return candles.filter((c) => {
    const min = minutesOfDay(c.date);
    return (
      (min >= SESSION_START_MIN && min <= SESSION_END_MIN) ||
      min === CLOSING_AUCTION_MIN
    );
  });
}

/**
 * 정렬 완료 배열에서 15:31 동시호가 봉을 15:30 으로 정규화(결정론적).
 * 직전 원소가 같은 날 15:30 실체결 봉이면 병합(극값·거래량 합산, close=동시호가 체결가),
 * 아니면 15:30 으로 리라벨만 한다.
 */
export function mergeClosingAuctionBars(
  sorted: StockMinuteCandle[],
): StockMinuteCandle[] {
  const out: StockMinuteCandle[] = [];
  for (const c of sorted) {
    if (minutesOfDay(c.date) !== CLOSING_AUCTION_MIN) {
      out.push(c);
      continue;
    }
    const relabeled = `${c.date.slice(0, 10)}T15:30`;
    const prev = out[out.length - 1];
    if (prev && prev.date === relabeled) {
      prev.high = Math.max(prev.high, c.high);
      prev.low = Math.min(prev.low, c.low);
      prev.close = c.close; // 동시호가 체결가 = 그날의 공식 종가
      prev.volume += c.volume;
    } else {
      out.push({ ...c, date: relabeled });
    }
  }
  return out;
}

function finalize(
  symbol: string,
  oneMin: StockMinuteCandle[],
  timeframe: number,
): StockMinuteCandle[] {
  return resampleMinuteCandles(
    mergeClosingAuctionBars(
      dedupeSortMinuteCandles(dropFillerBars(filterRegularSession(symbol, oneMin))),
    ),
    timeframe,
  );
}

/**
 * 특정 세션 날짜("YYYY-MM-DD")의 1분봉을 `before` 커서로 역방향 수집.
 * 해당 날짜보다 오래된 봉을 만나면 종료(세션 시작 도달).
 *
 * ⚠️ `maxBars` 는 **정규장 필터를 통과한 봉**만 센다 — 토스 1m 스트림은 NXT 프리/애프터 봉이
 * 섞여 있어, 필터 전 개수로 캡을 걸면 저녁 봉이 캡을 소진해 정규장 봉이 잘린다(E2E 실측 회귀).
 */
async function collectSessionMinutes(
  symbol: string,
  sessionDate: string,
  initialBefore: string | undefined,
  maxPages: number,
  maxBars: number = Number.POSITIVE_INFINITY,
): Promise<StockMinuteCandle[]> {
  const acc: StockMinuteCandle[] = [];
  let before = initialBefore;

  for (let page = 0; page < maxPages && acc.length < maxBars; page++) {
    const { candles, nextBefore } = await fetchCandlesPage(symbol, "1m", { before });
    const mapped = (candles ?? [])
      .map(mapTossMinuteCandle)
      .filter((c): c is StockMinuteCandle => c !== null);
    if (mapped.length === 0) break;

    let crossedSessionStart = false;
    for (const c of filterRegularSession(symbol, mapped)) {
      const date = c.date.slice(0, 10);
      if (date === sessionDate) acc.push(c);
    }
    for (const c of mapped) {
      if (c.date.slice(0, 10) < sessionDate) {
        crossedSessionStart = true;
        break;
      }
    }
    if (crossedSessionStart) break;
    if (!nextBefore || nextBefore === before) break;
    before = nextBefore;
    await delay(PAGE_DELAY_MS);
  }

  return acc;
}

/**
 * `fetchTodayMinuteCandles(ticker, timeframe, maxBars)` 의 토스 구현.
 * 세션 날짜 = 최신 봉의 KST 날짜(휴장이면 직전 거래일 — KIS includePast 파리티).
 */
export async function fetchTodayMinuteCandlesToss(
  ticker: string,
  timeframe: number,
  maxBars: number = 400,
): Promise<StockMinuteCandle[]> {
  const first = await fetchCandlesPage(ticker, "1m", {});
  const mapped = (first.candles ?? [])
    .map(mapTossMinuteCandle)
    .filter((c): c is StockMinuteCandle => c !== null);
  if (mapped.length === 0) return [];

  const sessionDate = mapped
    .reduce((max, c) => (c.date > max ? c.date : max), mapped[0].date)
    .slice(0, 10);

  // maxBars 는 정규장 통과 봉만 센다 (collectSessionMinutes 주석의 NXT 캡 소진 회귀 참조).
  const acc = filterRegularSession(ticker, mapped).filter(
    (c) => c.date.slice(0, 10) === sessionDate,
  );
  const crossed = mapped.some((c) => c.date.slice(0, 10) < sessionDate);

  if (!crossed && first.nextBefore && acc.length < maxBars) {
    await delay(PAGE_DELAY_MS);
    const rest = await collectSessionMinutes(
      ticker,
      sessionDate,
      first.nextBefore,
      TODAY_MAX_PAGES - 1,
      maxBars - acc.length,
    );
    acc.push(...rest);
  }

  const result = finalize(ticker, acc, timeframe);
  if (result.length > 0) return result;

  // 장전(NXT 프리마켓만 존재) 케이스: 최신 세션이 오늘로 잡혔지만 정규장 봉이 아직 없다.
  // KIS(FID_PW_DATA_INCU_YN=Y)는 이때 직전 세션 봉을 돌려주므로, 첫 페이지에서 관측된
  // 직전 거래일로 재수집해 파리티를 맞춘다.
  const prevSessionDate = mapped
    .map((c) => c.date.slice(0, 10))
    .filter((d) => d < sessionDate)
    .sort()
    .pop();
  if (!prevSessionDate) return result;
  return fetchMinuteCandlesForDateToss(
    ticker,
    prevSessionDate.replace(/-/g, ""),
    timeframe,
  );
}

/**
 * `fetchMinuteCandlesForDate(ticker, dateYyyymmdd, timeframe)` 의 토스 구현.
 * anchor = 해당일 15:32 KST — `before` 는 **exclusive** 라서 15:31 로 잡으면 정작
 * 15:31 종가 동시호가 봉(그날 최대 거래량)이 잘린다. 15:32 로 그 봉까지 포함하고
 * NXT 애프터봉(15:32~)은 커서에서 제외.
 */
export async function fetchMinuteCandlesForDateToss(
  ticker: string,
  dateYyyymmdd: string,
  timeframe: number,
): Promise<StockMinuteCandle[]> {
  const dash = ymdToDash(dateYyyymmdd);
  const before = `${dash}T15:32:00+09:00`;
  const oneMin = await collectSessionMinutes(ticker, dash, before, DATE_MAX_PAGES);
  return finalize(ticker, oneMin, timeframe);
}

/**
 * `fetchMinuteHistory(ticker, {timeframe, priorDays, includeToday})` 의 토스 구현.
 *
 * 단일 역방향 워크로 최신 세션부터 거슬러 `priorDays (+ 오늘)` 개의 **거래일 세션**을 모은다
 * (봉이 존재하는 날 = 거래일이므로 휴장 스킵이 자연 해결). `includeToday=false` 면 오늘(KST)
 * 날짜 봉만 제외한다 — KIS 구현과 마찬가지로 "오늘"은 캘린더 기준.
 */
export async function fetchMinuteHistoryToss(
  ticker: string,
  opts: { timeframe: number; priorDays?: number; includeToday?: boolean },
): Promise<StockMinuteCandle[]> {
  const { timeframe, priorDays = 1, includeToday = true } = opts;
  const today = todayKstDate();
  const neededSessions = priorDays + (includeToday ? 1 : 0);
  const maxPages = neededSessions * 5 + 5;

  const acc: StockMinuteCandle[] = [];
  const sessionDates = new Set<string>();
  let before: string | undefined = includeToday
    ? undefined
    : `${today}T00:00:00+09:00`;

  // 일단 모으고 마지막에 최신 세션 N개만 남긴다 — 페이지 내 정렬 방향과 무관하게 안전.
  // 커서가 과거 방향으로 단조 진행하므로 "필요분+1번째 세션"이 등장한 페이지를 끝까지
  // 처리하고 멈추면 필요한 세션들은 전부 수집돼 있다.
  for (let page = 0; page < maxPages; page++) {
    const { candles, nextBefore } = await fetchCandlesPage(ticker, "1m", { before });
    const mapped = (candles ?? [])
      .map(mapTossMinuteCandle)
      .filter((c): c is StockMinuteCandle => c !== null);
    if (mapped.length === 0) break;

    for (const c of mapped) {
      const date = c.date.slice(0, 10);
      if (!includeToday && date === today) continue;
      sessionDates.add(date);
      acc.push(c);
    }

    if (sessionDates.size > neededSessions) break;
    if (!nextBefore || nextBefore === before) break;
    before = nextBefore;
    await delay(PAGE_DELAY_MS);
  }

  const wanted = new Set(
    Array.from(sessionDates).sort().slice(-neededSessions),
  );
  const bars = acc.filter((c) => wanted.has(c.date.slice(0, 10)));
  return finalize(ticker, bars, timeframe);
}
