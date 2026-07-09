/**
 * chunk — 배열을 고정 크기 하위 배열로 분할하는 도메인 무관 순수 헬퍼.
 *
 * 요청 상한(예: 관심종목 일괄 시세 BFF soft cap 30)을 넘는 입력을 여러 번에 나눠 보낼 때 쓴다.
 * 원소 순서와 개수는 보존한다(⌈n/size⌉ 덩이). size ≤ 0 이면 통째로 한 덩이(빈 입력은 빈 배열).
 */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (items.length === 0) return [];
  if (size <= 0) return [[...items]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
