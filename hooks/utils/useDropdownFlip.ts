/**
 * useDropdownFlip — 드롭다운 세로 플립 판정. 트리거 아래 공간이 메뉴보다 부족하고 **위가 더 넉넉하면**
 * 위로 펼치도록(`bottom-full`) `dropUp=true` 반환. 아니면 아래(`top-full`).
 *
 * 왜: 목록이 항상 아래로만 열리면 뷰포트 하단 근처 트리거에서 마지막 옵션이 잘려 선택 불가(사용자 지적).
 * `absolute` 패널(SelectMenu·ChartOptionsDropdown 등) 공용. fixed 패널은 자체 top 계산 쪽에서 처리.
 *
 * open 시 메뉴 **실측 높이**로 `useLayoutEffect`(페인트 전 결정 → 깜빡임 없음). 닫히면 아래로 리셋.
 */

"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/** 트리거-메뉴 간격 여유(px). */
const GAP = 8;

export function useDropdownFlip(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
): boolean {
  const [dropUp, setDropUp] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      setDropUp(false);
      return;
    }
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = menu.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // 아래가 메뉴보다 부족하고 위가 더 넉넉할 때만 플립(아래가 되면 그대로 아래 = 무회귀).
    setDropUp(spaceBelow < menuHeight + GAP && spaceAbove > spaceBelow);
  }, [open, triggerRef, menuRef]);

  return dropUp;
}
