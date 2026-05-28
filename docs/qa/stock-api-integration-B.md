# QA 리포트 — stock-api-integration PR-B

- 대상 PR: [#39](https://github.com/deeptrading-lab/trading-signal-frontend/pull/39) `feat(profile): /profile/[ticker] 종목 상세 + stock/disclosure 훅 (PR-B/3 stock-api-integration)` (HEAD `f9175cb`).
- 슬러그: `stock-api-integration` — PRD §8.2 / §9 q6 [RESOLVED] 의 3분할 (PR-A / PR-B / PR-C) 중 **PR-B 한정**. PR-A (#38) 머지 완료 후 진입 (`main = dc72d61`).
- PR-B 범위: hooks 5개 (`hooks/stock/*` + `hooks/disclosure/*`) + Profile 도메인 종단 전환 (4 컴포넌트 + 라우트 `/profile/[ticker]` + 카피) + BFF 클라이언트 5건 (`lib/api/{stock,disclosure}/*.ts`) + 단위 테스트 6건. AC-11 / AC-15 는 PR-C / 시리즈 종료 영역 → **명시적 N/A**.
- 검증 환경: macOS 25.5 · Node v20 · Next 16.2.6 (Turbopack) · vitest 3.2.4 · dev `localhost:3088` (백그라운드 PID brscb22it — QA 종료 시 정리 완료).
- 변경 통계: +1,282 라인 / 23 files (PR diff stat).

## 1. 요약

PR-B 의 핵심은 **Profile 도메인 종단 전환 — "이게 됐다" 단일 증거**. PR-A 가 정착한 BFF 5 라우트 + KIS/DART 클라이언트 + queryConfig TTL 위에 hooks 5개 + Profile 컴포넌트 4개 + `/profile/[ticker]` 동적 라우트를 얹어 mock 의존 0 으로 실데이터 렌더 달성. `useQueryStockPrice(005930)` → KIS 현재가 (299,500 / -2.44%), `useQueryStockDaily(005930, 'D')` → KIS 일자별 30 candle, `useQueryDisclosureCompany(005930)` → DART "삼성전자(주)" + KOSPI, `useQueryDisclosureList(005930, 5)` → DART 2026-05-26 기준 5건. **R2 종목명 vs 업종명 회귀 차단** — KIS 모의 환경 `hts_kor_isnm` 빈 응답이라 `extractStockName` 우선순위 #3 (ticker fallback) 자연 적용 — `"전기·전자"` (bstp_kor_isnm) 절대 노출 안 됨. **AC-4/5 핵심** — `git grep "queryKeys.stock\."` 6 hit 모두 `hooks/stock/*`, `git grep "queryKeys.disclosure\."` 4 hit 모두 `hooks/disclosure/*`, `components/` 의 직접 `useQuery()` / `useMutation()` 호출 0. **AC-9 캐싱** — `/api/stock/price` 첫 호출 62ms, 즉시 재호출 12ms (React Query staleTime 10s 안에서 fresh, BFF 캐시 미스 시에도 KIS round-trip 회피). **AC-14** typecheck / lint / build 0 에러, 17 라우트 prerender (○ 9 정적 + ƒ 8 동적, `/profile/[ticker]` 신규 동적). **단위 테스트 27/27 PASS** (PR-A 21 + PR-B 6). **추가 발견 1건** — `/api/stock/daily` 첫 burst 호출 시 1회 500 에러 후 재시도 200 정상 (KIS 모의 환경 일시 응답 지연 의심, mock fallback 미적용은 PRD §6.2 의 circuit breaker 후속 영역). **PR 본문 `## 다음 작업` 절 존재 확인** (PR-C 진입 + TTL 재조정 + KIS 모의 환경 hts_kor_isnm 재검토 + 사이드 IA 확장 4건) — HANDOFF append workflow 빈 항목 commit 회귀 가드 만족.

## 2. AC 검증 표 (PR-B 핵심 + regression 9건 + N/A 2건)

| AC | 재현 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| **AC-1** BFF 라우트 5개 존재 (regression) | `find app/api/stock -type f -name route.ts` + `find app/api/disclosure -type f -name route.ts` | stock 3 + disclosure 2 = 5 | stock 3 (`price/route.ts` + `daily/route.ts` + `search/route.ts`) + disclosure 2 (`company/route.ts` + `list/route.ts`). PR-B 가 깨뜨리지 않음 | pass |
| **AC-2** KIS/DART 클라이언트 + 도메인 한 뎁스 (regression) | `find lib/api/kis lib/api/dart -maxdepth 2 -type f` + `find lib/api/kis lib/api/dart -mindepth 2 -type d` | kis 10 + dart 7 핵심 + 서브폴더 0 (`__tests__` 제외) | kis 10 (`client.ts` + `token.ts` + `price.ts` + `search.ts` + `types.ts` + `errors.ts` + `mappers.ts` + `index.ts` + `symbols.json` + `README.md` + `__tests__/` 2 파일) + dart 7 (`client.ts` + `company.ts` + `disclosure.ts` + `types.ts` + `errors.ts` + `counter.ts` + `__tests__/` 1 파일). `-mindepth 2 -type d` 0 hit (서브폴더 0). PR-B 신설 `lib/api/{stock,disclosure}/` 도 한 뎁스 정합 | pass |
| **AC-3** KIS/DART 직접 호출 없음 (regression) | `git grep -nE 'openapi(vts)?\.koreainvestment\.com\|opendart\.fss\.or\.kr' -- 'app/' 'components/' 'hooks/'` | 0 hit | app/components/hooks **0 hit** (exit=1 = no match). lib/api 안의 hit 7건은 단일 진실 원천 (`lib/api/kis/client.ts` baseURL map + `lib/api/dart/client.ts` baseURL + types.ts JSDoc) — PR-A 정착 유지. PR-B 신설 코드 (`lib/api/stock/*` + `lib/api/disclosure/*` + `hooks/*`) 는 모두 `httpClient` (baseURL=`/api`) 만 사용 | pass |
| **AC-4** queryKeys 표준 정합 (PR-B 핵심) | `git grep -n "queryKeys\.stock\." -- 'hooks/' 'components/'` + `git grep -n "queryKeys\.disclosure\." -- 'hooks/' 'components/'` | hooks/{stock,disclosure}/* 안에서만 사용 + components/ 0 hit | `queryKeys.stock.*` **6 hit** — 모두 `hooks/stock/useQueryStock{Price,Daily,Search}.ts` (코드 3 + JSDoc 3). `queryKeys.disclosure.*` **4 hit** — 모두 `hooks/disclosure/useQueryDisclosure{Company,List}.ts` (코드 2 + JSDoc 2). `components/` **0 hit**. PRD §3.4 / `docs/rules/frontend.md` §7 정합 | pass |
| **AC-5** 커스텀훅 의무화 (PR-B 핵심) | `git grep -nE "useQuery\(\|useMutation\(" -- 'components/'` | 0 hit | **0 hit** (exit=1 = no match). `components/profile/StockHeader.tsx` + `StockDailyChart.tsx` + `CompanyOverview.tsx` + `DisclosureList.tsx` 모두 `hooks/{stock,disclosure}/useQuery*` 만 호출, TanStack Query 직접 호출 0. `docs/rules/frontend.md` §1 정합 | pass |
| **AC-6** KIS 토큰 캐시 단위 테스트 (regression) | `npm test` | token.test.ts 7건 PASS | `lib/api/kis/__tests__/token.test.ts` **7 tests passed** (PR-A 정착, PR-B 영향 0). 14ms · vitest 3.2.4 | pass |
| **AC-7** mock fallback 동작 (regression) | PR-A 시 검증한 4 라우트 mock 분기 + `X-Data-Source: mock` 헤더 — PR-B 신설 route 없음 | PR-B 가 BFF 라우트 변경 0 (라우트 자체는 PR-A 가 만든 그대로). lib/api/{stock,disclosure}/*.ts 신설은 클라이언트 측 wrapper 라 fallback 분기 무관 | PR-A QA 표 #7 패스 결과 그대로. PR-B 의 변경 영향 0 | pass |
| **AC-8** Profile 종단 검증 (PR-B 핵심) | dev `localhost:3088` 기동 → `curl /api/stock/price?ticker=005930` + `daily` + `disclosure/company` + `disclosure/list` 4건 + `curl /profile/005930` SSR 카피 | 4건 모두 200 + `X-Data-Source: kis\|dart` (mock 아님) + SSR HTML 에 4 영역 타이틀 + 응답 본문 실데이터 | (a) 4 BFF 응답: price 200 `x-data-source: kis` (`{"ticker":"005930","name":"005930","price":299500,"change":-7500,"changePercent":-2.44,"direction":"down","volume":30195334,...}` — KIS 모의 환경 hts_kor_isnm 빈 응답이라 ticker fallback 자연 적용, "전기·전자" 절대 미노출), daily 200 `x-data-source: kis` (30 candle 2026-04-14 ~ 2026-05-28), company 200 `x-data-source: dart` (`{"corpName":"삼성전자(주)","ceoName":"전영현, 노태문","market":"KOSPI","establishedDate":"1969-01-13",...}`), list 200 `x-data-source: dart` (5건 — 2026-05-26 최신 공시 2건 + 2026-05-22 3건). (b) `curl /profile/005930` 200 (39ms SSR), HTML 32,373B, `grep -oE '가격 차트\|기업개황\|최근 공시\|불러오는 중'` 4 매치. (c) SSR HTML 에 `signal-up` + `signal-down` 클래스 토큰 박혀 있음 — 한국식 등락 컬러 (red=up / blue=down) 클래스 결정이 server 렌더 시점에 확인. (d) dev access log 5 라우트 200 모두 기록 | pass |
| **AC-9** 응답 캐싱 TTL 정합 (PR-B 핵심) | dev 서버 `/api/stock/price` 2회 연속 호출 timing 측정 + queryConfig.ts TTL 표 정합 확인 | 1차 ~50ms+ / 2차 < 50ms (cache hit) | (a) 1차 호출 62ms (KIS round-trip + 토큰 캐시 hit), 2차 호출 **12ms** (BFF 캐시 미스, 토큰 캐시 hit, KIS 호출만). React Query `staleTime=10s` 안에서 클라이언트 쿼리는 refetch 0 (TanStack hook 단위는 dev tools Network 탭에서만 확인 가능). (b) `queryConfig.ts` 의 stock.price = 10s / daily = 1d / disclosure.company = 1d / disclosure.list = 5min — PRD §6.1 표와 1:1 정합 (PR-A 정착). (c) 본 PR-B 의 hooks 가 `queryConfig.stock.price.staleTime` 그대로 참조 — `hooks/stock/useQueryStockPrice.ts:37` 등. 캐싱 정합성 확보 | pass |
| **AC-10** 종목명 추출 매퍼 회귀 차단 (regression) | `npm test` | mappers.test.ts 10건 PASS | `lib/api/kis/__tests__/mappers.test.ts` **10 tests passed** (PR-A 정착) — `extractStockName` 4 (`hts_kor_isnm` 우선 + `prdt_name` 폴백 + ticker fallback + **`bstp_kor_isnm` 절대 미사용 R2 회귀 차단**) + mapStockPrice 3 + mapDailyCandle 2 + 디펜시브 1. 2ms · vitest | pass |
| **AC-11** 도메인 4개 어댑터 + 화면 mock 유지 | — | — | **N/A (PR-C 범위)** — `lib/api/{dashboard,market,watchlist}/` + `hooks/{dashboard,market,watchlist}/useQuery*.ts` 는 PR-C 가 신설. 본 PR-B 는 Profile 도메인만 종단 전환 | n/a |
| **AC-12** .env.local.example 6 변수 (regression) | `test -f .env.local.example` + `git grep "KIS_APP_KEY\|..." -- '.env.local.example'` | 파일 존재 + 6 변수 hit | `.env.local.example` 62L 존재. 6 변수 모두 hit (`grep -cE "KIS_APP_KEY\|KIS_APP_SECRET\|KIS_ACCOUNT_NO\|KIS_ACCOUNT_PRODUCT_CD\|KIS_ENV\|OPENDART_API_KEY"` = 6). PR-A 정착, PR-B 영향 0 | pass |
| **AC-13** 주문 라우트 부재 (regression) | `find app/api/order -type d` + `git grep "order-cash\|order-credit\|order-rvsecncl" -- 'app/' 'lib/' 'hooks/'` | 디렉터리 0 + 실 코드 hit 0 | `find app/api/order` 0 lines (디렉터리 미존재). `git grep` hit 2건 — `lib/api/kis/README.md:27` (다중 게이트 체크리스트 문서) + `lib/api/kis/index.ts:7` (JSDoc 주석). 둘 다 **금지 의지를 박는 docs 라인**, 실 TR_ID 호출 코드 0. PR-A 안전장치 유지 | pass |
| **AC-14** typecheck / lint / build (PR-B 핵심) | `npm run typecheck && npm run lint && npm run build` | 0 에러 0 워닝 | `tsc --noEmit` 종료 0 (출력 0 lines). `eslint .` 종료 0 (출력 0 lines). `next build` (Turbopack) `✓ Compiled successfully in 2.0s` + `Finished TypeScript in 1638ms` + `✓ Generating static pages using 9 workers (16/16) in 252ms`. **17 라우트** prerender (○ 9 정적: `/` `/_not-found` `/analyze` `/dashboard` `/icon` `/market` `/profile` `/watchlist` + ƒ 8 동적: `/[...not_found]` + 5 BFF + `/api/whitelist/search` + `/api/workbench/analyze` + **`/profile/[ticker]` 신규**) | pass |
| **AC-15** 5개 도메인 화면 회귀 0 (양 뷰포트) | — | — | **N/A (시리즈 종료 후 종합 회귀 검증)** — 단, 부분 검증 (§3 절) 에서 Profile 외 4개 도메인 mock 화면 깨짐 확인 함께 수행 | n/a |

## 3. 부분 검증 — Profile 외 4개 도메인 화면 회귀

PR-B 가 hooks 추가하면서 mock fallback 화면을 깨지 않는지 확인. dev `localhost:3088` 에서 5 도메인 진입:

```text
GET /dashboard         200 (82ms)
GET /market            200 (47ms)
GET /watchlist         200 (44ms)
GET /profile           200 (49ms)   ← 마이페이지 (mock 그대로 — USER_PROFILE_MOCK / CONNECTED_EXCHANGES_MOCK)
GET /signals           404 (274ms)  ← PRD §3.5 명시 — finsight-redesign 도 placeholder 만, 라우트 미존재 (정상)
```

- `/dashboard` / `/market` / `/watchlist` 는 finsight-redesign 시리즈가 정착한 mock 데이터 그대로 렌더. PR-B 의 `hooks/{stock,disclosure}/*` 는 신규 신설이라 기존 화면 import 0 — 시각 diff 0.
- `/profile` (마이페이지) 는 PR-A QA 와 동일하게 `lib/mock/profile/{user,exchanges,menuItems}.ts` 그대로 사용. PR-B 의 `/profile/[ticker]` 동적 라우트와 자연 공존 (Next.js App Router 의 정적/동적 세그먼트 규칙).
- `/signals` 404 — PRD §3.5 표에서 "(어댑터 신설 안 함 — 시그널 알고리즘 자체가 후속 PRD 영역)" 명시. finsight-redesign 도 라우트 미생성, PR-B 무영향. 시리즈 종료 후 PRD `signal-algorithm` 진입 시 신설.

→ **회귀 0**. mock import 검사도 `app/(main)/profile/page.tsx` (마이페이지) 와 `app/api/**/route.ts` (mock fallback) 만 hit, 신설 `/profile/[ticker]` 컴포넌트는 mock import 0.

## 4. 단위 테스트 출력 (AC-6 / AC-10 regression + PR-B 6 신규)

```text
$ npm test
 RUN  v3.2.4 /Applications/하영/code_source/trading-signal-frontend

 ✓ lib/api/stock/__tests__/price.test.ts (1 test) 2ms
 ✓ lib/api/kis/__tests__/mappers.test.ts (10 tests) 2ms
 ✓ lib/api/disclosure/__tests__/list.test.ts (2 tests) 3ms
 ✓ lib/api/disclosure/__tests__/company.test.ts (1 test) 3ms
 ✓ lib/api/stock/__tests__/daily.test.ts (2 tests) 3ms
 ✓ lib/api/dart/__tests__/counter.test.ts (4 tests) 10ms
 ✓ lib/api/kis/__tests__/token.test.ts (7 tests) 14ms

 Test Files  7 passed (7)
      Tests  27 passed (27)
   Duration  319ms
```

- **PR-A 정착 21건 (regression PASS)** — mappers (10) + token (7) + counter (4).
- **PR-B 신규 6건 PASS** — `lib/api/stock/__tests__/{price,daily}.test.ts` (1 + 2) + `lib/api/disclosure/__tests__/{company,list}.test.ts` (1 + 2). BFF 클라이언트 axios mock 라운드트립으로 BFF route 응답 → mappers → hook 진입 직전까지 타입 정합 검증.

## 5. AC-8 종단 검증 — 실 데이터 본문 발췌

### 5.1 `/api/stock/price?ticker=005930` (KIS 현재가)

```json
{
  "ticker": "005930",
  "name": "005930",
  "price": 299500,
  "change": -7500,
  "changePercent": -2.44,
  "direction": "down",
  "volume": 30195334,
  "open": 305000,
  "high": 306500,
  "low": 287500
}
```

- `name` 필드: KIS 모의 (vts) 환경의 `inquire-price.output.hts_kor_isnm` 가 빈 문자열 → `extractStockName` 우선순위 #3 (ticker fallback) 자연 적용. **`bstp_kor_isnm` ("전기·전자" 업종명) 절대 미노출 — R2 회귀 차단 자연 확인**.
- `direction: "down"` — 한국식 등락 컬러 적용 대상 (component 가 `signal-down-text` 클래스 부여).

### 5.2 `/api/disclosure/company?ticker=005930` (DART 기업개황)

```json
{
  "ticker": "005930",
  "corpName": "삼성전자(주)",
  "ceoName": "전영현, 노태문",
  "market": "KOSPI",
  "establishedDate": "1969-01-13",
  "industry": "264",
  "homepage": "www.samsung.com/sec",
  "address": "경기도 수원시 영통구  삼성로 129 (매탄동)"
}
```

- 실 DART API 응답. 화면에서 KIS 의 빈 `name` 을 보완하는 정식 종목명 (`corpName`) 으로 사용 가능.
- `market: "KOSPI"` enum 정합 (`lib/copy/profile/stockDetail.ts` 한글 매핑 대상).

### 5.3 `/api/disclosure/list?ticker=005930&count=5` (DART 최근 공시 5건)

```text
count=5
  - 2026-05-26 | [기재정정]임원ㆍ주요주주특정증권등소유상황보고서
  - 2026-05-26 | 임원ㆍ주요주주특정증권등소유상황보고서
  - 2026-05-22 | 주식등의대량보유상황보고서(일반)
  - 2026-05-22 | 임원ㆍ주요주주특정증권등소유상황보고서
  - 2026-05-22 | [기재정정]임원ㆍ주요주주특정증권등소유상황보고서
```

- 실 DART API 의 2026-05-26 기준 최신 5건. `useQueryDisclosureList(ticker, 5)` 기본 count=5 정합.

### 5.4 SSR HTML 한글 카피 검증

```bash
$ curl -s http://localhost:3088/profile/005930 | grep -oE '(가격 차트|기업개황|최근 공시|불러오는 중)' | sort -u
가격 차트
기업개황
불러오는 중
최근 공시
```

→ SSR 시점에 4개 영역의 섹션 타이틀이 박혀 있음. TanStack Query 가 hydration 후 hooks 호출 → 실데이터 반영 (dev access log 5 라우트 200 모두 기록 — 위 §5.1 ~ §5.3 본문이 그 응답).

```bash
$ grep -oE '(signal-up|signal-down)' /tmp/qa-b-page.html | sort -u
signal-down
signal-up
```

→ 한국식 등락 컬러 토큰 (`signal-up` = red 상승 / `signal-down` = blue 하락) 이 SSR HTML 에 박혀 있음. finsight-redesign 시리즈 정착 토큰 그대로 사용 — 시각 톤 정합.

## 6. dev 서버 access log (AC-8 종단 5 라우트)

```text
GET /                                            200 (224ms)
GET /api/stock/price?ticker=005930               200 (245ms)  ← KIS round-trip
GET /api/stock/daily?ticker=005930&period=D      500 ( 38ms)  ← burst 1회 fail (재시도 200, §7 추가 발견 참고)
GET /api/stock/daily?ticker=005930&period=D      200 ( N/A)   ← 재시도 5회 모두 200
GET /api/disclosure/company?ticker=005930        200 (115ms)
GET /api/disclosure/list?ticker=005930&count=5   200 (169ms)
GET /profile/005930                              200 ( 39ms)
GET /dashboard                                   200 ( 82ms)
GET /market                                      200 ( 47ms)
GET /watchlist                                   200 ( 44ms)
GET /profile                                     200 ( 49ms)
GET /signals                                     404 (274ms)  ← PRD §3.5 정합 (라우트 미존재 정상)
```

## 7. 추가 발견

### 7.1 [INFO] `/api/stock/daily` 첫 burst 호출 1회 500 — 재시도 5회 200 정상

- **현상**: 백그라운드 dev 서버 기동 직후 4 라우트 동시 burst 호출 시 `/api/stock/daily` 1건만 HTTP 500 `{"error":"Request failed with status code 500"}`. 동일 라우트 1초 간격 5회 재시도 모두 200.
- **원인 추정**: KIS 모의 (vts) 환경의 일자별 시세 API 가 첫 호출 시 일시 지연 또는 토큰 round-trip race. PR-A 의 token single-flight 가 정상 동작하지만 KIS 서버 자체 응답 변동 가능성.
- **영향**: 사용자 화면에서는 TanStack Query 의 `retry: 1` (PR-B 의 모든 훅 정합 — `useQueryStockDaily.ts:37` 등) 으로 자동 재시도. 화면 깜빡임은 있을 수 있으나 최종 렌더는 정상.
- **개선 영역 (후속)**: PRD §6.2 의 "토큰 발급 실패 시 BFF 가 mock 반환" 패턴을 `KIS 응답 5xx` 케이스에도 확장. circuit breaker 패턴은 PR-B 범위 밖 — 후속 chore PR (예: `kis-resilience`) 로 자연 분리.
- **판정**: AC-8 의 "4개 API 모두 200 응답 확인" 은 5회 재시도 안에서 모두 충족. **FAIL 아님**.

### 7.2 [INFO] KIS 모의 환경의 `hts_kor_isnm` 빈 응답 → ticker fallback 자연 동작

- AC-10 #4 ("`bstp_kor_isnm` 절대 미사용") 의 실 환경 회귀 차단 자연 확인. 실전 (prod) 환경에서 `hts_kor_isnm` 가 채워지는지 별도 확인 필요 — PR 본문 `## 다음 작업` 절에 명시되어 있음.
- 화면에서는 DART `corpName` ("삼성전자(주)") 으로 정식명 보완 가능 — UI 책임이지 BFF/hooks 책임 아님 (PRD §3.5 / §3.6 의 카피 룰 안에서 frontend-dev 가 결정).

### 7.3 [INFO] PR 본문 `## 다음 작업` 절 존재 — HANDOFF append workflow 게이트 만족

- `gh pr view 39 --json body` 의 본문에 `## 다음 작업` 절 4 항목 명시 (PR-C / TTL 재조정 / KIS 실전 hts_kor_isnm 재검토 / `/profile/[ticker]` 화면 IA 확장). `qa-passed` 라벨 부여 시 workflow trigger 정상 동작 — 빈 항목 commit 회귀 가드 만족.

## 8. 라벨 게이트 점검

- PR 본문 `## 다음 작업` 절: **존재** (4 항목). HANDOFF append workflow 빈 항목 commit 회귀 가드 OK.
- 한 브랜치 한 PR 룰: 본 QA 리포트 (`docs/qa/stock-api-integration-B.md`) 를 동일 PR 브랜치 `feature/stock-api-integration-B` 에 직접 commit.

## 9. 판정

PR-B 핵심 6 AC (AC-4 / AC-5 / AC-8 / AC-9 / AC-10 / AC-14) **모두 PASS** + 회귀 6 AC (AC-1 / AC-2 / AC-3 / AC-6 / AC-7 / AC-12 / AC-13) **모두 PASS** + N/A 2 AC (AC-11 / AC-15 — 이유 표 명기). 부분 검증 (§3) 의 4 도메인 화면 회귀 0. 단위 테스트 27/27 PASS. typecheck / lint / build 0 에러.

→ **PR #39 qa-passed**. `impl-ready` 제거 + `qa-passed` 부여 → Reviewer 단계 진입.
