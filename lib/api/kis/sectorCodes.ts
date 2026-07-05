/**
 * KOSPI 업종(섹터) 코드 화이트리스트 — "지금 뜨는 산업" 랭킹의 산업만 남기는 필터.
 *
 * PRD `trending-sectors` §3-1 / AC-0 실측.
 *
 * ## 왜 필터가 필요한가
 *
 * `FHPUP02140000`(업종 카테고리별 지수, `FID_INPUT_ISCD=0001` KOSPI) 의 `output2` 는 KOSPI 38 건을
 * 돌려주는데, 실제 산업(음식료·화학·전기전자 …) 외에 **규모 티어**와 **테마/파생 지수**가 섞여 있다:
 *   - 규모 티어: `0002` 대형주 · `0003` 중형주 · `0004` 소형주 (산업 아님 — 시총 버킷)
 *   - 시장 전체: `0001` 코스피 종합 (output1 요약과 중복)
 *   - 테마/파생: `0163` 고배당50 · `0195` 코스피TR · `0503` VKOSPI · `2180` ESG 등
 *
 * 랭킹에는 **실제 산업 코드만** 남긴다.
 *
 * ## 화이트리스트 규칙 — 코드 숫자 범위 [5, 30]
 *
 * AC-0 실측상 실제 산업 코드는 **`0005`(음식료·담배) ~ `0030`(오락·문화)** 의 연속 구간에 모여 있고,
 * 위 비산업 코드는 전부 이 구간 밖이다:
 *   - `0001`~`0004`(종합·규모티어) → 숫자 < 5  → 제외
 *   - `0163`/`0195`/`0503`/`2180`(테마·파생) → 숫자 > 30 → 제외
 * 따라서 "4자리 숫자 코드 && 5 ≤ 숫자 ≤ 30" 이면 산업으로 취급한다. 범위 규칙이라 KOSPI output2 의
 * 항목 순서·개수 변동에 견고하고, 새 테마 지수가 붙어도 (구간 밖이라) 자동 제외된다.
 *
 * ⚠️ 후속: 실제 prod 덤프로 [5,30] 구간에 비산업 코드가 없는지 최종 확인 필요(현재는 AC-0 실측 근거).
 * 만약 구간 안에 비산업이 발견되면 `NON_INDUSTRY_CODES` 에 명시 추가한다(범위 + 예외 이중 방어).
 */

/** 산업 코드 숫자 하한(포함) — `0005` 음식료·담배. */
const SECTOR_CODE_MIN = 5;
/** 산업 코드 숫자 상한(포함) — `0030` 오락·문화. */
const SECTOR_CODE_MAX = 30;

/**
 * [5,30] 구간 안이지만 산업이 아님이 확인되면 여기에 명시 제외한다(현재 비어 있음 — 범위 규칙으로 충분).
 * 규모티어(0002~0004)·테마(0163 등)는 애초에 구간 밖이라 등재 불필요.
 */
const NON_INDUSTRY_CODES: ReadonlySet<string> = new Set<string>([]);

/**
 * 업종 코드가 "실제 산업" 인지 — 랭킹 화이트리스트 판정.
 *
 * @param code KIS `bstp_cls_code`(4자리 숫자 문자열 기대).
 */
export function isKospiSectorCode(code: string): boolean {
  const trimmed = code.trim();
  if (!/^\d{4}$/.test(trimmed)) return false;
  if (NON_INDUSTRY_CODES.has(trimmed)) return false;
  const n = Number.parseInt(trimmed, 10);
  return n >= SECTOR_CODE_MIN && n <= SECTOR_CODE_MAX;
}
