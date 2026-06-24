/**
 * 시황 레이어 — 테마 바스켓 & 시총상위 바스켓 (하드코딩 데이터).
 *
 * PRD `market-snapshot` §3.2. KIS 가 반도체·2차전지 같은 **세분 섹터 지수를 제공하지 않으므로**
 * "테마 → 대표 종목" 맵을 코드에 두고 `fetchIntstockMultprice`(30종목/콜)로 일괄 시세를 받아
 * 바스켓 등락률·집중도를 계산한다.
 *
 * ## ⚠️ 유지보수 — 분기 1회 수동 갱신
 *
 * 종목 구성·시총 가중치는 시간이 지나면 실제 시총 순위와 어긋난다. `BASKETS_AS_OF` 를 갱신하며
 * 분기마다 점검한다. 가중치(`weight`)는 **대략적 시가총액(조원)** 상대값 — 정규화해서 쓰므로
 * 절대 정확도는 불필요하나, 순위 역전이 누적되면 집중도가 왜곡된다. 스냅샷은 이 한계를
 * `warnings` 로 노출한다(추정치·기준일).
 */

/** 바스켓 가중치·구성 기준일. 분기 갱신 시 함께 업데이트. */
export const BASKETS_AS_OF = "2026-06-24";

export type ThemeBasket = {
  /** 안정적 식별 키. */
  key: string;
  /** 표시 라벨(한글). */
  label: string;
  /** 대표 종목 — [ticker, name] 쌍. */
  members: ReadonlyArray<readonly [ticker: string, name: string]>;
};

export type MegacapMember = {
  ticker: string;
  name: string;
  /** 대략적 시가총액(조원) — 집중도 가중치(정규화 전 상대값). */
  weight: number;
};

/**
 * 테마 바스켓 — 시대별 주도 테마 중심. 사용자가 명시한 테마(반도체·2차전지·바이오·화장품·로봇)와
 * 주요 대형 테마(방산·자동차·인터넷·조선·원전)를 포함. 각 8~12종목.
 */
export const THEME_BASKETS: readonly ThemeBasket[] = [
  {
    key: "semiconductor",
    label: "반도체",
    members: [
      ["005930", "삼성전자"],
      ["000660", "SK하이닉스"],
      ["042700", "한미반도체"],
      ["000990", "DB하이텍"],
      ["240810", "원익IPS"],
      ["058470", "리노공업"],
      ["357780", "솔브레인"],
      ["095340", "ISC"],
      ["403870", "HPSP"],
      ["140860", "파크시스템스"],
      ["036930", "주성엔지니어링"],
    ],
  },
  {
    key: "battery",
    label: "2차전지",
    members: [
      ["373220", "LG에너지솔루션"],
      ["006400", "삼성SDI"],
      ["051910", "LG화학"],
      ["003670", "포스코퓨처엠"],
      ["247540", "에코프로비엠"],
      ["086520", "에코프로"],
      ["066970", "엘앤에프"],
      ["020150", "롯데에너지머티리얼즈"],
      ["137400", "피엔티"],
      ["121600", "나노신소재"],
    ],
  },
  {
    key: "bio",
    label: "바이오",
    members: [
      ["207940", "삼성바이오로직스"],
      ["068270", "셀트리온"],
      ["196170", "알테오젠"],
      ["328130", "루닛"],
      ["145020", "휴젤"],
      ["302440", "SK바이오사이언스"],
      ["000100", "유한양행"],
      ["326030", "SK바이오팜"],
      ["141080", "리가켐바이오"],
      ["214450", "파마리서치"],
    ],
  },
  {
    key: "defense",
    label: "방산",
    members: [
      ["012450", "한화에어로스페이스"],
      ["047810", "한국항공우주"],
      ["064350", "현대로템"],
      ["079550", "LIG넥스원"],
      ["042660", "한화오션"],
      ["272210", "한화시스템"],
    ],
  },
  {
    key: "auto",
    label: "자동차",
    members: [
      ["005380", "현대차"],
      ["000270", "기아"],
      ["012330", "현대모비스"],
      ["011210", "현대위아"],
      ["161390", "한국타이어앤테크놀로지"],
      ["204320", "HL만도"],
    ],
  },
  {
    key: "internet",
    label: "인터넷·플랫폼",
    members: [
      ["035420", "NAVER"],
      ["035720", "카카오"],
      ["323410", "카카오뱅크"],
      ["259960", "크래프톤"],
      ["036570", "엔씨소프트"],
      ["251270", "넷마블"],
      ["263750", "펄어비스"],
      ["376300", "디어유"],
    ],
  },
  {
    key: "shipbuilding",
    label: "조선",
    members: [
      ["009540", "HD한국조선해양"],
      ["010140", "삼성중공업"],
      ["329180", "HD현대중공업"],
      ["010620", "HD현대미포"],
      ["042660", "한화오션"],
    ],
  },
  {
    key: "nuclear",
    label: "원전",
    members: [
      ["034020", "두산에너빌리티"],
      ["052690", "한전기술"],
      ["051600", "한전KPS"],
      ["015760", "한국전력"],
    ],
  },
  {
    key: "cosmetics",
    label: "화장품",
    members: [
      ["090430", "아모레퍼시픽"],
      ["051900", "LG생활건강"],
      ["192820", "코스맥스"],
      ["161890", "한국콜마"],
      ["237880", "클리오"],
      ["214450", "파마리서치"],
    ],
  },
  {
    key: "robot",
    label: "로봇",
    members: [
      ["454910", "두산로보틱스"],
      ["277810", "레인보우로보틱스"],
      ["108490", "로보티즈"],
      ["056080", "유진로봇"],
      ["090360", "로보스타"],
      ["117730", "티로보틱스"],
    ],
  },
] as const;

/**
 * 시총상위 바스켓 — 지수 집중도("코스피 상승이 소수 대형주 때문인가") 계산용.
 * KOSPI 시총 상위 ~30종목 + 대략적 시총(조원) 가중치. 전체 구성종목 부재의 근사 대용물.
 * weight 는 정규화해서 쓰므로 절대값보다 **상대 순위**가 중요.
 */
export const MEGACAP: readonly MegacapMember[] = [
  { ticker: "005930", name: "삼성전자", weight: 450 },
  { ticker: "000660", name: "SK하이닉스", weight: 160 },
  { ticker: "373220", name: "LG에너지솔루션", weight: 90 },
  { ticker: "207940", name: "삼성바이오로직스", weight: 70 },
  { ticker: "005380", name: "현대차", weight: 50 },
  { ticker: "000270", name: "기아", weight: 45 },
  { ticker: "068270", name: "셀트리온", weight: 40 },
  { ticker: "105560", name: "KB금융", weight: 35 },
  { ticker: "035420", name: "NAVER", weight: 33 },
  { ticker: "005490", name: "POSCO홀딩스", weight: 33 },
  { ticker: "055550", name: "신한지주", weight: 28 },
  { ticker: "028260", name: "삼성물산", weight: 25 },
  { ticker: "051910", name: "LG화학", weight: 25 },
  { ticker: "012330", name: "현대모비스", weight: 22 },
  { ticker: "006400", name: "삼성SDI", weight: 22 },
  { ticker: "035720", name: "카카오", weight: 20 },
  { ticker: "032830", name: "삼성생명", weight: 18 },
  { ticker: "086790", name: "하나금융지주", weight: 18 },
  { ticker: "011200", name: "HMM", weight: 18 },
  { ticker: "003670", name: "포스코퓨처엠", weight: 18 },
  { ticker: "000810", name: "삼성화재", weight: 16 },
  { ticker: "066570", name: "LG전자", weight: 16 },
  { ticker: "015760", name: "한국전력", weight: 14 },
  { ticker: "034730", name: "SK", weight: 13 },
  { ticker: "003550", name: "LG", weight: 13 },
  { ticker: "012450", name: "한화에어로스페이스", weight: 13 },
  { ticker: "096770", name: "SK이노베이션", weight: 12 },
  { ticker: "010130", name: "고려아연", weight: 11 },
  { ticker: "009150", name: "삼성전기", weight: 11 },
  { ticker: "323410", name: "카카오뱅크", weight: 11 },
] as const;

/** regime/momentum 지수 일봉 프록시 — 실제 지수 일봉 TR 미구현이라 ETF 로 대체. */
export const INDEX_PROXY_ETF = {
  /** KOSPI200 추종 — 코스피 국면 프록시. */
  kospi: { ticker: "069500", name: "KODEX 200" },
  /** KOSDAQ150 추종 — 코스닥 국면 프록시. */
  kosdaq: { ticker: "229200", name: "KODEX 코스닥150" },
} as const;

/**
 * 섹터·집중도 계산에 필요한 전체 유니버스(중복 제거) — multprice 콜 대상.
 * THEME_BASKETS ∪ MEGACAP. 콜 수 = ⌈|universe|/30⌉.
 */
export function allBasketTickers(): string[] {
  const set = new Set<string>();
  for (const b of THEME_BASKETS) for (const [t] of b.members) set.add(t);
  for (const m of MEGACAP) set.add(m.ticker);
  return [...set];
}

/** ticker → 표시명 룩업(바스켓·시총 정의에 등장하는 종목 한정). */
export function basketNameByTicker(): Map<string, string> {
  const map = new Map<string, string>();
  for (const b of THEME_BASKETS) for (const [t, n] of b.members) if (!map.has(t)) map.set(t, n);
  for (const m of MEGACAP) if (!map.has(m.ticker)) map.set(m.ticker, m.name);
  return map;
}
