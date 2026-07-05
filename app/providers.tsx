"use client";

/**
 * App Router 의 CSR 경계 — TanStack Query QueryClientProvider 를 주입.
 *
 * App Router 공식 권고에 따라 `QueryClient` 는 컴포넌트 내부 `useState` 로 한 번만 생성한다.
 * (모듈 최상단에서 생성하면 RSC 빌드에서 client/server 인스턴스가 어긋난다.)
 */

import { useState, type ReactNode } from "react";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  type Query,
} from "@tanstack/react-query";
import { useStockMetaStore } from "@/lib/store/stockMetaStore";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";
import { toast } from "@/components/ui/toast/toastEmitter";
import { GENERIC_MUTATION_ERROR } from "@/lib/copy/common/toast";
import type { StockPrice, WatchlistQuote } from "@/lib/api/kis/types";

/**
 * 쿼리 성공 → 종목 메타 스토어 라우팅 (PRD `stock-meta-store` §4.2).
 *
 * React Query v5 는 `useQuery` 의 onSuccess 가 제거됨 → 전역 `QueryCache.onSuccess` 1곳에서
 * 쿼리 키로 분기해 스토어에 upsert 한다(도메인 훅 무변경). 키 구조는 `hooks/query/queryKeys.ts`:
 *   - `["stock","price",ticker]`  → 단건
 *   - `["watchlist","list",norm]` → 배열
 */
// 스토어로 라우팅하는 쿼리 키 prefix (`hooks/query/queryKeys.ts` 구조와 정합 — 인라인 매직 스트링 제거).
const KEY_STOCK_PRICE = ["stock", "price"] as const;
const KEY_WATCHLIST_LIST = ["watchlist", "list"] as const;

function routeQuoteToStore(data: unknown, query: Query<unknown, unknown>): void {
  const [root, sub] = query.queryKey as readonly unknown[];
  // getState() 조회는 매칭 분기 안에서만 — 무관 쿼리 성공마다 불필요 조회 회피.
  if (root === KEY_STOCK_PRICE[0] && sub === KEY_STOCK_PRICE[1]) {
    useStockMetaStore.getState().upsertQuotes([data as StockPrice]);
  } else if (root === KEY_WATCHLIST_LIST[0] && sub === KEY_WATCHLIST_LIST[1]) {
    useStockMetaStore.getState().upsertQuotes(data as WatchlistQuote[]);
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onSuccess: routeQuoteToStore }),
        // 전역 mutation 실패 안전망 — 어떤 mutation 이든 에러 시 총칭 토스트 1회.
        // 자체 에러 피드백(인라인/배너/전용 토스트)을 가진 훅은 `meta.skipGlobalErrorToast` 로 opt-out(중복 방지).
        mutationCache: new MutationCache({
          onError: (_error, _variables, _context, mutation) => {
            if (mutation.meta?.skipGlobalErrorToast === true) return;
            toast.error(GENERIC_MUTATION_ERROR);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // ThemeProvider 가 바깥 — 테마 클래스 적용/구독을 Query 트리 전체보다 먼저 마운트.
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
