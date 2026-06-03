/**
 * 외부 출처(FnGuide / wisereport) 기업개요 요약 조회 — **서버 측 only**.
 *
 * 종목 상세 "회사 소개" 데이터 출처 B. 리서치: `docs/research/company-description-sources.md`.
 *
 * 페이지: `https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd=<6자리>`
 *   - 정적 HTML(별도 ajax 없음), UTF-8.
 *   - 사업 요약은 문장 단위로 `<li class="dot_cmp" data-cd="<ticker>">…</li>` 에 담긴다.
 *     (실측 3종: 005930·035720·068270 모두 3문장 ~250자 토스톤 요약.)
 *
 * 안정성 의무:
 *   - 비공식 출처 → DOM 변경 시 빈 배열 반환(throw 금지, 비핵심 정보라 화면을 막지 않음).
 *   - 자체 AbortSignal 타임아웃 + 라우트의 `withTimeout` 이중 안전장치.
 *   - FnGuide 콘텐츠라 ToS 회색지대 → 라우트에 kill-switch(`COMPANY_DESC_SOURCE=off`) 존재.
 *   - 브라우저가 직접 import 금지(외부 호스트 직접 호출은 BFF 경유 원칙 위배).
 */

const WISEREPORT_URL =
  "https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx";
const DEFAULT_TIMEOUT_MS = 3_000;
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** `<li class="dot_cmp" data-cd="...">문장</li>` 전역 추출. */
const DOT_CMP_LI = /<li\s+class="dot_cmp"[^>]*>([\s\S]*?)<\/li>/gi;

/**
 * 6자리 종목코드의 기업개요 문장 배열을 반환. 실패/미발견 시 빈 배열(throw 안 함).
 */
export async function fetchCompanySummary(ticker: string): Promise<string[]> {
  const url = `${WISEREPORT_URL}?cmp_cd=${encodeURIComponent(ticker)}`;
  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return [];
    html = await res.text();
  } catch {
    return [];
  }
  return parseCompanySummary(html);
}

/** HTML 문자열에서 dot_cmp 문장들을 정제해 배열로 반환. (테스트 용이성 위해 export.) */
export function parseCompanySummary(html: string): string[] {
  const sentences: string[] = [];
  for (const match of html.matchAll(DOT_CMP_LI)) {
    const text = decodeEntities(stripTags(match[1])).replace(/\s+/g, " ").trim();
    if (text) sentences.push(text);
  }
  return sentences;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
