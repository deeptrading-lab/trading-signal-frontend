/**
 * 업종 랭킹·구성종목 mock — KIS 미설정/비-prod/실패 시 BFF fallback(레이아웃·로컬 demo 용).
 *
 * PRD `trending-sectors` §3-4. 정규화 타입(`SectorRankItem`/`SectorConstituent`)과 정합.
 * 구성종목 mock 은 `marketCap` 을 채워 로컬에서도 시가총액 정렬 세그먼트를 시연할 수 있게 한다.
 */

import type {
  SectorConstituent,
  SectorConstituentsResponse,
  SectorRankingResponse,
  SectorRankItem,
} from "@/lib/types/market/sectors";

const MOCK_SECTORS: SectorRankItem[] = [
  { code: "0013", name: "전기·전자", changePct: 3.4, direction: "up", up: 32, down: 8, flat: 2, total: 42 },
  { code: "0009", name: "의약품", changePct: 2.1, direction: "up", up: 24, down: 10, flat: 3, total: 37 },
  { code: "0008", name: "화학", changePct: 1.6, direction: "up", up: 40, down: 18, flat: 5, total: 63 },
  { code: "0015", name: "운수장비", changePct: 0.9, direction: "up", up: 19, down: 12, flat: 2, total: 33 },
  { code: "0011", name: "철강·금속", changePct: 0.4, direction: "up", up: 15, down: 13, flat: 4, total: 32 },
  { code: "0021", name: "금융업", changePct: 0.1, direction: "up", up: 18, down: 16, flat: 6, total: 40 },
  { code: "0016", name: "유통업", changePct: -0.3, direction: "down", up: 12, down: 20, flat: 3, total: 35 },
  { code: "0018", name: "건설업", changePct: -0.8, direction: "down", up: 9, down: 22, flat: 2, total: 33 },
  { code: "0005", name: "음식료·담배", changePct: -1.2, direction: "down", up: 7, down: 23, flat: 4, total: 34 },
  { code: "0026", name: "서비스업", changePct: -1.9, direction: "down", up: 10, down: 30, flat: 5, total: 45 },
];

/** 업종별 대표 구성종목 mock — 미매핑 업종은 빈 배열(모달 "구성종목 없음" 시연). */
const MOCK_CONSTITUENTS: Record<string, SectorConstituent[]> = {
  "0013": [
    { ticker: "005930", name: "삼성전자", price: 74800, changePct: 3.1, direction: "up", marketCap: 446_000_000_000_000 },
    { ticker: "000660", name: "SK하이닉스", price: 178500, changePct: 4.8, direction: "up", marketCap: 129_000_000_000_000 },
    { ticker: "009150", name: "삼성전기", price: 138000, changePct: 2.2, direction: "up", marketCap: 10_300_000_000_000 },
    { ticker: "011070", name: "LG이노텍", price: 218000, changePct: 1.4, direction: "up", marketCap: 5_100_000_000_000 },
    { ticker: "066570", name: "LG전자", price: 92300, changePct: -0.6, direction: "down", marketCap: 15_100_000_000_000 },
  ],
  "0009": [
    { ticker: "207940", name: "삼성바이오로직스", price: 782000, changePct: 2.6, direction: "up", marketCap: 55_600_000_000_000 },
    { ticker: "068270", name: "셀트리온", price: 189200, changePct: 3.3, direction: "up", marketCap: 41_200_000_000_000 },
    { ticker: "000100", name: "유한양행", price: 118400, changePct: 1.1, direction: "up", marketCap: 9_100_000_000_000 },
    { ticker: "128940", name: "한미약품", price: 312500, changePct: -0.4, direction: "down", marketCap: 3_900_000_000_000 },
  ],
};

export function getMockSectorRanking(topN: number): SectorRankingResponse {
  return {
    sectors: MOCK_SECTORS.slice(0, topN),
    asOf: new Date().toISOString(),
    // mock 은 어느 영업일의 값도 아니다. null 로 두어 소비자가 날짜를 적지 않게 한다.
    tradingDate: null,
  };
}

export function getMockSectorConstituents(
  code: string,
): SectorConstituentsResponse {
  return {
    code,
    constituents: MOCK_CONSTITUENTS[code] ?? [],
    asOf: new Date().toISOString(),
  };
}

/**
 * 스파크라인 mock — 티커 문자에서 결정론적으로 파생한 완만한 파형(로컬/무키 demo 용, Math.random 없음).
 *   30점, base 근처를 사인+틱으로 흔들어 실데이터 없이도 모달 차트 열을 시연.
 */
export function getMockSparklines(
  tickers: readonly string[],
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  const POINTS = 30;
  for (const ticker of tickers) {
    const seed = [...ticker].reduce((s, ch) => s + ch.charCodeAt(0), 0);
    const base = 1000 + (seed % 50) * 100;
    const amp = base * 0.06;
    const drift = ((seed % 7) - 3) * 0.004; // 완만한 추세(상/하).
    out[ticker] = Array.from({ length: POINTS }, (_, i) => {
      const wave = Math.sin((i + seed) * 0.5) * amp;
      const tick = ((seed >> (i % 5)) & 1 ? 1 : -1) * amp * 0.15;
      return Math.round(base * (1 + drift * i) + wave + tick);
    });
  }
  return out;
}
