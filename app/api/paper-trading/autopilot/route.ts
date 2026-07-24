import { NextResponse, type NextRequest } from "next/server";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis/client";
import { requireProdAdminApi } from "@/lib/server/auth/apiGuard";
import { getPaperTradingAiCliGate } from "@/lib/server/paperTrading/aiCliGate";
import { AUTOPILOT_MAX_SLOT_COUNT } from "@/lib/server/paperTrading/autopilot/constants";
import {
  getActiveAutopilotRun,
  startAutopilotRun,
} from "@/lib/server/paperTrading/autopilot/runStore";
import { resolveServerOperator } from "@/lib/server/paperTrading/operator";
import { PAPER_TRADING_INTRADAY_INTERVAL_OPTIONS } from "@/lib/types/paperTrading/paperTrading";
import type {
  AutopilotRunResponse,
  StartAutopilotRunRequest,
} from "@/lib/types/paperTrading/autopilot";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function kisReady(): boolean {
  return isKisConfigured() && resolveKisEnv() === "prod";
}

export async function GET(request: NextRequest): Promise<Response> {
  // 오토파일럿 런 조회 — 세션 원장과 동일 게이트(prod 는 admin, 로컬 전체).
  const denied = await requireProdAdminApi(request);
  if (denied) return denied;

  const payload: AutopilotRunResponse = {
    run: await getActiveAutopilotRun(),
    currentOperator: resolveServerOperator(),
    kisReady: kisReady(),
    generatedAt: new Date().toISOString(),
  };
  return NextResponse.json(payload, { headers: NO_STORE });
}

export async function POST(request: NextRequest): Promise<Response> {
  const denied = await requireProdAdminApi(request);
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<StartAutopilotRunRequest>;

    // 검증 — 자식 세션 생성은 스윕(스크리너 가용 시)이 하므로 여기선 런 파라미터만 본다.
    if (
      body.totalCapital !== undefined &&
      !(
        Number.isFinite(body.totalCapital) &&
        body.totalCapital >= 1_000_000 &&
        body.totalCapital <= 1_000_000_000
      )
    ) {
      return NextResponse.json(
        { error: "총자본은 100만 원 이상 10억 원 이하로 입력해 주세요." },
        { status: 422, headers: NO_STORE },
      );
    }
    if (
      body.slotCount !== undefined &&
      !(
        Number.isInteger(body.slotCount) &&
        body.slotCount >= 1 &&
        body.slotCount <= AUTOPILOT_MAX_SLOT_COUNT
      )
    ) {
      return NextResponse.json(
        { error: `슬롯 수는 1~${AUTOPILOT_MAX_SLOT_COUNT} 사이여야 해요.` },
        { status: 422, headers: NO_STORE },
      );
    }
    if (
      body.tickIntervalMinutes !== undefined &&
      !(PAPER_TRADING_INTRADAY_INTERVAL_OPTIONS as readonly number[]).includes(
        body.tickIntervalMinutes,
      )
    ) {
      return NextResponse.json(
        { error: "판단 주기가 허용값이 아니에요." },
        { status: 422, headers: NO_STORE },
      );
    }
    if (
      body.riskMode !== undefined &&
      !["conservative", "balanced", "aggressive"].includes(body.riskMode)
    ) {
      return NextResponse.json(
        { error: "리스크 모드가 허용값이 아니에요." },
        { status: 422, headers: NO_STORE },
      );
    }
    if (body.purpose !== undefined && !["guide", "research"].includes(body.purpose)) {
      return NextResponse.json(
        { error: "실행 목적이 허용값이 아니에요." },
        { status: 422, headers: NO_STORE },
      );
    }

    // 자식 세션이 로컬 AI CLI 를 쓰므로 시작 시점에 게이트 확인(스윕 때 조용히 실패하지 않게).
    const cliGate = getPaperTradingAiCliGate();
    if (!cliGate.ok) {
      return NextResponse.json(
        { error: cliGate.message },
        { status: cliGate.status, headers: NO_STORE },
      );
    }

    // KIS 미설정이어도 시작은 허용(출근 전 프리마켓 시작 시나리오) — kisReady 로 UI 경고만.
    const run = await startAutopilotRun({
      purpose: body.purpose,
      totalCapital: body.totalCapital,
      slotCount: body.slotCount,
      riskMode: body.riskMode,
      tickIntervalMinutes: body.tickIntervalMinutes,
    });
    const payload: AutopilotRunResponse = {
      run,
      currentOperator: resolveServerOperator(),
      kisReady: kisReady(),
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch {
    return NextResponse.json(
      { error: "오토파일럿을 시작하지 못했어요." },
      { status: 400, headers: NO_STORE },
    );
  }
}
