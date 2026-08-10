import type { DailyMistakeSource } from "./types";

export type ValidationResult = { ok: boolean; errors: string[] };

export function validateArtifacts(
  sources: DailyMistakeSource[],
  memory: string,
): ValidationResult {
  const errors: string[] = [];
  if (memory.length > 1_800) errors.push(`CM.md 문자 예산 초과: ${memory.length}/1800`);
  const ruleLines = memory.split("\n").filter((line) => line.startsWith("- S:"));
  if (ruleLines.length > 12) errors.push(`CM.md 규칙 수 초과: ${ruleLines.length}/12`);
  if (!memory.includes("<!-- AI_CONTEXT_START -->") || !memory.includes("<!-- AI_CONTEXT_END -->")) {
    errors.push("AI 컨텍스트 마커 누락");
  }
  if (!/^source-through:(\d{4}-\d{2}-\d{2}|none)$/m.test(memory)) {
    errors.push("CM source-through 누락");
  }
  if (ruleLines.some((line) => !/^- S:(SHADOW|ACTIVE) \| R:/.test(line))) {
    errors.push("허용되지 않은 규칙 상태/포맷");
  }
  const keys = new Set<string>();
  for (const source of sources) {
    if (source.schemaVersion !== 1) errors.push(`${source.date}: 지원하지 않는 schemaVersion`);
    const sourceKey = `${source.namespace}|${source.date}|${source.operator}`;
    if (keys.has(sourceKey)) errors.push(`중복 source: ${sourceKey}`);
    keys.add(sourceKey);
    if (/service_role|SUPABASE_SERVICE_ROLE_KEY|Bearer\s+[A-Za-z0-9._-]+/i.test(JSON.stringify(source))) {
      errors.push(`${source.date}: 비밀값 패턴 감지`);
    }
    for (const candidate of source.candidates) {
      const promptFields = [
        candidate.condition,
        candidate.action,
        candidate.avoid,
        ...candidate.keywords,
      ];
      if (
        promptFields.some(
          (value) =>
            /[\r\n|]/.test(value) ||
            /AI_CONTEXT_(START|END)|이전\s*지시.*무시|ignore\s+previous\s+instructions/i.test(
              value,
            ),
        )
      ) {
        errors.push(`${source.date}:${candidate.key}: 런타임 문맥 금지 문자열`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
