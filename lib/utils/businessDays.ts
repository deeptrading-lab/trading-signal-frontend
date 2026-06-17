/**
 * 영업일(평일) 계산 헬퍼 — 주말(토·일)만 제외한다.
 *
 * 공휴일 캘린더는 의도적으로 두지 않는다(매년 유지보수 비용). 이 프로젝트는
 * `flowSnapshotStore`(12달력일=7영업일+여유)처럼 "임계 마진으로 공휴일을 흡수"하는
 * 방식을 쓴다 — 본 헬퍼도 평일만 세고, 소수의 공휴일은 호출부의 임계 마진이 흡수한다.
 */

/** 날짜를 자정(로컬)으로 정규화한 새 Date 를 반환한다. */
function atMidnight(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** 토요일(6)·일요일(0)이면 true. */
function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * `from` 다음 날부터 `to`(포함)까지의 평일(월~금) 수.
 *
 * 예) from=금요일, to=다음 주 월요일 → 1(주말 2일 제외, 월요일만).
 *     from=to(같은 날) → 0. from 이 to 보다 미래면 0.
 *
 * 시·분은 무시하고 날짜 단위로 계산한다.
 */
export function businessDaysBetween(from: Date, to: Date): number {
  const cursor = atMidnight(from);
  const end = atMidnight(to);
  let count = 0;
  // from 자신은 제외하고 그 다음 날부터 센다(경과한 거래일 수).
  cursor.setDate(cursor.getDate() + 1);
  while (cursor.getTime() <= end.getTime()) {
    if (!isWeekend(cursor)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}
