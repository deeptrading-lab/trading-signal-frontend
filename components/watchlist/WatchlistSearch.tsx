"use client";

/**
 * WatchlistSearch — `/watchlist` 상단 인라인 종목 검색 + 별 추가/제거 (client component).
 *
 * 기존 "+ 종목 추가" 모달을 대체. 홈/종목분석처럼 입력 → 하위 드롭다운에 결과가 뜨고, 각 행 오른쪽
 * 별 버튼(`WatchlistStarButton`)으로 추가/제거한다. 이미 추가된 종목은 채운 별로 렌더.
 *
 * 핵심 UX(요구사항):
 *   - **여러 개 연속 추가** — 별을 눌러도 드롭다운이 닫히지 않는다. 별/행은 컨테이너 내부라
 *     바깥 클릭(mousedown) 닫힘 대상이 아니다.
 *   - **바깥 클릭으로만 닫힘** — 컨테이너 밖 mousedown 시에만 닫는다(홈 검색 패턴).
 *   - 행(별 제외)은 비클릭(정보 표시 전용) — 별이 유일한 액션.
 *
 * 검색은 홈과 동일한 `useQueryStockSearch`(클라이언트 lazy symbols) 재사용 + 6자리 코드 직접 추가.
 * 추가/제거/멤버십은 상위(`WatchlistContainer`)의 단일 `useWatchlistTickers` 인스턴스를 props 로 받아
 * 표/검색이 같은 상태를 공유(스토어 이중화 desync 방지).
 */

import { useEffect, useRef, useState } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { useQueryStockSearch } from "@/hooks/stock/useQueryStockSearch";
import { WatchlistStarButton } from "./WatchlistStarButton";
import {
  WATCHLIST_SEARCH_PLACEHOLDER,
  WATCHLIST_SEARCH_EMPTY,
  WATCHLIST_SEARCH_PENDING,
  WATCHLIST_SEARCH_ADD_RAW,
  WATCHLIST_SEARCH_RAW_META,
  WATCHLIST_MODAL_TITLE,
} from "@/lib/copy/watchlist/labels";

const DEBOUNCE_MS = 200;

export interface WatchlistSearchProps {
  hasTicker: (ticker: string) => boolean;
  addTicker: (ticker: string, name?: string) => void;
  removeTicker: (ticker: string) => void;
}

export function WatchlistSearch({
  hasTicker,
  addTicker,
  removeTicker,
}: WatchlistSearchProps) {
  const [keyword, setKeyword] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 입력 디바운스 — value 는 즉시, 쿼리는 debounced.
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(keyword.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [keyword]);

  const trimmed = debounced;
  const { data: results = [], isPending } = useQueryStockSearch(trimmed, {
    enabled: open && trimmed.length > 0,
  });

  // 6자리 ticker 직접 추가(시드 미수록 보완).
  const isRawTicker = /^\d{6}$/.test(trimmed);
  const showRawAdd = isRawTicker && results.length === 0 && !isPending;
  const isSearching = trimmed.length > 0;
  const showDropdown = open && isSearching;

  // 바깥 클릭으로만 닫힘 — 컨테이너(입력+드롭다운) 밖 mousedown 시에만. 별/행 클릭은 안 닫음.
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function toggle(ticker: string, name?: string) {
    if (hasTicker(ticker)) removeTicker(ticker);
    else addTicker(ticker, name);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 공용 검색 입력(홈/종목분석과 동일 비주얼) — 상태·드롭다운은 본 컴포넌트 소유. */}
      <SearchInput
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="watchlist-search-results"
        aria-label={WATCHLIST_MODAL_TITLE}
        placeholder={WATCHLIST_SEARCH_PLACEHOLDER}
        value={keyword}
        onChange={(e) => {
          setKeyword(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />

      {showDropdown ? (
        <div
          id="watchlist-search-results"
          className="dropdown-panel absolute left-0 right-0 z-30 mt-xs flex max-h-[360px] flex-col gap-[2px] overflow-y-auto"
          role="listbox"
          aria-label={WATCHLIST_MODAL_TITLE}
        >
          {isPending && results.length === 0 ? (
            <p className="px-md py-dropdown-item-py text-body-sm text-text-muted">
              {WATCHLIST_SEARCH_PENDING}
            </p>
          ) : results.length === 0 ? (
            showRawAdd ? (
              <ResultRow
                name={WATCHLIST_SEARCH_ADD_RAW(trimmed)}
                meta={WATCHLIST_SEARCH_RAW_META}
                added={hasTicker(trimmed)}
                onToggle={() => toggle(trimmed)}
              />
            ) : (
              <p className="px-md py-dropdown-item-py text-body-sm text-text-muted">
                {WATCHLIST_SEARCH_EMPTY}
              </p>
            )
          ) : (
            results.map((item) => (
              <ResultRow
                key={item.ticker}
                name={item.name}
                meta={`${item.ticker} · ${item.market}`}
                added={hasTicker(item.ticker)}
                onToggle={() => toggle(item.ticker, item.name)}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/** 결과 행 — 좌: 종목명+메타(정보, 비클릭) / 우: 별 토글 버튼. */
function ResultRow({
  name,
  meta,
  added,
  onToggle,
}: {
  name: string;
  meta: string;
  added: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      role="option"
      aria-selected={added}
      className="flex min-h-dropdown-item-h items-center justify-between gap-md rounded-sm px-md py-dropdown-item-py text-text-strong"
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body-sm-strong text-text-strong">
          {name}
        </span>
        <span className="search-result-item-meta">{meta}</span>
      </span>
      <WatchlistStarButton added={added} onToggle={onToggle} />
    </div>
  );
}
