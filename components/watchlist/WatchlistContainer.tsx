/**
 * WatchlistContainer — `/watchlist` 데이터/상태 경계 (client component).
 *
 * PRD `watchlist-real-data` §3.6 방안 A — page.tsx(server) 아래 단일 client 컨테이너.
 *
 * 책임:
 *   - `useWatchlistTickers()` 로 영구화된 ticker 배열 + 추가/삭제/멤버십 핸들러.
 *   - `useQueryWatchlist(tickers)` 로 시세+메타 실데이터(BFF `/api/watchlist`).
 *   - 로딩 / 에러(한글+재시도) / 빈 상태 / 성공(좌조인=담은 ticker 전부) 분기.
 *   - 상단 인라인 검색(`WatchlistSearch`) — 별 버튼으로 추가/제거(기존 "+ 종목 추가" 모달 대체).
 *     단일 `useWatchlistTickers` 인스턴스를 검색·표가 공유(스토어 desync 방지).
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

import { useCallback } from "react";
import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";
import { useQueryWatchlist } from "@/hooks/watchlist/useQueryWatchlist";
import { useQueryStockWarningsBatch } from "@/hooks/stock/useQueryStockWarningsBatch";
import { useVisibleChartPrefetch } from "@/hooks/stock/useVisibleChartPrefetch";
import { getSymbolName } from "@/lib/api/kis/search";
import { pickStockName } from "@/lib/utils/resolveStockName";
import { useStockMetaStore } from "@/lib/store/stockMetaStore";
import { WatchlistPage } from "./WatchlistPage";
import { WatchlistSearch } from "./WatchlistSearch";
import { WatchlistTable } from "./WatchlistTable";
import {
  WATCHLIST_ERROR_TITLE,
  WATCHLIST_ERROR_HINT,
  WATCHLIST_RETRY,
  WATCHLIST_EMPTY_TITLE,
  WATCHLIST_SEARCH_HINT,
} from "@/lib/copy/watchlist/labels";

export function WatchlistContainer() {
  const { tickers, addTicker, removeTicker, hasTicker, getName } =
    useWatchlistTickers();
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

  // 매수 유의(시장경보·VI) 배치 — 담은 종목 전체를 1회 조회(fail-soft·60s 캐시·키 없으면 빈 맵).
  const warningsQuery = useQueryStockWarningsBatch(tickers);
  const warningsByTicker = warningsQuery.data?.warnings ?? {};

  // tickers 0건 — 시드 전부 삭제 등(§3.9 빈 상태). enabled=false 라 query 는 idle.
  const isEmpty = tickers.length === 0;

  // 관심종목 상위 행의 일봉 차트를 유휴 시점에 배경 선반입 → hover peek 즉시(#266 랭킹 → 관심 확장).
  //   마우스 기기·상위 소수·스태거·세션 dedupe 는 훅 내부 가드. 자주 보는 내 종목이라 체감이 크다.
  useVisibleChartPrefetch(tickers, !isEmpty);
  // 데이터가 아직 없고 fetch 중일 때만 스켈레톤(이전 데이터 있으면 표 유지=placeholderData).
  const showSkeleton = !isEmpty && query.isPending && quotes.length === 0;
  const showError = !isEmpty && query.isError && quotes.length === 0;
  // 상단 새로고침 — 표가 떠 있을 때만(빈/초기 로딩/전체 에러 카드 분기 제외).
  const canRefresh = !isEmpty && !showSkeleton && !showError;

  return (
    <WatchlistPage
      onRefresh={() => query.refetch()}
      isRefreshing={query.isFetching}
      canRefresh={canRefresh}
    >
      {/* 상단 인라인 검색 — 별 버튼으로 추가/제거(여러 개 연속 추가, 바깥 클릭 시에만 닫힘). */}
      <WatchlistSearch
        hasTicker={hasTicker}
        addTicker={addTicker}
        removeTicker={removeTicker}
      />

      {isEmpty ? (
        // 빈 상태 — 카드리스(카드 박스 없이 흰 바탕 + 여백). 첫 진입 프롬프트.
        <div className="flex flex-col items-center gap-xs py-2xl text-center">
          <p className="text-body-strong text-text-strong">
            {WATCHLIST_EMPTY_TITLE}
          </p>
          <p className="text-body-sm text-text-muted">{WATCHLIST_SEARCH_HINT}</p>
        </div>
      ) : showError ? (
        // 전체 에러(보유 데이터 0) — 카드리스 플랫(홈 랭킹 에러 정합). 부분 실패는 행 디그레이드.
        <div className="flex flex-col items-start gap-md py-md" role="alert">
          <div className="flex flex-col gap-xs">
            <p className="text-body-strong text-text-strong">
              {WATCHLIST_ERROR_TITLE}
            </p>
            <p className="text-body-sm text-text-muted">{WATCHLIST_ERROR_HINT}</p>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={() => query.refetch()}
          >
            {WATCHLIST_RETRY}
          </button>
        </div>
      ) : (
        <WatchlistTable
          tickers={tickers}
          quotes={quotes}
          warningsByTicker={warningsByTicker}
          isLoading={showSkeleton}
          skeletonRows={Math.min(tickers.length, 6)}
          getName={resolveName}
          onRemove={removeTicker}
        />
      )}
    </WatchlistPage>
  );
}
