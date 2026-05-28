/**
 * mock 공시 목록 fixture.
 *
 * PRD `stock-api-integration` §6.4 — OPENDART_API_KEY 미설정 시 BFF route 가 본 fixture 반환.
 */

import type { DisclosureItem } from "@/lib/api/dart/types";

const SAMSUNG_DISCLOSURES: DisclosureItem[] = [
  {
    rceptNo: "20260520000001",
    corpName: "삼성전자",
    reportName: "주요사항보고서(자기주식취득결정)",
    filerName: "삼성전자",
    rceptDate: "2026-05-20",
  },
  {
    rceptNo: "20260515000234",
    corpName: "삼성전자",
    reportName: "분기보고서 (2026.03)",
    filerName: "삼성전자",
    rceptDate: "2026-05-15",
  },
  {
    rceptNo: "20260510000156",
    corpName: "삼성전자",
    reportName: "임원·주요주주 특정증권등 소유상황보고서",
    filerName: "삼성전자",
    rceptDate: "2026-05-10",
  },
  {
    rceptNo: "20260505000089",
    corpName: "삼성전자",
    reportName: "기업설명회(IR) 개최(안내공시)",
    filerName: "삼성전자",
    rceptDate: "2026-05-05",
  },
  {
    rceptNo: "20260430000027",
    corpName: "삼성전자",
    reportName: "현금 · 현물배당 결정",
    filerName: "삼성전자",
    rceptDate: "2026-04-30",
  },
];

export function getMockDisclosureList(
  ticker: string,
  count: number = 5,
): DisclosureItem[] {
  const safeCount = Math.max(1, Math.min(100, Math.floor(count)));
  // 시드 대상 ticker 만 풍부한 fixture. 그 외는 빈 배열 (실제 호출에서 status=013 케이스 시뮬레이션).
  if (ticker === "005930") return SAMSUNG_DISCLOSURES.slice(0, safeCount);
  // 다른 ticker 는 회사명만 바꿔서 동일 fixture 반환 — UX 무회귀.
  return SAMSUNG_DISCLOSURES.slice(0, safeCount).map((item) => ({
    ...item,
    corpName: `[mock] ${ticker}`,
  }));
}
