/**
 * useIntradayPaperRefresh — 워치 화면 데이터 갱신 폴링. intraday-paper-watch.
 *
 * 틱 발화는 서버 스케줄러(`lib/server/paperTrading/tickScheduler`)가 전담한다 — 이 훅은
 * 화면이 열려 있는 동안 **조회만** 주기적으로 무효화해 표·시트가 서버 판단 결과를 따라오게
 * 한다(POST 없음). 장중+마감 유예에만 동작, 30초 주기.
 */

"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query/queryKeys";
import { isKstMarketHoursWithCloseGrace } from "@/lib/utils/kstMarketHours";

const REFRESH_MS = 30_000;

export function useIntradayPaperRefresh(sessionIds: string[]): void {
  const queryClient = useQueryClient();
  const idsKey = [...sessionIds].sort().join("|");

  useEffect(() => {
    const ids = idsKey ? idsKey.split("|") : [];
    if (ids.length === 0) return;

    const refresh = () => {
      if (!isKstMarketHoursWithCloseGrace()) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.sessions });
      for (const id of ids) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.session(id) });
      }
    };

    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [idsKey, queryClient]);
}
