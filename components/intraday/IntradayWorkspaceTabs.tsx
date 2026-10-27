"use client";

import { useRef, useState } from "react";
import { IntradayWatchWorkspace } from "@/components/intraday/IntradayWatchWorkspace";
import { ProgramTradingPanel } from "@/components/programTrading/ProgramTradingPanel";
import { PROGRAM_COPY as C } from "@/lib/copy/programTrading/programTrading";
import { cn } from "@/lib/utils/cn";

export function IntradayWorkspaceTabs() {
  const [active,setActive]=useState(0);
  const refs=useRef<(HTMLButtonElement|null)[]>([]);
  const labels=[C.guideTab,C.programTab];
  return <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg">
    <div role="tablist" aria-label={C.workspace} className="flex gap-xs rounded-lg bg-surface-muted p-xs">
      {labels.map((label,index)=><button key={label} ref={node=>{refs.current[index]=node;}} type="button" role="tab" id={`intraday-tab-${index}`} aria-selected={active===index} aria-controls={`intraday-panel-${index}`} tabIndex={active===index?0:-1}
        onClick={()=>setActive(index)}
        onKeyDown={event=>{let next=active;if(event.key==="ArrowRight"||event.key==="ArrowLeft")next=1-active;else if(event.key==="Home")next=0;else if(event.key==="End")next=1;else return;event.preventDefault();setActive(next);refs.current[next]?.focus();}}
        className={cn("min-h-hit-area-min flex-1 rounded-md px-md py-sm text-body-sm font-semibold",active===index?"bg-surface text-text-strong shadow-sm":"text-text-muted hover:text-text-strong")}>{label}</button>)}
    </div>
    <div role="tabpanel" id="intraday-panel-0" aria-labelledby="intraday-tab-0" tabIndex={0} hidden={active!==0}>
      {active===0&&<IntradayWatchWorkspace />}
    </div>
    <div role="tabpanel" id="intraday-panel-1" aria-labelledby="intraday-tab-1" tabIndex={0} hidden={active!==1}>
      {active===1&&<ProgramTradingPanel />}
    </div>
  </div>;
}
