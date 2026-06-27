/**
 * LLM JSON 응답 느슨한 파싱 — prose 혼입·코드펜스·trailing comma 에 강하다.
 *
 * `app/api/stock/ai-analysis/route.ts`(12-에이전트 PM 파서)와 동일 전략을 공유 유틸로 추출.
 * (heavy 경로는 자체 사본을 유지 — 무회귀. 신규 단타 provider 가 본 유틸을 사용.)
 */

/** 문자열 리터럴 내부 brace 를 무시하고 첫 완결 `{...}` 객체를 추출(prose 가 앞뒤로 섞여도). */
export function extractBalancedObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0,
    inStr = false,
    esc = false;
  for (let k = start; k < text.length; k++) {
    const ch = text[k];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(start, k + 1);
  }
  return null;
}

/** `}`·`]` 앞 trailing comma 제거. */
export function stripTrailingCommas(s: string): string {
  return s.replace(/,(\s*[}\]])/g, "$1");
}

/** 느슨한 JSON 파싱 — 실패 시 null. */
export function parseLooseJson(raw: string): unknown | null {
  const text = raw.trim();
  if (!text) return null;
  const candidates: string[] = [text];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) candidates.push(fence[1].trim());
  const balanced = extractBalancedObject(text);
  if (balanced) candidates.push(balanced);
  const i = text.indexOf("{"),
    j = text.lastIndexOf("}");
  if (i !== -1 && j > i) candidates.push(text.slice(i, j + 1));
  for (const c of candidates) {
    const stripped = stripTrailingCommas(c);
    const variants = stripped === c ? [c] : [c, stripped];
    for (const variant of variants) {
      try {
        return JSON.parse(variant);
      } catch {
        /* next */
      }
    }
  }
  return null;
}
