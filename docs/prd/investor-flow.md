# PRD — 수급(외국인·기관 순매수) 2표면 통합 (investor-flow)

> 상태: draft (OPEN QUESTION 미결 3건 — 표면 A 합산동작 prod검증 의존 · 표면 B N값/표현 · 모바일 전환 UX) · 작성 2026-06-01 · 개정 2026-06-02
> UI 변경: **yes** (독립 페이지/nav 항목 **없음**. 기존 2개 표면에 섹션/카드 추가 — A: 홈 트리, B: 종목상세 트리). UX/UI 디자이너 합류 **필요(경량)** — 기존 `.card`/`signal-*`/grid 토큰·패턴 재사용, 신규 토큰 부담 최소.
> 단일 PR (한 브랜치 한 PR 룰).

---

## 1. 배경 / 목적

투자자(특히 단타·스윙)는 두 시점에서 수급을 본다. (1) **시장 진입 시** — "오늘 외국인·기관이 시장 전체에서 어떤 종목을 사고 있나"로 종목을 발굴한다. (2) **개별 종목 분석 시** — "이 종목에 최근 개인/외국인/기관 자금이 어떻게 들어오고 나갔나"로 매수 주체의 흐름을 확인한다. 현재 FinSight는 지수·시세·차트·관심종목·공시는 제공하지만 **수급(순매수) 정보가 어디에도 없다.**

리서치 결과, KIS가 **두 시점에 정확히 대응하는 별도 TR 2개**를 제공함이 확정됐다(§6).

- **표면 A — 시장 전체 당일 랭킹**: `foreign_institution_total`(`FHPTJ04400000`)이 **단일 호출로 시장 전체 외국인·기관 순매수 상위 랭킹**을 반환. per-stock 집계·N+1 불필요.
- **표면 B — per-stock 최근 N일**: `inquire_investor`(`FHKST01010900`)가 **한 종목의 개인/외국인/기관 일자별 순매수 추이(최근 N일)**를 반환. **실전·모의 둘 다 지원**(prod 키 없어도 동작 가능).

따라서 본 PRD는 **독립 `/supply-demand` 페이지나 nav 항목을 신설하지 않는다.** 대신 (A) 기존 **통합형 시장 홈**(`MarketOverviewPage`)에 "외국인/기관 순매수 Top10" 카드 섹션을, (B) 기존 **종목 분석 상세**(`StockProfilePage`)에 "수급" 섹션을 얹는다. 두 표면 모두 market/stock 도메인 수직(BFF + KIS 매핑 한 파일 격리 + mock-first 이중게이트)을 그대로 따른다.

> **스코프 개정 사유**: 직전 draft는 독립 `/supply-demand` 페이지 + nav 항목이었으나, 사용자 결정으로 **2표면 통합**으로 확정됐다. 수급은 "발굴(시장 전체)"과 "분석(종목별)"의 두 맥락 모두에 자연스럽게 녹아드는 정보이고, 독립 페이지는 진입 동선이 약하며 nav 슬롯 비용이 든다. 홈에서 Top10으로 발굴 → 종목 클릭 → 상세에서 그 종목 수급 확인이라는 **하나의 연속 동선**이 독립 페이지보다 가치가 높다는 판단.

> **7일 누적 = 비목표(중요)**: 표면 A는 **당일** 스냅샷(날짜 파라미터 없음), 표면 B는 **최근 N일**(API가 한 번에 주는 만큼, 다음조회 불가)이다. "최근 7일 누적 수급"은 본 두 TR로 직접 산출 불가하므로 **명시적 비범위**(후속 트랙). 카피로 "당일"/"최근 N일"을 명확히 해 7일 누적 오인을 방지한다(§2.2, §4).

> 비즈니스 가치: 종목 발굴(홈) + 종목 분석(상세) 양쪽에 수급 신호를 더해 체류·재방문 동기를 높인다. 추가 인프라 0(기존 KIS·BFF·mock 게이트 재사용), 신규 외부 의존 0(KIS TR 2개), 디자인 부담 경량(기존 토큰/그리드 재사용), nav 슬롯 비용 0. 비용 대비 사용자 가치가 높다.

---

## 2. 목표 · 비목표

### 2.1 목표 (측정 가능)

- **G1 (표면 A)** — 홈(`MarketOverviewPage` 트리)에 **당일 외국인 순매수 Top10 · 기관 순매수 Top10**을 **순매수 거래대금(금액) 정렬 + 각 행에 금액·수량 병기**로 표시한다. 행에 종목명·현재가·전일대비(부호/율)를 포함하고, 행 클릭 시 `/stock/[ticker]`로 이동한다.
- **G2 (표면 B)** — 종목 분석 상세(`StockProfilePage` 트리)에 진입·검색한 종목의 **개인/외국인/기관 최근 N일 순매수 추이** "수급" 섹션을 표시한다. 일자별로 주체별 순매수(수량·거래대금)를 보여주고, 음수=순매도를 색 토큰으로 시각 구분한다.
- **G3 (당일/최근 N일 명시)** — 표면 A는 "당일", 표면 B는 "최근 N일(API 제공분)"임이 카피로 드러나 7일 누적으로 오인되지 않는다. 표면 A는 staleTime 60s + "기준 시각" 표기.
- **G4 (graceful degrade)** — 표면 A는 KIS 미설정·비-prod에서 mock으로 degrade(`X-Data-Source: mock`). 표면 B는 실전·모의 둘 다 KIS 동작 가능하되, 미설정 시 mock fallback. 두 표면 모두 화면이 끊기지 않는다.
- **G5 (상태)** — 두 표면 각각 loading / empty / error (/ mock) 상태가 명시적 UX로 처리된다. 표면 A의 장전·주말·장중미집계 시 빈상태 안내(직전영업일 백필 불가), 표면 B의 미집계·신규상장 시 빈상태 안내.
- **G6 (반응형·한글)** — 두 뷰포트(데스크탑 ≥`lg` / 모바일 <`md`)에서 레이아웃이 깨지지 않는다. 표면 A의 외국인·기관 2열 병치는 모바일에서 세로 스택으로 전환(§9 q3). 노출 문구는 ticker·종목명·API 필드 제외 한글.
- **G7 (품질 게이트)** — `npm run lint`·`npm run typecheck`·`npm run test` 통과. 브라우저 클라이언트 코드에 `fetch(` 직접 호출 0건(BFF 경유). queryKey는 `hooks/query/queryKeys.ts` 단일 위치, staleTime은 `lib/query/queryConfig.ts` 단일 위치.

### 2.2 비목표 (명시적 제외)

- **독립 `/supply-demand` 페이지 / nav 항목** — 스코프 개정으로 제외. 2표면 통합만.
- **최근 7일(또는 임의 기간) 누적 수급** — 표면 A는 당일 스냅샷, 표면 B는 API가 주는 최근 N일까지만. 임의 기간 누적은 별도 TR 조사 + per-day 집계 필요 → **후속 트랙**.
- **표면 A의 과거 일자 / 직전 영업일 백필** — 당일 가집계만(날짜 파라미터 없음). 장전·휴장은 빈상태 안내.
- **표면 A의 KOSPI/KOSDAQ 분리 뷰** — v1은 전체 합산(`FID_INPUT_ISCD=0000`) 단일. 분리 수요 확인 시 후속.
- **표면 B의 수급 시계열 차트(고도화)** — v1은 일자별 표 또는 간단 미니차트(§9 q2). 캔들 차트 오버레이 등 고도화는 후속.
- **기타법인·업종별·테마별 수급 집계** — v1은 표면 A=외국인·기관 2주체, 표면 B=개인·외국인·기관 3주체만.
- **실시간 폴링/웹소켓** — staleTime 기반 갱신 + 재진입. KIS 가집계가 하루 4~5회라 초단위 폴링 무의미.
- **주문·자동매매 연동** — 조회·분석 전용 스코프(프로젝트 영구 제약).
- **신규 디자인 토큰 신설** — 기존 `.card`/`signal-up-text`/`signal-down-text`/`badge-signal-*`/grid 재사용. 새 토큰이 꼭 필요하면 디자이너가 DESIGN.md에 추가(같은 브랜치).

---

## 3. 사용자 시나리오 (연속 동선)

1. **홈에서 발굴(표면 A)** — 사용자가 홈(`/`)에 진입하면 지수·검색·공시 피드와 함께 "외국인/기관 순매수 Top10" 카드가 보인다. 외국인 Top10·기관 Top10이 거래대금 순으로 병치(모바일은 세로 스택)되어, 오늘 어느 종목에 외인·기관 자금이 들어오는지 한눈에 파악한다.
2. **종목 클릭 → 상세 이동** — Top10 카드의 한 행을 클릭하면 `/stock/[ticker]` 상세로 이동한다(`usePrefetchStockDetail` hover/click 의도 prefetch 재사용 → 진입 지연 최소).
3. **상세에서 그 종목 수급 확인(표면 B)** — 종목 상세에서 시세·차트와 함께 "수급" 섹션이 보인다. 방금 발굴한 그 종목에 **개인/외국인/기관**이 최근 N일 동안 얼마를 순매수/순매도했는지 일자별로 확인한다. 음수(순매도)는 색으로 구분된다.
4. **상세에서 직접 검색 진입(표면 B 단독)** — 발굴 동선 없이 상세를 검색으로 직접 열어도 그 종목의 수급 섹션이 동일하게 보인다.
5. **장 시간 외 진입** — 주말·휴장·장중 미집계 시 표면 A는 "아직 당일 수급 집계 전" 빈상태 안내. 표면 B는 미집계·신규상장 시 빈상태 안내로 빈 화면을 방지.
6. **갱신·신선도** — 표면 A는 staleTime 경과 후 재진입 시 최신 가집계 반영 + "기준 시각" 표기. 표면 B는 장 종료 후 당일치가 반영됨을 카피로 안내.

---

## 4. 기능 요구사항

### 4.A 표면 A — 홈 "외국인/기관 순매수 Top10" 카드 (시장 전체, 당일)

- **데이터**: 단일 KIS TR `foreign_institution_total`(§6.1). 정확한 주체별 Top10을 얻기 위해 외국인용·기관용 **주체별 1콜씩**(`FID_ETC_CLS_CODE` 1/2) 호출하고 한 BFF 응답으로 합친다. 정렬 기준 = 거래대금(`FID_DIV_CLS_CODE=1`).
- **표시**: **외국인 Top10 · 기관 Top10 2열 병치**(데스크탑 `lg:grid-cols-2`; 모바일 세로 스택 — §9 q3). 각 행: 순위 · 종목명(`hts_kor_isnm`, 없으면 `pickStockName`) · 현재가(`stck_prpr`, `formatNumber`) · 전일대비 부호/등락률(`prdy_ctrt`, `formatPct` + `signal-up-text`/`signal-down-text`) · **순매수 거래대금(금액, `*_tr_pbmn` 백만원 환산) + 순매수 수량(`*_ntby_qty`) 병기**. 거래대금 기준 정렬.
- **레이아웃**: 홈의 `home-grid-gap` 간격·`.card` 토큰 재사용. `WatchlistRow`의 컬럼 정렬 패턴 참조(신규 grid 최소화). 홈 트리(`MarketOverviewPage`)의 기존 위젯(지수·공포탐욕·공시)과 병치되는 카드 섹션으로 추가.
- **당일·신선도**: 당일 스냅샷, **staleTime 60s + "기준 시각" 표기**. "당일" 라벨로 누적 오인 방지.
- **종목 이동**: 행 클릭 → `/stock/[ticker]` + `usePrefetchStockDetail`(PR #81) 재사용.
- **빈상태**: 장전·주말·장중미집계로 응답 배열이 비면 "아직 당일 외국인·기관 수급 집계 전이에요(첫 갱신 09:30~)" 류 한글 안내. **직전영업일 백필 불가**(날짜 파라미터 없음).
- **mock 게이트**: `isKisConfigured() && resolveKisEnv()==="prod"` 미충족 시 mock 랭킹(`X-Data-Source: mock`). `0000` 전체 합산 동작은 prod spike에서 검증(미동작 시 `0001`+`1001` 분리호출 합산 — §9 q1).

### 4.B 표면 B — 종목 상세 "수급" 섹션 (per-stock, 최근 N일)

- **데이터**: KIS TR `inquire_investor`(§6.2). `FID_INPUT_ISCD=<ticker>` 단일 호출로 일자별 최근 N일 배열을 받는다. **실전·모의 둘 다 동작**(prod 키 없어도 가능). 다음조회 불가(한 번에 오는 만큼).
- **표시**: 종목 상세(`StockProfilePage` 트리)에 "수급" 섹션 추가. **개인/외국인/기관(prsn/frgn/orgn)** × 일자별 **순매수 거래대금(`*_ntby_tr_pbmn`)·순매수 수량(`*_ntby_qty`)** 을 표 또는 간단 미니차트(최근 N일 — §9 q2)로 표시.
- **부호·시각구분**: 음수(문자열) = 순매도. 빨강/파랑 토큰(`signal-up-text`/`signal-down-text` 등 기존 토큰)으로 순매수/순매도를 시각 구분. 일자(`stck_bsop_date`)·종가(`stck_clpr`)·전일대비(`prdy_vrss`/`prdy_vrss_sign`)를 함께 표시 가능.
- **레이아웃**: 종목상세의 기존 섹션 간격·`.card` 재사용. 차트 채택 시 기존 차트 색 토큰 정합(hex 직타 금지).
- **최근 N일 명시**: "최근 N일(영업일)" 라벨로 누적 오인 방지. 당일치는 장 종료 후 반영됨을 카피로 안내.
- **빈상태/실패**: 미집계·신규상장·응답 빈 배열 시 한글 빈상태 안내. KIS 5xx/타임아웃 시 한글 오류 + 재시도 동선(기존 stock 도메인 에러 카피 재사용).
- **mock**: KIS 미설정 시 mock fallback(`X-Data-Source: mock`). 실전·모의 모두 동작하므로 prod 게이트는 표면 A보다 느슨(미설정만 mock).

### 4.C 공통 상태 처리

- **loading** — 스켈레톤/로딩(기존 market·stock 로딩 패턴 재사용).
- **empty** — 한글 빈상태 안내(표면별 문구 4.A/4.B).
- **error** — 한글 오류 + 재시도(기존 도메인 에러 카피 재사용).
- **mock** — `X-Data-Source: mock`, 정상 렌더(개발·preview 레이아웃 검증 가능).

---

## 5. 수용 기준 (AC)

각 항목은 재현 가능한 명령/검증 단위로 떨어진다. `<도메인>` 플레이스홀더는 구현 단계에서 확정 폴더명(예 `investor-flow`)으로 치환.

- **AC-1 (G1·표면 A 렌더)** — 홈(`/`)에 외국인 Top10·기관 Top10 카드가 렌더되고, 각 리스트는 거래대금 정렬로 **최대 10행**(응답이 10건 미만이면 그만큼), 각 행에 종목명·현재가·전일대비·**순매수 거래대금 + 수량 병기**가 표시된다. `git grep -n "InvestorTop10\|ForeignInstitution\|순매수" components/home components/<도메인>` 가 홈 트리 마운트를 포함.
- **AC-2 (G2·표면 B 렌더)** — 종목 상세(`/stock/<ticker>`)에 "수급" 섹션이 렌더되고, **개인/외국인/기관** 3주체의 일자별 순매수(수량·거래대금)가 최근 N일 표시된다. `git grep -n "prsn_ntby\|frgn_ntby\|orgn_ntby" lib/api/kis/investor-flow.ts` 가 3주체 매핑을 모두 포함.
- **AC-3 (G1·G7·BFF 단일진입)** — 표면 A·B 각각 BFF route 1개씩 존재(`find app/api -path '*investor*/route.ts'` ≥2건 또는 합의 경로). 브라우저는 BFF만 호출 — `git grep -n "fetch(" components/<도메인> hooks/<도메인> lib/api/<도메인>` 클라이언트 측 직접 `fetch(` **0건**. KIS 직접 호출은 `lib/api/kis/investor-flow.ts` + route handler 내부로 격리.
- **AC-4 (G4·표면 A mock 게이트)** — 표면 A BFF는 `isKisConfigured() && resolveKisEnv()==="prod"` 미충족 시 `X-Data-Source: mock` + mock 랭킹 반환. `git grep -n "isKisConfigured\|resolveKisEnv" app/api/<도메인>/<표면A>/route.ts` 가 이중게이트를 포함(indices route 패턴 정합).
- **AC-5 (G4·표면 B mock fallback)** — 표면 B BFF는 KIS 미설정 시 mock fallback(`X-Data-Source: mock`), 설정 시 실전·모의 실호출. 미설정·preview에서도 종목 상세 수급 섹션이 빈 화면 없이 렌더된다.
- **AC-6 (G5·상태)** — 두 표면 각각 loading·empty·error(·mock) 분기가 처리됨. 표면 A 장전/주말(빈 응답) 시 한글 빈상태 안내가 노출되고 흰 화면이 아니다. 표면 B 미집계/빈 배열 시 한글 빈상태 안내.
- **AC-7 (G6·반응형·한글)** — 데스크탑(≥`lg`)·모바일(<`md`)에서 두 표면이 깨지지 않는다. 표면 A 2열 병치가 모바일에서 세로 스택으로 전환된다(`lg:grid-cols-2` 또는 `useBreakpoint`). `git grep -n "innerWidth" components/<도메인>` **0건**. 노출 문구는 ticker·종목명·API 필드 제외 한글, `lib/copy/<도메인>/`에 격리.
- **AC-8 (G1·종목 이동)** — 표면 A 행 클릭 → `/stock/[ticker]` 이동. `git grep -n "usePrefetchStockDetail" components/<도메인>` 가 prefetch 재사용을 포함.
- **AC-9 (G3·당일/최근 N일 명시)** — 표면 A 화면에 "당일" 기준 + "기준 시각"(또는 최소 "당일 가집계" 라벨)이 표기되고, 표면 B 화면에 "최근 N일" 기준이 표기되어 7일 누적으로 오인되지 않는다. `git grep -rn "당일\|기준 시각\|최근" lib/copy/<도메인>` 가 해당 카피를 포함.
- **AC-10 (G2·BFF 하드닝)** — 표면 A·B BFF가 `lib/server/bffUtils.ts`(`withTimeout`/`jsonWithDataSource`/`BFF_TIMEOUT_SENTINEL`/`delay`)를 재사용하고 타임아웃·부분실패 fallback을 가진다. 표면 A의 주체별 2콜은 청크/지연(EGW00201 회피)을 적용한다(indices/ticker route 패턴 정합).
- **AC-11 (G7·품질 게이트)** — `npm run lint`·`npm run typecheck`·`npm run test` 통과. queryKey는 `hooks/query/queryKeys.ts` 단일 위치에 추가(`git grep -n "investorFlow\|investorTop10\|investorTrend" hooks/query/queryKeys.ts` 존재, 표면 A·B 각각). staleTime은 `lib/query/queryConfig.ts`에 도메인 항목으로 추가(매직넘버 직타 금지, 표면 A 60s 포함).
- **AC-12 (비목표 가드)** — `find app/\(main\)/supply-demand` 결과 **0건**(독립 페이지 미신설). `git grep -n "supply-demand\|supplyDemand" components/layout/navItems.ts` **0건**(nav 항목 미추가).

---

## 6. 데이터 / API 명세 (확정 — 변경 금지)

### 6.1 표면 A TR — `foreign_institution_total`

- **TR_ID**: `FHPTJ04400000` · **Method/Path**: `GET /uapi/domestic-stock/v1/quotations/foreign-institution-total`
- **특성**: **단일 호출로 시장 전체 외국인·기관 순매수 상위 랭킹 반환**(per-stock 집계 불필요).
- **⚠️ 제약**: 날짜 파라미터 없음 → **당일(장중 실시간 가집계) 스냅샷만**. 과거일자·기간 누적 불가.
- **갱신 시각**: 외국인 09:30 / 11:20 / 13:20 / 14:30 · 기관 10:00 / 11:20 / 13:20 / 14:30.

**요청 params**

| param | 값 | 의미 |
|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | `V` (고정) | 시장 분류 |
| `FID_COND_SCR_DIV_CODE` | `16449` (고정) | 화면 분류 |
| `FID_INPUT_ISCD` | `0000`(전체 합산) / `0001`(KOSPI) / `1001`(KOSDAQ) | 시장 — v1 `0000` (합산 동작 prod 검증, §9 q1) |
| `FID_DIV_CLS_CODE` | `1`(금액) | v1 고정 — 거래대금 정렬 |
| `FID_RANK_SORT_CLS_CODE` | `0`(순매수상위) | v1 고정 |
| `FID_ETC_CLS_CODE` | `1`(외국인) / `2`(기관) | 주체 — 주체별 1콜씩 |

**응답 output (랭킹 배열)**

| 필드 | 의미 |
|---|---|
| `mksc_shrn_iscd` | 종목 코드 |
| `hts_kor_isnm` | 종목명 |
| `stck_prpr` | 현재가 |
| `prdy_vrss_sign` / `prdy_ctrt` | 전일대비 부호 / 등락률 |
| `frgn_ntby_qty` / `orgn_ntby_qty` | 외국인 / 기관 순매수 **수량** |
| `frgn_ntby_tr_pbmn` / `orgn_ntby_tr_pbmn` | 외국인 / 기관 순매수 **거래대금(백만원)** |

- `*_tr_pbmn` 단위는 **백만원** — 표시 시 단위 환산·카피 주의(`formatNumber`에 단위 접미 필요).

### 6.2 표면 B TR — `inquire_investor`

- **TR_ID**: `FHKST01010900` · **Method/Path**: `GET /uapi/domestic-stock/v1/quotations/inquire-investor`
- **✅ 실전·모의 둘 다 지원** (`env_dv` real/demo, TR_ID 동일 — **prod 아니어도 동작 가능**).
- **특성**: 한 종목의 **개인/외국인/기관 일자별 순매수 추이(최근 N일)**. 다음조회 불가(한 번에 오는 최근 N일). 당일치는 **장 종료 후** 반영.

**요청 params**

| param | 값 | 의미 |
|---|---|---|
| `FID_COND_MRKT_DIV_CODE` | `J` | 시장 분류(주식) |
| `FID_INPUT_ISCD` | `<ticker>` | 종목 코드 |

**응답 output (일자별 최근 N일 배열)**

| 필드 | 의미 |
|---|---|
| `stck_bsop_date` | 영업일자 |
| `stck_clpr` | 종가 |
| `prdy_vrss` / `prdy_vrss_sign` | 전일대비 / 부호 |
| `prsn_ntby_qty` / `frgn_ntby_qty` / `orgn_ntby_qty` | 개인 / 외국인 / 기관 순매수 **수량** |
| `prsn_ntby_tr_pbmn` / `frgn_ntby_tr_pbmn` / `orgn_ntby_tr_pbmn` | 개인 / 외국인 / 기관 순매수 **거래대금** |

- 음수(문자열) = 순매도. 파싱 시 부호 처리.

### 6.3 BFF / mock 게이트 (indices route 패턴 정합)

- **표면 A 이중 게이트**: `isKisConfigured() && resolveKisEnv()==="prod"` 충족 시에만 KIS 실호출. 미충족 시 mock(`X-Data-Source: mock`). 수급 랭킹은 실전 전용 가능성↑ — prod spike에서 실호출 확인 후 라이브.
- **표면 B 느슨한 게이트**: 실전·모의 둘 다 동작하므로 `isKisConfigured()`만 충족하면 실호출(env real/demo 무관). 미설정 시 mock fallback.
- BFF는 `withTimeout`·`jsonWithDataSource`·`BFF_TIMEOUT_SENTINEL`·`delay` 재사용. 표면 A 주체별 2콜은 청크+지연(EGW00201 회피).

---

## 7. 비기능 요구사항

- **mock-first + 게이트** — §6.3. 표면 A prod 이중게이트, 표면 B 미설정만 mock.
- **BFF 패턴** — 브라우저는 BFF route 2개(표면 A·B)만 호출. KIS 직접 호출은 `lib/api/kis/investor-flow.ts` 한 파일 + route handler 내부로 격리.
- **반응형** — 두 뷰포트. Tailwind 반응형 prefix(`md:`/`lg:`) 1차, JS는 `useBreakpoint`. `window.innerWidth` 직접 검사 금지. 표면 A 2열→모바일 세로 스택.
- **한글 카피** — 노출 문구는 ticker·종목명·API 필드 제외 한글. `lib/copy/<도메인>/`에 격리(i18n 여지). "당일"/"최근 N일" 라벨 필수.
- **코드 컨벤션**(`docs/rules/frontend.md` 8개 절) — 카멜케이스, 커스텀훅 의무화(화면 컴포넌트가 `useQuery` 직접 import 금지, 도메인 훅만 소비), `cn` 헬퍼, 도메인 한 뎁스 폴더, query key 단일 위치, layout.tsx 컨벤션, 반응형.
- **디자인 토큰** — hex/px 직타 금지. `.card`/`signal-up-text`/`signal-down-text`/`badge-signal-*` 재사용. 표면 B 차트 채택 시 기존 차트 색 토큰 정합. 신규 토큰은 DESIGN.md → `design:sync` 경유.

---

## 8. 영향 분석

### 8.1 신규 파일 (market/stock 도메인 수직 템플릿 — 한 도메인 폴더 `investor-flow`)

| 레이어 | 경로(plan) | 비고 |
|---|---|---|
| 타입 | `lib/types/investor-flow/*.ts` | KIS output(A·B) → 도메인 모델 |
| 카피 | `lib/copy/investor-flow/*.ts` | 한글 노출 문구(당일/최근 N일) |
| mock | `lib/mock/investor-flow/*.ts` | mock 랭킹(A) + mock 추이(B) |
| KIS 매핑 | `lib/api/kis/investor-flow.ts` | A: `fetchForeignInstitutionTotal` + B: `inquire_investor` fetch **한 파일 격리** |
| 클라 어댑터 | `lib/api/investor-flow/*.ts` | httpClient → BFF(A·B) |
| 도메인 훅 | `hooks/investor-flow/*.ts` | useQuery~ 소비 + 화면 가공(A·B 분리 훅) |
| 컴포넌트 A | `components/<홈 트리>/InvestorTop10*` | 외국인·기관 2열 카드 (홈 마운트) |
| 컴포넌트 B | `components/<종목상세 트리>/InvestorTrend*` | 수급 섹션 (상세 마운트) |
| BFF A | `app/api/investor-flow/top10/route.ts` | 이중게이트 + 주체 2콜 청크/타임아웃 |
| BFF B | `app/api/investor-flow/trend/route.ts` | 느슨 게이트 + 타임아웃 |

> 컴포넌트 마운트 지점: 표면 A는 홈 트리(`MarketOverviewPage` — `components/home/`)에 카드 섹션 추가, 표면 B는 종목상세 트리(`StockProfilePage` — `components/profile/`)에 수급 섹션 추가. 도메인 폴더는 `investor-flow` 한 뎁스로 묶되, 화면 마운트는 각 표면 트리에 배치(도메인 한 뎁스 규칙 내에서 컨테이너만 표면 트리에서 import).

### 8.2 수정 파일

| 경로 | 변경 |
|---|---|
| `components/home/MarketOverviewPage.tsx` | 표면 A 카드 컨테이너 섹션 1개 추가(append, 기존 위젯 무영향) |
| `components/profile/StockProfilePage.tsx` | 표면 B 수급 섹션 컨테이너 1개 추가(append) |
| `hooks/query/queryKeys.ts` | investorFlow 도메인 queryKey factory 추가(A·B, append-only) |
| `lib/query/queryConfig.ts` | investorFlow staleTime/gcTime 항목 추가(A=60s, append-only) |

> **nav·layout 무수정** — 독립 페이지/메뉴 없음. `navItems.ts`·Sidebar·BottomNav 변경 0(AC-12). 직전 draft 대비 nav 회귀 위험 제거가 본 개정의 핵심 이점.

### 8.3 변경 라인 추정 · 커밋 분할 · 회귀 위험

- **변경 라인 추정**: 한 도메인 수직(타입·카피·mock·KIS매핑·어댑터·훅) + 컴포넌트 2벌(A 2열 카드, B 추이 섹션) + BFF 2개 + 마운트/인프라 수정 4파일 ≈ **중간 규모(대략 600~900라인)**. 표면이 2개라 직전 draft보다 컴포넌트가 1벌 늘지만, KIS 매핑·도메인 인프라는 공유.
- **커밋 분할 권고**(같은 브랜치 내):
  1. `docs(prd): investor-flow PRD 추가(2표면)`
  2. (UI 포함) `docs(design): 수급 카드(A)·추이 섹션(B) DESIGN.md`
  3. `feat(investor-flow): KIS 매핑 + BFF top10/trend 라우트(게이트)`
  4. `feat(investor-flow): 타입·어댑터·훅·queryKey/queryConfig`
  5. `feat(investor-flow): 홈 외국인·기관 Top10 카드(표면 A)`
  6. `feat(investor-flow): 종목상세 수급 추이 섹션(표면 B)`
  7. `docs(qa): investor-flow QA 리포트`
- **회귀 위험**:
  - 홈·종목상세 기존 트리 수정은 **섹션 append**라 기존 위젯·시세·차트 무영향(렌더 순서만 확장).
  - `queryConfig.ts`·`queryKeys.ts`는 append-only → 기존 도메인 무영향.
  - 표면 A 주체별 2콜(외인·기관) 시 EGW00201 위험 → 청크+지연 필수(AC-10).
  - 표면 A `0000` 합산 미동작 시 분리호출 합산(2콜→3콜)으로 콜 수 증가 — §9 q1 검증 후 결정.
- **분할 vs 단일**: 두 표면이 한 KIS 도메인(`investor-flow`)을 공유하고 디자인 재사용도가 높아 **단일 PR 권고**. 7일 누적 트랙은 별도 TR 조사가 필요해 본 PRD에 묶지 않고 분리(비목표 §2.2).

---

## 9. OPEN QUESTION (사용자 결정 대기 — 각 PM 권고 동봉)

> 직전 draft의 q1~q7(외국인/기관 표현·시장 표현·순위 기준·nav 배치·종목 이동·장외 UX·갱신주기)은 **확정 스코프에 반영되어 해소**됨(2열 병치/거래대금 정렬/금액·수량 병기/nav 없음/이동 제공/빈상태 안내/staleTime 60s+기준시각). 아래는 **남은 진짜 미결**만.

- **[OPEN QUESTION] q1 — 표면 A `FID_INPUT_ISCD=0000` 전체 합산 동작 (prod 검증 의존)**: `0000`이 KOSPI+KOSDAQ을 합산 랭킹하는지 KIS 실동작 미확인. 미동작 시 `0001`(KOSPI)+`1001`(KOSDAQ) 분리호출 후 거래대금 기준 머지·재정렬 필요(주체×시장 = 최대 4콜).
  - **PM 권고**: prod spike에서 `0000` 단일콜 우선 시도. 동작하면 주체당 1콜(총 2콜)로 확정. 미동작 시 분리호출 합산으로 폴백하되 청크+지연 강화(EGW00201). 구현은 어댑터/매핑 레이어에서 합산 함수를 분기 가능하게 설계(코드 변경 최소). **사용자 결정 불요·구현 spike로 해소 가능**하나, 콜 수 증가가 rate-limit에 닿으면 알린다.

- **[OPEN QUESTION] q2 — 표면 B 최근 N일의 N값 + 표현(표 vs 미니차트)**: `inquire_investor`가 한 번에 주는 일수(보통 ~30일 전후, 실응답 확인 필요)와, 이를 일자별 표로 보여줄지 간단 미니차트(주체별 누적/막대)로 보여줄지.
  - **PM 권고**: N은 **API가 주는 만큼 그대로** 받되 화면 노출은 **최근 ~10~20일로 절단**(과밀 방지, 카피에 "최근 N일" 동적 표기). 표현은 **일자별 표 우선(v1)** — 개인/외국인/기관 3주체 × 금액·수량은 표가 가장 정확·구현 경량이고, 미니차트는 막대 3계열로 과밀 위험. 단, 토스톤 가독성상 **상단에 주체별 합계 요약(최근 N일 순매수 합) 한 줄 + 일자별 표** 조합을 권고. 미니차트 채택 여부는 디자이너에게 위임(같은 브랜치 DESIGN.md). **사용자/디자이너 결정 필요.**

- **[OPEN QUESTION] q3 — 표면 A 모바일 2열→세로 전환 + 카드 우선순위**: 데스크탑 외국인·기관 2열 병치를 모바일에서 세로 스택(외국인→기관 순)으로 전환하는데, (a) 세로 스택 시 두 리스트 각각 10행이면 길어짐 — 모바일은 Top5로 절단 또는 접기(더보기) 여부, (b) 홈 위젯들 사이에서 Top10 카드의 세로 위치(지수 아래? 공시 위?).
  - **PM 권고**: 모바일 세로 스택 + **모바일은 각 주체 Top5 절단 + "더보기"**(데스크탑 Top10 유지)로 스크롤 부담 완화. 홈 배치는 **지수 카드 바로 아래**(발굴 동선상 지수 다음으로 수급이 자연) 권고. 정확한 위치·절단 수·더보기 인터랙션은 **디자이너 위임**(같은 브랜치 DESIGN.md). 토스톤(정보 밀도 높되 빠른 조작) 정합.

---

## 참고

- 마운트 지점: `components/home/MarketOverviewPage.tsx`(표면 A 카드 추가 — 지수·공포탐욕·공시와 병치), `components/profile/StockProfilePage.tsx`(표면 B 수급 섹션 추가 — `app/(main)/stock/[ticker]/page.tsx`가 렌더).
- 라우트·BFF 참조 구현: `app/api/market/indices/route.ts`(이중게이트·청크·TTL·타임아웃·`X-Data-Source`), `app/api/market/ticker/route.ts`(청크 2/지연 120ms).
- BFF 유틸: `lib/server/bffUtils.ts`(`withTimeout`/`jsonWithDataSource`/`BFF_TIMEOUT_SENTINEL`/`delay`).
- KIS 인프라: `lib/api/kis/`(`isKisConfigured`/`resolveKisEnv`), 신규 `lib/api/kis/investor-flow.ts`(A·B 매핑 격리).
- 재사용 컴포넌트·훅·유틸: `components/watchlist/WatchlistRow`(컬럼 grid), `hooks/stock/usePrefetchStockDetail`(PR #81 hover/click prefetch), `lib/utils`(`pickStockName`/`formatNumber`/`formatPct`), `.card`/`signal-up-text`/`signal-down-text`/`badge-signal-*` 토큰.
- query 인프라: `hooks/query/queryKeys.ts`(stock·market factory 패턴 참조), `lib/query/queryConfig.ts`(stock.price=10s 등 패턴 참조).
- 컨벤션: `docs/rules/frontend.md`(8개 절), `AGENTS.md`(BFF·반응형·한글카피 원칙).
- 기억: KIS API 컨벤션(EGW00201 회피·prod 안전장치·`bstp_kor_isnm` 함정), 조회·분석 전용 스코프(주문 미구현), home-market-redesign(통합형 시장 홈 — 표면 A 배치 맥락), market-indices-consolidation(이중게이트·청크 선례).

---
