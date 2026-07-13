import { useQuery } from "@tanstack/react-query";
import { fetchAutopilotRun } from "@/lib/api/paperTrading/autopilot";
import { queryConfig } from "@/lib/query/queryConfig";
import { queryKeys } from "@/hooks/query/queryKeys";

export function useQueryAutopilotRun() {
  return useQuery({
    queryKey: queryKeys.paperTrading.autopilot,
    queryFn: fetchAutopilotRun,
    staleTime: queryConfig.paperTrading.autopilot.staleTime,
    gcTime: queryConfig.paperTrading.autopilot.gcTime,
    // 런이 active 인 동안만 30초 폴링 — 스윕(10분 주기)의 슬롯 변화·로테이션 로그를 따라간다.
    refetchInterval: (query) =>
      query.state.data?.run?.status === "active" ? 30_000 : false,
  });
}
