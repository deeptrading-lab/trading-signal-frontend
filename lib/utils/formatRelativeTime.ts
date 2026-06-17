/**
 * ISO 시각 → "방금 전 / N분 전 / N시간 전 / N일 전 / YYYY.MM.DD" 한글 상대 표기.
 *
 * 분석 결과 카드의 `updatedAt`(분석 시각)처럼 "얼마나 최신인지"가 중요한 값에 사용한다.
 * 3일을 넘기면 절대 날짜(로컬 YYYY.MM.DD)로 떨어뜨려, 며칠 지난 분석은 실제 날짜가 보이게 한다.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "-";

  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60_000);

  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;

  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 3) return `${days}일 전`;

  const d = new Date(then);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}
