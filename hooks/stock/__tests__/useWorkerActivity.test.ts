import { describe, it, expect } from "vitest";
import { deriveWorkerActivity } from "@/hooks/stock/useWorkerActivity";
import type { WorkerStatusResponse } from "@/lib/types/stock/analysisQueue";

/**
 * 워커 활동 뱃지(S7) 파생 규칙 회귀 차단. UI/폴링과 분리된 순수 함수만 검증한다.
 * (online·busy → processing / online·idle·대기>0 → queued / offline → offline / 그 외 → hidden)
 */
describe("deriveWorkerActivity", () => {
  it("데이터 미수신(undefined) → hidden (fail-soft)", () => {
    expect(deriveWorkerActivity(undefined)).toEqual({
      kind: "hidden",
      queueDepth: 0,
    });
  });

  it("오프라인(online:false) → offline", () => {
    expect(deriveWorkerActivity({ online: false })).toEqual({
      kind: "offline",
      queueDepth: 0,
    });
  });

  it("online·busy·대기0 → processing(0)", () => {
    const r: WorkerStatusResponse = { online: true, status: "busy", queueDepth: 0 };
    expect(deriveWorkerActivity(r)).toEqual({ kind: "processing", queueDepth: 0 });
  });

  it("online·busy·대기3 → processing(3)", () => {
    const r: WorkerStatusResponse = { online: true, status: "busy", queueDepth: 3 };
    expect(deriveWorkerActivity(r)).toEqual({ kind: "processing", queueDepth: 3 });
  });

  it("online·idle·대기2 → queued(2) (적재됐으나 미점유 — 전이 구간)", () => {
    const r: WorkerStatusResponse = { online: true, status: "idle", queueDepth: 2 };
    expect(deriveWorkerActivity(r)).toEqual({ kind: "queued", queueDepth: 2 });
  });

  it("online·idle·대기0 → hidden (할 일 없음)", () => {
    const r: WorkerStatusResponse = { online: true, status: "idle", queueDepth: 0 };
    expect(deriveWorkerActivity(r)).toEqual({ kind: "hidden", queueDepth: 0 });
  });

  it("음수 queueDepth 는 0 으로 클램프", () => {
    const r: WorkerStatusResponse = { online: true, status: "busy", queueDepth: -5 };
    expect(deriveWorkerActivity(r)).toEqual({ kind: "processing", queueDepth: 0 });
  });
});
