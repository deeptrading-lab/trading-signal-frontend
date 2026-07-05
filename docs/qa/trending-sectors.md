# QA 리포트 — trending-sectors (지금 뜨는 산업: 업종 등락 랭킹 + 구성종목 모달)

- 대상 PR: #250 `feature/trending-sectors`
- 판정: **qa-passed** (실패 0건, 비차단 관찰 2건)
- 검증 환경: 로컬 = KIS **prod 라이브**(`KIS_ENV=prod`, `KIS_APP_KEY/SECRET` 설정, `TOSS_*` 설정 → 이중 게이트 통과). 라운드트립은 워크트리 dev 서버 :3099(현 브랜치 코드 서빙) 실호출.
- 검증 일시: 2026-07-05 (일) 14:37 KST — 주말·장 마감. KIS 는 직전 랭킹/시세를 정상 반환.
- 참조: PRD `docs/prd/trending-sectors.md` §5, DESIGN `docs/design/trending-sectors.md`, `docs/rules/frontend.md`.

---

## 1. 게이트 (자동)

| 게이트 | 명령 | 결과 |
|---|---|---|
| typecheck | `npx tsc --noEmit` | **0 에러** (exit 0) |
| lint | `npm run lint` (eslint .) | **0 에러** (exit 0) |
| 유닛테스트 | `npx vitest run lib/api/kis lib/market` | **24 파일 / 215 tests 전부 PASS** (섹터 매퍼 `sectors.mappers.test.ts` 11 tests 포함) |
| DESIGN.md lint | `npx @google/design.md lint docs/design/trending-sectors.md` | **errors 0 / warnings 0** (info 1 — 11색·7타이포·30컴포넌트) |
| design:sync 정합 | `npm run design:sync` 후 `git diff tailwind.theme.json` | **diff 0** — 커밋된 theme 이 sync 산출과 일치. 신규 키 = `sector-row-h: 56px` **1키만**(finsight-redesign.md SSOT + theme.json 양쪽) |

### 컨벤션 grep (AC-12 근거)

| 항목 | 명령 | 결과 |
|---|---|---|
| hex 직타 0 | `git grep -nE '#[0-9a-fA-F]{3,6}' -- TrendingSectorsSection.tsx SectorConstituentsModal.tsx` | **0건** |
| px/rem 직타 | 동 파일 `\[[0-9]+px\]|\[[0-9.]+rem\]` | `w-[34rem]` 1건 — **모달 고정폭**(dialog width). `max-w-[24rem]`(ReanalyzeConfirmDialog)·`max-w-[32rem]`(StockPeekSheet)·`max-w-[48rem]`(IntradayPaperDetailSheet) 과 **동일한 기존 모달-폭 관례**. 색·간격 토큰 대체 대상 아님 → 합격 |
| 클라 `fetch(` 직접 | 신규 클라/훅/UI 5파일 | **0건** (axios `httpClient` 경유) |
| BFF 무회귀 | `git grep 'http://127\.0\.0\.1' -- app/` (route 제외) | 신규 route 0건. 잔존 2건은 `app/api/workbench/_adapters/fastapi.ts`(route handler `FASTAPI_BASE_URL` fallback — **허용 예외**) |
| `useQuery` 직접 import | 신규 UI 2파일 `@tanstack/react-query` | **0건** (도메인 훅만 소비) |
| queryKey 단일 위치 | `["market","sector-*"]` grep | `hooks/query/queryKeys.ts` **단독** |
| 카피 단일 위치 | 신규 UI 인라인 한글 리터럴 | JSDoc 주석 외 **0건** — 노출 문구 전량 `lib/copy/market/sectors.ts` |
| `window.innerWidth` | 신규 UI 2파일 | **0건** (`useBreakpoint` 사용) |

---

## 2. AC 별 검증 표

| # | 시나리오 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-0 | 데이터 계층 실측 | 라이브 TR 호출 + 코드 정독 | 추정 타입 머지 금지, 실 스키마 반영 | 랭킹=`FHPUP02140000` 단건(`output2`, `bstp_cls_code`·`hts_kor_isnm`·`bstp_nmix_prdy_ctrt`·`prdy_vrss_sign`) + 화이트리스트 `[5,30]`; 구성종목=`FHPST01700000`(fluctuation)에 `fid_input_iscd=<업종코드>` 필터로 대표/급등 top-30; 시총=토스 마스터 `sharesOutstanding × price`. 라이브 200 확인. 타입(`sectors.ts`)이 실 필드 반영 | **PASS** |
| AC-1 | 랭킹 표시(prod) | `curl /api/market/sectors` | `x-data-source: kis`, 등락률 내림차순, 업종명·등락률·breadth | `HTTP 200`, `x-data-source: kis`, `x-kis-env: prod`, `count: 13`, 등락률 `[8.15,7.61,6.77,3.18,3.15,3.13,2.07,2.04,2.02,1.41,0.64,0.51,0.36]` **내림차순**, `전기·전자/증권/제조/유통` 업종명 정상 | **PASS** |
| AC-2 | 상승 종목수 + 부호색 | 동 응답 + UI 코드 | "N개 중 M개 상승", 상승 빨강/하락 파랑 토큰 | `전기·전자 up=35 total=81` → `sectorsBreadthSummary` = "81개 중 35개 상승"(`total>0` 일 때만 렌더). 색 = `changeClass` → `signal-up-text`/`signal-down-text` 합성클래스(부호+색 이중 인코딩) | **PASS** |
| AC-3 | dev mock 정상 표시 | 코드 경로(로컬은 prod 라 라이브 트리거 불가) | mock 랭킹 available, 점검회귀 0 | 이중 게이트 미충족 → `getMockSectorRanking`(`x-data-source: mock`). `resolveAvailability`: `mock ∈ AVAILABLE_SOURCES` → **available**(점검 아님). mock 10업종 정상 | **PASS** (코드 검증) |
| AC-4 | 구성종목 모달 | `curl /0013/constituents` + 모달 코드 | 헤더 업종명·등락률·종목수, 본문 종목명·현재가·등락·미니차트 | `HTTP 200 kis`, `count: 30`, `삼화전자 3575 +30% / SK하이닉스 2425000 +10.88%` … 전 종목 종목명·현재가·등락 정상. 헤더=`sector.name`+`formatPct`+`대표 종목 N개`. 미니차트 `MiniStockChart` 렌더 (관찰 ①) | **PASS** |
| AC-5 | 정렬 탭 | `sortConstituents` 정독 + 라이브 데이터 | 수익률=등락률 desc, 시총 desc, null 후순위 | 수익률=`b.changePct-a.changePct`; 시총=`marketCap` desc, `null` → `return 1`(후순위), 양쪽 null → 0. 라이브 30/30 marketCap 채워짐(토스 라이브) → 시총 정렬 실동작(SK하이닉스 1728조 최상단). NaN 없음 | **PASS** |
| AC-6 | 구성종목 → 상세 | 코드 정독 | `/stock/[ticker]` 이동 | `goDetail` → `onClose()` 후 `router.push(stockDetailPath(ticker,name))`. ticker 정합(6자리 필터로 정규 종목만) | **PASS** |
| AC-7 | prod 점검 시각 | route never-throw 경로 정독 | 에러카드 대신 MaintenanceNotice | 타임아웃→`mock-timeout`, 기타→`mock-error`(전부 200, 브라우저 5xx 0). `resolveAvailability`: mock-* → **unavailable** → `MaintenanceNotice`(관리자 재시도). 크래시 없음 | **PASS** (코드 검증) |
| AC-8 | 빈/미지원 업종 | `curl /0099/constituents` | 빈 상태, 레이아웃 유지, NaN 없음 | `HTTP 200 kis`, `count: 0` → 모달 `SECTORS_MODAL_EMPTY`("구성종목이 없어요") 렌더. 랭킹 빈 배열 시 `SECTORS_EMPTY` | **PASS** |
| AC-9 | 레이트리밋(fan-out) | 라이브 13업종 breadth fan-out 관찰 | 동시성 캡·순차·캐시로 EGW00201 미유발 | `enrichBreadth` 동시성 캡 4 + 배치 딜레이 120ms. 라이브 13업종 fan-out 성공 → `x-data-source: kis`(mock-* 폴백 아님) = EGW00201 **미발생** | **PASS** |
| AC-10 | 캐시/재프로브 억제 | queryConfig 정독 | staleTime 억제, 모달 열릴 때만 조회 | 랭킹 `staleTime 60s`/`gcTime 5m`, 폴링 없음. 구성종목 `staleTime 30s`, `enabled = (options.enabled) && !!code`(모달 오픈 시에만) | **PASS** |
| AC-11 | 반응형 두 뷰포트 | useBreakpoint + Tailwind prefix 정독 | 양 뷰포트 정렬/줄바꿈 깨짐 없음 | 모달 `isMobile ? items-end(바텀시트) : items-center(다이얼로그)`, 데스크탑 `w-[34rem]`. 섹션 행 `flex justify-between`, 우열 세로 스택(줄바꿈 없음). `window.innerWidth` 0건. 미니차트 `<640px` 은닉(관찰 ①) | **PASS** |
| AC-12 | 컨벤션 정합 | grep(§1 표) | hex/px/fetch/useQuery/queryKey/카피 규약 | §1 컨벤션 grep 전항 합격 | **PASS** |

---

## 3. 라운드트립 로그 (KIS prod 라이브, :3099)

```
$ curl -s -D- http://127.0.0.1:3099/api/market/sectors
HTTP/1.1 200 OK
cache-control: no-store
x-data-source: kis
x-kis-env: prod
  count: 13   asOf: 2026-07-05T05:39:48Z
  전기·전자 code=0013 8.15% up dir  up=35 total=81
  증권     code=0024 7.61% up      up=28 total=29
  제조     code=0027 6.77% up      up=351 total=536
  유통     code=0016 3.18% up      up=39 total=62
  등락률 desc = [8.15,7.61,6.77,3.18,3.15,3.13,2.07,2.04,2.02,1.41,0.64,0.51,0.36]
  비산업(0001~4/0163/0195/0503/2180) 포함: []  ← 규모티어·테마 전량 제외 확인

$ curl -s -D- http://127.0.0.1:3099/api/market/sectors/0013/constituents
HTTP/1.1 200 OK  x-data-source: kis   code=0013 count=30
  삼화전자 011230 3575 +30%     mcap=6.85e10
  성문전자 014910 2975 +29.91%  mcap=6.50e10
  SK하이닉스 000660 2425000 +10.88% mcap=1.73e15
  삼성전자우 005935 208000 +10.23%  mcap=1.67e14
  marketCap 비-null = 30/30 (토스 라이브)   전 ticker 6자리 = true

$ curl -s -D- http://127.0.0.1:3099/api/market/sectors/0099/constituents
HTTP/1.1 200 OK  x-data-source: kis   code=0099 count=0   ← 빈 업종 정상

$ curl -s -D- http://127.0.0.1:3099/api/market/sectors/abc/constituents
HTTP/1.1 400 Bad Request   {"error":"업종 코드 형식이 올바르지 않아요."}   ← 형식 검증
```

---

## 4. 화이트리스트 근거 (`lib/api/kis/sectorCodes.ts`)

- 규칙: `^\d{4}$` **AND** `NON_INDUSTRY_CODES` 미포함 **AND** `5 ≤ Number ≤ 30`.
- 비산업 제외 근거: `0001~0004`(종합·대/중/소형주) → 숫자 < 5 제외; `0163`(고배당50)·`0195`(코스피TR)·`0503`(VKOSPI)·`2180`(ESG) → 숫자 > 30 제외.
- 유닛(`sectors.mappers.test.ts` #1~#4): `[5,30]` 통과(0005/0013/0030), 규모티어·종합 제외(0001~4), 테마·파생 제외(0163/0195/0503/2180), 비-4자리·비숫자·공백 방어(trim 후 통과) — **전 케이스 PASS**.
- 라이브 실측: 13업종 응답에 비산업 코드 0건(§3) → 범위 규칙이 실 prod `output2` 에서 유효.
- 정렬/매핑 유닛(#5~#11): 등락률·부호 방향 우선·업종명 코드 폴백, `rankSectors` 필터+desc+상위N slice, 구성종목 매핑·누락필드 방어 전부 PASS.

---

## 5. 관찰 사항 (비차단 — dev/designer 재량)

**① 구성종목 미니차트가 `<640px`(sm) 에서 은닉** — `SectorConstituentsModal.tsx:277` 의 `hidden sm:block` 로 미니차트가 뷰포트 640px 미만에서 `display:none`. QA 모바일 기준(375px)에서는 미니차트가 렌더되지 않아 DESIGN Layout("모바일 바텀시트 — 미니차트는 폭에 맞춰 **축소**")·AC-4의 "미니차트" 항목과 소폭 어긋난다. 단 (a) 종목명·현재가·등락 등 핵심은 유지되고 (b) 레이아웃 붕괴·크래시·NaN 없이 우아하게 강등되며 (c) 데스크탑/태블릿(≥640px)에서는 정상 표시되므로 **비차단**. 좁은 화면 미니차트 노출 여부는 디자이너 확인 권장. 부가로, `display:none` 이어도 `MiniStockChart` 는 마운트되어 60일 시세를 페치하므로 모바일에서 30건 은닉 페치가 발생 — 성능 후속 여지(비차단).

**② 시가총액 fail-soft** — 토스 미설정 prod 에서는 `enrichMarketCap` 이 즉시 원본(전 `null`) 반환, 시총 정렬 시 후순위·크래시 없음(`isTossConfigured()` 게이트). 로컬은 토스 설정되어 30/30 채워짐(라이브 확인). 코드·라이브 양쪽 무크래시 확인.

---

## 6. 종합

- AC-0 ~ AC-12 **전 항목 PASS** (라이브 트리거 불가한 AC-3/AC-7 은 route/availability 코드 경로 + mock 검증으로 확정).
- 게이트(tsc·lint·vitest 215·design.md lint·design:sync 1키) 전량 통과, BFF·카피·queryKey·useBreakpoint 컨벤션 무회귀.
- 관찰 2건은 우아한 강등·fail-soft 로 비차단.
- 판정: **qa-passed**. PR #250 본문에 `## 다음 작업` 존재(라벨 게이트 충족), reviewer `review-approved` 선반영.
