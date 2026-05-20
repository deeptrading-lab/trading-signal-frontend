/**
 * 통화·자릿수 포맷터.
 *
 * DESIGN.md `typography.mono-numeric` 자리에 들어가는 수치를 사람이 읽기 좋은 형태로 변환한다.
 * - `1000000` → `"1,000,000"` (콤마)
 * - 통화는 ticker.currency 가 흘러오면 단순 접미사로 표시 (예: `USD`, `KRW`).
 *   화면 코드가 통화 변환을 하지 않는다는 디자이너 결정(OPEN QUESTION #3) 에 정합.
 */

export function formatMoney(value: number | null | undefined, currency?: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }
  const fractionDigits = Math.abs(value) >= 1000 ? 0 : 2;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
  return currency ? `${formatted} ${currency}` : formatted;
}

export function formatNumber(
  value: number | null | undefined,
  options?: { digits?: number },
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }
  const digits = options?.digits ?? (Math.abs(value) >= 1000 ? 0 : 2);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
