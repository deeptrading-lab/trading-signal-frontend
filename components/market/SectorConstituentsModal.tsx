/**
 * SectorConstituentsModal — 업종 구성종목(대표/급등) 모달/바텀시트.
 *
 * PRD `trending-sectors` §3-7 / DESIGN "구성종목 모달". 업종 랭킹 행 클릭 시 열린다. 데스크탑=중앙
 * 다이얼로그, 모바일=하단 바텀시트(`useBreakpoint`). 기존 시트 관례(`StockPeekSheet`) 답습 — 포털 +
 * backdrop + Escape 닫기 + 배경 스크롤 잠금.
 *
 * 골격: [히어로(업종명·등락률·대표 종목 수)] → [세그먼트: 수익률/시가총액] → [구성종목 리스트].
 *   - 정렬은 클라이언트 재정렬(추가 fetch 없음): 수익률=등락률 desc, 시가총액=marketCap desc(null 후순위).
 *   - 각 행: 종목명 · 미니차트(`MiniStockChart`) · 현재가 · 등락. 클릭 → `/stock/[ticker]`.
 *   - 상태: 로딩 스켈레톤 / 빈 구성종목 / 전체 실패(`MaintenanceNotice`).
 *
 * 컨벤션: useQuery 직접 import 금지 → 도메인 훅만 소비. 색·간격 토큰만(hex/px 직타 0), 코드 미표시.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { MiniStockChart } from "@/components/stock/MiniStockChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { MaintenanceNotice } from "@/components/market/MaintenanceNotice";
import { useQuerySectorConstituents } from "@/hooks/market/useQuerySectorConstituents";
import { useMe } from "@/hooks/auth/useMe";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import { resolveAvailability } from "@/lib/market/availability";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { stockDetailPath } from "@/lib/utils/stockDetailPath";
import type {
  SectorConstituent,
  SectorConstituentSort,
  SectorRankItem,
} from "@/lib/types/market/sectors";
import {
  SECTORS_MODAL_CLOSE,
  SECTORS_MODAL_EMPTY,
  SECTORS_MODAL_LOADING,
  SECTORS_SORT_ARIA,
  SECTORS_SORT_MARKETCAP,
  SECTORS_SORT_RETURN,
  sectorsConstituentCount,
  constituentRowAria,
} from "@/lib/copy/market/sectors";

export interface SectorConstituentsModalProps {
  sector: SectorRankItem;
  onClose: () => void;
}

/** 등락 방향 → 등락률 색 합성 클래스. */
function changeClass(direction: SectorConstituent["direction"]): string {
  if (direction === "up") return "signal-up-text";
  if (direction === "down") return "signal-down-text";
  return "text-text-muted text-mono-numeric tabular-nums";
}

/** 정렬 재배열(순수) — 수익률=등락률 desc / 시가총액=marketCap desc(null 후순위). */
function sortConstituents(
  rows: SectorConstituent[],
  sort: SectorConstituentSort,
): SectorConstituent[] {
  const copy = [...rows];
  if (sort === "marketCap") {
    return copy.sort((a, b) => {
      if (a.marketCap === null && b.marketCap === null) return 0;
      if (a.marketCap === null) return 1; // null 후순위.
      if (b.marketCap === null) return -1;
      return b.marketCap - a.marketCap;
    });
  }
  return copy.sort((a, b) => b.changePct - a.changePct);
}

export function SectorConstituentsModal({
  sector,
  onClose,
}: SectorConstituentsModalProps) {
  const { isMobile } = useBreakpoint();
  const router = useRouter();
  const { isAdmin } = useMe();
  const [sort, setSort] = useState<SectorConstituentSort>("return");

  const query = useQuerySectorConstituents(sector.code, { enabled: true });

  // Escape 닫기 + 배경 스크롤 잠금(기존 시트 동일).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const availability = resolveAvailability({
    isLoading: query.isLoading,
    isError: query.isError,
    dataSource: query.dataSource,
  });

  const sorted = useMemo(
    () => sortConstituents(query.data?.constituents ?? [], sort),
    [query.data?.constituents, sort],
  );

  const goDetail = (ticker: string, name: string) => {
    onClose();
    router.push(stockDetailPath(ticker, name));
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-center",
        isMobile ? "items-end" : "items-center p-lg",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={sector.name}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className={cn(
          "relative flex max-h-[85vh] w-full flex-col bg-surface shadow-overlay",
          isMobile
            ? "rounded-t-xl pb-[env(safe-area-inset-bottom)]"
            : "w-[34rem] max-w-full rounded-xl",
        )}
      >
        {/* 헤더 — 닫기 */}
        <div className="flex items-start justify-between gap-md px-card-px pt-card-px">
          <div className="min-w-0">
            <div className="flex items-center gap-sm">
              <span className="truncate text-h2 text-text-strong">
                {sector.name}
              </span>
              <span
                className={cn("text-mono-numeric", changeClass(sector.direction))}
              >
                {formatPct(sector.changePct, { sign: true })}
              </span>
            </div>
            {sorted.length > 0 && (
              <p className="mt-xs text-caption text-text-muted">
                {sectorsConstituentCount(sorted.length)}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label={SECTORS_MODAL_CLOSE}
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text-strong"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* 세그먼트 — 수익률 / 시가총액 */}
        <div className="px-card-px pt-md">
          <div
            role="tablist"
            aria-label={SECTORS_SORT_ARIA}
            className="inline-flex items-center gap-xs rounded-sm bg-surface-muted p-xs"
          >
            <SortTab
              label={SECTORS_SORT_RETURN}
              active={sort === "return"}
              onClick={() => setSort("return")}
            />
            <SortTab
              label={SECTORS_SORT_MARKETCAP}
              active={sort === "marketCap"}
              onClick={() => setSort("marketCap")}
            />
          </div>
        </div>

        {/* 본문 — 구성종목 리스트(스크롤) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-card-px py-md">
          {availability === "loading" && <ConstituentSkeleton />}

          {availability === "unavailable" && (
            <MaintenanceNotice
              isAdmin={isAdmin}
              onRetry={() => query.refetch()}
            />
          )}

          {availability === "available" && sorted.length === 0 && (
            <p className="py-lg text-center text-body-sm text-text-muted">
              {SECTORS_MODAL_EMPTY}
            </p>
          )}

          {availability === "available" && sorted.length > 0 && (
            <div role="list" className="flex flex-col">
              {sorted.map((c) => (
                <ConstituentRow
                  key={c.ticker}
                  constituent={c}
                  onClick={() => goDetail(c.ticker, c.name)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 정렬 세그먼트 탭 — 활성=accent-soft+primary, 비활성=text-muted. */
function SortTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "h-button-sm-h cursor-pointer rounded-sm px-md text-button-sm transition-colors",
        active
          ? "bg-accent-soft text-primary"
          : "text-text-muted hover:text-text-strong",
      )}
    >
      {label}
    </button>
  );
}

/** 구성종목 1행 — 종목명 · 미니차트 · 현재가 · 등락. 클릭 → 종목 상세. */
function ConstituentRow({
  constituent,
  onClick,
}: {
  constituent: SectorConstituent;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="listitem"
      aria-label={constituentRowAria(constituent.name)}
      onClick={onClick}
      className={cn(
        "flex h-table-row-h items-center gap-md rounded-md px-sm",
        "cursor-pointer text-left transition-colors hover:bg-surface-muted",
        "focus-visible:bg-surface-muted focus-visible:outline-none",
      )}
    >
      <span className="min-w-0 flex-1 truncate text-body-sm text-text-strong">
        {constituent.name}
      </span>
      <span className="hidden h-8 w-20 shrink-0 sm:block" aria-hidden="true">
        <MiniStockChart ticker={constituent.ticker} days={60} height={32} />
      </span>
      <span className="w-20 shrink-0 text-right text-mono-numeric text-text-strong">
        {formatNumber(constituent.price)}
      </span>
      <span
        className={cn(
          "w-16 shrink-0 text-right text-mono-numeric",
          changeClass(constituent.direction),
        )}
      >
        {formatPct(constituent.changePct, { sign: true })}
      </span>
    </button>
  );
}

/** 로딩 — 구성종목 스켈레톤 행. */
function ConstituentSkeleton() {
  return (
    <div aria-busy="true" aria-label={SECTORS_MODAL_LOADING}>
      <span className="sr-only">{SECTORS_MODAL_LOADING}</span>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex h-table-row-h items-center gap-md px-sm">
          <Skeleton variant="line" className="mb-0 h-4 w-1/3" />
          <Skeleton variant="line" className="mb-0 ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
