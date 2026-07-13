"use client";

/**
 * StockSearchPicker — 공용 종목 검색 피커 (SearchInput + 결과 드롭다운 + onSelect).
 *
 * 홈(`StockSearchContainer`)이 소유하던 "검색 → 결과 드롭다운 → 선택" 로직 중 **선택 콜백만 다른**
 * 부분을 추출한 재사용 컴포넌트. 페이지마다 드롭다운/디바운스/바깥클릭을 재구현하지 않는다
 * (단타워치·AI 모의투자 생성 폼 등 "종목을 골라 목록에 추가"하는 화면 공용).
 * 홈 검색은 최근검색·관심종목 탭이 더 있어 기존 컨테이너를 유지한다.
 *
 * 데이터는 `useQueryStockSearch`(BFF `/api/stock/search` — 시드는 서버 전용, 클라 번들 0).
 */

import { useEffect, useRef, useState } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { useQueryStockSearch } from "@/hooks/stock/useQueryStockSearch";
import type { StockSearchResult } from "@/lib/api/kis/types";

const DEBOUNCE_MS = 180;

export interface StockSearchPickerProps {
  /** 결과 선택 콜백 — 선택 후 입력은 비워지고 드롭다운이 닫힌다. */
  onSelect: (stock: StockSearchResult) => void;
  placeholder?: string;
  /** 접근성 라벨 — 미지정 시 placeholder. */
  ariaLabel?: string;
}

export function StockSearchPicker({ onSelect, placeholder, ariaLabel }: StockSearchPickerProps) {
  const [keyword, setKeyword] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results = [], isPending } = useQueryStockSearch(debounced, {
    enabled: debounced.length > 0,
  });

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(keyword.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [keyword]);

  // 바깥 클릭 시 닫기.
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const showDropdown = open && debounced.length > 0;

  function handleSelect(item: StockSearchResult) {
    onSelect(item);
    setKeyword("");
    setDebounced("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <SearchInput
        value={keyword}
        onChange={(e) => {
          setKeyword(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        aria-haspopup="listbox"
      />

      {showDropdown && (
        <div className="dropdown-panel absolute left-0 right-0 top-full z-[40] mt-xs overflow-hidden">
          <div
            className="max-h-[260px] overflow-y-auto scrollbar-hide-mobile"
            role="listbox"
            aria-label="종목 검색 결과"
          >
            {isPending && results.length === 0 ? (
              <div className="search-result-item text-text-muted" aria-live="polite">
                검색 중…
              </div>
            ) : results.length === 0 ? (
              <div className="search-result-item text-text-muted">검색 결과가 없어요.</div>
            ) : (
              results.map((item) => (
                <button
                  key={item.ticker}
                  type="button"
                  className="search-result-item w-full text-left"
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelect(item)}
                >
                  <span className="text-body-sm-strong text-text-strong">{item.name}</span>
                  <span className="search-result-item-meta">
                    {item.ticker} · {item.market}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
