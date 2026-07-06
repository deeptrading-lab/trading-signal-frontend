/**
 * 취소선(`~~old~~new`) 자기수정 흔적을 제거한다.
 *
 * 분석 에이전트가 값을 재검토하며 "~~1주~~2주"처럼 이전 값을 취소선으로 남기고 새 값을
 * 이어붙이는 경우가 있다 — 의도는 old 값 삭제였는데 마크다운 취소선 문법이 그대로 남아
 * 렌더러(remark-gfm)가 취소선 스타일로 그려버린다. old(취소선 안쪽) 자체를 통째로 들어내
 * "~~1~~2주" → "2주" 처럼 최종값만 남긴다. teaser(`stripMarkdown`)·전체보기
 * (`MarkdownContent`) 양쪽에서 공유해서 쓴다.
 */
export function stripStrikethrough(md: string): string {
  if (!md) return "";
  return md.replace(/~~([^~]+)~~/g, "");
}

/**
 * 마크다운 원문을 미리보기용 평문으로 변환한다.
 *
 * 카드 미리보기는 3줄 클램프 teaser 라 전체보기(ReactMarkdown 렌더)와 달리
 * 서식을 그릴 공간이 없다. `**`·`##`·`|` 같은 문법 기호가 그대로 노출되면
 * 지저분하므로, 기호만 제거해 읽기 좋은 평문으로 만든다.
 * (전체보기는 여전히 마크다운 서식 그대로 유지 — 이건 teaser 전용.)
 */
export function stripMarkdown(md: string): string {
  if (!md) return "";
  return stripStrikethrough(md)
    // 코드펜스 ``` 블록 마커 제거(내용은 남김)
    .replace(/```[^\n]*\n?/g, "")
    // 이미지 ![alt](url) → alt
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    // 링크 [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // 헤딩 마커(`#`, `##` …) 제거
    .replace(/^#{1,6}\s+/gm, "")
    // 블록쿼트 `>` 제거
    .replace(/^>\s?/gm, "")
    // 리스트 마커(`-`, `*`, `+`, `1.`) 제거
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, "")
    // 표 구분선 행(|---|---|) 제거
    .replace(/^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/gm, "")
    // 표 셀 구분 파이프 → 공백
    .replace(/\s*\|\s*/g, " ")
    // 수평선(---, ***, ___) 제거
    .replace(/^\s*([-*_])\1{2,}\s*$/gm, "")
    // 굵게/기울임 마커(**, __, *, _) 제거
    .replace(/(\*\*|__|\*|_)(.*?)\1/g, "$2")
    // 인라인 코드 백틱 제거
    .replace(/`([^`]*)`/g, "$1")
    // 3줄 이상 연속 공백줄 → 1줄
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
