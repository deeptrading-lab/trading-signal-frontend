import type {
  AutopilotGuidePolicy,
  AutopilotRun,
} from "@/lib/types/paperTrading/autopilot";

export const DEFAULT_AUTOPILOT_GUIDE_POLICY: AutopilotGuidePolicy = {
  strategy: "momentum-target",
  takeProfitPct: 2,
  stopLossPct: -1,
  maxPositionPct: 50,
  validityMinutes: 10,
};

export type IntradayGuideScenario = {
  deployedCapital: number;
  targetProfit: number;
  plannedLoss: number;
};

export function buildIntradayGuideScenario(
  capital: number,
  policy: AutopilotGuidePolicy = DEFAULT_AUTOPILOT_GUIDE_POLICY,
): IntradayGuideScenario {
  const safeCapital = Number.isFinite(capital) && capital > 0 ? capital : 0;
  const deployedCapital = safeCapital * (policy.maxPositionPct / 100);
  return {
    deployedCapital,
    targetProfit: deployedCapital * (policy.takeProfitPct / 100),
    plannedLoss: deployedCapital * (Math.abs(policy.stopLossPct) / 100),
  };
}

export function intradayGuideValidUntil(
  recommendedAt: string,
  validityMinutes: number,
): string {
  return new Date(
    new Date(recommendedAt).getTime() + validityMinutes * 60_000,
  ).toISOString();
}

export function isIntradayGuideExpired(validUntil: string, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(validUntil).getTime();
}

export function isFreshGuideRiskAcknowledgement(
  value: string | undefined,
  now: Date = new Date(),
): boolean {
  const acknowledgedAt = Date.parse(value ?? "");
  return (
    Number.isFinite(acknowledgedAt) &&
    acknowledgedAt <= now.getTime() + 60_000 &&
    now.getTime() - acknowledgedAt <= 10 * 60_000
  );
}

export type IntradayGuideWaitReason =
  | "market-data"
  | "cooldown"
  | "no-candidate"
  | "quality-gate"
  | "screening";

export function resolveIntradayGuideWaitReason(
  run: AutopilotRun,
  kisReady: boolean,
): IntradayGuideWaitReason {
  if (!kisReady || run.lastScreenerSummary?.unavailableReason) return "market-data";
  const latestEvent = run.rotationLog.at(-1);
  const latestNote = latestEvent?.kind === "skip" ? latestEvent.note ?? "" : "";
  if (latestNote.includes("쿨다운") || latestNote.includes("중복")) return "cooldown";
  if (latestNote.includes("후보 없음") || latestNote.includes("후보 전멸")) return "no-candidate";
  if (run.lastScreenerSummary && run.lastScreenerSummary.passed > 0) return "quality-gate";
  return "screening";
}
