/**
 * Home 실시간 관련 뉴스 mock — 3건.
 *
 * 시안 `AnalysisDashboard.tsx` 의 뉴스 영역 정합. 제목·시간·출처는 뉴스 데이터로 보존
 * (정해진 출처에서 받은 데이터 단위 — UI 카피 분리 대상 아님). 카드 헤더 ("실시간 관련 뉴스"
 * / "더보기") 의 한글 카피는 `lib/copy/home/labels.ts`.
 */

import type { NewsList } from "@/lib/types/home/news";

export const NEWS_MOCK: NewsList = [
  {
    time: "10분 전",
    title: "비트코인, 기관 자금 유입에 9000만원 재돌파 시도",
    source: "한경금융",
  },
  {
    time: "1시간 전",
    title: "美 연준 금리 동결 기대감에 위험자산 랠리 지속",
    source: "블룸버그",
  },
  {
    time: "3시간 전",
    title: "고래 지갑 이동 포착, 단기 변동성 주의보",
    source: "코인데스크",
  },
];
