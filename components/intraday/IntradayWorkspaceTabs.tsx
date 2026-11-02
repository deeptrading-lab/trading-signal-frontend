import { IntradayWatchWorkspace } from "@/components/intraday/IntradayWatchWorkspace";

/** 기존 import 호환. 자동매매는 /program-trading 전용 메뉴에서 제공한다. */
export function IntradayWorkspaceTabs() {
  return <IntradayWatchWorkspace />;
}
