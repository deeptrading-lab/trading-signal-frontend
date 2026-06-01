"use client";

/**
 * App Router 의 CSR 경계 — TanStack Query QueryClientProvider 를 주입.
 *
 * App Router 공식 권고에 따라 `QueryClient` 는 컴포넌트 내부 `useState` 로 한 번만 생성한다.
 * (모듈 최상단에서 생성하면 RSC 빌드에서 client/server 인스턴스가 어긋난다.)
 */

import { useState, type ReactNode } from "react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
  type Query,
} from "@tanstack/react-query";
import { useStockMetaStore } from "@/lib/store/stockMetaStore";
import type { StockPrice, WatchlistQuote } from "@/lib/api/kis/types";

/**
 * 쿼리 성공 → 종목 메타 스토어 라우팅 (PRD `stock-meta-store` §4.2).
 *
 * React Query v5 는 `useQuery` 의 onSuccess 가 제거됨 → 전역 `QueryCache.onSuccess` 1곳에서
 * 쿼리 키로 분기해 스토어에 upsert 한다(도메인 훅 무변경). 키 구조는 `hooks/query/queryKeys.ts`:
 *   - `["stock","price",ticker]`  → 단건
 *   - `["watchlist","list",norm]` → 배열
 */
function routeQuoteToStore(data: unknown, query: Query<unknown, unknown>): void {
  const key = query.queryKey as readonly unknown[];
  const upsert = useStockMetaStore.getState().upsertQuotes;
  if (key[0] === "stock" && key[1] === "price") {
    upsert([data as StockPrice]);
  } else if (key[0] === "watchlist" && key[1] === "list") {
    upsert(data as WatchlistQuote[]);
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onSuccess: routeQuoteToStore }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
