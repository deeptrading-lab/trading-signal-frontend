/**
 * KRX 호가단위(tick) 유틸 — 표시용 가격을 실제 주문 가능한 호가 단위로 스냅한다.
 *
 * AI 결정 카드의 목표·손절·재진입 절대가격(현재가 × (1 ± %))을 1원 단위로 반올림하면
 * "76,161원"처럼 실제로는 낼 수 없는 가격이 나온다. 가격대별 호가단위로 nearest 반올림해
 * 주문 가능한 값으로 보이게 한다(참고용 가이드 가격이므로 가장 가까운 호가로 스냅).
 *
 * 기준: KRX 2023-01 호가가격단위 개편(유가증권시장). 코스닥 고가 구간은 시장·종목별로 일부
 * 다르지만, 표시 컴포넌트가 시장 구분을 알 수 없으므로 유가 기준 단일 표를 쓴다 —
 * 표시 근사값이라 허용 가능한 오차(최대 ½ 틱).
 */

/** 가격대별 호가단위(원). KRX 유가증권시장 2023 개편 기준. */
export function krxTickSize(price: number): number {
  const p = Math.abs(price);
  if (p < 2_000) return 1;
  if (p < 5_000) return 5;
  if (p < 20_000) return 10;
  if (p < 50_000) return 50;
  if (p < 200_000) return 100;
  if (p < 500_000) return 500;
  return 1_000;
}

/** 가격을 해당 가격대 호가단위로 가장 가까운 호가에 반올림. 비유한 입력은 그대로 반환. */
export function roundToKrxTick(price: number): number {
  if (!Number.isFinite(price)) return price;
  const tick = krxTickSize(price);
  return Math.round(price / tick) * tick;
}
