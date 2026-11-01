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
