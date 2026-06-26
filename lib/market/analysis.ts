/**
 * 시황 레이어 Phase 2 — `MarketAnalysis` 오케스트레이터 (유일한 CLI I/O 모듈).
 *
 * PRD `market-analysis` §3.2. `MarketSnapshot` → 프롬프트 → Claude CLI(effort high, JSON 강제)
 * → loose JSON 파싱 → enum 정규화 → `MarketAnalysis`. 파싱/CLI 실패는 fail-soft.
 *
 * 비용: CLI 1콜이 비싸다(토큰+지연 30~90s). 그래서 라우트는 소비자에게 `?mode=latest`(저장본)을
 * 주고, 본 생성 경로는 `?refresh=1`/cron 만 탄다.
 */

import { invokeAgentCliStream } from "@/lib/server/ai/agentCli";
import { createLogger } from "@/lib/server/logTag";
import {
  MARKET_ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
} from "./analysisPrompt";
import type { MarketSnapshot } from "./types";
import type {
  LeadingSector,
  MarketAnalysis,
  MarketAnalysisConfidence,
  MarketOutlook,
  MarketPhase,
  RegimeDiagnosis,
  SectorMaturity,
  SystemRisk,
  SystemRiskLevel,
} from "./analysisTypes";

const log = createLogger("market-analysis");

/**
 * CLI 합성 타임아웃 — 라우트 maxDuration(300s)보다 짧게.
 * 단일 스냅샷 1-shot 합성이라 effort high 까지 갈 필요 없이 medium 으로 충분하고, 그만큼
 * 30분 주기 cron 반복에서 타임아웃에 안정적이다(effort high·90s 는 초과하던 값).
 */
const CLI_TIMEOUT_MS = 180_000;
const CLI_EFFORT = "medium" as const;

// ─── 화이트리스트 enum ─────────────────────────────────────────────────────────

const PHASES: readonly MarketPhase[] = [
  "risk_on_broad",
  "risk_on_narrow",
  "late_cycle",
  "correction",
  "risk_off",
  "bottoming",
  "neutral",
] as const;
const MATURITIES: readonly SectorMaturity[] = [
  "emerging",
  "growth",
  "mature",
  "overheated",
  "declining",
] as const;
const RISK_LEVELS: readonly SystemRiskLevel[] = ["low", "elevated", "high"] as const;
const CONFIDENCES: readonly MarketAnalysisConfidence[] = ["HIGH", "MEDIUM", "LOW"] as const;

/** 화이트리스트 매칭(대소문자·공백 무시). 미일치 시 fallback. */
function clampEnum<T extends string>(
  value: unknown,
  whitelist: readonly T[],
  fallback: T,
): T {
  if (typeof value !== "string") return fallback;
  const norm = value.trim().toLowerCase();
  for (const w of whitelist) {
    if (w.toLowerCase() === norm) return w;
  }
  return fallback;
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function asStringArray(value: unknown, max = 6): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => asString(v))
    .filter((s) => s.length > 0)
    .slice(0, max);
}

// ─── loose JSON 파싱 (코드펜스·잡텍스트 폴백) ──────────────────────────────────
// stock route(`parseLooseJson`)와 동일 전략. FOLLOWUP: 공용 util 로 dedup.

export function parseAnalysisJson(raw: string): Record<string, unknown> | null {
  const text = raw.trim();
  if (!text) return null;
  const candidates = [text];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) candidates.push(fence[1].trim());
  const i = text.indexOf("{");
  const j = text.lastIndexOf("}");
  if (i !== -1 && j > i) candidates.push(text.slice(i, j + 1));
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* 다음 후보 */
    }
  }
  return null;
}

// ─── 합성 필드 정규화 ──────────────────────────────────────────────────────────

function normalizeRegime(value: unknown): RegimeDiagnosis {
  const o = (value ?? {}) as Record<string, unknown>;
  return {
    phase: clampEnum(o.phase, PHASES, "neutral"),
    headline: asString(o.headline),
    rationale: asString(o.rationale),
  };
}

function normalizeLeadingSectors(value: unknown): LeadingSector[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw): LeadingSector | null => {
      const o = (raw ?? {}) as Record<string, unknown>;
      const key = asString(o.key);
      const label = asString(o.label);
      if (!key && !label) return null;
      return {
        key,
        label: label || key,
        maturity: clampEnum(o.maturity, MATURITIES, "mature"),
        note: asString(o.note),
      };
    })
    .filter((s): s is LeadingSector => s !== null)
    .slice(0, 5);
}

function normalizeSystemRisk(value: unknown): SystemRisk {
  const o = (value ?? {}) as Record<string, unknown>;
  return {
    level: clampEnum(o.level, RISK_LEVELS, "elevated"),
    concentrationRisk: asString(o.concentrationRisk),
    triggers: asStringArray(o.triggers, 4),
    contagion: asString(o.contagion),
  };
}

function normalizeOutlook(value: unknown): MarketOutlook {
  const o = (value ?? {}) as Record<string, unknown>;
  return {
    horizon: asString(o.horizon, "1~2주"),
    base: asString(o.base),
    bull: asString(o.bull),
    bear: asString(o.bear),
  };
}

/**
 * 파싱된 CLI 출력(또는 부분 객체)을 완전한 `MarketAnalysis` 로 정규화한다. **순수함수** —
 * 누락·이상값을 안전 기본으로 클램프(AC-5). orchestrator/테스트가 공유.
 */
export function normalizeAnalysisFields(
  parsed: Record<string, unknown> | null,
  snapshot: MarketSnapshot,
  extraWarnings: string[] = [],
): MarketAnalysis {
  const o = parsed ?? {};
  const warnings = [...snapshot.warnings, ...extraWarnings];
  return {
    asOf: new Date().toISOString(),
    snapshotAsOf: snapshot.asOf,
    provider: "claude",
    regimeDiagnosis: normalizeRegime(o.regimeDiagnosis),
    leadingSectors: normalizeLeadingSectors(o.leadingSectors),
    systemRisk: normalizeSystemRisk(o.systemRisk),
    outlook: normalizeOutlook(o.outlook),
    stockImplication: asString(o.stockImplication),
    confidence: clampEnum(o.confidence, CONFIDENCES, "MEDIUM"),
    warnings,
  };
}

// ─── CLI 합성 (유일한 I/O) ─────────────────────────────────────────────────────

export type BuildAnalysisResult = {
  analysis: MarketAnalysis;
  /** CLI 호출 여부(저비용 경로 추적용). */
  cliInvoked: boolean;
};

/**
 * 스냅샷을 CLI 로 합성해 `MarketAnalysis` 생성. CLI 실패/빈 출력 시 정규화 기본값으로 degrade
 * (전체 throw 아님 — 라우트가 200 fail-soft 유지).
 */
export async function buildMarketAnalysis(
  snapshot: MarketSnapshot,
  opts?: { signal?: AbortSignal },
): Promise<BuildAnalysisResult> {
  const signal = opts?.signal ?? new AbortController().signal;
  const userPrompt = buildAnalysisUserPrompt(snapshot);

  try {
    const result = await invokeAgentCliStream(
      "claude",
      {
        systemPrompt: MARKET_ANALYSIS_SYSTEM_PROMPT,
        userPrompt,
        tools: [],
        timeoutMs: CLI_TIMEOUT_MS,
        effort: CLI_EFFORT,
      },
      signal,
      () => {},
    );
    const parsed = parseAnalysisJson(result.text);
    if (!parsed) {
      log.warn("CLI 출력 JSON 파싱 실패 — degrade");
      return {
        analysis: normalizeAnalysisFields(null, snapshot, ["CLI 합성 결과 파싱 실패 — 기본값 degrade"]),
        cliInvoked: true,
      };
    }
    return { analysis: normalizeAnalysisFields(parsed, snapshot), cliInvoked: true };
  } catch (error) {
    log.warn("CLI 합성 실패 — degrade", error);
    const msg = error instanceof Error ? error.message : String(error);
    return {
      analysis: normalizeAnalysisFields(null, snapshot, [`CLI 합성 실패(${msg}) — 기본값 degrade`]),
      cliInvoked: false,
    };
  }
}
