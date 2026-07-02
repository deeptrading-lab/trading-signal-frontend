/**
 * useIntradayPaperAutoTick — 장중 자동 틱 폴링. intraday-paper-watch.
 *
 * 단타워치가 열려 있는 동안 running cli-agent 세션들에 주기적으로 tick 을 민다.
 * - 60초마다 깨어나 정규장(평일 09:00~15:30 KST)일 때만 발화. 서버가 5분 창당 1틱으로 dedup
 *   하므로(`resolveNextTickWindow`) 여분 호출은 기존 틱을 그대로 돌려받는 무비용 no-op —
 *   클라이언트가 창 경계를 계산할 필요가 없다.
 * - 세션들을 순차 실행(동시 CLI 스폰 폭주 방지). 한 사이클이 인터벌보다 길면 busy 가드가
 *   다음 발화를 건너뛴다(중첩 없음).
 * - crontab(scripts/cron/intraday-tick.sh)과 병행해도 서버 멱등으로 중복 무해.
 * - 페이지를 떠나면(cleanup) 폴링이 멈춘다 — 세션 자체는 서버에 남는다.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { runPaperTradingTick } from "@/lib/api/paperTrading/sessions";
import { queryKeys } from "@/hooks/query/queryKeys";
import { isKstMarketHours } from "@/lib/utils/kstMarketHours";

const POLL_INTERVAL_MS = 60_000;

export function useIntradayPaperAutoTick(sessionIds: string[]): { isTicking: boolean } {
  const queryClient = useQueryClient();
  const busy = useRef(false);
  const [isTicking, setIsTicking] = useState(false);
  // id 배열 자체를 deps 에 넣으면 매 렌더 재구독 — 정렬 문자열 키로 안정화.
  const idsKey = [...sessionIds].sort().join("|");

  useEffect(() => {
    const ids = idsKey ? idsKey.split("|") : [];
    if (ids.length === 0) return;

    const fire = async (): Promise<void> => {
      if (busy.current || !isKstMarketHours()) return;
      busy.current = true;
      setIsTicking(true);
      try {
        for (const id of ids) {
          try {
            const detail = await runPaperTradingTick(id, { triggeredBy: "auto" });
            queryClient.setQueryData(queryKeys.paperTrading.session(id), detail);
          } catch {
            // 개별 세션 실패는 다음 주기에 재시도 — 나머지 세션 진행을 막지 않는다.
          }
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.sessions });
      } finally {
        busy.current = false;
        setIsTicking(false);
      }
    };

    void fire();
    const timer = window.setInterval(() => void fire(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [idsKey, queryClient]);

  return { isTicking };
}
