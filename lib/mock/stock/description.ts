/**
 * mock 회사 소개 fixture.
 *
 * 외부 출처(wisereport) 미가용/차단(`COMPANY_DESC_SOURCE=off`)·실패·타임아웃 시 BFF route
 * (`/api/stock/description`)가 본 fixture 로 degrade. 시드 없는 종목은 빈 배열 → UI 숨김.
 *
 * 문장은 출처 실측 샘플(2026-06-03) 기반. `docs/research/company-description-sources.md`.
 */

import type { CompanyDescription } from "@/lib/types/stock/description";

const MOCK_SENTENCES: Record<string, string[]> = {
  "005930": [
    "동사는 1969년 설립된 글로벌 전자 기업으로, DX, DS, SDC, Harman 산하 308개 종속기업으로 구성됨.",
    "DX 부문은 TV, 가전, 스마트폰, DS는 메모리 반도체와 Foundry 사업, SDC는 OLED 패널, Harman은 전장부품·오디오 사업 운영함.",
    "동사는 AI 기술 확대, 선단 공정 개발, 고부가 솔루션 포트폴리오로 제품 차별화 및 원가 경쟁력 제고하며 질적 성장에 주력하고 있음.",
  ],
  "035720": [
    "동사는 1995년 주식회사 다음커뮤니케이션으로 설립되어 2014년 카카오와 합병, 2017년 유가증권시장에 상장하였음.",
    "카카오톡을 중심으로 커머스, 모빌리티, 페이 등 다양한 영역에서 수익을 창출하며, 카카오엔터테인먼트 등을 통해 콘텐츠 사업을 강화하고 있음.",
    "카카오톡 플랫폼을 통해 광고, 커머스 비즈니스 툴을 제공하여 파트너 성장을 지원하고, 인공지능 등 미래 기술 연구개발로 혁신을 추구하고 있음.",
  ],
  "068270": [
    "동사는 1991년 설립된 글로벌 생명공학기업으로, 2023년 셀트리온헬스케어와 합병해 생산·판매 통합 법인 체제를 완성했으며, 2025년 미국 생산설비를 인수함.",
    "자가면역질환, 종양 치료 의약품을 개발해 11개 제품의 글로벌 품목 허가를 획득하여 세계에서 판매 중임.",
    "자체 R&D와 글로벌 파트너십을 통해 차세대 모달리티 연구개발을 지속하며, 직접 판매망으로 시장 지배력을 강화하고 있음.",
  ],
};

export function getMockCompanyDescription(ticker: string): CompanyDescription {
  return {
    ticker,
    sentences: MOCK_SENTENCES[ticker] ?? [],
    source: MOCK_SENTENCES[ticker] ? "FnGuide" : "",
  };
}
