/**
 * 종목(기업) 자유 텍스트 "회사 소개" 타입.
 *
 * 종목 상세(`/stock/[ticker]`) `CompanyOverview` 상단에 "무슨 사업을 하는 회사" 한 문단을
 * 보여주기 위한 화면 친화 스키마. 출처 비교는 `docs/research/company-description-sources.md`.
 *
 * - `sentences` — 사업 요약 문장들(원문은 출처에서 문장 단위 li 로 제공). UI 가 공백으로
 *   이어 한 문단으로 렌더하거나 목록으로 렌더할 수 있게 배열로 보관.
 * - `source` — 출처 표기 라벨(예: "FnGuide"). 빈 문자열이면 미표기.
 *
 * 비핵심 정보 — 출처 실패/차단 시 BFF 가 빈 `sentences` 로 degrade 하고 UI 는 숨긴다.
 */
export interface CompanyDescription {
  ticker: string;
  sentences: string[];
  source: string;
}
