# PRD — trending-sectors (지금 뜨는 산업: 업종별 등락 랭킹 + 구성종목 모달)

- 슬러그: `trending-sectors`
- 상태: 기획 (impl 전)
- 작성: 2026-07-05 (PM 역할)
- 브랜치: `feature/trending-sectors`
- 관련:
  - `docs/prd/toss-orderbook.md` — "토스/외부 API 조회 + 공용 패널 + BFF 프록시 + mock 폴백" 형식·톤 레퍼런스.
  - `docs/prd/market-status-aware-home.md` — 마켓 홈 섹션 신설·가용성/mock 소스 판정·`MaintenanceNotice` 공용 상태 UI 선례. 본 PRD 의 "점검 중" 처리를 그대로 답습.
  - `lib/api/kis/index-price.ts` — 업종 현재지수(`FHPUP02100000`) **기존 구현**. 본 PRD 는 이 위에 카테고리 리스트/fan-out 을 얹는다.
  - `app/api/market/volume-rank/route.ts` — **이중 게이트(`isKisConfigured && prod`) + mock + `X-Data-Source`** 실전전용 TR 선례. 본 PRD 의 BFF 안전장치 원본.
  - `lib/api/toss/price.ts` (`fetchStockPriceWithShares`) — 시가총액 = 마스터 `sharesOutstanding × 현재가` 기존 계산. 구성종목 시총 정렬에 재사용.
  - `docs/references/kis-api/domestic-stock-quotations.md` §2-4(`FHPUP02100000`)·§1-3(`FHPUP02140000`) — TR 근거.
  - `docs/rules/frontend.md` — FE 컨벤션 8개 절.
- **UI 포함: yes** (마켓 홈 신규 "지금 뜨는 산업" 섹션 + 구성종목 모달. UX/UI 디자이너 합류 트리거 — §9 q6)

---

## 1. 배경 / 문제

토스 홈에는 "지금 뜨는 산업" 탭이 있다. 업종을 등락률로 정렬한 랭킹(예: **"종합반도체 +10.4% · 5개 중 5개 상승"**)을 리스트로 보여주고, 한 업종을 클릭하면 그 업종 **구성종목**(현재가·등락·미니차트, 수익률/시가총액 정렬 탭)을 모달로 펼친다. 사용자는 이 기능을 실사용 가치가 높다고 평가했고, HTS 시절 업종/테마별로 관심종목을 분류·저장하던 습관이 있다.

현재 우리 마켓 홈은 **지수 스트립·실시간 순위(거래량/거래대금/급상승/급하락)·순매수·공포탐욕**은 있으나 **"업종(섹터)" 관점의 진입로가 전무**하다. 개별 종목의 등락은 보이지만 "지금 어떤 산업이 통째로 움직이는가"를 못 본다. 섹터 로테이션은 개인 투자자가 종목을 고르기 전 가장 먼저 보는 렌즈인데 빠져 있다.

기술적으로도 우리는 이미 업종 지수의 상당 부분을 다룰 자산을 갖고 있다:
- `lib/api/kis/index-price.ts` 가 업종 현재지수(`FHPUP02100000`)를 호출하며, 응답의 `ascn_issu_cnt`(상승 종목수)·`down_issu_cnt`(하락 종목수)·`bstp_nmix_prdy_ctrt`(전일 대비율)로 **"N개 중 M개 상승 · +X%"** 를 그대로 만들 수 있다.
- 구성종목의 현재가·등락·미니차트는 peek/차트 기존 자산 재사용.
- 시가총액은 토스 마스터 `sharesOutstanding × 현재가`(이미 계산 로직 존재).

⚠️ **미확정 2가지(데이터 계층의 핵심 리스크)** — 본 PRD 는 이 둘을 **AC-0(실측 spike)** 으로 못 박고 착수한다:
1. **업종을 등락률로 정렬한 LIST 를 한 번에 주는 TR 이 있는가.** 후보 `FHPUP02140000`(inquire-index-category-price, "업종 카테고리별 지수")은 우리 레퍼런스에 **응답 필드 미수집(파라미터만)**. 리스트를 안 주면 우리가 업종코드 목록을 보유하고 `FHPUP02100000` 을 **fan-out**(코드당 1콜) 해야 한다(레이트리밋 부담).
2. **특정 업종의 구성종목 리스트를 주는 TR 이 있는가.** 레퍼런스 카탈로그에 "업종별 구성종목" **전용 TR 이 확인되지 않는다**. 없다면 전체 유니버스를 `bstp_kor_isnm` 으로 필터하거나(비용 큼), 주요 업종에 한해 큐레이션 매핑으로 시작해야 한다. **본 PRD 최대 실현성 리스크.**

## 2. 목표 (측정 가능)

1. `GET /api/market/sectors` BFF 가 업종 랭킹 배열(업종명·전일대비율·상승/하락/보합 종목수)을 등락률 정렬로 반환한다 (`X-Data-Source: kis|mock|mock-timeout|mock-error`).
2. `GET /api/market/sectors/[code]/constituents` BFF 가 해당 업종 구성종목 배열(ticker·종목명·현재가·등락·시가총액)을 반환한다 (동일 소스 헤더 규약). — **q2 실현성 확정(AC-0) 후 최종 경로/방식 고정.**
3. 마켓 홈에 **"지금 뜨는 산업" 섹션**이 실시간 순위·순매수와 형제로 렌더되고, 업종 랭킹 리스트가 표시된다.
4. 업종 행 클릭 시 **구성종목 모달**이 열리고, 구성종목이 현재가·등락·미니차트와 함께 **수익률/시가총액 탭으로 정렬**된다.
5. **KIS 실전전용 TR 제약 하 안전 동작**: 로컬(미설정) 또는 비-prod 는 mock 정상 표시, prod 야간점검 시각은 "점검 중" 안내(에러 카드 0), 빈 응답·미지원 업종은 크래시 없이 빈 상태.
6. **반응형 무붕괴**: 두 뷰포트(모바일·PC)에서 랭킹 리스트·모달·정렬 탭 정렬이 깨지지 않는다.

## 3. 범위 (In scope)

### 3-1. 업종 랭킹 데이터 계층 (KIS 어댑터) — `lib/api/kis/sectors.ts` (신규)

- `fetchSectorRanking(): Promise<SectorRankItem[]>` — 업종별 지수 등락 리스트를 등락률 내림차순으로 반환.
  - **1차 시도(q1 채택 시)**: `FHPUP02140000`(inquire-index-category-price) 단건 호출로 업종 카테고리별 지수 리스트 확보. **응답 스키마는 AC-0 실측 후 확정**(등락률·상승/하락 종목수 필드 유무).
  - **폴백(q1 리스트 미제공 시)**: 내부 보유 업종코드 목록(§6, `SECTOR_CODES`)으로 `FHPUP02100000` **fan-out**. 동시성 캡(예 5)·순차 딜레이·성공 캐시로 레이트리밋(EGW00201) 억제. 기존 `index-price.ts`(`mapIndexPrice`) 재사용.
  - 정규화: `{ code, name, changePct, up, down, flat, total }`. `total = up + down + flat`(또는 응답 종목수 합).
- 기존 `lib/api/kis/index-price.ts`·`mappers.ts`(`mapIndexPrice`·`INDEX_NAME_BY_CODE`) 재사용. 업종명은 응답에 없을 수 있으므로 코드→이름 상수 매핑(§6) 보강.

### 3-2. 구성종목 데이터 계층 — `lib/api/kis/sectorConstituents.ts` (신규, 방식 AC-0 확정)

- `fetchSectorConstituents(code): Promise<SectorConstituent[]>` — 업종 구성종목 + 현재가·등락·시총.
  - **방식 A(전용 TR 존재 시)**: AC-0 에서 구성종목 TR 확정되면 그 TR 로 직접 조회.
  - **방식 B(전용 TR 부재 시, 폴백)**: 큐레이션 업종→ticker 맵(`SECTOR_CONSTITUENTS`, 주요 업종 한정)으로 후보 tickers 확보 → `intstock_multprice`(복수 시세, `FHKST11300006`) 또는 배치 현재가로 현재가·등락 일괄 조회. 시총은 토스 마스터(`fetchStockPriceWithShares` 자산) 또는 `hts_avls` 활용.
  - never-throw·부분 실패 방어(일부 종목 조회 실패 시 omit, 크래시 없음).
- 미니차트 데이터는 **구성종목 행이 기존 peek/차트 훅을 재사용**(신규 시세 계층 최소화). 정렬 키(수익률=등락률, 시가총액)는 응답에 포함.

### 3-3. BFF route — `app/api/market/sectors/route.ts` · `app/api/market/sectors/[code]/constituents/route.ts` (신규)

- `GET /api/market/sectors` → `{ sectors: SectorRankItem[] }`, `X-Data-Source`.
- `GET /api/market/sectors/[code]/constituents` → `{ constituents: SectorConstituent[] }`, `X-Data-Source`.
- **이중 게이트(`volume-rank` 선례)**: `FHPUP02100000`/`FHPUP02140000` 는 **실전 전용(모의 미지원)** → `isKisConfigured() && resolveKisEnv()==="prod"` 미충족 시 KIS 실호출 없이 **mock**(`X-Data-Source: mock`).
- `withTimeout` + transient 1회 재시도 → 타임아웃 `mock-timeout`, 기타 오류 `mock-error`(never-throw graceful degrade). 빈 결과 처리는 §6 규칙.
- `code` 파라미터 형식 검증 실패 400. 서버 유틸(`jsonWithDataSource`·`withTimeout`·`fetchWithTransientRetryOrThrow` 기존 `lib/server/bffUtils`) 재사용. `Cache-Control: no-store`.

### 3-4. mock — `lib/mock/market/sectors.ts` (신규)

- `getMockSectorRanking()` / `getMockSectorConstituents(code)` — 업종 랭킹·구성종목 대표 샘플(반도체·2차전지·바이오 등). 로컬/폴백 무키 환경에서 UI 검증용. 형식은 정규화 타입과 정합.

### 3-5. 타입 — `lib/types/market/sectors.ts` (신규)

- `SectorRankItem = { code: string; name: string; changePct: number; up: number; down: number; flat: number; total: number }`.
- `SectorConstituent = { ticker: string; name: string; price: number; changePct: number; marketCap: number | null }`.
- `SectorConstituentSort = "return" | "marketCap"`.
- KIS 원본 타입(`KisInquireIndexCategoryOutput` 등)은 AC-0 실측 후 `lib/api/kis/types.ts` 에 추가.

### 3-6. 클라이언트 + 훅 — `lib/api/market/sectors.ts` · `hooks/market/useQuerySectorRanking.ts` · `hooks/market/useQuerySectorConstituents.ts` (신규)

- `getSectorRanking()` / `getSectorConstituents(code)` — axios(`lib/api/client.ts`, baseURL `/api`). `X-Data-Source` 헤더 표면화(market-status-aware-home 선례대로 `dataSource` 노출 — 점검 판정용).
- `useQuerySectorRanking()` — TanStack Query. queryKey `queryKeys.market.sectorRanking()`(단일 위치). `staleTime` 은 `queryConfig.market.sectorRanking` 단일 위치(§9 q5).
- `useQuerySectorConstituents(code, { enabled })` — 모달 열릴 때만 `enabled`. queryKey `queryKeys.market.sectorConstituents(code)`.
- `useQuery` 직접 import 금지 — 도메인 훅만 소비(frontend.md).

### 3-7. UI — 마켓 홈 섹션 + 구성종목 모달 (신규)

- `components/home/TrendingSectorsSection.tsx` — 마켓 홈("지금 뜨는 산업") 섹션.
  - 업종 랭킹 리스트: 각 행 = 업종명 + 등락률(부호색) + **"N개 중 M개 상승"** 요약. 아이콘은 후속(§4).
  - 행 클릭 → 구성종목 모달 오픈. 상태: 로딩(스켈레톤)·빈 랭킹·전체 실패(`MaintenanceNotice` 재사용, market-status-aware-home 선례) 분기.
- `components/market/SectorConstituentsModal.tsx` — 구성종목 모달.
  - 헤더: 업종명·등락률·상승/하락 종목수. 본문: 구성종목 리스트(종목명·현재가·등락·미니차트). 정렬 탭 **수익률 / 시가총액**(`SectorConstituentSort`).
  - 미니차트는 기존 peek/차트 자산 재사용. 행 클릭 → `/stock/[ticker]` 이동(기존 라우팅).
  - 상태: 로딩·빈 구성종목·실패 분기. 크래시·NaN 없음.
- 색·간격은 디자인 토큰만(hex/px 직타 금지). 한글 카피는 `lib/copy/market/sectors.ts` 단일 위치. `cn` 헬퍼. 반응형은 Tailwind prefix + `useBreakpoint`(직접 innerWidth 금지). 모달은 기존 모달/시트 컴포넌트 관례 재사용.

### 3-8. 마켓 홈 배선 — `components/home/MarketOverviewPage.tsx`

- 실시간 순위·순매수·공포탐욕과 형제로 `TrendingSectorsSection` 삽입. 표시 전용 추가 — 기존 섹션 로딩/에러 분기 무회귀.

## 4. 비범위 (Out of scope)

- **매출·영업이익률 탭**(토스 모달의 재무 탭) — DART(한국 재무데이터) 의존. **후속 PRD**. 본 PRD 는 수익률·시가총액 정렬까지.
- **해외 업종/섹터** — 국내(KRX 표준 업종)에 한정. 해외는 후속.
- **테마(FICS 급 세분·테마맵)** — KIS 업종=KRX 표준 분류로 시작. 세분 테마 분류는 후속(§9 q4).
- **관심종목(watchlist) 업종/테마 그룹핑 연계** — 사용자의 HTS 습관(업종별 관심종목 분류 저장)은 **비전으로만**(§8), 본 PRD 배선 없음.
- **업종별 아이콘/브랜드 이미지** — 텍스트 리스트로 시작. 아이콘은 후속.
- **업종 지수 상세 페이지/차트** — 랭킹 리스트 + 구성종목 모달까지. 업종 지수 자체의 상세 차트는 후속(`inquire_daily_indexchartprice` 자산 존재하나 범위 밖).
- **실시간 웹소켓 스트리밍** — 폴링/staleTime 캐시로 시작. 웹소켓은 후속.

## 5. 수용 기준 (AC)

QA 가 표로 검증. 소스별 시나리오는 로컬 무키(mock) / prod 정상(kis) / prod 야간점검(mock-timeout·mock-error·502)로 재현. 뷰포트별 재현.

| # | 시나리오 | 재현 | 기대 |
|---|---|---|---|
| AC-0 | **데이터 계층 실측 spike** | 스모크 스크립트로 `FHPUP02140000` 1콜 + 구성종목 TR 조사 | (q1) 업종 리스트 TR 응답 스키마(등락률·상승/하락 종목수 필드) 확정 → 리스트 채택 vs fan-out 결정. (q2) 구성종목 전용 TR 존부 확정 → 방식 A/B 결정. **추정 타입으로 머지 금지 — `lib/api/kis/types.ts`·§6 에 실측 반영.** |
| AC-1 | 업종 랭킹 표시(prod 정상) | prod `/` 진입, `dataSource=kis` | "지금 뜨는 산업" 섹션에 업종 랭킹 리스트, 등락률 내림차순, 각 행 업종명·등락률·"N개 중 M개 상승" 표시 |
| AC-2 | 상승 종목수 표기 | AC-1 화면 | 각 행의 "M개 상승"=`ascn_issu_cnt`(또는 리스트 TR 상당 필드), 전체=up+down+flat. 부호색(상승 빨강/하락 파랑, 토큰) |
| AC-3 | dev mock 정상 표시 | 로컬 무키(`isKisConfigured=false`) or 비-prod | 섹션이 mock 업종 랭킹 **정상 표시**(점검중 회귀 없음), 폴링/실호출 0, 에러 로그 0 |
| AC-4 | 구성종목 모달 | 업종 행 클릭 | 모달 오픈, 헤더에 업종명·등락률·종목수, 본문에 구성종목(종목명·현재가·등락·미니차트) |
| AC-5 | 정렬 탭 | 모달에서 수익률/시가총액 탭 전환 | 수익률=등락률 내림차순, 시가총액=시총 내림차순으로 재정렬. `marketCap=null` 은 후순위·크래시 없음 |
| AC-6 | 구성종목 → 종목상세 | 모달 행 클릭 | `/stock/[ticker]` 이동(기존 라우팅), ticker 정합 |
| AC-7 | prod 점검 시각 | prod 야간점검(전 TR 500) → 502/mock-timeout/mock-error | 섹션이 에러 카드 대신 **`MaintenanceNotice`("점검 중")**, 크래시 없음 |
| AC-8 | 빈/미지원 업종 | 구성종목 빈 응답 or 미매핑 업종 | 모달 "구성종목 없음" 빈 상태, 레이아웃 유지, NaN 없음 |
| AC-9 | 레이트리밋(fan-out 채택 시) | prod 진입 시 KIS 콜 관찰 | 업종 fan-out 이 동시성 캡·순차·캐시로 EGW00201 미유발(주간 실측). 리스트 TR 채택 시 단건 — 본 항목 N/A |
| AC-10 | 캐시/재프로브 억제 | staleTime 내 섹션 재마운트 | 랭킹 재요청이 staleTime 로 억제(불필요 KIS 콜 없음). 모달은 열릴 때만 구성종목 조회 |
| AC-11 | 반응형 두 뷰포트 | 모바일·PC — 섹션 + 모달 | 양 뷰포트 랭킹 리스트·모달·정렬 탭 정렬·줄바꿈 깨짐 없음(`md:`/`lg:` + `useBreakpoint`) |
| AC-12 | 컨벤션 정합 | `git grep` | hex/px 직타 0(`components/home/TrendingSectorsSection.tsx`·`components/market/SectorConstituentsModal.tsx`), 한글 카피 `lib/copy/market/sectors.ts` 단일, queryKey `queryKeys.market.sectorRanking`/`sectorConstituents` 단일, 클라 `fetch(` 직접호출 0, `useQuery` 직접 import 0(도메인 훅만) |

## 6. 데이터 / API (확정 TR + 실측 대상)

### 6-1. 확정 TR (레퍼런스 근거)

- **업종 현재지수 `FHPUP02100000`** (`GET /uapi/domestic-stock/v1/quotations/inquire-index-price`) — **기존 구현**(`lib/api/kis/index-price.ts`). `FID_COND_MRKT_DIV_CODE=U`, `FID_INPUT_ISCD=<업종코드>`. 응답 확정 필드(§2-4): `bstp_nmix_prpr`(지수현재가)·`bstp_nmix_prdy_ctrt`(전일대비율)·`ascn_issu_cnt`(상승종목수)·`down_issu_cnt`(하락종목수)·`stnr_issu_cnt`(보합종목수)·`uplm_issu_cnt`/`lslm_issu_cnt`(상한/하한). **⚠️ 실전 전용·업종코드 1개당 1콜**.
- **업종 카테고리별 지수 `FHPUP02140000`** (`GET /uapi/domestic-stock/v1/quotations/inquire-index-category-price`) — **리스트 후보(q1)**. `tr_cont` 연속조회 지원(§3 페이징). **⚠️ 응답 필드 우리 레퍼런스 미수집 → AC-0 실측 필수.**
- **복수 종목 시세 `FHKST11300006`**(`intstock_multprice`, `/quotations/intstock-multprice`) — 구성종목 배치 현재가/등락 후보(방식 B). 복수 인덱스 파라미터(`_1`,`_2`…) 확장 방식은 §4 "확인 필요".
- **종목명/메타 `search_stock_info`(CTPF1002R)** — 구성종목 종목명(`prdt_abrv_name`)·시총(`lstg_stqt`×현재가) 보조. 이미 사용 중.
- **시가총액**: 토스 마스터 `sharesOutstanding × 현재가`(`lib/api/toss/price.ts fetchStockPriceWithShares`) 또는 KIS `hts_avls` — 방식 확정은 구현 재량.

### 6-2. 업종코드 목록 (fan-out 채택 시 필요)

- 확정값: 코스피 `0001` / 코스닥 `1001` / 코스피200 `2001`(기존 `index-price.ts`). 그 외 세부 업종코드는 **KIS 포털 "종목정보 다운로드(국내) - 업종코드"** 참조(레퍼런스 §2-4·§5 미확인). AC-0 에서 필요한 업종코드 셋(`SECTOR_CODES` 상수)을 포털에서 수집·확정한다.

### 6-3. 정규화 / 폴백 규칙

- 랭킹 정렬 = `changePct` 내림차순. 종목수 합(`total`)은 응답값 우선, 없으면 up+down+flat.
- 숫자는 전부 string 응답 → 파싱·NaN 방어(기존 `mappers.ts` 관례).
- 소스 매트릭스(volume-rank 선례): 미설정/비-prod → 200 `mock`. KIS 성공 → 200 `kis`. 타임아웃 → 200 `mock-timeout`. 기타 오류 → 200 `mock-error`(never-throw) 또는 502(throw 변형) — 세부는 `fluctuation`(never-throw) 관례 채택 권고(에러 카드 대신 점검안내 유도).
- 판정(점검 vs 정상, market-status-aware-home 선례): available = `!isError && dataSource∈{kis,mock}`, unavailable = `isError || dataSource∈{mock-timeout,mock-error,mock-empty}`.

## 7. 가정 · 제약 · 참고

- 선행: KIS 어댑터·토큰 인프라·`isKisConfigured`/`resolveKisEnv` 이중 게이트·`mapIndexPrice`·토스 마스터 시총 계산 모두 main 반영됨. `MaintenanceNotice`(market-status-aware-home) 머지 완료 전제 — 미머지 시 §3-7 상태 UI 는 인라인 대체 후 후속 정리.
- prod KIS 는 라이브 설정. `FHPUP02100000`/`FHPUP02140000` 는 **실전 전용(모의 미지원)** → 이중 게이트 필수. 야간점검(~21:50~23시대, 전 TR 500) 시각엔 mock-*/502 → 점검 안내. 라이브 랭킹 실검증은 **주간(평일 09~15:30 권장, 주말·장외도 KIS 가 랭킹 제공하면 표시)**.
- dev(로컬 무키): 이중 게이트 미통과 → 항상 mock → 정상 표시. "점검 중" 로컬 확인은 소스 모킹/강제 실패 주입 필요(QA 노트).
- 레이트리밋: fan-out 채택 시 업종 수 × 1콜 → EGW00201 위험. 동시성 캡·순차 딜레이(`flow/top10` `delay(150ms)` 선례)·성공 캐시로 억제. 리스트 TR 채택 시 단건이라 무부담(q1 우선 이유).
- 참고 파일: `lib/api/kis/index-price.ts`·`mappers.ts`(업종지수), `app/api/market/volume-rank/route.ts`(이중게이트·mock·소스헤더), `lib/api/toss/price.ts`(시총), `components/market/MaintenanceNotice.tsx`(점검 상태 UI), `components/home/MarketOverviewPage.tsx`·`RealtimeRankingSection.tsx`(홈 섹션 배선 선례), `hooks/market/useQueryVolumeRank.ts`(훅·소스 표면화), `hooks/query/queryKeys.ts`, `docs/rules/frontend.md`.

## 8. 영향 분석

- **변경 라인 추정**: 신규 파일 9~11개(어댑터 2 + BFF 2 + mock 1 + 타입 1 + 클라 1 + 훅 2 + UI 2 + 카피 1) + 홈 배선 1 + queryKeys/queryConfig/types 소폭. 순수 add-only 성격 강해 회귀면적 작음. 대략 **500~750 라인**(정규화·상태 분기·모달 포함). q1/q2 실측 결과에 따라 구성종목 계층(§3-2) 분량 ±150 변동.
- **커밋 분할 권고**:
  1. `chore(spike)`: AC-0 실측 결과 반영(TR 스키마·업종코드 셋 확정, 타입 add).
  2. `feat(market)`: 업종 랭킹 데이터 계층(어댑터 + BFF + mock + 타입 + 클라 + 훅).
  3. `feat(market)`: 구성종목 데이터 계층(방식 A/B, AC-0 결정 반영).
  4. `feat(home)`: `TrendingSectorsSection` + `SectorConstituentsModal` + 카피 + 홈 배선(디자이너 DESIGN.md 신규 색 시 선행).
- **PRD 분할 판단**: **단일 PRD 유지**. 랭킹 리스트와 구성종목 모달은 한 사용자 흐름(리스트→클릭→모달)이고 데이터 계층이 연속적. 단 §3-2(구성종목) 실현성이 AC-0 에서 무너지면(전용 TR 부재 + 큐레이션 맵도 비현실적) **구성종목 모달을 후속 PRD 로 분리**하고 본 PR 은 랭킹 리스트까지만 shipping(§9 q2 폴백). 이 분기 결정은 AC-0 spike 직후.
- **KIS 실전전용·레이트리밋 리스크**: `volume-rank`/`fluctuation` 이 이미 검증한 이중 게이트 + transient 재시도 + mock 폴백 패턴을 그대로 답습 → 신규 리스크 낮음. fan-out 채택 시에만 EGW00201 주의(AC-9 실측).
- **회귀 위험 낮음**: 기존 라우트/훅 시그니처 무변경, 순수 add. 유일 공유 편집 지점 = `queryKeys.ts`·`queryConfig`·`lib/types/market`·`lib/api/kis/types.ts`·`MarketOverviewPage.tsx`(섹션 삽입 1곳, 기존 섹션 무변경).
- **비전(범위 밖, 1줄)**: 사용자의 HTS 습관(업종/테마별 관심종목 분류 저장) → 향후 **업종 랭킹/구성종목을 관심종목 그룹 생성 진입점**으로 확장 여지(별도 PRD). 본 PRD 의 업종→구성종목 데이터 구조가 그 토대.

## 9. OPEN QUESTION

- **[OPEN QUESTION] q1. 업종 등락 랭킹 리스트 TR — `FHPUP02140000` 실측 vs `FHPUP02100000` fan-out.** `FHPUP02140000`(업종 카테고리별 지수)이 등락률·상승/하락 종목수를 포함한 **업종 리스트를 한 번에 주는지** 우리 레퍼런스에 응답 필드 미수집. **PM 권고: 착수 전 스모크 스크립트로 `FHPUP02140000` 1콜 실측(AC-0). 리스트를 주면 채택(단건·무부담). 안 주면 업종코드 목록 보유 + `FHPUP02100000` fan-out(동시성 캡·순차·캐시). fan-out 은 이미 검증된 `mapIndexPrice` 재사용이라 구현 리스크 낮음.** 추정 타입 머지 금지.
- **[OPEN QUESTION] q2. 구성종목 조회 방식 — 전용 TR vs bstp 필터 vs 큐레이션 맵.** 레퍼런스 카탈로그에 "업종별 구성종목" 전용 TR 미확인 = **본 PRD 최대 실현성 리스크**. 전체 유니버스 `bstp_kor_isnm` 필터는 비용 큼. **PM 권고: AC-0 에서 (a) KIS 포털에 업종별 구성종목/구성비 TR 이 있는지 조사, 없으면 (b) 주요 업종 한정 큐레이션 업종→ticker 맵 + `intstock_multprice` 배치 시세로 방식 B 시작. 큐레이션도 비현실적이면 구성종목 모달을 후속 PRD 로 분리(§8), 본 PR 은 랭킹 리스트까지 shipping.** 분기 결정은 spike 직후.
- **[OPEN QUESTION] q3. KIS 실전전용·레이트리밋·mock 폴백 정책.** **PM 권고: `volume-rank` 선례 그대로 — 이중 게이트(`isKisConfigured && prod`) + `withTimeout` + transient 1회 + never-throw mock-* 폴백. fan-out 채택 시 동시성 캡·순차 딜레이 추가. 소스 헤더는 `X-Data-Source` 로 점검/정상 판정.** dev mock 은 available 로 정상 표시(market-status-aware-home 교훈).
- **[OPEN QUESTION] q4. 업종 분류 세분도 — KRX 표준 vs 내부 테마맵.** **PM 권고: KIS 업종(KRX 표준 분류)으로 시작. FICS 급 세분·테마(2차전지·AI 등 크로스섹터 테마)는 후속.** 시작 업종 셋은 AC-0 에서 포털 업종코드로 확정(§6-2).
- **[OPEN QUESTION] q5. 랭킹/구성종목 갱신주기·캐시(staleTime).** 업종 등락은 장중 실시간이나 초 단위 폴링은 불필요·레이트 부담. **PM 권고: 랭킹 `staleTime` 30~60s(실시간 순위 섹션과 정렬), 구성종목은 모달 열릴 때 조회 + `staleTime` 30s. 폴링(refetchInterval)은 두지 않음(진입/재열람 시 신선도로 충분). 실사용·레이트 관찰 후 조정.**
- **[OPEN QUESTION] q6. 구성종목 모달 UX — 형태·정렬 탭 위계·미니차트 스타일.** **PM 권고: 기존 모달/시트 관례 재사용, 정렬 탭(수익률/시가총액)은 세그먼트 컨트롤, 미니차트는 peek/차트 자산 재사용. 업종 행 요약("N개 중 M개 상승") 시각·부호색·아이콘 유무는 UX 디자이너 최종 결정.** 데이터 배선(랭킹·구성종목·정렬)까지 만들고 최종 시각은 확정 후 같은 브랜치 커밋.
