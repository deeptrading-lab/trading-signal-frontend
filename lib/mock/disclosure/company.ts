/**
 * mock 기업개황 fixture.
 *
 * PRD `stock-api-integration` §6.4 — OPENDART_API_KEY 미설정 시 BFF route 가 본 fixture 반환.
 */

import type { CompanyProfile } from "@/lib/api/dart/types";

export function getMockCompanyProfile(ticker: string): CompanyProfile | null {
  const seed = MOCK_PROFILES[ticker];
  if (seed) return seed;
  return null;
}

const MOCK_PROFILES: Record<string, CompanyProfile> = {
  "005930": {
    ticker: "005930",
    corpName: "삼성전자주식회사",
    ceoName: "한종희, 노태문",
    market: "KOSPI",
    establishedDate: "1969-01-13",
    industry: "264 - 컴퓨터 및 주변장치 제조업",
    homepage: "https://www.samsung.com/sec/",
    address: "경기도 수원시 영통구 삼성로 129 (매탄동)",
  },
  "000660": {
    ticker: "000660",
    corpName: "SK하이닉스주식회사",
    ceoName: "곽노정",
    market: "KOSPI",
    establishedDate: "1949-10-15",
    industry: "264 - 컴퓨터 및 주변장치 제조업",
    homepage: "https://www.skhynix.com",
    address: "경기도 이천시 부발읍 경충대로 2091",
  },
  "035420": {
    ticker: "035420",
    corpName: "네이버 주식회사",
    ceoName: "최수연",
    market: "KOSPI",
    establishedDate: "1999-06-02",
    industry: "582 - 소프트웨어 개발 및 공급업",
    homepage: "https://www.navercorp.com",
    address: "경기도 성남시 분당구 정자일로 95",
  },
};
