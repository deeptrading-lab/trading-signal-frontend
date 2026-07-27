import { useQuery } from "@tanstack/react-query";
import { fetchAutopilotRun } from "@/lib/api/paperTrading/autopilot";
import { queryConfig } from "@/lib/query/queryConfig";
import { queryKeys } from "@/hooks/query/queryKeys";
import { isKstMarketHoursWithCloseGrace } from "@/lib/utils/kstMarketHours";

export function useQueryAutopilotRun() {
  return useQuery({
    queryKey: queryKeys.paperTrading.autopilot,
    queryFn: fetchAutopilotRun,
    staleTime: queryConfig.paperTrading.autopilot.staleTime,
    gcTime: queryConfig.paperTrading.autopilot.gcTime,
    // active+장중에만 30초 폴링 — 15:40부터 서버 호출을 멈춘다.
    refetchInterval: (query) =>
      query.state.data?.run?.status === "active" && isKstMarketHoursWithCloseGrace()
        ? 30_000
        : false,
  });
}
