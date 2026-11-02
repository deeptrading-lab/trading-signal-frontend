/**
 * 스윙 조건 비트·충족 수 — 저장 행(`swing_judgments.items`)과 화면이 같이 쓰는 순수 헬퍼(클라이언트 안전).
 */

import type { SwingItems } from "./judge";

/** 조건 비트 순서 — 바꾸면 저장된 행 해석이 깨진다(추가만 끝에). */
export const SWING_ITEM_BITS = ["A1", "A2", "A3", "Aplus", "A", "B", "C", "D", "E"] as const;
export type SwingItemKey = (typeof SWING_ITEM_BITS)[number];

/** "충족 n/m" 의 대상 — 수급 3 + 매물대·국면·모멘텀·쌍바닥. 연기금(가점)·A(묶음)는 세지 않는다. */
export const SWING_MET_ITEMS = ["A1", "A2", "A3", "B", "C", "D", "E"] as const;

export function metCount(items: SwingItems): number {
  return SWING_MET_ITEMS.filter((k) => items[k].pass === true).length;
}

export function itemBits(items: SwingItems): number {
  return SWING_ITEM_BITS.reduce((acc, k, i) => acc | (items[k].pass === true ? 1 << i : 0), 0);
}

export function hasItemBit(bits: number, key: SwingItemKey): boolean {
  return (bits & (1 << SWING_ITEM_BITS.indexOf(key))) !== 0;
}

/**
 * "불리한 신호" 비트 — 충족의 반대쪽으로 뚜렷한 것(표시용, 판정·등급에는 쓰지 않는다).
 * 같은 `items` 정수의 위쪽(ADVERSE_SHIFT 부터)에 SWING_ITEM_BITS 순서로 담는다 — 스키마 변경 없이.
 *   개인 = 오히려 순매수 / 외국인·기관·연기금 = 순매도(기관은 사모 주도 매수도) / 국면 = 과열·하락추세 /
 *   전환 = RSI 과매수(상한 초과). 지지·쌍바닥은 "없음"일 뿐 불리 신호가 아니라 비트 없음.
 */
export const ADVERSE_SHIFT = 16;

export type AdverseInput = {
  flow: { person: number; foreign: number; institution: number; pension: number; privateEquity: number } | null;
  stage: string | null;
  rsi: number | null;
};
export type AdverseRules = {
  flow: { days: number; thresholdPerDay: number; peMaxShareOfInstitution: number; pensionBonusPerDay: number };
  momentum: { rsiMax: number };
};

export function adverseBits(f: AdverseInput, rb: AdverseRules): number {
  const th = rb.flow.thresholdPerDay * rb.flow.days;
  const fl = f.flow;
  const on: Partial<Record<SwingItemKey, boolean>> = {
    A1: fl !== null && fl.person >= th,
    A2: fl !== null && fl.foreign <= -th,
    A3:
      fl !== null &&
      (fl.institution <= -th || (fl.institution >= th && fl.privateEquity >= rb.flow.peMaxShareOfInstitution * fl.institution)),
    Aplus: fl !== null && fl.pension <= -rb.flow.pensionBonusPerDay * rb.flow.days,
    C: f.stage === "overheated" || f.stage === "downtrend",
    D: f.rsi !== null && f.rsi > rb.momentum.rsiMax,
  };
  return SWING_ITEM_BITS.reduce((acc, k, i) => acc | (on[k] ? 1 << (ADVERSE_SHIFT + i) : 0), 0);
}

export function hasAdverseBit(bits: number, key: SwingItemKey): boolean {
  return (bits & (1 << (ADVERSE_SHIFT + SWING_ITEM_BITS.indexOf(key)))) !== 0;
}
