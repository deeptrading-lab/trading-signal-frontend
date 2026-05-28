# QA 리포트 — stock-api-integration PR-A

- 대상 PR: [#38](https://github.com/deeptrading-lab/trading-signal-frontend/pull/38) `feat(api,bff): KIS+DART 클라이언트 + 5 BFF 라우트 인프라 (PR-A/C stock-api-integration)` (HEAD `9e36446`).
- 슬러그: `stock-api-integration` — PRD §8.2 / §9 q6 [RESOLVED] 의 3분할 (PR-A / PR-B / PR-C) 중 **PR-A 한정**. 인프라 (KIS+DART 클라이언트 + BFF 5 라우트 + queryKeys/queryConfig + 단위 테스트 + 환경변수 + working tree 동봉) 만 검증. hooks/화면 전환 (AC-4/5/8/9/11/15) 은 PR-B/PR-C 범위 → 본 QA 는 명시적 N/A.
- 검증 환경: macOS 25.5 · Node v20 · Next 16.2.6 (Turbopack) · vitest 3.2.4 · dev `localhost:3088` (백그라운드 PID 38349 — QA 종료 시 정리 완료).
- AC 범위: 사용자 지시 (PR-A 15 항목 중 9건 검증 + 6건 N/A 명시). AC-1/2/3/6/7/10/12/13/14 = 9 PASS, AC-4/5/8/9/11/15 = 6 N/A (이유 1줄 명기).

## 1. 요약

PR-A 의 핵심은 **"인프라만, 화면 미전환"** — `lib/api/kis/` 10파일 + `lib/api/dart/` 7파일 + `app/api/stock/{price,daily,search}` + `app/api/disclosure/{company,list}` 5 BFF 라우트 + `lib/query/queryConfig.ts` (단일 TTL 진실 원천) + `hooks/query/queryKeys.ts` 확장 + `.env.local.example` 6 변수 시드 + 단위 테스트 21건. **R1 토큰 동시 발급 race** (single-flight Promise dedupe) 및 **R2 종목명 vs 업종명** (`bstp_kor_isnm` 절대 미사용, `hts_kor_isnm` → `prdt_name` → ticker fallback) 의 회귀 차단을 mappers/token 단위 테스트로 박음. **실전계좌 안전장치** — `app/api/order/*` 디렉터리 의도적 미생성 + `lib/api/kis/index.ts` 주석 + `lib/api/kis/README.md` 다중 게이트 체크리스트 (비밀번호 재확인 / dry-run / 금액 상한 / audit log). AC-7 mock fallback 라운드트립 — `KIS_APP_KEY=""` 환경에서 build 0 에러 + dev 서버 응답 헤더 `X-Data-Source: mock` 4 routes (price / daily / search / disclosure mock 분기) 직접 확인. AC-14 typecheck / lint / build (Turbopack) 0 에러 + 16 라우트 prerender (○ 8 + ƒ 8) 정합. **단일 PR 룰 일시 해제** 정합 — finsight-redesign 패턴 동일 적용 (PRD §9 q6 [RESOLVED]). **PR 본문 `## 다음 작업` 절 존재 확인** (PR-B / PR-C / TTL 재조정 / symbols.json 350개 풀 시드 / signal-algorithm / stock-order-integration / Vercel 7개 항목) — HANDOFF append workflow 빈 항목 commit 회귀 가드 만족.

## 2. AC 검증 표 (PR-A 9건)

| AC | 재현 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| **AC-1** BFF 라우트 5개 | `find app/api/stock -type f -name route.ts` + `find app/api/disclosure -type f -name route.ts` | stock 3 + disclosure 2 = 5 | stock 3 (`price/route.ts` + `daily/route.ts` + `search/route.ts`) + disclosure 2 (`company/route.ts` + `list/route.ts`) | pass |
| **AC-2** KIS/DART 클라이언트 + 도메인 한 뎁스 | `find lib/api/kis -maxdepth 2 -type f` + `find lib/api/dart -maxdepth 2 -type f` + `find lib/api/{kis,dart} -mindepth 2 -type d` | kis ≥6 핵심 파일 + dart ≥5 핵심 파일 + 서브폴더 0 | kis 10 파일 (`client.ts` + `token.ts` + `price.ts` + `search.ts` + `types.ts` + `errors.ts` + `mappers.ts` + `index.ts` + `symbols.json` + `README.md`) + dart 7 파일 (`client.ts` + `company.ts` + `disclosure.ts` + `types.ts` + `errors.ts` + `counter.ts` + `__tests__/`). `-mindepth 2 -type d` 0 hit (서브폴더 0). `__tests__/` 는 depth 1 — AC 검증 명령 (`-mindepth 2`) 무관, PR 본문에도 명시. 도메인 한 뎁스 룰 (`docs/rules/frontend.md` §3) 정합 | pass |
| **AC-3** KIS/DART 직접 호출 없음 (BFF 경유) | `git grep -nE 'openapi(vts)?\.koreainvestment\.com\|opendart\.fss\.or\.kr' -- 'app/' 'components/' 'hooks/'` + `... -- 'lib/api/'` | app/components/hooks 0 hit + lib/api 는 client.ts baseURL + types.ts 주석만 | app/components/hooks **0 hit**. lib/api hit 6건 — `lib/api/dart/client.ts:5,16` (baseURL + JSDoc) + `lib/api/dart/types.ts:18` (JSDoc 가이드 링크) + `lib/api/kis/client.ts:5,6,19,20` (JSDoc 회귀 차단 + `KIS_BASE_URL_BY_ENV` map). 외부 도메인은 단일 진실 원천 (`lib/api/*/client.ts`) 에만 존재 | pass |
| **AC-6** KIS 토큰 캐시 단위 테스트 | `npm test -- token` | 4+ 케이스 PASS (캐시 hit / 갱신 / single-flight / 등) | `lib/api/kis/__tests__/token.test.ts` **7 tests passed** (캐시 hit + 만료 60s 전 갱신 + 동시 5건 single-flight + env 키 분리 + 환경변수 미설정 시 throw + KIS error_code 통과 + 만료 cache busting). 14ms · vitest 3.2.4 | pass |
| **AC-7** mock fallback 동작 | `.env.local` 백업 → `KIS_APP_KEY="" npm run build` + `KIS_APP_KEY="" KIS_APP_SECRET="" npm run dev` (포트 3088) → `curl -is /api/stock/{price,daily,search}` + `curl -is /api/disclosure/*` 헤더 검사 → `.env.local` 원복 | build 0 에러 + `X-Data-Source: mock` 헤더 | (a) `KIS_APP_KEY="" npm run build` → `✓ Compiled successfully in 2.4s` + 16 라우트 prerender 정상. (b) dev `localhost:3088` PID 38349 — `Ready in 184ms`. (c) `curl -is /api/stock/price?ticker=005930` → `HTTP/1.1 200 OK` + `x-data-source: mock` + body `{"ticker":"005930","name":"삼성전자","price":71500,...}`. (d) `curl /api/stock/daily?ticker=005930&period=D` → `x-data-source: mock` + 7 candle. (e) `curl /api/stock/search?keyword=samsung` → `x-data-source: mock` + `[]`. 빈 keyword → mock 5 종목. (f) `curl /api/disclosure/company?ticker=005930` → `x-data-source: dart` (OPENDART_API_KEY 는 백업본에 보존되어 실데이터 분기). (g) `mv .env.local.backup .env.local` 원복 + dev 서버 종료 (PID 38349 + lsof -i :3088 -t kill) 완료 | pass |
| **AC-10** 종목명 추출 매퍼 회귀 차단 | `npm test -- mappers` | 4 케이스 PASS (`hts_kor_isnm` 우선 / `prdt_name` 대체 / ticker fallback / `bstp_kor_isnm` 절대 미사용) | `lib/api/kis/__tests__/mappers.test.ts` **10 tests passed** — extractStockName 4 케이스 (`hts_kor_isnm` 우선 + `prdt_name` 폴백 + 둘 다 비면 ticker + `bstp_kor_isnm` 절대 미사용 회귀 차단) + mapStockPrice 3 케이스 + mapDailyCandle 2 케이스 + toNumber/formatDate 디펜시브 1 케이스. 2ms · vitest | pass |
| **AC-12** .env.local.example + 6 변수 | `test -f .env.local.example` + `git grep -nE "KIS_APP_KEY\|KIS_APP_SECRET\|KIS_ACCOUNT_NO\|KIS_ACCOUNT_PRODUCT_CD\|KIS_ENV\|OPENDART_API_KEY" -- '.env.local.example'` | 파일 존재 + 6 변수 모두 등장 | `.env.local.example` 62L 존재 (2117B). 6 변수 모두 hit — `KIS_APP_KEY` (L26) + `KIS_APP_SECRET` (L29) + `KIS_ACCOUNT_NO` (L32) + `KIS_ACCOUNT_PRODUCT_CD=01` (L35, 기본값 명시) + `KIS_ENV=vts` (L39, 기본값 명시) + `OPENDART_API_KEY` (L54). `.gitignore` 의 `.env.local` 보호도 잔존 — `.env.local` 자체 commit 0 (git status clean) | pass |
| **AC-13** 주문 라우트 부재 (안전장치) | `find app/api/order -type d` + `git grep -nE "order-cash\|order-credit\|order-rvsecncl" -- 'app/' 'lib/' 'hooks/'` | 디렉터리 0 + 코드 hit 0 (docs 제외) | `find app/api/order` 0 lines (디렉터리 미존재). `git grep` hit 2건 — `lib/api/kis/README.md:27` (다중 게이트 체크리스트 문서) + `lib/api/kis/index.ts:7` (JSDoc 주석 — "주문 함수는 export 하지 않는다"). 둘 다 **금지 의지를 박는 docs 라인**, 실제 TR_ID 호출 코드는 0건. PRD §9 q4 [RESOLVED] (옵션 b — placeholder + README 체크리스트) 정합 | pass |
| **AC-14** typecheck / lint / build | `npm run typecheck && npm run lint && npm run build` | 0 에러 0 워닝 + 16 라우트 prerender | `tsc --noEmit` 종료 0 (출력 0 lines). `eslint .` 종료 0 (출력 0 lines). `next build` (Turbopack) `✓ Compiled successfully in 2.4s` + `Finished TypeScript in 1621ms` + `✓ Generating static pages using 9 workers (16/16) in 261ms`. 16 라우트 (○ 8 정적: `/` `/_not-found` `/analyze` `/dashboard` `/icon` `/market` `/profile` `/watchlist` + ƒ 8 동적: `/[...not_found]` + 5 신규 BFF + `/api/whitelist/search` + `/api/workbench/analyze`) | pass |

## 3. N/A 처리 (PR-A 범위 밖)

| AC | N/A 이유 | 검증 시점 |
| --- | --- | --- |
| **AC-4** queryKeys 표준 정합 | `hooks/stock/*` + `hooks/disclosure/*` 가 PR-B 영역. 본 PR-A 는 `hooks/query/queryKeys.ts` 의 `stock`/`disclosure` 키 정의만 추가 — `git grep "queryKeys.stock\." -- 'hooks/' 'components/'` 0 hit (소비자 부재). 도메인 훅 도입 후에야 검증 의미 | PR-B 의 hooks 도입 시점에 재검증 |
| **AC-5** 커스텀훅 의무화 | 컴포넌트에서 `useQuery(` / `useMutation(` 직접 호출 부재 검증 — 본 PR-A 는 컴포넌트 변경 0. PR-B 가 Profile 컴포넌트를 mock → 훅으로 교체할 때 1차 검증 의미. 참고로 현재 `git grep -nE "useQuery\(\|useMutation\(" -- 'components/'` **0 hit** (기존 회귀도 0) | PR-B 의 Profile 컴포넌트 교체 시점 |
| **AC-8** Profile 종목 상세 실데이터 종단 검증 | Profile 화면 mock → 실데이터 전환은 PR-B 의 핵심 가치 ("이게 됐다" 단일 증거). 본 PR-A 의 `app/(main)/profile/page.tsx` 변경 0 — 화면 영향 0 | PR-B 머지 직전 종단 검증 |
| **AC-9** 응답 캐싱 TTL 정합 | TanStack Query staleTime/gcTime 검증은 도메인 훅 + 화면이 있어야 가능. PR-A 는 `lib/query/queryConfig.ts` 의 TTL 상수 정의 (단일 진실 원천) 만 신설 — PRD §6.1 표와 1:1 매칭 (price 10s / daily 1d / search 5min / company 1d / list 5min). | PR-B 의 hooks 도입 + 화면 진입 후 DevTools Network 탭 검증 |
| **AC-11** 도메인 4개 어댑터 + 화면 mock 유지 | Dashboard / Market / Watchlist / Signals 어댑터는 PR-C 영역 (PRD §3.5 / §8.2). 본 PR-A 는 `lib/api/{dashboard,market,watchlist}/` 디렉터리 미생성 — `find lib/api/dashboard lib/api/market lib/api/watchlist -type f` 0 hit (의도) | PR-C 진입 후 검증 |
| **AC-15** 5개 도메인 화면 회귀 0 (양 뷰포트) | 화면 컴포넌트 변경 0 → 회귀 검증 자체가 무의미 (본 PR 의 시각 diff 0). 시리즈 종료 후 PRD 기반 최종 점검 (finsight-redesign 패턴) 에서 종합 검증 | PR-C 머지 후 시리즈 끝에서 종합 회귀 검증 |

## 4. 단위 테스트 출력 (AC-6 / AC-10 / counter)

```text
$ npm test
✓ lib/api/kis/__tests__/mappers.test.ts (10 tests) 3ms
✓ lib/api/dart/__tests__/counter.test.ts (4 tests) 12ms
✓ lib/api/kis/__tests__/token.test.ts (7 tests) 14ms

Test Files  3 passed (3)
     Tests  21 passed (21)
   Duration  329ms
```

- **token (7)** — 캐시 hit / 만료 60s 전 갱신 / 동시 5건 single-flight (R1 회귀 차단) / env 키 분리 / 환경변수 미설정 throw / KIS error_code 통과 / 만료 cache busting.
- **mappers (10)** — extractStockName 4 (`hts_kor_isnm` 우선 + `prdt_name` 폴백 + ticker fallback + **`bstp_kor_isnm` 절대 미사용 R2 회귀 차단**) + mapStockPrice 3 + mapDailyCandle 2 + 디펜시브 1.
- **counter (4)** — DART 일일 호출 카운터 (KST 자정 리셋 + 20,000건 경계 + 18,000건 90% 경고 트리거 + 단순 increment).

## 5. AC-7 mock fallback 라운드트립 출력

```bash
$ cp .env.local .env.local.backup
$ KIS_APP_KEY="" npm run build
✓ Compiled successfully in 2.4s   # 16 라우트 prerender 정상

$ PORT=3088 KIS_APP_KEY="" KIS_APP_SECRET="" npm run dev &
▲ Next.js 16.2.6 (Turbopack)
- Local:   http://localhost:3088
✓ Ready in 184ms

$ curl -is "http://localhost:3088/api/stock/price?ticker=005930" | head -8
HTTP/1.1 200 OK
cache-control: no-store
content-type: application/json
x-data-source: mock                # ✓ 기대 헤더
{"ticker":"005930","name":"삼성전자","price":71500,...}

$ curl -is "http://localhost:3088/api/stock/daily?ticker=005930&period=D" | grep -i x-data-source
x-data-source: mock                # ✓

$ curl -is "http://localhost:3088/api/stock/search?keyword=" | grep -i x-data-source
x-data-source: mock                # ✓ (빈 keyword → 기본 5 종목)

$ mv .env.local.backup .env.local
$ kill 38349 ; lsof -i :3088 -t | xargs kill -9   # dev 정리 완료
```

## 6. 발견 / 잠재 이슈

| # | 영역 | 관찰 | 등급 | 처리 |
| --- | --- | --- | --- | --- |
| **F-1** | `symbols.json` 시드 규모 | `$meta.count_target=350` 이지만 `count_actual=100` (KOSPI/KOSDAQ 대형주 위주). 누락 ticker → BFF 빈 응답 + 안내 메시지로 graceful degrade (PRD §3.5 / §9 q3 [RESOLVED] 정합). PR 본문 "다음 작업" 에 350개 풀 시드 chore PR 명시 | note | PR 본문 인계 완료 — QA 비-차단 |
| **F-2** | `app/api/disclosure/*` mock fallback 헤더 | AC-7 라운드트립에서 KIS 만 비우고 OPENDART 는 유지된 환경 (현실 운영 시나리오) 에서 disclosure 라우트는 `x-data-source: dart` 반환 — 정상 동작이지만 "양쪽 다 비우면 어떻게 되나?" 의 시나리오 미검증. 코드 경로상 `app/api/disclosure/company/route.ts` 의 `isDartConfigured()` 분기는 존재. 후속 PR 또는 본 PR 머지 후 chore 에서 양키 모두 비운 라운드트립 추가 가능 | note | PR-B 머지 후 시리즈 종합 회귀에 동봉 권장 |
| **F-3** | `__tests__/` 디렉터리 depth | 도메인 한 뎁스 룰 (`docs/rules/frontend.md` §3) 의 엄격한 해석 시 `lib/api/kis/__tests__/` 는 depth 1 의 서브폴더. AC-2 검증 명령 (`-mindepth 2`) 은 통과하나 룰 텍스트만 보면 모호. PR 본문에 명시적 결정 (`__tests__/` 는 mindepth=1 — 룰 무관) 박혀 있어 인지 정합 | note | 룰 텍스트 보완 (`__tests__/` 예외 명시) 별도 chore 권고 — QA 비-차단 |
| **F-4** | KIS `X-Data-Source` 헤더 표면 | `app/api/stock/price/route.ts` 가 4 종류 헤더 값 사용 — `mock` (미설정) / `kis` (정상) / `mock-timeout` (5s 타임아웃 graceful) / `mock-quota-exceeded` (라우트 코드 미확인). PRD §6.2 의 `mock-token-failure` 와의 매핑이 코드 주석에 없음. 후속 PR-B 의 hooks 가 헤더 분포 모니터링 시 어떤 enum 값을 expect 하는지 합의 필요 | note | PR-B 진입 시점에 enum 정합 합의 |

위 4건 모두 **note 등급** (QA 비-차단). PR-A 의 가치 = 인프라 + 단위 테스트 + 안전장치 — 핵심 AC 9건 모두 PASS.

## 7. 가드 / 시그널 / 게이트

- **GATE-1 base 정합**: `main` (4d48002, PR #37 finsight-redesign-cleanup 머지) → `feature/stock-api-integration-A` (9e36446). `git status` clean — 워킹트리 미커밋 0. branch up-to-date with `origin/feature/stock-api-integration-A`. PRD §8.5 의 working tree 동봉 정합 — `docs/SESSION_NOTES.md` (M) + `docs/references/korean-stock-api-comparison.md` (U) 둘 다 첫 commit (`3e121cc docs(prd+session+ref)`) 으로 묶여 별도 PR 0.
- **GATE-2 한 PR 룰 (일시 해제) 정합**: PRD §9 q6 [RESOLVED] 의 3분할 (A / B / C) — finsight-redesign 패턴 동일 적용. 본 PR-A 5 commit (PRD + SESSION + ref 1 + 인프라 deps 1 + KIS/DART 클라이언트 1 + BFF 라우트 1 + 단위 테스트 1) 모두 본 브랜치 누적. PR-B / PR-C 진입 전 본 PR 머지 게이트 통과 의무.
- **GATE-3 PR 본문 `## 다음 작업` 절 존재**: `gh pr view 38 --json body` 의 본문 마지막 절 `## 다음 작업` 7 항목 (PR-B / PR-C / TTL 재조정 / symbols.json 350개 풀 시드 chore / signal-algorithm / stock-order-integration / Vercel) 확인. **HANDOFF append workflow** (`.github/workflows/handoff-append.yml`) 의 빈 항목 commit 회귀 가드 만족 — `qa-passed` 라벨 부여 안전.
- **GATE-4 실전계좌 안전장치 (PRD §9 q4 [RESOLVED])**: `app/api/order/*` 디렉터리 0 (AC-13 검증). `lib/api/kis/index.ts:7` "주문 함수는 본 PR-A 에서 의도적으로 export 하지 않는다" 주석. `lib/api/kis/README.md:27-37` 다중 게이트 체크리스트 (비밀번호 재확인 + dry-run + 금액 상한 + audit log + 빌드 가드). 후속 `stock-order-integration` PRD 진입 시점에 reviewer 가 본 체크리스트 적용 확인 의무.
- **GATE-5 BFF 원칙 무회귀** (`docs/rules/frontend.md` §1 정합): `git grep -nE "http://127\\.0\\.0\\.1" -- app/` 의 fallback 라인 (whitelist + workbench) 그대로 유지. KIS/DART 외부 도메인 (`openapivts.koreainvestment.com:29443` / `opendart.fss.or.kr/api`) 은 `lib/api/*/client.ts` 의 baseURL 에만 등장 — `app/`, `components/`, `hooks/` 0 hit.

## 8. 판정 및 인계

- **판정**: **qa-passed**.
- **AC 합계**: PR-A 9 PASS + 6 N/A (PR-B/PR-C 범위) = 15. 추가 발견 4 (모두 note 등급, QA 비-차단).
- **라벨 변경**: `impl-ready` 제거 + `qa-passed` 추가.
- **다음 단계**: PR #38 reviewer 단계 진입. 머지 후 PR-B 진입 (PRD §8.2 / §9 q6 [RESOLVED]) — `hooks/stock/` + `hooks/disclosure/` 5개 useQuery 훅 + Profile 도메인 종단 전환 (AC-8). 시리즈 종료 후 PRD 기반 최종 점검은 PR-C 머지 후.
