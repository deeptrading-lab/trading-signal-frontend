/**
 * WatchlistAddModal — 관심종목 추가 검색 모달 (client component).
 *
 * PRD `watchlist-real-data` §3.7 — "+ 종목 추가" 클릭 시 오픈. 기존 종목 검색 훅
 * (`useQueryStockSearch`) 재사용 → 결과 선택 시 `onAdd(ticker)`. 이미 담긴 종목은
 * 비활성 + "추가됨" 표시(`hasTicker`).
 *
 * v8 토큰만 사용(§9 q6 디자이너 미합류, 신규 토큰 0):
 *   - 오버레이 `fixed inset-0 bg-text-strong/40` · 패널 `card` · 입력 `input` ·
 *     결과 항목 `search-result-item` · 닫기 `button-icon`.
 *   - ESC / 오버레이 클릭 / 닫기 버튼으로 닫힘.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQueryStockSearch } from "@/hooks/stock/useQueryStockSearch";
import {
  WATCHLIST_MODAL_TITLE,
  WATCHLIST_MODAL_CLOSE,
  WATCHLIST_SEARCH_PLACEHOLDER,
  WATCHLIST_SEARCH_EMPTY,
  WATCHLIST_SEARCH_PENDING,
  WATCHLIST_SEARCH_PROMPT,
  WATCHLIST_SEARCH_ADDED,
} from "@/lib/copy/watchlist/labels";

export interface WatchlistAddModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (ticker: string) => void;
  hasTicker: (ticker: string) => boolean;
}

export function WatchlistAddModal({
  open,
  onClose,
  onAdd,
  hasTicker,
}: WatchlistAddModalProps) {
  const [keyword, setKeyword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = keyword.trim();
  const { data: results = [], isPending } = useQueryStockSearch(trimmed, {
    enabled: open && trimmed.length > 0,
  });

  useEffect(() => {
    if (!open) {
      setKeyword("");
      return;
    }
    // 모달 오픈 시 입력칸 포커스.
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isSearching = trimmed.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-text-strong/40 p-lg"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="card mt-2xl w-full max-w-md flex flex-col gap-md"
        role="dialog"
        aria-modal="true"
        aria-label={WATCHLIST_MODAL_TITLE}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-body-strong text-text-strong">
            {WATCHLIST_MODAL_TITLE}
          </h2>
          <button
            type="button"
            className="button-icon"
            aria-label={WATCHLIST_MODAL_CLOSE}
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          className="input"
          autoComplete="off"
          placeholder={WATCHLIST_SEARCH_PLACEHOLDER}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <div
          className="max-h-[320px] overflow-y-auto"
          role="listbox"
          aria-label={WATCHLIST_MODAL_TITLE}
        >
          {!isSearching ? (
            <p className="px-md py-dropdown-item-py text-body-sm text-text-muted">
              {WATCHLIST_SEARCH_PROMPT}
            </p>
          ) : isPending && results.length === 0 ? (
            <p className="px-md py-dropdown-item-py text-body-sm text-text-muted">
              {WATCHLIST_SEARCH_PENDING}
            </p>
          ) : results.length === 0 ? (
            <p className="px-md py-dropdown-item-py text-body-sm text-text-muted">
              {WATCHLIST_SEARCH_EMPTY}
            </p>
          ) : (
            results.map((item) => {
              const added = hasTicker(item.ticker);
              return (
                <button
                  key={item.ticker}
                  type="button"
                  role="option"
                  aria-selected={added}
                  disabled={added}
                  className={cn(
                    "search-result-item w-full text-left",
                    added && "opacity-[0.65] cursor-not-allowed",
                  )}
                  onClick={() => {
                    if (added) return;
                    onAdd(item.ticker);
                  }}
                >
                  <span>
                    {item.name} · {item.ticker}
                  </span>
                  <span className="search-result-item-meta">
                    {added ? WATCHLIST_SEARCH_ADDED : item.market}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
