/**
 * rankLogoDot — 종목 로고닷(첫 글자 아바타) 색·이니셜 헬퍼(도메인 무관).
 *
 * 노스스타 랭킹 행의 컬러 로고닷을 재현하되, **hex 직타 없이** 디자인 토큰 페어만 회전한다.
 * 각 페어는 soft 배경 + strong 텍스트로 라이트/다크 양쪽 AA 대비가 검증된 조합
 * (`docs/design` §Colors) — 경보 의미(warn/critical)는 배제해 순수 브랜드 장식으로만 쓴다.
 * ticker 해시로 결정론 배정 → 같은 종목은 항상 같은 색.
 */

/** soft 배경 + strong 텍스트 토큰 페어(경보색 제외, 양쪽 테마 AA). */
const DOT_CLASSES: readonly string[] = [
  "bg-accent-soft text-primary",
  "bg-asset-stock-soft text-asset-stock",
  "bg-info-soft text-info",
  "bg-gradient-ai-soft text-gradient-ai-from",
  "bg-asset-coin-soft text-asset-coin",
  "bg-accent-vivid-soft text-accent-vivid",
];

/** FNV-1a 32bit — 짧은 문자열 결정론 해시(노스스타 seedOf 대응). */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** ticker → 로고닷 배경·텍스트 토큰 클래스(결정론). */
export function rankLogoDotClass(ticker: string): string {
  return DOT_CLASSES[hash(ticker) % DOT_CLASSES.length];
}

/** 종목명 → 로고닷 이니셜(첫 글자). 공백/빈값이면 빈 문자열. */
export function rankLogoInitial(name: string): string {
  return name.trim().charAt(0);
}
