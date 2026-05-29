# QA 리포트 — Watchlist KIS 실데이터 전환 (`watchlist-real-data`)

> **QA 에이전트** · 2026-05-30
> **대상 PR**: #44 (`feature/watchlist-real-data`)
> **PRD**: `docs/prd/watchlist-real-data.md`
> **환경**: prod KIS 키 설정됨 (`.env.local` `KIS_ENV=prod`, `KIS_APP_KEY`/`KIS_APP_SECRET` 존재). FastAPI BE(:8000)는 본 트랙 무관(BFF 가 KIS 직접 호출).
> **판정**: **PASS** — 12/12 AC 통과. rate-limit 부분실패는 **허용(graceful, non-blocking)** 으로 판정.

---

## 1. AC 별 검증표

| AC | 항목 | 재현/명령 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | KIS 종목정보 호출 모듈 | `find lib/api/kis -name stock-info.ts` / `git grep CTPF1002R\|PRDT_TYPE_CD\|search-stock-info` | 파일 1 + 각 1건↑ | `stock-info.ts` 존재, `CTPF1002R` L57, `PRDT_TYPE_CD:"300"` L66, 엔드포인트 L62 | PASS |
| AC-2 | 종목명 1차 = `prdt_abrv_name` | `git grep prdt_abrv_name lib/api/kis` + 매퍼 테스트 | abrv→prdt_name→ticker fallback + `bstp_kor_isnm` 미사용 | 매퍼 L128 `prdt_abrv_name?.trim()` 우선, 테스트 #1 3케이스 + 업종명 미사용 케이스 커버 | PASS |
| AC-3 | BFF 라우트 + 헤더 + 게이트 | `find app/api/watchlist` / `git grep X-Data-Source\|X-KIS-Env\|isKisConfigured\|resolveKisEnv\|allSettled` | route 1, 헤더 각 1↑, 단일+이중 게이트, allSettled | route.ts 존재. 시세 단일 게이트 L59, 메타 이중 게이트 L63 `resolveKisEnv()==="prod"`, `Promise.allSettled` L101·L117, 헤더 L176·L200 | PASS |
| AC-4 | KIS 직접 호출 없음(BFF 경유) | `git grep search-stock-info\|fetchStockInfo\|inquire-price components hooks app/(main)` / 어댑터 `getKisClient\|fetchStockInfo\|fetchStockPrice` | 0건 / 어댑터 httpClient 만 | 둘 다 **0건** | PASS |
| AC-5 | 도메인 한 뎁스 + queryKeys + 커스텀훅 | `git grep queryKeys.watchlist.list` / `useQuery( in components` / 커스텀훅 소비 | queryKey 1, `useQuery(` 0, 커스텀훅 각 1↑ | queryKey L28, components `useQuery(` **0건**, `useWatchlistTickers`+`useQueryWatchlist` Container 소비 | PASS |
| AC-6 | 영구화 + 저장소 추상화 + 시드 | `find useWatchlistTickers` / `git grep localStorage hooks/...useWatchlistTickers` / `WATCHLIST_SEED` / store 단위테스트 | 훅 1, 훅 내 localStorage **0**, SEED 1↑, 재시드 금지 | 훅 존재, 훅 내 localStorage **0건**(store.ts 격리), `WATCHLIST_SEED_TICKERS` L26 = 005930/000660/035420, `markSeeded`/`hasSeeded` 로 재시드 금지(store.test #3) | PASS |
| AC-7 | 추가/삭제 UX | `find WatchlistAddModal` / `git grep useQueryStockSearch\|removeTicker components` | 모달 1, 검색훅 재사용, removeTicker 배선 | `WatchlistAddModal.tsx` 존재, `useQueryStockSearch` L47, Container `removeTicker`→Row `onRemove` L85, 빈 상태 CTA(Container L48-63) | PASS |
| AC-8 | mock fallback | route.test #2/#3, mock fixture 한글/무코인 | 키 미설정→mock, env≠prod→시세 KIS+메타 fallback, 코인 0 | route.test #2(mock)·#3(메타 fallback) PASS, 빈 tickers→`X-Data-Source: mock` + `[]` 실측, mock fixture 코인/해외 **0건** | PASS |
| AC-9 | 화면 종단 실데이터(prod) | `GET /api/watchlist?tickers=005930&000660&035420` | 한글 종목명 + 실시세 + `X-Data-Source: kis` | `005930→삼성전자/317000`, `000660→SK하이닉스/2333000`, `035420→NAVER/234000`, `x-data-source: kis`, `x-kis-env: prod` | PASS |
| AC-10 | 표시 변환 + 한국식 색 | `git grep badge-signal-up\|badge-signal-down components/watchlist` | 상승 빨강/하락 파랑 토큰 유지 | `WatchlistRow` L37 `isUp ? badge-signal-up : badge-signal-down` 유지 | PASS |
| AC-11 | typecheck/lint/build/test 0 | `npm run typecheck`·`lint`·`build`·`test -- watchlist stock-info` | 전부 0 에러 | typecheck 0, lint 0, build 0(Turbopack, `/api/watchlist` 라우트 포함), test **26 passed** (list 2 / store 5 / mappers 12 / route 7) | PASS |
| AC-12 | 화면 회귀 0(SSR/상태분기) | `curl /watchlist` + Container 분기 점검 | 12-col 카드 셸 유지, 시드 3종, 행삭제/모달/빈/로딩/에러 분기 | `/watchlist` HTTP 200, "관심종목" 렌더, hydration/console 에러 0. Container 4분기(empty/error/skeleton/success) 배선 확인 | PASS |

---

## 2. 에지 케이스

| 케이스 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 빈 tickers | `?tickers=` | 200 + `[]` + KIS 미호출 | `HTTP 200`, body `[]`, `x-data-source: mock` | PASS |
| soft cap 30 초과 | route.test #6 | truncate + `X-Watchlist-Truncated` | `slice(0,30)` L88, 헤더 `soft-cap-30` L201, test #6 PASS | PASS |
| 거래정지/관리종목 배지 | `WatchlistRow` L58·L63 | `isTradeStopped`/`isAdminItem` 시 `badge-critical`/`badge-warn` | 조건부 배지 배선 + 한글 카피("거래정지"/"관리종목"), 신규 토큰 0 | PASS |
| malformed JSON / 비배열 localStorage | store.test #4 | graceful → 빈 배열 | PASS(깨진 JSON·비문자열 graceful) | PASS |
| SSR(window 미정의) | store.test #5, `/watchlist` SSR | read 빈배열 / write no-op, hydration mismatch 0 | 훅 초기 state `[]`→mount 후 동기화, SSR 렌더 에러 0 | PASS |
| 재시드 금지(시드 전부 삭제) | `markSeeded` 플래그 | 0개여도 재진입 시 빈 유지 | `hasSeeded()` 가드(훅 L48), store.test #3 PASS | PASS |
| 미상장/임의 ticker(999999) | `?tickers=999999` | crash 없이 graceful | 200, KIS 메타명 `(주)피에스엠`, price 0, direction flat | PASS |

---

## 3. 라운드트립 (prod KIS LIVE) — 5건 + rate-limit

dev 서버(localhost:3000) + 실제 KIS prod 키. KIS 호출 결과:

- **(a) 시드 3종 `005930,000660,035420`** → 3건 렌더. `삼성전자/317000(+5.84% up)`, `SK하이닉스/2333000(+1.92% up)`, `NAVER/234000(+14.15% up)`. `x-data-source: kis`, `x-kis-env: prod`. **종목명 한글 표시(ticker 노출 0)** 확정.
- **(b) 빈 목록** → `[]` + `x-data-source: mock`(시드 전부 삭제 시 빈 상태 CTA 경로).
- **(c) 메타 부분 디그레이드** → `005930`/`000660` 일부 호출에서 `market: undefined`(메타 rate-limit), 그러나 **`name` 은 항상 채워짐**(symbols.json fallback). 이름이 bare ticker 로 떨어지지 않음(§9 q3 충족).
- **(d) 미상장 ticker `999999`** → 200, graceful, crash 0.
- **(e) BE/외부 다운 등가 = KIS 전체실패** → NAVER 단건 1회차 `HTTP 502` + 한글 에러 `"관심종목 시세를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."`. Container 가 `query.isError`→**ErrorCard + 재시도 버튼**으로 렌더.

### rate-limit 부분실패 재현 — **허용(graceful, non-blocking) 판정**

6종목 동시 호출(`005930,000660,035420,005380,000270,051910` = 12 KIS 콜):
- 응답 `HTTP 200`, `x-data-source: kis`, `X-Error` 없음.
- 반환 **5/6**: 005380(현대차)의 **시세 콜이 rate-limit 실패 → 해당 종목만 제외**(`Promise.allSettled` 시세 실패 시 item drop). 나머지 5종 정상 렌더, 일부는 `market: undefined`(메타 콜 rate-limit, 이름은 fallback 으로 유지).
- NAVER 단건 재시도 3회: try1 `502`(전체실패), try2·try3 `200` + 완전 데이터(`market: KOSPI`) → **전적으로 transient**.

**판정 근거**: 부분 실패는 (1) 일부 종목 제외/일부 메타 디그레이드로 **나머지를 정상 렌더**하고, (2) 전체 실패 시에만 **한글 ErrorCard + 재시도** UX 로 회복 가능하며, (3) 에러 응답이 아니라 200 으로 성공분을 전달한다. 사용자 경험상 **차단(blocking) 아님 → 허용(graceful)**. 단, prod 동시 12콜은 transient 502 를 유발할 수 있으므로 후속 `intstock_multprice` 일괄조회 최적화 권고(PR `## 다음 작업` 에 명시됨).

---

## 4. 공통 AC 무회귀

- **typecheck/lint/build**: 0 에러(§1 AC-11).
- **BFF 원칙**: `git grep -nE "http://127\.0\.0\.1" -- app/` → whitelist/workbench 의 **FastAPI route fallback 3건만**(기존, 본 PR 무관·규약상 제외). watchlist 컴포넌트/훅 직접 호스트 호출 **0건**.
- **한글 톤**: 사용자 노출 카피 전부 한글("관심종목"/"종목 추가"/"거래정지"/"관리종목"/에러·빈 카피). `ASSET_TYPE_CRYPTO="코인"` 라벨은 enum 매핑 잔재이나 **어느 컴포넌트에서도 import/렌더 안 됨**(국내주식만, 자연 미사용 — PRD §9 q4 정합, 회귀 아님).
- **접근성**: 행 삭제 버튼 `aria-label="{종목명} 관심종목에서 제거"` + 아이콘 `aria-hidden`. 모달 `role="dialog"`/`aria-modal="true"`/`aria-label`, 결과 `role="listbox"`/`role="option"`. label 연결 정상.

---

## 5. 결론

12/12 AC PASS. 에지 케이스·라운드트립·공통 무회귀 전부 통과. rate-limit 부분실패는 **허용(graceful)**. 차단 사유 없음.

**라벨**: `impl-ready` 제거 + `qa-passed` 부여. PR 본문 `## 다음 작업` 섹션 확인 완료(머지 후 후속: engine DB 영구화 / `intstock_multprice` 일괄 최적화 / 코인·해외 트랙).
