/**
 * 스윙 체크 AI 노트(뉴스·공시 정리) 카피 — PRD `swing-judgment` PR-4.
 * AI 가 모은 사실 요약이라는 점, 판정에는 쓰지 않는다는 점을 함께 쓴다. 권유·전망 표현 금지.
 */

import type { SwingNoteCategory, SwingNoteDirection } from "@/lib/swing/note";

export const SWING_NOTE_TITLE = "최근 뉴스·공시 (AI 정리)";
export const SWING_NOTE_HELP = "AI가 최근 30일 기사·공시를 찾아 요약해요. 스윙 체크 결과(조건 충족·주의 사유)에는 쓰지 않아요.";
export const SWING_NOTE_REQUEST = "AI로 정리하기";
export const SWING_NOTE_REFRESH = "다시 정리하기";
export const SWING_NOTE_PENDING = "정리하고 있어요. 보통 1~3분 걸리고, 오래 걸리면 AI 워커가 꺼져 있을 수 있어요.";
export const SWING_NOTE_EMPTY = "최근 30일 관련 기사·공시를 찾지 못했어요.";
export const SWING_NOTE_FAILED = "정리하지 못했어요. 다시 요청해 주세요.";
export const SWING_NOTE_ERROR = "AI 노트를 불러오지 못했어요.";
export const SWING_NOTE_HIGH = "중요";

export const SWING_NOTE_CATEGORY_LABEL = {
  earnings: "실적",
  disclosure: "공시",
  contract: "수주·계약",
  product: "제품·기술",
  policy: "정책·규제",
  industry: "업황",
  management: "경영·지배구조",
  capital: "자금조달·주주환원",
  legal: "소송·제재",
  other: "기타",
} as const satisfies Record<SwingNoteCategory, string>;

export const SWING_NOTE_DIRECTION_LABEL = {
  positive: "긍정적 소식",
  negative: "부정적 소식",
  neutral: "중립",
} as const satisfies Record<SwingNoteDirection, string>;

/** ISO 시각 → "11월 2일 01:23 정리"(KST). */
export function swingNoteTimeLabel(iso: string): string {
  const d = new Date(Date.parse(iso) + 9 * 3_600_000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${hh}:${mm} 정리`;
}

/** "2026-10-28" → "10.28". */
export function swingNoteDateLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}.${Number(d)}`;
}
