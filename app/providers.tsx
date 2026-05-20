"use client";

/**
 * App Router 의 CSR 경계 — TanStack Query QueryClientProvider 를 주입.
 *
 * App Router 공식 권고에 따라 `QueryClient` 는 컴포넌트 내부 `useState` 로 한 번만 생성한다.
 * (모듈 최상단에서 생성하면 RSC 빌드에서 client/server 인스턴스가 어긋난다.)
 */

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
