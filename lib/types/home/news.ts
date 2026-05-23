/**
 * Home 실시간 관련 뉴스 카드 데이터.
 *
 * 시안 `AnalysisDashboard.tsx` 의 뉴스 영역 정합 — `{ time, title, src }` 3건.
 * 시간 표기는 본 PR4 mock 단계에서 "10분 전" / "1시간 전" 같은 상대표기 한글 문자열.
 * 후속 BE 연결 시 ISO timestamp 로 변환 + 카피 분리 검토.
 */

export type NewsItem = {
  /** 상대 시간 표기 (예: "10분 전"). */
  time: string;
  /** 뉴스 제목. */
  title: string;
  /** 출처 (예: "한경금융", "블룸버그"). */
  source: string;
};

export type NewsList = NewsItem[];
