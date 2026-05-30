/**
 * StockSearchContainer — 홈 시장 종합 종목 검색 컨테이너.
 *
 * home-market-redesign PR2 신규.
 *
 * 책임:
 *   - 검색어 상태(useState) 보유.
 *   - `useQueryStockSearch` 도메인 훅으로 `/api/stock/search?keyword=<q>` 호출.
 *   - 결과 드롭다운 렌더 — 클릭 시 `/profile/<ticker>` 로 이동.
 *   - 검색어 없으면 드롭다운 미표시.
 *
 * 컨벤션 (`docs/rules/frontend.md` §1):
 *   - useQuery 직접 import 금지 → `useQueryStockSearch` 도메인 훅만 소비.
 *   - fetch 직접 호출 금지 → 훅 경유 BFF 호출만.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useQueryStockSearch } from "@/hooks/stock/useQueryStockSearch";
import { cn } from "@/lib/utils/cn";

const PLACEHOLDER = "종목명·코드로 검색… (예: 삼성전자, 005930)";
const SEARCH_ARIA = "종목 검색";
const RESULT_ARIA = "종목 검색 결과";

export function StockSearchContainer() {
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: results, isLoading } = useQueryStockSearch(keyword, {
    enabled: keyword.length > 0,
  });

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const showDropdown = open && keyword.length > 0 && (isLoading || (results && results.length > 0));

  function handleSelect(ticker: string) {
    setKeyword("");
    setOpen(false);
    router.push(`/profile/${ticker}`);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 검색 입력 */}
      <div className="relative">
        <span
          className="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-text-muted"
          aria-hidden="true"
        >
          <Search className="h-md w-md" />
        </span>
        <input
          type="text"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setOpen(true);
          }}
          onFocus={() => keyword.length > 0 && setOpen(true)}
          className="input pl-2xl"
          placeholder={PLACEHOLDER}
          aria-label={SEARCH_ARIA}
          aria-haspopup="listbox"
          autoComplete="off"
        />
      </div>

      {/* 검색 결과 드롭다운 */}
      {showDropdown && (
        <div
          className={cn(
            "dropdown-panel absolute left-0 right-0 top-full z-[40] mt-xs",
            "max-h-[260px] overflow-y-auto",
          )}
          role="listbox"
          aria-label={RESULT_ARIA}
        >
          {isLoading && (
            <div className="search-result-item text-text-muted" aria-live="polite">
              검색 중…
            </div>
          )}
          {!isLoading && results && results.map((item) => (
            <button
              key={item.ticker}
              type="button"
              className="search-result-item w-full text-left"
              role="option"
              aria-selected={false}
              onClick={() => handleSelect(item.ticker)}
            >
              <span className="text-body-sm-strong text-text-strong">
                {item.name}
              </span>
              <span className="search-result-item-meta">
                {item.ticker} · {item.market}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
