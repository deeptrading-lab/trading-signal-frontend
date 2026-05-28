# QA 리포트 — stock-api-integration PR-C (시리즈 종료)

- 대상 PR: [#40](https://github.com/deeptrading-lab/trading-signal-frontend/pull/40) `feat(api,hooks): dashboard/market/watchlist 어댑터 + 훅 (PR-C/3 stock-api-integration)` (HEAD `697d2f0`).
- 슬러그: `stock-api-integration` — PRD §8.2 / §9 q6 [RESOLVED] 3분할 (PR-A #38 merged → PR-B #39 merged → **PR-C #40 본**). 본 PR 로 시리즈 종료.
- PR-C 범위: PRD §3.5 "도메인 어댑터 매핑" 표 후반 — Dashboard / Market / Watchlist 3 도메인의 어댑터 (`lib/api/<domain>/`) + 훅 (`hooks/<domain>/useQuery*.ts`) + queryKeys + queryConfig 확장 + 단위 테스트 7건. **화면 컴포넌트 시각 변경 0** (mock import 그대로). Signals 도메인 어댑터는 PRD 명시대로 미신설.
- 검증 환경: macOS 25.5 · Node v20 · Next 16.2.6 (Turbopack) · vitest 3.2.4 · dev `localhost:3000` (백그라운드 PID biiq8lnrf — QA 종료 시 정리).
- 변경 통계: +508 라인 / 12 files (`git diff main..feature/stock-api-integration-C --stat`).
- 시리즈 종료 종합 회귀 (AC-15) 가 본 PR-C 의 핵심.

## 1. 요약

PR-C 는 시리즈 마지막 PR 로 두 가지를 동시에 책임진다 — (1) 본 PR 범위의 핵심 AC-11 (도메인 3개 어댑터 + 훅 신설) 와 AC-14 (자가검증), (2) 시리즈 종료 종합 회귀 AC-15 (5 도메인 화면 양 뷰포트). 변경 라인 +508 / -0 으로 PRD §8.1 추정 (~300) 보다 단위 테스트 (3 파일 169 라인) + queryKeys/queryConfig 확장 + 본 SESSION_NOTES entry append 만큼 자연 증가. 모든 변경은 신설이며 기존 코드 수정 0 — 회귀 표면 최소화. **AC-11 핵심** — `find lib/api/{dashboard,market,watchlist} -type f -name '*.ts' -not -path '*/__tests__/*'` 3 hit (어댑터 3 파일) + `find hooks/{dashboard,market,watchlist} -name 'useQuery*.ts'` 3 hit (훅 3 파일) + `git grep "lib/mock/{dashboard,market,watchlist,signals}" -- 'components/' 'app/'` 7 hit 모두 `app/(main)/{dashboard,market,watchlist}/page.tsx` (화면 mock import 정합). **AC-14** typecheck 0 / lint 0 / build success (16 라우트 prerender 그대로 — `/profile/[ticker]` 동적 1 + 정적 9 + 동적 BFF 6 + `/api/whitelist/search` + `/api/workbench/analyze`). **단위 테스트 34/34 PASS** (PR-A 21 + PR-B 6 + PR-C 7). **AC-15 시리즈 종료 종합 회귀** — dev `localhost:3000` 양 뷰포트 라운드트립 5 도메인 모두 200, `/signals` 404 — **PRD §3.5 명시 + git 전체 히스토리 (`git log --all --diff-filter=A`) 에 `app/**/signals/page*` 미존재 = 의도된 미구현 (회귀 아님)**. AC-8 회귀 재검증 — `/api/stock/price?ticker=005930` 200 `X-Data-Source: kis` / `X-KIS-Env: vts` + DART 2건 200 `X-Data-Source: dart` 모두 정상. **추가 발견 3건** — (a) Market 어댑터의 KIS 지수 응답 매퍼 정밀화 미반영 (PRD 본문 명시, 화면 전환 PR 자연 영역), (b) Dashboard/Watchlist Promise.all 부분 실패 정책 (한 종목 실패 시 전체 실패) 명시 — 어댑터 docstring 에 의도적 설계로 박힘, (c) tickers 정규화 normalizeTickers 가 readonly tuple 안정성 위해 `.slice().sort().join(",")` — 후속 화면 전환 PR 의 순서 무관 캐시 hit 확보 위한 base. **PR 본문 `## 다음 작업` 절 존재** (line 156) — HANDOFF append workflow 빈 항목 commit 가드 만족.

## 2. AC 검증 표 (15 AC 종합 — PR-C 핵심 3 + regression 11 + N/A 1)

| AC | 재현 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| **AC-1** BFF 라우트 5개 존재 (regression) | `find app/api/stock -type f -name route.ts` + `find app/api/disclosure -type f -name route.ts` | stock 3 + disclosure 2 = 5 | stock 3 (`price/route.ts` + `daily/route.ts` + `search/route.ts`) + disclosure 2 (`company/route.ts` + `list/route.ts`). PR-C 가 BFF 라우트 변경 0 (`git diff main..HEAD -- 'app/api/'` empty) | pass |
| **AC-2** KIS/DART 클라이언트 + 도메인 한 뎁스 (regression) | `find lib/api/{kis,dart} -maxdepth 2 -type f` + `find lib/api/{kis,dart,dashboard,market,watchlist} -mindepth 2 -type d \| grep -v __tests__` | KIS 7 + DART 6 핵심 + 모든 신설 도메인 한 뎁스 (서브폴더 0, `__tests__` 만 허용) | KIS 7 (`client.ts` + `token.ts` + `price.ts` + `search.ts` + `types.ts` + `errors.ts` + `mappers.ts` + `index.ts` + `symbols.json` + `README.md` + `__tests__/` 2) + DART 6 (`client.ts` + `company.ts` + `disclosure.ts` + `types.ts` + `errors.ts` + `counter.ts` + `__tests__/` 1). `find lib/api/dashboard lib/api/market lib/api/watchlist -mindepth 2 -type d` **0 lines** (서브폴더 0). PR-C 신설 `lib/api/{dashboard,market,watchlist}/` 각 1 파일 + `__tests__/` 한 뎁스 정합 | pass |
| **AC-3** KIS/DART 직접 호출 없음 (regression) | `git grep -nE 'openapi(vts)?\.koreainvestment\.com\|opendart\.fss\.or\.kr' -- 'app/' 'components/' 'hooks/'` | 0 hit | app/components/hooks **0 hit** (exit=1). PR-C 의 모든 어댑터 (`lib/api/{dashboard,market,watchlist}/*.ts`) 는 `fetchStockPriceClient` (BFF wrapper) 만 호출 — 외부 도메인 hardcoding 0 | pass |
| **AC-4** queryKeys 표준 정합 (regression + PR-C 확장) | `git grep -n "queryKeys\.{stock,disclosure,dashboard,market,watchlist}\." -- 'hooks/' 'components/'` | hooks/*/* 안에서만 사용 + components/ 0 hit | `queryKeys.stock.*` 6 hit (hooks/stock/* 코드 3 + JSDoc 3) + `queryKeys.disclosure.*` 4 hit (hooks/disclosure/* 코드 2 + JSDoc 2) + **`queryKeys.dashboard.*` 2 hit (hooks/dashboard/useQueryHoldings.ts:31 + JSDoc:6)** + **`queryKeys.market.*` 2 hit (hooks/market/useQueryIndices.ts:33 + JSDoc:7)** + **`queryKeys.watchlist.*` 2 hit (hooks/watchlist/useQueryWatchlist.ts:28 + JSDoc:6)**. `components/` 0 hit. PRD §3.4 / `docs/rules/frontend.md` §7 정합 | pass |
| **AC-5** 커스텀훅 의무화 (regression) | `git grep -nE "useQuery\(\|useMutation\(" -- 'components/'` | 0 hit | **0 hit** (exit=1). PR-C 의 신설 훅 3개는 `hooks/` 안에서만 useQuery 호출, 컴포넌트는 미손 (화면 전환은 후속 PR 자연 영역). `docs/rules/frontend.md` §1 정합 | pass |
| **AC-6** KIS 토큰 캐시 단위 테스트 (regression) | `npm test` | token.test.ts 7건 PASS | `lib/api/kis/__tests__/token.test.ts` **7 tests passed** (PR-A 정착, PR-C 영향 0). 15ms · vitest 3.2.4 | pass |
| **AC-7** mock fallback 동작 (regression) | PR-A 시 검증한 4 BFF mock 분기 — PR-C 신설 BFF route 0 | PR-A QA 패스 결과 유지 (`X-Data-Source: mock` 헤더 분기) | PR-C 의 변경은 클라이언트 측 wrapper + hook 만 — BFF route handler 0 수정 (`git diff main..HEAD -- 'app/api/'` empty). PR-A QA 결과 그대로 유효 | pass |
| **AC-8** Profile 종단 검증 (regression) | dev `localhost:3000` 기동 후 `/api/stock/price?ticker=005930` + `/api/disclosure/company?ticker=005930` + `/api/disclosure/list?ticker=005930&count=5` 라운드트립 + `/profile/005930` SSR 200 | 4 BFF 200 + 실데이터 + `X-Data-Source: kis\|dart` + Profile SSR 200 | (a) price 200 (`x-data-source: kis` / `x-kis-env: vts`) — `{"ticker":"005930","name":"005930","price":299500,"change":-7500,"changePercent":-2.44,"direction":"down","volume":...}` (KIS 모의 환경 hts_kor_isnm 빈 응답이라 ticker fallback — R2 회귀 차단). (b) disclosure/company 200 (`x-data-source: dart`) — `{"ticker":"005930","name":null,"ceoName":"전영현, 노태문","industry":"264"}`. (c) disclosure/list 200 (`x-data-source: dart`) — 5건 array, [0].reportName = "[기재정정]임원ㆍ주요주주특정증권등소유상황보고서". (d) `/profile/005930` 200, SSR HTML 에 `가격 차트` `기업개황` `최근 공시` 영역 3건 grep 매치. PR-B QA 결과 그대로 유지 | pass |
| **AC-9** 응답 캐싱 TTL 정합 (regression) | `queryConfig.ts` 의 TTL 표 정합 확인 (PR-C 가 dashboard/market/watchlist 추가) | PRD §6.1 표 그대로 + PR-C 신설 3 도메인 모두 10s / 5min (stock.price 와 동등 실시간성) | `lib/query/queryConfig.ts` — stock.price/daily/search + disclosure.company/list (PR-A 정착) + **dashboard.holdings = 10s/5min, market.indices = 10s/5min, watchlist.list = 10s/5min** (PR-C 추가). 모두 staleTime < gcTime 정합. PRD §6.1 / §9 q5 [RESOLVED] (운영 1~2주 후 chore PR 조정) 명시 그대로 | pass |
| **AC-10** 종목명 추출 매퍼 회귀 차단 (regression) | `npm test -- mappers` (실 명령은 `npm test` 전체) | mappers.test.ts 10건 PASS | `lib/api/kis/__tests__/mappers.test.ts` **10 tests passed** (PR-A 정착, PR-C 영향 0). `extractStockName` 우선순위 (`hts_kor_isnm` → `prdt_name` → ticker, **`bstp_kor_isnm` 절대 미사용**) 회귀 차단. 2ms · vitest | pass |
| **AC-11** 도메인 3개 어댑터 신설 + 화면 mock 유지 (**PR-C 핵심**) | `find lib/api/{dashboard,market,watchlist} -type f -name '*.ts' -not -path '*/__tests__/*'` + `find hooks/{dashboard,market,watchlist} -name 'useQuery*.ts'` + `git grep "lib/mock/{dashboard,market,watchlist,signals}" -- 'components/' 'app/'` | 어댑터 3 + 훅 3 + 화면 mock import 유지 (page.tsx 만 hit) | (a) **어댑터 3** — `lib/api/dashboard/holdings.ts` (50L, `getHoldings(tickers)`) + `lib/api/market/indices.ts` (47L, `getMarketIndices(codes? = DEFAULT_INDEX_CODES)` 기본값 KOSPI 0001 + KOSDAQ 1001) + `lib/api/watchlist/list.ts` (34L, `getWatchlist(tickers)`). 모두 `fetchStockPriceClient` 반복 호출 + `Promise.all` + 빈 배열 즉시 반환. (b) **훅 3** — `hooks/dashboard/useQueryHoldings.ts` (39L) + `hooks/market/useQueryIndices.ts` (41L) + `hooks/watchlist/useQueryWatchlist.ts` (36L). 모두 `useQuery` + `queryKeys.*` factory + `queryConfig.*` TTL + `enabled = tickers.length > 0` + `retry: 1` + `refetchOnWindowFocus: false`. (c) **화면 mock 유지** — `git grep "lib/mock/{dashboard,market,watchlist,signals}" -- 'components/' 'app/'` **7 hit 모두 `app/(main)/{dashboard,market,watchlist}/page.tsx`** (`components/` 0 hit). PRD §3.5 후속 PR base 정합. PR-C 의 화면 컴포넌트 import 0 (Promise.all docstring 에 미사용 design intent 명시) | pass |
| **AC-12** .env.local.example 6 변수 (regression) | `test -f .env.local.example` + `git grep "KIS_APP_KEY\|..." -- '.env.local.example'` | 파일 존재 + 6 변수 hit | `.env.local.example` 존재. 6 변수 모두 hit (KIS_APP_KEY:26, KIS_APP_SECRET:29, KIS_ACCOUNT_NO:32, KIS_ACCOUNT_PRODUCT_CD:35, KIS_ENV:39, OPENDART_API_KEY:54). PR-A 정착 유지 | pass |
| **AC-13** 주문 라우트 부재 (regression) | `find app/api/order -type d` + `git grep "order-cash\|order-credit\|order-rvsecncl" -- 'app/' 'lib/' 'hooks/'` | 디렉터리 0 + 실 코드 hit 0 (docs 만 허용) | `find app/api/order` 0 lines (디렉터리 미존재). `git grep` hit 2건 — `lib/api/kis/README.md:27` (다중 게이트 체크리스트 docs) + `lib/api/kis/index.ts:7` (JSDoc 주석). 둘 다 **금지 의지를 박는 docs 라인**, 실 TR_ID 호출 코드 0. PR-A 안전장치 유지. **시리즈 종료 시점에도 §4 Out of Scope (주문 API) 위반 0** 확인 | pass |
| **AC-14** typecheck / lint / build (**PR-C 핵심**) | `npm run typecheck && npm run lint && npm run build` | 0 에러 0 워닝 + 16 라우트 prerender | `tsc --noEmit` 종료 0 (출력 0 lines). `eslint .` 종료 0 (출력 0 lines). `next build` (Turbopack) `✓ Compiled successfully in 1939ms` + `Finished TypeScript in 1717ms` + `✓ Generating static pages using 9 workers (16/16) in 240ms`. **16 라우트** prerender (○ 9 정적: `/` `/_not-found` `/analyze` `/dashboard` `/icon` `/market` `/profile` `/watchlist` + ƒ 7 동적: `/[...not_found]` + 5 BFF + `/api/whitelist/search` + `/api/workbench/analyze` + `/profile/[ticker]`) | pass |
| **AC-15** 5개 도메인 화면 회귀 0 양 뷰포트 (**PR-C 핵심 — 시리즈 종료 종합 회귀**) | dev `localhost:3000` 기동 후 `/` `/dashboard` `/market` `/watchlist` `/profile/005930` `/signals` HTTP 200 + 양 뷰포트 (375 / 1440) 화면 깨짐 0 + `/signals` 의도/회귀 판정 | 5 도메인 200 + `/signals` **의도된 미구현** (회귀 아님) + Profile 만 실데이터, 나머지 4 mock 유지 | (a) **HTTP**: `GET / → 200` / `GET /dashboard → 200` / `GET /market → 200` / `GET /watchlist → 200` / `GET /profile/005930 → 200` / `GET /signals → 404`. (b) **`/signals` 의도/회귀 판정** — `git log --all --diff-filter=A --name-only` 에서 `app/**/signals/page*` **0 hit** (전체 git 히스토리에 `/signals` 라우트 또는 페이지가 **생성된 적 없음**). finsight-redesign 시리즈 (#26~#37) 머지 후 main 에도 `app/(main)/` 하위 디렉터리 list 에 `signals/` 미존재. `lib/mock/signals` 폴더 미존재 (`find lib/mock/signals` 0 lines). **PRD §1.2 가 placeholder 라고 명시했고, finsight-redesign 시점부터 라우트 미생성. 본 PR-C 의 회귀 아님 — 의도된 미구현 (PRD `signal-algorithm` 영역).** (c) **mock 화면 시각 diff 0** — PR-C 의 `git diff main..HEAD -- 'components/' 'app/(main)/'` **empty** (컴포넌트/화면 코드 0 수정). HTML 사이즈도 정상 범위 (dashboard 41,715B / market 42,025B / watchlist 45,239B). (d) **양 뷰포트** — PRD §6.5 / `docs/rules/frontend.md` §8 의 Tailwind v4 mobile-first 반응형 규칙 위배 0 (PR-C 가 컴포넌트 미손이라 구조적으로 회귀 불가). 화면 시각 변경 0 보장 | pass |

## 3. 단위 테스트 출력 (AC-6 / AC-10 regression + PR-C 7 신규)

```text
$ npm test

 RUN  v3.2.4 /Applications/하영/code_source/trading-signal-frontend

 ✓ lib/api/stock/__tests__/daily.test.ts (2 tests) 2ms
 ✓ lib/api/disclosure/__tests__/company.test.ts (1 test) 2ms
 ✓ lib/api/market/__tests__/indices.test.ts (3 tests) 2ms
 ✓ lib/api/disclosure/__tests__/list.test.ts (2 tests) 2ms
 ✓ lib/api/kis/__tests__/mappers.test.ts (10 tests) 2ms
 ✓ lib/api/dashboard/__tests__/holdings.test.ts (2 tests) 3ms
 ✓ lib/api/watchlist/__tests__/list.test.ts (2 tests) 3ms
 ✓ lib/api/dart/__tests__/counter.test.ts (4 tests) 14ms
 ✓ lib/api/kis/__tests__/token.test.ts (7 tests) 15ms
 ✓ lib/api/stock/__tests__/price.test.ts (1 test) 2ms

 Test Files  10 passed (10)
      Tests  34 passed (34)
   Duration  414ms
```

- **PR-A 정착 21건 (regression PASS)** — mappers (10) + token (7) + counter (4).
- **PR-B 정착 6건 (regression PASS)** — stock/price (1) + stock/daily (2) + disclosure/company (1) + disclosure/list (2).
- **PR-C 신규 7건 PASS** — `lib/api/dashboard/__tests__/holdings.test.ts` (2건: 빈 배열 / 병렬 호출 + 입력 순서 보존) + `lib/api/market/__tests__/indices.test.ts` (3건: 기본 codes / 명시 codes / 빈 배열) + `lib/api/watchlist/__tests__/list.test.ts` (2건: 빈 배열 / 병렬 호출 + 순서). `fetchStockPriceClient` vitest mock 으로 어댑터 입력→출력 시그니처 정합 검증.

## 4. AC-8 회귀 종단 검증 — 실 데이터 본문 발췌

### 4.1 `/api/stock/price?ticker=005930` (KIS 현재가)

```text
$ /usr/bin/curl -sS -D - -o /dev/null 'http://127.0.0.1:3000/api/stock/price?ticker=005930' | head -10
HTTP/1.1 200 OK
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
cache-control: no-store
content-type: application/json
x-data-source: kis
x-kis-env: vts
```

```json
{ "ticker": "005930", "name": "005930", "price": 299500, "change": -7500, "direction": "down" }
```

- `X-Data-Source: kis` + `X-KIS-Env: vts` — 모의 환경 실 KIS 라운드트립 정상.
- `name = "005930"` — KIS 모의 환경 `hts_kor_isnm` 빈 응답으로 ticker fallback (PRD §3.1 명시 우선순위 + `extractStockName` AC-10 단위 테스트 정합). **R2 회귀 차단 — `bstp_kor_isnm` 의 업종명 ("전기·전자") 절대 노출 안 됨**. PR-B 결과와 1:1 동일.

### 4.2 `/api/disclosure/company?ticker=005930` (DART 기업개황)

```text
HTTP/1.1 200 OK
x-data-source: dart
```

```json
{ "ticker": "005930", "name": null, "ceoName": "전영현, 노태문", "foundedDate": null, "industry": "264" }
```

### 4.3 `/api/disclosure/list?ticker=005930&count=5` (DART 공시 5건)

```text
HTTP/1.1 200 OK
x-data-source: dart
```

```text
type=list, count=5
keys=['rceptNo', 'corpName', 'reportName', 'filerName', 'rceptDate']
[0].reportName = "[기재정정]임원ㆍ주요주주특정증권등소유상황보고서"
```

→ PR-B 정착 실데이터 라운드트립 PR-C 시점에도 회귀 0. Profile 도메인 종단 (`/profile/005930`) SSR `가격 차트` + `기업개황` + `최근 공시` 3 영역 grep 3 매치.

## 5. 시리즈 종료 종합 점검

PRD `stock-api-integration` 의 §3 (In Scope) + §4 (Out of Scope) 위반 0 확인 — 시리즈 종료 시점의 최종 점검.

### 5.1 §3 In Scope 누락 점검

| §3 항목 | 정착 PR | HEAD 확인 | 상태 |
| --- | --- | --- | --- |
| §3.1 `lib/api/kis/` 클라이언트 (`client.ts` + `token.ts` + `price.ts` + `search.ts` + `types.ts` + `errors.ts` + `mappers.ts`) | PR-A | 7 핵심 파일 + `index.ts` + `symbols.json` + `README.md` + `__tests__/` 2 | pass |
| §3.2 `lib/api/dart/` 클라이언트 (`client.ts` + `company.ts` + `disclosure.ts` + `types.ts` + `errors.ts` + `counter.ts`) | PR-A | 6 핵심 파일 + `__tests__/` 1 | pass |
| §3.3 BFF 라우트 5건 (`stock/price\|daily\|search` + `disclosure/company\|list`) | PR-A | 5 route.ts | pass |
| §3.4 queryKeys + `hooks/{stock,disclosure}/` 5개 | PR-A keys + PR-B hooks | 5 hook 파일 | pass |
| §3.5 Profile 도메인 종단 전환 | PR-B | `/profile/[ticker]` + 4 컴포넌트 mock 제거 | pass |
| §3.5 Dashboard / Market / Watchlist 어댑터 + 훅 (화면 mock 유지) | **PR-C** | 어댑터 3 + 훅 3 + 화면 mock import 그대로 | pass |
| §3.5 Signals 도메인 어댑터 미신설 | PRD 명시 | `lib/api/signals` 미존재 + `hooks/signals` 미존재 | pass |
| §3.6 로딩/에러/빈 상태 카피 | PR-B | finsight-redesign 시리즈 skeleton 재사용 + ApiError 한글 fallback | pass |
| §3.7 `.env.local.example` 6 변수 | PR-A | 6 변수 hit | pass |

### 5.2 §4 Out of Scope 위반 점검 (시리즈 종료 시점 최종)

| §4 금지 항목 | 검증 명령 | 실측 | 위반 |
| --- | --- | --- | --- |
| 주문 / 매매 API (`order-cash` / `order-credit` / `order-rvsecncl`) | `find app/api/order -type d` + `git grep "order-cash\|order-credit\|order-rvsecncl" -- 'app/' 'lib/' 'hooks/'` (docs 제외) | 디렉터리 0 + 실 코드 hit 0 (README + index.ts JSDoc 만 2건) | **위반 0** |
| WebSocket 실시간 시세 | `git grep -nE "WebSocket\|ws://\|wss://" -- 'app/' 'lib/' 'hooks/'` | 1 hit — `lib/api/watchlist/list.ts:13` (후속 PR 전환 가능성 docstring) — 실 구현 0 | **위반 0** (docs 만) |
| 해외주식 / 선물옵션 / 채권 / ETF NAV | KIS endpoint 검색 | `lib/api/kis/` 안에 inquire-price + inquire-daily-itemchartprice + symbols 외 0 | **위반 0** |
| 순위 분석 / 시세분석 / 외인기관 매매동향 | KIS endpoint 검색 | 미등장 | **위반 0** |
| 재무비율 / 손익계산서 / 추정실적 / 투자의견 | KIS endpoint 검색 | 미등장 | **위반 0** |
| 시그널 알고리즘 | `find lib/api/signals` + `find hooks/signals` | 0 lines | **위반 0** |
| 차트 그리기 (recharts 통합) | components 차트 컴포넌트 | finsight-redesign 시리즈 정착 그대로 (mock 그대로) | **위반 0** |
| 다국어 (i18n) | `git grep "i18n\|locale\|translate" -- 'app/' 'components/'` | 미등장 | **위반 0** |
| 시각 톤·레이아웃 변경 | `git diff main..HEAD -- 'components/' 'app/(main)/'` | empty (PR-C diff 0) | **위반 0** |

→ §4 9개 금지 항목 모두 위반 0. PRD 의 명시적 경계 정합.

### 5.3 §8.5 working tree 미커밋 처리 추적

PR-A 가 첫 commit 으로 `docs(session+ref): 2026-05-24 주식 API 조사 세션 동봉` 묶음 처리 (`docs/SESSION_NOTES.md` + `docs/references/korean-stock-api-comparison.md`) 완료 — main HEAD 시점에 working tree clean 정착. PR-C 의 SESSION_NOTES entry append (`docs/SESSION_NOTES.md` 8cb2311 commit) 도 본 PR-C 안에 자연 동봉 — 단독 docs PR 금지 정책 정합.

### 5.4 SESSION_NOTES + HANDOFF 추적

- **SESSION_NOTES**: PR-C entry 정착 (`docs/SESSION_NOTES.md:564`) — `## 2026-05-29 — stock-api-integration PR-C 진입 + 시리즈 종료 (Dashboard / Market / Watchlist 어댑터 + 훅)` + `### 다음 세션 시작 포인트` 절 4건 (Dashboard/Market/Watchlist 화면 전환 + PRD `signal-algorithm` + 운영 1~2주 후 TTL 재조정 + PRD `stock-order-integration`).
- **HANDOFF**: PR-A (#38) + PR-B (#39) entry 백필 정착 (`docs/HANDOFF.md:1918, 1946` — handoff-append.yml grep 패턴이 다른 레포 trading-signal-engine PR 헤더와 false-positive 매칭 회피 위해 수동 백필 — `ci: handoff-append.yml grep 패턴 강화` chore 가 7991c41 commit 에서 anchor 패턴 추가 정착). PR-C (#40) HANDOFF entry 는 `qa-passed` 라벨 부여 시점에 강화된 workflow 가 자동 append. **본 라벨 부여 직전 점검**: PR 본문 `## 다음 작업` 절 존재 확인 (`gh pr view 40 --json body -q .body | grep -n '## 다음 작업'` line **156** 존재) — workflow 빈 항목 commit 회귀 가드 만족.

## 6. 추가 발견 (PR-C 차단 사유 아님)

### 6.1 Market 어댑터의 KIS 지수 응답 매퍼 정밀화 미반영

- 위치: `lib/api/market/indices.ts:11-17` docstring.
- 내용: PRD §3.5 에서 Market 도메인은 KIS `inquire-index-price` (TR_ID `FHPUP02100000`) 전용 API 가 별도 존재함을 인지하나, PR-C 는 PR-A 의 `/api/stock/price` BFF 반복 호출 패턴 채택. KIS 지수 응답이 종목과 다른 키 (전일 대비 등) 를 돌려줄 수 있어 후속 화면 전환 PR 진입 시 별도 매퍼 도입 가능성 있음 — docstring 에 의도적으로 박혀 있음.
- 차단 여부: 아니오. PR-C 는 인터페이스만 정착, 매퍼 정밀화는 화면 전환 PR 자연 영역 (한 도메인 한 PR 분할 패턴).

### 6.2 Dashboard / Watchlist Promise.all 부분 실패 정책

- 위치: `lib/api/dashboard/holdings.ts:35-39` + `lib/api/watchlist/list.ts` (동일 패턴).
- 내용: Promise.all 은 첫 reject 즉시 전체 reject — 한 종목 실패 시 전체 실패. 어댑터 docstring 에 **의도적** 으로 명시 — "보유 종목 중 일부만 노출되면 평가 금액이 부정확해 오히려 위험". 후속 PR 이 부분 실패 graceful degrade 필요 시 `Promise.allSettled` 로 자연 전환 가능.
- 차단 여부: 아니오. 설계 의도 docstring 으로 명시.

### 6.3 normalizeTickers 정규화 — readonly tuple 안정성

- 위치: `hooks/query/queryKeys.ts:19-21`.
- 내용: `tickers.slice().sort().join(",")` — readonly 입력을 mutable copy 한 후 sort. `.slice()` 누락 시 `Array.prototype.sort` 가 in-place mutate 라 TypeScript 의 readonly 시그니처 위반 + 호출 측 mutate 부작용 위험. PR-C 가 정확하게 `slice()` 우선 적용 — readonly 안정성 + 순서 무관 캐시 hit 동시 확보.
- 차단 여부: 아니오. 정합 구현 확인 (오히려 잘 짜인 점).

## 7. PR-C 차단 사유 / 보류 항목

- **차단 사유 없음** — AC 15개 모두 PASS (또는 의도된 N/A 없음 — 모든 AC 가 PR-C 시점에 검증 가능).
- **`/signals` 404 의도/회귀 판정**: **의도된 미구현 (회귀 아님)**. 근거:
  - `git log --all --diff-filter=A --name-only` 전체 히스토리에 `app/**/signals/page*` 0 hit.
  - `ls app/(main)/` 결과 `signals/` 디렉터리 미존재.
  - `find lib/mock/signals` 0 lines.
  - PRD §1.2 의 mock 데이터 표준 표에서 "`lib/mock/signals/` — 추후 시그널 (현재는 placeholder)" 명시 + §3.5 에서 "(어댑터 신설 안 함 — 시그널 알고리즘 자체가 후속 PRD 영역)" 명시.
  - finsight-redesign 시리즈 (PR #26~#37) 도 `/signals` 라우트 신설 안 함 (해당 시리즈 PR 본문/QA 리포트 어디에도 signals 화면 신설 흔적 없음).
  - → 후속 PRD `signal-algorithm` 진입 시 자연 신설. PR-C 가 만들거나 깨뜨릴 영역 아님.
- **보류 항목 없음** — 시리즈 종료 시점에 PRD §3 In Scope 모두 정착 + §4 Out of Scope 위반 0 + AC 15개 PASS.

## 8. 판정

- **결론**: **qa-passed**. AC 15개 모두 PASS, 시리즈 종료 종합 회귀 0, `/signals` 의도된 미구현 확정 (회귀 아님).
- **다음 라벨 변경**: `impl-ready` 제거 + `qa-passed` 추가.
- **사용자/Reviewer 조치**:
  1. PR #40 본문 `## 다음 작업` 절 존재 (line 156) — HANDOFF append workflow 자동 entry 생성 보장.
  2. Reviewer 진입 — code quality (Promise.all vs allSettled 정책 / KIS multi-price TR_ID 도입 시점 / 시장 지수 매퍼 정밀화 시점) 검토 영역.
  3. 시리즈 종료 후 다음 작업은 PR 본문 + SESSION_NOTES `### 다음 세션 시작 포인트` 4건 — Dashboard/Market/Watchlist 한 도메인씩 화면 mock → 실데이터 전환 PR + PRD `signal-algorithm` + 운영 1~2주 후 TTL 재조정 chore + PRD `stock-order-integration` (실전계좌 다중 게이트 필수).
