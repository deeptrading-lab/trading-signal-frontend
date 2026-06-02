/**
 * StockSearchContainer — 홈 종목 검색 + 포커스 드롭다운.
 *
 * 기능:
 *   - 키워드 입력 중: 검색 결과 드롭다운 (기존).
 *   - 포커스 + 키워드 없음: 2탭 패널
 *       ① 최근 검색 — localStorage(`finsight:recent-searches`) 최신 5건
 *       ② 관심 종목 — watchlist store 종목명 + `useQueryWatchlist` 등락%
 *   - 종목 선택 시: 최근 검색에 저장 → `/stock/<ticker>` 이동.
 *
 * 컨벤션 (`docs/rules/frontend.md` §1):
 *   - useQuery 직접 import 금지 → 도메인 훅(`useQueryStockSearch`, `useQueryWatchlist`) 경유.
 *   - fetch 직접 호출 금지 → BFF 경유.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, Star } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { useQueryStockSearch } from "@/hooks/stock/useQueryStockSearch";
import { usePrefetchStockDetail } from "@/hooks/stock/usePrefetchStockDetail";
import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";
import { useQueryWatchlist } from "@/hooks/watchlist/useQueryWatchlist";
import { formatPct } from "@/lib/utils/formatPct";
import {
  addRecentSearch,
  readRecentSearches,
} from "@/lib/utils/recentSearch";
import { pickStockName } from "@/lib/utils/resolveStockName";
import { useStockMetaStore } from "@/lib/store/stockMetaStore";
import { cn } from "@/lib/utils/cn";

const PLACEHOLDER = "종목명·코드로 검색… (예: 삼성전자, 005930)";
const SEARCH_ARIA = "종목 검색";

type Tab = "recent" | "watchlist";

export interface StockSearchContainerProps {
  /** 검색 입력 초기값 — 종목 상세 진입 시 현재 종목명을 미리 채운다(드롭다운은 닫힌 채 표시). */
  initialKeyword?: string;
}

export function StockSearchContainer({ initialKeyword = "" }: StockSearchContainerProps = {}) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("recent");
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { prefetch, onIntent, cancelIntent } = usePrefetchStockDetail();

  // 검색 결과 — keyword 있을 때만 활성
  const { data: searchResults, isLoading: searchLoading } = useQueryStockSearch(keyword, {
    enabled: keyword.length > 0,
  });

  // 관심 종목 — 이름은 store, 가격은 배치 쿼리
  const { tickers: watchlistTickers, getName } = useWatchlistTickers();
  const { data: watchlistQuotes } = useQueryWatchlist(watchlistTickers, {
    enabled: open && keyword.length === 0,
  });
  // 종목 메타 스토어 — 이전에 상세에서 본 실종목명을 목록 표시명 후보로 공유(이름 일원화).
  const stockQuotes = useStockMetaStore((s) => s.quotes);

  // 최근 검색 — 드롭다운 열림(키워드 없음) 시 localStorage 에서 직접 계산(파생 state 제거).
  //   매 렌더 읽지만 localStorage 읽기는 저렴하고, 닫혀 있으면 빈 배열이라 SSR/초기 렌더와 일치한다.
  const recentSearches =
    open && keyword.length === 0 ? readRecentSearches() : [];

  // 최근 검색 가격 — 탭 드롭다운 열릴 때 배치 조회
  const recentTickers = recentSearches.map((e) => e.ticker);
  const { data: recentQuotes } = useQueryWatchlist(recentTickers, {
    enabled: open && keyword.length === 0 && recentTickers.length > 0,
  });

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const showSearchResults = open && keyword.length > 0;
  const showTabs = open && keyword.length === 0;
  const showDropdown = showSearchResults || showTabs;

  function handleSelect(ticker: string, name: string) {
    prefetch(ticker); // 확정 의도 — 라우팅 직전 상세 선반입.
    addRecentSearch({ ticker, name });
    setKeyword("");
    setOpen(false);
    router.push(`/stock/${ticker}`);
  }

  // 탭별 항목 조합 (이름 우선순위: store → quote.name → ticker)
  const watchlistItems = watchlistTickers.map((ticker) => {
    const quote = watchlistQuotes?.find((q) => q.ticker === ticker);
    return {
      ticker,
      name:
        pickStockName(ticker, [
          getName(ticker),
          stockQuotes[ticker]?.name,
          quote?.name,
        ]) ?? ticker,
      changePercent: quote?.changePercent,
      direction: quote?.direction,
    };
  });

  const recentItems = recentSearches.map((entry) => {
    const quote = recentQuotes?.find((q) => q.ticker === entry.ticker);
    return {
      ticker: entry.ticker,
      name: entry.name,
      changePercent: quote?.changePercent,
      direction: quote?.direction,
    };
  });

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 공용 검색 입력(`components/ui/SearchInput`) — 관심종목 검색과 동일 비주얼 공유. */}
      <SearchInput
        value={keyword}
        onChange={(e) => {
          setKeyword(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={PLACEHOLDER}
        aria-label={SEARCH_ARIA}
        aria-haspopup="listbox"
      />

      {/* 드롭다운 */}
      {showDropdown && (
        <div className="dropdown-panel absolute left-0 right-0 top-full z-[40] mt-xs overflow-hidden">
          {/* 검색 결과 */}
          {showSearchResults && (
            <div
              className="max-h-[260px] overflow-y-auto scrollbar-hide-mobile"
              role="listbox"
              aria-label="종목 검색 결과"
            >
              {searchLoading && (
                <div className="search-result-item text-text-muted" aria-live="polite">
                  검색 중…
                </div>
              )}
              {!searchLoading &&
                searchResults?.map((item) => (
                  <button
                    key={item.ticker}
                    type="button"
                    className="search-result-item w-full text-left"
                    role="option"
                    aria-selected={false}
                    onClick={() => handleSelect(item.ticker, item.name)}
                    onMouseEnter={() => onIntent(item.ticker)}
                    onMouseLeave={cancelIntent}
                    onFocus={() => onIntent(item.ticker)}
                    onBlur={cancelIntent}
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

          {/* 탭 패널 */}
          {showTabs && (
            <>
              {/* 탭 바 */}
              <div className="flex border-b border-border-line">
                <TabButton
                  active={activeTab === "recent"}
                  onClick={() => setActiveTab("recent")}
                  icon={<Clock className="h-sm w-sm" aria-hidden="true" />}
                  label="최근 검색"
                />
                <TabButton
                  active={activeTab === "watchlist"}
                  onClick={() => setActiveTab("watchlist")}
                  icon={<Star className="h-sm w-sm" aria-hidden="true" />}
                  label="관심 종목"
                />
              </div>

              {/* 탭 내용 */}
              <div
                className="max-h-[260px] overflow-y-auto scrollbar-hide-mobile"
                role="listbox"
                aria-label={activeTab === "recent" ? "최근 검색 종목" : "관심 종목"}
              >
                {activeTab === "recent" &&
                  (recentItems.length === 0 ? (
                    <div className="search-result-item text-text-muted">
                      최근 검색 종목이 없어요
                    </div>
                  ) : (
                    recentItems.map((item) => (
                      <TabResultItem
                        key={item.ticker}
                        ticker={item.ticker}
                        name={item.name}
                        changePercent={item.changePercent}
                        direction={item.direction}
                        onSelect={handleSelect}
                      />
                    ))
                  ))}

                {activeTab === "watchlist" &&
                  (watchlistItems.length === 0 ? (
                    <div className="search-result-item text-text-muted">
                      관심 종목이 없어요
                    </div>
                  ) : (
                    watchlistItems.map((item) => (
                      <TabResultItem
                        key={item.ticker}
                        ticker={item.ticker}
                        name={item.name}
                        changePercent={item.changePercent}
                        direction={item.direction}
                        onSelect={handleSelect}
                      />
                    ))
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── 내부 컴포넌트 ──────────────────────────────────────────

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-xs px-md py-sm text-body-sm-strong transition-colors cursor-pointer",
        active
          ? "border-b-2 border-accent-vivid text-accent-vivid"
          : "text-text-muted hover:text-text-strong",
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

interface TabResultItemProps {
  ticker: string;
  name: string;
  changePercent?: number;
  direction?: "up" | "down" | "flat";
  onSelect: (ticker: string, name: string) => void;
}

function TabResultItem({
  ticker,
  name,
  changePercent,
  direction,
  onSelect,
}: TabResultItemProps) {
  const hasPrice = changePercent !== undefined && direction !== undefined;
  const signalClass =
    hasPrice && direction !== "flat" ? (direction === "up" ? "signal-up-text" : "signal-down-text") : "text-text-muted";

  return (
    <button
      type="button"
      className="search-result-item w-full"
      role="option"
      aria-selected={false}
      onClick={() => onSelect(ticker, name)}
    >
      <div className="flex items-center justify-between w-full gap-sm">
        <div className="flex flex-col min-w-0 text-left">
          <span className="text-body-sm-strong text-text-strong truncate">{name}</span>
          <span className="text-caption text-text-muted">{ticker}</span>
        </div>
        {hasPrice && (
          <span className={cn("text-body-sm-strong tabular-nums shrink-0", signalClass)}>
            {formatPct(changePercent, { sign: true })}
          </span>
        )}
      </div>
    </button>
  );
}
