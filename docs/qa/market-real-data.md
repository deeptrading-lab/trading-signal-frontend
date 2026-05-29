# QA 리포트 — Market 화면 KIS 실데이터 전환 (`market-real-data`)

> **slug**: `market-real-data` · **PR**: #43 (`feature/market-real-data`)
> **QA**: QA 에이전트 · 2026-05-29
> **판정**: **PASS** (12/12 AC 통과, 실패 0건)
> **환경**: 브랜치 `feature/market-real-data` checkout. `.env.local` `KIS_ENV=prod` + 실전 키 설정 — 국내 지수 3종 실데이터 종단 검증 가능.
> **검증 커밋**: `da1d772` (IndicesCard KIS 실데이터 컨테이너 배선)

---

## 0. 요약

| 구분 | 결과 |
|---|---|
| 자동화 (typecheck/lint/build/test) | 통과 — 0 에러, 45 tests passed |
| 정적 grep (AC-1~4·6·8·9·12) | 전부 충족 |
| 라이브 종단 (AC-7 실데이터) | `X-Data-Source: kis` + 국내 3종 실데이터 렌더 |
| 라이브 부분 성공 (AC-12) | 무효 코드 1건 drop, 성공분만 200 반환 |
| 공통 회귀 (BFF 원칙·한글 톤·a11y·토큰) | 무회귀 |

---

## 1. AC 별 검증 표

### AC-1 KIS 지수 호출 모듈 존재 — PASS

| 절차 | 기대 | 실측 |
|---|---|---|
| `find lib/api/kis -name "index-price.ts"` | 1건 | `lib/api/kis/index-price.ts` 1건 |
| `git grep -n "FHPUP02100000" lib/api/kis` | 1건+ | `index-price.ts:58` `buildAuthHeaders("FHPUP02100000")` + types.ts 주석 |
| `git grep 'FID_COND_MRKT_DIV_CODE: "U"' lib/api/kis` | 1건 | `index-price.ts:67` `FID_COND_MRKT_DIV_CODE: "U"` |

### AC-2 BFF 지수 라우트 존재 + 헤더 — PASS

| 절차 | 기대 | 실측 |
|---|---|---|
| `find app/api/market/indices -name "route.ts"` | 1건 | `app/api/market/indices/route.ts` |
| `git grep "X-Data-Source" …/route.ts` | 1건+ | `route.ts:90` `"X-Data-Source": source` |
| `git grep "X-KIS-Env" …/route.ts` | 1건 | `route.ts:40,51,114` |
| `git grep "isKisConfigured" …/route.ts` | 1건 | `route.ts:38` 이중 게이트 분기 |

### AC-3 KIS 직접 호출 없음 (BFF 경유) — PASS

| 절차 | 기대 | 실측 |
|---|---|---|
| `git grep "inquire-index-price" components hooks app/(main)` | 코드 0건 | page.tsx PRD 주석 1건만 (실코드 0) |
| `git grep "getKisClient\|fetchIndexPrice" lib/api/market` | 코드 0건 | 어댑터 주석 1건만 (실코드 0). 어댑터는 `httpClient.get("/market/indices")` same-origin BFF만 사용 (`indices.ts:33`) |

### AC-4 도메인 한 뎁스 + queryKeys + 커스텀훅 정합 — PASS

| 절차 | 기대 | 실측 |
|---|---|---|
| `git grep "queryKeys.market.indices" hooks/market/useQueryIndices.ts` | 1건 | `useQueryIndices.ts:33` |
| `git grep -rn "useQuery(" components/market` | 0건 | 0건 (컴포넌트는 커스텀훅만 소비) |
| `git grep "useQueryIndices" components/market` | 1건+ | `IndicesCardContainer.tsx:27,59` |

### AC-5 지수 매퍼 회귀 차단 (단위 테스트) — PASS

```
$ npm run test -- index-price
 ✓ lib/api/kis/__tests__/index-price.mappers.test.ts (7 tests) 2ms
 Test Files  1 passed (1)   Tests  7 passed (7)
```

커버리지 확인 (`index-price.mappers.test.ts`):
- ① `prdy_vrss_sign` "1/2"→up, "3/9"→flat, "4/5"→down — 명시 검증 (`[#1]`).
- ② 숫자 문자열→number, 빈값/`not-a-number`→0, 음수 처리 — 검증 (`[#2]`, "음수 change").
- ③ `INDEX_NAME_BY_CODE["0001"/"1001"/"2001"]` = KOSPI/KOSDAQ/KOSPI200 — 검증 (`[#3]`).
- ④ `bstp_kor_isnm`(업종명)이 섞여도 무시, 상수 매핑만 사용 — 검증 (`[#4]`). 상수 미존재 코드는 code 그대로 graceful degrade.

### AC-6 mock fallback (환경변수 미설정 시) — PASS

| 절차 | 기대 | 실측 |
|---|---|---|
| route 단위 테스트 `[AC-6] 키 미설정 → mock` | 200 + `X-Data-Source: mock` + `MarketIndexQuote[]` | 통과 — `fetchIndexPrice` 미호출, body codes `["0001","1001","2001"]` |
| `git grep "getMockMarketIndices" lib/mock/market` | 1건 | `lib/mock/market/indices.ts:75` |

`route.test.ts` 4 tests 전체 통과. 게이트 정의 (`client.ts:35`): `resolveKisEnv()` 는 `KIS_ENV==="prod"` 일 때만 prod, 그 외 vts → mock.

### AC-7 화면 종단 실데이터 (prod 키, 라이브) — PASS

dev 서버 (`:3000`) 기동 후 `GET /api/market/indices`:

```
HTTP/1.1 200 OK
cache-control: no-store
x-data-source: kis
x-kis-env: prod
```
```json
[
  {"code":"0001","name":"KOSPI","value":8476.15,"change":290.86,"changePercent":3.55,"direction":"up", ...},
  {"code":"1001","name":"KOSDAQ","value":1074.8,"change":-29.56,"changePercent":-2.68,"direction":"down", ...},
  {"code":"2001","name":"KOSPI200","value":1342.82,"change":50.25,"changePercent":3.89,"direction":"up", ...}
]
```

- 국내 3종 실데이터 + 현재가/전일대비/등락률 정상. `direction` 부호 매핑 정확 (KOSDAQ 음수 → down).
- 지수명은 상수 매핑 (응답에 종목명 필드 없음 — `name` 이 정확히 KOSPI/KOSDAQ/KOSPI200).
- `/market` 페이지 SSR: 컨테이너가 `'use client'` 라 초기 HTML 은 로딩 상태("지수 정보를 불러오는 중이에요.") + "주요 지수" 헤더 노출 → 하이드레이션 후 위 실데이터 fetch. 정상 동작.

### AC-8 캐싱 TTL 정합 (30s) — PASS

| 절차 | 기대 | 실측 |
|---|---|---|
| `git grep "staleTime" lib/query/queryConfig.ts` market.indices | 30s | `queryConfig.ts:73` `staleTime: 30 * SECOND` (주석 q7=b 명시) |
| `git grep "queryConfig.market.indices" hooks/market/useQueryIndices.ts` | 1건 | `useQueryIndices.ts:36-37` staleTime/gcTime 단일 진실 원천 참조 |

### AC-9 표시 변환 정합 — PASS

| 절차 | 기대 | 실측 |
|---|---|---|
| `git grep "signal-up-text\|signal-down-text" IndicesCard.tsx` | 유지 | `IndicesCard.tsx:48` `index.isUp ? "signal-up-text" : "signal-down-text"` (한국식 상승 빨강/하락 파랑) |
| 컨테이너 표시 변환 | number→콤마, 등락률 부호+% | `IndicesCardContainer.tsx:47-54` `formatNumber(value)` + `formatPct(changePercent, {sign:true})` + `isUp = direction==="up"` |

### AC-10 typecheck / lint / build 0 에러 — PASS

```
$ npm run typecheck   # tsc --noEmit → 0 에러
$ npm run lint        # eslint . → 0 에러
$ npm run build       # Turbopack → ✓, /api/market/indices 가 ƒ (Dynamic) 로 등록, /market ○ (Static)
```

### AC-11 화면 회귀 0 (양 뷰포트) — PASS

- `/market` 200 OK, 레이아웃(card/grid 셸) 유지. IndicesCard 가 국내 3종 구성 (해외/환율/코인 4종 제거 — display-model mock `MARKET_INDICES_MOCK` 완전 삭제, page 가 mock 직접 import 안 함).
- ThemesCard 무변경 — `git diff main` stat 결과 `components/market/ThemesCard.tsx` · `lib/mock/market/themes.ts` 변경 0줄.
- 부분 성공 시 셀 grid 가 1~3칸으로 자연 축소 (컨테이너 `data.map`), 데스크탑/모바일 공통 동일 grid 컴포넌트라 양 뷰포트 회귀 위험 없음.

### AC-12 부분 성공 + 이중 게이트 — PASS

| 절차 | 기대 | 실측 |
|---|---|---|
| `git grep "allSettled" …/route.ts` | 1건 | `route.ts:71` `Promise.allSettled` |
| `git grep "resolveKisEnv\|isKisConfigured" …/route.ts` | 둘 다 | `route.ts:19,20,38` 이중 게이트 |
| 라이브 부분 성공 (`?codes=0001,9999,2001`) | 무효 1건 drop, 200 | `HTTP 200`, `x-data-source: kis`, body codes `["0001","2001"]` — 9999 제외됨 |
| route 단위 테스트 `[AC-12] env != prod → mock` | KIS 미호출 + `X-Data-Source: mock` | 통과 — `fetchIndexPrice` 미호출, `X-KIS-Env: vts` |
| route 단위 테스트 부분 실패 (1001 reject) | 성공분 `["0001","2001"]`, 200 | 통과 |
| route 단위 테스트 전부 실패 | 502 + 한글 fallback | 통과 — `/불러오지 못했어요/` |

---

## 2. 에지 케이스

| 케이스 | 처리 | 검증 |
|---|---|---|
| 전부 실패 (`__ALL_FAILED__`) | 502 + 한글 fallback (mock 노출 대신 명시적 에러로 화면 빈/에러 분기) | route.test.ts 통과 |
| 타임아웃 5s 초과 | `mock-timeout` + `X-Error` 한글 + mock graceful degrade | `route.ts:97-116` `withTimeout` 5_000ms + `mapErrorToResponse` |
| NaN/빈 숫자 문자열 입력 | `toNumber` → 0, 옵션 필드 빈값 → undefined | mappers.test.ts `[#2]` 통과 |
| 업종명 필드 오염 (`bstp_kor_isnm`) | 무시, 상수 매핑명만 사용 | mappers.test.ts `[#4]` 통과 |
| 상수 미존재 코드 (9999) | `INDEX_NAME_BY_CODE[code] ?? code` → 코드 그대로 graceful | mappers.test.ts 통과 + 라이브 부분성공에서 9999 KIS 비즈니스 에러로 drop |
| `?codes=` 콤마/반복 파라미터 혼용 | `parseCodes` flatMap split + trim + filter, 빈값 시 기본 3종 | `route.ts:59-65` |
| 빈 결과 (codes 0건 성공) | 컨테이너 빈 상태 "표시할 지수가 없어요." | `IndicesCardContainer.tsx:91-97` |
| StrictMode 더블 마운트 | TanStack Query 캐시(staleTime 30s) 가 중복 fetch 흡수 | queryConfig 단일 원천 |

---

## 3. 공통 회귀 점검

| 항목 | 결과 |
|---|---|
| BFF 원칙 (`git grep "http://127.0.0.1" -- app/`) | market 스코프 0건. 잔존 매치(whitelist/search·workbench adapter)는 FastAPI route handler fallback — QA 룰상 제외 대상, 본 PR 무관 |
| 한글 톤 (`lib/copy/market/labels.ts`) | 사용자 노출 카피 전부 한글 ("지수 정보를 불러오는 중이에요." 등), 정중 톤 일관. 식별자(KOSPI 등)만 영문 |
| 접근성 | `aria-label`(섹션), `role="alert"`(에러), `aria-busy`+`sr-only`(로딩), `aria-hidden`(장식 아이콘) — 무회귀 |
| 신규 디자인 토큰 0 | `app/globals.css`·tailwind config·DESIGN.md 변경 0줄 (시안 정합) |
| 커스텀훅 의무화 | 컴포넌트 `useQuery(` 직접 import 0건, `useQueryIndices` 만 소비 |

---

## 4. 라이브 라운드트립 (BE = KIS prod, `:3000`)

1. dev 서버 기동 (`npm run dev`) → `✓ Ready in 177ms`.
2. `GET /api/market/indices` (기본 3종) → `200` · `x-data-source: kis` · `x-kis-env: prod` · 국내 3종 실데이터 (AC-7).
3. `GET /api/market/indices?codes=0001,9999,2001` → `200` · 무효 9999 drop · body `["0001","2001"]` (AC-12 부분 성공).
4. `GET /market` → `200` · "주요 지수" 헤더 + 로딩 상태 SSR → 클라이언트 하이드레이션 fetch.
5. dev 서버 종료.

> mock fallback(env != prod) 라이브 재현은 `.env.local` `KIS_ENV=prod` 가 인라인 env override 보다 우선 로드되어 별도 포트 인스턴스 기동이 실패 — 대신 게이트 로직(`client.ts:35-39`) + route 단위 테스트 2건(`[AC-6]`/`[AC-12]`)으로 동등 검증 완료. 게이트 분기는 환경변수 단일 조건이라 단위 테스트 커버리지로 충분.

---

## 5. 판정

**PASS — 12/12 AC 통과, 실패 0건.** `impl-ready` → `qa-passed` 라벨 이동.

PR 본문 `## 다음 작업` 절 존재 확인 (handoff-append 게이트 충족): 해외/환율/코인 트랙 · 테마 실데이터 트랙 · 지수 TTL 재조정+셀 추가.
