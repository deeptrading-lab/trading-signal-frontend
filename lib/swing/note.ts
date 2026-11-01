/**
 * 스윙 체크 AI 노트(뉴스·공시 정리) — 고정 스키마 검증(순수 함수, PRD `swing-judgment` PR-4).
 *
 * AI 는 수집·요약만 한다. 판정(등급·조건·레벨)에는 쓰지 않고, 노트 경로는 판정 저장소를 건드리지 않는다.
 * AI 출력은 신뢰하지 않는 입력으로 보고 여기서 걸러 낸다:
 *   - 항목마다 날짜(최근 30일)·제목·출처·URL(http/https)·분류 enum·방향 enum·중요도 enum·요약 필수.
 *   - 요약(AI 가 쓴 문장)에 매매 권유·단정 표현이 있으면 그 항목을 버린다(제목은 기사 원문이라 검사하지 않음).
 *   - (URL+제목) 중복 제거 → 최신순 → 최대 10건.
 */

export const NOTE_CATEGORIES = [
  "earnings",
  "disclosure",
  "contract",
  "product",
  "policy",
  "industry",
  "management",
  "capital",
  "legal",
  "other",
] as const;
export const NOTE_DIRECTIONS = ["positive", "negative", "neutral"] as const;
export const NOTE_MATERIALITY = ["high", "medium", "low"] as const;

export type SwingNoteCategory = (typeof NOTE_CATEGORIES)[number];
export type SwingNoteDirection = (typeof NOTE_DIRECTIONS)[number];
export type SwingNoteMateriality = (typeof NOTE_MATERIALITY)[number];

export type SwingNoteItem = {
  /** 기사·공시 날짜(YYYY-MM-DD). */
  date: string;
  title: string;
  source: string;
  url: string;
  category: SwingNoteCategory;
  direction: SwingNoteDirection;
  materiality: SwingNoteMateriality;
  /** AI 요약 한 문장. */
  summary: string;
};

export const NOTE_MAX_ITEMS = 10;
export const NOTE_LOOKBACK_DAYS = 30;

/** AI 요약에 들어가면 안 되는 매매 권유·단정 표현. */
const ADVICE = /사세요|파세요|매수하세요|매도하세요|매수 추천|매도 추천|추천합니다|확실|보장|오를 것|내릴 것|상승할 것|하락할 것|목표가는|급등 예상/;

const DAY_MS = 86_400_000;
const isoDay = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? Date.parse(`${s}T00:00:00Z`) : NaN);
const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t.length > 0 && t.length <= max ? t : null;
};
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;

function httpUrl(v: unknown): string | null {
  const s = str(v, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * AI 출력(JSON 파싱 결과) → 검증된 항목. 루트가 `{ items: [] }` 꼴이 아니면 null(노트 실패).
 * 유효 항목이 0건이어도 배열을 돌려준다("최근 뉴스 없음"도 정상 결과).
 * @param today 기준일(KST, YYYY-MM-DD) — 이보다 하루 넘게 미래거나 30일보다 오래된 항목은 버린다.
 */
export function validateSwingNote(raw: unknown, today: string): SwingNoteItem[] | null {
  if (typeof raw !== "object" || raw === null || !Array.isArray((raw as { items?: unknown }).items)) return null;
  const end = isoDay(today);
  if (Number.isNaN(end)) return null;

  const seen = new Set<string>();
  const out: SwingNoteItem[] = [];
  for (const it of (raw as { items: unknown[] }).items) {
    if (typeof it !== "object" || it === null) continue;
    const r = it as Record<string, unknown>;
    const date = str(r.date, 10);
    const t = date ? isoDay(date) : NaN;
    if (!date || Number.isNaN(t) || t > end + DAY_MS || t < end - NOTE_LOOKBACK_DAYS * DAY_MS) continue;
    const item = {
      date,
      title: str(r.title, 200),
      source: str(r.source, 60),
      url: httpUrl(r.url),
      category: oneOf(r.category, NOTE_CATEGORIES),
      direction: oneOf(r.direction, NOTE_DIRECTIONS),
      materiality: oneOf(r.materiality, NOTE_MATERIALITY),
      summary: str(r.summary, 200),
    };
    if (Object.values(item).some((v) => v === null)) continue;
    // 같은 기사에서 다른 사실을 뽑는 경우가 있어(실측) URL+제목으로 중복을 본다.
    const key = `${item.url}|${item.title}`;
    if (ADVICE.test(item.summary!) || seen.has(key)) continue;
    seen.add(key);
    out.push(item as SwingNoteItem);
  }
  return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, NOTE_MAX_ITEMS);
}
