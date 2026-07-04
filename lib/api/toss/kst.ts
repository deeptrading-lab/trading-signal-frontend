/**
 * 토스 캔들 timestamp(ISO 8601) → KST 기준 date 키 변환 유틸.
 *
 * ## 왜 문자열 slice 가 아니라 Intl 인가
 *
 * 토스 캔들 timestamp 는 실측상 `+09:00` 오프셋 표기(국내 일봉 `T00:00:00+09:00`, 미국 일봉
 * `T13:00:00+09:00`=미국 자정)라 slice(0,10) 이 우연히 맞지만, 오프셋 표기가 `Z` 로 바뀌면
 * slice 는 하루 어긋난다. epoch 파싱 후 Asia/Seoul 로 포맷하면 서버 타임존·표기 오프셋과
 * 무관하게 안정적이다(분봉 `YYYY-MM-DDTHH:mm` 키 규약은 `StockMinuteCandle` 주석 참조).
 */

/** sv-SE 로케일은 ISO 형식(YYYY-MM-DD / HH:mm)을 그대로 돌려준다. */
const KST_DATE_FMT = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const KST_TIME_FMT = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** ko-KR 짧은 요일("월"·"화"…) — KST 기준. 장 캘린더 "다음 개장" 요일 표기용. */
const KST_WEEKDAY_KO_FMT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  weekday: "short",
});

/** ISO timestamp → KST "HH:mm" (h23). 세션 경계·다음 개장 시각 표기용. 파싱 실패 시 null. */
export function isoToKstHm(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const epoch = Date.parse(iso);
  if (!Number.isFinite(epoch)) return null;
  return KST_TIME_FMT.format(epoch);
}

/**
 * "YYYY-MM-DD"(KST 캘린더 날짜) → 짧은 한글 요일("월"…). KST 자정 anchor 로 파싱해
 * 서버 타임존과 무관하게 안정적(문자열 slice·new Date 로컬 파싱 회피). 파싱 실패 시 "".
 */
export function kstWeekdayKo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const epoch = Date.parse(`${dateStr}T00:00:00+09:00`);
  if (!Number.isFinite(epoch)) return "";
  return KST_WEEKDAY_KO_FMT.format(epoch);
}

/** ISO timestamp → KST "YYYY-MM-DD". 파싱 실패 시 null. */
export function isoToKstDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const epoch = Date.parse(iso);
  if (!Number.isFinite(epoch)) return null;
  return KST_DATE_FMT.format(epoch);
}

/**
 * ISO timestamp → KST "YYYY-MM-DDTHH:mm" (분봉 정렬·dedup 키 — 타임존 접미사 미부착).
 * 파싱 실패 시 null.
 */
export function isoToKstMinuteStamp(iso: string | undefined): string | null {
  if (!iso) return null;
  const epoch = Date.parse(iso);
  if (!Number.isFinite(epoch)) return null;
  return `${KST_DATE_FMT.format(epoch)}T${KST_TIME_FMT.format(epoch)}`;
}

/** 오늘 KST "YYYY-MM-DD" — 서버 타임존(Vercel UTC 등) 비의존. */
export function todayKstDate(): string {
  return KST_DATE_FMT.format(Date.now());
}

/** "YYYYMMDD" → "YYYY-MM-DD". 이미 dash 형식이거나 비정형이면 그대로 통과(디펜시브). */
export function ymdToDash(ymd: string): string {
  if (/^\d{8}$/.test(ymd)) {
    return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
  }
  return ymd;
}

/** "YYYY-MM-DD" 에 n일 더한 "YYYY-MM-DD" (UTC 산술 — 날짜 문자열 연산이라 타임존 무관). */
export function addDaysToDash(dash: string, n: number): string {
  const d = new Date(`${dash}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
