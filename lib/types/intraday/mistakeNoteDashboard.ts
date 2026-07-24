import type {
  DailyMistakeSource,
  MemoryRule,
} from "../../../packages/intraday-mistake-note/src/types";

export type MistakeNotePolicy = {
  runAfterKst: string;
  goalZonePct: [number, number];
  memory: {
    maxRules: number;
    maxChars: number;
    runtimeMaxRules: number;
    runtimeMaxChars: number;
  };
};
export type MistakeNoteDaySummary = Pick<
  DailyMistakeSource,
  "namespace" | "date" | "operator" | "status" | "quality" | "actual" | "counterfactualBuy" | "selection"
> & {
  candidateCount: number;
};

export type MistakeNoteDashboardData = {
  loadedAt: string;
  sourceCount: number;
  latest: DailyMistakeSource | null;
  days: MistakeNoteDaySummary[];
  memory: {
    updatedAt: string | null;
    charCount: number;
    maxChars: number;
    ruleCount: number;
    maxRules: number;
    activeCount: number;
    shadowCount: number;
    runtimeMaxRules: number;
    runtimeMaxChars: number;
    rules: MemoryRule[];
    conflicts: string[];
    sourceSynced: boolean;
  };
  policy: Pick<MistakeNotePolicy, "runAfterKst" | "goalZonePct">;
  validation: {
    ok: boolean;
    errors: string[];
  };
};
