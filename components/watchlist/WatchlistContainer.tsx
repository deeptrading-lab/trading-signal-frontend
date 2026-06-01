/**
 * WatchlistContainer — `/watchlist` 데이터/상태 경계 (client component).
 *
 * PRD `watchlist-real-data` §3.6 방안 A — page.tsx(server) 아래 단일 client 컨테이너.
 *
 * 책임:
 *   - `useWatchlistTickers()` 로 영구화된 ticker 배열 + 추가/삭제 핸들러.
 *   - `useQueryWatchlist(tickers)` 로 시세+메타 실데이터(BFF `/api/watchlist`).
 *   - 로딩 / 에러(한글+재시도) / 빈 상태(CTA) / 성공(좌조인=담은 ticker 전부) 분기.
 *   - 추가 모달(`WatchlistAddModal`) 오픈 상태 관리.
 *
 * `fix/watchlist-partial-render` — 부분실패 종목 누락 방지:
 *   - 행을 BFF 성공분(`quotes`) 이 아니라 사용자가 담은 `tickers` 기준으로 `WatchlistTable`
 *     에 넘긴다(좌조인). 시세 실패로 drop 된 종목은 표 안에서 디그레이드 행으로 남는다.
 *   - 전체 쿼리 에러(전부 실패=BFF 502, 보유 데이터 0) 만 카드형 ErrorCard 로 분기하고,
 *     일부만 누락된 부분 실패는 행 단위 디그레이드로 처리한다.
 *
 * 커스텀훅만 소비(frontend.md §1) — `useQuery` 직접 import 0.
 */

"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";
import { useQueryWatchlist } from "@/hooks/watchlist/useQueryWatchlist";
import { getSymbolName } from "@/lib/api/kis/search";
import { pickStockName } from "@/lib/utils/resolveStockName";
import { useStockMetaStore } from "@/lib/store/stockMetaStore";
import { WatchlistPage } from "./WatchlistPage";
import { WatchlistTable } from "./WatchlistTable";
import {
  WATCHLIST_ERROR_TITLE,
  WATCHLIST_ERROR_HINT,
  WATCHLIST_RETRY,
  WATCHLIST_EMPTY_TITLE,
  WATCHLIST_EMPTY_HINT,
  WATCHLIST_EMPTY_CTA,
} from "@/lib/copy/watchlist/labels";

/**
 * 추가 모달은 "+ 종목 추가" 클릭 시에만 필요 → `next/dynamic` 지연 로드.
 * `modalOpen` 시에만 렌더해, 첫 오픈 전까지 모달 청크(+`useQueryStockSearch`)를 받지 않는다.
 * 포털/`document` 사용 client 전용이라 `ssr: false`.
 */
const WatchlistAddModal = dynamic(
  () => import("./WatchlistAddModal").then((m) => m.WatchlistAddModal),
  { ssr: false },
);

export function WatchlistContainer() {
  const { tickers, addTicker, removeTicker, hasTicker, getName } =
    useWatchlistTickers();
  const [modalOpen, setModalOpen] = useState(false);
  // 종목 메타 스토어 — 상세에서 본 실종목명을 디그레이드 행 표시명 후보로 공유(이름 일원화).
  const stockQuotes = useStockMetaStore((s) => s.quotes);

  // 디그레이드 행 표시명 — watchlist store(추가 시점) → 메타 스토어(상세에서 본 실명) → 시드 name.
  //   모두 없으면 null(행은 ticker 만 표시).
  const resolveName = useCallback(
    (ticker: string) =>
      pickStockName(ticker, [
        getName(ticker),
        stockQuotes[ticker]?.name,
        getSymbolName(ticker),
      ]),
    [getName, stockQuotes],
  );

  const query = useQueryWatchlist(tickers);
  const quotes = query.data ?? [];

  // tickers 0건 — 시드 전부 삭제 등(§3.9 빈 상태). enabled=false 라 query 는 idle.
  const isEmpty = tickers.length === 0;
  // 데이터가 아직 없고 fetch 중일 때만 스켈레톤(이전 데이터 있으면 표 유지=placeholderData).
  const showSkeleton = !isEmpty && query.isPending && quotes.length === 0;
  const showError = !isEmpty && query.isError && quotes.length === 0;
  // 상단 새로고침 — 표가 떠 있을 때만(빈/초기 로딩/전체 에러 카드 분기 제외).
  const canRefresh = !isEmpty && !showSkeleton && !showError;

  return (
    <>
      <WatchlistPage
        onAdd={() => setModalOpen(true)}
        onRefresh={() => query.refetch()}
        isRefreshing={query.isFetching}
        canRefresh={canRefresh}
      >
        {isEmpty ? (
          <div className="card flex flex-col items-center gap-sm py-2xl text-center">
            <p className="text-body-strong text-text-strong">
              {WATCHLIST_EMPTY_TITLE}
            </p>
            <p className="text-body-sm text-text-muted">
              {WATCHLIST_EMPTY_HINT}
            </p>
            <button
              type="button"
              className="button-primary mt-sm"
              onClick={() => setModalOpen(true)}
            >
              {WATCHLIST_EMPTY_CTA}
            </button>
          </div>
        ) : showError ? (
          <div
            className="card flex flex-col items-center gap-sm py-2xl text-center"
            role="alert"
          >
            <p className="text-body-strong text-text-strong">
              {WATCHLIST_ERROR_TITLE}
            </p>
            <p className="text-body-sm text-text-muted">
              {WATCHLIST_ERROR_HINT}
            </p>
            <button
              type="button"
              className="button-secondary mt-sm"
              onClick={() => query.refetch()}
            >
              {WATCHLIST_RETRY}
            </button>
          </div>
        ) : (
          <WatchlistTable
            tickers={tickers}
            quotes={quotes}
            isLoading={showSkeleton}
            skeletonRows={Math.min(tickers.length, 6)}
            getName={resolveName}
            onRemove={removeTicker}
          />
        )}
      </WatchlistPage>

      {modalOpen && (
        <WatchlistAddModal
          open
          onClose={() => setModalOpen(false)}
          onAdd={(ticker, name) => {
            addTicker(ticker, name);
            setModalOpen(false);
          }}
          hasTicker={hasTicker}
        />
      )}
    </>
  );
}
