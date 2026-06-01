/**
 * listbox(자동완성 드롭다운) 키보드 네비게이션 인덱스 상태.
 *
 * SearchPanel(워크벤치)·WatchlistAddModal 이 손수 구현하던 ↑/↓ 포커스 이동 로직을
 * 단일화한다. **분기 없는 인덱스 수학 + count 축소 시 범위 보정만** 담당하고,
 * 열림/ESC/raw-add 같은 컴포넌트별로 갈리는 키 처리는 호출 측에 남긴다(동작 parity 보존).
 *
 * - `wrap: true`  → ↓ 마지막에서 첫, ↑ 첫에서 마지막 (SearchPanel).
 * - `wrap: false` → 양 끝에서 멈춤 clamp (WatchlistAddModal).
 * - 초기 `focusIndex = -1` (옵션 focus 없음). Enter 선택은 호출 측이 `focusIndex >= 0` 가드.
 */

import { useCallback, useEffect, useState } from "react";

export type UseListboxNavResult = {
  /** 현재 포커스된 옵션 인덱스. -1 = 포커스 없음. */
  focusIndex: number;
  /** 직접 지정(마우스 hover 동기화 등). */
  setFocusIndex: (index: number) => void;
  /** 포커스 해제(-1) — 입력 변경·닫힘 시 호출. */
  reset: () => void;
  /** ↓ 한 칸 (wrap 또는 clamp). count 0 이면 무동작. */
  moveDown: () => void;
  /** ↑ 한 칸 (wrap 또는 clamp). count 0 이면 무동작. */
  moveUp: () => void;
};

export function useListboxNav(
  count: number,
  options?: { wrap?: boolean },
): UseListboxNavResult {
  const wrap = options?.wrap ?? false;
  const [focusIndex, setFocusIndex] = useState(-1);

  const reset = useCallback(() => setFocusIndex(-1), []);

  // count 가 줄면 포커스 인덱스가 범위 밖이 될 수 있다 → 마지막으로 당기되 -1(포커스 없음)은 보존.
  useEffect(() => {
    setFocusIndex((i) => (i >= count ? (count === 0 ? -1 : count - 1) : i));
  }, [count]);

  const moveDown = useCallback(() => {
    setFocusIndex((i) =>
      count === 0 ? i : wrap ? (i + 1) % count : Math.min(i + 1, count - 1),
    );
  }, [count, wrap]);

  const moveUp = useCallback(() => {
    setFocusIndex((i) =>
      count === 0 ? i : wrap ? (i <= 0 ? count - 1 : i - 1) : Math.max(i - 1, 0),
    );
  }, [count, wrap]);

  return { focusIndex, setFocusIndex, reset, moveDown, moveUp };
}
