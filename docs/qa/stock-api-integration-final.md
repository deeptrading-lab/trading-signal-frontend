# QA 리포트 — stock-api-integration 시리즈 종료 후 PRD 기반 최종 점검

- 대상: 시리즈 3 PR 머지 완료. PR-A (#38, `dc72d61`) + PR-B (#39, `efbe858`) + PR-C (#40, `8c56649`). main HEAD `8c56649` (PR #40 머지).
- 기준: `docs/prd/stock-api-integration.md` 전체 — AC 15건 + In Scope 9 항목 + Out of Scope + 비기능 §6.1~§6.5 + 영향 분석 §8 + OPEN QUESTION q1~q7 [RESOLVED] 반영.
- 분리된 3 QA 리포트 (`docs/qa/stock-api-integration-{A,B,C}.md` + `stock-api-integration-pr-b-roundtrip.md`) 는 각 PR 시점만 검증 — 본 리포트는 main `8c56649` 통합 시점에서 **모두 직접 재검증**.
- 사용자 메모 `feedback_merge-gate-procedure.md` 정합 — 분할 PR 시리즈 종료 후 PRD 기반 최종 점검 의무.
- 판정 결과 마지막 줄에 한 줄로.

---

## 1) PRD §5 AC 15건 통합 매트릭스 (main `8c56649` 직접 재검증)

| AC | 검증 명령 / 절차 | 기대 | 실측 | 결과 |
|----|------|------|------|------|
| **AC-1** 5 BFF 라우트 | `find app/api/stock app/api/disclosure -type f -name route.ts` | 5 라우트 | `stock/{price,daily,search}/route.ts` + `disclosure/{company,list}/route.ts` = 5 | **PASS** |
| **AC-2** 도메인 한 뎁스 | `find lib/api/kis lib/api/dart -mindepth 2 -type d` (`__tests__` 제외) | 0 라인 | 0 (서브 폴더 0). `lib/api/{dashboard,market,watchlist}` 도 한 뎁스 정합 | **PASS** |
| **AC-3** BFF 경유 | `git grep -nE 'openapi(vts)?\.koreainvestment\.com\|opendart\.fss\.or\.kr' -- app/ components/ hooks/` | 0 라인 | 0 라인. `lib/api/kis/client.ts:19-20` + `lib/api/dart/client.ts:16` (base URL 만) | **PASS** |
| **AC-4** queryKeys 표준 | `git grep -n 'queryKeys\.\(stock\|disclosure\)\.' -- hooks/ components/` | hooks 내부만 | `hooks/stock/*.ts` (3 hook) + `hooks/disclosure/*.ts` (2 hook) 만 호출. components 0 | **PASS** |
| **AC-5** 커스텀훅 의무 | `git grep -nE 'useQuery\(\|useMutation\(' -- components/` | 0 라인 | 0 라인. components 가 직접 TanStack Query 호출 없음 | **PASS** |
| **AC-6** 토큰 캐시 | `npm test` (vitest) — `lib/api/kis/__tests__/token.test.ts` 7 case (PRD 명세 4 case 이상) | 통과 | **7 tests pass** (single-flight + cache hit + grace period 갱신 + 만료 후 새 발급 + 멀티 env key + 동시 5건 dedupe + 에러 시 inflight 정리) | **PASS** |
| **AC-7** mock fallback | `KIS_APP_KEY="" OPENDART_API_KEY="" npm run build` + dev `curl -sI` | build 성공 + `X-Data-Source: mock` | build 성공. 5 라우트 모두 `x-data-source: mock` 200 응답 (price/daily/company/list/search 다 검증) | **PASS** |
| **AC-8** Profile 종단 (실데이터 라운드트립) | dev + `.env.local` 실키 + `curl /api/disclosure/company\|list\|stock/daily` | 실응답 한글 + 200 | DART `corpName:"삼성전자(주)"` + 공시 5건 (`20260526...` 등) + KIS 일자별 60일 (`2026-05-28 close:299500`) 정상 실데이터. SSR HTML 은 `'use client'` 자식 (TanStack Query) 라 hydration 후 렌더. ※ `/api/stock/price` 는 KIS 1분당 토큰 발급 제한 (EGW00133) — **upstream rate limit, 코드 회귀 X**, Korean msg + error_code detail 정상 통과 | **PASS** (※ KIS price 는 토큰 rate limit 시 한글 안내 노출 동작 확인) |
| **AC-9** TTL 정합 | `lib/query/queryConfig.ts` 단일 파일 + `grep queryConfig\\. hooks/*/` | 8 훅 모두 참조 | `useQueryStockPrice/Daily/Search` + `useQueryDisclosureCompany/List` + `useQueryHoldings/Indices/Watchlist` 8개 훅 모두 `queryConfig.<domain>.<key>.{staleTime,gcTime}` 참조. price 10s / daily 1d / search 5min / company 1d / list 5min — PRD §6.1 표 정합 | **PASS** |
| **AC-10** 종목명 매퍼 | `npm test` — `lib/api/kis/__tests__/mappers.test.ts` | 4 case (hts/prdt/ticker/업종명 절대X) | **10 tests pass** (4 PRD case + 추가 direction/숫자 파싱/날짜 포맷 회귀 차단) | **PASS** |
| **AC-11** 4 도메인 어댑터 + 화면 mock 유지 | `find lib/api/{dashboard,market,watchlist}` + `find hooks/...` + `git grep lib/mock/{dashboard,market,watchlist}/ -- components/ app/` | 어댑터 신설 + 화면 여전히 mock | `lib/api/{dashboard/holdings,market/indices,watchlist/list}.ts` + 3 useQuery 훅 + `app/(main)/{dashboard,market,watchlist}/page.tsx` 가 `lib/mock/*` import (어댑터 미사용) | **PASS** |
| **AC-12** `.env.local.example` | `test -f .env.local.example` + grep 6 변수 | 파일 존재 + 6 변수 | EXISTS (1618 bytes). KIS_APP_KEY/KIS_APP_SECRET/KIS_ACCOUNT_NO/KIS_ACCOUNT_PRODUCT_CD/KIS_ENV/OPENDART_API_KEY 6 변수 모두 등장 + 한글 주석 + KIS_TOKEN_STORE placeholder + FASTAPI_BASE_URL 보존 | **PASS** |
| **AC-13** 주문 라우트 부재 | `find app/api/order` + `git grep order-cash\|order-credit\|order-rvsecncl` | 0 디렉터리 + 0 코드 호출 | 디렉터리 0. `order-cash/credit/rvsecncl` 단어는 README + index.ts 의 **금지 안내 주석** 에만 등장 (2건). 실 호출 0 | **PASS** |
| **AC-14** typecheck / lint / build | `npm run typecheck && npm run lint && npm run build` | 0 에러 | typecheck 0 / lint 0 / build 성공 (16 routes 정상 prerender + dynamic). bundle Next.js 16.2.6 Turbopack. | **PASS** |
| **AC-15** 5 도메인 회귀 0 | mock-only `npm run dev` + 5 도메인 라우트 200 응답 + finsight-redesign 머지 시점 (main `4d48002`) 시각 무회귀 | 모두 200 + 시각 무회귀 | dev 서버 (mock-only) — `/dashboard` `/market` `/watchlist` `/profile/005930` 모두 200. Profile 시각은 새 컴포넌트지만 `/profile/[ticker]` 는 finsight-redesign 시점에 없던 신규 라우트 (PRD §3.5 정합). `/profile` (마이페이지) 는 mock 그대로 유지. nav + Header + 색 토큰 무회귀 (mock import 그대로 + Tailwind v4 design:sync 미동작). | **PASS** |

→ AC 15건 **모두 PASS**.

---

## 2) PRD §3 In Scope 9 항목 정착 여부

| 항목 | 검증 | 결과 |
|---|---|---|
| §3.1 KIS REST 클라이언트 `lib/api/kis/` | client.ts + token.ts + price.ts + search.ts + types.ts + errors.ts + mappers.ts + index.ts + README.md + symbols.json + __tests__/{token,mappers}.test.ts (10 파일 + 시드 1 + 테스트 2) | **PASS** |
| §3.2 OpenDART 클라이언트 `lib/api/dart/` | client.ts + company.ts + disclosure.ts + types.ts + errors.ts + counter.ts + __tests__/counter.test.ts (6 파일 + 테스트 1) | **PASS** |
| §3.3 BFF 라우트 `app/api/{stock,disclosure}/` | stock/{price,daily,search}/route.ts + disclosure/{company,list}/route.ts (5 라우트) | **PASS** |
| §3.4 TanStack Query 훅 + queryKeys | hooks/stock/* (3) + hooks/disclosure/* (2) + hooks/query/queryKeys.ts (stock/disclosure/dashboard/market/watchlist factory 5개 추가) | **PASS** |
| §3.5 도메인 어댑터 매핑 (Profile 종단 + 3 도메인 어댑터) | Profile 4 컴포넌트 (StockHeader/StockDailyChart/CompanyOverview/DisclosureList) 모두 훅 경유. Dashboard/Market/Watchlist 는 어댑터 + 훅 만 (화면 mock 유지) | **PASS** |
| §3.6 로딩 / 에러 / 빈 상태 카피 | `lib/copy/profile/stockDetail.ts` (STOCK_DETAIL_LOADING / STOCK_DETAIL_NOT_FOUND). `StockHeader.tsx:38-62` aria-busy / role="alert" / role="status" 처리 | **PASS** |
| §3.7 환경변수 6 변수 | `.env.local.example` + `.gitignore` 화이트리스트 추가 | **PASS** |
| 단위 테스트 34건 | vitest 10 test files, **34 tests passed** (token 7 + mappers 10 + counter 4 + stock price/daily 3 + disclosure company/list 3 + dashboard holdings 2 + market indices 3 + watchlist list 2) | **PASS** |
| `lib/query/queryConfig.ts` 단일 진실 원천 | 5 도메인 × {staleTime, gcTime} 상수 + 8 훅 모두 참조 | **PASS** |

→ 9 항목 **모두 PASS**.

---

## 3) PRD §4 Out of Scope 위반 0

| 비범위 항목 | 검증 명령 | 결과 |
|---|---|---|
| 주문 / 매매 API | `git grep order-cash\|order-credit\|order-rvsecncl -- app/ lib/ hooks/` → 2 매치 (README + index.ts **금지 안내 주석만**) | **PASS** |
| WebSocket 실시간 시세 | `git grep -i websocket lib/api/kis/ app/api/stock/ app/api/disclosure/ hooks/stock/ hooks/disclosure/` → 0 | **PASS** |
| 해외주식 / 선물옵션 / 채권 / ELW | `git grep -iE 'overseas\|futures\|elw\|nav' lib/api/kis/` → 0 | **PASS** |
| 순위 분석 / 시세분석 / 외인기관 매매동향 | 별도 엔드포인트 0 (KIS price/daily/search 3개만) | **PASS** |
| 재무비율 / 손익계산서 / 추정실적 / 투자의견 | KIS 30+ 종목정보 엔드포인트 0. DART `company` (기업개황) + `list` (공시 목록) 만 | **PASS** |
| Signals 어댑터 | `ls lib/api/` → signals 디렉터리 없음 | **PASS** |
| 차트 그리기 | Profile `StockDailyChart` 가 recharts AreaChart 사용 — **PRD §4 "차트 데이터까지만" 위반 가능성 검토**. recharts 자체는 finsight-redesign PR4/9 (`6ab9d24 chore(deps): recharts 3.8.1`) 시점 도입. 본 PRD 는 기존 deps 를 Profile 한 곳에서 첫 활용. 신설 컴포넌트 1개 + lib/charts/* 미신설 (토큰 중앙화는 후속 chore). → **PRD 허용 범위 (차트 데이터 + 기존 deps 재활용)** | **PASS** (recharts 토큰 중앙화는 후속 chore) |
| 종목 코드 → DART corp_code 매핑 표 | symbols.json 수동 시드 100개 (count_target 350, count_actual 100, 후속 chore 로 확장). PRD §9 q3 [RESOLVED] 정합 | **PASS** |
| 다국어 (i18n) 메시지 | `grep -rn i18n` → `lib/copy/*` 의 주석 (placeholder) 만, 실 i18n 라이브러리 0 | **PASS** |
| 시각 톤·레이아웃 변경 | finsight-redesign 머지 시점 (`4d48002`) Tailwind v4 + DESIGN.md v8 그대로. Profile `/profile/[ticker]` 는 신규 라우트라 기존 화면 무회귀. mock 유지 4 도메인 무변경 | **PASS** |

→ Out of Scope 위반 **0건**.

---

## 4) PRD §6 비기능 요구사항

| 절 | 항목 | 검증 | 결과 |
|---|---|---|---|
| §6.1 응답 캐싱 TTL | `lib/query/queryConfig.ts` price 10s / daily 1d / search 5min / company 1d / list 5min — PRD §6.1 표 정합. 8 훅 모두 참조 | **PASS** |
| §6.2 KIS 토큰 관리 | single-flight + grace period 60s + 메모리 캐시. AC-6 7 단위 테스트 통과. live 검증: 1분당 1회 발급 제한 (EGW00133) 에러 한글 통과 확인 | **PASS** |
| §6.3 DART 호출 모니터링 | `lib/api/dart/counter.ts` + AC-6 보조 counter.test.ts 4 case. `X-Dart-Quota-Warning` 헤더 (90% 도달) + `X-Data-Source: mock-quota-exceeded` (100% 초과) 둘 다 `app/api/disclosure/{company,list}/route.ts` 에 구현 | **PASS** |
| §6.4 보안 | `git grep NEXT_PUBLIC_(KIS\|OPENDART\|DART)` → 0. `components/ hooks/ app/(main)/` 에서 `process.env.KIS\|OPENDART` 직접 접근 0. 모든 환경변수는 서버 only (route handler + lib/api/*) | **PASS** |
| §6.5 회귀 차단 | typecheck / lint / build 0 에러 + 34 unit tests pass + mock fallback 5 라우트 200 | **PASS** |

→ §6 비기능 **모두 PASS**.

---

## 5) PRD §8 영향 분석 회귀 차단 R1~R6

| 위험 | mitigation | 검증 | 결과 |
|---|---|---|---|
| **R1** 토큰 동시 발급 race | single-flight Promise dedupe | `lib/api/kis/token.ts:46-47, 110-126` (`cache` + `inflight` Map) + token.test.ts "동시 5건 dedupe" 케이스 통과 | **PASS** |
| **R2** 종목명 / 업종명 혼동 | mappers.ts 우선순위 (`hts_kor_isnm` → `prdt_name` → ticker) + types.ts doc comment | mappers.test.ts 10 케이스 (특히 "bstp_kor_isnm 은 절대 종목명으로 사용 X" 회귀 차단) | **PASS** |
| **R3** mock fallback 무한 트리거 | 본 PRD 는 단순 fallback (circuit breaker 후속) | `lib/api/stock/price.ts:14` 코멘트로 `X-Data-Source: mock-timeout` 명시. 본 PRD 미도입 (PRD §8.3 단순 구현 명시) | **PRD 명시 미도입 — N/A** (후속 chore) |
| **R4** DART corp_code 매핑 누락 | symbols.json 시드 + 미존재 ticker 빈 응답 | `lib/api/kis/search.ts` substring 검색 + `getCorpCode(ticker)` (symbols.json 미등재 ticker 는 null 반환 → BFF route 가 빈 응답 + 한글 안내) | **PASS** |
| **R5** TTL 캐싱 장 시작 직전/직후 부정합 | TTL 10s 라 영향 미미 (후속 PRD 조정) | queryConfig.stock.price.staleTime = 10_000ms. PRD §6.1 정합 | **PASS** |
| **R6** 실전계좌 환경변수 오설정 | `X-KIS-Env` 응답 헤더 | `app/api/stock/{price,daily}/route.ts:45` `"X-KIS-Env": resolveKisEnv()` 박힘. live dev 응답 헤더에서 `x-kis-env: vts` 확인 | **PASS** |

→ R1, R2, R4, R5, R6 **PASS**. R3 는 PRD §8.3 가 "본 PRD 는 단순 구현" 명시한 의도된 N/A (후속 chore 영역).

---

## 6) §8.5 working tree 미커밋 처리

PRD §8.5 — 직전 세션 (2026-05-24) working tree 2건 (`docs/SESSION_NOTES.md` M + `docs/references/korean-stock-api-comparison.md` U) 을 별도 PR 금지 정책에 따라 본 시리즈 진입 PR 의 첫 commit 으로 묶을 의무.

| 파일 | PR-A 첫 commit 동봉 검증 | 결과 |
|---|---|---|
| `docs/SESSION_NOTES.md` | `git log dc72d61` → 첫 commit `docs(prd+session+ref): stock-api-integration PRD + 2026-05-24 주식 API 조사 세션 동봉` 안에 SESSION_NOTES 2026-05-28 entry append 동봉 | **PASS** |
| `docs/references/korean-stock-api-comparison.md` | 동일 첫 commit 으로 신설. 234 라인 리서치 산출물 | **PASS** |

→ §8.5 **PASS**. 단독 SESSION_NOTES PR 금지 정책 정합.

---

## 7) §9 OPEN QUESTION q1~q7 [RESOLVED] 반영 확인

| q | 결정 | 구현 검증 | 결과 |
|---|---|---|---|
| **q1** FDR 1차 제외 | symbols.json 수동 시드 | `git grep -iE 'fdr\|FinanceDataReader' -- lib/ app/ hooks/` → 0 | **PASS** |
| **q2** 토큰 메모리 only + 토글 placeholder | `KIS_TOKEN_STORE=memory\|kv` 인터페이스만 | `lib/api/kis/token.ts:13,30` 주석 + `.env.local.example:42` `KIS_TOKEN_STORE=memory` placeholder. 실 구현은 memory only | **PASS** |
| **q3** 수동 시드 350개 (1차 100개) | symbols.json `count_actual: 100`, `count_target: 350` | symbols.json `$meta` 100개 시드 (KOSPI/KOSDAQ 대형주 위주) + 후속 chore 로 확장 메모 | **PASS** (350 확장은 후속 chore) |
| **q4** placeholder + README 체크리스트 | `lib/api/kis/index.ts` 주석 + `lib/api/kis/README.md` 다중 게이트 6항목 | README.md:23-33 "주문 API — 본 모듈에서 절대 추가하지 마세요" + 6 게이트 (BFF route 다중 확인 / 비밀번호 재확인 / dry-run / 금액 상한 / audit log / 빌드 가드 검토) + 모의 환경 우선 검증 | **PASS** |
| **q5** TTL §6.1 표 그대로 + 단일 파일 | `lib/query/queryConfig.ts` | 5 도메인 × {staleTime, gcTime} 상수 정착 | **PASS** |
| **q6** 3 PR 분할 (A / B / C) | PR #38 / #39 / #40 모두 머지 | `git log --oneline | head -3` 으로 3 commit hash 확인 | **PASS** |
| **q7** substring fuzzy | symbols.json substring 검색 | `lib/api/kis/search.ts:51-52` `.toLowerCase().includes(needle)` 구현 (Fuse.js 미도입, 단순 substring) | **PASS** |

→ q1~q7 **모두 PASS**.

---

## 8) HANDOFF / SESSION_NOTES 정리 상태

| 항목 | 검증 | 결과 |
|---|---|---|
| HANDOFF.md #38 (PR-A) entry | `docs/HANDOFF.md:1918` "2026-05-28 — feat(api,bff): KIS+DART 클라이언트 + 5 BFF 라우트 인프라 (PR-A/3 stock-api-integration) (#38)" + backfill 메모 | **PASS** (※ workflow grep false-positive 로 자동 append 실패 후 수동 backfill) |
| HANDOFF.md #39 (PR-B) entry | `docs/HANDOFF.md:1946` "2026-05-29 — feat(profile): /profile/[ticker] 종목 상세 + stock/disclosure 훅 (PR-B/3)" + backfill 메모 | **PASS** (※ 동일 grep false-positive 두 번째) |
| HANDOFF.md #40 (PR-C) entry | `docs/HANDOFF.md:1975` "2026-05-29 — feat(api,hooks): dashboard/market/watchlist 어댑터 + 훅 (PR-C/3, **시리즈 종료**)" + backfill 메모 (자체 레포 옛 PR #40 충돌, 세 번째) | **PASS** (※ 세 번째 false-positive — 패턴 다양화로 절대 우선순위 chore 명시) |
| SESSION_NOTES.md 시리즈 진입 entry | `docs/SESSION_NOTES.md:483` "2026-05-28 — stock-api-integration PRD 작성 + PR-A 진입" | **PASS** |
| SESSION_NOTES.md PR-B entry | `:522` "2026-05-29 — stock-api-integration PR-B 진입 (Profile 종단 전환)" | **PASS** |
| SESSION_NOTES.md 시리즈 종료 entry | `:564` "2026-05-29 — stock-api-integration PR-C 진입 + 시리즈 종료" | **PASS** |

→ HANDOFF / SESSION_NOTES 모두 정착. **단, `handoff-append.yml` workflow 가 시리즈 동안 3회 false-positive 매칭 → 절대 우선순위 후속 chore 로 §9 에 기록**.

---

## 9) 후속 작업 우선순위 정리

PRD §10 "다음 작업" + 시리즈 중 발견된 chore / note + reviewer 코멘트 종합.

| 우선순위 | 항목 | 출처 / 근거 |
|---|---|---|
| **절대 우선** | `handoff-append.yml` grep 패턴 강화 (PR URL anchor 기반) | 시리즈 3회 false-positive (PR-A: 다른 레포 #38 / PR-B: 다른 레포 #39 / PR-C: 자체 레포 옛 #40 — 패턴 다양화). HANDOFF.md:1998 명시. `7991c41 ci: handoff-append.yml grep 패턴 강화` (PR #37 시점) 이미 1차 시도했으나 패턴 다양화로 재발 |
| 높음 | symbols.json 350 풀 시드 확장 (DART CORPCODE.xml 자동 가져오기) | PR-A reviewer N-1 + PRD §9 q3 [RESOLVED] "350개 목표, 1차 100개" |
| 높음 | Dashboard 화면 mock → 실데이터 (`useQueryHoldings` + KIS multi-price) | PRD §10 "다음 작업" |
| 높음 | Market 화면 mock → 실데이터 (`useQueryIndices` + KIS 시장지수 API) | PRD §10 |
| 높음 | Watchlist 화면 mock → 실데이터 (`useQueryWatchlist` + localStorage 영구화) | PRD §10 |
| 중간 | BFF route 5개 중복 추출 (`lib/api/utils/bffResponse.ts`) | PR-A reviewer N-2 (X-Data-Source / Cache-Control 반복) |
| 중간 | recharts 토큰 중앙화 (`lib/charts/*`) | PR-B reviewer note (Profile StockDailyChart 가 재활용 가능 토큰 인라인) |
| 중간 | `[ticker]` 동적 라우트 정규식 가드 (6자리 숫자만) | PR-B reviewer note (`/profile/abc` 등 비정상 ticker 시 빈 응답 대신 404) |
| 중간 | `components/workbench/EmptyState.tsx:5` 주석 정정 (`{colors.secondary}` → `{colors.text-muted}`) | PR #20 reviewer nit (palette-modernization), 본 시리즈 손대지 않은 영역 |
| 중간 | KIS 토큰 첫 발급 시 axios 500 raw 메시지 한글 fallback | AC-8 live 검증 중 `Request failed with status code 500` 노출 — `lib/api/kis/token.ts:140-147` 의 catch 블록이 raw `error.message` 통과. EGW00133 등 KIS 응답 envelope 는 정상 통과하나 axios 자체 5xx 는 한글 fallback 누락 |
| 낮음 | 1~2주 운영 후 §6.1 TTL 재조정 (X-Data-Source 분포 + KIS 응답 시간) | PRD §10 + §9 q5 [RESOLVED] 메모 |
| 낮음 | Vercel 연동 (`project_vercel-deferred.md` 정합) | 사용자 메모 — finsight-redesign 시리즈 + 본 시리즈 종료 시점 |
| **후속 PRD** | `signal-algorithm` — Signals 도메인 시그널 알고리즘 | PRD §10 + Out of Scope |
| **후속 PRD** | `stock-order-integration` — 실전계좌 다중 게이트 의무 (§9 q4 README 체크리스트 적용) | PRD §10 + Out of Scope |
| **후속 PRD** | `realtime-quote-websocket` — KIS WS 30+ 채널 | PRD §10 + Out of Scope |
| 후속 PRD | `historical-data-fdr` — Python 인프라 결정 (q1 [RESOLVED] 분리 명시) | PRD §9 q1 후속 메모 |

---

## 10) 검증 명령 출력 — 핵심 부록

### 10.1 `npm test` 34건 통과

```
Test Files  10 passed (10)
     Tests  34 passed (34)
  Start at  01:09:36
  Duration  593ms

✓ lib/api/disclosure/__tests__/list.test.ts (2)
✓ lib/api/market/__tests__/indices.test.ts (3)
✓ lib/api/disclosure/__tests__/company.test.ts (1)
✓ lib/api/stock/__tests__/daily.test.ts (2)
✓ lib/api/kis/__tests__/mappers.test.ts (10)
✓ lib/api/dashboard/__tests__/holdings.test.ts (2)
✓ lib/api/watchlist/__tests__/list.test.ts (2)
✓ lib/api/dart/__tests__/counter.test.ts (4)
✓ lib/api/kis/__tests__/token.test.ts (7)
✓ lib/api/stock/__tests__/price.test.ts (1)
```

### 10.2 `npm run build` 16 routes

```
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 2.4s
✓ Generating static pages using 9 workers (16/16) in 318ms

ƒ /api/disclosure/company
ƒ /api/disclosure/list
ƒ /api/stock/daily
ƒ /api/stock/price
ƒ /api/stock/search
ƒ /profile/[ticker]
○ /dashboard / /market / /profile / /watchlist
```

### 10.3 mock fallback dev (5 routes 200 + X-Data-Source: mock)

```
KIS_APP_KEY="" KIS_APP_SECRET="" OPENDART_API_KEY="" PORT=3010 npm run dev

GET /api/stock/price?ticker=005930        → 200 / x-data-source: mock
GET /api/stock/daily?ticker=005930&period=D → 200 / x-data-source: mock
GET /api/stock/search?keyword=samsung     → 200 / x-data-source: mock
GET /api/disclosure/company?ticker=005930 → 200 / x-data-source: mock
GET /api/disclosure/list?ticker=005930&count=5 → 200 / x-data-source: mock
```

### 10.4 real BE 라운드트립 (.env.local + 실키)

```
GET /api/disclosure/company?ticker=005930 → 200 / x-data-source: dart
  → {"ticker":"005930","corpName":"삼성전자(주)","ceoName":"전영현, 노태문",
      "market":"KOSPI","establishedDate":"1969-01-13","industry":"264",
      "homepage":"www.samsung.com/sec","address":"경기도 수원시 영통구..."}

GET /api/disclosure/list?ticker=005930&count=5 → 200 / x-data-source: dart
  → [{"rceptNo":"20260526000244","corpName":"삼성전자",
       "reportName":"[기재정정]임원ㆍ주요주주특정증권등소유상황보고서",
       "filerName":"조미선","rceptDate":"2026-05-26"}, ...]

GET /api/stock/daily?ticker=005930&period=D → 200 / x-data-source: kis / x-kis-env: vts
  → [{"date":"2026-05-28","open":305000,"high":306500,"low":287500,
       "close":299500,"volume":30195334}, ...]

GET /api/stock/search?keyword=samsung → 200 / x-data-source: seed
  → x-symbols-count: 100 / x-symbols-version: 0.1.0

GET /api/stock/price?ticker=005930 → 200 / x-data-source: kis
  → {"error":"접근토큰 발급 잠시 후 다시 시도하세요(1분당 1회)",
      "detail":{"error_code":"EGW00133"}}
     ※ KIS 1분당 1회 토큰 발급 제한 (upstream rate limit). 한글 msg + error_code detail 정상 통과.
```

### 10.5 BFF 원칙 무회귀

```
git grep -nE 'http://127\.0\.0\.1' -- app/ components/ hooks/ lib/
  → app/api/whitelist/search/route.ts:11 (FASTAPI_BASE_URL fallback, server-only)
  → app/api/workbench/_adapters/fastapi.ts:32 (server-only)
  ※ route handler fallback 만, 클라이언트 직접 호출 0
```

---

## 판정

- AC 15/15 PASS, In Scope 9/9, Out of Scope 위반 0, 비기능 §6.1~§6.5 모두 PASS, 회귀 차단 R1·R2·R4·R5·R6 PASS (R3 는 PRD 명시 N/A), §8.5 working tree 동봉 PASS, q1~q7 [RESOLVED] 모두 반영, HANDOFF / SESSION_NOTES 3 PR entry 정착.
- 발견된 신규 이슈: (a) KIS 토큰 첫 axios 5xx raw 메시지 한글 fallback 누락 (중간 우선순위 후속) — 후속 chore 로 처리, 본 시리즈 회귀 X.

**시리즈 종료 최종 점검 결과: PASS**

절대 우선 chore: `handoff-append.yml` grep 패턴 PR URL anchor 기반 강화 (3회 false-positive 재발). 후속 PRD: `signal-algorithm` / `stock-order-integration` / `realtime-quote-websocket`.
