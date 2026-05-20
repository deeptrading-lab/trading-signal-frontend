/**
 * 종목 검색 패널 — 자동완성 드롭다운.
 *
 * DESIGN.md OPEN QUESTION #1 결정 그대로:
 *   - debounce 250ms (`useTickerSearch` 내부)
 *   - 키보드 ↑↓ + Enter, ESC 로 닫기, 마우스 클릭도 선택
 *   - 결과 1건일 때도 자동 선택 X — 사용자가 확정
 *   - 컨테이너 role="listbox", 항목 role="option" aria-selected
 *   - 입력칸 placeholder: "종목명·티커 입력 (예: AAPL, BTC-USD)"
 */

"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";
import { useTickerSearch } from "@/hooks/workbench/useTickerSearch";
import { cn } from "@/lib/utils/cn";

type Props = {
  selectedTicker: WhitelistItem | null;
  onSelect: (item: WhitelistItem | null) => void;
};

export function SearchPanel({ selectedTicker, onSelect }: Props) {
  const [query, setQuery] = useState(selectedTicker?.ticker ?? "");
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // 검색은 사용자가 입력칸을 비웠거나 선택 ticker 와 다른 텍스트를 치는 동안만 활성화.
  const isSearching = open && query.trim() !== "";

  const { results, isPending } = useTickerSearch(query, {
    enabled: isSearching || query.trim() === "",
  });

  useEffect(() => {
    if (focusIndex >= results.length) {
      setFocusIndex(Math.max(0, results.length - 1));
    }
  }, [results.length, focusIndex]);

  const helper = useMemo(() => {
    if (selectedTicker) return null;
    return "분석할 종목을 먼저 선택해 주세요.";
  }, [selectedTicker]);

  function handleSelect(item: WhitelistItem) {
    onSelect(item);
    setQuery(item.ticker);
    setOpen(false);
    setFocusIndex(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      setFocusIndex((idx) => Math.min(idx + 1, Math.max(0, results.length - 1)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusIndex((idx) => Math.max(0, idx - 1));
      return;
    }
    if (event.key === "Enter") {
      if (open && results[focusIndex]) {
        event.preventDefault();
        handleSelect(results[focusIndex]);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative mb-md p-lg bg-panel border border-line rounded-sm">
      <label
        htmlFor={inputId}
        className="block mb-sm text-caption text-secondary"
      >
        종목 검색
      </label>
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
          setFocusIndex(0);
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
          open && results[focusIndex]
            ? `${listId}-option-${results[focusIndex].ticker}`
            : undefined
        }
      />
      {helper ? (
        <p className="mt-sm text-caption text-secondary">{helper}</p>
      ) : null}
      {open ? (
        <div
          className="absolute top-full left-lg right-lg z-[5] mt-xs p-xs bg-panel border border-line rounded-sm max-h-[280px] overflow-y-auto shadow-[0_10px_28px_rgba(23,32,42,0.08)]"
          role="listbox"
          id={listId}
        >
          {isPending && results.length === 0 ? (
            <div className="p-[12px] text-body-sm text-secondary">검색 중…</div>
          ) : results.length === 0 ? (
            <div className="p-[12px] text-body-sm text-secondary">
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
                    // input blur 직전에 클릭이 동작하도록 mousedown 사용.
                    e.preventDefault();
                    handleSelect(item);
                  }}
                >
                  <strong
                    className={cn("text-body-md font-bold", !focused && "text-primary")}
                  >
                    {item.ticker} · {item.name}
                  </strong>
                  <span
                    className={cn(
                      "text-body-sm",
                      focused ? "text-tertiary" : "text-secondary",
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
  );
}
