/**
 * 종목 검색 패널 — 자동완성 드롭다운.
 *
 * DESIGN.md OPEN QUESTION #1 결정 그대로:
 *   - debounce 250ms (`useTickerSearch` 내부)
 *   - 키보드 ↑↓ + Enter, ESC 로 닫기, 마우스 클릭도 선택
 *   - 결과 1건일 때도 자동 선택 X — 사용자가 확정
 *   - 컨테이너 role="listbox", 항목 role="option" aria-selected
 *   - 입력칸 placeholder: "종목명·티커 입력 (예: AAPL, BTC-USD)"
 *
 * v5 (component-compactness) 추가:
 *   - dropdown-panel 합성 토큰 호출 (이전 인라인 shadow + 보더 제거).
 *   - outside-click 자동 닫힘 — useOutsideClick 훅 (`hooks/utils/`).
 *   - ESC 키 닫힘 (기존 무회귀) + Tab 키 닫힘 (wrapper onBlur relatedTarget 검사).
 *   - search-result-item 컴팩트 (h 34px, body-sm).
 *
 * v6 (polish-followups) 추가 — DESIGN.md v6 R2 (PRD §3.1 A1):
 *   - ARIA 5속성 풀 셋 — role="combobox" + aria-expanded + aria-controls + aria-autocomplete + aria-activedescendant.
 *   - listbox · option role + 안정 id (useId() 기반, `${listId}-option-${i}`).
 *   - 키보드 ↑/↓ wrap-around — 마지막에서 ↓ → 첫, 첫에서 ↑ → 마지막.
 *   - 초기 focusIndex -1 (옵션 focus 없음) → ↓ 첫 옵션, ↑ 마지막 옵션.
 *   - Enter 가드 — focusIndex < 0 시 동작 없음 (의도하지 않은 선택 방지).
 *   - aria-activedescendant 는 dropdown 열림 + focusIndex >= 0 일 때만 옵션 id 가리킴.
 *
 * v7 (design-tone-refinement) 추가 — PRD §3.1 결함 1 fix:
 *   - dropdown anchor 재정합 — 기존 outer wrapper(`relative p-lg`) 의 `top-full` 은
 *     wrapper 의 bottom (label + input + helper + padding) 아래에 떨어져 input 과 시각 분리.
 *     본 v7 는 **input 만 감싸는 inner `position: relative` wrapper** 를 도입하고 dropdown 을
 *     그 자식으로 두어 input 의 `top: 100%` 바로 아래 (mt-xs = 4px 간격) anchor.
 *   - `z-50` 으로 격상 — navbar / sidebar / 결과 카드 위로 떠야 함.
 *   - portal 미사용 (PRD §9.1 PM 권고 옵션 A).
 */

"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";
import { useTickerSearch } from "@/hooks/workbench/useTickerSearch";
import { useOutsideClick } from "@/hooks/utils/useOutsideClick";
import { cn } from "@/lib/utils/cn";

type Props = {
  selectedTicker: WhitelistItem | null;
  onSelect: (item: WhitelistItem | null) => void;
};

export function SearchPanel({ selectedTicker, onSelect }: Props) {
  const [query, setQuery] = useState(selectedTicker?.ticker ?? "");
  const [open, setOpen] = useState(false);
  // v6: 초기 -1 (옵션 focus 없음). ↓ 누르면 0, ↑ 누르면 마지막. DESIGN.md v6 Keyboard 표.
  const [focusIndex, setFocusIndex] = useState(-1);
  const inputId = useId();
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 검색은 사용자가 입력칸을 비웠거나 선택 ticker 와 다른 텍스트를 치는 동안만 활성화.
  const isSearching = open && query.trim() !== "";

  const { results, isPending } = useTickerSearch(query, {
    enabled: isSearching || query.trim() === "",
  });

  useEffect(() => {
    // 결과가 줄어들면 focusIndex 가 범위 밖이 될 수 있다. -1 (focus 없음) 은 보존.
    if (focusIndex >= results.length) {
      setFocusIndex(results.length === 0 ? -1 : results.length - 1);
    }
  }, [results.length, focusIndex]);

  // v5 R3 — dropdown 외부 mousedown / touchstart 자동 닫힘.
  useOutsideClick(wrapperRef, () => setOpen(false), { enabled: open });

  const helper = useMemo(() => {
    if (selectedTicker) return null;
    return "분석할 종목을 먼저 선택해 주세요.";
  }, [selectedTicker]);

  function handleSelect(item: WhitelistItem) {
    onSelect(item);
    setQuery(item.ticker);
    setOpen(false);
    setFocusIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // v6 키보드 navigation — wrap-around (DESIGN.md v6 Keyboard 표).
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      const total = results.length;
      if (total === 0) return;
      setFocusIndex((idx) => (idx + 1) % total);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const total = results.length;
      if (total === 0) return;
      // 초기 -1 또는 0 에서 ↑ → 마지막. 그 외는 한 칸 위로.
      setFocusIndex((idx) => (idx <= 0 ? total - 1 : idx - 1));
      return;
    }
    if (event.key === "Enter") {
      // v6 가드 — focusIndex < 0 (옵션 focus 없음) 시 동작 없음.
      if (open && focusIndex >= 0 && results[focusIndex]) {
        event.preventDefault();
        handleSelect(results[focusIndex]);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setFocusIndex(-1);
      // ESC 후에도 검색 input 에 focus 유지 — v6 Keyboard 표.
      inputRef.current?.focus();
    }
  }

  // v5 R3 — Tab 으로 wrapper 외부로 focus 이동 시 자동 닫힘.
  // wrapper 내부 자식(input → option)으로 이동이면 relatedTarget 이 wrapper 안이라 유지.
  function handleWrapperBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget as Node | null;
    if (next && wrapperRef.current?.contains(next)) return;
    setOpen(false);
  }

  return (
    <div
      ref={wrapperRef}
      onBlur={handleWrapperBlur}
      className="mb-md p-lg bg-surface border border-border-line rounded-sm"
    >
      <label
        htmlFor={inputId}
        className="block mb-sm input-label"
      >
        종목 검색
      </label>
      {/* v7: dropdown anchor 정합 — input 만 감싸는 inner `position: relative` wrapper.
       *   dropdown 은 이 wrapper 의 자식으로 `top-full left-0 right-0` 사용 → input 의 바로 아래에 anchor. */}
      <div className="relative">
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          className="input"
          autoComplete="off"
          placeholder="종목명·티커 입력 (예: AAPL, BTC-USD)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            // v6: 타이핑 시 옵션 focus 없음 상태로 리셋 — Enter 의도하지 않은 선택 방지.
            setFocusIndex(-1);
            if (selectedTicker && e.target.value.trim() !== selectedTicker.ticker) {
              onSelect(null);
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            // v6: dropdown 열림 + focusIndex >= 0 + 해당 옵션 존재 시에만 옵션 id 가리킴.
            // 조건 외에는 attribute 자체 제거 (잘못된 id 참조로 screen reader silence 회피).
            open && focusIndex >= 0 && results[focusIndex]
              ? `${listId}-option-${results[focusIndex].ticker}`
              : undefined
          }
        />
        {open ? (
        <div
          className="dropdown-panel absolute top-full left-0 right-0 z-50 mt-xs max-h-[280px] overflow-y-auto"
          role="listbox"
          id={listId}
        >
          {isPending && results.length === 0 ? (
            <div className="px-md py-dropdown-item-py text-body-sm text-text-muted">검색 중…</div>
          ) : results.length === 0 ? (
            <div className="px-md py-dropdown-item-py text-body-sm text-text-muted">
              일치하는 종목이 없어요. AAPL · BTC-USD 를 검색해 보세요.
            </div>
          ) : (
            results.map((item, index) => {
              const focused = index === focusIndex;
              return (
                <div
                  key={item.ticker}
                  id={`${listId}-option-${item.ticker}`}
                  role="option"
                  aria-selected={focused}
                  className={cn(focused ? "search-result-item-focus" : "search-result-item")}
                  onMouseEnter={() => setFocusIndex(index)}
                  onMouseDown={(e) => {
                    // input blur 직전에 클릭이 동작하도록 mousedown 사용 +
                    // useOutsideClick 의 mousedown 가드와 충돌 방지 (wrapper 내부이므로 통과).
                    e.preventDefault();
                    handleSelect(item);
                  }}
                >
                  <strong
                    className={cn("text-body-sm font-bold", !focused && "text-text-strong")}
                  >
                    {item.ticker} · {item.name}
                  </strong>
                  <span
                    className={cn(
                      "text-caption",
                      focused ? "text-primary" : "text-text-muted",
                    )}
                  >
                    {item.asset_type} · {item.currency}
                    {item.aliases && item.aliases.length > 0
                      ? ` · ${item.aliases.slice(0, 3).join(", ")}`
                      : ""}
                  </span>
                </div>
              );
            })
          )}
        </div>
        ) : null}
      </div>
      {helper ? (
        <p className="mt-sm input-helper">{helper}</p>
      ) : null}
    </div>
  );
}
