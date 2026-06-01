/**
 * WatchlistAddModal — 관심종목 추가 검색 모달 (client component).
 *
 * PRD `watchlist-real-data` §3.7 — "+ 종목 추가" 클릭 시 오픈. 기존 종목 검색 훅
 * (`useQueryStockSearch`) 재사용 → 결과 선택 시 `onAdd(ticker, name)`. 이미 담긴 종목은
 * 비활성 + "추가됨" 표시(`hasTicker`).
 *
 * UI 점검(2026-05-30) 반영:
 *   - a11y(#1): 포털(body 직속) 마운트 + focus trap(Tab 순환) · 닫을 때 트리거 복귀 포커스 ·
 *     오픈 시 배경(body 의 나머지 직속 노드) aria-hidden inert.
 *   - 검색모달(#3): 6자리 ticker 직접 추가 경로(시드 미수록 보완) + 빈결과 카피 보강.
 *   - 검색모달(#4): 입력 디바운스 200ms — 마스터 API 교체 대비.
 *   - 검색모달(#7): listbox ↑/↓/Enter 키보드 내비(`search-result-item-focus` 토큰 강조).
 *
 * v8 토큰만 사용(§9 q6 디자이너 미합류, 신규 토큰 0):
 *   - 오버레이 `fixed inset-0 bg-text-strong/40` · 패널 `card` · 입력 `input` ·
 *     결과 항목 `search-result-item(-focus)` · 닫기 `button-icon`.
 *   - ESC / 오버레이 클릭 / 닫기 버튼으로 닫힘.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQueryStockSearch } from "@/hooks/stock/useQueryStockSearch";
import { useListboxNav } from "@/hooks/utils/useListboxNav";
import {
  WATCHLIST_MODAL_TITLE,
  WATCHLIST_MODAL_CLOSE,
  WATCHLIST_SEARCH_PLACEHOLDER,
  WATCHLIST_SEARCH_EMPTY,
  WATCHLIST_SEARCH_PENDING,
  WATCHLIST_SEARCH_PROMPT,
  WATCHLIST_SEARCH_ADDED,
  WATCHLIST_SEARCH_ADD_RAW,
  WATCHLIST_SEARCH_RAW_META,
} from "@/lib/copy/watchlist/labels";

export interface WatchlistAddModalProps {
  open: boolean;
  onClose: () => void;
  /** 선택/직접 추가 — name 은 추가 시점 종목명(디그레이드 행 식별용). 직접 추가 시 미동봉. */
  onAdd: (ticker: string, name?: string) => void;
  hasTicker: (ticker: string) => boolean;
}

const DEBOUNCE_MS = 200;

export function WatchlistAddModal({
  open,
  onClose,
  onAdd,
  hasTicker,
}: WatchlistAddModalProps) {
  const [keyword, setKeyword] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // 포털 컨테이너(body 직속) — 배경 inert 가 모달 자신을 가리지 않도록 트리 밖으로 분리.
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    setPortalEl(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  // 입력 디바운스(#4) — 입력칸 value 는 즉시(keyword), 쿼리는 debounced.
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(keyword.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [keyword]);

  const trimmed = debounced;
  const { data: results = [], isPending } = useQueryStockSearch(trimmed, {
    enabled: open && trimmed.length > 0,
  });

  // 6자리 ticker 직접 추가 경로(#3) — 시드 미수록이어도 추가 허용.
  const isRawTicker = /^\d{6}$/.test(trimmed);
  const showRawAdd = isRawTicker && results.length === 0 && !isPending;

  const isSearching = trimmed.length > 0;

  // 선택 가능한(미추가) 검색 결과만 키보드 내비 대상.
  const navItems = useMemo(
    () => results.filter((item) => !hasTicker(item.ticker)),
    [results, hasTicker],
  );

  // ↑/↓ 포커스(#7) — clamp(wrap 없음). 인덱스 수학·범위 보정은 useListboxNav.
  const {
    focusIndex: activeIdx,
    reset: resetActive,
    moveDown,
    moveUp,
  } = useListboxNav(navItems.length, { wrap: false });

  useEffect(() => {
    if (!open) {
      setKeyword("");
      setDebounced("");
      resetActive();
      return;
    }
    // 모달 오픈 시 입력칸 포커스.
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open, resetActive]);

  // 결과/입력 변경 시 활성 항목 리셋(#7).
  useEffect(() => {
    resetActive();
  }, [trimmed, resetActive]);

  // 닫을 때 트리거(직전 활성 요소)로 포커스 복귀(#1).
  useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement as HTMLElement | null;
    return () => prevActive?.focus();
  }, [open]);

  // 배경 inert(#1) — 모달은 포털(body 직속 컨테이너)로 분리돼 있어, 포털 컨테이너를 제외한
  // body 직속 노드(앱 셸)에만 aria-hidden 을 걸면 모달 자신은 가려지지 않는다.
  useEffect(() => {
    if (!open || !portalEl) return;
    const hidden: HTMLElement[] = [];
    for (const node of Array.from(document.body.children)) {
      if (node instanceof HTMLElement && node !== portalEl) {
        if (node.getAttribute("aria-hidden") === "true") continue;
        node.setAttribute("aria-hidden", "true");
        hidden.push(node);
      }
    }
    return () => {
      for (const node of hidden) node.removeAttribute("aria-hidden");
    };
  }, [open, portalEl]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !portalEl) return null;

  function handleAddRaw() {
    if (hasTicker(trimmed)) return;
    onAdd(trimmed);
  }

  // focus trap — 패널 안에서 Tab 순환(#1).
  function onPanelKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // 입력칸 ↑/↓/Enter — listbox 내비(#7).
  function onInputKeyDown(e: React.KeyboardEvent) {
    if (showRawAdd && e.key === "Enter") {
      e.preventDefault();
      handleAddRaw();
      return;
    }
    if (navItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveDown();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveUp();
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      const item = navItems[activeIdx];
      if (item) onAdd(item.ticker, item.name);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-text-strong/40 p-lg"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="card mt-2xl w-full max-w-md flex flex-col gap-md"
        role="dialog"
        aria-modal="true"
        aria-label={WATCHLIST_MODAL_TITLE}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onPanelKeyDown}
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
          role="combobox"
          aria-expanded={isSearching}
          aria-controls="watchlist-search-results"
          aria-activedescendant={
            activeIdx >= 0 && navItems[activeIdx]
              ? `watchlist-opt-${navItems[activeIdx].ticker}`
              : undefined
          }
          placeholder={WATCHLIST_SEARCH_PLACEHOLDER}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={onInputKeyDown}
        />

        <div
          id="watchlist-search-results"
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
            showRawAdd ? (
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="search-result-item w-full text-left"
                onClick={handleAddRaw}
              >
                <span>{WATCHLIST_SEARCH_ADD_RAW(trimmed)}</span>
                <span className="search-result-item-meta">
                  {WATCHLIST_SEARCH_RAW_META}
                </span>
              </button>
            ) : (
              <p className="px-md py-dropdown-item-py text-body-sm text-text-muted">
                {WATCHLIST_SEARCH_EMPTY}
              </p>
            )
          ) : (
            results.map((item) => {
              const added = hasTicker(item.ticker);
              const navPos = navItems.findIndex(
                (n) => n.ticker === item.ticker,
              );
              const isActive = !added && navPos === activeIdx;
              return (
                <button
                  key={item.ticker}
                  id={`watchlist-opt-${item.ticker}`}
                  type="button"
                  role="option"
                  aria-selected={added || isActive}
                  disabled={added}
                  className={cn(
                    "w-full text-left",
                    isActive ? "search-result-item-focus" : "search-result-item",
                    added && "opacity-[0.65] cursor-not-allowed",
                  )}
                  onClick={() => {
                    if (added) return;
                    onAdd(item.ticker, item.name);
                  }}
                >
                  <span>
                    {item.name} · {item.ticker}
                  </span>
                  <span
                    className={cn(
                      isActive
                        ? "search-result-item-focus-meta"
                        : "search-result-item-meta",
                    )}
                  >
                    {added ? WATCHLIST_SEARCH_ADDED : item.market}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    portalEl,
  );
}
